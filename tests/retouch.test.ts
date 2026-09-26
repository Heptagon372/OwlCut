// 카메라 보정: 필터 위에 얹는 규칙 (순수 함수)
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { DEFAULT_RETOUCH, RETOUCH_STEPS, clampRetouch, isRetouchOn, retouchWarps, withRetouch } from "@/lib/filters/retouch";
import { MAX_WARPS, effectWarps } from "@/lib/ar/geometry";
import { getEffect } from "@/lib/ar/effects";
import type { FaceGeometry } from "@/types/ar";

// 정면 얼굴 (ar-effects 테스트와 같은 모양), cx 만 옮긴다
const face = (cx: number): FaceGeometry => ({
  forehead: { x: cx, y: 0.26 },
  chin: { x: cx, y: 0.74 },
  faceLeft: { x: cx - 0.2, y: 0.46 },
  faceRight: { x: cx + 0.2, y: 0.46 },
  eyeLeft: { x: cx - 0.09, y: 0.44 },
  eyeRight: { x: cx + 0.09, y: 0.44 },
  nose: { x: cx, y: 0.55 },
  mouth: { x: cx, y: 0.63 },
  mouthLeft: { x: cx - 0.05, y: 0.63 },
  mouthRight: { x: cx + 0.05, y: 0.63 },
  cheekLeft: { x: cx - 0.11, y: 0.56 },
  cheekRight: { x: cx + 0.11, y: 0.56 },
  mouthOpen: 0,
});

describe("카메라 보정", () => {
  it("보정이 없으면 필터 파라미터를 그대로 (원본은 원본대로)", () => {
    const params = { contrast: 1.1, smooth: 0.2 };
    assert.equal(withRetouch(params, DEFAULT_RETOUCH), params);
    assert.equal(withRetouch(params, null), params);
    assert.equal(isRetouchOn(DEFAULT_RETOUCH), false);
  });

  it("피부 보정은 필터가 이미 쓰는 값과 더 센 쪽으로 (겹쳐서 뭉개지지 않게)", () => {
    const strong = withRetouch({ smooth: 0.5 }, { skin: 0.35, bright: 0, slim: 0 });
    assert.equal(strong.smooth, 0.5); // 필터가 더 셈 → 그대로
    const weak = withRetouch({ smooth: 0.05 }, { skin: 1, bright: 0, slim: 0 });
    assert.ok((weak.smooth ?? 0) > 0.5 && (weak.smooth ?? 0) <= 0.6);
    assert.ok((weak.glow ?? 0) > 0);
  });

  it("밝기는 더해지고, 하이라이트는 조금 내려 날아가지 않게", () => {
    const p = withRetouch({ exposure: 0.1, shadows: 0.1, highlights: 0 }, { skin: 0, bright: 1, slim: 0 });
    assert.ok((p.exposure ?? 0) > 0.3);
    assert.ok((p.shadows ?? 0) > 0.3);
    assert.ok((p.highlights ?? 0) < 0);
  });

  it("갸름하게는 왜곡으로 (안쪽으로 당김, 접히지 않는 세기)", () => {
    assert.deepEqual(retouchWarps(DEFAULT_RETOUCH), []);
    const [w] = retouchWarps({ skin: 0, bright: 0, slim: 1 });
    assert.ok(w.strength < 0 && Math.abs(w.strength) < 1, String(w.strength));
    assert.equal(w.at, "mouth");
  });

  it("효과 왜곡과 보정 왜곡이 함께 들어가도 셰이더 한도를 넘지 않는다", () => {
    const faces = [face(0.3), face(0.5), face(0.7), face(0.9)];
    const purikura = getEffect("purikura")!;
    const warps = effectWarps(purikura, faces, 1000, 1000, retouchWarps({ skin: 0, bright: 0, slim: 1 }));
    assert.ok(warps.length <= MAX_WARPS, String(warps.length));
    assert.ok(warps.length > 0);
  });

  it("얼굴이 없으면 왜곡도 없다 (보정을 켜도 사진은 그대로)", () => {
    assert.deepEqual(effectWarps(null, [], 1000, 1000, retouchWarps({ skin: 0, bright: 0, slim: 1 })), []);
  });

  it("값 다듬기 (범위 밖·이상한 값)", () => {
    assert.deepEqual(clampRetouch({ skin: 5, bright: -2, slim: Number.NaN }), { skin: 1, bright: 0, slim: 0 });
    assert.deepEqual(clampRetouch(undefined), DEFAULT_RETOUCH);
    assert.deepEqual([...RETOUCH_STEPS], [0, 0.35, 0.65, 1]);
  });
});
