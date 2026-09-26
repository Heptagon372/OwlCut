"use client";
import { useT } from "@/lib/i18n/context";
import type { ModelInfo } from "@/types/ai";

// 모델 선택 창 (설계도 7-4). 서버가 키가 있는 모델만 내려주므로 여기 뜬 건 전부 선택 가능.
export function ModelSelector({
  models,
  value,
  onChange,
  disabled,
}: {
  models: ModelInfo[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t("ai.modelPick")} className="space-y-1.5">
      {models.map((m) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-2.5 text-left text-sm transition disabled:opacity-50 ${active ? "border-ink bg-white text-foreground" : "border-transparent bg-white/50 text-muted hover:text-foreground"}`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? "border-accent" : "border-muted"}`}
            >
              {active && <span className="h-2 w-2 rounded-full bg-accent" />}
            </span>
            <span className="flex-1">{m.label}</span>
            {m.default && <span className="text-xs text-muted">({t("common.default")})</span>}
          </button>
        );
      })}
    </div>
  );
}
