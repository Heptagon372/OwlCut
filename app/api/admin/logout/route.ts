import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin/auth";

export const runtime = "nodejs";

// POST /api/admin/logout — 관리자 세션 쿠키 삭제
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
