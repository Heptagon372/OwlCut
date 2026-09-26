// data/* JSON을 로드해 인덱싱하고, 존재 검증 헬퍼를 제공한다.
// 수동 편집 UI와 AI 응답 검증(Phase 5)이 공통으로 사용한다.
import layoutsJson from "@/data/layouts/index.json";
import framesJson from "@/data/frames/index.json";
import stickersJson from "@/data/stickers/index.json";
import doodleStickersJson from "@/data/stickers/doodles.json"; // Doodle Icons(CC0) — scripts/import-doodle-icons.mjs
import filtersJson from "@/data/filters/index.json";
import type { LayoutConfig, FrameConfig, StickerCategory, StickerDef, FilterName } from "@/types/design";
import type { FilterCategory, FilterPreset } from "@/types/filter";

export const LAYOUTS = layoutsJson as unknown as LayoutConfig[];
export const FRAMES = framesJson as unknown as FrameConfig[];
export const STICKERS = [...stickersJson, ...doodleStickersJson] as unknown as StickerDef[];

// 스티커 종류 탭 (편집 화면 · AI 카탈로그)
export const STICKER_CATEGORIES: { id: StickerCategory; label: string; labelEn: string }[] = [
  { id: "lovely", label: "러블리", labelEn: "Lovely" },
  { id: "y2k", label: "Y2K", labelEn: "Y2K" },
  { id: "doodle", label: "낙서", labelEn: "Doodle" },
  { id: "word", label: "글자", labelEn: "Words" },
  { id: "deco", label: "데코", labelEn: "Deco" },
  { id: "emoji", label: "이모지", labelEn: "Emoji" },
];

// 필터 프리셋 (촬영 전 선택 · 편집 · AI 공용). 새 필터 = JSON 한 항목 추가.
export const FILTERS = filtersJson as unknown as FilterPreset[];

export const FILTER_CATEGORIES: { id: FilterCategory; label: string; labelEn: string }[] = [
  { id: "basic", label: "기본", labelEn: "Basic" },
  { id: "beauty", label: "뷰티", labelEn: "Beauty" },
  { id: "bw", label: "흑백", labelEn: "B&W" },
  { id: "film", label: "필름", labelEn: "Film" },
  { id: "tone", label: "톤", labelEn: "Tone" },
  { id: "mood", label: "무드", labelEn: "Mood" },
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

// 촬영 매수는 레이아웃이 정한다 (설계도 11: 6/8컷도 layout JSON 추가만으로).
// 매수가 여러 가지면 촬영 화면에서 먼저 고르고, 편집 화면은 찍은 매수에 맞는 레이아웃만 보여 준다.
export const SHOT_COUNTS: number[] = [...new Set(LAYOUTS.map((l) => l.photoCount))].sort((a, b) => a - b);

export function layoutsFor(count: number): LayoutConfig[] {
  return LAYOUTS.filter((l) => l.photoCount === count);
}

/** 그 매수의 기본 레이아웃 (기본 레이아웃이 맞으면 그것, 아니면 목록 첫 번째) */
export function defaultLayoutFor(count: number): LayoutConfig {
  const base = getLayout(DEFAULT_LAYOUT_ID);
  return base.photoCount === count ? base : (layoutsFor(count)[0] ?? base);
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
