// 프레임 그리기: 배경(단색·그라데이션·패턴)과 장식(스티커 그림·필름 구멍·문구·테두리).
// 무작위처럼 보이는 패턴(별·색종이)도 시드 고정 → 미리보기와 최종 인화가 똑같다.
// * 브라우저 전용 (canvas). compose.ts 에서만 사용.
import type { FrameBackground, FrameConfig, FrameDecoration, FrameFont, LayoutConfig, PhotoSlot, SlotCorner } from "@/types/design";
import { heartAt, sparklePath, starPath } from "@/lib/art/svg";
import { canvasFont } from "@/lib/fonts";
import { getStickerImage } from "@/lib/stickers/images";
import { stampDate } from "@/lib/stickers/word";

/** 시드 고정 난수 (mulberry32) */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fillPattern(ctx: CanvasRenderingContext2D, bg: Extract<FrameBackground, { type: "pattern" }>, w: number, h: number) {
  const u = Math.max(8, (bg.scale ?? 1) * Math.min(w, h) * 0.07); // 패턴 한 칸
  const fg2 = bg.fg2 ?? bg.fg;
  ctx.fillStyle = bg.bg;
  ctx.fillRect(0, 0, w, h);
  const cols = Math.ceil(w / u) + 1;
  const rows = Math.ceil(h / u) + 1;
  const rnd = seeded(7);

  switch (bg.pattern) {
    case "dots":
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = (r + c) % 2 ? fg2 : bg.fg;
          ctx.beginPath();
          ctx.arc(c * u + (r % 2 ? u / 2 : 0), r * u + u / 2, u * 0.17, 0, Math.PI * 2);
          ctx.fill();
        }
      break;
    case "checker":
      ctx.fillStyle = bg.fg;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if ((r + c) % 2) ctx.fillRect(c * u, r * u, u, u);
      break;
    case "gingham": // 가로·세로 반투명 띠 → 겹치는 곳이 진해지는 체크 식탁보
      ctx.fillStyle = bg.fg;
      ctx.globalAlpha = 0.45;
      for (let c = 0; c < cols; c += 2) ctx.fillRect(c * u, 0, u, h);
      for (let r = 0; r < rows; r += 2) ctx.fillRect(0, r * u, w, u);
      ctx.globalAlpha = 1;
      break;
    case "stripes": {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 4);
      const span = Math.hypot(w, h);
      for (let i = -span; i < span; i += u) {
        ctx.fillStyle = Math.round(i / u) % 2 ? fg2 : bg.fg;
        ctx.fillRect(i, -span, u * 0.5, span * 2);
      }
      ctx.restore();
      break;
    }
    case "grid":
      ctx.strokeStyle = bg.fg;
      ctx.lineWidth = Math.max(1, u * 0.035);
      ctx.beginPath();
      for (let c = 0; c < cols; c++) {
        ctx.moveTo(c * u, 0);
        ctx.lineTo(c * u, h);
      }
      for (let r = 0; r < rows; r++) {
        ctx.moveTo(0, r * u);
        ctx.lineTo(w, r * u);
      }
      ctx.stroke();
      break;
    case "hearts":
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          ctx.save();
          ctx.translate(c * u * 1.3 + (r % 2 ? u * 0.65 : 0), r * u * 1.1 + u / 2);
          ctx.rotate((rnd() - 0.5) * 0.6);
          ctx.fillStyle = (r + c) % 2 ? fg2 : bg.fg;
          ctx.fill(new Path2D(heartAt(0, 0, u * 0.42)));
          ctx.restore();
        }
      break;
    case "stars":
    case "sparkles": {
      // 크기가 제각각인 별(오각별) 또는 반짝이(네 갈래)를 흩뿌림
      const n = Math.round(((w * h) / (u * u)) * (bg.pattern === "stars" ? 0.28 : 0.35));
      for (let i = 0; i < n; i++) {
        ctx.save();
        ctx.translate(rnd() * w, rnd() * h);
        ctx.rotate((rnd() - 0.5) * 0.8);
        ctx.fillStyle = rnd() < 0.5 ? bg.fg : fg2;
        const s = u * (0.08 + rnd() * 0.22);
        ctx.fill(new Path2D(bg.pattern === "stars" ? starPath(0, 0, s * 1.9, 0.46) : sparklePath(0, 0, s)));
        ctx.restore();
      }
      break;
    }
    case "confetti": {
      const palette = [bg.fg, fg2, "#ffd84a", "#7ad3ff", "#ff9ad5"];
      const n = Math.round(((w * h) / (u * u)) * 0.5);
      for (let i = 0; i < n; i++) {
        ctx.save();
        ctx.translate(rnd() * w, rnd() * h);
        ctx.rotate(rnd() * Math.PI);
        ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
        if (rnd() < 0.55) ctx.fillRect(-u * 0.14, -u * 0.05, u * 0.28, u * 0.1);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, u * 0.07, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      break;
    }
  }
}

