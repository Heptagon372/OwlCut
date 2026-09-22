import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { expiresAt } from "@/lib/storage/photos";
import { insertSession, newUploadToken } from "@/lib/storage/sessionAuth";
import { isUuid } from "@/lib/ids";

export const runtime = "nodejs";

// POST /api/session — 세션 생성 (설계도 6). 업로드 토큰은 이 응답으로 부스에만 한 번 전달하고 DB 에는 해시만.
export async function POST() {
  const id = crypto.randomUUID();
  const token = newUploadToken();
  if (!isSupabaseConfigured()) {
    // Supabase 미설정: 로컬 UUID로 폴백 (오프라인 흐름 유지)
    return NextResponse.json({ id, token, status: "created", persisted: false });
  }
  try {
    await insertSession(getSupabaseAdmin(), { id, status: "created", expires_at: expiresAt() }, token);
    return NextResponse.json({ id, token, status: "created", persisted: true });
  } catch {
    return NextResponse.json({ id, token, status: "created", persisted: false });
  }
}

// GET /api/session?id= — 세션 상태 조회 (토큰 해시 등 내부 값은 내보내지 않음)
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("sessions").select("id, status, expires_at").eq("id", id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(data);
}
