import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth/bearer";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { cleanupExpired } from "@/lib/storage/cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET|POST /api/cron/cleanup — 보관기간이 지난 방문자 사진·세션 삭제.
// Authorization: Bearer CRON_SECRET 필수 (Vercel Cron·GitHub Actions 스케줄이 이 형식으로 호출).
async function handle(req: Request) {
  if (!verifyBearer(req, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const result = await cleanupExpired();
    return NextResponse.json(result, { status: result.errors.length ? 500 : 200 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "cleanup_failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
