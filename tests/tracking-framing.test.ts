import assert from "node:assert/strict";
import { it as t } from "vitest";
import { unionBox, framingHint, focusFromBox, largestFaceHeight, toBox } from "@/lib/tracking/framing";
import { coverCrop } from "@/lib/image/compose";

const face = (cx: number, cy: number, h: number) => ({ x: cx - h * 0.4, y: cy - h / 2, w: h * 0.8, h });

t("toBox: 픽셀 → 0~1 정규화", () => {
  assert.deepEqual(toBox({ originX: 320, originY: 180, width: 640, height: 360 }, 1280, 720), { x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
});

t("unionBox: 두 얼굴을 모두 감싸는 박스, 거리 판단은 가장 큰 얼굴", () => {
  const boxes = [{ x: 0.1, y: 0.2, w: 0.1, h: 0.2 }, { x: 0.6, y: 0.3, w: 0.15, h: 0.25 }];
  const u = unionBox(boxes)!;
  assert.ok(Math.abs(u.x - 0.1) < 1e-9 && Math.abs(u.w - 0.65) < 1e-9 && Math.abs(u.h - 0.35) < 1e-9);
  assert.equal(largestFaceHeight(boxes), 0.25);
  assert.equal(unionBox([]), null);
});

t("얼굴 없음 / 너무 멂 / 너무 가까움 / 단체가 너무 넓음", () => {
  assert.equal(framingHint(null, 0, true).state, "none");
  assert.equal(framingHint(face(0.5, 0.5, 0.08), 0.08, true).state, "closer");
  assert.equal(framingHint(face(0.5, 0.5, 0.6), 0.6, true).state, "farther");
  assert.equal(framingHint({ x: 0.02, y: 0.3, w: 0.96, h: 0.3 }, 0.25, true).state, "farther");
});

t("거울 화면: 인물이 화면 왼쪽(비디오 오른쪽)에 있으면 → 사용자가 오른쪽으로", () => {
  // 비디오 cx=0.8 → 거울 표시 x=0.2 (화면 왼쪽)
  assert.equal(framingHint(face(0.8, 0.5, 0.25), 0.25, true).state, "move-right");
  assert.equal(framingHint(face(0.2, 0.5, 0.25), 0.25, true).state, "move-left");
});

t("비거울 화면: 인물이 화면 왼쪽이면 → 사용자가 왼쪽으로 (영상은 반대로 움직임)", () => {
  assert.equal(framingHint(face(0.2, 0.5, 0.25), 0.25, false).state, "move-left");
  assert.equal(framingHint(face(0.8, 0.5, 0.25), 0.25, false).state, "move-right");
});

t("가운데 + 적당한 거리 → good", () => {
  assert.equal(framingHint(face(0.52, 0.45, 0.25), 0.25, true).state, "good");
});

t("focusFromBox: 캡처가 좌우 반전되면 x도 반전", () => {
  const b = face(0.8, 0.4, 0.2);
  assert.ok(Math.abs(focusFromBox(b, true)!.x - 0.2) < 1e-9);
  assert.ok(Math.abs(focusFromBox(b, false)!.x - 0.8) < 1e-9);
  assert.equal(focusFromBox(null, true), null);
});

t("coverCrop: 초점 없으면 가운데 크롭 (1280x720 → 1:1 슬롯)", () => {
  assert.deepEqual(coverCrop(1280, 720, { w: 485, h: 485 }), { sx: 280, sy: 0, sw: 720, sh: 720 });
});

t("coverCrop: 인물이 오른쪽이면 크롭 창도 오른쪽으로, 이미지 밖으로는 안 나감", () => {
  const c = coverCrop(1280, 720, { w: 485, h: 485 }, { x: 0.65, y: 0.5 });
  assert.equal(c.sx, 0.65 * 1280 - 360); // 472 (가운데 280보다 오른쪽)
  const edge = coverCrop(1280, 720, { w: 485, h: 485 }, { x: 0.98, y: 0.5 });
  assert.equal(edge.sx, 1280 - 720); // 560 (오른쪽 끝에 고정)
});

t("coverCrop: 가로로 넓은 슬롯에선 세로 크롭을 얼굴 기준(헤드룸)으로", () => {
  // 1280x720 → 540x380 슬롯: sw=1280, sh≈900.7? (이미지보다 큼 X) → imgRatio 1.78 > 1.42 이므로 sh=720
  const c = coverCrop(1280, 720, { w: 540, h: 380 }, { x: 0.5, y: 0.3 });
  assert.equal(c.sh, 720);
  assert.equal(c.sy, 0); // 세로 여유가 없으면 이동 불가
  const tall = coverCrop(720, 1280, { w: 540, h: 380 }, { x: 0.5, y: 0.3 }); // 세로 사진
  assert.ok(tall.sy > 0 && tall.sy < 1280 - tall.sh); // 얼굴 쪽으로 이동
  assert.ok(Math.abs(tall.sy - (0.3 * 1280 - tall.sh * 0.42)) < 1e-9);
});

