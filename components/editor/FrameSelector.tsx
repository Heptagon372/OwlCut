"use client";
import { FRAMES } from "@/lib/data/registry";
import type { FrameConfig } from "@/types/design";

function swatch(frame: FrameConfig): string {
  const bg = frame.background;
  if (bg.type === "gradient") {
    return `linear-gradient(${bg.angle ?? 0}deg, ${bg.from}, ${bg.to})`;
  }
  return bg.color;
}

export function FrameSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {FRAMES.map((f) => {
        const active = value === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`rounded-2xl border-2 p-1 transition ${active ? "border-ink bg-white" : "border-transparent hover:bg-white/60"}`}
          >
            <span
              className="block h-12 rounded-xl border border-black/5"
              style={{ background: swatch(f) }}
            />
            <span className="mt-1 block truncate text-xs text-muted">{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}
