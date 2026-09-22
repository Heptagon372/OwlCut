"use client";
// 화면에 붙지 않는 공용 필터 엔진 1개 (썸네일·촬영 후 미리보기·최종 합성).
// render 직후 같은 동기 구간에서 canvas를 읽어야 한다 (중간에 await 금지 → 다른 호출과 섞이지 않음).
import type { FilterParams } from "@/types/filter";
import type { MosaicRegion, Warp } from "@/types/ar";
import { FilterEngine } from "./engine";
import { paramsToCss } from "./cssFallback";

let shared: FilterEngine | null | undefined; // undefined = 아직 시도 안 함, null = WebGL 없음

export function getOfflineEngine(): FilterEngine | null {
  if (shared === undefined || shared?.isLost) {
    try {
      shared = new FilterEngine();
    } catch (e) {
      // 조용히 CSS 폴백으로 넘어가면 원인을 알 수 없으므로 한 번 남긴다
      console.warn("[filters] WebGL 필터 엔진을 쓸 수 없어 간단한 CSS 필터로 대체합니다:", e);
      shared = null;
    }
  }
  return shared;
}

export function isNeutral(params: FilterParams, intensity = 1): boolean {
  return intensity <= 0 || Object.keys(params).length === 0;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = src;
  });
}

export type Drawable = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

export function sizeOf(src: Drawable): { w: number; h: number } {
  if (src instanceof HTMLVideoElement) return { w: src.videoWidth, h: src.videoHeight };
  if (src instanceof HTMLImageElement) return { w: src.naturalWidth, h: src.naturalHeight };
  return { w: src.width, h: src.height };
}

export interface FaceFx {
  warps?: Warp[];
  mosaics?: MosaicRegion[];
}

const hasFx = (fx?: FaceFx) => Boolean(fx?.warps?.length || fx?.mosaics?.length);

/**
 * 소스의 (sx,sy,sw,sh) 영역에 필터(+AR 얼굴 왜곡·모자이크)를 적용해 ctx 의 (dx,dy,dw,dh) 에 그린다.
 * WebGL이 없으면 CSS 필터 근사치로 그린다 (얼굴 효과는 생략).
 */
export function drawFiltered(
  ctx: CanvasRenderingContext2D,
  src: Drawable,
  crop: { sx: number; sy: number; sw: number; sh: number },
  dest: { x: number; y: number; w: number; h: number },
  params: FilterParams,
  intensity = 1,
  seed = 0,
  fx?: FaceFx,
) {
  const { w, h } = sizeOf(src);
  if (!isNeutral(params, intensity) || hasFx(fx)) {
    const engine = getOfflineEngine();
    const ok = engine?.render(src, w, h, params, {
      width: dest.w,
      height: dest.h,
      srcRect: { x: crop.sx, y: crop.sy, w: crop.sw, h: crop.sh },
      intensity,
      seed,
      warps: fx?.warps,
      mosaics: fx?.mosaics,
    });
    if (engine && ok) {
      ctx.drawImage(engine.canvas, dest.x, dest.y, dest.w, dest.h);
      return;
    }
  }
  ctx.save();
  ctx.filter = isNeutral(params, intensity) ? "none" : paramsToCss(params, intensity);
  ctx.drawImage(src, crop.sx, crop.sy, crop.sw, crop.sh, dest.x, dest.y, dest.w, dest.h);
  ctx.restore();
  // WebGL 없이도 모자이크는 지킨다 (얼굴 가리기 용도라서). 왜곡은 생략.
  if (fx?.mosaics?.length) mosaicFallback(ctx, src, w, h, crop, dest, fx.mosaics);
}

function mosaicFallback(
  ctx: CanvasRenderingContext2D,
  src: Drawable,
  w: number,
  h: number,
  crop: { sx: number; sy: number; sw: number; sh: number },
  dest: { x: number; y: number; w: number; h: number },
  regions: MosaicRegion[],
) {
  const k = dest.w / crop.sw;
  const tiny = document.createElement("canvas");
  tiny.width = Math.max(1, Math.round(dest.w / 12));
  tiny.height = Math.max(1, Math.round((tiny.width * dest.h) / dest.w));
  tiny.getContext("2d")?.drawImage(src, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, tiny.width, tiny.height);
  for (const m of regions) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(dest.x + (m.x * w - crop.sx) * k, dest.y + (m.y * h - crop.sy) * k, m.rx * k, m.ry * k, m.angle, 0, Math.PI * 2);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tiny, dest.x, dest.y, dest.w, dest.h);
    ctx.restore();
  }
}

/** 소스 가운데를 정사각형(또는 지정 비율)으로 잘라 필터 적용한 JPEG dataURL */
export function filteredSnapshot(
  src: Drawable,
  params: FilterParams,
  opts: { width: number; height: number; intensity?: number; mirror?: boolean },
): string {
  const { w, h } = sizeOf(src);
  const ratio = opts.width / opts.height;
  const sw = w / h > ratio ? h * ratio : w;
  const sh = w / h > ratio ? h : w / ratio;
  const canvas = document.createElement("canvas");
  canvas.width = opts.width;
  canvas.height = opts.height;
  const ctx = canvas.getContext("2d")!;
  if (opts.mirror) {
    ctx.translate(opts.width, 0);
    ctx.scale(-1, 1);
  }
  drawFiltered(
    ctx,
    src,
    { sx: (w - sw) / 2, sy: (h - sh) / 2, sw, sh },
    { x: 0, y: 0, w: opts.width, h: opts.height },
    params,
    opts.intensity ?? 1,
  );
  return canvas.toDataURL("image/jpeg", 0.82);
}

// 개발 모드 전용: 브라우저 콘솔에서 필터 엔진을 직접 점검 (production 빌드에는 포함되지 않음)
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__owlcutFilters = {
    getOfflineEngine,
    drawFiltered,
    filteredSnapshot,
    presets: () => import("@/lib/data/registry").then((m) => m.FILTERS),
  };
}
