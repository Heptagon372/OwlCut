"use client";
// 스티커 고르기: 종류 탭 → 그림을 누르면 사진 가운데에 붙고 바로 선택됨.
// 옮기기·크기·회전은 미리보기에서 직접 (StickerLayer). 여기 도구 막대는 손잡이가 불편할 때를 위한 보조.
import { useEffect, useMemo, useReducer, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { STICKERS, STICKER_CATEGORIES } from "@/lib/data/registry";
import { ensureStickers, getStickerImage } from "@/lib/stickers/images";
import { STICKER_MAX, STICKER_MIN, clampSticker, newSticker, newUid } from "@/lib/stickers/geometry";
import type { StickerCategory, StickerInstance } from "@/types/design";

export function StickerPanel({
  value,
  onChange,
  selected,
  onSelect,
}: {
  value: StickerInstance[];
  onChange: (s: StickerInstance[]) => void;
  selected: string | null;
  onSelect: (uid: string | null) => void;
}) {
  const [category, setCategory] = useState<StickerCategory>(STICKER_CATEGORIES[0].id);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const list = useMemo(() => STICKERS.filter((s) => s.category === category), [category]);

  // 탭의 스티커 그림을 미리 만들어 둠 (글자·이모지 스티커는 캔버스로 그려짐)
  useEffect(() => {
    let alive = true;
    void ensureStickers(list.map((s) => s.id)).then(() => alive && redraw());
    return () => {
      alive = false;
    };
  }, [list]);

  const add = (id: string) => {
    const s = newSticker(id, value.length);
    onChange([...value, s]);
    onSelect(s.uid);
  };

  const current = value.find((s) => s.uid === selected) ?? null;
  const update = (patch: Partial<StickerInstance>) =>
    current && onChange(value.map((s) => (s.uid === current.uid ? clampSticker({ ...s, ...patch }) : s)));

  return (
    <div className="space-y-3">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="스티커 종류">
        {STICKER_CATEGORIES.map((c) => (
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

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" role="tabpanel">
        {list.map((s) => {
          const img = getStickerImage(s.id);
          return (
            <button
              key={s.id}
              onClick={() => add(s.id)}
              title={`${s.label} 붙이기`}
              aria-label={`${s.label} 붙이기`}
              className="relative aspect-square overflow-hidden rounded-2xl bg-white/55 transition hover:bg-white active:scale-95"
            >
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.src} alt="" draggable={false} className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] object-contain" />
              ) : (
                <span className="absolute inset-2 animate-pulse rounded-xl bg-black/5" />
              )}
            </button>
          );
        })}
      </div>

      {current ? (
        <div className="space-y-3 rounded-2xl bg-white/55 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">선택한 스티커</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const copy = clampSticker({ ...current, uid: newUid(), x: current.x + 0.06, y: current.y + 0.04 });
                  onChange([...value, copy]);
                  onSelect(copy.uid);
                }}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold hover:bg-white/70"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                복제
              </button>
              <button
                onClick={() => {
                  onChange(value.filter((s) => s.uid !== current.uid));
                  onSelect(null);
                }}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-ink px-3 text-xs font-semibold text-white"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                삭제
              </button>
            </div>
          </div>
          <label className="block">
            <span className="mb-1 flex justify-between text-xs text-muted">
              크기 <span className="num">{Math.round(current.size * 100)}</span>
            </span>
            <input
              type="range"
              min={STICKER_MIN * 100}
              max={STICKER_MAX * 100}
              value={Math.round(current.size * 100)}
              onChange={(e) => update({ size: Number(e.target.value) / 100 })}
              className="w-full accent-[var(--ink)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 flex justify-between text-xs text-muted">
              회전 <span className="num">{Math.round(current.rotation)}°</span>
            </span>
            <input
              type="range"
              min={-180}
              max={180}
              value={Math.round(current.rotation)}
              onChange={(e) => update({ rotation: Number(e.target.value) })}
              className="w-full accent-[var(--ink)]"
            />
          </label>
        </div>
      ) : (
        <p className="text-xs text-muted">
          {value.length === 0
            ? "스티커를 누르면 사진에 붙어요. 미리보기에서 끌어서 옮기고, 오른쪽 아래 손잡이로 크기·회전을 바꿔요."
            : `스티커 ${value.length}개 · 미리보기에서 스티커를 누르면 선택돼요.`}
        </p>
      )}

      {value.length > 0 && (
        <button
          onClick={() => {
            onChange([]);
            onSelect(null);
          }}
          className="text-xs text-muted underline hover:text-foreground"
        >
          스티커 모두 지우기
        </button>
      )}
    </div>
  );
}
