// 사진 보관·비공개 저장 규칙: 세션 id 검증, 보관시간, 서명 URL 유효시간, 삭제 경로, 서버 간 토큰
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { isUuid } from "@/lib/ids";
import { expiresAt, finalPath, photoPath, retentionHours, signedTtlSeconds } from "@/lib/storage/photos";
import { storagePathsFor } from "@/lib/storage/cleanup";
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
