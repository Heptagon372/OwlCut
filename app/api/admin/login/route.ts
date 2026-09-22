import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  checkPassword,
  createSessionToken,
  isAdminConfigured,
} from "@/lib/admin/auth";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

// POST /api/admin/login — { password } → 관리자 세션 쿠키 발급
export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "not_configured", message: "ADMIN_PASSWORD가 설정되지 않았어요." }, { status: 503 });
  }
  if (!checkRateLimit(`login:${clientKey(req)}`, 5)) {
    return NextResponse.json({ error: "rate_limited", message: "시도가 너무 많아요. 1분 후 다시 시도해 주세요." }, { status: 429 });
  }
  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    // fallthrough → 401
  }
  if (!checkPassword(password)) {
    return NextResponse.json({ error: "invalid", message: "비밀번호가 올바르지 않아요." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  return res;
}
