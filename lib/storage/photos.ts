// 사진 저장소 규칙 (서버 전용). 버킷은 비공개 — DB에는 경로만 저장하고, 보여줄 때마다 만료되는 서명 URL 발급.
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/client";

const DEFAULT_RETENTION_HOURS = 2; // 설계도 4: 세션 2시간 후 만료
const MAX_RETENTION_HOURS = 24 * 30;

export const finalPath = (sessionId: string) => `finals/${sessionId}.png`;
export const photoPath = (sessionId: string, orderIndex: number) => `photos/${sessionId}/${orderIndex}.jpg`;
export const photoFolder = (sessionId: string) => `photos/${sessionId}`;

/** 사진 보관 시간 (PHOTO_RETENTION_HOURS, 기본 2시간, 최대 30일) */
export function retentionHours(env: string | undefined = process.env.PHOTO_RETENTION_HOURS): number {
  const n = Number(env);
  if (!env || !Number.isFinite(n) || n <= 0) return DEFAULT_RETENTION_HOURS;
  return Math.min(n, MAX_RETENTION_HOURS);
}

export function expiresAt(from: Date = new Date(), hours = retentionHours()): string {
  return new Date(from.getTime() + hours * 3_600_000).toISOString();
}

/** 남은 보관 시간과 상한 중 짧은 쪽으로 서명 URL 유효시간(초)을 정한다. 이미 만료면 0 */
export function signedTtlSeconds(expires: string | null | undefined, cap: number, now = Date.now()): number {
  if (!expires) return cap;
  const left = Math.floor((new Date(expires).getTime() - now) / 1000);
  return Math.max(0, Math.min(cap, left));
}

export async function createSignedUrl(
  path: string,
  seconds: number,
  downloadName?: string,
): Promise<string | null> {
  if (seconds <= 0) return null;
  const { data, error } = await getSupabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .createSignedUrl(path, seconds, downloadName ? { download: downloadName } : undefined);
  return error ? null : data.signedUrl;
}
