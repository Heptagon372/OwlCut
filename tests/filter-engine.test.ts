import assert from "node:assert/strict";
import { it as t } from "vitest";
import { curveLut, curveTextureData, hasCurves } from "@/lib/filters/curves";
import { paramsToCss } from "@/lib/filters/cssFallback";
import { hexToRgb } from "@/lib/filters/engine";


t("커브 없음/점 1개 → 직선 (입력 = 출력)", () => {
  const id = curveLut(undefined);
  for (let i = 0; i < 256; i++) assert.equal(id[i], i);
  assert.deepEqual([...curveLut([[0.5, 0.5]])], [...id]);
});

t("S커브: 제어점 통과, 단조 증가, 0~255 범위", () => {
  const lut = curveLut([[0, 0], [0.25, 0.18], [0.75, 0.84], [1, 1]]);
  assert.equal(lut[0], 0);
  assert.equal(lut[255], 255);
  assert.ok(Math.abs(lut[Math.round(0.25 * 255)] - 0.18 * 255) <= 1.5);
  assert.ok(Math.abs(lut[Math.round(0.75 * 255)] - 0.84 * 255) <= 1.5);
  for (let i = 1; i < 256; i++) assert.ok(lut[i] >= lut[i - 1], `역전 @${i}`);
});

t("급한 커브도 튀지 않음 (Fritsch–Carlson: 오버슈트 없음)", () => {
  const lut = curveLut([[0, 0], [0.1, 0.5], [0.2, 0.52], [1, 1]]);
  for (let i = 1; i < 256; i++) assert.ok(lut[i] >= lut[i - 1], `역전 @${i}`);
  assert.ok(Math.max(...lut.slice(26, 51)) <= Math.round(0.52 * 255) + 1, "0.1~0.2 구간에서 제어점 위로 튀면 안 됨");
});

t("페이드 커브: 검정을 띄움 (0 → 0.08)", () => {
  const lut = curveLut([[0, 0.08], [1, 0.95]]);
  assert.equal(lut[0], Math.round(0.08 * 255));
  assert.equal(lut[255], Math.round(0.95 * 255));
});

t("잘못된 점(범위 밖·NaN·역순·중복)은 정리", () => {
  const lut = curveLut([[1.2, 1.5], [NaN, 0], [0, -0.1], [0.5, 0.6], [0.5, 0.1]]);
  assert.equal(lut[0], 0);
  assert.equal(lut[255], 255);
  for (let i = 1; i < 256; i++) assert.ok(lut[i] >= lut[i - 1]);
});

t("텍스처: RGBA = 채널별 R,G,B + 전체 커브 A", () => {
  const data = curveTextureData({ curves: { rgb: [[0, 0.1], [1, 1]], b: [[0, 0.2], [1, 0.9]] } });
  assert.equal(data.length, 256 * 4);
  assert.equal(data[0], 0);                          // r: 직선
  assert.equal(data[2], Math.round(0.2 * 255));      // b 커브 시작
  assert.equal(data[3], Math.round(0.1 * 255));      // rgb 커브 시작
  assert.equal(hasCurves({}), false);
  assert.equal(hasCurves({ curves: {} }), false);
  assert.equal(hasCurves({ curves: { g: [[0, 0], [1, 1]] } }), true);
});

t("CSS 폴백: 중립이면 none, 흑백·밝기·강도 반영", () => {
  assert.equal(paramsToCss({}), "none");
  assert.equal(paramsToCss({ bw: 1, contrast: 1.2 }), "contrast(1.2) grayscale(1)");
  assert.equal(paramsToCss({ bw: 1 }, 0), "none");
  assert.equal(paramsToCss({ bw: 1 }, 0.5), "grayscale(0.5)");
  assert.match(paramsToCss({ exposure: 1 }), /brightness\(2\)/);
  assert.match(paramsToCss({ temperature: -1 }), /hue-rotate\(-12deg\)/);
});

t("hex 색 변환", () => {
  assert.deepEqual(hexToRgb("#ff8000", [0, 0, 0]), [1, 128 / 255, 0]);
  assert.deepEqual(hexToRgb("nope", [0.5, 0.5, 0.5]), [0.5, 0.5, 0.5]);
  assert.deepEqual(hexToRgb(undefined, [1, 1, 1]), [1, 1, 1]);
});

