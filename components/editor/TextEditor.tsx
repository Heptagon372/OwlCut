"use client";
import type { TextAnchor, TextLayer } from "@/types/design";

const POSITIONS: { value: TextAnchor; label: string }[] = [
  { value: "top", label: "상단" },
  { value: "center", label: "중앙" },
  { value: "bottom", label: "하단" },
];

export function TextEditor({
  value,
  onChange,
  defaultColor = "#ffffff",
}: {
  value: TextLayer[];
  onChange: (t: TextLayer[]) => void;
  defaultColor?: string;
}) {
  const add = () =>
    onChange([
      ...value,
      { content: "", anchor: "bottom", color: defaultColor, size: 40 },
    ]);
  const update = (i: number, patch: Partial<TextLayer>) =>
    onChange(value.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {value.map((t, i) => (
        <div key={i} className="space-y-2 rounded-2xl bg-white/55 p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={t.content}
              placeholder="문구 입력 (예: S.OWL 2026)"
              maxLength={40}
              onChange={(e) => update(i, { content: e.target.value })}
              className="min-w-0 flex-1 rounded-full bg-white px-4 py-2 text-sm outline-none ring-ink/20 focus:ring-2"
            />
            <input
              type="color"
              value={t.color}
              onChange={(e) => update(i, { color: e.target.value })}
              className="h-9 w-9 cursor-pointer rounded-full border-0 bg-transparent"
              title="글자 색"
            />
            <button
              onClick={() => remove(i)}
              className="rounded-full px-3 py-1 text-sm text-muted hover:bg-white hover:text-status-critical"
            >
              삭제
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {POSITIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => update(i, { anchor: p.value })}
                  className={`rounded-full px-3 py-1 text-sm ${t.anchor === p.value ? "bg-ink text-white" : "bg-white/70 text-muted hover:text-foreground"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-1 flex-col">
              <label className="text-xs text-muted">크기 {t.size}</label>
              <input
                type="range"
                min={20}
                max={90}
                value={t.size}
                onChange={(e) => update(i, { size: Number(e.target.value) })}
                className="accent-[var(--accent)]"
              />
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="w-full rounded-2xl border-2 border-dashed border-muted/40 py-3.5 text-sm font-medium text-muted transition hover:border-ink hover:text-foreground"
      >
        + 텍스트 추가
      </button>
    </div>
  );
}
