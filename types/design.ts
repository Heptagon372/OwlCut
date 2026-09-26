// 아울네컷 디자인 관련 타입 정의.
// 수동 편집과 AI 편집이 "동일한 스키마"를 공유한다 (설계도 7-3, 7-4).
import type { FaceGeometry } from "./ar";

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
  labelEn?: string;   // 영어 설정에서 보여 줄 이름
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
// 좌표·크기 규칙은 스티커와 같다: x·y 는 타일 너비·높이 대비, size 는 타일 짧은 변 대비.
export type PatternName = "dots" | "checker" | "gingham" | "stripes" | "grid" | "hearts" | "stars" | "sparkles" | "confetti";

export type FrameBackground =
  | { type: "solid"; color: string }
  | { type: "gradient"; from: string; to: string; angle?: number; stops?: string[] } // stops 가 있으면 여러 색
  | { type: "pattern"; pattern: PatternName; bg: string; fg: string; fg2?: string; scale?: number };

export type FrameFont = "sans" | "display" | "hand" | "hangulHand" | "serif" | "mono";

export type FrameDecoration =
  // 스티커 그림을 프레임 장식으로 (over: 사진 위에 — 테이프·리본처럼 사진 모서리를 덮을 때)
  | { type: "sticker"; id: string; x: number; y: number; size: number; rotation?: number; over?: boolean }
  // 필름 스트립 구멍 (좌우 여백에 자동 배치)
  | { type: "filmHoles"; color: string }
  | { type: "text"; text: string; x: number; y: number; size: number; color: string; font?: FrameFont; rotation?: number; align?: "left" | "center" | "right"; over?: boolean }
  // 안쪽 테두리 선 (inset: 가장자리에서 떨어진 거리, 타일 짧은 변 대비)
  | { type: "border"; color: string; width: number; inset: number; dash?: number[] }
  // ---- 사진 칸마다 (어떤 레이아웃에서도 자리가 맞게) ----
  // 사진 모서리에 스티커 (마스킹 테이프 등). 오른쪽 모서리는 회전을 반대로. every: n번째 칸마다만
  | { type: "slotSticker"; id: string; at: SlotCorner; size: number; rotation?: number; every?: number; offset?: number }
  // 사진 안쪽 모서리 글자: 필름 번호(▶ 1A…) 또는 날짜 도장('26 09 23)
  | { type: "slotLabel"; kind: "film" | "date"; color: string; size: number; glow?: string }
  // 사진 둘레 선: 손그림(sketch)·점선·이중선
  | { type: "slotOutline"; color: string; width: number; style: "sketch" | "dashed" | "double"; gap?: number };

export type SlotCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top";

export interface FrameConfig {
  id: string;
  label: string;
  labelEn?: string;   // 영어 설정에서 보여 줄 이름
  description?: string;           // AI가 프레임을 고를 때 참고하는 분위기 설명
  background: FrameBackground;
  accent: string;                 // 슬롯 테두리 / 강조색
  slotBorderWidth?: number;       // 각 사진 슬롯 테두리 두께(px)
  decorations?: FrameDecoration[];
  footer?: { text: string; color: string; font?: FrameFont };
  defaultTextColor?: string;      // 이 프레임 선택 시 텍스트 기본색
}

// ---------- 스티커 (data/stickers) ----------
// 그림(svg, lib/stickers/art.ts) · 글자(word, 웹폰트로 그림) · 이모지(glyph) 세 종류. 모두 이미지로 만들어
// 편집 화면(끌어서 옮기기)과 합성 엔진이 같은 그림을 쓴다.
export type StickerCategory = "lovely" | "y2k" | "doodle" | "word" | "deco" | "emoji";

export interface WordStyle {
  text: string;          // "{date}" 는 오늘 날짜('26 09 23)로 바뀜 (필름 날짜 도장)
  font: "hand" | "hangulHand" | "display" | "serif" | "mono";
  fill: string;
  stroke?: string;       // 외곽선 (스티커 테두리 느낌)
  glow?: string;         // 네온 빛 번짐 색
  shape?: "none" | "bubble" | "tag" | "burst" | "window"; // 말풍선·태그·폭발·옛날 컴퓨터 창
  shapeFill?: string;
  tilt?: number;         // 기본 기울기(도)
}

export interface StickerDef {
  id: string;
  label: string;
  labelEn?: string;   // 영어 설정에서 보여 줄 이름
  category: StickerCategory;
  glyph?: string;        // 이모지 스티커
  word?: WordStyle;      // 글자 스티커 (없고 glyph 도 없으면 그림 스티커)
}

// 배치된 스티커 1개 — 위치·크기는 타일(스트립 한 장) 기준 비율이라 레이아웃·해상도와 무관
export interface StickerInstance {
  uid: string;     // 같은 스티커를 여러 개 붙여도 구분
  id: string;      // StickerDef.id
  x: number;       // 중심 x (타일 너비 대비 0..1)
  y: number;       // 중심 y (타일 높이 대비 0..1)
  size: number;    // 폭 (타일 짧은 변 대비)
  rotation: number; // 도
}

// ---------- 텍스트 레이어 ----------
export interface TextLayer {
  content: string;
  anchor: TextAnchor;
  color: string;
  size: number;      // 폰트 크기(px, 레이아웃 캔버스 기준)
  font?: FrameFont;  // 글꼴 (없으면 sans)
}

// 칸마다 사진을 얼마나 키우고 어디를 보여 줄지 (편집 화면에서 조절, lib/image/photoAdjust.ts)
export interface PhotoAdjust {
  zoom: number;  // 1 = 기본(칸을 가득), 최대 3
  x: number;     // 남는 여백 대비 -1~1 (0 = 기본 위치)
  y: number;
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
  effect: string;                  // AR 얼굴 효과 id (lib/ar/effects.ts, "none" = 없음). 필터처럼 합성 때 적용
  // ---- 화면 구성 (촬영 후 수정) ----
  photoOrder: number[];            // 자리 i 에 들어갈 사진 번호 (기본 [0,1,2,3])
  slotSpacing: number;             // 사진 간격 단계 0~10 (0 = 레이아웃 기본)
  slotRounding: number;            // 사진 모서리 둥글기 단계 0~10
  backgroundColor: string | null;  // 배경색 직접 지정 (null = 프레임 기본)
  photoAdjust?: (PhotoAdjust | null)[]; // 사진 번호별 확대·위치 (자리를 바꿔도 사진을 따라간다)
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
  effect?: string;                 // AR 얼굴 효과 id
  photoFaces?: (FaceGeometry[] | null | undefined)[]; // 사진별 얼굴 기준점 (사진 정규화 좌표)
  photoOrder?: number[];
  photoAdjust?: (PhotoAdjust | null)[];  // 사진 번호별 확대·위치
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