export function paintBackground(ctx: CanvasRenderingContext2D, bg: FrameBackground, w: number, h: number) {
  if (bg.type === "pattern") return fillPattern(ctx, bg, w, h);
  if (bg.type === "gradient") {
    const angle = ((bg.angle ?? 0) * Math.PI) / 180;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
    const grad = ctx.createLinearGradient(w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half);
    const stops = bg.stops?.length ? bg.stops : [bg.from, bg.to];
    stops.forEach((c, i) => grad.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), c));
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = bg.color;
  }
  ctx.fillRect(0, 0, w, h);
}

/** 필름 구멍: 세로로 긴 타일은 좌우 여백, 가로로 긴 타일은 위아래 여백에 */
function drawFilmHoles(ctx: CanvasRenderingContext2D, layout: LayoutConfig, color: string, w: number, h: number) {
  const s = layout.slots;
  const vertical = h >= w;
  const m = vertical
    ? Math.min(Math.min(...s.map((r) => r.x)), w - Math.max(...s.map((r) => r.x + r.w)))
    : Math.min(Math.min(...s.map((r) => r.y)), Math.min(w, h) * 0.08);
  if (m < 14) return;
  const hw = m * 0.42; // 구멍 짧은 변
  const hl = hw * 1.35; // 구멍 긴 변
  const step = hl * 1.9;
  ctx.fillStyle = color;
  const hole = (x: number, y: number, bw: number, bh: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, bw, bh, hw * 0.25);
    ctx.fill();
  };
  if (vertical) {
    for (let y = step / 2 - hl / 2; y < h - hl; y += step) {
      hole(m / 2 - hw / 2, y, hw, hl);
      hole(w - m / 2 - hw / 2, y, hw, hl);
    }
  } else {
    for (let x = step / 2 - hl / 2; x < w - hl; x += step) {
      hole(x, m / 2 - hw / 2, hl, hw);
      hole(x, h - m / 2 - hw / 2, hl, hw);
    }
  }
}

function drawSticker(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, size: number, rotationDeg: number) {
  const img = getStickerImage(id);
  if (!img?.naturalWidth) return;
  const sh = (size * img.naturalHeight) / img.naturalWidth;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.drawImage(img, -size / 2, -sh / 2, size, sh);
  ctx.restore();
}

const CORNER_SIGN: Record<SlotCorner, number> = { "top-left": 1, "top-right": -1, "bottom-left": -1, "bottom-right": 1, top: 1 };

function cornerPoint(s: PhotoSlot, at: SlotCorner, inset: number) {
  switch (at) {
    case "top-left": return { x: s.x + inset, y: s.y + inset };
    case "top-right": return { x: s.x + s.w - inset, y: s.y + inset };
    case "bottom-left": return { x: s.x + inset, y: s.y + s.h - inset };
    case "bottom-right": return { x: s.x + s.w - inset, y: s.y + s.h - inset };
    case "top": return { x: s.x + s.w / 2, y: s.y + inset };
  }
}

/** 손으로 그린 듯한 사각형: 변을 짧게 나눠 조금씩 흔든다 (시드 고정) */
function sketchRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, wobble: number, rnd: () => number) {
  const pts: [number, number][] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / 40));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const jx = (rnd() - 0.5) * wobble;
      const jy = (rnd() - 0.5) * wobble;
      if (i === 0 && k === 0) ctx.moveTo(ax + jx, ay + jy);
      else ctx.lineTo(ax + (bx - ax) * t + jx, ay + (by - ay) * t + jy);
    }
  }
  ctx.stroke();
}

