// AI 프로바이더 어댑터 인터페이스 (설계도 7-4).
// 각 프로바이더는 raw text(JSON 문자열)만 돌려주고, 파싱/검증은 generateDesign이 담당한다.
import type { ProviderId } from "@/types/ai";

export interface GenerateRequest {
  model: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>; // 출력 JSON Schema (지원하는 프로바이더는 강제 적용)
}

export interface AIProvider {
  id: ProviderId;
  isConfigured(): boolean; // env에 키가 있을 때만 모델 목록에 노출
  generate(req: GenerateRequest): Promise<string>;
}

export type AIErrorCode =
  | "no_models"
  | "auth"
  | "rate_limited"
  | "refused"
  | "truncated"
  | "api"
  | "network";

export class AIProviderError extends Error {
  constructor(
    public code: AIErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
