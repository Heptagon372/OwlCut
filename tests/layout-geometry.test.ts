import assert from "node:assert/strict";
import { it as t } from "vitest";
import { DEFAULT_LAYOUT_ID, LAYOUTS, SHOT_COUNTS, defaultLayoutFor, layoutsFor } from "@/lib/data/registry";
import {
  outputSize, normalizeOrder, swapOrder, spacedSlot, cornerRadius, clampLevel, identityOrder,
} from "@/lib/image/layoutGeometry";
import { layoutOptions } from "@/lib/image/layoutOptions";

type R = { x: number; y: number; w: number; h: number };
const overlap = (a: R, b: R) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

t(`레이아웃 ${LAYOUTS.length}개, id 중복 없음, 칸 수 = 촬영 매수`, () => {
  assert.equal(LAYOUTS.length, 9);
  assert.equal(new Set(LAYOUTS.map((l) => l.id)).size, LAYOUTS.length);
  for (const l of LAYOUTS) assert.equal(l.slots.length, l.photoCount, l.id);
});

t("촬영 매수는 레이아웃에서: 4·6컷, 매수별 기본 레이아웃", () => {
  assert.deepEqual(SHOT_COUNTS, [4, 6]);
  assert.equal(defaultLayoutFor(4).id, DEFAULT_LAYOUT_ID); // 4컷은 기존 기본 그대로
  assert.equal(defaultLayoutFor(6).photoCount, 6);
  assert.ok(layoutsFor(6).every((l) => l.photoCount === 6) && layoutsFor(6).length === 2);
  assert.equal(defaultLayoutFor(8).id, DEFAULT_LAYOUT_ID); // 없는 매수 → 기본 레이아웃
  assert.deepEqual(normalizeOrder([0, 1, 2, 3], 6), [0, 1, 2, 3, 4, 5]); // 4→6컷 전환 시 순서 초기화
});

t("6컷 레이아웃은 4x6 인화 크기 (300dpi)", () => {
  for (const l of layoutsFor(6)) {
    const { width, height } = outputSize(l);
    assert.deepEqual([Math.min(width, height), Math.max(width, height)], [1200, 1800], l.id);
  }
});

t("모든 사진(과 폴라로이드 카드)이 캔버스 안, 서로 겹치지 않음", () => {
  for (const l of LAYOUTS) {
    const p = l.cards?.padding ?? 0, bp = l.cards?.bottomPadding ?? 0;
    const boxes = l.slots.map((s) => ({ x: s.x - p, y: s.y - p, w: s.w + 2 * p, h: s.h + p + bp }));
    for (const b of boxes) {
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= l.canvas.width && b.y + b.h <= l.canvas.height, `${l.id} 캔버스 밖`);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      assert.ok(!overlap(boxes[i], boxes[j]), `${l.id} 자리 ${i + 1}·${j + 1} 겹침`);
    }
  }
});

t("모든 레이아웃이 하단에 브랜딩 문구 자리(≥100px)를 남김", () => {
  for (const l of LAYOUTS) {
    const bp = l.cards?.bottomPadding ?? 0;
    const bottom = Math.max(...l.slots.map((s) => s.y + s.h + bp));
    assert.ok(l.canvas.height - bottom >= 100, `${l.id}: 하단 여백 ${l.canvas.height - bottom}px`);
  }
});

t("좌우 여백 대칭 (가운데 정렬)", () => {
  for (const l of LAYOUTS) {
    const left = Math.min(...l.slots.map((s) => s.x));
    const right = l.canvas.width - Math.max(...l.slots.map((s) => s.x + s.w));
    assert.equal(left, right, `${l.id}: 왼쪽 ${left} / 오른쪽 ${right}`);
  }
});

