// 최종본 업로드 신뢰성 (설계도 10): 재시도 규칙, 응답 분류, 재업로드해도 designs 1행
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { withRetry } from "@/lib/retry";
import { classifyUpload, type UploadOutcome } from "@/lib/api";
import { MemoryStore } from "./helpers/memoryStore";

describe("재시도", () => {
  const FAIL: UploadOutcome = { ok: false, reason: "failed" };
  const OK: UploadOutcome = { ok: true, downloadUrl: "u", expiresAt: null };
  const opts = (slept: number[], attempts: number[]) => ({
    attempts: 3,
    delaysMs: [1000, 3000],
    shouldRetry: (r: UploadOutcome) => !r.ok && r.reason === "failed",
    onAttempt: (n: number) => attempts.push(n),
    sleep: async (ms: number) => void slept.push(ms),
  });

  it("연결 오류면 최대 3번, 사이에 1초·3초 대기", async () => {
    const slept: number[] = [];
    const attempts: number[] = [];
    const r = await withRetry(async () => FAIL, opts(slept, attempts));
    assert.deepEqual(r, FAIL);
    assert.deepEqual(attempts, [1, 2, 3]);
    assert.deepEqual(slept, [1000, 3000]);
  });

  it("중간에 성공하면 멈춤", async () => {
    const slept: number[] = [];
    const results = [FAIL, OK, FAIL];
    const r = await withRetry(async (n) => results[n - 1], opts(slept, []));
    assert.deepEqual(r, OK);
    assert.deepEqual(slept, [1000]);
  });

  it("미설정·거절은 다시 시도하지 않음", async () => {
    const attempts: number[] = [];
    const r = await withRetry(async () => ({ ok: false, reason: "not_configured" }) as UploadOutcome, opts([], attempts));
    assert.equal(r.ok, false);
    assert.deepEqual(attempts, [1]);
  });
});

describe("업로드 응답 분류", () => {
  it("성공은 다운로드 주소가 있어야 함", () => {
    assert.deepEqual(classifyUpload(200, { download_url: "https://x/download/1", expires_at: "2026-09-22T02:00:00Z" }), {
      ok: true,
      downloadUrl: "https://x/download/1",
      expiresAt: "2026-09-22T02:00:00Z",
    });
    assert.deepEqual(classifyUpload(200, {}), { ok: false, reason: "failed" });
  });
  it("원격 저장 미설정 → 로컬만 (재시도 안 함)", () => {
    assert.deepEqual(classifyUpload(503, { error: "SUPABASE_NOT_CONFIGURED" }), { ok: false, reason: "not_configured" });
  });
  it("서버 오류·시간 초과·한도 → 재시도 대상", () => {
    for (const s of [500, 502, 503, 504, 408, 429]) assert.deepEqual(classifyUpload(s, null), { ok: false, reason: "failed" }, String(s));
  });
  it("잘못된 요청 → 거절", () => {
    for (const s of [400, 404, 413]) assert.deepEqual(classifyUpload(s, { error: "x" }), { ok: false, reason: "rejected" }, String(s));
  });
});

describe("완성 네컷 저장 (세션당 1행)", () => {
  const SID = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";
  const row = { final_image_path: `finals/${SID}.png`, filter: "bw" };

  it("처음이면 새 행 (session_id 포함)", async () => {
    const store = new MemoryStore();
    assert.equal(await store.saveFinalDesign(SID, row), "inserted");
    assert.equal(store.designs.length, 1);
    assert.equal(store.designs[0].session_id, SID);
  });

  it("재업로드면 기존 행 수정 → 완성 수가 부풀지 않음", async () => {
    const store = new MemoryStore();
    await store.saveFinalDesign(SID, row);
    assert.equal(await store.saveFinalDesign(SID, { ...row, filter: "sepia" }), "updated");
    assert.equal(store.designs.length, 1);
    assert.equal(store.designs[0].filter, "sepia");
    assert.equal(await store.countFinalDesignsSince("2000-01-01T00:00:00Z"), 1);
  });

  it("저장소 오류는 throw → 500 → 클라이언트 재시도", async () => {
    const store = new MemoryStore();
    store.fail.saveFinalDesign = true;
    await assert.rejects(store.saveFinalDesign(SID, row));
  });
});
