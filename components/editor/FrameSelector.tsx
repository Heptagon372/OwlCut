"use client";
// 프레임 고르기 — 썸네일은 지금 레이아웃에 각 프레임을 실제 합성 엔진으로 작게 그린 것
// (패턴·테이프·필름 구멍 같은 장식까지 그대로 보이게).
import { useEffect, useState } from "react";
import { useSettings } from "@/lib/i18n/context";
import { FRAMES } from "@/lib/data/registry";
import { renderToCanvas } from "@/lib/image/compose";
import { outputSize } from "@/lib/image/layoutGeometry";
import type { LayoutConfig } from "@/types/design";

const THUMB_H = 150; // 썸네일 높이(px, 기기 픽셀 여유 포함)

export function FrameSelector({
  value,
  onChange,
  layout,
}: {
  value: string;
  onChange: (id: string) => void;
  layout: LayoutConfig;
}) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const { label } = useSettings();

  useEffect(() => {
    let alive = true;
    (async () => {
      const scale = THUMB_H / outputSize(layout).height;
      const next: Record<string, string> = {};
      for (const f of FRAMES) {
        const c = document.createElement("canvas");
        await renderToCanvas(
          { photos: [], layout, frame: f, stickers: [], textLayers: [], filter: "none" },
          c,
          { scale },
        ).catch(() => {});
        if (!alive) return;
        next[f.id] = c.toDataURL("image/png");
        setThumbs({ ...next }); // 하나씩 채워지게
      }
    })();
    return () => {
      alive = false;
    };
  }, [layout]);

  return (
    <div className="grid grid-cols-4 gap-2">
      {FRAMES.map((f) => {
        const active = value === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            aria-pressed={active}
            title={f.description}
            className={`rounded-2xl border-2 p-1.5 transition ${active ? "border-ink bg-white" : "border-transparent bg-white/40 hover:bg-white/70"}`}
          >
            <span className="relative block h-24 overflow-hidden rounded-xl">
              {thumbs[f.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbs[f.id]} alt="" className="absolute inset-0 h-full w-full object-contain drop-shadow-sm" />
              ) : (
                <span className="absolute inset-0 animate-pulse rounded-md bg-black/5" />
              )}
            </span>
            <span className={`mt-1 block truncate text-xs ${active ? "font-semibold text-foreground" : "text-muted"}`}>{label(f)}</span>
          </button>
        );
      })}
    </div>
  );
}
