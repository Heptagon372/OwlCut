import { NextResponse } from "next/server";
import { getStore, isStoreConfigured, STORE_NOT_CONFIGURED } from "@/lib/db";
import { decodeImage } from "@/lib/image/dataurl";
import { layoutOptions } from "@/lib/image/layoutOptions";
import { expiresAt, finalPath } from "@/lib/storage/photos";
import { authorizeSessionWrite, hashToken, insertSession } from "@/lib/storage/sessionAuth";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { isUuid } from "@/lib/ids";

export const runtime = "nodejs";

const RATE_PER_MINUTE = 30; // 부스 한 대는 분당 몇 번이면 충분 (재시도 포함)

// POST /api/final — 최종 합성 이미지 업로드 + designs 저장 + 다운로드 페이지 주소 발급 (설계도 6)
// 이미지는 비공개 버킷에 저장하고 DB에는 경로만 남긴다 (보여줄 때 서명 URL 발급).
// 같은 세션으로 여러 번 불려도 결과가 같다 (파일 덮어쓰기 + 세션당 designs 1행) → 클라이언트 재시도 안전.
// 쓰기는 세션을 만든 부스의 업로드 토큰이 있어야 함 (QR 로 id 를 본 사람이 사진을 바꿔치기하지 못하게).
export async function POST(req: Request) {
  if (!isStoreConfigured()) {
    return NextResponse.json({ error: STORE_NOT_CONFIGURED }, { status: 503 });
  }
  if (!checkRateLimit(`final:${clientKey(req)}`, RATE_PER_MINUTE)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: { session_id?: unknown; image?: unknown; design?: Record<string, unknown>; token?: unknown };
  const text = (v: unknown) => (typeof v === "string" ? v : null);
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { session_id, design, token } = body;
  if (!isUuid(session_id)) return NextResponse.json({ error: "bad_session" }, { status: 400 });
  const image = decodeImage(body.image); // PNG/JPEG 시그니처 확인 + 크기 제한
  if (!image) return NextResponse.json({ error: "bad_image" }, { status: 400 });

  try {
    const store = getStore();
    const access = await authorizeSessionWrite(store, session_id, token);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.httpStatus });

    const path = finalPath(session_id);
    await store.upload(path, image.buffer, image.contentType);

    // 보관기간은 처음 완성된 시점부터 — 다시 올려도(재시도·편집 후 재완성) 늘어나지 않음.
    // DB 저장이 실패하면 500 → 클라이언트가 재시도 (실패를 삼키면 QR은 뜨는데 다운로드 페이지엔 사진이 없다)
    let expires: string;
    if (!access.exists) {
      // 오프라인에서 만든 세션 (세션 생성 요청이 실패했던 경우)
      expires = expiresAt();
      await insertSession(store, { id: session_id, status: "composed", expires_at: expires }, token);
    } else {
      const first = access.status !== "composed";
      expires = first || !access.expiresAt ? expiresAt() : access.expiresAt;
      const patch: Record<string, unknown> = { status: "composed", expires_at: expires };
      if (access.claim) patch.upload_token_hash = hashToken(token as string);
      await store.updateSession(session_id, patch);
    }
    await store.saveFinalDesign(session_id, {
      mode: text(design?.mode) ?? "manual",
      prompt: text(design?.prompt),
      ai_model: design?.mode === "ai" ? text(design?.aiModel) : null,
      layout: text(design?.layoutId),
      layout_options: layoutOptions(design),
      frame: text(design?.frameId),
      stickers: design?.stickers ?? [],
      text_layers: design?.textLayers ?? [],
      filter: text(design?.filter),
      final_image_path: path,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    return NextResponse.json({
      download_url: `${appUrl}/download/${session_id}`,
      expires_at: expires,
    });
  } catch (e) {
    console.error("[final] 업로드 실패", e);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
