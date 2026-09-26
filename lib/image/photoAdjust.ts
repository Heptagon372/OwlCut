// 사진 확대·위치 (편집 화면에서 칸마다 조절). 순수 함수 — 미리보기·합성·테스트가 공유한다.
// zoom: 1 = 칸을 가득 채우는 기본 크롭, 2 = 두 배 확대.
// x·y: 남는 여백 대비 -1~1 (0 = 기본 위치, 1 = 오른쪽·아래 끝). 해상도와 무관하므로 저장해도 안전.
import type { PhotoAdjust } from "@/types/design";

export const PHOTO_ZOOM_MIN = 1;
export const PHOTO_ZOOM_MAX = 3;
export const DEFAULT_ADJUST: PhotoAdjust = { zoom: 1, x: 0, y: 0 };

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

export function clampAdjust(a: Partial<PhotoAdjust> | null | undefined): PhotoAdjust {
  return {
    zoom: clamp(num(a?.zoom, 1), PHOTO_ZOOM_MIN, PHOTO_ZOOM_MAX),
    x: clamp(num(a?.x, 0), -1, 1),
    y: clamp(num(a?.y, 0), -1, 1),
  };
}

/** 기본값(가득 채우기)인가 — 화면에서 '되돌리기'를 보여 줄지 판단 */
export const isDefaultAdjust = (a: PhotoAdjust | null | undefined) =>
  !a || (a.zoom === 1 && a.x === 0 && a.y === 0);

/** 끌어서 옮긴 화면 거리(px) → 위치 값. free = 그 축에서 움직일 수 있는 원본 px, k = 화면 px / 원본 px */
export function panBy(a: PhotoAdjust, dxScreen: number, dyScreen: number, freeX: number, freeY: number, k: number): PhotoAdjust {
  // 사진을 오른쪽으로 끌면 크롭 창은 왼쪽으로 → 부호 반대. 여백이 0이면 그 축은 움직이지 않는다.
  const step = (d: number, free: number) => (free > 0 ? (-d / k / (free / 2)) : 0);
  return clampAdjust({ zoom: a.zoom, x: a.x + step(dxScreen, freeX), y: a.y + step(dyScreen, freeY) });
}
