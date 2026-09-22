// 상태 표시: 상태색 + 아이콘 + 문구 (색만으로 의미를 전달하지 않음)
export type StatusTone = "good" | "warning" | "critical";

const STYLE: Record<StatusTone, { icon: string; className: string }> = {
  good: { icon: "●", className: "text-status-good" },
  warning: { icon: "▲", className: "text-status-warning" },
  critical: { icon: "✕", className: "text-status-critical" },
};

export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  const s = STYLE[tone];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span aria-hidden className={s.className}>{s.icon}</span>
      <span className="text-foreground">{label}</span>
    </span>
  );
}
