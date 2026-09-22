import { NextResponse } from "next/server";
import { getAvailableModels } from "@/lib/ai/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/ai/models — 모델 선택 창용. API 키가 설정된 프로바이더의 모델만 반환.
export async function GET() {
  const models = getAvailableModels();
  return NextResponse.json({
    models,
    defaultModel: models.find((m) => m.default)?.id ?? models[0]?.id ?? null,
  });
}
