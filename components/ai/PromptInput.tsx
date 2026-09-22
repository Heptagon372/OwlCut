"use client";

const EXAMPLES = ["보라색 사이버펑크 느낌", "따뜻한 가을 감성", "흑백 영화 포스터", "생일 파티 분위기"];
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
        placeholder="예: 보라색 사이버펑크 느낌으로"
        className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
      />
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            disabled={disabled}
            onClick={() => onChange(ex)}
            className="rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:border-accent hover:text-foreground disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
