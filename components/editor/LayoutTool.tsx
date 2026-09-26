"use client";
// 레이아웃 도구: 레이아웃 · 사진 자리 · 간격/모서리 (예전 '화면 구성' 탭의 카드 네 장을 한 패널의 구역으로)
// 배경색은 프레임과 함께 고르므로 BackgroundPicker 로 따로 (프레임 도구에서 사용)
import { RotateCcw } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";
import { LayoutPicker } from "./LayoutPicker";
import { PhotoOrderEditor } from "./PhotoOrderEditor";
import { Section } from "./EditorTools";
import { getLayout } from "@/lib/data/registry";
import { identityOrder, normalizeOrder } from "@/lib/image/layoutGeometry";
import { SCREEN_LEVEL_MAX, type DesignState } from "@/types/design";
import type { CapturedPhoto } from "@/types/session";

const BG_PRESETS: { color: string; key: MessageKey }[] = [
  { color: "#ffffff", key: "color.white" },
  { color: "#111111", key: "color.black" },
  { color: "#f5ecd9", key: "color.cream" },
  { color: "#ffd6e0", key: "color.pink" },
  { color: "#cfe8ff", key: "color.sky" },
  { color: "#d4f5e4", key: "color.mint" },
];

function LevelSlider({ label, left, right, value, onChange }: { label: string; left: string; right: string; value: number; onChange: (v: number) => void }) {
  const t = useT();
  return (
    <label className="block">
      <span className="mb-1.5 flex justify-between text-sm font-medium">
        {label}
        <span className="num text-muted">{value === 0 ? t("common.default") : value}</span>
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
  const t = useT();
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

      <Section title={t("layout.slots")}>
        <PhotoOrderEditor photos={photos} order={order} layout={layout} onChange={(o) => onChange({ photoOrder: o })} />
      </Section>

      <Section title={t("layout.spacingCorner")}>
        <div className="space-y-4">
          <LevelSlider label={t("layout.spacing")} left={t("layout.spacingLeft")} right={t("layout.spacingRight")} value={design.slotSpacing} onChange={(v) => onChange({ slotSpacing: v })} />
          <LevelSlider label={t("layout.rounding")} left={t("layout.roundingLeft")} right={t("layout.roundingRight")} value={design.slotRounding} onChange={(v) => onChange({ slotRounding: v })} />
        </div>
        {customized && (
          <button
            onClick={() => onChange({ photoOrder: identityOrder(layout.slots.length), slotSpacing: 0, slotRounding: 0 })}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/70 px-4 text-xs font-semibold text-muted hover:bg-white hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {t("common.reset")}
          </button>
        )}
      </Section>
    </>
  );
}

export function BackgroundPicker({ value, onChange }: { value: string | null; onChange: (c: string | null) => void }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onChange(null)}
        aria-pressed={!value}
        className={`h-9 rounded-full px-3.5 text-xs font-semibold ${!value ? "bg-ink text-white" : "bg-white/60 text-muted hover:bg-white hover:text-foreground"}`}
      >
        {t("layout.frameDefault")}
      </button>
      {BG_PRESETS.map((p) => {
        const active = value?.toLowerCase() === p.color;
        const name = t(p.key);
        return (
          <button
            key={p.color}
            onClick={() => onChange(p.color)}
            aria-pressed={active}
            aria-label={t("layout.bgOf", { name })}
            title={name}
            className={`h-9 w-9 rounded-full border-2 ${active ? "border-ink ring-2 ring-ink/25" : "border-white"}`}
            style={{ background: p.color }}
          />
        );
      })}
      <label
        title={t("layout.pickColor")}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted/50 text-sm text-muted hover:text-foreground"
      >
        +
        <input
          type="color"
          value={value ?? "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={t("layout.pickColorLabel")}
        />
      </label>
    </div>
  );
}
