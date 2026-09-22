// data/* JSON을 로드해 인덱싱하고, 존재 검증 헬퍼를 제공한다.
// 수동 편집 UI와 AI 응답 검증(Phase 5)이 공통으로 사용한다.
import layoutsJson from "@/data/layouts/index.json";
import framesJson from "@/data/frames/index.json";
import stickersJson from "@/data/stickers/index.json";
import filtersJson from "@/data/filters/index.json";
import type { LayoutConfig, FrameConfig, StickerDef, FilterName } from "@/types/design";
import type { FilterCategory, FilterPreset } from "@/types/filter";

export const LAYOUTS = layoutsJson as unknown as LayoutConfig[];
export const FRAMES = framesJson as unknown as FrameConfig[];
export const STICKERS = stickersJson as unknown as StickerDef[];

// 필터 프리셋 (촬영 전 선택 · 편집 · AI 공용). 새 필터 = JSON 한 항목 추가.
export const FILTERS = filtersJson as unknown as FilterPreset[];

export const FILTER_CATEGORIES: { id: FilterCategory; label: string }[] = [
  { id: "basic", label: "기본" },
  { id: "beauty", label: "뷰티" },
  { id: "bw", label: "흑백" },
  { id: "film", label: "필름" },
  { id: "tone", label: "톤" },
  { id: "mood", label: "무드" },
];

export const DEFAULT_LAYOUT_ID = "classic-strip";
export const DEFAULT_FRAME_ID = "basic";
export const DEFAULT_FILTER: FilterName = "none";

const layoutMap = new Map(LAYOUTS.map((l) => [l.id, l]));
const frameMap = new Map(FRAMES.map((f) => [f.id, f]));
const stickerMap = new Map(STICKERS.map((s) => [s.id, s]));
const filterMap = new Map(FILTERS.map((f) => [f.id, f]));

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
  return filterMap.has(id);
}
export function getFilter(id?: string): FilterPreset {
  return (id ? filterMap.get(id) : undefined) ?? filterMap.get(DEFAULT_FILTER)!;
}
