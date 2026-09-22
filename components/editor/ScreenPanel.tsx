"use client";
// 화면 구성 탭: 레이아웃 · 사진 자리 · 간격 · 모서리 · 배경색 (촬영 후 네컷 화면 자체를 수정)
import { LayoutPicker } from "./LayoutPicker";
import { PhotoOrderEditor } from "./PhotoOrderEditor";
import { getLayout } from "@/lib/data/registry";
import { identityOrder, normalizeOrder } from "@/lib/image/layoutGeometry";
import { SCREEN_LEVEL_MAX, type DesignState } from "@/types/design";
import type { CapturedPhoto } from "@/types/session";

const BG_PRESETS = [
  { color: "#ffffff", label: "흰색" },
  { color: "#111111", label: "검정" },
  { color: "#f5ecd9", label: "크림" },
  { color: "#ffd6e0", label: "핑크" },
  { color: "#cfe8ff", label: "하늘" },
  { color: "#d4f5e4", label: "민트" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold text-muted">{children}</h3>;
}

function LevelSlider({
  label,
  left,
  right,
  value,
  onChange,
}: {
  label: string;
  left: string;
  right: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-sm font-semibold text-muted">
        {label}
        <span className="font-normal tabular-nums">{value === 0 ? "기본" : value}</span>
      </span>
      <input
        type="range"
        min={0}
        max={SCREEN_LEVEL_MAX}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      <span className="flex justify-between text-xs text-muted">
        <span>{left}</span>
        <span>{right}</span>
      </span>
    </label>
  );
}

export function ScreenPanel({
  photos,
  design,
  onChange,
}: {
  photos: CapturedPhoto[];
  design: DesignState;
  onChange: (patch: Partial<DesignState>) => void;
}) {
  const layout = getLayout(design.layoutId);
  const order = normalizeOrder(design.photoOrder, layout.slots.length);
  const customized =
    order.some((v, i) => v !== i) || design.slotSpacing > 0 || design.slotRounding > 0 || design.backgroundColor;

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>레이아웃</SectionTitle>
        <LayoutPicker
          value={design.layoutId}
          onChange={(id) =>
            onChange({ layoutId: id, photoOrder: normalizeOrder(design.photoOrder, getLayout(id).slots.length) })
          }
        />
      </section>

      <section>
        <SectionTitle>사진 자리</SectionTitle>
        <PhotoOrderEditor photos={photos} order={order} layout={layout} onChange={(o) => onChange({ photoOrder: o })} />
      </section>

      <section className="space-y-4">
        <LevelSlider
          label="사진 간격"
          left="레이아웃 기본"
          right="넓게"
          value={design.slotSpacing}
          onChange={(v) => onChange({ slotSpacing: v })}
        />
        <LevelSlider
          label="모서리"
          left="각지게"
          right="둥글게"
          value={design.slotRounding}
          onChange={(v) => onChange({ slotRounding: v })}
        />
      </section>

      <section>
        <SectionTitle>배경색</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onChange({ backgroundColor: null })}
            aria-pressed={!design.backgroundColor}
            className={`rounded-lg border px-2.5 py-1.5 text-xs ${!design.backgroundColor ? "border-accent text-foreground" : "border-border text-muted hover:text-foreground"}`}
          >
            프레임 기본
          </button>
          {BG_PRESETS.map((p) => {
            const active = design.backgroundColor?.toLowerCase() === p.color;
            return (
              <button
                key={p.color}
                onClick={() => onChange({ backgroundColor: p.color })}
                aria-pressed={active}
                aria-label={`배경 ${p.label}`}
                title={p.label}
                className={`h-8 w-8 rounded-full border-2 ${active ? "border-accent ring-2 ring-accent/40" : "border-border"}`}
                style={{ background: p.color }}
              />
            );
          })}
          <label
            title="직접 고르기"
            className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border text-sm text-muted hover:text-foreground"
          >
            +
            <input
              type="color"
              value={design.backgroundColor ?? "#ffffff"}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="배경색 직접 고르기"
            />
          </label>
        </div>
      </section>

      {customized && (
        <button
          onClick={() =>
            onChange({
              photoOrder: identityOrder(layout.slots.length),
              slotSpacing: 0,
              slotRounding: 0,
              backgroundColor: null,
            })
          }
          className="text-xs text-muted underline hover:text-foreground"
        >
          화면 구성 초기화
        </button>
      )}
    </div>
  );
}
