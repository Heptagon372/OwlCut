import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { expiresAt } from "@/lib/storage/photos";
import { authorizeSessionWrite, insertSession } from "@/lib/storage/sessionAuth";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { isUuid } from "@/lib/ids";
import { layoutOptions } from "@/lib/image/layoutOptions";

export const runtime = "nodejs";

// POST /api/design — 수동/AI 디자인 결과 저장 (설계도 6). 세션을 만든 부스의 업로드 토큰 필요.
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  if (!checkRateLimit(`design:${clientKey(req)}`, 30)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: { session_id?: unknown; design?: Record<string, unknown>; token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { session_id, design, token } = body;
  if (!isUuid(session_id) || !design || typeof design !== "object") {
    return NextResponse.json({ error: "session_id(UUID), design 필수" }, { status: 400 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const access = await authorizeSessionWrite(supabase, session_id, token);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.httpStatus });
    if (!access.exists) await insertSession(supabase, { id: session_id, status: "editing", expires_at: expiresAt() }, token);

    const { data, error } = await supabase
      .from("designs")
      .insert({
        session_id,
        mode: design.mode === "ai" ? "ai" : "manual",
        prompt: typeof design.prompt === "string" ? design.prompt.slice(0, 200) : null,
        ai_model: design.mode === "ai" && typeof design.aiModel === "string" ? design.aiModel : null,
        layout: typeof design.layoutId === "string" ? design.layoutId : null,
        layout_options: layoutOptions(design),
        frame: typeof design.frameId === "string" ? design.frameId : null,
        stickers: Array.isArray(design.stickers) ? design.stickers.slice(0, 50) : [],
        text_layers: Array.isArray(design.textLayers) ? design.textLayers.slice(0, 10) : [],
        filter: typeof design.filter === "string" ? design.filter : null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error("[design] 저장 실패", e);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
