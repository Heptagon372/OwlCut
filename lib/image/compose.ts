// ============================================================
// 이미지 합성 엔진 (설계도 7-3) — 프로젝트의 핵심 모듈.
// 레이어 순서: Background → Frame → Photos(+filter) → Stickers → Text → Footer
// 수동 편집과 AI 편집이 이 동일한 엔진을 공유한다.
// * 브라우저 전용 (canvas/Image 사용). 서버에서 import 후 호출하지 말 것.
// ============================================================
import type {
  ComposeInput,
  Focus,
  FrameConfig,
  PhotoSlot,
  StickerInstance,
  TextLayer,
  Anchor,
} from "@/types/design";
import { getFilter, getSticker } from "@/lib/data/registry";
import { drawFiltered } from "@/lib/filters/offline";
import { cornerRadius, normalizeOrder, outputSize, spacedSlot } from "./layoutGeometry";
import { readableTextOn } from "./color";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = src;
  });
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  frame: FrameConfig,
  w: number,
  h: number,
  override?: string | null,
) {
  const bg = override ? ({ type: "solid", color: override } as const) : frame.background;
  if (bg.type === "gradient") {
    const angle = ((bg.angle ?? 0) * Math.PI) / 180;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const cx = w / 2;
    const cy = h / 2;
    const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
    const grad = ctx.createLinearGradient(
      cx - dx * half,
      cy - dy * half,
      cx + dx * half,
      cy + dy * half,
    );
    grad.addColorStop(0, bg.from);
    grad.addColorStop(1, bg.to);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = bg.color;
  }
  ctx.fillRect(0, 0, w, h);
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// 얼굴 초점이 있을 때 크롭 창에서 얼굴 중심을 둘 세로 위치 (살짝 위 = 자연스러운 헤드룸)
const FOCUS_Y_IN_CROP = 0.42;

// cover 크롭 영역 계산 (순수 함수). focus가 있으면 인물 중심으로, 없으면 가운데.
export function coverCrop(
  imgW: number,
  imgH: number,
  slot: Pick<PhotoSlot, "w" | "h">,
  focus?: Focus | null,
): { sx: number; sy: number; sw: number; sh: number } {
  const slotRatio = slot.w / slot.h;
  const imgRatio = imgW / imgH;
  const sw = imgRatio > slotRatio ? imgH * slotRatio : imgW;
  const sh = imgRatio > slotRatio ? imgH : imgW / slotRatio;
  const sx = focus ? clamp(focus.x * imgW - sw / 2, 0, imgW - sw) : (imgW - sw) / 2;
  const sy = focus ? clamp(focus.y * imgH - sh * FOCUS_Y_IN_CROP, 0, imgH - sh) : (imgH - sh) / 2;
  return { sx, sy, sw, sh };
}

// 둥근 사각형 경로 (radius 0이면 일반 사각형)
function roundRectPath(ctx: CanvasRenderingContext2D, s: PhotoSlot, radius: number) {
  const r = Math.max(0, Math.min(radius, s.w / 2, s.h / 2));
  ctx.beginPath();
  ctx.moveTo(s.x + r, s.y);
  ctx.arcTo(s.x + s.w, s.y, s.x + s.w, s.y + s.h, r);
  ctx.arcTo(s.x + s.w, s.y + s.h, s.x, s.y + s.h, r);
  ctx.arcTo(s.x, s.y + s.h, s.x, s.y, r);
  ctx.arcTo(s.x, s.y, s.x + s.w, s.y, r);
  ctx.closePath();
}

function anchorPoint(
  anchor: Anchor,
  w: number,
  h: number,
  margin: number,
): [number, number] {
  const midX = w / 2;
  const midY = h / 2;
  const leftX = margin;
  const rightX = w - margin;
  const topY = margin;
  const botY = h - margin;
  const map: Record<Anchor, [number, number]> = {
    "top-left": [leftX, topY],
    top: [midX, topY],
    "top-right": [rightX, topY],
    left: [leftX, midY],
    center: [midX, midY],
    right: [rightX, midY],
    "bottom-left": [leftX, botY],
    bottom: [midX, botY],
    "bottom-right": [rightX, botY],
  };
  return map[anchor];
}

function drawStickers(
  ctx: CanvasRenderingContext2D,
  stickers: StickerInstance[],
  w: number,
  h: number,
) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const s of stickers) {
    const def = getSticker(s.id);
    if (!def) continue;
    const [px, py] = anchorPoint(s.anchor, w, h, s.size * 0.7);
    ctx.save();
    ctx.translate(px, py);
    if (s.rotation) ctx.rotate((s.rotation * Math.PI) / 180);
    ctx.font = `${s.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.fillText(def.glyph, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawTextLayers(
  ctx: CanvasRenderingContext2D,
  layers: TextLayer[],
  w: number,
  h: number,
) {
  ctx.save();
  ctx.textAlign = "center";
  for (const t of layers) {
    if (!t.content.trim()) continue;
    ctx.font = `bold ${t.size}px "Pretendard", "Malgun Gothic", sans-serif`;
    ctx.fillStyle = t.color;
    ctx.textBaseline =
      t.anchor === "top" ? "top" : t.anchor === "bottom" ? "bottom" : "middle";
    const pad = Math.round(t.size * 0.8);
    const y =
      t.anchor === "top" ? pad : t.anchor === "bottom" ? h - pad : h / 2;
    ctx.fillText(t.content, w / 2, y, w * 0.9);
  }
  ctx.restore();
}

// 타일(스트립 한 장) 렌더링
async function renderTile(input: ComposeInput, canvas: HTMLCanvasElement): Promise<void> {
  const { photos, focuses, layout, frame, stickers, textLayers, filter } = input;
  const { width, height } = layout.canvas;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context를 가져오지 못했습니다");

  // 1) Background (배경색 직접 지정이 있으면 프레임 배경 대신)
  paintBackground(ctx, frame, width, height, input.backgroundColor);

  // 2) Photos (+filter) & slot borders — 자리 i 에는 photoOrder[i] 번 사진
  const order = normalizeOrder(input.photoOrder, layout.slots.length);
  const filterParams = getFilter(filter).params;
  const intensity = input.filterIntensity ?? 1;
  const images = await Promise.all(order.map((p) => (photos[p] ? loadImage(photos[p]) : null)));

  for (let i = 0; i < layout.slots.length; i++) {
    const slot = spacedSlot(layout.slots[i], input.slotSpacing ?? 0, width);
    const radius = cornerRadius(slot, input.slotRounding ?? 0);

    // 폴라로이드 카드
    if (layout.cards) {
      const { padding: p, bottomPadding: bp, color } = layout.cards;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.22)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = color;
      roundRectPath(ctx, { x: slot.x - p, y: slot.y - p, w: slot.w + p * 2, h: slot.h + p + bp }, radius ? radius + p / 2 : 4);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    roundRectPath(ctx, slot, radius);
    ctx.clip();
    const img = images[i];
    if (img) {
      // 사진은 원본으로 저장돼 있고, 촬영 전에 고른 필터를 여기서 슬롯 크기로 적용 (미리보기와 같은 셰이더)
      const crop = coverCrop(img.width, img.height, slot, focuses?.[order[i]]);
      drawFiltered(ctx, img, crop, slot, filterParams, intensity, i * 17.3);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.08)"; // 사진 없는 자리
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
    }
    ctx.restore();

    if (frame.slotBorderWidth && frame.slotBorderWidth > 0) {
      ctx.lineWidth = frame.slotBorderWidth;
      ctx.strokeStyle = frame.accent;
      roundRectPath(ctx, slot, radius);
      ctx.stroke();
    }
  }

  // 3) Stickers
  drawStickers(ctx, stickers, width, height);

  // 4) Text layers
  drawTextLayers(ctx, textLayers, width, height);

  // 5) Footer (프레임 브랜딩) — 하단 중앙
  if (frame.footer && frame.footer.text) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const size = layout.footerFontSize ?? Math.round(Math.min(width, height) * 0.045);
    ctx.font = `600 ${size}px "Pretendard", "Malgun Gothic", sans-serif`;
    // 배경색을 직접 바꿨으면 프레임 기본 글자색 대신 그 배경에서 잘 보이는 색
    ctx.fillStyle = input.backgroundColor
      ? readableTextOn(input.backgroundColor, frame.footer.color)
      : frame.footer.color;
    ctx.fillText(frame.footer.text, width / 2, height - Math.round(height * 0.015));
    ctx.restore();
  }
}

// 실제 렌더링 (미리보기 + 최종 export 공유). tile 레이아웃이면 스트립을 반복해 붙인다.
export async function renderToCanvas(
  input: ComposeInput,
  canvas: HTMLCanvasElement,
): Promise<void> {
  const { layout } = input;
  if (!layout.tile) {
    await renderTile(input, canvas);
    return;
  }
  const tile = document.createElement("canvas");
  await renderTile(input, tile);

  const { width, height } = outputSize(layout);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context를 가져오지 못했습니다");
  const g = layout.tile.gutter ?? 0;
  if (g > 0) paintBackground(ctx, input.frame, width, height, input.backgroundColor);
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
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG 변환 실패"))),
      "image/png",
    );
  });
}

export async function composeToDataUrl(input: ComposeInput): Promise<string> {
  const canvas = document.createElement("canvas");
  await renderToCanvas(input, canvas);
  return canvas.toDataURL("image/png");
}
