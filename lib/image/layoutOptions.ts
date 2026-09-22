// designs.layout_options 에 저장할 화면 구성 값 (서버에서 요청 본문을 그대로 믿지 않고 정리).
import { clampLevel } from "./layoutGeometry";
import { isEffect, NO_EFFECT } from "@/lib/ar/effects";

const HEX = /^#[0-9a-f]{6}$/i;

export function layoutOptions(design: unknown): Record<string, unknown> | null {
  if (!design || typeof design !== "object") return null;
  const d = design as Record<string, unknown>;
  const order = Array.isArray(d.photoOrder) ? d.photoOrder.filter((v) => Number.isInteger(v)).slice(0, 8) : null;
  return {
    photoOrder: order,
    slotSpacing: clampLevel(d.slotSpacing),
    slotRounding: clampLevel(d.slotRounding),
    backgroundColor: typeof d.backgroundColor === "string" && HEX.test(d.backgroundColor) ? d.backgroundColor : null,
    filterIntensity:
      typeof d.filterIntensity === "number" && Number.isFinite(d.filterIntensity)
        ? Math.min(Math.max(d.filterIntensity, 0), 1)
        : 1,
    effect: isEffect(d.effect) ? d.effect : NO_EFFECT, // AR 얼굴 효과 (관리자 통계용)
  };
}
