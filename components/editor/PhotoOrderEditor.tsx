"use client";
// 사진 자리 바꾸기: 두 자리를 차례로 누르면 서로 바뀐다.
import { useState } from "react";
import { identityOrder, swapOrder } from "@/lib/image/layoutGeometry";
import type { LayoutConfig } from "@/types/design";
import type { CapturedPhoto } from "@/types/session";

// 다른 자리보다 확실히 큰 자리(큰 사진 + 3컷의 1번 등)에 표시
function bigSlotIndex(layout: LayoutConfig): number | null {
  const areas = layout.slots.map((s) => s.w * s.h);
  const max = Math.max(...areas);
  const others = areas.filter((a) => a !== max);
  return others.length && max >= Math.max(...others) * 1.5 ? areas.indexOf(max) : null;
}

export function PhotoOrderEditor({
  photos,
  order,
  layout,
  onChange,
}: {
  photos: CapturedPhoto[];
  order: number[];
  layout: LayoutConfig;
  onChange: (order: number[]) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const big = bigSlotIndex(layout);
  const isDefault = order.every((v, i) => v === i);

  const tap = (i: number) => {
    if (selected === null) return setSelected(i);
    if (selected !== i) onChange(swapOrder(order, selected, i));
    setSelected(null);
  };

  return (
    <div className="space-y-2">
      <div className={`grid gap-2 ${order.length > 4 ? "grid-cols-3" : "grid-cols-4"}`}>
        {order.map((photoIndex, i) => {
          const photo = photos[photoIndex];
          const active = selected === i;
          return (
            <button
              key={i}
              onClick={() => tap(i)}
              aria-pressed={active}
              aria-label={`자리 ${i + 1}${big === i ? " (큰 사진)" : ""}, ${photoIndex + 1}번째 컷`}
              className={`relative overflow-hidden rounded-lg border-2 transition ${active ? "border-accent ring-2 ring-accent/40" : "border-transparent"}`}
            >
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.dataUrl} alt="" className="aspect-square w-full object-cover" />
              )}
              <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-xs font-bold text-white">
                {i + 1}
                {big === i && " ★"}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span aria-live="polite">
          {selected === null
            ? "바꿀 두 자리를 차례로 눌러 주세요"
            : `자리 ${selected + 1} 선택됨 — 바꿀 자리를 눌러 주세요`}
        </span>
        {!isDefault && (
          <button
            onClick={() => {
              setSelected(null);
              onChange(identityOrder(order.length));
            }}
            className="shrink-0 underline hover:text-foreground"
          >
            찍은 순서로
          </button>
        )}
      </div>
    </div>
  );
}
