// AI 호출 기록 (관리자 대시보드 모델별 사용량). 서버 전용, best-effort — 실패해도 응답에 영향 없음.
import { getStore, isStoreConfigured } from "@/lib/db";

export async function logAIRequest(entry: {
  model: string | null;
  ok: boolean;
  error: string | null;
  latencyMs: number;
}): Promise<void> {
  if (!isStoreConfigured()) return;
  try {
    await getStore().insertAiRequest({
      model: entry.model,
      ok: entry.ok,
      error: entry.error,
      latency_ms: Math.round(entry.latencyMs),
    });
  } catch {
    // 로그 실패는 무시
  }
}
