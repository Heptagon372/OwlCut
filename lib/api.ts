"use client";
// 페이지에서 API 라우트를 호출하는 얇은 클라이언트 헬퍼.
// 서버/Supabase 실패 시에도 흐름이 막히지 않도록 폴백을 내장.
import type { DesignState } from "@/types/design";

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
  url: string;
  downloadUrl: string;
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
    if (!data?.url) return null;
    return { url: data.url, downloadUrl: data.download_url };
  } catch {
    return null;
  }
}
