"use client";
// 글자 스티커 (LOVE · 최고 · 말풍선 등) — 웹폰트로 캔버스에 그려 PNG 로 만든다.
// SVG 그림 안에서는 웹폰트를 못 쓰기 때문에 글자만 따로 그린다. 편집 화면과 합성이 같은 PNG 를 쓴다.
import type { WordStyle } from "@/types/design";
import { FONT_WEIGHT, canvasFont, ensureFonts } from "@/lib/fonts";
import { roundRectPath } from "@/lib/image/canvasPath";

const PX = 110; // 기준 글자 크기 (스티커는 결과 이미지를 원하는 크기로 확대·축소)
const INK = "#1b1b1f";

const roundRect = roundRectPath;

/** 필름 카메라 날짜 도장 형식: '26 09 23 */
export function stampDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `'${p(d.getFullYear() % 100)} ${p(d.getMonth() + 1)} ${p(d.getDate())}`;
}

export async function renderWordSticker(w: WordStyle): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const text = w.text.replace("{date}", stampDate());
  await ensureFonts([w.font], text, FONT_WEIGHT[w.font]);
  const font = canvasFont(w.font, PX);
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.font = font;
  const lines = text.split("\n");
  const lineH = PX * 1.08;
  const textW = Math.max(...lines.map((l) => probe.measureText(l).width));
  const textH = lineH * lines.length;

  const shape = w.shape ?? "none";
  const outline = w.stroke ? PX * 0.13 : 0;
  const glowPad = w.glow ? PX * 0.3 : 0;
  const padX = shape === "none" ? outline + 8 + glowPad : PX * 0.42;
  const padY = shape === "none" ? outline + 8 + glowPad : PX * 0.26;
  let bw = textW + padX * 2;
  let bh = textH + padY * 2;
  if (shape === "burst") {
    bw *= 1.3;
    bh = Math.max(bh * 1.6, bw * 0.62);
  }
  const titleBar = shape === "window" ? PX * 0.42 : 0; // 옛날 컴퓨터 창 제목 막대
  bh += titleBar;
  const tail = shape === "bubble" ? PX * 0.42 : 0;
  const margin = PX * 0.12; // 그림자 여유

  // 기울기를 이미지에 구워 넣는다 (돌린 만큼 캔버스를 키움)
  const tilt = ((w.tilt ?? 0) * Math.PI) / 180;
  const w0 = bw + margin * 2;
  const h0 = bh + tail + margin * 2;
  const cw = Math.ceil(Math.abs(w0 * Math.cos(tilt)) + Math.abs(h0 * Math.sin(tilt)));
  const ch = Math.ceil(Math.abs(w0 * Math.sin(tilt)) + Math.abs(h0 * Math.cos(tilt)));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(tilt);
  ctx.translate(-w0 / 2, -h0 / 2);
  const x0 = margin;
  const y0 = margin;

  ctx.shadowColor = "rgba(0,0,0,0.16)";
  ctx.shadowBlur = PX * 0.08;
  ctx.shadowOffsetY = PX * 0.03;
  ctx.lineJoin = "round";

  if (shape !== "none") {
    ctx.fillStyle = w.shapeFill ?? "#ffffff";
    ctx.strokeStyle = INK;
    ctx.lineWidth = PX * 0.055;
    if (shape === "bubble") {
      roundRect(ctx, x0, y0, bw, bh, bh * 0.48);
      ctx.moveTo(x0 + bw * 0.2, y0 + bh - 2);
      ctx.lineTo(x0 + bw * 0.12, y0 + bh + tail);
      ctx.lineTo(x0 + bw * 0.36, y0 + bh - 2);
    } else if (shape === "tag" || shape === "window") {
      roundRect(ctx, x0, y0, bw, bh, shape === "tag" ? PX * 0.18 : PX * 0.08);
    } else {
      // burst: 들쭉날쭉한 폭발 모양
      const cx = x0 + bw / 2;
      const cy = y0 + bh / 2;
      const n = 18;
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i * Math.PI) / n;
        const k = i % 2 === 0 ? 1 : 0.8;
        ctx.lineTo(cx + (bw / 2) * k * Math.cos(a), cy + (bh / 2) * k * Math.sin(a));
      }
      ctx.closePath();
    }
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.stroke();
    if (shape === "tag") {
      ctx.beginPath();
      ctx.arc(x0 + PX * 0.2, y0 + bh / 2, PX * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    }
    if (shape === "window") {
      // 분홍 제목 막대 + 창 버튼 세 개 (Y2K 옛날 컴퓨터 창)
      ctx.fillStyle = "#ff8fc7";
      ctx.fillRect(x0 + 3, y0 + 3, bw - 6, titleBar - 3);
      ctx.beginPath();
      ctx.moveTo(x0, y0 + titleBar);
      ctx.lineTo(x0 + bw, y0 + titleBar);
      ctx.stroke();
      [0, 1, 2].forEach((i) => {
        ctx.beginPath();
        ctx.arc(x0 + bw - PX * (0.25 + i * 0.3), y0 + titleBar / 2, PX * 0.09, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.stroke();
      });
    }
  }

  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = x0 + bw / 2 + (shape === "tag" ? PX * 0.12 : 0);
  const top = y0 + titleBar + (bh - titleBar - textH) / 2;
  lines.forEach((line, i) => {
    const y = top + lineH * (i + 0.5) + PX * 0.04;
    if (outline) {
      ctx.strokeStyle = w.stroke!;
      ctx.lineWidth = outline * 2;
      ctx.strokeText(line, cx, y);
      ctx.shadowColor = "transparent";
    }
    if (w.glow) {
      // 네온: 번짐을 두 번 겹쳐 빛나게
      ctx.shadowColor = w.glow;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = PX * 0.35;
      ctx.fillStyle = w.fill;
      ctx.fillText(line, cx, y);
      ctx.shadowBlur = PX * 0.12;
    }
    ctx.fillStyle = w.fill;
    ctx.fillText(line, cx, y);
  });
  return canvas.toDataURL("image/png");
}

/** 이모지 스티커도 이미지로 (편집 화면과 합성이 같은 모양이 되게) */
export function renderEmojiSticker(glyph: string): string | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 180;
  const ctx = c.getContext("2d")!;
  ctx.font = `140px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, 90, 98);
  return c.toDataURL("image/png");
}
