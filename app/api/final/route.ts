import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured, STORAGE_BUCKET } from "@/lib/supabase/client";
import { dataUrlToBuffer } from "@/lib/image/dataurl";
import { layoutOptions } from "@/lib/image/layoutOptions";
import { expiresAt, finalPath } from "@/lib/storage/photos";
import { isUuid } from "@/lib/ids";

export const runtime = "nodejs";

// POST /api/final — 최종 합성 이미지 업로드 + designs 저장 + 다운로드 페이지 주소 발급 (설계도 6)
// 이미지는 비공개 버킷에 저장하고 DB에는 경로만 남긴다 (보여줄 때 서명 URL 발급).
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const { session_id, image, design } = await req.json();
    if (!isUuid(session_id) || typeof image !== "string") {
      return NextResponse.json({ error: "session_id(UUID), image 필수" }, { status: 400 });
    }
    const { buffer, contentType } = dataUrlToBuffer(image);
    const supabase = getSupabaseAdmin();

    const path = finalPath(session_id);
    const up = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType: contentType || "image/png", upsert: true });
    if (up.error) throw up.error;

    // 오프라인 생성 세션도 FK 만족하도록 upsert. 보관기간은 사진이 완성된 시점부터.
    const expires = expiresAt();
    await supabase
      .from("sessions")
      .upsert({ id: session_id, status: "composed", expires_at: expires }, { onConflict: "id" });
    await supabase.from("designs").insert({
      session_id,
      mode: design?.mode ?? "manual",
      prompt: design?.prompt ?? null,
      ai_model: design?.mode === "ai" ? (design?.aiModel ?? null) : null,
      layout: design?.layoutId ?? null,
      layout_options: layoutOptions(design),
      frame: design?.frameId ?? null,
      stickers: design?.stickers ?? [],
      text_layers: design?.textLayers ?? [],
      filter: design?.filter ?? null,
      final_image_path: path,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    return NextResponse.json({
      download_url: `${appUrl}/download/${session_id}`,
      expires_at: expires,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "최종 이미지 업로드 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
