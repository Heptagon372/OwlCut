// ============================================================
// 이미지 합성 엔진 (설계도 7-3) — 프로젝트의 핵심 모듈.
// 레이어 순서: 배경(단색·그라데이션·패턴) → 프레임 장식(아래) → 사진(+필터, AR 얼굴 효과) → 테두리
//            → 프레임 장식(위: 테이프·리본) → 문구 → 하단 브랜딩 → 스티커 (편집 화면의 스티커 층과 같은 순서)
// 수동 편집과 AI 편집이 이 동일한 엔진을 공유한다.
// * 브라우저 전용 (canvas/Image 사용). 서버에서 import 후 호출하지 말 것.
// ============================================================
import type { ComposeInput, Focus, PhotoAdjust, PhotoSlot, StickerInstance, TextLayer } from "@/types/design";
import { getFilter } from "@/lib/data/registry";
import { effectAssets, getEffect } from "@/lib/ar/effects";
import { ensureAssets } from "@/lib/ar/assets";
import { drawWithEffect } from "@/lib/ar/draw";
import { ensureStickers, getStickerImage } from "@/lib/stickers/images";
import { stickerBox } from "@/lib/stickers/geometry";
import { canvasFont, ensureFonts } from "@/lib/fonts";
import { cornerRadius, normalizeOrder, outputSize, spacedSlot } from "./layoutGeometry";
import { DEFAULT_ADJUST, clampAdjust } from "./photoAdjust";
import { roundRectPath } from "./canvasPath";
import { readableTextOn } from "./color";
import { drawDecorations, frameAssets, paintBackground } from "./frameArt";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = src;
  });
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// 얼굴 초점이 있을 때 크롭 창에서 얼굴 중심을 둘 세로 위치 (살짝 위 = 자연스러운 헤드룸)
const FOCUS_Y_IN_CROP = 0.42;

// cover 크롭 영역 계산 (순수 함수). focus 가 있으면 인물 중심, 없으면 가운데.
// adjust 는 그 위에 얹는 방문자의 확대·이동 (편집 화면에서 끌어서 맞춘 값).
export function coverCrop(
  imgW: number,
  imgH: number,
  slot: Pick<PhotoSlot, "w" | "h">,
  focus?: Focus | null,
  adjust?: PhotoAdjust | null,
): { sx: number; sy: number; sw: number; sh: number } {
  const slotRatio = slot.w / slot.h;
  const imgRatio = imgW / imgH;
  const zoom = adjust ? clampAdjust(adjust).zoom : 1;
  const sw = (imgRatio > slotRatio ? imgH * slotRatio : imgW) / zoom;
  const sh = (imgRatio > slotRatio ? imgH : imgW / slotRatio) / zoom;
  const baseX = focus ? focus.x * imgW - sw / 2 : (imgW - sw) / 2;
  const baseY = focus ? focus.y * imgH - sh * FOCUS_Y_IN_CROP : (imgH - sh) / 2;
  const pan = adjust ? clampAdjust(adjust) : DEFAULT_ADJUST;
  const sx = clamp(baseX + (pan.x * (imgW - sw)) / 2, 0, imgW - sw);
  const sy = clamp(baseY + (pan.y * (imgH - sh)) / 2, 0, imgH - sh);
  return { sx, sy, sw, sh };
}

// 칸(둥근 사각형) 경로 — 경로 계산은 공용 (Safari 구버전엔 ctx.roundRect 가 없음)
const slotPath = (ctx: CanvasRenderingContext2D, s: PhotoSlot, radius: number) =>
  roundRectPath(ctx, s.x, s.y, s.w, s.h, radius);

// 스티커: 편집 화면(끌어서 옮기기)과 같은 이미지·같은 좌표 규칙 (lib/stickers/geometry)
function drawStickers(ctx: CanvasRenderingContext2D, stickers: StickerInstance[], w: number, h: number) {
  for (const s of stickers) {
    const img = getStickerImage(s.id);
    if (!img?.naturalWidth) continue;
    const { cx, cy, w: sw } = stickerBox(s, w, h);
    const sh = (sw * img.naturalHeight) / img.naturalWidth;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((s.rotation ?? 0) * Math.PI) / 180);
    ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  }
}

function drawTextLayers(ctx: CanvasRenderingContext2D, layers: TextLayer[], w: number, h: number) {
  ctx.save();
  ctx.textAlign = "center";
  for (const t of layers) {
    if (!t.content.trim()) continue;
    ctx.font = canvasFont(t.font ?? "sans", t.size);
    ctx.fillStyle = t.color;
    ctx.textBaseline = t.anchor === "top" ? "top" : t.anchor === "bottom" ? "bottom" : "middle";
    const pad = Math.round(t.size * 0.8);
    const y = t.anchor === "top" ? pad : t.anchor === "bottom" ? h - pad : h / 2;
    ctx.fillText(t.content, w / 2, y, w * 0.9);
  }
  ctx.restore();
}

