// 출력 큐 (설계도 7-6). 서버 전용 — Supabase prints 테이블을 큐로 사용.
// 웹은 등록만 하고 즉시 응답, 실제 출력은 로컬 프린트 서버가 claim → 완료/실패 보고.
import { getSupabaseAdmin } from "@/lib/supabase/client";
import type { PrintJob, PrintStatus, PrintStatusResponse } from "@/types/print";

export const MAX_COPIES = 2;
export const MAX_JOBS_PER_SESSION = 3; // 공개 엔드포인트라 세션당 출력 횟수 제한 (용지 낭비 방지)
const STUCK_AFTER_MS = 5 * 60_000;     // printing 상태로 5분 넘게 멈춘 작업은 실패 처리

export class PrintQueueError extends Error {
  constructor(
    public code: "no_final_image" | "limit_reached" | "not_found",
    message: string,
  ) {
    super(message);
  }
}

const now = () => new Date().toISOString();

export async function enqueuePrint(sessionId: string, copies: number): Promise<PrintStatusResponse> {
  const supabase = getSupabaseAdmin();

  const { data: design } = await supabase
    .from("designs")
    .select("final_image_url")
    .eq("session_id", sessionId)
    .not("final_image_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!design?.final_image_url) {
    throw new PrintQueueError("no_final_image", "출력할 완성 이미지가 없어요.");
  }

  const { count } = await supabase
    .from("prints")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if ((count ?? 0) >= MAX_JOBS_PER_SESSION) {
    throw new PrintQueueError("limit_reached", "이 사진은 더 이상 출력할 수 없어요.");
  }

  const { data, error } = await supabase
    .from("prints")
    .insert({
      session_id: sessionId,
      image_url: design.final_image_url,
      copies: Math.min(Math.max(1, Math.floor(copies) || 1), MAX_COPIES),
      status: "waiting",
    })
    .select("id, status")
    .single();
  if (error) throw error;
  return { id: data.id, status: data.status as PrintStatus };
}

export async function getLatestPrintStatus(sessionId: string): Promise<PrintStatusResponse | null> {
  const { data } = await getSupabaseAdmin()
    .from("prints")
    .select("id, status, error")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id, status: data.status as PrintStatus, error: data.error } : null;
}

// 프린트 서버 heartbeat → 관리자 대시보드의 장비 상태
export async function recordHeartbeat(printer: string, info?: Record<string, unknown>) {
  await getSupabaseAdmin()
    .from("devices")
    .upsert({ id: printer, kind: "printer", last_seen_at: now(), info: info ?? null }, { onConflict: "id" });
}

// 가장 오래된 대기 작업 1건을 가져간다. 조건부 update(status='waiting')로 중복 claim 방지.
export async function claimNextJob(printer: string): Promise<PrintJob | null> {
  const supabase = getSupabaseAdmin();

  // 프린트 서버가 죽어서 멈춘 작업 정리 (재출력은 하지 않고 실패로 표시)
  await supabase
    .from("prints")
    .update({ status: "failed", error: "timeout", updated_at: now() })
    .eq("status", "printing")
    .lt("updated_at", new Date(Date.now() - STUCK_AFTER_MS).toISOString());

  const { data: candidates } = await supabase
    .from("prints")
    .select("id")
    .eq("status", "waiting")
    .order("created_at", { ascending: true })
    .limit(5);

  for (const { id } of candidates ?? []) {
    const { data: claimed } = await supabase
      .from("prints")
      .update({ status: "printing", printer, updated_at: now() })
      .eq("id", id)
      .eq("status", "waiting")
      .select("id, session_id, image_url, copies")
      .maybeSingle();
    if (claimed?.image_url) return claimed as PrintJob;
  }
  return null;
}

export async function reportJobResult(
  id: string,
  printer: string,
  status: Extract<PrintStatus, "completed" | "failed">,
  error?: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("prints")
    .update({ status, error: status === "failed" ? (error ?? "unknown").slice(0, 500) : null, updated_at: now() })
    .eq("id", id)
    .eq("printer", printer) // 자기가 가져간 작업만 보고 가능
    .eq("status", "printing")
    .select("id, session_id")
    .maybeSingle();
  if (!data) throw new PrintQueueError("not_found", "보고할 작업을 찾을 수 없어요.");
  if (status === "completed") {
    await supabase.from("sessions").update({ status: "printed" }).eq("id", data.session_id);
  }
}
