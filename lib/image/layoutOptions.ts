// designs.layout_options 에 저장할 화면 구성 값 (서버에서 요청 본문을 그대로 믿지 않고 정리).
import { clampLevel } from "./layoutGeometry";
import { clampAdjust, isDefaultAdjust } from "./photoAdjust";
import { clampRetouch, isRetouchOn } from "@/lib/filters/retouch";
import { isEffect, NO_EFFECT } from "@/lib/ar/effects";

const HEX = /^#[0-9a-f]{6}$/i;

export function layoutOptions(design: unknown): Record<string, unknown> | null {
  if (!design || typeof design !== "object") return null;
  const d = design as Record<string, unknown>;
  const order = Array.isArray(d.photoOrder) ? d.photoOrder.filter((v) => Number.isInteger(v)).slice(0, 8) : null;
  // 사진 확대·위치: 기본값뿐이면 저장하지 않는다 (대부분의 세션에서 빈 값)
  const adjust = Array.isArray(d.photoAdjust)
    ? d.photoAdjust.slice(0, 8).map((a) => (a ? clampAdjust(a as Record<string, number>) : null))
    : null;
  return {
    photoOrder: order,
    photoAdjust: adjust?.some((a) => !isDefaultAdjust(a)) ? adjust : null,
    slotSpacing: clampLevel(d.slotSpacing),
    slotRounding: clampLevel(d.slotRounding),
    backgroundColor: typeof d.backgroundColor === "string" && HEX.test(d.backgroundColor) ? d.backgroundColor : null,
    filterIntensity:
      typeof d.filterIntensity === "number" && Number.isFinite(d.filterIntensity)
        ? Math.min(Math.max(d.filterIntensity, 0), 1)
        : 1,
    effect: isEffect(d.effect) ? d.effect : NO_EFFECT, // AR 얼굴 효과 (관리자 통계용)
    retouch: isRetouchOn(clampRetouch(d.retouch as Record<string, number>)) ? clampRetouch(d.retouch as Record<string, number>) : null,
  };
}
