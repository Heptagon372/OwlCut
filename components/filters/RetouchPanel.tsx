"use client";
// 카메라 보정 — 피부·밝기·갸름하게. 촬영 화면과 편집 화면이 같은 패널을 쓴다.
// 사진은 원본으로 저장되고 값만 들고 다니므로 찍은 뒤에도 바꿀 수 있다 (비파괴).
import { Scan, Sparkles, Sun } from "lucide-react";
import { RETOUCH_STEPS, clampRetouch } from "@/lib/filters/retouch";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";
import type { Retouch } from "@/types/design";

const ROWS: { key: keyof Retouch; label: MessageKey; icon: typeof Sun }[] = [
  { key: "skin", label: "retouch.skin", icon: Sparkles },
  { key: "bright", label: "retouch.bright", icon: Sun },
  { key: "slim", label: "retouch.slim", icon: Scan },
];

const STEP_LABEL: MessageKey[] = ["retouch.off", "retouch.low", "retouch.mid", "retouch.high"];

export function RetouchPanel({
  value,
  onChange,
  faceFound = true,
  disabled,
}: {
  value: Retouch;
  onChange: (r: Retouch) => void;
  /** 얼굴을 못 찾으면 '갸름하게'는 적용되지 않는다는 안내만 */
  faceFound?: boolean;
  disabled?: boolean;
}) {
  const t = useT();
  const r = clampRetouch(value);
  const set = (key: keyof Retouch, v: number) => onChange({ ...r, [key]: v });
  const on = r.skin > 0 || r.bright > 0 || r.slim > 0;

  return (
    <div className="space-y-3">
      {ROWS.map(({ key, label, icon: Icon }) => {
        const current = r[key];
        return (
          <div key={key}>
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <Icon className="h-4 w-4 text-muted" aria-hidden />
              {t(label)}
            </p>
            <div role="radiogroup" aria-label={t(label)} className="grid grid-cols-4 gap-1">
              {RETOUCH_STEPS.map((step, i) => {
                const active = Math.abs(current - step) < 0.01;
                return (
                  <button
                    key={step}
                    role="radio"
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => set(key, step)}
                    className={`h-9 rounded-full text-xs font-semibold transition disabled:opacity-40 ${
                      active ? "bg-ink text-white" : "bg-white/60 text-muted hover:bg-white hover:text-foreground"
                    }`}
                  >
                    {t(STEP_LABEL[i])}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted">
        {!faceFound && r.slim > 0 ? t("retouch.needFace") : on ? t("retouch.hintOn") : t("retouch.hint")}
      </p>
    </div>
  );
}
