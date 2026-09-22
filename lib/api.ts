"use client";
// 페이지에서 API 라우트를 호출하는 얇은 클라이언트 헬퍼.
// 서버/Supabase 실패 시에도 흐름이 막히지 않도록 폴백을 내장.
import type { DesignState } from "@/types/design";
import type { AIDesignResult, ModelInfo } from "@/types/ai";
import type { PrintStatus, PrintStatusResponse } from "@/types/print";
import { withRetry } from "./retry";

export async function createSession(): Promise<string> {
  try {
    const res = await fetch("/api/session", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (data?.id) return data.id as string;
    }
  } catch {
    // ignore
  }
  return crypto.randomUUID(); // 오프라인/미설정 폴백
}

// 최종 이미지 업로드 결과
//   not_configured: 원격 저장 미설정 → 로컬 저장만 (재시도 무의미)
//   rejected: 요청 자체가 거절(4xx) → 재시도 무의미
//   failed: 네트워크·서버 오류 → 재시도 대상 (설계도 10: 3회, 이후 연결되면 자동 재업로드)
export type UploadOutcome =
  | { ok: true; downloadUrl: string; expiresAt: string | null }
  | { ok: false; reason: "not_configured" | "rejected" | "failed" };

const UPLOAD_TIMEOUT_MS = 45_000; // 최종본 PNG(수 MB)를 느린 행사장 와이파이로 올리는 시간 여유
export const UPLOAD_ATTEMPTS = 3;
const UPLOAD_RETRY_DELAYS_MS = [1000, 3000];

/** 응답 상태·본문 → 결과 분류 (순수 함수) */
export function classifyUpload(status: number, body: unknown): UploadOutcome {
  const data = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (status >= 200 && status < 300) {
    return typeof data.download_url === "string"
      ? { ok: true, downloadUrl: data.download_url, expiresAt: typeof data.expires_at === "string" ? data.expires_at : null }
      : { ok: false, reason: "failed" };
  }
  if (status === 503 && data.error === "SUPABASE_NOT_CONFIGURED") return { ok: false, reason: "not_configured" };
  if (status >= 500 || status === 408 || status === 429) return { ok: false, reason: "failed" };
  return { ok: false, reason: "rejected" };
}

async function uploadFinalOnce(sessionId: string, imageDataUrl: string, design: DesignState): Promise<UploadOutcome> {
  try {
    const res = await fetch("/api/final", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, image: imageDataUrl, design }),
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    return classifyUpload(res.status, await res.json().catch(() => null));
  } catch {
    return { ok: false, reason: "failed" }; // 네트워크 끊김·시간 초과
  }
}

// 최종 이미지 업로드 — 네트워크·서버 오류면 최대 3번 (서버가 같은 세션 재업로드를 안전하게 처리)
export function uploadFinal(
  sessionId: string,
  imageDataUrl: string,
  design: DesignState,
  onAttempt?: (attempt: number) => void,
): Promise<UploadOutcome> {
  return withRetry(() => uploadFinalOnce(sessionId, imageDataUrl, design), {
    attempts: UPLOAD_ATTEMPTS,
    delaysMs: UPLOAD_RETRY_DELAYS_MS,
    shouldRetry: (r) => !r.ok && r.reason === "failed",
    onAttempt,
  });
}

// ---------- 출력 (Phase 7) ----------

export type PrintOutcome =
  | { ok: true; status: PrintStatus }
  | { ok: false; message: string };

export async function requestPrint(sessionId: string): Promise<PrintOutcome> {
  try {
    const res = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, copies: 1 }),
    });
    const data = await res.json();
    if (res.ok) return { ok: true, status: data.status };
    return { ok: false, message: data?.message ?? "출력 요청에 실패했어요." };
  } catch {
    return { ok: false, message: "서버에 연결하지 못했어요." };
  }
}

export async function fetchPrintStatus(sessionId: string): Promise<PrintStatusResponse | null> {
  try {
    const res = await fetch(`/api/print?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// ---------- AI (Phase 5) ----------

export async function fetchModels(): Promise<{ models: ModelInfo[]; defaultModel: string | null }> {
  try {
    const res = await fetch("/api/ai/models", { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch {
    // ignore
  }
  return { models: [], defaultModel: null };
}

export type AIDesignOutcome =
  | { ok: true; design: AIDesignResult; model: string | null; fallback: boolean }
  | { ok: false; error: string; message: string };

export async function requestAIDesign(prompt: string, model: string | null): Promise<AIDesignOutcome> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model }),
    });
    const data = await res.json();
    if (res.ok && data?.design && !data.error) {
      return { ok: true, design: data.design, model: data.model ?? null, fallback: Boolean(data.fallback) };
    }
    return {
      ok: false,
      error: data?.error ?? "unknown",
      message: data?.message ?? "AI 꾸미기에 실패했어요.",
    };
  } catch {
    return { ok: false, error: "network", message: "서버에 연결하지 못했어요." };
  }
}
