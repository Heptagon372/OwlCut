import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

export const runtime = "nodejs";

// POST /api/design — 수동/AI 디자인 결과 저장 (설계도 6)
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const { session_id, design } = await req.json();
    if (!session_id || !design) {
      return NextResponse.json({ error: "session_id, design 필수" }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    await supabase
      .from("sessions")
      .upsert({ id: session_id, status: "editing" }, { onConflict: "id" });
    const { data, error } = await supabase
      .from("designs")
      .insert({
        session_id,
        mode: design.mode ?? "manual",
        prompt: design.prompt ?? null,
        ai_model: design.mode === "ai" ? (design.aiModel ?? null) : null,
        frame: design.frameId ?? null,
        stickers: design.stickers ?? [],
        text_layers: design.textLayers ?? [],
        filter: design.filter ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "디자인 저장 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
