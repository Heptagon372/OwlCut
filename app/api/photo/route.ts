import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  STORAGE_BUCKET,
} from "@/lib/supabase/client";
import { dataUrlToBuffer } from "@/lib/image/dataurl";

export const runtime = "nodejs";

// POST /api/photo — 원본 사진 1장 업로드 (session_id, order_index, image)
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const { session_id, order_index, image } = await req.json();
    if (!session_id || image == null || order_index == null) {
      return NextResponse.json(
        { error: "session_id, order_index, image 필수" },
        { status: 400 },
      );
    }
    const { buffer, contentType } = dataUrlToBuffer(image);
    const supabase = getSupabaseAdmin();
    const path = `photos/${session_id}/${order_index}.jpg`;
    const up = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType, upsert: true });
    if (up.error) throw up.error;
    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    await supabase.from("sessions").upsert(
      { id: session_id, status: "capturing" },
      { onConflict: "id" },
    );
    await supabase.from("photos").insert({
      session_id,
      image_url: pub.publicUrl,
      order_index,
    });
    return NextResponse.json({ url: pub.publicUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "사진 업로드 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
