import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured, STORAGE_BUCKET } from "@/lib/supabase/client";
import { dataUrlToBuffer } from "@/lib/image/dataurl";
import { expiresAt, photoPath } from "@/lib/storage/photos";
import { isUuid } from "@/lib/ids";

export const runtime = "nodejs";

// POST /api/photo — 원본 사진 1장 업로드 (session_id, order_index, image). 비공개 버킷에 경로만 기록.
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const { session_id, order_index, image } = await req.json();
    if (!isUuid(session_id) || typeof image !== "string" || !Number.isInteger(order_index) || order_index < 0 || order_index > 15) {
      return NextResponse.json({ error: "session_id(UUID), order_index(0~15), image 필수" }, { status: 400 });
    }
    const { buffer, contentType } = dataUrlToBuffer(image);
    const supabase = getSupabaseAdmin();
    const path = photoPath(session_id, order_index);
    const up = await supabase.storage.from(STORAGE_BUCKET).upload(path, buffer, { contentType, upsert: true });
    if (up.error) throw up.error;

    await supabase
      .from("sessions")
      .upsert({ id: session_id, status: "capturing", expires_at: expiresAt() }, { onConflict: "id" });
    await supabase.from("photos").insert({ session_id, image_path: path, order_index });
    return NextResponse.json({ path });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "사진 업로드 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
