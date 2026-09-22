"use client";

// 촬영 카운트다운: 반투명 원 안의 가는 큰 숫자. value가 null이면 렌더 안 함.
export function Countdown({ value }: { value: number | null }) {
  if (value == null) return null;
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <span
        key={value}
        className="num grid h-44 w-44 place-items-center rounded-full border border-white/40 bg-white/15 text-[112px] font-extralight leading-none text-white shadow-2xl backdrop-blur-md"
      >
        {value}
      </span>
    </div>
  );
}
