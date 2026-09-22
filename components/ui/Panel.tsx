// 제목 + 아이콘 + 내용의 카드 (레퍼런스의 흰/글래스 카드). tone="ink" 이면 검은 카드.
import type { ReactNode } from "react";

export function Panel({
  title,
  icon,
  aside,
  tone = "glass",
  className = "",
  children,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  aside?: ReactNode; // 제목 오른쪽 보조 텍스트/버튼
  tone?: "glass" | "ink";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${tone === "ink" ? "ink" : "glass"} rounded-card p-5 ${className}`}>
      {(title || icon || aside) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            {icon && <span className={tone === "ink" ? "text-ink-muted" : "text-muted"}>{icon}</span>}
            {title}
          </h3>
          {aside && <div className={`text-xs ${tone === "ink" ? "text-ink-muted" : "text-muted"}`}>{aside}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
