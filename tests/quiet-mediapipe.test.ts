// MediaPipe 정보 로그만 걸러 내고, 진짜 오류는 그대로 보이는지
import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";
import { isMediapipeNoise, silenceMediapipeLogs } from "@/lib/tracking/quietMediapipe";

const original = { error: console.error, warn: console.warn, log: console.log };
afterEach(() => {
  console.error = original.error;
  console.warn = original.warn;
  console.log = original.log;
});

describe("MediaPipe 로그 걸러내기", () => {
  it("정보성 로그만 소음으로 본다", () => {
    assert.equal(isMediapipeNoise("INFO: Created TensorFlow Lite XNNPACK delegate for CPU."), true);
    assert.equal(isMediapipeNoise("W0000 00:00:1 gl_context.cc:1119] OpenGL error checking is disabled"), true);
    assert.equal(isMediapipeNoise("Graph successfully started running."), true);
    // 진짜 오류는 소음이 아니다
    assert.equal(isMediapipeNoise("TypeError: landmarker.detectForVideo is not a function"), false);
    assert.equal(isMediapipeNoise("Failed to fetch face_landmarker.task"), false);
    assert.equal(isMediapipeNoise(new Error("boom")), false);
  });

  it("켜는 동안 소음은 막고 나머지는 그대로 전달", () => {
    const seen: unknown[][] = [];
    console.error = (...args: unknown[]) => seen.push(args);
    const release = silenceMediapipeLogs();
    console.error("INFO: Created TensorFlow Lite XNNPACK delegate for CPU.");
    console.error("진짜 오류", { code: 1 });
    release();
    assert.deepEqual(seen, [["진짜 오류", { code: 1 }]]);
  });

  it("끄면 원래 console 로 되돌아온다 (두 번 켜도 안전)", () => {
    const mine = () => {};
    console.error = mine;
    const a = silenceMediapipeLogs();
    const b = silenceMediapipeLogs();
    assert.notEqual(console.error, mine);
    a();
    assert.notEqual(console.error, mine, "아직 쓰는 곳이 남아 있으면 유지");
    b();
    assert.equal(console.error, mine);
    b(); // 두 번 풀어도 문제 없음
    assert.equal(console.error, mine);
  });
});