t("인생네컷 오리지널 = 스트립 2줄 → 1200x1800 (4x6 inch @300dpi)", () => {
  const x2 = LAYOUTS.find((l) => l.id === "classic-strip-x2")!;
  assert.deepEqual(outputSize(x2), { width: 1200, height: 1800 });
  assert.deepEqual(outputSize(LAYOUTS[0]), { width: 600, height: 1800 });
  assert.deepEqual(outputSize({ ...x2, tile: { columns: 2, rows: 2, gutter: 10 } }), { width: 1210, height: 3610 });
});

t("사진 순서: 정상 순열만 허용, 깨진 값은 찍은 순서로", () => {
  assert.deepEqual(normalizeOrder([2, 0, 3, 1], 4), [2, 0, 3, 1]);
  assert.deepEqual(normalizeOrder([0, 0, 1, 2], 4), [0, 1, 2, 3]); // 중복
  assert.deepEqual(normalizeOrder([0, 1, 2, 9], 4), [0, 1, 2, 3]); // 범위 밖
  assert.deepEqual(normalizeOrder([0, 1, 2], 4), [0, 1, 2, 3]);    // 길이
  assert.deepEqual(normalizeOrder(undefined, 4), identityOrder(4));
  assert.deepEqual(swapOrder([0, 1, 2, 3], 0, 3), [3, 1, 2, 0]);
});

t("간격: 단계만큼 안쪽으로, 중심 유지, 과도하면 제한", () => {
  const s = { x: 30, y: 30, w: 540, h: 380 };
  assert.deepEqual(spacedSlot(s, 0, 600), s);
  const d = spacedSlot(s, 10, 600); // 10 * 600 * 0.004 = 24
  assert.ok(Math.abs(d.x - 54) < 1e-9 && Math.abs(d.w - 492) < 1e-9);
  assert.ok(Math.abs(d.x + d.w / 2 - (s.x + s.w / 2)) < 1e-9, "중심 유지");
  const tiny = spacedSlot({ x: 0, y: 0, w: 100, h: 100 }, 10, 5000); // 요청 200px → 20px로 제한
  assert.ok(Math.abs(tiny.w - 60) < 1e-9);
});

t("모서리/단계 값 범위 제한", () => {
  const s = { x: 0, y: 0, w: 500, h: 400 };
  assert.equal(cornerRadius(s, 0), 0);
  assert.equal(cornerRadius(s, 10), 80); // 400 * 0.2
  assert.equal(cornerRadius(s, 99), 80);
  assert.equal(clampLevel(-3), 0);
  assert.equal(clampLevel("7"), 0);
  assert.equal(clampLevel(4.6), 5);
});

t("DB 저장값 정리: 잘못된 색·범위·타입 걸러냄", () => {
  assert.deepEqual(
    layoutOptions({ photoOrder: [1, 0, 2, 3], slotSpacing: 3, slotRounding: 50, backgroundColor: "#FFD6E0", filterIntensity: 0.4, effect: "cat" }),
    { photoOrder: [1, 0, 2, 3], slotSpacing: 3, slotRounding: 10, backgroundColor: "#FFD6E0", filterIntensity: 0.4, effect: "cat" },
  );
  assert.deepEqual(layoutOptions({ backgroundColor: "red; drop table", photoOrder: "x", effect: "<script>" }), {
    photoOrder: null,
    slotSpacing: 0,
    slotRounding: 0,
    backgroundColor: null,
    filterIntensity: 1,
    effect: "none",
  });
  assert.equal(layoutOptions(null), null);
});

t("필터 강도는 0~1 로 제한, 숫자가 아니면 기본 1", () => {
  assert.equal(layoutOptions({ filterIntensity: 7 })?.filterIntensity, 1);
  assert.equal(layoutOptions({ filterIntensity: -2 })?.filterIntensity, 0);
  assert.equal(layoutOptions({ filterIntensity: "0.5" })?.filterIntensity, 1);
  assert.equal(layoutOptions({ filterIntensity: NaN })?.filterIntensity, 1);
});

