"use client";
import { useEffect, useState } from "react";
import { ModelSelector } from "./ModelSelector";
import { PromptInput } from "./PromptInput";
import { Button } from "@/components/ui/Button";
import { fetchModels, requestAIDesign } from "@/lib/api";
import { useBoothStore } from "@/lib/store/boothStore";
import type { AIDesignResult, ModelInfo } from "@/types/ai";

type Status =
  | { kind: "loading-models" }
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "applied"; fallback: boolean }
  | { kind: "error"; message: string };

// 🤖 AI PHOTO DESIGNER — 모델 선택 + 분위기 입력 + 적용 (설계도 7-4 목업)
export function AIDesignPanel({
  onApply,
}: {
  onApply: (design: AIDesignResult, prompt: string) => void;
}) {
  const { aiModelId, setAiModelId, design } = useBoothStore();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [prompt, setPrompt] = useState(design.prompt ?? "");
  const [status, setStatus] = useState<Status>({ kind: "loading-models" });

  useEffect(() => {
    let active = true;
    fetchModels().then(({ models, defaultModel }) => {
      if (!active) return;
      setModels(models);
      if (!aiModelId || !models.some((m) => m.id === aiModelId)) setAiModelId(defaultModel);
      setStatus({ kind: "idle" });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generating = status.kind === "generating";

  const submit = async () => {
    const text = prompt.trim();
    if (!text || generating) return;
    setStatus({ kind: "generating" });
    const result = await requestAIDesign(text, aiModelId);
    if (result.ok) {
      onApply(result.design, text);
      setStatus({ kind: "applied", fallback: result.fallback });
    } else {
      const hint = models.length > 1 ? " 다른 모델을 선택하거나 직접 꾸미기를 이용해 주세요." : " 직접 꾸미기를 이용해 주세요.";
      setStatus({ kind: "error", message: result.message + hint });
    }
  };

  if (status.kind === "loading-models") {
    return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
  }

  if (models.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-3xl">🤖</p>
        <p className="mt-2 font-semibold">AI 꾸미기를 사용할 수 없어요</p>
        <p className="mt-1 text-sm text-muted">
          설정된 AI 모델이 없습니다. <code className="text-xs">.env.local</code>에 API 키를 추가하면
          활성화돼요. 지금은 직접 꾸미기를 이용해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-bold tracking-wide">🤖 AI PHOTO DESIGNER</p>

      <section>
        <h4 className="mb-2 text-xs font-semibold text-muted">사용할 AI 모델</h4>
        <ModelSelector models={models} value={aiModelId} onChange={setAiModelId} disabled={generating} />
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold text-muted">원하는 분위기를 입력하세요</h4>
        <PromptInput value={prompt} onChange={setPrompt} onSubmit={submit} disabled={generating} />
      </section>

      <Button onClick={submit} disabled={generating || !prompt.trim()} className="w-full">
        {generating ? "AI가 디자인을 고르는 중…" : "AI 꾸미기"}
      </Button>

      <div aria-live="polite" className="text-center text-sm">
        {status.kind === "applied" && !status.fallback && (
          <p className="text-accent-2">✨ 적용됐어요! &apos;직접 꾸미기&apos; 탭에서 더 다듬을 수 있어요.</p>
        )}
        {status.kind === "applied" && status.fallback && (
          <p className="text-muted">AI 응답을 해석하지 못해 기본 디자인을 적용했어요. 직접 꾸미기로 다듬어 주세요.</p>
        )}
        {status.kind === "error" && <p className="text-red-400">{status.message}</p>}
      </div>
    </div>
  );
}
