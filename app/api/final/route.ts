import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  STORAGE_BUCKET,
} from "@/lib/supabase/client";
import { dataUrlToBuffer } from "@/lib/image/dataurl";

export const runtime = "nodejs";

// POST /api/final — 최종 합성 이미지 업로드 + designs 저장 + 다운로드 URL 발급 (설계도 6)
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const { session_id, image, design } = await req.json();
    if (!session_id || !image) {
      return NextResponse.json({ error: "session_id, image 필수" }, { status: 400 });
    }
    const { buffer, contentType } = dataUrlToBuffer(image);
    const supabase = getSupabaseAdmin();

    const path = `finals/${session_id}.png`;
    const up = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType: contentType || "image/png", upsert: true });
    if (up.error) throw up.error;
    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const finalUrl = pub.publicUrl;

    // 오프라인 생성 세션도 FK 만족하도록 upsert
    await supabase
      .from("sessions")
      .upsert({ id: session_id, status: "composed" }, { onConflict: "id" });
    await supabase.from("designs").insert({
      session_id,
      mode: design?.mode ?? "manual",
      prompt: design?.prompt ?? null,
      frame: design?.frameId ?? null,
      stickers: design?.stickers ?? [],
      text_layers: design?.textLayers ?? [],
      filter: design?.filter ?? null,
      final_image_url: finalUrl,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    return NextResponse.json({
      url: finalUrl,
      download_url: `${appUrl}/download/${session_id}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "최종 이미지 업로드 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
