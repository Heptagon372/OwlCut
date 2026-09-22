"use client";
// 페이지에서 API 라우트를 호출하는 얇은 클라이언트 헬퍼.
// 서버/Supabase 실패 시에도 흐름이 막히지 않도록 폴백을 내장.
import type { DesignState } from "@/types/design";
import type { AIDesignResult, ModelInfo } from "@/types/ai";
import type { PrintStatus, PrintStatusResponse } from "@/types/print";

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

export interface FinalResult {
  downloadUrl: string;
  expiresAt: string | null; // 사진 보관 만료 시각
}

// 최종 이미지 업로드. 성공 시 원격 URL, 실패/미설정 시 null(→ 로컬 다운로드만).
export async function uploadFinal(
  sessionId: string,
  imageDataUrl: string,
  design: DesignState,
): Promise<FinalResult | null> {
  try {
    const res = await fetch("/api/final", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, image: imageDataUrl, design }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.download_url) return null;
    return { downloadUrl: data.download_url, expiresAt: data.expires_at ?? null };
  } catch {
    return null;
  }
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
