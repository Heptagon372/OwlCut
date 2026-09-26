import { NextResponse } from "next/server";
import { getStore, isStoreConfigured, STORE_NOT_CONFIGURED } from "@/lib/db";
import { expiresAt } from "@/lib/storage/photos";
import { insertSession, newUploadToken } from "@/lib/storage/sessionAuth";
import { isUuid, newUuid } from "@/lib/ids";

export const runtime = "nodejs";

// POST /api/session — 세션 생성 (설계도 6). 업로드 토큰은 이 응답으로 부스에만 한 번 전달하고 DB 에는 해시만.
export async function POST() {
  const id = newUuid();
  const token = newUploadToken();
  if (!isStoreConfigured()) {
    // 저장소 미설정: 로컬 UUID로 폴백 (오프라인 흐름 유지)
    return NextResponse.json({ id, token, status: "created", persisted: false });
  }
  try {
    await insertSession(getStore(), { id, status: "created", expires_at: expiresAt() }, token);
    return NextResponse.json({ id, token, status: "created", persisted: true });
  } catch {
    return NextResponse.json({ id, token, status: "created", persisted: false });
  }
}

// GET /api/session?id= — 세션 상태 조회 (토큰 해시 등 내부 값은 내보내지 않음)
export async function GET(req: Request) {
  if (!isStoreConfigured()) {
    return NextResponse.json({ error: STORE_NOT_CONFIGURED }, { status: 503 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const row = await getStore().getSession(id).catch(() => null);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // 토큰 해시 같은 내부 값은 내보내지 않는다
  return NextResponse.json({ id: row.id, status: row.status, expires_at: row.expires_at ?? null });
}
