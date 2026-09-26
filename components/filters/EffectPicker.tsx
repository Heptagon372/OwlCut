"use client";
// AR 얼굴 효과 선택: 카테고리 탭 + 썸네일. 카메라 앞 사람(또는 찍은 사진)의 얼굴에 효과를 씌워 보여주고,
// 얼굴이 없으면 기본 얼굴 일러스트로 보여준다.
import { useEffect, useMemo, useState } from "react";
import { EFFECTS, EFFECT_CATEGORIES, NO_EFFECT, effectAssets } from "@/lib/ar/effects";
import { useSettings } from "@/lib/i18n/context";
import { ensureAssets } from "@/lib/ar/assets";
import { effectSnapshot, mirroredCopy } from "@/lib/ar/draw";
import { CANONICAL_FACE, canonicalFaceCanvas } from "@/lib/ar/canonical";
import { mirrorFace } from "@/lib/tracking/landmarks";
import { loadImage, type Drawable } from "@/lib/filters/offline";
import { forEachChunked } from "@/lib/yieldToMain";
import type { EffectCategory, FaceGeometry } from "@/types/ar";

const THUMB = 112;
const ALL_ASSETS = [...new Set(EFFECTS.flatMap((e) => effectAssets(e)))];

export function EffectPicker({
  value,
  onChange,
  source,
  faces,
  mirror = false,
  disabled,
  variant = "grid",
}: {
  value: string;
  onChange: (id: string) => void;
  source: HTMLCanvasElement | string | null; // 카메라 스냅샷 또는 사진 dataURL
  faces: FaceGeometry[] | null | undefined;  // source 기준 얼굴 좌표
  mirror?: boolean;                           // 거울 모드면 화면에 보이는 방향으로 뒤집어 그림
  disabled?: boolean;
  variant?: "row" | "grid";
}) {
  const [category, setCategory] = useState<EffectCategory | "all">("all");
  const { t, label } = useSettings();
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      await ensureAssets(ALL_ASSETS);
      let base: Drawable;
      let list: FaceGeometry[];
      const img = typeof source === "string" ? await loadImage(source).catch(() => null) : source;
      if (img && faces?.length) {
        base = mirror ? mirroredCopy(img) : img;
        list = mirror ? faces.map(mirrorFace) : faces;
      } else {
        base = canonicalFaceCanvas(THUMB * 2);
        list = [CANONICAL_FACE];
      }
      if (!active) return;
      const next: Record<string, string> = {
        [NO_EFFECT]: effectSnapshot(base, { width: THUMB, height: THUMB, effect: null, faces: null }),
      };
      // 56장을 한 번에 만들면 실시간 미리보기가 멈칫하므로 나눠서
      const done = await forEachChunked(EFFECTS, (e) => {
        next[e.id] = effectSnapshot(base, { width: THUMB, height: THUMB, effect: e, faces: list });
      }, () => active);
      if (done) setThumbs(next);
    })();
    return () => {
      active = false;
    };
  }, [source, faces, mirror]);

  const none = t("common.none");
  const list = useMemo(
    () => [
      { id: NO_EFFECT, label: none, labelEn: none },
      ...(category === "all" ? EFFECTS : EFFECTS.filter((e) => e.category === category)),
    ],
    [category, none],
  );

  return (
    <div className="space-y-2">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label={t("effect.kinds")}>
        {[{ id: "all" as const, label: t("common.all"), labelEn: t("common.all") }, ...EFFECT_CATEGORIES].map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={category === c.id}
            onClick={() => setCategory(c.id)}
            className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition ${category === c.id ? "bg-ink text-white" : "bg-white/60 text-muted hover:bg-white hover:text-foreground"}`}
          >
            {label(c)}
          </button>
        ))}
      </div>

      <div
        className={
          variant === "row"
            ? "no-scrollbar flex snap-x gap-2 overflow-x-auto pb-1"
            : "grid grid-cols-4 gap-2"
        }
      >
        {list.map((e) => {
          const active = value === e.id;
          return (
            <button
              key={e.id}
              onClick={() => onChange(e.id)}
              disabled={disabled}
              aria-pressed={active}
              className={`flex shrink-0 snap-start flex-col items-center gap-1 disabled:opacity-40 ${variant === "row" ? "w-16" : ""}`}
            >
              <span
                className={`block aspect-square w-full overflow-hidden rounded-2xl border-2 bg-white/50 transition ${active ? "border-ink ring-2 ring-ink/25" : "border-transparent"}`}
              >
                {thumbs[e.id] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbs[e.id]} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className={`w-full truncate text-center text-[11px] ${active ? "font-semibold text-foreground" : "text-muted"}`}>
                {label(e)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
