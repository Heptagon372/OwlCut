// 화면 구성 계산 — 순수 함수 (합성 엔진과 편집 UI가 공유, DOM 의존 없음).
import { SCREEN_LEVEL_MAX, type LayoutConfig, type PhotoSlot } from "@/types/design";

const SPACING_PER_LEVEL = 0.004; // 단계당 안쪽 여백 = 타일 너비의 0.4% (strip 600px → 최대 24px)
const ROUNDING_MAX_RATIO = 0.2;  // 최대 둥글기 = 사진 짧은 변의 20%

export function clampLevel(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : 0;
  return Math.min(Math.max(n, 0), SCREEN_LEVEL_MAX);
}

// 최종 이미지 크기 (타일 반복 포함)
export function outputSize(layout: LayoutConfig): { width: number; height: number } {
  const { width, height } = layout.canvas;
  if (!layout.tile) return { width, height };
  const cols = Math.max(1, layout.tile.columns);
  const rows = Math.max(1, layout.tile.rows ?? 1);
  const g = layout.tile.gutter ?? 0;
  return { width: cols * width + (cols - 1) * g, height: rows * height + (rows - 1) * g };
}

export function identityOrder(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

// 0..n-1 의 순열이 아니면(레이아웃 변경·깨진 값) 기본 순서로
export function normalizeOrder(order: readonly number[] | undefined, n: number): number[] {
  if (!order || order.length !== n) return identityOrder(n);
  const seen = new Set(order);
  const valid = seen.size === n && order.every((v) => Number.isInteger(v) && v >= 0 && v < n);
  return valid ? [...order] : identityOrder(n);
}

export function swapOrder(order: readonly number[], a: number, b: number): number[] {
  const next = [...order];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

// 간격 단계만큼 사진을 안쪽으로 줄인다 → 사진 사이·가장자리 여백이 함께 넓어짐
export function spacedSlot(slot: PhotoSlot, level: number, tileWidth: number): PhotoSlot {
  const inset = Math.min(clampLevel(level) * tileWidth * SPACING_PER_LEVEL, Math.min(slot.w, slot.h) * 0.2);
  return { x: slot.x + inset, y: slot.y + inset, w: slot.w - inset * 2, h: slot.h - inset * 2 };
}

export function cornerRadius(slot: PhotoSlot, level: number): number {
  return (clampLevel(level) / SCREEN_LEVEL_MAX) * Math.min(slot.w, slot.h) * ROUNDING_MAX_RATIO;
}
