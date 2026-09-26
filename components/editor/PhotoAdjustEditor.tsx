"use client";
// 사진 확대·위치: 칸을 고르고, 상자 안에서 사진을 끌어 보여 줄 부분을 맞춘다.
// 상자는 합성과 같은 계산(coverCrop)으로 그리므로 여기서 보이는 그대로 인화된다.
import { useEffect, useRef, useState } from "react";
import { RotateCcw, ZoomIn } from "lucide-react";
import { coverCrop } from "@/lib/image/compose";
import { DEFAULT_ADJUST, PHOTO_ZOOM_MAX, PHOTO_ZOOM_MIN, clampAdjust, isDefaultAdjust, panBy } from "@/lib/image/photoAdjust";
import { useT } from "@/lib/i18n/context";
import type { LayoutConfig, PhotoAdjust } from "@/types/design";
import type { CapturedPhoto } from "@/types/session";

const BOX = 220; // 상자 긴 변 (화면 px)

export function PhotoAdjustEditor({
  photos,
  order,
  layout,
  value,
  onChange,
}: {
  photos: CapturedPhoto[];
  order: number[];
  layout: LayoutConfig;
  value: (PhotoAdjust | null)[] | undefined;
  onChange: (next: (PhotoAdjust | null)[]) => void;
}) {
  const t = useT();
  const [slot, setSlot] = useState(0);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null); // 원본 사진 크기
  const boxRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  const slotIndex = Math.min(slot, order.length - 1);
  const photoIndex = order[slotIndex] ?? 0;
  const photo = photos[photoIndex];
  const adjust = clampAdjust(value?.[photoIndex] ?? DEFAULT_ADJUST);

  // 원본 크기를 알아야 크롭 계산이 합성과 같아진다
  useEffect(() => {
    if (!photo) return;
    let alive = true;
    const img = new Image();
    img.onload = () => alive && setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = photo.dataUrl;
    return () => {
      alive = false;
    };
  }, [photo]);

  const set = (patch: Partial<PhotoAdjust>) => {
    const next = [...(value ?? [])];
    while (next.length < photos.length) next.push(null);
    next[photoIndex] = clampAdjust({ ...adjust, ...patch });
    onChange(next);
  };

  const slotBox = layout.slots[slotIndex] ?? { w: 1, h: 1 };
  const wide = slotBox.w >= slotBox.h;
  const boxW = wide ? BOX : Math.round((BOX * slotBox.w) / slotBox.h);
  const boxH = wide ? Math.round((BOX * slotBox.h) / slotBox.w) : BOX;

  // 합성과 같은 크롭 → 같은 그림을 CSS 로 (k = 화면 px / 원본 px)
  const crop = size ? coverCrop(size.w, size.h, slotBox, photo?.focus, adjust) : null;
  const k = crop ? boxW / crop.sw : 1;

  const onDown = (e: React.PointerEvent) => {
    if (!crop || !size) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !crop || !size) return;
    const next = panBy(adjust, e.clientX - d.x, e.clientY - d.y, size.w - crop.sw, size.h - crop.sh, k);
    drag.current = { ...d, x: e.clientX, y: e.clientY };
    if (next.x !== adjust.x || next.y !== adjust.y) set({ x: next.x, y: next.y });
  };
  const onUp = () => {
    drag.current = null;
  };

  if (!photo) return null;

  return (
    <div className="space-y-3">
      {/* 어느 칸을 손볼지 */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label={t("layout.slots")}>
        {order.map((p, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === slotIndex}
            onClick={() => setSlot(i)}
            className={`h-8 w-8 shrink-0 rounded-full text-xs font-semibold transition ${
              i === slotIndex ? "bg-ink text-white" : "bg-white/60 text-muted hover:bg-white hover:text-foreground"
            } ${isDefaultAdjust(value?.[p]) ? "" : "ring-2 ring-ink/30"}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div
          ref={boxRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onLostPointerCapture={onUp}
          className="relative touch-none overflow-clip rounded-2xl bg-black/10 shadow-inner"
          style={{ width: boxW, height: boxH, cursor: "grab" }}
        >
          {crop && size && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.dataUrl}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ width: size.w * k, height: size.h * k, left: -crop.sx * k, top: -crop.sy * k }}
            />
          )}
        </div>
        <p className="text-xs text-muted">{t("layout.photoZoomHint")}</p>
      </div>

      <label className="block">
        <span className="mb-1 flex justify-between text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <ZoomIn className="h-4 w-4 text-muted" aria-hidden />
            {t("layout.photoZoom")}
          </span>
          <span className="num text-muted">{adjust.zoom.toFixed(1)}x</span>
        </span>
        <input
          type="range"
          min={PHOTO_ZOOM_MIN * 10}
          max={PHOTO_ZOOM_MAX * 10}
          value={Math.round(adjust.zoom * 10)}
          onChange={(e) => set({ zoom: Number(e.target.value) / 10 })}
          aria-label={t("layout.photoZoom")}
          className="w-full accent-[var(--ink)]"
        />
      </label>

      {!isDefaultAdjust(value?.[photoIndex]) && (
        <button
          onClick={() => set(DEFAULT_ADJUST)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/70 px-4 text-xs font-semibold text-muted hover:bg-white hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          {t("layout.photoFit")}
        </button>
      )}
    </div>
  );
}
