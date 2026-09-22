"use client";
import { STICKERS } from "@/lib/data/registry";
import { ANCHORS, type Anchor, type StickerInstance } from "@/types/design";

const ANCHOR_LABEL: Record<Anchor, string> = {
  "top-left": "↖",
  top: "↑",
  "top-right": "↗",
  left: "←",
  center: "•",
  right: "→",
  "bottom-left": "↙",
  bottom: "↓",
  "bottom-right": "↘",
};

function AnchorGrid({
  value,
  onChange,
}: {
  value: Anchor;
  onChange: (a: Anchor) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {ANCHORS.map((a) => (
        <button
          key={a}
          onClick={() => onChange(a)}
          className={`h-7 w-7 rounded text-sm ${value === a ? "bg-accent text-white" : "bg-background text-muted hover:text-foreground"}`}
        >
          {ANCHOR_LABEL[a]}
        </button>
      ))}
    </div>
  );
}

export function StickerPanel({
  value,
  onChange,
}: {
  value: StickerInstance[];
  onChange: (s: StickerInstance[]) => void;
}) {
  const add = (id: string) =>
    onChange([...value, { id, anchor: "center", size: 120 }]);
  const update = (i: number, patch: Partial<StickerInstance>) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {/* 팔레트 */}
      <div className="grid grid-cols-5 gap-2">
        {STICKERS.map((s) => (
          <button
            key={s.id}
            onClick={() => add(s.id)}
            title={`${s.label} 추가`}
            className="rounded-xl border border-border bg-background py-2 text-2xl hover:border-accent"
          >
            {s.glyph}
          </button>
        ))}
      </div>

      {/* 배치된 스티커 */}
      {value.length === 0 ? (
        <p className="text-sm text-muted">스티커를 눌러 추가하세요.</p>
      ) : (
        <ul className="space-y-2">
          {value.map((s, i) => {
            const def = STICKERS.find((d) => d.id === s.id);
            return (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-2"
              >
                <span className="text-2xl">{def?.glyph}</span>
                <AnchorGrid value={s.anchor} onChange={(a) => update(i, { anchor: a })} />
                <div className="flex flex-1 flex-col">
                  <label className="text-xs text-muted">크기 {s.size}</label>
                  <input
                    type="range"
                    min={48}
                    max={280}
                    value={s.size}
                    onChange={(e) => update(i, { size: Number(e.target.value) })}
                    className="accent-[var(--accent)]"
                  />
                </div>
                <button
                  onClick={() => remove(i)}
                  className="rounded-lg px-2 py-1 text-sm text-muted hover:text-red-400"
                >
                  삭제
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
