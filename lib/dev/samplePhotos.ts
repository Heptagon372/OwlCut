"use client";
// 개발 전용: 카메라 없이 편집 화면을 시험하기 위한 가짜 사진 n장 (production 빌드에선 버튼이 숨겨짐).
import type { CapturedPhoto } from "@/types/session";

const FACES = [
  { x: 0.3, y: 0.42, hue: 280 },
  { x: 0.7, y: 0.4, hue: 200 },
  { x: 0.5, y: 0.45, hue: 30 },
  { x: 0.62, y: 0.38, hue: 140 },
  { x: 0.4, y: 0.4, hue: 340 },
  { x: 0.56, y: 0.44, hue: 90 },
];

export function makeSamplePhotos(count = 4): CapturedPhoto[] {
  return Array.from({ length: count }, (_, i) => FACES[i % FACES.length]).map((f, i) => {
    const w = 1280;
    const h = 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, `hsl(${f.hue} 55% 62%)`);
    grad.addColorStop(1, `hsl(${f.hue + 40} 50% 38%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 사람 실루엣 (얼굴 위치 = focus)
    const cx = f.x * w;
    const cy = f.y * h;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 260, 170, 150, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe0bd";
    ctx.beginPath();
    ctx.arc(cx, cy, 95, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(cx - 32, cy - 10, 10, 0, Math.PI * 2);
    ctx.arc(cx + 32, cy - 10, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 120px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(String(i + 1), 40, 30);

    return { dataUrl: canvas.toDataURL("image/jpeg", 0.9), orderIndex: i, focus: { x: f.x, y: f.y } };
  });
}
