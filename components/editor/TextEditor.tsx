"use client";
import { Plus, X } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";
import type { FrameFont, TextAnchor, TextLayer } from "@/types/design";

const POSITIONS: { value: TextAnchor; key: MessageKey }[] = [
  { value: "top", key: "text.top" },
  { value: "center", key: "text.center" },
  { value: "bottom", key: "text.bottom" },
];

// 글꼴: 영문 폰트 뒤에 한글 폰트가 이어지므로(lib/fonts.ts) 한글도 그대로 그려진다
const FONTS: { value: FrameFont; key: MessageKey; css: string }[] = [
  { value: "sans", key: "font.sans", css: "var(--font-pretendard)" },
  { value: "display", key: "font.display", css: "var(--font-manrope)" },
  { value: "hand", key: "font.hand", css: "var(--font-hangul-hand)" },
  { value: "serif", key: "font.serif", css: "var(--font-serif)" },
  { value: "mono", key: "font.mono", css: "var(--font-mono)" },
];

// 캔버스 px (레이아웃 1200px 폭 기준) — 작은 설명 글씨부터 꽉 찬 제목까지
export const TEXT_SIZE_MIN = 20;
export const TEXT_SIZE_MAX = 140;

export function TextEditor({
  value,
  onChange,
  defaultColor = "#ffffff",
}: {
  value: TextLayer[];
  onChange: (t: TextLayer[]) => void;
  defaultColor?: string;
}) {
  const t = useT();
  const add = () => onChange([...value, { content: "", anchor: "bottom", color: defaultColor, size: 48, font: "sans" }]);
  const update = (i: number, patch: Partial<TextLayer>) => onChange(value.map((layer, idx) => (idx === i ? { ...layer, ...patch } : layer)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {value.map((layer, i) => (
        <div key={i} className="space-y-3 rounded-2xl bg-white/55 p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={layer.content}
              placeholder={t("text.placeholder")}
              maxLength={40}
              onChange={(e) => update(i, { content: e.target.value })}
              className="min-w-0 flex-1 rounded-full bg-white px-4 py-2 text-sm outline-none ring-ink/20 focus:ring-2"
            />
            <input
              type="color"
              value={layer.color}
              onChange={(e) => update(i, { color: e.target.value })}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-full border-0 bg-transparent"
              aria-label={t("text.color")}
              title={t("text.color")}
            />
            <button
              onClick={() => remove(i)}
              aria-label={t("text.remove")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-white hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* 글꼴 — 보기 그대로 인화되므로 버튼도 그 글꼴로 */}
          <div role="radiogroup" aria-label={t("text.font")} className="flex flex-wrap gap-1">
            {FONTS.map((f) => {
              const active = (layer.font ?? "sans") === f.value;
              return (
                <button
                  key={f.value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => update(i, { font: f.value })}
                  style={{ fontFamily: f.css }}
                  className={`h-8 rounded-full px-3 text-xs font-semibold ${active ? "bg-ink text-white" : "bg-white/70 text-muted hover:text-foreground"}`}
                >
                  {t(f.key)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex shrink-0 gap-1">
              {POSITIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => update(i, { anchor: p.value })}
                  aria-pressed={layer.anchor === p.value}
                  className={`h-8 rounded-full px-3 text-xs font-semibold ${layer.anchor === p.value ? "bg-ink text-white" : "bg-white/70 text-muted hover:text-foreground"}`}
                >
                  {t(p.key)}
                </button>
              ))}
            </div>
            <label className="flex min-w-0 flex-1 flex-col">
              <span className="flex justify-between text-xs text-muted">
                {t("text.size")}
                <span className="num">{layer.size}</span>
              </span>
              <input
                type="range"
                min={TEXT_SIZE_MIN}
                max={TEXT_SIZE_MAX}
                value={layer.size}
                onChange={(e) => update(i, { size: Number(e.target.value) })}
                className="w-full accent-[var(--ink)]"
              />
            </label>
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-muted/40 py-3.5 text-sm font-medium text-muted transition hover:border-ink hover:text-foreground"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("text.add")}
      </button>
    </div>
  );
}
