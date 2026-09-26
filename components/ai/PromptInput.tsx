"use client";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";

const EXAMPLE_KEYS: MessageKey[] = ["ai.example1", "ai.example2", "ai.example3", "ai.example4"];
const MAX_LENGTH = 200;

export function PromptInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const t = useT();
  const examples = EXAMPLE_KEYS.map((k) => t(k));
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSubmit();
          }
        }}
        disabled={disabled}
        maxLength={MAX_LENGTH}
        rows={2}
        placeholder={t("ai.placeholder")}
        className="w-full resize-none rounded-2xl bg-white px-4 py-3 text-sm outline-none ring-ink/20 focus:ring-2 disabled:opacity-50"
      />
      <div className="flex flex-wrap gap-1.5">
        {examples.map((ex) => (
          <button
            key={ex}
            disabled={disabled}
            onClick={() => onChange(ex)}
            className="rounded-full bg-white/60 px-3 py-1.5 text-xs text-muted hover:bg-white hover:text-foreground disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
