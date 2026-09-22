"use client";
// 편집 화면 틀: 도구 막대(한 번에 도구 하나) · 도구 패널(화면 높이 안에서 자체 스크롤) · 패널 안 구역.
// 예전엔 모든 도구를 카드로 쌓아 한 화면이 4~5배 길어졌고 미리보기가 화면 밖으로 밀려났다.
import type { ComponentType, ReactNode } from "react";
import { Frame, LayoutGrid, ScanFace, Smile, Sparkles, SunMedium, Type } from "lucide-react";

export type ToolId = "layout" | "frame" | "filter" | "effect" | "sticker" | "text" | "ai";

export const TOOLS: { id: ToolId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "layout", label: "레이아웃", icon: LayoutGrid },
  { id: "frame", label: "프레임", icon: Frame },
  { id: "filter", label: "필터", icon: SunMedium },
  { id: "effect", label: "AR", icon: ScanFace },
  { id: "sticker", label: "스티커", icon: Smile },
  { id: "text", label: "문구", icon: Type },
  { id: "ai", label: "AI", icon: Sparkles },
];

export function ToolBar({
  value,
  onChange,
  tools,
}: {
  value: ToolId;
  onChange: (id: ToolId) => void;
  tools: typeof TOOLS;
}) {
  return (
    <div role="tablist" aria-label="편집 도구" className="ink-glass grid auto-cols-fr grid-flow-col gap-1 rounded-[22px] p-1.5">
      {tools.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition ${active ? "bg-white text-ink shadow-sm" : "text-white/60 hover:text-white"}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 도구 하나를 담는 카드. 큰 화면에선 남은 높이를 채우고 내용만 스크롤 */
export function ToolPanel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section role="tabpanel" aria-label={title} className="glass flex flex-col rounded-card lg:min-h-0 lg:flex-1">
      <header className="flex items-baseline justify-between gap-3 px-5 pb-3 pt-5">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {aside && <p className="truncate text-xs text-muted">{aside}</p>}
      </header>
      <div className="thin-scroll px-5 pb-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">{children}</div>
    </section>
  );
}

/** 패널 안 구역 — 카드 안 카드 대신 얇은 구분선 */
export function Section({ title, aside, children }: { title?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-5 border-t border-line pt-5 first:mt-0 first:border-0 first:pt-0">
      {(title || aside) && (
        <div className="mb-3 flex items-baseline justify-between gap-2">
          {title && <h3 className="text-xs font-semibold text-muted">{title}</h3>}
          {aside && <span className="text-xs text-muted">{aside}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
