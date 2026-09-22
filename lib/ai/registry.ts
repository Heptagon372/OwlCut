// 선택 가능한 AI 모델 목록 (설계도 7-4). 서버 전용 — env 키가 있는 프로바이더만 노출.
// 새 모델 추가 = MODELS에 한 줄. 새 프로바이더 추가 = providers/xxx.ts + PROVIDERS에 한 줄.
import type { ModelInfo, ProviderId } from "@/types/ai";
import type { AIProvider } from "./providers/types";
import { claudeProvider } from "./providers/claude";
import { openaiProvider } from "./providers/openai";
import { geminiProvider } from "./providers/gemini";

export const PROVIDERS: Record<ProviderId, AIProvider> = {
  claude: claudeProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
};

// OpenAI/Gemini 모델 ID는 배포 시점 최신으로 env에서 교체 가능 (OPENAI_MODEL / GEMINI_MODEL)
const openaiModel = process.env.OPENAI_MODEL || "gpt-5-mini";
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const MODELS: ModelInfo[] = [
  { id: "claude-opus-5", label: "Claude Opus 5", provider: "claude", default: true },
  { id: openaiModel, label: `OpenAI ${openaiModel}`, provider: "openai" },
  { id: geminiModel, label: `Gemini ${geminiModel}`, provider: "gemini" },
];

export function getAvailableModels(): ModelInfo[] {
  return MODELS.filter((m) => PROVIDERS[m.provider].isConfigured());
}

// 요청한 모델이 없거나 비활성이면 기본 모델 → 첫 번째 가용 모델 순으로 대체
export function resolveModel(id?: string | null): ModelInfo | null {
  const available = getAvailableModels();
  return (
    available.find((m) => m.id === id) ??
    available.find((m) => m.default) ??
    available[0] ??
    null
  );
}
