// 사진 보관·비공개 저장 규칙: 세션 id 검증, 보관시간, 서명 URL 유효시간, 삭제 경로, 서버 간 토큰
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { isUuid } from "@/lib/ids";
import { expiresAt, finalPath, photoPath, retentionHours, signedTtlSeconds } from "@/lib/storage/photos";
import { DESIGN_SCRUB, cleanupExpired, storagePathsFor } from "@/lib/storage/cleanup";
import { verifyBearer } from "@/lib/auth/bearer";
import type { SupabaseClient } from "@supabase/supabase-js";

// 체인형 쿼리를 흉내 내는 가짜 Supabase — 어떤 테이블에 무슨 요청이 갔는지 기록
function fakeDb(opts: { sessions: string[]; files?: Record<string, string[]>; failRemove?: boolean; failUpdate?: string }) {
  const calls: { table: string; kind: "select" | "update" | "delete"; patch?: unknown; filters: string[] }[] = [];
  const removed: string[][] = [];
  const from = (table: string) => {
    const call = { table, kind: "select" as "select" | "update" | "delete", patch: undefined as unknown, filters: [] as string[] };
    const q: Record<string, unknown> = {};
    for (const m of ["select", "lt", "neq", "limit", "in", "eq"]) {
      q[m] = (...args: unknown[]) => {
        if (m !== "select") call.filters.push(`${m}:${args.map((a) => JSON.stringify(a)).join(",")}`);
        return q;
      };
    }
    q.update = (patch: unknown) => ((call.kind = "update"), (call.patch = patch), q);
    q.delete = () => ((call.kind = "delete"), q);
    q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      calls.push(call);
      const value =
        call.kind === "select"
          ? { data: opts.sessions.map((id) => ({ id })), error: null }
          : { error: opts.failUpdate === table ? { message: "boom" } : null };
      return Promise.resolve(value).then(res, rej);
    };
    return q;
  };
  const storage = {
    from: () => ({
      list: async (folder: string) => ({ data: (opts.files?.[folder] ?? []).map((name) => ({ name })) }),
      remove: async (paths: string[]) => {
        removed.push(paths);
        return opts.failRemove ? { data: null, error: { message: "denied" } } : { data: paths.map((name) => ({ name })), error: null };
      },
    }),
  };
  return { db: { from, storage } as unknown as SupabaseClient, calls, removed };
}

const ID = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";

describe("세션 id (저장소 경로에 들어감)", () => {
  it("UUID만 허용", () => {
    assert.equal(isUuid(ID), true);
    assert.equal(isUuid(ID.toUpperCase()), true);
  });
  it("경로 조작·형식 오류 거부", () => {
    for (const bad of ["../photos/x/0", `${ID}/../..`, "abc", "", `${ID}x`, 123, null, undefined]) {
      assert.equal(isUuid(bad), false, String(bad));
    }
  });
  it("경로 규칙", () => {
    assert.equal(finalPath(ID), `finals/${ID}.png`);
    assert.equal(photoPath(ID, 2), `photos/${ID}/2.jpg`);
  });
});

describe("보관 시간", () => {
  it("기본 2시간(설계도), 환경변수로 변경, 이상한 값은 기본값, 최대 30일", () => {
    assert.equal(retentionHours(undefined), 2);
    assert.equal(retentionHours("24"), 24);
    assert.equal(retentionHours("0.5"), 0.5);
    for (const bad of ["", "0", "-3", "abc"]) assert.equal(retentionHours(bad), 2, bad);
    assert.equal(retentionHours("99999"), 720);
  });
  it("만료 시각 = 기준 시각 + 보관 시간", () => {
    const from = new Date("2026-09-22T00:00:00Z");
    assert.equal(expiresAt(from, 2), "2026-09-22T02:00:00.000Z");
  });
});

describe("서명 URL 유효시간", () => {
  const now = Date.parse("2026-09-22T00:00:00Z");
  it("남은 보관 시간과 상한 중 짧은 쪽", () => {
    assert.equal(signedTtlSeconds("2026-09-22T00:10:00Z", 3600, now), 600); // 10분 남음
    assert.equal(signedTtlSeconds("2026-09-22T05:00:00Z", 3600, now), 3600); // 상한
  });
  it("이미 만료면 0 (링크 발급 안 함)", () => {
    assert.equal(signedTtlSeconds("2026-09-21T23:59:00Z", 3600, now), 0);
  });
  it("만료 정보가 없으면 상한", () => {
    assert.equal(signedTtlSeconds(null, 3600, now), 3600);
  });
});

