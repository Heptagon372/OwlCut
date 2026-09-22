import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  FaceSmoother,
  LM,
  OneEuro,
  faceGeometryFromLandmarks,
  landmarkBox,
  mirrorFace,
  transformFace,
} from "@/lib/tracking/landmarks";

// 가짜 랜드마크: 필요한 점만 정면 얼굴 비율로 채움 (피사체 기준 오른쪽 눈 = 이미지 왼쪽)
function fakeLandmarks(dx = 0): { x: number; y: number }[] {
  const lms = Array.from({ length: 478 }, () => ({ x: 0.5 + dx, y: 0.5 }));
  const set = (i: number, x: number, y: number) => (lms[i] = { x: x + dx, y });
  set(LM.forehead, 0.5, 0.2);
  set(LM.chin, 0.5, 0.8);
  set(LM.faceA, 0.25, 0.45);
  set(LM.faceB, 0.75, 0.45);
  set(LM.eyeA[0], 0.34, 0.42);
  set(LM.eyeA[1], 0.44, 0.42);
  set(LM.eyeB[0], 0.56, 0.42);
  set(LM.eyeB[1], 0.66, 0.42);
  set(LM.nose, 0.5, 0.55);
  set(LM.lipUpper, 0.5, 0.64);
  set(LM.lipLower, 0.5, 0.67);
  set(LM.mouthA, 0.42, 0.65);
  set(LM.mouthB, 0.58, 0.65);
  set(LM.cheekA, 0.35, 0.58);
  set(LM.cheekB, 0.65, 0.58);
  return lms;
}

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

describe("랜드마크 → AR 기준점", () => {
  it("눈·입·볼·윤곽 기준점을 뽑고 왼쪽/오른쪽은 이미지상 x 순서", () => {
    const g = faceGeometryFromLandmarks(fakeLandmarks())!;
    close(g.eyeLeft.x, 0.39);
    close(g.eyeRight.x, 0.61);
    close(g.mouth.y, 0.655);
    assert.ok(g.faceLeft.x < g.faceRight.x && g.cheekLeft.x < g.cheekRight.x && g.mouthLeft.x < g.mouthRight.x);
    close(g.mouthOpen, Math.min(1, 0.03 / 0.6 / 0.25), 1e-6);
  });

  it("거울 모드: x 를 뒤집어도 왼쪽/오른쪽 이름은 이미지 기준 유지", () => {
    const g = faceGeometryFromLandmarks(fakeLandmarks(0.1), true)!;
    close(g.nose.x, 0.4);
    assert.ok(g.eyeLeft.x < g.eyeRight.x);
    close(g.eyeLeft.x, 1 - (0.61 + 0.1));
  });

  it("점이 모자라면 null", () => {
    assert.equal(faceGeometryFromLandmarks(fakeLandmarks().slice(0, 100)), null);
  });

  it("mirrorFace 두 번 = 원래 얼굴, transformFace 는 모든 점에 적용", () => {
    const g = faceGeometryFromLandmarks(fakeLandmarks())!;
    const back = mirrorFace(mirrorFace(g));
    for (const k of ["eyeLeft", "eyeRight", "mouthLeft", "cheekRight", "faceLeft", "nose"] as const) {
      close(back[k].x, g[k].x);
      close(back[k].y, g[k].y);
    }
    const m = mirrorFace(g);
    assert.ok(m.eyeLeft.x < m.eyeRight.x);
    const t = transformFace(g, (p) => ({ x: p.x * 2, y: p.y + 1 }));
    close(t.chin.y, 1.8);
    close(t.eyeRight.x, 1.22);
    assert.equal(t.mouthOpen, g.mouthOpen);
  });

  it("랜드마크 박스", () => {
    const box = landmarkBox(fakeLandmarks())!;
    close(box.x, 0.25);
    close(box.w, 0.5);
    close(box.y, 0.2);
    close(box.h, 0.6);
  });
});

describe("떨림 보정 (One Euro)", () => {
  it("가만히 있으면 값 그대로", () => {
    const f = new OneEuro();
    for (let t = 0; t < 1000; t += 33) close(f.filter(0.5, t), 0.5);
  });

  it("작은 떨림은 크게 줄인다", () => {
    const f = new OneEuro();
    let maxOut = 0;
    for (let i = 0; i < 90; i++) {
      const noisy = 0.5 + (i % 2 ? 0.004 : -0.004); // ±0.4% 흔들림
      const out = f.filter(noisy, i * 33);
      if (i > 10) maxOut = Math.max(maxOut, Math.abs(out - 0.5));
    }
    assert.ok(maxOut < 0.0025, `흔들림 ${maxOut}`);
  });

  it("크게 움직이면 금방 따라간다 (지연 최소)", () => {
    const f = new OneEuro();
    f.filter(0.2, 0);
    let out = 0;
    for (let i = 1; i <= 6; i++) out = f.filter(0.6, i * 33); // 0.2초 뒤
    assert.ok(out > 0.55, `따라간 위치 ${out}`);
  });

  it("FaceSmoother: 얼굴을 코 x 순서로 정렬, 인원이 바뀌면 새로 시작", () => {
    const s = new FaceSmoother();
    const a = faceGeometryFromLandmarks(fakeLandmarks(-0.2))!;
    const b = faceGeometryFromLandmarks(fakeLandmarks(0.2))!;
    const out = s.smooth([b, a], 0);
    close(out[0].nose.x, 0.3);
    close(out[1].nose.x, 0.7);
    const single = s.smooth([b], 33);
    close(single[0].nose.x, 0.7); // 필터 재시작 → 첫 값 그대로
  });
});
