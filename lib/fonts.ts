"use client";
// 캔버스용 폰트 이름. next/font 는 실제 family 이름을 해시로 만들기 때문에("__Caveat_1a2b3c")
// 캔버스에 "Pretendard" 처럼 이름을 직접 쓰면 등록된 웹폰트가 아니라 시스템 대체 폰트가 쓰인다.
// → app/layout.tsx 의 CSS 변수에서 실제 이름을 읽어 쓴다. 한글이 없는 영문 폰트 뒤에는 한글 폰트를 이어 붙임.
import type { FrameFont } from "@/types/design";

const STACKS: Record<FrameFont, string[]> = {
  sans: ["--font-pretendard"],
  display: ["--font-manrope", "--font-hangul-display", "--font-pretendard"],
  hand: ["--font-hand", "--font-hangul-hand", "--font-pretendard"],
  hangulHand: ["--font-hangul-hand", "--font-pretendard"],
  serif: ["--font-serif", "--font-pretendard"],
  mono: ["--font-mono", "--font-pretendard"],
};

const FALLBACK = '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

// 폰트별로 실제로 받아 둔 굵기 (layout.tsx)
export const FONT_WEIGHT: Record<FrameFont, number> = { sans: 700, display: 800, hand: 700, hangulHand: 700, serif: 400, mono: 700 };

export const canvasFont = (font: FrameFont, px: number) => `${FONT_WEIGHT[font]} ${px}px ${fontStack(font)}`;

export function fontStack(font: FrameFont = "sans"): string {
  const root = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const names = STACKS[font].map((v) => root?.getPropertyValue(v).trim()).filter(Boolean);
  return [...names, FALLBACK].join(", ");
}

/** 캔버스에 쓰기 전에 폰트 파일을 받아 둔다 (안 하면 첫 합성에서 대체 폰트로 그려짐) */
export async function ensureFonts(fonts: FrameFont[], sample = "가A1", weight = 700): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(
    [...new Set(fonts)].map((f) => document.fonts.load(`${weight} 40px ${fontStack(f)}`, sample).catch(() => [])),
  );
}
