// 아울네컷 디자인 관련 타입 정의.
// 수동 편집과 AI 편집이 "동일한 스키마"를 공유한다 (설계도 7-3, 7-4).

// ---------- 위치 프리셋 ----------
// 스티커/텍스트 배치에 쓰는 9분할 앵커. AI 응답의 "position"도 이 값으로 정규화된다.
export type Anchor =
  | "top-left" | "top" | "top-right"
  | "left" | "center" | "right"
  | "bottom-left" | "bottom" | "bottom-right";

export const ANCHORS: Anchor[] = [
  "top-left", "top", "top-right",
  "left", "center", "right",
  "bottom-left", "bottom", "bottom-right",
];

export type TextAnchor = "top" | "center" | "bottom";

// ---------- 필터 ----------
export type FilterName = "none" | "warm" | "cool" | "bw" | "vivid" | "soft";

// ---------- 레이아웃 (data/layouts) ----------
export interface PhotoSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutConfig {
  id: string;
  label: string;
  canvas: { width: number; height: number };
  photoCount: number;
  slots: PhotoSlot[];
}

// ---------- 프레임 (data/frames) ----------
export type FrameBackground =
  | { type: "solid"; color: string }
  | { type: "gradient"; from: string; to: string; angle?: number };

export interface FrameConfig {
  id: string;
  label: string;
  background: FrameBackground;
  accent: string;                 // 슬롯 테두리 / 강조색
  slotBorderWidth?: number;       // 각 사진 슬롯 테두리 두께(px)
  footer?: { text: string; color: string };
  defaultTextColor?: string;      // 이 프레임 선택 시 텍스트 기본색
}

// ---------- 스티커 (data/stickers) ----------
// MVP: 에셋 없이 이모지 글리프로 렌더 (canvas fillText).
export interface StickerDef {
  id: string;
  label: string;
  glyph: string;
}

// 캔버스에 실제로 배치된 스티커 1개
export interface StickerInstance {
  id: string;      // StickerDef.id
  anchor: Anchor;
  size: number;    // 글리프 폰트 크기(px)
  rotation?: number;
}

// ---------- 텍스트 레이어 ----------
export interface TextLayer {
  content: string;
  anchor: TextAnchor;
  color: string;
  size: number;    // 폰트 크기(px)
}

// ---------- 디자인 상태 (에디터 state = 저장/합성 입력) ----------
export interface DesignState {
  mode: "manual" | "ai";
  prompt?: string;
  layoutId: string;
  frameId: string;
  stickers: StickerInstance[];
  textLayers: TextLayer[];
  filter: FilterName;
}

// ---------- 합성 엔진 입력 (lib/image/compose.ts) ----------
export interface ComposeInput {
  photos: string[];          // dataURL 또는 원격 URL, 길이 = layout.photoCount
  layout: LayoutConfig;
  frame: FrameConfig;
  stickers: StickerInstance[];
  textLayers: TextLayer[];
  filter: FilterName;
}

// ---------- AI 응답 스키마 (설계도 7-4, Phase 5에서 사용) ----------
export interface AIDesignResponse {
  frame: string;
  stickers: { type: string; position: string }[];
  text?: { content: string; position: string };
  filter: string;
}
