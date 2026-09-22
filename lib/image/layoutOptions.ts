// designs.layout_options 에 저장할 화면 구성 값 (서버에서 요청 본문을 그대로 믿지 않고 정리).
import { clampLevel } from "./layoutGeometry";

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
  };
}
