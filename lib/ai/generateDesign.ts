// 프롬프트 → 디자인 JSON (설계도 7-4 "요청 처리 흐름"). 서버 전용, 프로바이더 무관.
//   registry에서 model → provider 매핑 → provider.generate → JSON 파싱
//   → frame/sticker 검증·보정 → 파싱 실패 시 basic 프레임 fallback
import type { AIDesignApiResponse } from "@/types/ai";
import { AIProviderError } from "./providers/types";
import { PROVIDERS, resolveModel } from "./registry";
import { DESIGN_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { extractJson, fallbackDesign, normalizeAIDesign } from "./normalize";

export async function generateDesign(
  request: string,
  modelId?: string | null,
): Promise<AIDesignApiResponse> {
  const model = resolveModel(modelId);
  if (!model) {
    return {
      design: fallbackDesign(),
      model: null,
      fallback: true,
      warnings: [],
      error: "no_models",
      message: "사용 가능한 AI 모델이 없어요. 직접 꾸미기를 이용해 주세요.",
    };
  }

  let raw: string;
  try {
    raw = await PROVIDERS[model.provider].generate({
      model: model.id,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(request),
      schema: DESIGN_SCHEMA,
    });
  } catch (error) {
    const e =
      error instanceof AIProviderError
        ? error
        : new AIProviderError("network", "AI 요청 중 오류가 발생했어요.");
    return {
      design: fallbackDesign(),
      model: model.id,
      fallback: true,
      warnings: [],
      error: e.code,
      message: e.message,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    // 파싱 실패 → basic 프레임 fallback, 수동 편집 유도
    return { design: fallbackDesign(), model: model.id, fallback: true, warnings: ["parse_failed"] };
  }

  const { design, warnings } = normalizeAIDesign(parsed);
  return { design, model: model.id, fallback: false, warnings };
}
