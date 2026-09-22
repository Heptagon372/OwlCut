import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { idleState, idleTimeoutSeconds } from "@/lib/kiosk/idle";

describe("자리 비움 판단", () => {
  const T = 90_000; // 제한 90초
  const W = 15_000; // 마지막 15초 경고

  it("조작 직후는 active", () => {
    assert.deepEqual(idleState(1_000, 1_000, T, W), { phase: "active", secondsLeft: 90 });
  });
  it("남은 시간이 경고 구간이면 warning + 남은 초(올림)", () => {
    assert.deepEqual(idleState(80_500, 0, T, W), { phase: "warning", secondsLeft: 10 });
    assert.deepEqual(idleState(75_000, 0, T, W), { phase: "warning", secondsLeft: 15 });
    assert.equal(idleState(74_999, 0, T, W).phase, "active");
  });
  it("제한 시간이 지나면 expired", () => {
    assert.deepEqual(idleState(90_000, 0, T, W), { phase: "expired", secondsLeft: 0 });
    assert.equal(idleState(500_000, 0, T, W).phase, "expired");
  });
});

describe("제한 시간 설정", () => {
  it("환경변수가 없으면 화면별 기본값", () => {
    assert.equal(idleTimeoutSeconds(90, undefined), 90);
    assert.equal(idleTimeoutSeconds(60, ""), 60);
  });
  it("환경변수가 있으면 모든 화면에 그 값", () => {
    assert.equal(idleTimeoutSeconds(90, "180"), 180);
    assert.equal(idleTimeoutSeconds(60, "180"), 180);
  });
  it("너무 짧거나 이상한 값은 보정 (최소 20초, 최대 30분)", () => {
    assert.equal(idleTimeoutSeconds(90, "5"), 20);
    assert.equal(idleTimeoutSeconds(90, "abc"), 90);
    assert.equal(idleTimeoutSeconds(90, "-10"), 90);
    assert.equal(idleTimeoutSeconds(90, "99999"), 1800);
  });
});
