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
// data/filters/index.json 의 프리셋 id (검증은 registry.isFilter). 파라미터 타입은 types/filter.ts
export type FilterName = string;

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
  description?: string;
  // 한 장(타일)의 크기. tile이 있으면 최종 이미지는 이 타일을 반복한 크기가 된다.
  canvas: { width: number; height: number };
  photoCount: number;
  slots: PhotoSlot[];
  // 같은 스트립을 여러 번 반복 (인생네컷 오리지널: 세로 스트립 2줄 = 4x6 용지)
  tile?: { columns: number; rows?: number; gutter?: number };
  // 사진마다 뒤에 카드(폴라로이드 느낌)를 깐다
  cards?: { padding: number; bottomPadding: number; color: string };
  footerFontSize?: number; // 기본: 타일 짧은 변의 4.5%
}

// ---------- 프레임 (data/frames) ----------
export type FrameBackground =
  | { type: "solid"; color: string }
  | { type: "gradient"; from: string; to: string; angle?: number };

export interface FrameConfig {
  id: string;
  label: string;
  description?: string;           // AI가 프레임을 고를 때 참고하는 분위기 설명
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
  aiModel?: string | null;   // AI로 만든 경우 사용한 모델 (관리자 통계)
  layoutId: string;
  frameId: string;
  stickers: StickerInstance[];
  textLayers: TextLayer[];
  filter: FilterName;              // 촬영 전에 고른 필터 (사진은 원본 저장, 합성 때 적용)
  filterIntensity: number;         // 필터 강도 0..1
  // ---- 화면 구성 (촬영 후 수정) ----
  photoOrder: number[];            // 자리 i 에 들어갈 사진 번호 (기본 [0,1,2,3])
  slotSpacing: number;             // 사진 간격 단계 0~10 (0 = 레이아웃 기본)
  slotRounding: number;            // 사진 모서리 둥글기 단계 0~10
  backgroundColor: string | null;  // 배경색 직접 지정 (null = 프레임 기본)
}

export const SCREEN_LEVEL_MAX = 10;

// ---------- 크롭 초점 (Phase 6 사람 추적) ----------
// 촬영 이미지 안에서 인물(얼굴 묶음)의 중심, 0~1 정규화 좌표.
export interface Focus {
  x: number;
  y: number;
}

// ---------- 합성 엔진 입력 (lib/image/compose.ts) ----------
export interface ComposeInput {
  photos: string[];          // dataURL 또는 원격 URL, 길이 = layout.photoCount
  focuses?: (Focus | null | undefined)[]; // 사진별 크롭 초점 (없으면 가운데 크롭)
  layout: LayoutConfig;
  frame: FrameConfig;
  stickers: StickerInstance[];
  textLayers: TextLayer[];
  filter: FilterName;
  filterIntensity?: number;
  photoOrder?: number[];
  slotSpacing?: number;
  slotRounding?: number;
  backgroundColor?: string | null;
}

// ---------- AI 응답 스키마 (설계도 7-4, Phase 5에서 사용) ----------
export interface AIDesignResponse {
  frame: string;
  stickers: { type: string; position: string }[];
  text?: { content: string; position: string };
  filter: string;
}
