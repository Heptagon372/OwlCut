// Gemini 어댑터 — generateContent REST + JSON 응답 모드.
// 스키마 강제는 하지 않고(system prompt에 형식 명시), generateDesign의 검증/보정에 맡긴다.
import { AIProviderError, type AIProvider } from "./types";

function statusToError(status: number): AIProviderError {
  if (status === 401 || status === 403) return new AIProviderError("auth", "Gemini API 키가 올바르지 않아요.");
  if (status === 429) return new AIProviderError("rate_limited", "Gemini 사용량 한도에 도달했어요. 다른 모델로 시도해 주세요.");
  return new AIProviderError("api", `Gemini API 오류 (${status})`);
}

export const geminiProvider: AIProvider = {
  id: "gemini",

  isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY);
  },

  async generate({ model, system, prompt, image }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [
            {
              role: "user",
              parts: image
                ? [{ inlineData: { mimeType: image.mediaType, data: image.data } }, { text: prompt }]
                : [{ text: prompt }],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new AIProviderError("network", "Gemini 서버에 연결하지 못했어요.");
    }
    if (!res.ok) throw statusToError(res.status);

    const data = await res.json();
    const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
    if (parts.length === 0 && data?.promptFeedback?.blockReason) {
      throw new AIProviderError("refused", "이 요청으로는 디자인을 만들 수 없어요. 다른 표현으로 시도해 주세요.");
    }
    return parts.map((p) => p.text ?? "").join("");
  },
};
