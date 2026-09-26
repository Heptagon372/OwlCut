// 보관기간이 지난 세션 정리 (설계도 4 TTL). 서버 전용.
// 순서: 아직 정리 안 된 만료 세션 조회 → 저장소 파일(사진·최종본) 삭제 → 행 정리.
// 행은 지우지 않는다 — 지우면 관리자 대시보드의 "오늘" 집계(세션·완성·출력)가 보관기간(기본 2시간)만큼만 남는다.
// 대신 방문자가 직접 쓴 글(AI 프롬프트·문구)을 비우고, 대기 중 출력은 실패 처리, 세션은 status='expired'.
// 남는 저장소 경로(finals/<uuid>.png 등)는 이미 지운 파일을 가리킬 뿐 개인정보가 없다.
// 파일 삭제가 실패하면 행을 그대로 둔다 (다음 실행 때 재시도; 이미 지운 파일을 다시 지워도 오류 아님).
import { getStore, type BoothStore } from "@/lib/db";
import { finalPath, photoFolder } from "./photos";

const BATCH = 100;
const MAX_BATCHES = 5; // 한 번 호출에 최대 500세션 (실행 시간 제한 안에서)

export const EXPIRED_STATUS = "expired";

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

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function cleanupExpired(now = new Date(), store: BoothStore = getStore()): Promise<CleanupResult> {
  const result: CleanupResult = { sessions: 0, files: 0, errors: [] };
  const nowIso = now.toISOString();

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    let ids: string[];
    try {
      ids = await store.listExpiredSessionIds(nowIso, BATCH);
    } catch (e) {
      result.errors.push(message(e));
      break;
    }
    if (ids.length === 0) break;

    const photoFiles: Record<string, string[]> = {};
    await Promise.all(
      ids.map(async (id) => {
        photoFiles[id] = await store.listFiles(photoFolder(id), 100).catch(() => []);
      }),
    );

    try {
      result.files += await store.removeFiles(storagePathsFor(ids, photoFiles));
    } catch (e) {
      result.errors.push(`storage: ${message(e)}`);
      break; // 행은 남겨 두고 다음 실행에서 재시도
    }

    // 세션 상태는 마지막에 — 중간에 실패하면 다음 실행에서 이 세션들을 다시 처리한다
    try {
      await store.scrubDesigns(ids);
      await store.failWaitingPrints(ids, EXPIRED_STATUS);
      await store.markSessionsExpired(ids);
    } catch (e) {
      result.errors.push(`db: ${message(e)}`);
      break;
    }
    result.sessions += ids.length;
    if (ids.length < BATCH) break;
  }
  return result;
}
