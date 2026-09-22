"use client";
// 편집 미리보기 위의 스티커 층: 끌어서 옮기기 · 손잡이로 크기/회전 · 삭제. 마우스·터치 모두 (Pointer Events).
// 캔버스 합성에서는 스티커를 빼고 여기서 같은 이미지·같은 좌표 규칙으로 그린다 → 끄는 동안 무거운 재합성 없음.
// 타일 반복 레이아웃(인생네컷 오리지널)은 첫 줄만 조작하고 나머지 줄은 따라 움직인다.
import { useEffect, useReducer, useRef } from "react";
import { RotateCw, X } from "lucide-react";
import { getSticker } from "@/lib/data/registry";
import { ensureStickers, getStickerImage } from "@/lib/stickers/images";
import { clampSticker, moveSticker, transformSticker } from "@/lib/stickers/geometry";
import { outputSize } from "@/lib/image/layoutGeometry";
import type { LayoutConfig, StickerInstance } from "@/types/design";

type Drag =
  | { mode: "move"; uid: string; pointerId: number; start: StickerInstance; x0: number; y0: number }
  | { mode: "transform"; uid: string; pointerId: number; start: StickerInstance; x0: number; y0: number; center: { x: number; y: number } };

export function StickerLayer({
  layout,
  stickers,
  selected,
  onSelect,
  onChange,
}: {
  layout: LayoutConfig;
  stickers: StickerInstance[];
  selected: string | null;
  onSelect: (uid: string | null) => void;
  onChange: (next: StickerInstance[]) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const [, redraw] = useReducer((n: number) => n + 1, 0);

  const idsKey = [...new Set(stickers.map((s) => s.id))].sort().join(",");
  useEffect(() => {
    let alive = true;
    void ensureStickers(idsKey ? idsKey.split(",") : []).then(() => alive && redraw());
    return () => {
      alive = false;
    };
  }, [idsKey]);

  const out = outputSize(layout);
  const tw = layout.canvas.width;
  const th = layout.canvas.height;
  const g = layout.tile?.gutter ?? 0;
  const tiles: { x: number; y: number }[] = [];
  for (let r = 0; r < (layout.tile?.rows ?? 1); r++)
    for (let c = 0; c < (layout.tile?.columns ?? 1); c++) tiles.push({ x: c * (tw + g), y: r * (th + g) });

  /** 화면 px / 출력 px */
  const pxPerUnit = () => (rootRef.current?.getBoundingClientRect().width ?? out.width) / out.width;

  const replace = (uid: string, next: StickerInstance) => onChange(stickers.map((s) => (s.uid === uid ? next : s)));
  const remove = (uid: string) => {
    onChange(stickers.filter((s) => s.uid !== uid));
    onSelect(null);
  };

  const startMove = (e: React.PointerEvent, s: StickerInstance) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onSelect(s.uid);
    // 누른 스티커를 맨 앞으로
    if (stickers[stickers.length - 1]?.uid !== s.uid) onChange([...stickers.filter((x) => x.uid !== s.uid), s]);
    drag.current = { mode: "move", uid: s.uid, pointerId: e.pointerId, start: s, x0: e.clientX, y0: e.clientY };
  };

  const startTransform = (e: React.PointerEvent, s: StickerInstance) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = rootRef.current!.getBoundingClientRect();
    const k = rect.width / out.width;
    const center = { x: rect.left + s.x * tw * k, y: rect.top + s.y * th * k }; // 첫 타일 기준
    drag.current = { mode: "transform", uid: s.uid, pointerId: e.pointerId, start: s, x0: e.clientX, y0: e.clientY, center };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (d.mode === "move") {
      const k = pxPerUnit();
      replace(d.uid, moveSticker(d.start, e.clientX - d.x0, e.clientY - d.y0, tw * k, th * k));
    } else {
      replace(d.uid, transformSticker(d.start, d.center, { x: d.x0, y: d.y0 }, { x: e.clientX, y: e.clientY }));
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (drag.current?.pointerId === e.pointerId) drag.current = null;
  };

  const onKey = (e: React.KeyboardEvent, s: StickerInstance) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const patch: Partial<StickerInstance> | null =
      e.key === "ArrowLeft" ? { x: s.x - step } :
      e.key === "ArrowRight" ? { x: s.x + step } :
      e.key === "ArrowUp" ? { y: s.y - step } :
      e.key === "ArrowDown" ? { y: s.y + step } :
      e.key === "+" || e.key === "=" ? { size: s.size * 1.1 } :
      e.key === "-" ? { size: s.size / 1.1 } :
      e.key === "]" ? { rotation: s.rotation + 5 } :
      e.key === "[" ? { rotation: s.rotation - 5 } : null;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(s.uid);
    } else if (e.key === "Escape") {
      onSelect(null);
    } else if (patch) {
      e.preventDefault();
      replace(s.uid, clampSticker({ ...s, ...patch }));
    }
  };

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const short = Math.min(tw, th);
  // 앞뒤 순서는 z-index 로만 바꾸고 DOM 순서는 uid 로 고정한다.
  // 누른 스티커를 맨 앞으로 보낼 때 요소 자체가 옮겨지면 브라우저가 포인터 캡처를 풀어 끌기가 끊긴다.
  const zOf = new Map(stickers.map((s, i) => [s.uid, i + 1]));
  const stable = [...stickers].sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));

  return (
    <div
      ref={rootRef}
      className="absolute inset-0"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null); // 빈 곳을 누르면 선택 해제
      }}
    >
      {tiles.map((t, ti) => (
        // 타일(스트립 한 장)마다 잘라서 보여 준다 — 합성도 타일 단위로 그려 이음매에서 잘리므로 미리보기와 같게.
        // overflow-clip: hidden 과 달리 스크롤 상자가 아니라서, 큰 스티커에 포커스가 가도 층이 밀리지 않음
        <div
          key={ti}
          className="pointer-events-none absolute overflow-clip"
          style={{ left: pct(t.x, out.width), top: pct(t.y, out.height), width: pct(tw, out.width), height: pct(th, out.height) }}
        >
        {stable.map((s) => {
          const img = getStickerImage(s.id);
          if (!img) return null;
          const primary = ti === 0;
          const active = primary && selected === s.uid;
          const label = getSticker(s.id)?.label ?? "스티커";
          return (
            <div
              key={s.uid}
              role={primary ? "button" : undefined}
              tabIndex={primary ? 0 : -1}
              aria-label={primary ? `${label} 스티커 — 끌어서 옮기기, 화살표로 이동, Delete로 삭제` : undefined}
              aria-pressed={primary ? active : undefined}
              onPointerDown={primary ? (e) => startMove(e, s) : undefined}
              onPointerMove={primary ? onMove : undefined}
              onPointerUp={primary ? endDrag : undefined}
              onPointerCancel={primary ? endDrag : undefined}
              onLostPointerCapture={primary ? endDrag : undefined}
              onKeyDown={primary ? (e) => onKey(e, s) : undefined}
              className={`absolute select-none outline-none ${primary ? "pointer-events-auto cursor-grab touch-none active:cursor-grabbing" : ""}`}
              style={{
                left: `${s.x * 100}%`,
                top: `${s.y * 100}%`,
                width: pct(s.size * short, tw),
                zIndex: zOf.get(s.uid),
                transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" draggable={false} className="pointer-events-none block h-auto w-full" />
              {active && (
                <>
                  <span className="pointer-events-none absolute -inset-1.5 rounded-lg border-2 border-dashed border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
                  <button
                    type="button"
                    aria-label={`${label} 스티커 삭제`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => remove(s.uid)}
                    className="absolute -right-5 -top-5 grid h-10 w-10 touch-none place-items-center rounded-full bg-ink text-white shadow-lg"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                  <span
                    role="presentation"
                    title="끌어서 크기·회전"
                    onPointerDown={(e) => startTransform(e, s)}
                    onPointerMove={onMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onLostPointerCapture={endDrag}
                    className="absolute -bottom-5 -right-5 grid h-10 w-10 cursor-nwse-resize touch-none place-items-center rounded-full bg-white text-ink shadow-lg ring-1 ring-black/10"
                  >
                    <RotateCw className="h-4 w-4" aria-hidden />
                  </span>
                </>
              )}
            </div>
          );
        })}
        </div>
      ))}
    </div>
  );
}
