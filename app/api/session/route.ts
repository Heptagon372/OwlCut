import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { expiresAt } from "@/lib/storage/photos";

export const runtime = "nodejs";

// POST /api/session — 세션 생성 (설계도 6)
export async function POST() {
  if (!isSupabaseConfigured()) {
    // Supabase 미설정: 로컬 UUID로 폴백 (오프라인 흐름 유지)
    return NextResponse.json({
      id: crypto.randomUUID(),
      status: "created",
      persisted: false,
    });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("sessions")
      .insert({ status: "created", expires_at: expiresAt() })
      .select("id, status")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id, status: data.status, persisted: true });
  } catch {
    return NextResponse.json({
      id: crypto.randomUUID(),
      status: "created",
      persisted: false,
    });
  }
}

// GET /api/session?id= — 세션 조회
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
