"use client";
// 페이지에서 API 라우트를 호출하는 얇은 클라이언트 헬퍼.
// 서버/Supabase 실패 시에도 흐름이 막히지 않도록 폴백을 내장.
import type { DesignState } from "@/types/design";
import type { AIDesignResult, ModelInfo } from "@/types/ai";
import type { PrintStatus, PrintStatusResponse } from "@/types/print";
import { withRetry } from "./retry";
import { newUuid } from "./ids";

export interface BoothSession {
  id: string;
  token: string; // 업로드 토큰 — 이 세션에 사진을 올리고 출력할 수 있는 비밀값 (주소에 넣지 말 것)
}

// AbortSignal.timeout 은 Safari 16+ 이므로 구형 아이폰에서도 되게 직접 만든다
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) return AbortSignal.timeout(ms);
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

/** 오프라인 폴백: 부스가 직접 id·토큰을 만든다 (나중에 업로드할 때 서버가 이 토큰으로 세션을 등록) */
export function localSession(): BoothSession {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { id: newUuid(), token };
}

export async function createSession(): Promise<BoothSession> {
  try {
    // 서버·DB 가 느리게 멈춰도 '촬영 시작' 버튼이 몇 분씩 멈춰 있지 않게 3초 뒤엔 로컬 세션으로 진행
    const res = await fetch("/api/session", { method: "POST", signal: timeoutSignal(3000) });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.id === "string" && typeof data?.token === "string") return { id: data.id, token: data.token };
    }
  } catch {
    // ignore
  }
  return localSession(); // 오프라인/미설정 폴백
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

async function uploadFinalOnce(session: BoothSession, imageDataUrl: string, design: DesignState): Promise<UploadOutcome> {
  try {
    const res = await fetch("/api/final", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: session.id, token: session.token, image: imageDataUrl, design }),
      signal: timeoutSignal(UPLOAD_TIMEOUT_MS),
    });
    return classifyUpload(res.status, await res.json().catch(() => null));
  } catch {
    return { ok: false, reason: "failed" }; // 네트워크 끊김·시간 초과
  }
}

// 최종 이미지 업로드 — 네트워크·서버 오류면 최대 3번 (서버가 같은 세션 재업로드를 안전하게 처리)
export function uploadFinal(
  session: BoothSession,
  imageDataUrl: string,
  design: DesignState,
  onAttempt?: (attempt: number) => void,
): Promise<UploadOutcome> {
  return withRetry(() => uploadFinalOnce(session, imageDataUrl, design), {
    attempts: UPLOAD_ATTEMPTS,
    delaysMs: UPLOAD_RETRY_DELAYS_MS,
    shouldRetry: (r) => !r.ok && r.reason === "failed",
    onAttempt,
  });
}

// ---------- 출력 (Phase 7) ----------

// 실패는 코드로 (화면 문구는 lib/i18n/errors.ts 가 언어에 맞게 고른다)
export type PrintOutcome =
  | { ok: true; status: PrintStatus }
  | { ok: false; error: string };

export async function requestPrint(session: BoothSession, paper?: string): Promise<PrintOutcome> {
  try {
    const res = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: session.id, token: session.token, copies: 1, paper }),
    });
    const data = await res.json();
    if (res.ok) return { ok: true, status: data.status };
    return { ok: false, error: typeof data?.error === "string" ? data.error : "enqueue_failed" };
  } catch {
    return { ok: false, error: "network" };
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
  | { ok: true; design: AIDesignResult; designs: AIDesignResult[]; model: string | null; fallback: boolean }
  | { ok: false; error: string };

// photo: 방금 찍은 사진을 작게 줄인 dataURL (선택) — 모델이 사진을 보고 고르게 한다
// count: 추천 개수 (여러 개면 방문자가 고른다)
export async function requestAIDesign(
  prompt: string,
  model: string | null,
  opts: { photo?: string | null; count?: number } = {},
): Promise<AIDesignOutcome> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model, count: opts.count ?? 1, photo: opts.photo ?? undefined }),
    });
    const data = await res.json();
    if (res.ok && data?.design && !data.error) {
      const designs = Array.isArray(data.designs) && data.designs.length ? data.designs : [data.design];
      return { ok: true, design: data.design, designs, model: data.model ?? null, fallback: Boolean(data.fallback) };
    }
    return { ok: false, error: typeof data?.error === "string" ? data.error : "ai_failed" };
  } catch {
    return { ok: false, error: "network" };
  }
}
