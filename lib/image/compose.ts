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
import { getSticker } from "@/lib/data/registry";
import { FILTER_CSS } from "./filters";

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
) {
  const bg = frame.background;
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

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slot: PhotoSlot,
  focus?: Focus | null,
) {
  const { sx, sy, sw, sh } = coverCrop(img.width, img.height, slot, focus);
  ctx.drawImage(img, sx, sy, sw, sh, slot.x, slot.y, slot.w, slot.h);
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

// 실제 렌더링 (미리보기 + 최종 export 공유)
export async function renderToCanvas(
  input: ComposeInput,
  canvas: HTMLCanvasElement,
): Promise<void> {
  const { photos, focuses, layout, frame, stickers, textLayers, filter } = input;
  const { width, height } = layout.canvas;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context를 가져오지 못했습니다");

  // 1) Background
  paintBackground(ctx, frame, width, height);

  // 2) Photos (+filter) & slot borders
  const filterCss = FILTER_CSS[filter] ?? "none";
  for (let i = 0; i < layout.slots.length; i++) {
    const slot = layout.slots[i];
    const src = photos[i];
    if (src) {
      const img = await loadImage(src);
      ctx.filter = filterCss;
      drawCover(ctx, img, slot, focuses?.[i]);
      ctx.filter = "none";
    } else {
      // 사진 없는 슬롯은 회색 플레이스홀더
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
    }
    if (frame.slotBorderWidth && frame.slotBorderWidth > 0) {
      ctx.lineWidth = frame.slotBorderWidth;
      ctx.strokeStyle = frame.accent;
      ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
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
    ctx.font = `600 ${Math.round(width * 0.045)}px "Pretendard", "Malgun Gothic", sans-serif`;
    ctx.fillStyle = frame.footer.color;
    ctx.fillText(frame.footer.text, width / 2, height - Math.round(height * 0.015));
    ctx.restore();
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
