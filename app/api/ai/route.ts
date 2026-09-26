import { NextResponse } from "next/server";
import { generateDesign } from "@/lib/ai/generateDesign";
import { logAIRequest } from "@/lib/ai/usageLog";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { decodeImage } from "@/lib/image/dataurl";
import { MAX_VARIANTS } from "@/lib/ai/prompt";
import type { AIErrorCode } from "@/lib/ai/providers/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PROMPT_LENGTH = 200;
const MAX_PHOTO_BYTES = 800_000; // 모델에 보낼 참고 사진 (부스에서 320px 로 줄여 보냄)

const STATUS_BY_ERROR: Record<AIErrorCode, number> = {
  no_models: 503,
  rate_limited: 429,
  refused: 422,
  auth: 502,
  truncated: 502,
  api: 502,
  network: 502,
};

// POST /api/ai — { prompt, model?, count?, photo? } → 디자인 JSON (설계도 6)
// photo 는 방금 찍은 사진을 작게 줄인 dataURL (선택). 모델이 실제 사진을 보고 고르게 한다.
export async function POST(req: Request) {
  let body: { prompt?: unknown; model?: unknown; count?: unknown; photo?: unknown };
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
  const count = Math.min(Math.max(1, Number(body.count) || 1), MAX_VARIANTS);
  // 사진은 형식·크기를 확인하고 base64 본문만 넘긴다 (PNG/JPEG 만, 큰 파일 거절)
  const decoded = body.photo ? decodeImage(body.photo) : null;
  const image =
    decoded && decoded.buffer.byteLength <= MAX_PHOTO_BYTES
      ? { data: decoded.buffer.toString("base64"), mediaType: decoded.contentType }
      : null;
  const startedAt = Date.now();
  const result = await generateDesign(prompt, model, { count, image });
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
