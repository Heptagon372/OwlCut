// AI 디자인 모듈 공용 타입 (설계도 7-4). 클라이언트/서버 양쪽에서 import 가능 (타입만).
import type { DesignState } from "./design";

export type ProviderId = "claude" | "openai" | "gemini";

// 모델 선택 창에 노출되는 모델 1개
export interface ModelInfo {
  id: string;
  label: string;
  provider: ProviderId;
  default?: boolean;
}

// AI가 채워주는 디자인 필드 (레이아웃·사진 구성은 사용자 선택 유지)
export type AIDesignResult = Pick<DesignState, "frameId" | "stickers" | "textLayers" | "filter" | "effect">;

// POST /api/ai 응답. designs = 추천 여러 개(1~3), design = 그중 첫 번째 (예전 호환)
export interface AIDesignApiResponse {
  design: AIDesignResult;
  designs?: AIDesignResult[];
  model: string | null;
  fallback: boolean;      // true면 파싱 실패 등으로 기본 디자인이 들어감
  warnings: string[];
  error?: string;         // 실패 시 에러 코드
  message?: string;       // 실패 시 사용자 안내 문구
}
