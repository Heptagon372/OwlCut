"use client";
// 알약형 세그먼트 탭 (레퍼런스 하단 내비게이션). 어두운 반투명 바 위에 선택된 칸만 흰색.
import type { ReactNode } from "react";

export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  className = "",
}: {
  items: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`ink-glass grid auto-cols-fr grid-flow-col gap-1 rounded-full p-1.5 ${className}`}
    >
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={`flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition ${active ? "bg-white text-ink shadow-sm" : "text-white/65 hover:text-white"}`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
