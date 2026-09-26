// 출력 큐 (설계도 7-6). 서버 전용 — 저장소의 prints 표를 큐로 사용.
// 웹은 등록만 하고 즉시 응답, 실제 출력은 로컬 프린트 서버가 claim → 완료/실패 보고.
import { getStore } from "@/lib/db";
import { createSignedUrl } from "@/lib/storage/photos";
import type { PrintJob, PrintStatus, PrintStatusResponse } from "@/types/print";

export const MAX_COPIES = 2;
export const MAX_JOBS_PER_SESSION = 3; // 공개 엔드포인트라 세션당 출력 횟수 제한 (용지 낭비 방지)
const STUCK_AFTER_MS = 5 * 60_000;     // printing 상태로 5분 넘게 멈춘 작업은 실패 처리
const PRINT_URL_SECONDS = 10 * 60;     // 프린트 서버에 주는 이미지 서명 URL 유효시간

export class PrintQueueError extends Error {
  constructor(
    public code: "no_final_image" | "limit_reached" | "not_found",
    message: string,
  ) {
    super(message);
  }
}

export async function enqueuePrint(sessionId: string, copies: number): Promise<PrintStatusResponse> {
  const store = getStore();

  const design = await store.latestFinalDesign(sessionId);
  if (!design?.final_image_path) {
    throw new PrintQueueError("no_final_image", "출력할 완성 이미지가 없어요.");
  }
  if ((await store.countPrints(sessionId)) >= MAX_JOBS_PER_SESSION) {
    throw new PrintQueueError("limit_reached", "이 사진은 더 이상 출력할 수 없어요.");
  }
  return store.insertPrint({
    session_id: sessionId,
    image_path: design.final_image_path, // 경로만 저장, claim 시점에 서명 URL 발급
    copies: Math.min(Math.max(1, Math.floor(copies) || 1), MAX_COPIES),
  });
}

export async function getLatestPrintStatus(sessionId: string): Promise<PrintStatusResponse | null> {
  return getStore().latestPrint(sessionId);
}

// 프린트 서버 heartbeat → 관리자 대시보드의 장비 상태
export async function recordHeartbeat(printer: string, info?: Record<string, unknown>) {
  await getStore().upsertDevice({ id: printer, kind: "printer", last_seen_at: new Date().toISOString(), info: info ?? null });
}

// 가장 오래된 대기 작업 1건을 가져간다. 조건부(대기 중일 때만) 처리로 중복 claim 방지.
export async function claimNextJob(printer: string): Promise<PrintJob | null> {
  const store = getStore();

  // 프린트 서버가 죽어서 멈춘 작업 정리 (재출력은 하지 않고 실패로 표시)
  await store.failStuckPrints(new Date(Date.now() - STUCK_AFTER_MS).toISOString());

  for (const id of await store.listWaitingPrintIds(5)) {
    const claimed = await store.claimPrint(id, printer);
    if (!claimed) continue; // 다른 프린트 서버가 먼저 가져감

    // 비공개 저장소 → 프린트 서버에는 짧게 만료되는 서명 URL만 준다
    const imageUrl = claimed.image_path ? await createSignedUrl(claimed.image_path, PRINT_URL_SECONDS) : null;
    if (!imageUrl) {
      // 보관기간이 지나 이미지가 지워진 경우 등: 출력할 수 없으니 실패로 표시하고 다음 작업으로
      await store.failPrint(claimed.id, "image_missing");
      continue;
    }
    return { id: claimed.id, session_id: claimed.session_id, image_url: imageUrl, copies: claimed.copies };
  }
  return null;
}

export async function reportJobResult(
  id: string,
  printer: string,
  status: Extract<PrintStatus, "completed" | "failed">,
  error?: string,
): Promise<void> {
  const store = getStore();
  const done = await store.finishPrint(id, printer, status, error);
  if (!done) throw new PrintQueueError("not_found", "보고할 작업을 찾을 수 없어요.");
  if (status === "completed") await store.updateSession(done.session_id, { status: "printed" });
}
