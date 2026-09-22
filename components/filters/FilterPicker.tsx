"use client";
// 필터 선택: 카테고리 탭 + 썸네일 칩. 썸네일은 실제 사진(또는 카메라 화면)에 각 필터를 적용해 만든다.
import { useEffect, useMemo, useState } from "react";
import { FILTERS, FILTER_CATEGORIES } from "@/lib/data/registry";
import { filteredSnapshot, loadImage } from "@/lib/filters/offline";
import type { FilterCategory } from "@/types/filter";

type ThumbSource = HTMLCanvasElement | string | null;
const THUMB = 96;

export function FilterPicker({
  value,
  onChange,
  source,
  mirror = false,
  disabled,
  variant = "grid",
}: {
  value: string;
  onChange: (id: string) => void;
  source: ThumbSource; // 썸네일 원본: 카메라 스냅샷 캔버스 또는 사진 dataURL
  mirror?: boolean;
  disabled?: boolean;
  variant?: "row" | "grid";
}) {
  const [category, setCategory] = useState<FilterCategory | "all">("all");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!source) return;
    let active = true;
    (async () => {
      const img = typeof source === "string" ? await loadImage(source).catch(() => null) : source;
      if (!img || !active) return;
      const next: Record<string, string> = {};
      for (const f of FILTERS) next[f.id] = filteredSnapshot(img, f.params, { width: THUMB, height: THUMB, mirror });
      if (active) setThumbs(next);
    })();
    return () => {
      active = false;
    };
  }, [source, mirror]);

  const list = useMemo(
    () => (category === "all" ? FILTERS : FILTERS.filter((f) => f.category === category)),
    [category],
  );

  return (
    <div className="space-y-2">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="필터 종류">
        {[{ id: "all" as const, label: "전체" }, ...FILTER_CATEGORIES].map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={category === c.id}
            onClick={() => setCategory(c.id)}
            className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition ${category === c.id ? "bg-ink text-white" : "bg-white/60 text-muted hover:bg-white hover:text-foreground"}`}
          >
            {c.label}
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
        {list.map((f) => {
          const active = value === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onChange(f.id)}
              disabled={disabled}
              aria-pressed={active}
              title={f.description}
              className={`flex shrink-0 snap-start flex-col items-center gap-1 disabled:opacity-40 ${variant === "row" ? "w-16" : ""}`}
            >
              <span
                className={`block aspect-square w-full overflow-hidden rounded-2xl border-2 bg-white/50 transition ${active ? "border-ink ring-2 ring-ink/25" : "border-transparent"}`}
              >
                {thumbs[f.id] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbs[f.id]} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className={`w-full truncate text-center text-[11px] ${active ? "font-semibold text-foreground" : "text-muted"}`}>
                {f.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
