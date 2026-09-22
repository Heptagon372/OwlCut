"use client";
import { useEffect, useState } from "react";
import { CircleAlert, Sparkles } from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { PromptInput } from "./PromptInput";
import { Button } from "@/components/ui/Button";
import { requestAIDesign } from "@/lib/api";
import { useBoothStore } from "@/lib/store/boothStore";
import type { AIDesignResult, ModelInfo } from "@/types/ai";

type Status =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "applied"; fallback: boolean }
  | { kind: "error"; message: string };

// AI 꾸미기 도구 (설계도 7-4): 모델 선택 + 분위기 입력 + 적용.
// 모델 목록은 편집 화면이 받아 온다 (쓸 수 있는 모델이 없으면 도구 자체를 숨김).
export function AIDesignPanel({
  models,
  defaultModel,
  onApply,
}: {
  models: ModelInfo[];
  defaultModel: string | null;
  onApply: (design: Partial<AIDesignResult>, prompt: string, model: string | null) => void;
}) {
  const { aiModelId, setAiModelId, design } = useBoothStore();
  const [prompt, setPrompt] = useState(design.prompt ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (!aiModelId || !models.some((m) => m.id === aiModelId)) setAiModelId(defaultModel);
  }, [models, defaultModel, aiModelId, setAiModelId]);

  const generating = status.kind === "generating";

  const submit = async () => {
    const text = prompt.trim();
    if (!text || generating) return;
    setStatus({ kind: "generating" });
    const result = await requestAIDesign(text, aiModelId);
    if (result.ok) {
      // AI 응답을 해석하지 못한 기본 디자인이면, 촬영 전에 고른 필터·AR 효과는 지우지 않는다
      const { filter, effect, ...rest } = result.design;
      onApply(result.fallback ? rest : { ...rest, filter, effect }, text, result.model);
      setStatus({ kind: "applied", fallback: result.fallback });
    } else {
      const hint = models.length > 1 ? " 다른 모델을 고르거나 직접 꾸며 주세요." : " 다른 도구로 직접 꾸며 주세요.";
      setStatus({ kind: "error", message: result.message + hint });
    }
  };

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted">원하는 분위기</h3>
        <PromptInput value={prompt} onChange={setPrompt} onSubmit={submit} disabled={generating} />
      </section>

      {models.length > 1 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold text-muted">AI 모델</h3>
          <ModelSelector models={models} value={aiModelId} onChange={setAiModelId} disabled={generating} />
        </section>
      )}

      <Button size="lg" onClick={submit} disabled={generating || !prompt.trim()} className="w-full">
        <Sparkles className="h-4 w-4" aria-hidden />
        {generating ? "AI가 고르는 중…" : "AI로 꾸미기"}
      </Button>

      <div aria-live="polite" className="text-center text-sm">
        {status.kind === "applied" && !status.fallback && <p className="font-medium">적용했어요. 다른 도구로 더 다듬을 수 있어요.</p>}
        {status.kind === "applied" && status.fallback && (
          <p className="text-muted">AI 답을 알아듣지 못해 기본 디자인을 적용했어요. 다른 도구로 다듬어 주세요.</p>
        )}
        {status.kind === "error" && (
          <p className="flex items-start justify-center gap-1.5 text-left">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
