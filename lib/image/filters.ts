import type { FilterName } from "@/types/design";

// canvas ctx.filter 에 그대로 넣는 CSS 필터 문자열.
export const FILTER_CSS: Record<FilterName, string> = {
  none: "none",
  warm: "saturate(1.25) sepia(0.18) contrast(1.05)",
  cool: "saturate(1.1) hue-rotate(-12deg) brightness(1.05)",
  bw: "grayscale(1) contrast(1.12)",
  vivid: "saturate(1.5) contrast(1.12)",
  soft: "brightness(1.06) contrast(0.95) saturate(1.05)",
};
