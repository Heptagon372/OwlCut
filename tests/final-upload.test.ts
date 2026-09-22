// 최종본 업로드 신뢰성 (설계도 10): 재시도 규칙, 응답 분류, 재업로드해도 designs 1행
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { withRetry } from "@/lib/retry";
import { classifyUpload, type UploadOutcome } from "@/lib/api";
import { saveFinalDesign } from "@/lib/storage/finalDesign";
import type { SupabaseClient } from "@supabase/supabase-js";

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

// designs 테이블만 흉내 내는 가짜 DB
function fakeDesigns(existingId: string | null, fail?: "select" | "write") {
  const writes: { kind: "insert" | "update"; row: Record<string, unknown>; eq?: unknown[] }[] = [];
  const from = () => {
    const q: Record<string, unknown> = {};
    let pendingWrite: (typeof writes)[number] | null = null;
    for (const m of ["select", "not", "limit"]) q[m] = () => q;
    q.eq = (...args: unknown[]) => {
      if (pendingWrite) pendingWrite.eq = args;
      return q;
    };
    q.maybeSingle = async () =>
      fail === "select" ? { data: null, error: { message: "select boom" } } : { data: existingId ? { id: existingId } : null, error: null };
    q.update = (row: Record<string, unknown>) => ((pendingWrite = { kind: "update", row }), q);
    q.insert = (row: Record<string, unknown>) => ((pendingWrite = { kind: "insert", row }), q);
    q.then = (res: (v: unknown) => unknown) => {
      if (pendingWrite) writes.push(pendingWrite);
      return Promise.resolve({ error: fail === "write" ? { message: "write boom" } : null }).then(res);
    };
    return q;
  };
  return { db: { from } as unknown as SupabaseClient, writes };
}

describe("완성 네컷 저장 (세션당 1행)", () => {
  const SID = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";
  const row = { final_image_path: `finals/${SID}.png`, filter: "bw" };

  it("처음이면 insert (session_id 포함)", async () => {
    const f = fakeDesigns(null);
    assert.equal(await saveFinalDesign(f.db, SID, row), "inserted");
    assert.deepEqual(f.writes, [{ kind: "insert", row: { ...row, session_id: SID } }]);
  });

  it("재업로드면 기존 행 update → 완성 수가 부풀지 않음", async () => {
    const f = fakeDesigns("row-1");
    assert.equal(await saveFinalDesign(f.db, SID, row), "updated");
    assert.deepEqual(f.writes, [{ kind: "update", row, eq: ["id", "row-1"] }]);
  });

  it("DB 오류는 throw → 500 → 클라이언트 재시도", async () => {
    await assert.rejects(saveFinalDesign(fakeDesigns(null, "select").db, SID, row));
    await assert.rejects(saveFinalDesign(fakeDesigns(null, "write").db, SID, row));
  });
});
