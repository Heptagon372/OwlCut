import { NextResponse } from "next/server";
import { getStore, isStoreConfigured, STORE_NOT_CONFIGURED } from "@/lib/db";
import { decodeImage } from "@/lib/image/dataurl";
import { expiresAt, photoPath } from "@/lib/storage/photos";
import { authorizeSessionWrite, insertSession } from "@/lib/storage/sessionAuth";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { isUuid } from "@/lib/ids";

export const runtime = "nodejs";

// POST /api/photo — 원본 사진 1장 업로드 (session_id, order_index, image, token). 비공개 버킷에 경로만 기록.
// 세션을 만든 부스의 업로드 토큰 필요, PNG/JPEG 만, 보관기간은 늘리지 않음.
export async function POST(req: Request) {
  if (!isStoreConfigured()) {
    return NextResponse.json({ error: STORE_NOT_CONFIGURED }, { status: 503 });
  }
  if (!checkRateLimit(`photo:${clientKey(req)}`, 60)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: { session_id?: unknown; order_index?: unknown; image?: unknown; token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { session_id, order_index, token } = body;
  if (!isUuid(session_id) || !Number.isInteger(order_index) || (order_index as number) < 0 || (order_index as number) > 15) {
    return NextResponse.json({ error: "session_id(UUID), order_index(0~15) 필수" }, { status: 400 });
  }
  const image = decodeImage(body.image);
  if (!image) return NextResponse.json({ error: "bad_image" }, { status: 400 });
  try {
    const store = getStore();
    const access = await authorizeSessionWrite(store, session_id, token);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.httpStatus });
    if (!access.exists) await insertSession(store, { id: session_id, status: "capturing", expires_at: expiresAt() }, token);

    const path = photoPath(session_id, order_index as number);
    await store.upload(path, image.buffer, image.contentType);
    await store.insertPhoto({ session_id, image_path: path, order_index: order_index as number });
    return NextResponse.json({ path });
  } catch (e) {
    console.error("[photo] 업로드 실패", e);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