describe("정리 대상 경로", () => {
  it("세션마다 최종 이미지 + 원본 사진 폴더의 파일", () => {
    const other = "11111111-2222-4333-8444-555555555555";
    assert.deepEqual(storagePathsFor([ID, other], { [ID]: ["0.jpg", "1.jpg"] }), [
      `finals/${ID}.png`,
      `photos/${ID}/0.jpg`,
      `photos/${ID}/1.jpg`,
      `finals/${other}.png`,
    ]);
    assert.deepEqual(storagePathsFor([], {}), []);
  });
});

describe("보관기간 정리 (가짜 DB)", () => {
  const other = "11111111-2222-4333-8444-555555555555";
  const now = new Date("2026-09-22T12:00:00Z");

  it("파일을 지우고, 행은 남긴 채 방문자 입력만 비우고 만료 표시 (오늘 통계가 줄지 않게)", async () => {
    const f = fakeDb({ sessions: [ID, other], files: { [`photos/${ID}`]: ["0.jpg", "1.jpg"] } });
    const res = await cleanupExpired(now, f.db);
    assert.deepEqual(res, { sessions: 2, files: 4, errors: [] });
    assert.deepEqual(f.removed[0], [`finals/${ID}.png`, `photos/${ID}/0.jpg`, `photos/${ID}/1.jpg`, `finals/${other}.png`]);
    assert.ok(!f.calls.some((c) => c.kind === "delete"), "행 삭제 없음");

    const select = f.calls[0];
    assert.equal(select.table, "sessions");
    assert.ok(select.filters.includes('neq:"status","expired"'), "이미 정리한 세션은 다시 안 봄");

    const design = f.calls.find((c) => c.table === "designs")!;
    assert.deepEqual(design.patch, DESIGN_SCRUB);
    assert.deepEqual(DESIGN_SCRUB, { prompt: null, text_layers: [] });

    const prints = f.calls.find((c) => c.table === "prints")!;
    assert.deepEqual(prints.patch, { status: "failed", error: "expired", updated_at: now.toISOString() });
    assert.ok(prints.filters.includes('eq:"status","waiting"'), "대기 중인 출력만 실패 처리");

    const last = f.calls.at(-1)!;
    assert.equal(last.table, "sessions");
    assert.deepEqual(last.patch, { status: "expired" });
  });

  it("파일 삭제가 실패하면 행은 손대지 않음 (다음 실행에서 재시도)", async () => {
    const f = fakeDb({ sessions: [ID], failRemove: true });
    const res = await cleanupExpired(now, f.db);
    assert.equal(res.sessions, 0);
    assert.match(res.errors[0], /storage/);
    assert.ok(!f.calls.some((c) => c.kind !== "select"));
  });

  it("행 정리가 실패하면 만료 표시를 하지 않음 (다음 실행에서 재시도)", async () => {
    const f = fakeDb({ sessions: [ID], failUpdate: "designs" });
    const res = await cleanupExpired(now, f.db);
    assert.equal(res.sessions, 0);
    assert.match(res.errors[0], /db: boom/);
    assert.ok(!f.calls.some((c) => c.table === "sessions" && c.kind === "update"));
  });
});

describe("서버 간 Bearer 토큰 (프린트 서버·정리 크론)", () => {
  const req = (auth?: string) => new Request("http://x/api/cron/cleanup", { headers: auth ? { authorization: auth } : {} });
  it("맞는 토큰만 통과", () => {
    assert.equal(verifyBearer(req("Bearer s3cret"), "s3cret"), true);
    assert.equal(verifyBearer(req("Bearer s3cre"), "s3cret"), false);
    assert.equal(verifyBearer(req("s3cret"), "s3cret"), false); // Bearer 접두어 없음
    assert.equal(verifyBearer(req(), "s3cret"), false);
  });
  it("서버에 비밀값이 설정 안 됐으면 항상 거부 (빈 토큰으로 통과 불가)", () => {
    assert.equal(verifyBearer(req("Bearer "), ""), false);
    assert.equal(verifyBearer(req("Bearer anything"), undefined), false);
  });
});
