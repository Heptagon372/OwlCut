// Claude 어댑터 — 공식 Anthropic SDK 사용.
// - 구조화 출력(output_config.format json_schema)으로 스키마에 맞는 JSON만 받는다.
// - 짧은 분류성 작업이라 effort "low" (thinking은 켠 채 깊이만 낮춤 → 부스 대기시간 단축).
// - Opus 5는 서버측 refusal fallback("default")을 켜 둔다.
import Anthropic from "@anthropic-ai/sdk";
import { AIProviderError, type AIProvider } from "./types";

// fallbacks: "default" 를 지원하는 모델만 적용
const SERVER_FALLBACK_MODELS = new Set(["claude-opus-5", "claude-fable-5-1"]);

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // 부스 UX: 한 번만 재시도, 요청당 30초 제한
  if (!client) client = new Anthropic({ maxRetries: 1, timeout: 30_000 });
  return client;
}

export const claudeProvider: AIProvider = {
  id: "claude",

  isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  },

  async generate({ model, system, prompt, schema }) {
    const useFallbacks = SERVER_FALLBACK_MODELS.has(model);
    try {
      const response = await getClient().beta.messages.create({
        model,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: prompt }],
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema },
        },
        ...(useFallbacks
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      });

      if (response.stop_reason === "refusal") {
        throw new AIProviderError("refused", "이 요청으로는 디자인을 만들 수 없어요. 다른 표현으로 시도해 주세요.");
      }
      if (response.stop_reason === "max_tokens") {
        throw new AIProviderError("truncated", "AI 응답이 중간에 끊겼어요. 다시 시도해 주세요.");
      }

      return response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      if (error instanceof Anthropic.AuthenticationError) {
        throw new AIProviderError("auth", "Claude API 키가 올바르지 않아요.");
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new AIProviderError("rate_limited", "Claude 사용량 한도에 도달했어요. 잠시 후 또는 다른 모델로 시도해 주세요.");
      }
      if (error instanceof Anthropic.APIConnectionError) {
        throw new AIProviderError("network", "Claude 서버에 연결하지 못했어요.");
      }
      if (error instanceof Anthropic.APIError) {
        throw new AIProviderError("api", `Claude API 오류 (${error.status ?? "unknown"})`);
      }
      throw new AIProviderError("network", "Claude 요청 중 알 수 없는 오류가 발생했어요.");
    }
  },
};
