"use client";
// 레이아웃 도구: 레이아웃 · 사진 자리 · 간격/모서리 (예전 '화면 구성' 탭의 카드 네 장을 한 패널의 구역으로)
// 배경색은 프레임과 함께 고르므로 BackgroundPicker 로 따로 (프레임 도구에서 사용)
import { RotateCcw } from "lucide-react";
import { LayoutPicker } from "./LayoutPicker";
import { PhotoOrderEditor } from "./PhotoOrderEditor";
import { Section } from "./EditorTools";
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

function LevelSlider({ label, left, right, value, onChange }: { label: string; left: string; right: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex justify-between text-sm font-medium">
        {label}
        <span className="num text-muted">{value === 0 ? "기본" : value}</span>
      </span>
      <input type="range" min={0} max={SCREEN_LEVEL_MAX} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--ink)]" />
      <span className="flex justify-between text-xs text-muted">
        <span>{left}</span>
        <span>{right}</span>
      </span>
    </label>
  );
}

export function LayoutTool({
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
  const customized = order.some((v, i) => v !== i) || design.slotSpacing > 0 || design.slotRounding > 0;

  return (
    <>
      <Section>
        <LayoutPicker
          count={photos.length}
          value={design.layoutId}
          onChange={(id) => onChange({ layoutId: id, photoOrder: normalizeOrder(design.photoOrder, getLayout(id).slots.length) })}
        />
      </Section>

      <Section title="사진 자리">
        <PhotoOrderEditor photos={photos} order={order} layout={layout} onChange={(o) => onChange({ photoOrder: o })} />
      </Section>

      <Section title="간격 · 모서리">
        <div className="space-y-4">
          <LevelSlider label="사진 간격" left="레이아웃 기본" right="넓게" value={design.slotSpacing} onChange={(v) => onChange({ slotSpacing: v })} />
          <LevelSlider label="모서리" left="각지게" right="둥글게" value={design.slotRounding} onChange={(v) => onChange({ slotRounding: v })} />
        </div>
        {customized && (
          <button
            onClick={() => onChange({ photoOrder: identityOrder(layout.slots.length), slotSpacing: 0, slotRounding: 0 })}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/70 px-4 text-xs font-semibold text-muted hover:bg-white hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            처음 상태로
          </button>
        )}
      </Section>
    </>
  );
}

export function BackgroundPicker({ value, onChange }: { value: string | null; onChange: (c: string | null) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onChange(null)}
        aria-pressed={!value}
        className={`h-9 rounded-full px-3.5 text-xs font-semibold ${!value ? "bg-ink text-white" : "bg-white/60 text-muted hover:bg-white hover:text-foreground"}`}
      >
        프레임 기본
      </button>
      {BG_PRESETS.map((p) => {
        const active = value?.toLowerCase() === p.color;
        return (
          <button
            key={p.color}
            onClick={() => onChange(p.color)}
            aria-pressed={active}
            aria-label={`배경 ${p.label}`}
            title={p.label}
            className={`h-9 w-9 rounded-full border-2 ${active ? "border-ink ring-2 ring-ink/25" : "border-white"}`}
            style={{ background: p.color }}
          />
        );
      })}
      <label
        title="직접 고르기"
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted/50 text-sm text-muted hover:text-foreground"
      >
        +
        <input
          type="color"
          value={value ?? "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="배경색 직접 고르기"
        />
      </label>
    </div>
  );
}
