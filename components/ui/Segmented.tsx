"use client";
// 알약형 세그먼트 탭.
//  tone="dark"  — 검은 카드 위: 반투명 검정 바 + 흰 알약
//  tone="light" — 흰 카드 위: 옅은 회색 바 + 검은 알약 (레퍼런스의 기본 결)
import type { ReactNode } from "react";

export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  tone = "dark",
  className = "",
}: {
  items: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  const light = tone === "light";
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`grid auto-cols-fr grid-flow-col gap-1 rounded-full p-1.5 ${light ? "track" : "ink-glass"} ${className}`}
    >
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={`flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition ${
              active
                ? light
                  ? "bg-ink text-white shadow-[0_6px_16px_-10px_rgba(0,0,0,0.6)]"
                  : "bg-white text-ink shadow-sm"
                : light
                  ? "text-muted hover:text-foreground"
                  : "text-white/65 hover:text-white"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