function drawSlotDecoration(ctx: CanvasRenderingContext2D, d: FrameDecoration, slots: PhotoSlot[], short: number) {
  slots.forEach((s, i) => {
    if (d.type === "slotSticker") {
      if (d.every && i % d.every !== 0) return;
      const p = cornerPoint(s, d.at, (d.offset ?? 0) * short);
      drawSticker(ctx, d.id, p.x, p.y, d.size * short, (d.rotation ?? 0) * CORNER_SIGN[d.at]);
    } else if (d.type === "slotLabel") {
      const px = d.size * short;
      const pad = px * 0.9;
      ctx.save();
      ctx.font = canvasFont("mono", px);
      ctx.textBaseline = "bottom";
      ctx.fillStyle = d.color;
      if (d.glow) {
        ctx.shadowColor = d.glow;
        ctx.shadowBlur = px * 0.6;
      }
      if (d.kind === "film") {
        ctx.textAlign = "left";
        ctx.fillText(`▶ ${i + 1}A`, s.x + pad, s.y + s.h - pad * 0.7);
      } else {
        ctx.textAlign = "right";
        ctx.fillText(stampDate(), s.x + s.w - pad, s.y + s.h - pad * 0.7);
      }
      ctx.restore();
    } else if (d.type === "slotOutline") {
      const gap = (d.gap ?? 0.012) * short;
      ctx.save();
      ctx.strokeStyle = d.color;
      ctx.lineWidth = Math.max(1, d.width * short);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const r = { x: s.x - gap, y: s.y - gap, w: s.w + gap * 2, h: s.h + gap * 2 };
      if (d.style === "sketch") {
        const rnd = seeded(101 + i * 13);
        sketchRect(ctx, r.x, r.y, r.w, r.h, ctx.lineWidth * 1.6, rnd);
        sketchRect(ctx, r.x + 2, r.y - 1, r.w - 3, r.h + 2, ctx.lineWidth * 1.6, rnd); // 두 번 그어 볼펜 느낌
      } else if (d.style === "dashed") {
        ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 2.2]);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
      } else {
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        const g2 = ctx.lineWidth * 2.5;
        ctx.lineWidth /= 2;
        ctx.strokeRect(r.x - g2, r.y - g2, r.w + g2 * 2, r.h + g2 * 2);
      }
      ctx.restore();
    }
  });
}

function drawDecoration(ctx: CanvasRenderingContext2D, d: FrameDecoration, layout: LayoutConfig, w: number, h: number, slots: PhotoSlot[]) {
  const short = Math.min(w, h);
  switch (d.type) {
    case "sticker":
      return drawSticker(ctx, d.id, d.x * w, d.y * h, d.size * short, d.rotation ?? 0);
    case "slotSticker":
    case "slotLabel":
    case "slotOutline":
      return drawSlotDecoration(ctx, d, slots, short);
    case "filmHoles":
      return drawFilmHoles(ctx, layout, d.color, w, h);
    case "text":
      ctx.save();
      ctx.translate(d.x * w, d.y * h);
      ctx.rotate(((d.rotation ?? 0) * Math.PI) / 180);
      ctx.font = canvasFont(d.font ?? "sans", d.size * short);
      ctx.fillStyle = d.color;
      ctx.textAlign = d.align ?? "center";
      ctx.textBaseline = "middle";
      ctx.fillText(d.text, 0, 0);
      ctx.restore();
      return;
    case "border": {
      const inset = d.inset * short;
      ctx.save();
      ctx.strokeStyle = d.color;
      ctx.lineWidth = Math.max(1, d.width * short);
      if (d.dash) ctx.setLineDash(d.dash.map((v) => v * short));
      ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
      ctx.restore();
    }
  }
}

/** 사진 위에 그릴 장식인지 (사진 칸 장식은 항상 위) */
export function isOverPhotos(d: FrameDecoration): boolean {
  if (d.type === "sticker" || d.type === "text") return Boolean(d.over);
  return d.type === "slotSticker" || d.type === "slotLabel" || d.type === "slotOutline";
}

/**
 * over=false: 배경 바로 위(사진 아래) · over=true: 사진 위 (테이프·리본처럼 모서리를 덮는 장식)
 * slots: 간격 조정까지 반영한 실제 사진 칸 (사진 칸 장식이 그 자리를 따라감)
 */
export function drawDecorations(
  ctx: CanvasRenderingContext2D,
  frame: FrameConfig,
  layout: LayoutConfig,
  w: number,
  h: number,
  over: boolean,
  slots: PhotoSlot[] = layout.slots,
) {
  for (const d of frame.decorations ?? []) {
    if (isOverPhotos(d) === over) drawDecoration(ctx, d, layout, w, h, slots);
  }
}

/** 프레임이 쓰는 스티커 그림·폰트 (합성 전에 미리 불러오기용) */
export function frameAssets(frame: FrameConfig): { stickers: string[]; fonts: FrameFont[]; texts: string } {
  const decos = frame.decorations ?? [];
  return {
    stickers: decos.flatMap((d) => (d.type === "sticker" || d.type === "slotSticker" ? [d.id] : [])),
    fonts: [
      frame.footer?.font ?? "sans",
      ...decos.flatMap((d): FrameFont[] => (d.type === "text" ? [d.font ?? "sans"] : d.type === "slotLabel" ? ["mono"] : [])),
    ],
    texts: [frame.footer?.text ?? "", "▶ 0123456789A'", ...decos.flatMap((d) => (d.type === "text" ? [d.text] : []))].join(""),
  };
}
