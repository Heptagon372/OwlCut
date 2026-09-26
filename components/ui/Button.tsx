"use client";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "light";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // 검은 알약 (주요 동작)
  primary:
    "bg-ink text-white shadow-[0_12px_26px_-14px_rgba(0,0,0,0.75)] hover:bg-ink-2 active:scale-[0.98]",
  // 흰 알약 (보조 동작)
  secondary: "glass-solid text-foreground hover:bg-white active:scale-[0.98]",
  ghost: "text-muted hover:text-foreground",
  // 검은 카드 위의 흰 알약
  light: "bg-white text-ink hover:bg-white/90 active:scale-[0.98]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-base",
  lg: "h-16 px-9 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}

// 흰 원형 아이콘 버튼 (레퍼런스의 검색·알림 버튼)
export function IconButton({
  className = "",
  tone = "light",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "light" | "dark" }) {
  return (
    <button
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition disabled:opacity-40 ${tone === "dark" ? "bg-ink text-white hover:bg-ink-2" : "glass-solid text-foreground hover:bg-white"} ${className}`}
      {...props}
    />
  );
}
