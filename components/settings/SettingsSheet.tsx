"use client";
// 설정 (언어 · 화면 크기 · 인화 크기). 어느 화면에서나 헤더의 톱니 버튼으로 연다.
// 고른 값은 쿠키에 저장되므로 다음 방문자에게도 그대로 남는다 (부스 운영 설정).
import { useEffect, useState } from "react";
import { Check, Settings as SettingsIcon, X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { useSettings } from "@/lib/i18n/context";
import { LANGS, PRINT_SIZES, PRINT_SPEC, UI_SCALES, type Lang, type PrintSize, type UiScale } from "@/lib/settings/settings";
import type { MessageKey } from "@/lib/i18n/messages";

const LANG_LABEL: Record<Lang, string> = { ko: "한국어", en: "English" };
const SCALE_KEY: Record<UiScale, MessageKey> = { sm: "settings.scaleSm", md: "settings.scaleMd", lg: "settings.scaleLg" };

/** 한 줄짜리 선택 목록 — 고른 칸에 체크 */
function Choice<T extends string>({
  title,
  hint,
  items,
  value,
  onChange,
}: {
  title: string;
  hint?: string;
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div role="radiogroup" aria-label={title} className="mt-2 grid grid-cols-1 gap-1.5">
        {items.map((it) => {
          const active = it.id === value;
          return (
            <button
              key={it.id}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(it.id)}
              className={`flex h-12 items-center justify-between rounded-tile px-4 text-left text-sm transition ${
                active ? "bg-ink font-semibold text-white" : "bg-white/60 text-foreground hover:bg-white"
              }`}
            >
              {it.label}
              {active && <Check className="h-4 w-4" aria-hidden />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function SettingsSheet() {
  const { t, lang, uiScale, printSize, set } = useSettings();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <IconButton aria-label={t("settings.open")} onClick={() => setOpen(true)}>
        <SettingsIcon className="h-5 w-5" aria-hidden />
      </IconButton>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 backdrop-blur-sm sm:items-center"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("settings.title")}
            className="glass-solid max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-card p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("settings.title")}</h2>
              <IconButton aria-label={t("settings.close")} onClick={() => setOpen(false)} className="h-9 w-9">
                <X className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>

            <div className="mt-5 space-y-5">
              <Choice
                title={t("settings.language")}
                items={LANGS.map((l) => ({ id: l, label: LANG_LABEL[l] }))}
                value={lang}
                onChange={(id) => set({ lang: id })}
              />
              <Choice
                title={t("settings.uiScale")}
                hint={t("settings.uiScaleHint")}
                items={UI_SCALES.map((s) => ({ id: s, label: t(SCALE_KEY[s]) }))}
                value={uiScale}
                onChange={(id) => set({ uiScale: id })}
              />
              <Choice
                title={t("settings.printSize")}
                hint={t("settings.printSizeHint")}
                items={PRINT_SIZES.map((p) => ({ id: p, label: lang === "en" ? PRINT_SPEC[p].labelEn : PRINT_SPEC[p].label }))}
                value={printSize}
                onChange={(id: PrintSize) => set({ printSize: id })}
              />
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-6 h-12 w-full rounded-full bg-ink text-sm font-semibold text-white transition hover:bg-ink-2"
            >
              {t("settings.done")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
