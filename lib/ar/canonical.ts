"use client";
// 효과 썸네일용 기본 얼굴 (카메라에 사람이 없을 때). 실제 얼굴 메시 비율(폭:높이 ≈ 1:1.2, 눈 간격 ≈ 0.44 폭)에 맞춰
// 귀·머리 장식이 잘리지 않도록 정사각형 아래쪽에 배치.
import type { FaceGeometry } from "@/types/ar";

const FW = 0.4; // 얼굴 폭 (썸네일 대비)
const CX = 0.5;
const TOP = 0.42; // 이마 윤곽 맨 위
const EYE_Y = TOP + 0.44 * FW;

export const CANONICAL_FACE: FaceGeometry = {
  forehead: { x: CX, y: TOP },
  chin: { x: CX, y: TOP + 1.2 * FW },
  faceLeft: { x: CX - FW / 2, y: EYE_Y + 0.06 },
  faceRight: { x: CX + FW / 2, y: EYE_Y + 0.06 },
  eyeLeft: { x: CX - 0.22 * FW, y: EYE_Y },
  eyeRight: { x: CX + 0.22 * FW, y: EYE_Y },
  nose: { x: CX, y: EYE_Y + 0.28 * FW },
  mouth: { x: CX, y: EYE_Y + 0.46 * FW },
  mouthLeft: { x: CX - 0.12 * FW, y: EYE_Y + 0.45 * FW },
  mouthRight: { x: CX + 0.12 * FW, y: EYE_Y + 0.45 * FW },
  cheekLeft: { x: CX - 0.27 * FW, y: EYE_Y + 0.3 * FW },
  cheekRight: { x: CX + 0.27 * FW, y: EYE_Y + 0.3 * FW },
  mouthOpen: 0,
};

/** 기본 얼굴 일러스트 (단색 배경 + 단순한 얼굴) */
export function canonicalFaceCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const s = (v: number) => v * size;
  const g = CANONICAL_FACE;

  ctx.fillStyle = "#e9e9ec";
  ctx.fillRect(0, 0, size, size);

  // 머리카락 + 어깨
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.ellipse(s(CX), s(TOP + 0.2), s(FW * 0.62), s(FW * 0.72), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c9c9cf";
  ctx.beginPath();
  ctx.ellipse(s(CX), s(1.08), s(0.42), s(0.2), 0, 0, Math.PI * 2);
  ctx.fill();

  // 얼굴
  ctx.fillStyle = "#f6dcc8";
  ctx.beginPath();
  ctx.ellipse(s(CX), s((g.forehead.y + g.chin.y) / 2), s(FW / 2), s(0.6 * FW), 0, 0, Math.PI * 2);
  ctx.fill();
  // 앞머리
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.ellipse(s(CX), s(TOP + 0.02), s(FW * 0.5), s(FW * 0.2), 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // 눈·입
  ctx.fillStyle = "#2b2b2e";
  for (const e of [g.eyeLeft, g.eyeRight]) {
    ctx.beginPath();
    ctx.ellipse(s(e.x), s(e.y), s(0.022), s(0.028), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#c26b6b";
  ctx.lineWidth = Math.max(1, s(0.012));
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(s(g.mouth.x), s(g.mouth.y - 0.025), s(0.045), 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  return c;
}
