// 보관기간이 지난 세션 정리 (설계도 4 TTL). 서버 전용.
// 순서: 만료 세션 조회 → 저장소 파일 삭제 → 세션 행 삭제(cascade로 photos/designs/prints 함께).
// 파일 삭제가 실패하면 행을 남겨 둔다 (다음 실행 때 재시도; 행부터 지우면 파일이 고아가 됨).
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/client";
import { finalPath, photoFolder } from "./photos";

const BATCH = 100;
const MAX_BATCHES = 5; // 한 번 호출에 최대 500세션 (실행 시간 제한 안에서)

/** 만료 세션 id 들 + 각 세션의 원본 사진 파일명 → 지울 저장소 경로 (순수 함수) */
export function storagePathsFor(sessionIds: string[], photoFiles: Record<string, string[]>): string[] {
  const paths: string[] = [];
  for (const id of sessionIds) {
    paths.push(finalPath(id));
    for (const name of photoFiles[id] ?? []) paths.push(`${photoFolder(id)}/${name}`);
  }
  return paths;
}

export interface CleanupResult {
  sessions: number;
  files: number;
  errors: string[];
}

export async function cleanupExpired(now = new Date()): Promise<CleanupResult> {
  const db = getSupabaseAdmin();
  const bucket = db.storage.from(STORAGE_BUCKET);
  const result: CleanupResult = { sessions: 0, files: 0, errors: [] };

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const { data: expired, error } = await db
      .from("sessions")
      .select("id")
      .lt("expires_at", now.toISOString())
      .limit(BATCH);
    if (error) {
      result.errors.push(error.message);
      break;
    }
    const ids = (expired ?? []).map((r) => r.id as string);
    if (ids.length === 0) break;

    const photoFiles: Record<string, string[]> = {};
    await Promise.all(
      ids.map(async (id) => {
        const { data } = await bucket.list(photoFolder(id), { limit: 100 });
        photoFiles[id] = (data ?? []).map((f) => f.name);
      }),
    );

    const { data: removed, error: rmErr } = await bucket.remove(storagePathsFor(ids, photoFiles));
    if (rmErr) {
      result.errors.push(`storage: ${rmErr.message}`);
      break; // 행은 남겨 두고 다음 실행에서 재시도
    }
    result.files += removed?.length ?? 0;

    const { error: delErr } = await db.from("sessions").delete().in("id", ids);
    if (delErr) {
      result.errors.push(`db: ${delErr.message}`);
      break;
    }
    result.sessions += ids.length;
    if (ids.length < BATCH) break;
  }
  return result;
}
