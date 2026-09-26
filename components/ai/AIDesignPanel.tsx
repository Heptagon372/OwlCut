"use client";
// AI 꾸미기 도구 (설계도 7-4): 분위기 입력 → 추천 3안 → 하나 고르면 적용.
// - 사진 한 장을 작게 줄여 함께 보내면 모델이 실제 사진(인원·옷·배경)을 보고 고른다.
// - 추천은 완성 미리보기와 같은 합성 엔진으로 작게 그려 보여 준다 (보이는 그대로 적용됨).
// 모델 목록은 편집 화면이 받아 온다 (쓸 수 있는 모델이 없으면 도구 자체를 숨김).
import { useEffect, useState } from "react";
import { Check, CircleAlert, Sparkles } from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { PromptInput } from "./PromptInput";
import { Button } from "@/components/ui/Button";
import { requestAIDesign } from "@/lib/api";
import { useBoothStore } from "@/lib/store/boothStore";
import { useT } from "@/lib/i18n/context";
import { errorKey } from "@/lib/i18n/errors";
import { buildComposeInput } from "@/lib/image/buildComposeInput";
import { renderToCanvas } from "@/lib/image/compose";
import { smallPhoto } from "@/lib/ai/photoHint";
import type { AIDesignResult, ModelInfo } from "@/types/ai";

const VARIANTS = 3;
const THUMB_H = 150; // 추천 미리보기 높이(px)

type Status =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "picked"; fallback: boolean }
  | { kind: "error"; message: string };

export function AIDesignPanel({
  models,
  defaultModel,
  onApply,
}: {
  models: ModelInfo[];
  defaultModel: string | null;
  onApply: (design: Partial<AIDesignResult>, prompt: string, model: string | null) => void;
}) {
  const t = useT();
  const { aiModelId, setAiModelId, design, photos } = useBoothStore();
  const [prompt, setPrompt] = useState(design.prompt ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [options, setOptions] = useState<{ design: AIDesignResult; url: string | null }[]>([]);
  const [chosen, setChosen] = useState(0);

  useEffect(() => {
    if (!aiModelId || !models.some((m) => m.id === aiModelId)) setAiModelId(defaultModel);
  }, [models, defaultModel, aiModelId, setAiModelId]);

  const generating = status.kind === "generating";

  // 추천 하나를 지금 사진으로 작게 그려 본다 (완성 화면과 같은 엔진)
  const renderOption = async (d: AIDesignResult): Promise<string | null> => {
    if (photos.length === 0) return null;
    try {
      const input = buildComposeInput(photos, { ...design, ...d });
      const canvas = document.createElement("canvas");
      const scale = THUMB_H / input.layout.canvas.height;
      await renderToCanvas(input, canvas, { scale });
      return canvas.toDataURL("image/jpeg", 0.8);
    } catch {
      return null; // 그림을 못 그려도 고르기는 가능
    }
  };

  const apply = (d: AIDesignResult, fallback: boolean, model: string | null, text: string) => {
    // AI 응답을 해석하지 못한 기본 디자인이면, 촬영 전에 고른 필터·AR 효과는 지우지 않는다
    const { filter, effect, ...rest } = d;
    onApply(fallback ? rest : { ...rest, filter, effect }, text, model);
  };

  const submit = async () => {
    const text = prompt.trim();
    if (!text || generating) return;
    setStatus({ kind: "generating" });
    setOptions([]);
    // 첫 사진을 작게 줄여 함께 보낸다 (없으면 글만)
    const photo = await smallPhoto(photos[0]?.dataUrl);
    const result = await requestAIDesign(text, aiModelId, { photo, count: VARIANTS });
    if (!result.ok) {
      const hint = models.length > 1 ? t("ai.hintOther") : t("ai.hintManual");
      setStatus({ kind: "error", message: t(errorKey(result.error)) + hint });
      return;
    }
    // 첫 번째는 바로 적용해 두고(기다리지 않게), 나머지는 골라서 바꿀 수 있게 그려 둔다
    apply(result.designs[0], result.fallback, result.model, text);
    setChosen(0);
    setStatus({ kind: "picked", fallback: result.fallback });
    // 추천 그림은 하나씩 그려 붙인다 (다 그릴 때까지 기다리지 않게)
    const drawn: { design: AIDesignResult; url: string | null }[] = [];
    for (const d of result.designs) {
      drawn.push({ design: d, url: await renderOption(d) });
      setOptions([...drawn]);
    }
  };

  const choose = (i: number) => {
    const option = options[i];
    if (!option) return;
    setChosen(i);
    apply(option.design, false, aiModelId, prompt.trim());
  };

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted">{t("ai.mood")}</h3>
        <PromptInput value={prompt} onChange={setPrompt} onSubmit={submit} disabled={generating} />
      </section>

      {models.length > 1 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold text-muted">{t("ai.model")}</h3>
          <ModelSelector models={models} value={aiModelId} onChange={setAiModelId} disabled={generating} />
        </section>
      )}

      <Button size="lg" onClick={submit} disabled={generating || !prompt.trim()} className="w-full">
        <Sparkles className="h-4 w-4" aria-hidden />
        {generating ? t("ai.generating") : t("ai.go")}
      </Button>

      {/* 추천 3안 — 누르면 바로 적용 */}
      {options.length > 1 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold text-muted">{t("ai.pick")}</h3>
          <div role="radiogroup" aria-label={t("ai.pick")} className="grid grid-cols-3 gap-2">
            {options.map((o, i) => (
              <button
                key={i}
                role="radio"
                aria-checked={i === chosen}
                onClick={() => choose(i)}
                className={`relative flex flex-col items-center gap-1 rounded-2xl p-2 transition ${
                  i === chosen ? "bg-ink text-white" : "bg-white/60 hover:bg-white"
                }`}
              >
                {o.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.url} alt="" className="h-[150px] w-auto rounded-md shadow-sm" />
                ) : (
                  <span className="grid h-[150px] w-full place-items-center rounded-md bg-black/5 text-xs text-muted">
                    {String.fromCharCode(65 + i)}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[11px] font-semibold">
                  {String.fromCharCode(65 + i)}
                  {i === chosen && <Check className="h-3 w-3" aria-hidden />}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div aria-live="polite" className="text-center text-sm">
        {status.kind === "picked" && !status.fallback && <p className="font-medium">{t("ai.applied")}</p>}
        {status.kind === "picked" && status.fallback && <p className="text-muted">{t("ai.fallback")}</p>}
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
