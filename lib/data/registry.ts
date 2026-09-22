// data/* JSON을 로드해 인덱싱하고, 존재 검증 헬퍼를 제공한다.
// 수동 편집 UI와 AI 응답 검증(Phase 5)이 공통으로 사용한다.
import layoutsJson from "@/data/layouts/index.json";
import framesJson from "@/data/frames/index.json";
import stickersJson from "@/data/stickers/index.json";
import type { LayoutConfig, FrameConfig, StickerDef, FilterName } from "@/types/design";

export const LAYOUTS = layoutsJson as unknown as LayoutConfig[];
export const FRAMES = framesJson as unknown as FrameConfig[];
export const STICKERS = stickersJson as unknown as StickerDef[];

export const FILTERS: { id: FilterName; label: string }[] = [
  { id: "none", label: "원본" },
  { id: "warm", label: "따뜻하게" },
  { id: "cool", label: "시원하게" },
  { id: "vivid", label: "선명하게" },
  { id: "soft", label: "부드럽게" },
  { id: "bw", label: "흑백" },
];

export const DEFAULT_LAYOUT_ID = "classic-strip";
export const DEFAULT_FRAME_ID = "basic";
export const DEFAULT_FILTER: FilterName = "none";

const layoutMap = new Map(LAYOUTS.map((l) => [l.id, l]));
const frameMap = new Map(FRAMES.map((f) => [f.id, f]));
const stickerMap = new Map(STICKERS.map((s) => [s.id, s]));

export function getLayout(id?: string): LayoutConfig {
  return (id ? layoutMap.get(id) : undefined) ?? layoutMap.get(DEFAULT_LAYOUT_ID)!;
}
export function getFrame(id?: string): FrameConfig {
  return (id ? frameMap.get(id) : undefined) ?? frameMap.get(DEFAULT_FRAME_ID)!;
}
export function getSticker(id: string): StickerDef | undefined {
  return stickerMap.get(id);
}
export function hasFrame(id: string): boolean {
  return frameMap.has(id);
}
export function hasSticker(id: string): boolean {
  return stickerMap.has(id);
}
export function isFilter(id: string): id is FilterName {
  return FILTERS.some((f) => f.id === id);
}
