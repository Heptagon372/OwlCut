// 사진 보관·비공개 저장 규칙: 세션 id 검증, 보관시간, 서명 URL 유효시간, 삭제 경로, 서버 간 토큰
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { isUuid } from "@/lib/ids";
import { expiresAt, finalPath, photoPath, retentionHours, signedTtlSeconds } from "@/lib/storage/photos";
import { cleanupExpired, storagePathsFor } from "@/lib/storage/cleanup";
import { MemoryStore } from "./helpers/memoryStore";
import { verifyBearer } from "@/lib/auth/bearer";

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

describe("보관기간 정리 (메모리 저장소)", () => {
  const other = "11111111-2222-4333-8444-555555555555";
  const now = new Date("2026-09-22T12:00:00Z");
  const past = "2026-09-22T10:00:00Z";

  // 만료된 세션 둘 + 파일 + 방문자 입력이 있는 디자인 + 대기 중 출력
  function seeded() {
    const store = new MemoryStore();
    for (const id of [ID, other]) {
      store.sessions.set(id, { id, status: "composed", created_at: past, expires_at: past });
      store.files.set(`finals/${id}.png`, { body: Buffer.from("x"), contentType: "image/png" });
      store.designs.push({ id: `d-${id}`, session_id: id, created_at: past, prompt: "우주 느낌", text_layers: [{ content: "내 이름" }], filter: "bw", final_image_path: `finals/${id}.png` });
    }
    store.files.set(`photos/${ID}/0.jpg`, { body: Buffer.from("x"), contentType: "image/jpeg" });
    store.files.set(`photos/${ID}/1.jpg`, { body: Buffer.from("x"), contentType: "image/jpeg" });
    store.prints.push({ id: "p1", session_id: ID, image_path: `finals/${ID}.png`, copies: 1, status: "waiting", created_at: past, updated_at: past });
    return store;
  }

  it("파일을 지우고, 행은 남긴 채 방문자 입력만 비우고 만료 표시 (오늘 통계가 줄지 않게)", async () => {
    const store = seeded();
    const res = await cleanupExpired(now, store);
    assert.deepEqual(res, { sessions: 2, files: 4, errors: [] });
    assert.equal(store.files.size, 0);
    // 행은 남는다 → 관리자 "오늘" 집계가 보관기간만큼만 남지 않는다
    assert.equal(store.sessions.size, 2);
    assert.equal(store.designs.length, 2);
    assert.equal(await store.countFinalDesignsSince(past), 2);
    // 방문자가 직접 쓴 값만 지워진다 (선택값은 통계로 남김)
    for (const d of store.designs) {
      assert.equal(d.prompt, null);
      assert.deepEqual(d.text_layers, []);
      assert.equal(d.filter, "bw");
    }
    assert.equal(store.prints[0].status, "failed");
    assert.equal(store.prints[0].error, "expired");
    for (const id of [ID, other]) assert.equal(store.sessions.get(id)?.status, "expired");
  });

  it("이미 정리한 세션은 다시 보지 않는다", async () => {
    const store = seeded();
    await cleanupExpired(now, store);
    const again = await cleanupExpired(now, store);
    assert.deepEqual(again, { sessions: 0, files: 0, errors: [] });
  });

  it("파일 삭제가 실패하면 행은 손대지 않음 (다음 실행에서 재시도)", async () => {
    const store = seeded();
    store.fail.removeFiles = true;
    const res = await cleanupExpired(now, store);
    assert.equal(res.sessions, 0);
    assert.match(res.errors[0], /storage/);
    assert.equal(store.sessions.get(ID)?.status, "composed");
    assert.equal(store.designs[0].prompt, "우주 느낌");
  });

  it("행 정리가 실패하면 만료 표시를 하지 않음 (다음 실행에서 재시도)", async () => {
    const store = seeded();
    store.scrubDesigns = async () => {
      throw new Error("boom");
    };
    const res = await cleanupExpired(now, store);
    assert.equal(res.sessions, 0);
    assert.match(res.errors[0], /db: boom/);
    assert.equal(store.sessions.get(ID)?.status, "composed");
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
