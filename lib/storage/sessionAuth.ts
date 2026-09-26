// 세션 쓰기 권한 (서버 전용). QR·다운로드 주소에는 세션 id 가 그대로 보이므로 id 만으로는 쓸 수 없게 한다.
// 세션을 만든 부스 기기만 아는 업로드 토큰으로 확인: 저장소에는 해시만 (sessions.upload_token_hash).
// - 토큰이 없는 사람: 남의 사진을 바꿔치기·출력·보관 연장 불가
// - 만료(expired) 세션은 되살리지 않음
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { BoothStore, SessionRow } from "@/lib/db/store";

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

// schema.sql 을 다시 실행하기 전이라 컬럼이 없을 때(= upload_token_hash 가 undefined):
// 쓰기를 막지 않고(행사 중 업로드 중단 방지) 경고만 남긴다. Firebase 는 항상 null/문자열을 준다.
let warned = false;
export function warnSchemaOnce() {
  if (warned) return;
  warned = true;
  console.warn("[보안] sessions.upload_token_hash 컬럼이 없어 업로드 토큰 확인을 건너뜁니다. supabase/schema.sql 을 다시 실행하세요.");
}

export async function authorizeSessionWrite(store: BoothStore, sessionId: string, token: unknown): Promise<SessionAccess> {
  const row = await store.getSession(sessionId);
  if (!row) return { ok: true, exists: false };
  if (row.status === EXPIRED) return { ok: false, httpStatus: 410, error: "expired" };

  const legacy = row.upload_token_hash === undefined; // 컬럼 자체가 없는 예전 스키마
  if (legacy) warnSchemaOnce();
  const hash = legacy ? null : (row.upload_token_hash ?? null);
  if (hash && !tokenMatches(token, hash)) return { ok: false, httpStatus: 403, error: "forbidden" };
  return {
    ok: true,
    exists: true,
    status: row.status,
    expiresAt: row.expires_at ?? null,
    claim: !legacy && !hash && isToken(token),
  };
}

/** 새 세션 (토큰 해시 포함) */
export async function insertSession(store: BoothStore, row: SessionRow, token: unknown): Promise<void> {
  await store.insertSession(isToken(token) ? { ...row, upload_token_hash: hashToken(token) } : row);
}
