// 아울네컷 로고: 기하학적 부엉이 마크 (눈·부리는 뚫린 구멍 → 흰/검은 카드 어디서든 사용)
export function OwlMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M4 11 10 4.5l3.2 5h5.6l3.2-5L28 11v10a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9V11Z
           M7.3 17.2a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0-8.4 0Z
           M16.3 17.2a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0-8.4 0Z
           M14.5 22.4h3l-1.5 2.6Z"
      />
      <circle cx="11.5" cy="17.6" r="1.9" fill="currentColor" />
      <circle cx="20.5" cy="17.6" r="1.9" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className = "", sub = true }: { className?: string; sub?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <OwlMark className="h-9 w-9" />
      <span className="leading-none">
        <span className="block font-display text-xl font-extrabold tracking-tight">S.OWL</span>
        {sub && <span className="block text-[11px] font-medium tracking-[0.18em] text-muted">아울네컷</span>}
      </span>
    </span>
  );
}
