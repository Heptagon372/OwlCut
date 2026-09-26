// 사진 확대·위치 (편집 화면에서 칸마다 조절) — 크롭 계산과 저장값 정리
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { coverCrop } from "@/lib/image/compose";
import { DEFAULT_ADJUST, PHOTO_ZOOM_MAX, clampAdjust, isDefaultAdjust, panBy } from "@/lib/image/photoAdjust";
import { layoutOptions } from "@/lib/image/layoutOptions";

const SLOT = { w: 540, h: 380 }; // 클래식 스트립 한 칸
const IMG = { w: 1280, h: 720 };

describe("사진 확대·위치", () => {
  it("확대하지 않으면 예전과 같은 크롭 (기존 사진이 달라지지 않게)", () => {
    const before = coverCrop(IMG.w, IMG.h, SLOT);
    assert.deepEqual(coverCrop(IMG.w, IMG.h, SLOT, null, DEFAULT_ADJUST), before);
    assert.deepEqual(coverCrop(IMG.w, IMG.h, SLOT, null, null), before);
  });

  it("2배 확대하면 크롭 창이 절반, 중심은 그대로", () => {
    const base = coverCrop(IMG.w, IMG.h, SLOT);
    const zoomed = coverCrop(IMG.w, IMG.h, SLOT, null, { zoom: 2, x: 0, y: 0 });
    assert.equal(zoomed.sw, base.sw / 2);
    assert.equal(zoomed.sh, base.sh / 2);
    assert.equal(zoomed.sx + zoomed.sw / 2, base.sx + base.sw / 2);
    assert.equal(zoomed.sy + zoomed.sh / 2, base.sy + base.sh / 2);
  });

  it("위치를 끝까지 밀어도 사진 밖으로 나가지 않는다", () => {
    for (const [x, y] of [[1, 1], [-1, -1], [1, -1]] as const) {
      const c = coverCrop(IMG.w, IMG.h, SLOT, null, { zoom: 1.6, x, y });
      assert.ok(c.sx >= 0 && c.sy >= 0, `${x},${y}`);
      assert.ok(c.sx + c.sw <= IMG.w + 1e-9 && c.sy + c.sh <= IMG.h + 1e-9, `${x},${y}`);
    }
  });

  it("x = 1 이면 오른쪽 끝, -1 이면 왼쪽 끝", () => {
    const right = coverCrop(IMG.w, IMG.h, SLOT, null, { zoom: 1.5, x: 1, y: 0 });
    const left = coverCrop(IMG.w, IMG.h, SLOT, null, { zoom: 1.5, x: -1, y: 0 });
    assert.equal(Math.round(right.sx + right.sw), IMG.w);
    assert.equal(left.sx, 0);
  });

  it("얼굴 초점 위에 얹힌다 (초점을 기준으로 밀고 당김)", () => {
    const focus = { x: 0.55, y: 0.4 }; // 0.7 이면 기본 크롭이 이미 오른쪽 끝이라 더 밀 수 없다
    const plain = coverCrop(IMG.w, IMG.h, SLOT, focus);
    const nudged = coverCrop(IMG.w, IMG.h, SLOT, focus, { zoom: 1, x: -0.5, y: 0 });
    assert.ok(nudged.sx < plain.sx, `${nudged.sx} < ${plain.sx}`);
  });

  it("끌어서 옮기기: 사진을 오른쪽으로 끌면 크롭은 왼쪽으로, 여백이 없는 축은 그대로", () => {
    const a = { zoom: 1.5, x: 0, y: 0 };
    const moved = panBy(a, 40, 0, 400, 0, 0.5); // 화면 40px, k=0.5 → 원본 80px, 여백 400px
    assert.ok(moved.x < 0 && moved.x >= -1);
    assert.equal(moved.y, 0); // 세로 여백 0 → 움직이지 않음
    assert.equal(panBy(a, 10_000, 0, 400, 0, 0.5).x, -1); // 많이 끌어도 끝까지만
  });

  it("값 다듬기 (잘못된 값·범위 밖)", () => {
    assert.deepEqual(clampAdjust({ zoom: 99, x: 5, y: -9 }), { zoom: PHOTO_ZOOM_MAX, x: 1, y: -1 });
    assert.deepEqual(clampAdjust({ zoom: Number.NaN, x: undefined as unknown as number, y: 0 }), DEFAULT_ADJUST);
    assert.deepEqual(clampAdjust(null), DEFAULT_ADJUST);
    assert.equal(isDefaultAdjust(null), true);
    assert.equal(isDefaultAdjust({ zoom: 1.2, x: 0, y: 0 }), false);
  });

  it("저장: 손대지 않았으면 null, 손댔으면 다듬어서 저장", () => {
    const base = { photoOrder: [0, 1, 2, 3], slotSpacing: 0, slotRounding: 0, backgroundColor: null, filterIntensity: 1 };
    assert.equal(layoutOptions({ ...base, photoAdjust: [null, DEFAULT_ADJUST] })?.photoAdjust, null);
    assert.equal(layoutOptions(base)?.photoAdjust, null);
    const saved = layoutOptions({ ...base, photoAdjust: [{ zoom: 9, x: 0.5, y: 0 }, null] })?.photoAdjust;
    assert.deepEqual(saved, [{ zoom: PHOTO_ZOOM_MAX, x: 0.5, y: 0 }, null]);
  });
});
