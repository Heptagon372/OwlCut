// 관리자 비밀번호 게이트 (설계도 2: "간단한 비밀번호/토큰 게이트"). 서버 전용.
// 로그인 성공 시 만료시각에 HMAC 서명한 httpOnly 쿠키를 발급. 비밀번호를 바꾸면 기존 세션은 모두 무효.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "owlcut_admin";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

const sha = (s: string) => createHash("sha256").update(s).digest();

function sign(expiresAt: number): string {
  return createHmac("sha256", process.env.ADMIN_PASSWORD ?? "")
    .update(`owlcut-admin.${expiresAt}`)
    .digest("hex");
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(sha(input), sha(expected));
}

export function createSessionToken(now = Date.now()): string {
  const expiresAt = now + ADMIN_SESSION_SECONDS * 1000;
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token || !isAdminConfigured()) return false;
  const [exp, sig] = token.split(".");
  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || expiresAt < now || !sig) return false;
  return timingSafeEqual(sha(sig), sha(sign(expiresAt)));
}

// Route Handler용: Cookie 헤더에서 세션 확인
export function isAdminRequest(req: Request): boolean {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
  return verifySessionToken(match ? decodeURIComponent(match.slice(ADMIN_COOKIE.length + 1)) : undefined);
}
