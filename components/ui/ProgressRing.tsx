// 원형 진행 링 (레퍼런스의 120% · 1/4 링). value 0..1
import type { ReactNode } from "react";

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  tone = "dark",
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "dark" | "light"; // dark: 흰/글래스 카드 위, light: 검은 카드 위
  children?: ReactNode;
  label?: string; // 스크린리더용
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(Math.max(value, 0), 1);
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={tone === "dark" ? "rgba(17,17,20,0.1)" : "rgba(255,255,255,0.16)"}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={tone === "dark" ? "#111114" : "#ffffff"}
          strokeDasharray={`${c * v} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 400ms ease" }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
