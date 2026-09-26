// OpenAI 어댑터 — Chat Completions REST + json_schema(strict) 응답 포맷.
import { AIProviderError, type AIProvider } from "./types";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

function statusToError(status: number): AIProviderError {
  if (status === 401 || status === 403) return new AIProviderError("auth", "OpenAI API 키가 올바르지 않아요.");
  if (status === 429) return new AIProviderError("rate_limited", "OpenAI 사용량 한도에 도달했어요. 다른 모델로 시도해 주세요.");
  return new AIProviderError("api", `OpenAI API 오류 (${status})`);
}

export const openaiProvider: AIProvider = {
  id: "openai",

  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  },

  async generate({ model, system, prompt, schema, image }) {
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: image
                ? [
                    { type: "image_url", image_url: { url: `data:${image.mediaType};base64,${image.data}`, detail: "low" } },
                    { type: "text", text: prompt },
                  ]
                : prompt,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "photo_design", strict: true, schema },
          },
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new AIProviderError("network", "OpenAI 서버에 연결하지 못했어요.");
    }
    if (!res.ok) throw statusToError(res.status);

    const data = await res.json();
    const message = data?.choices?.[0]?.message;
    if (message?.refusal) {
      throw new AIProviderError("refused", "이 요청으로는 디자인을 만들 수 없어요. 다른 표현으로 시도해 주세요.");
    }
    return typeof message?.content === "string" ? message.content : "";
  },
};
