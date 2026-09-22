"use client";

// 촬영 카운트다운 오버레이 (설계도 Phase 1). value가 null이면 렌더 안 함.
export function Countdown({ value }: { value: number | null }) {
  if (value == null) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span
        key={value}
        className="text-[9rem] font-black text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
      >
        {value}
      </span>
    </div>
  );
}
