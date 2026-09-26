// 프롬프트(+사진) → 디자인 JSON (설계도 7-4 "요청 처리 흐름"). 서버 전용, 프로바이더 무관.
//   registry에서 model → provider 매핑 → provider.generate → JSON 파싱
//   → frame/sticker 검증·보정 → 파싱 실패 시 basic 프레임 fallback
// 추천을 여러 개 달라고 하면 designs 배열로 받아 각각 검증한다 (방문자가 셋 중 고름).
import type { AIDesignApiResponse, AIDesignResult } from "@/types/ai";
import { AIProviderError, type GenerateImage } from "./providers/types";
import { PROVIDERS, resolveModel } from "./registry";
import { MAX_VARIANTS, SYSTEM_PROMPT, buildUserPrompt, designsSchema } from "./prompt";
import { extractJson, fallbackDesign, normalizeAIDesign } from "./normalize";

export interface GenerateOptions {
  /** 추천 개수 1~3 (여러 개면 방문자가 고른다) */
  count?: number;
  /** 방금 찍은 사진 한 장 — 모델이 실제 사진을 보고 고르게 한다 */
  image?: GenerateImage | null;
}

/** 응답에서 디자인 목록 꺼내기 (한 개짜리 응답도 그대로 받아들인다) */
function pickDesigns(parsed: unknown, count: number): { designs: AIDesignResult[]; warnings: string[] } {
  const list =
    parsed && typeof parsed === "object" && Array.isArray((parsed as { designs?: unknown }).designs)
      ? ((parsed as { designs: unknown[] }).designs as unknown[])
      : [parsed];
  const warnings: string[] = [];
  const designs = list.slice(0, count).map((raw) => {
    const r = normalizeAIDesign(raw);
    warnings.push(...r.warnings);
    return r.design;
  });
  return { designs: designs.length ? designs : [fallbackDesign()], warnings: [...new Set(warnings)] };
}

export async function generateDesign(
  request: string,
  modelId?: string | null,
  opts: GenerateOptions = {},
): Promise<AIDesignApiResponse> {
  const count = Math.min(Math.max(1, Math.floor(opts.count ?? 1)), MAX_VARIANTS);
  const model = resolveModel(modelId);
  if (!model) {
    return {
      design: fallbackDesign(),
      designs: [fallbackDesign()],
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
      prompt: buildUserPrompt(request, { count, hasPhoto: Boolean(opts.image) }),
      schema: designsSchema(count),
      image: opts.image ?? null,
    });
  } catch (error) {
    const e =
      error instanceof AIProviderError
        ? error
        : new AIProviderError("network", "AI 요청 중 오류가 발생했어요.");
    return {
      design: fallbackDesign(),
      designs: [fallbackDesign()],
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
    return {
      design: fallbackDesign(),
      designs: [fallbackDesign()],
      model: model.id,
      fallback: true,
      warnings: ["parse_failed"],
    };
  }

  const { designs, warnings } = pickDesigns(parsed, count);
  return { design: designs[0], designs, model: model.id, fallback: false, warnings };
}
