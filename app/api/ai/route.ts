import { NextResponse } from "next/server";
import { generateDesign } from "@/lib/ai/generateDesign";
import { logAIRequest } from "@/lib/ai/usageLog";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import type { AIErrorCode } from "@/lib/ai/providers/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PROMPT_LENGTH = 200;

const STATUS_BY_ERROR: Record<AIErrorCode, number> = {
  no_models: 503,
  rate_limited: 429,
  refused: 422,
  auth: 502,
  truncated: 502,
  api: 502,
  network: 502,
};

// POST /api/ai — { session_id?, prompt, model? } → 디자인 JSON (설계도 6)
export async function POST(req: Request) {
  let body: { prompt?: unknown; model?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request", message: "잘못된 요청이에요." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: "bad_prompt", message: `분위기를 1~${MAX_PROMPT_LENGTH}자로 입력해 주세요.` },
      { status: 400 },
    );
  }

  if (!checkRateLimit(`ai:${clientKey(req)}`)) {
    return NextResponse.json(
      { error: "rate_limited", message: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const model = typeof body.model === "string" ? body.model : null;
  const startedAt = Date.now();
  const result = await generateDesign(prompt, model);
  if (result.error !== "no_models") {
    await logAIRequest({
      model: result.model,
      ok: !result.error && !result.fallback,
      error: result.error ?? (result.fallback ? "parse_failed" : null),
      latencyMs: Date.now() - startedAt,
    });
  }
  const status = result.error ? STATUS_BY_ERROR[result.error as AIErrorCode] ?? 502 : 200;
  return NextResponse.json(result, { status });
}
