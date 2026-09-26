// 저장소 계층: 어떤 저장소(Supabase·Firebase)를 쓰든 지켜야 할 동작.
// 메모리 구현으로 규칙을 확인한다 — 두 구현 모두 이 약속을 지켜야 한다.
import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";
import { getStore, isStoreConfigured, setStoreForTest, storeKind } from "@/lib/db";
import { MAX_JOBS_PER_SESSION, PrintQueueError, claimNextJob, enqueuePrint, recordHeartbeat, reportJobResult } from "@/lib/printer/printQueue";
import { getAdminStats } from "@/lib/admin/stats";
import { MemoryStore } from "./helpers/memoryStore";

const SID = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";

function withStore(seed: (s: MemoryStore) => void = () => {}) {
  const store = new MemoryStore();
  seed(store);
  setStoreForTest(store);
  return store;
}

afterEach(() => setStoreForTest(null));

describe("저장소 고르기", () => {
  it("설정이 없으면 저장 기능만 꺼진다 (촬영·꾸미기는 계속)", () => {
    setStoreForTest(null);
    const hadSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hadFirebase = process.env.FIREBASE_STORAGE_BUCKET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.FIREBASE_STORAGE_BUCKET;
    try {
      assert.equal(storeKind(), null);
      assert.equal(isStoreConfigured(), false);
      assert.throws(() => getStore(), /SUPABASE_NOT_CONFIGURED/);
    } finally {
      if (hadSupabase) process.env.NEXT_PUBLIC_SUPABASE_URL = hadSupabase;
      if (hadFirebase) process.env.FIREBASE_STORAGE_BUCKET = hadFirebase;
    }
  });

  it("Supabase 설정이 있으면 Supabase, 없고 Firebase 만 있으면 Firebase", () => {
    setStoreForTest(null);
    const env = { ...process.env };
    try {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
      assert.equal(storeKind(), "supabase");
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.FIREBASE_STORAGE_BUCKET = "owlcut.appspot.com";
      process.env.FIREBASE_PROJECT_ID = "owlcut";
      assert.equal(storeKind(), "firebase");
    } finally {
      process.env = env;
    }
  });
});

describe("출력 큐 (저장소 무관 규칙)", () => {
  const seedFinal = (s: MemoryStore) => {
    s.sessions.set(SID, { id: SID, status: "composed" });
    s.designs.push({ id: "d1", session_id: SID, created_at: "2026-09-26T00:00:00Z", final_image_path: `finals/${SID}.png` });
    s.files.set(`finals/${SID}.png`, { body: Buffer.from("x"), contentType: "image/png" });
  };

  it("완성본이 없으면 등록 불가", async () => {
    withStore();
    await assert.rejects(enqueuePrint(SID, 1), (e: PrintQueueError) => e.code === "no_final_image");
  });

  it("세션당 3번까지", async () => {
    withStore(seedFinal);
    for (let i = 0; i < MAX_JOBS_PER_SESSION; i++) assert.equal((await enqueuePrint(SID, 1)).status, "waiting");
    await assert.rejects(enqueuePrint(SID, 1), (e: PrintQueueError) => e.code === "limit_reached");
  });

  it("한 장만 나간다 — 두 프린터가 동시에 가져가도 한 쪽은 빈손", async () => {
    const store = withStore(seedFinal);
    await enqueuePrint(SID, 1);
    const [a, b] = await Promise.all([claimNextJob("printer-a"), claimNextJob("printer-b")]);
    const got = [a, b].filter(Boolean);
    assert.equal(got.length, 1);
    assert.match(got[0]!.image_url, /^https:\/\/memory\.test\//); // 서명 URL 만 전달 (경로 아님)
    assert.equal(store.prints[0].status, "printing");
  });

  it("보고는 가져간 프린터만, 완료하면 세션이 printed", async () => {
    const store = withStore(seedFinal);
    const { id } = await enqueuePrint(SID, 1);
    await claimNextJob("printer-a");
    await assert.rejects(reportJobResult(id, "printer-b", "completed"), (e: PrintQueueError) => e.code === "not_found");
    await reportJobResult(id, "printer-a", "completed");
    assert.equal(store.prints[0].status, "completed");
    assert.equal(store.sessions.get(SID)?.status, "printed");
  });

  it("사진이 지워졌으면(보관기간 지남) 그 작업은 실패로 넘긴다", async () => {
    const store = withStore(seedFinal);
    await enqueuePrint(SID, 1);
    store.files.clear(); // 정리 작업이 파일을 지운 뒤
    assert.equal(await claimNextJob("printer-a"), null);
    assert.equal(store.prints[0].status, "failed");
    assert.equal(store.prints[0].error, "image_missing");
  });

  it("프린트 서버가 죽어 멈춘 작업은 다음 claim 때 실패 처리", async () => {
    const store = withStore(seedFinal);
    await enqueuePrint(SID, 1);
    store.prints[0].status = "printing";
    store.prints[0].updated_at = "2020-01-01T00:00:00Z";
    await claimNextJob("printer-a");
    assert.equal(store.prints[0].status, "failed");
    assert.equal(store.prints[0].error, "timeout");
  });

  it("claim 이 곧 heartbeat → 장비 목록에 뜬다", async () => {
    const store = withStore(seedFinal);
    await recordHeartbeat("printer-a", { platform: "win32", dryRun: true });
    assert.equal(store.devices.get("printer-a")?.kind, "printer");
  });
});

describe("관리자 통계는 저장소를 통해 모은다", () => {
  it("오늘 세션·완성·출력·장비", async () => {
    const now = new Date("2026-09-26T12:00:00Z"); // KST 21시 → 오늘은 2026-09-26 00:00 KST 부터
    const today = "2026-09-26T03:00:00Z";
    const store = withStore((s) => {
      s.sessions.set(SID, { id: SID, status: "composed", created_at: today });
      s.designs.push({ id: "d1", session_id: SID, created_at: today, final_image_path: "finals/x.png", mode: "ai", filter: "bw", layout: "classic-strip" });
      s.prints.push({ id: "p1", session_id: SID, image_path: "finals/x.png", copies: 1, status: "completed", created_at: today, updated_at: today });
      s.ai.push({ model: "claude-opus-5", ok: true, latency_ms: 900, created_at: today });
      s.devices.set("printer-a", { id: "printer-a", kind: "printer", last_seen_at: now.toISOString(), info: { platform: "win32" } });
    });
    assert.ok(store);
    const stats = await getAdminStats(now);
    assert.equal(stats.today?.sessions, 1);
    assert.equal(stats.today?.completed, 1);
    assert.equal(stats.today?.completedAi, 1);
    assert.equal(stats.today?.printsCompleted, 1);
    assert.equal(stats.aiByModel[0]?.model, "claude-opus-5");
    assert.equal(stats.popular?.filters[0]?.id, "bw");
    assert.equal(stats.devices[0]?.online, true);
  });

  it("한 항목이 실패해도 나머지는 보여 준다 (행사 중 대시보드가 통째로 비지 않게)", async () => {
    const store = withStore((s) => s.sessions.set(SID, { id: SID, status: "created", created_at: "2026-09-26T03:00:00Z" }));
    store.listDevices = async () => {
      throw new Error("boom");
    };
    const stats = await getAdminStats(new Date("2026-09-26T12:00:00Z"));
    assert.equal(stats.today?.sessions, 1);
    assert.deepEqual(stats.devices, []);
  });
});
