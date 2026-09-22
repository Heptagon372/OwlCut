import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { PrintQueueError, enqueuePrint, getLatestPrintStatus } from "@/lib/printer/printQueue";
import { authorizeSessionWrite } from "@/lib/storage/sessionAuth";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/print — 출력 큐 등록만 하고 즉시 응답 (설계도 7-6). 부스 화면에서 호출.
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED", message: "출력 기능이 설정되지 않았어요." }, { status: 503 });
  }
  let body: { session_id?: unknown; copies?: unknown; token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!UUID.test(sessionId)) {
    return NextResponse.json({ error: "bad_session", message: "잘못된 세션이에요." }, { status: 400 });
  }
  try {
    // 출력은 사진을 찍은 부스만 (QR 로 id 를 본 사람이 행사장 프린터로 남의 사진을 뽑지 못하게)
    const access = await authorizeSessionWrite(getSupabaseAdmin(), sessionId, body.token);
    if (!access.ok) return NextResponse.json({ error: access.error, message: "이 사진은 출력할 수 없어요." }, { status: access.httpStatus });
    if (!access.exists) return NextResponse.json({ error: "not_found", message: "출력할 사진을 찾을 수 없어요." }, { status: 404 });
    const job = await enqueuePrint(sessionId, typeof body.copies === "number" ? body.copies : 1);
    return NextResponse.json(job, { status: 201 });
  } catch (e) {
    if (e instanceof PrintQueueError) {
      const status = e.code === "limit_reached" ? 429 : 409;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    return NextResponse.json({ error: "enqueue_failed", message: "출력 요청에 실패했어요." }, { status: 500 });
  }
}

// GET /api/print?session_id= — 이 세션의 최근 출력 상태 (부스 화면 폴링용)
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
  if (!UUID.test(sessionId)) return NextResponse.json({ error: "bad_session" }, { status: 400 });
  const status = await getLatestPrintStatus(sessionId);
  if (!status) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