// 타일(스트립 한 장) 렌더링. scale < 1 이면 같은 그림을 작게 (프레임 썸네일용)
async function renderTile(input: ComposeInput, canvas: HTMLCanvasElement, scale = 1): Promise<void> {
  const { photos, focuses, layout, frame, stickers, textLayers, filter } = input;
  const { width, height } = layout.canvas;

  // 그림·폰트를 먼저 준비 (그리는 도중에는 기다릴 수 없음)
  const fa = frameAssets(frame);
  const effect = getEffect(input.effect);
  await Promise.all([
    ensureStickers([...fa.stickers, ...stickers.map((s) => s.id)]),
    ensureFonts(fa.fonts, fa.texts || "S.OWL"),
    textLayers.length
      ? ensureFonts(textLayers.map((t) => t.font ?? "sans"), textLayers.map((t) => t.content).join(""))
      : null,
    effect ? ensureAssets(effectAssets(effect)) : null,
  ]);

  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context를 가져오지 못했습니다");
  ctx.scale(scale, scale);

  // 1) 배경 (배경색 직접 지정이 있으면 프레임 배경 대신) + 사진 아래 장식
  const slots = layout.slots.map((s) => spacedSlot(s, input.slotSpacing ?? 0, width));
  paintBackground(ctx, input.backgroundColor ? { type: "solid", color: input.backgroundColor } : frame.background, width, height);
  drawDecorations(ctx, frame, layout, width, height, false, slots);

  // 2) 사진 (+필터·AR) & 테두리 — 자리 i 에는 photoOrder[i] 번 사진
  const order = normalizeOrder(input.photoOrder, layout.slots.length);
  const filterParams = getFilter(filter).params;
  const intensity = input.filterIntensity ?? 1;
  const images = await Promise.all(order.map((p) => (photos[p] ? loadImage(photos[p]) : null)));

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const radius = cornerRadius(slot, input.slotRounding ?? 0);

    // 폴라로이드 카드
    if (layout.cards) {
      const { padding: p, bottomPadding: bp, color } = layout.cards;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.22)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = color;
      slotPath(ctx, { x: slot.x - p, y: slot.y - p, w: slot.w + p * 2, h: slot.h + p + bp }, radius ? radius + p / 2 : 4);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    slotPath(ctx, slot, radius);
    ctx.clip();
    const img = images[i];
    if (img) {
      // 사진은 원본으로 저장돼 있고, 촬영 전에 고른 필터를 여기서 슬롯 크기로 적용 (미리보기와 같은 셰이더)
      // AR 스티커도 슬롯 클립 안에서 그려 사진 밖으로 삐져나가지 않게
      const crop = coverCrop(img.width, img.height, slot, focuses?.[order[i]], input.photoAdjust?.[order[i]]);
      drawWithEffect(ctx, img, crop, slot, filterParams, intensity, effect, input.photoFaces?.[order[i]], i * 17.3, input.retouch);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.08)"; // 사진 없는 자리
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
    }
    ctx.restore();

    if (frame.slotBorderWidth && frame.slotBorderWidth > 0) {
      ctx.lineWidth = frame.slotBorderWidth;
      ctx.strokeStyle = frame.accent;
      slotPath(ctx, slot, radius);
      ctx.stroke();
    }
  }

  // 3) 사진 위 장식 → 문구
  drawDecorations(ctx, frame, layout, width, height, true, slots);
  drawTextLayers(ctx, textLayers, width, height);

  // 4) 하단 브랜딩
  if (frame.footer?.text) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const size = layout.footerFontSize ?? Math.round(Math.min(width, height) * 0.045);
    ctx.font = canvasFont(frame.footer.font ?? "sans", size);
    // 배경색을 직접 바꿨으면 프레임 기본 글자색 대신 그 배경에서 잘 보이는 색
    ctx.fillStyle = input.backgroundColor ? readableTextOn(input.backgroundColor, frame.footer.color) : frame.footer.color;
    ctx.fillText(frame.footer.text, width / 2, height - Math.round(height * 0.015));
    ctx.restore();
  }

  // 5) 스티커는 맨 위 — 편집 화면에서도 스티커 층이 문구·브랜딩 위에 있으므로 인화도 같게
  drawStickers(ctx, stickers, width, height);
}

// 실제 렌더링 (미리보기 + 최종 export 공유). tile 레이아웃이면 스트립을 반복해 붙인다.
export async function renderToCanvas(
  input: ComposeInput,
  canvas: HTMLCanvasElement,
  { scale = 1 }: { scale?: number } = {},
): Promise<void> {
  const { layout } = input;
  if (!layout.tile) {
    await renderTile(input, canvas, scale);
    return;
  }
  const tile = document.createElement("canvas");
  await renderTile(input, tile, scale);

  const { width, height } = outputSize(layout);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context를 가져오지 못했습니다");
  const g = (layout.tile.gutter ?? 0) * scale;
  if (g > 0) {
    ctx.save();
    ctx.scale(scale, scale);
    paintBackground(ctx, input.backgroundColor ? { type: "solid", color: input.backgroundColor } : input.frame.background, width, height);
    ctx.restore();
  }
  for (let r = 0; r < (layout.tile.rows ?? 1); r++) {
    for (let c = 0; c < layout.tile.columns; c++) {
      ctx.drawImage(tile, c * (tile.width + g), r * (tile.height + g));
    }
  }
}

// 최종 이미지를 PNG Blob으로
export async function compose(input: ComposeInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await renderToCanvas(input, canvas);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG 변환 실패"))), "image/png");
  });
}

export async function composeToDataUrl(input: ComposeInput): Promise<string> {
  const canvas = document.createElement("canvas");
  await renderToCanvas(input, canvas);
  return canvas.toDataURL("image/png");
}
