// 세션 쓰기 권한 (서버 전용). QR·다운로드 주소에는 세션 id 가 그대로 보이므로 id 만으로는 쓸 수 없게 한다.
// 세션을 만든 부스 기기만 아는 업로드 토큰으로 확인: DB 에는 해시만 저장 (sessions.upload_token_hash).
// - 토큰이 없는 사람: 남의 사진을 바꿔치기·출력·보관 연장 불가
// - 만료(expired) 세션은 되살리지 않음
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const EXPIRED = "expired";

export const newUploadToken = () => randomBytes(24).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** 토큰 형식: 부스가 만든 무작위 문자열 (너무 짧거나 긴 값은 거절) */
export const isToken = (t: unknown): t is string => typeof t === "string" && t.length >= 16 && t.length <= 128;

export function tokenMatches(token: unknown, hash: string): boolean {
  if (!isToken(token)) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type SessionAccess =
  | { ok: true; exists: false }
  | { ok: true; exists: true; status: string; expiresAt: string | null; claim: boolean } // claim: 해시가 없던 세션 → 이번 토큰으로 등록
  | { ok: false; httpStatus: 403 | 410; error: "forbidden" | "expired" };

// schema.sql 을 다시 실행하기 전이라 컬럼이 없을 때: 쓰기를 막지 않고(행사 중 업로드 중단 방지) 경고만
let warned = false;
function isMissingColumn(e: { code?: string; message?: string }) {
  return e.code === "42703" || e.code === "PGRST204" || /upload_token_hash/.test(e.message ?? "");
}
export function warnSchemaOnce() {
  if (warned) return;
  warned = true;
  console.warn("[보안] sessions.upload_token_hash 컬럼이 없어 업로드 토큰 확인을 건너뜁니다. supabase/schema.sql 을 다시 실행하세요.");
}

export async function authorizeSessionWrite(db: SupabaseClient, sessionId: string, token: unknown): Promise<SessionAccess> {
  let { data, error } = await db
    .from("sessions")
    .select("id, status, expires_at, upload_token_hash")
    .eq("id", sessionId)
    .maybeSingle();
  let legacy = false;
  if (error && isMissingColumn(error)) {
    warnSchemaOnce();
    legacy = true;
    ({ data, error } = await db.from("sessions").select("id, status, expires_at").eq("id", sessionId).maybeSingle());
  }
  if (error) throw error;
  if (!data) return { ok: true, exists: false };
  if (data.status === EXPIRED) return { ok: false, httpStatus: 410, error: "expired" };
  const hash = legacy ? null : ((data as { upload_token_hash?: string | null }).upload_token_hash ?? null);
  if (hash && !tokenMatches(token, hash)) return { ok: false, httpStatus: 403, error: "forbidden" };
  return { ok: true, exists: true, status: data.status, expiresAt: data.expires_at ?? null, claim: !legacy && !hash && isToken(token) };
}

/** 새 세션 행 (토큰 해시 포함). 컬럼이 없으면 해시 없이 */
export async function insertSession(db: SupabaseClient, row: Record<string, unknown>, token: unknown) {
  const withHash = isToken(token) ? { ...row, upload_token_hash: hashToken(token) } : row;
  let res = await db.from("sessions").insert(withHash);
  if (res.error && isMissingColumn(res.error)) {
    warnSchemaOnce();
    res = await db.from("sessions").insert(row);
  }
  if (res.error) throw res.error;
}
