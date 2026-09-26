// 필터 프리셋 타입 — data/filters/index.json. 모든 값은 생략 가능하며 생략 = 효과 없음.
// 같은 파라미터가 촬영 미리보기(WebGL 실시간) · 썸네일 · 최종 합성에 동일하게 쓰인다.

export type CurvePoint = [number, number]; // (입력, 출력) 0~1

export interface FilterParams {
  exposure?: number;     // 노출(스톱) -1..1
  brightness?: number;   // 밝기 더하기 -0.3..0.3
  contrast?: number;     // 대비 1 = 그대로
  saturation?: number;   // 채도 1 = 그대로, 0 = 흑백
  vibrance?: number;     // 옅은 색만 살리는 채도 0..1
  temperature?: number;  // -1 차갑게 .. 1 따뜻하게
  tint?: number;         // -1 초록 .. 1 마젠타
  highlights?: number;   // 밝은 영역 -1..1
  shadows?: number;      // 어두운 영역 -1..1
  fade?: number;         // 검정 띄우기(필름 물빠짐) 0..0.3
  bw?: number;           // 흑백 섞기 0..1
  bwMix?: [number, number, number]; // 흑백 변환 채널 가중치 (합 ≈ 1)
  sepia?: number;        // 0..1
  splitShadow?: string;  // 스플릿 토닝: 어두운 영역 색 (#rrggbb)
  splitHighlight?: string; // 밝은 영역 색
  splitAmount?: number;  // 0..1
  glow?: number;         // 뽀샤시 소프트 글로우 0..1
  smooth?: number;       // 피부 보정 0..1 (피부색 영역만, 윤곽 보존)
  vignette?: number;     // 가장자리 어둡게 0..1
  grain?: number;        // 필름 입자 0..0.15
  leak?: number;         // 빛샘(좌상단 따뜻한 빛) 0..1
  leakColor?: string;    // 빛샘 색 (기본 주황)
  curves?: { rgb?: CurvePoint[]; r?: CurvePoint[]; g?: CurvePoint[]; b?: CurvePoint[] };
}

export type FilterCategory = "basic" | "beauty" | "bw" | "film" | "tone" | "mood";

export interface FilterPreset {
  id: string;
  label: string;
  labelEn?: string;   // 영어 설정에서 보여 줄 이름
  category: FilterCategory;
  description?: string; // AI가 분위기에 맞는 필터를 고를 때 참고
  params: FilterParams;
}
