"use client";
// 사진 한 장 + 필터 + AR 얼굴 효과를 그리는 공용 함수 (최종 합성·촬영 직후 확인·효과 썸네일이 공유).
// faces 는 src 이미지 기준 0~1 좌표. 스티커 그림은 미리 ensureAssets 로 불러둘 것.
import type { ArEffect, FaceGeometry } from "@/types/ar";
import type { FilterParams } from "@/types/filter";
import { drawFiltered, sizeOf, type Drawable } from "@/lib/filters/offline";
import { effectWarps, mosaicRegions, placements, toSlot } from "./geometry";
import { drawPlacements } from "./render";

export function drawWithEffect(
  ctx: CanvasRenderingContext2D,
  src: Drawable,
  crop: { sx: number; sy: number; sw: number; sh: number },
  dest: { x: number; y: number; w: number; h: number },
  params: FilterParams,
  intensity: number,
  effect: ArEffect | null,
  faces: FaceGeometry[] | null | undefined,
  seed = 0,
) {
  const { w, h } = sizeOf(src);
  const list = effect && faces?.length ? faces : [];
  const fx = list.length
    ? { warps: effectWarps(effect, list, w, h), mosaics: mosaicRegions(effect, list, w, h) }
    : undefined;
  drawFiltered(ctx, src, crop, dest, params, intensity, seed, fx);
  if (effect?.parts.length && list.length) {
    drawPlacements(ctx, placements(effect, list, w, h).map((p) => toSlot(p, crop, dest)));
  }
}

/** 가운데 cover 크롭으로 (width x height) 스냅샷 dataURL */
export function effectSnapshot(
  src: Drawable,
  opts: {
    width: number;
    height: number;
    params?: FilterParams;
    intensity?: number;
    effect: ArEffect | null;
    faces: FaceGeometry[] | null | undefined;
    quality?: number;
  },
): string {
  const { w, h } = sizeOf(src);
  const ratio = opts.width / opts.height;
  const sw = w / h > ratio ? h * ratio : w;
  const sh = w / h > ratio ? h : w / ratio;
  const canvas = document.createElement("canvas");
  canvas.width = opts.width;
  canvas.height = opts.height;
  const ctx = canvas.getContext("2d")!;
  drawWithEffect(
    ctx,
    src,
    { sx: (w - sw) / 2, sy: (h - sh) / 2, sw, sh },
    { x: 0, y: 0, w: opts.width, h: opts.height },
    opts.params ?? {},
    opts.intensity ?? 1,
    opts.effect,
    opts.faces,
  );
  return canvas.toDataURL("image/jpeg", opts.quality ?? 0.85);
}

/** 좌우 반전 복사본 (거울 모드 카메라 스냅샷 → 화면에 보이는 방향) */
export function mirroredCopy(src: Drawable): HTMLCanvasElement {
  const { w, h } = sizeOf(src);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}
