// 스티커 배치 계산 — 순수 함수 (편집 화면 드래그·합성 엔진·AI 응답 변환이 공유).
// 좌표: x·y = 타일(스트립 한 장) 너비·높이 대비 중심 위치, size = 타일 짧은 변 대비 폭, rotation = 도.
import type { Anchor, StickerInstance } from "@/types/design";

export const STICKER_MIN = 0.06;
export const STICKER_MAX = 1.2;
export const STICKER_DEFAULT = 0.32;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** -180 < r ≤ 180 */
export function normalizeDeg(r: number): number {
  const m = ((r % 360) + 360) % 360;
  return m > 180 ? m - 360 : m;
}

/** 중심은 타일 안에, 크기는 범위 안에 */
export function clampSticker(s: StickerInstance): StickerInstance {
  return {
    ...s,
    x: clamp(Number.isFinite(s.x) ? s.x : 0.5, 0, 1),
    y: clamp(Number.isFinite(s.y) ? s.y : 0.5, 0, 1),
    size: clamp(Number.isFinite(s.size) ? s.size : STICKER_DEFAULT, STICKER_MIN, STICKER_MAX),
    rotation: normalizeDeg(Number.isFinite(s.rotation) ? s.rotation : 0),
  };
}

/** 타일 px 기준 배치 (합성·화면 공통) */
export function stickerBox(s: StickerInstance, tileW: number, tileH: number) {
  return { cx: s.x * tileW, cy: s.y * tileH, w: s.size * Math.min(tileW, tileH) };
}

/** 끌어서 옮기기: 화면에서 움직인 px → 비율 */
export function moveSticker(s: StickerInstance, dxPx: number, dyPx: number, tileWPx: number, tileHPx: number): StickerInstance {
  return clampSticker({ ...s, x: s.x + dxPx / tileWPx, y: s.y + dyPx / tileHPx });
}

/**
 * 모서리 손잡이: 중심에서 손가락까지의 거리 비율로 크기, 각도 차이로 회전 (인스타 스토리 방식).
 * center·from·to 는 같은 화면 좌표계(px).
 */
export function transformSticker(
  start: StickerInstance,
  center: { x: number; y: number },
  from: { x: number; y: number },
  to: { x: number; y: number },
): StickerInstance {
  const d0 = Math.hypot(from.x - center.x, from.y - center.y);
  const d1 = Math.hypot(to.x - center.x, to.y - center.y);
  if (d0 < 1) return start;
  const a0 = Math.atan2(from.y - center.y, from.x - center.x);
  const a1 = Math.atan2(to.y - center.y, to.x - center.x);
  return clampSticker({
    ...start,
    size: start.size * (d1 / d0),
    rotation: start.rotation + ((a1 - a0) * 180) / Math.PI,
  });
}

// AI 응답의 9분할 위치 → 좌표. 가장자리는 사진 모서리에 살짝 걸치는 정도.
const ANCHOR_POS: Record<Anchor, [number, number]> = {
  "top-left": [0.18, 0.08], top: [0.5, 0.08], "top-right": [0.82, 0.08],
  left: [0.18, 0.5], center: [0.5, 0.5], right: [0.82, 0.5],
  "bottom-left": [0.18, 0.86], bottom: [0.5, 0.86], "bottom-right": [0.82, 0.86],
};

export function anchorToPosition(anchor: Anchor): { x: number; y: number } {
  const [x, y] = ANCHOR_POS[anchor];
  return { x, y };
}

export function newUid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// 새 스티커는 가운데 근처에, 여러 개 붙이면 겹치지 않게 조금씩 비껴서
const SPREAD = [
  [0, 0], [0.12, -0.06], [-0.12, 0.06], [0.1, 0.1], [-0.1, -0.1], [0.14, 0.04], [-0.14, -0.04],
];

export function newSticker(id: string, existing: number, uid = newUid()): StickerInstance {
  const [dx, dy] = SPREAD[existing % SPREAD.length];
  return { uid, id, x: 0.5 + dx, y: 0.42 + dy, size: STICKER_DEFAULT, rotation: 0 };
}
