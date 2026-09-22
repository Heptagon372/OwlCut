"use client";
// 레이아웃 선택 — 썸네일은 data/layouts 의 슬롯 좌표로 직접 그린다 (레이아웃 추가 시 자동 반영).
import { LAYOUTS } from "@/lib/data/registry";
import { outputSize } from "@/lib/image/layoutGeometry";
import type { LayoutConfig } from "@/types/design";

function LayoutThumb({ layout }: { layout: LayoutConfig }) {
  const { width, height } = outputSize(layout);
  const tw = layout.canvas.width;
  const th = layout.canvas.height;
  const g = layout.tile?.gutter ?? 0;
  const tiles: { x: number; y: number }[] = [];
  for (let r = 0; r < (layout.tile?.rows ?? 1); r++) {
    for (let c = 0; c < (layout.tile?.columns ?? 1); c++) tiles.push({ x: c * (tw + g), y: r * (th + g) });
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" aria-hidden>
      <rect width={width} height={height} rx={Math.min(width, height) * 0.03} fill="currentColor" opacity={0.14} />
      {tiles.map((t, ti) =>
        layout.slots.map((s, i) => (
          <g key={`${ti}-${i}`}>
            <rect
              x={t.x + s.x}
              y={t.y + s.y}
              width={s.w}
              height={s.h}
              rx={Math.min(s.w, s.h) * 0.04}
              fill="currentColor"
              opacity={0.55}
            />
            {ti === 0 && (
              <text
                x={t.x + s.x + s.w / 2}
                y={t.y + s.y + s.h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.min(s.w, s.h) * 0.42}
                fontWeight={700}
                fill="var(--background)"
              >
                {i + 1}
              </text>
            )}
          </g>
        )),
      )}
    </svg>
  );
}

export function LayoutPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {LAYOUTS.map((l) => {
        const active = value === l.id;
        return (
          <button
            key={l.id}
            onClick={() => onChange(l.id)}
            aria-pressed={active}
            title={l.description}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition ${active ? "border-accent text-foreground" : "border-transparent bg-background text-muted hover:border-border hover:text-foreground"}`}
          >
            <LayoutThumb layout={l} />
            <span className="text-center text-xs leading-tight">{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}
