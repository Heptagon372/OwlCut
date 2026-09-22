import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { getAdminStats } from "@/lib/admin/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/stats — 관리자 대시보드 통계 (관리자 세션 쿠키 필요)
export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const stats = await getAdminStats();
    return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "stats_failed" }, { status: 500 });
  }
}
