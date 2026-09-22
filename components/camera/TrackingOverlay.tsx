"use client";
// 자동 프레이밍 오버레이 (설계도 Phase 6): 인물 박스 + 이동 안내 문구.
// SVG viewBox를 원본 비디오 해상도로 두고 preserveAspectRatio="slice"를 쓰면
// <video object-cover>와 똑같이 잘려서 좌표가 정확히 겹친다.
import type { Box, FramingHint } from "@/lib/tracking/framing";

export function TrackingOverlay({
  group,
  frameSize,
  mirrored,
  hint,
}: {
  group: Box | null;
  frameSize: { w: number; h: number } | null;
  mirrored: boolean;
  hint: FramingHint;
}) {
  const good = hint.state === "good";
  const color = good ? "#4ade80" : "#fbbf24";

  return (
    <>
      {frameSize && group && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${frameSize.w} ${frameSize.h}`}
          preserveAspectRatio="xMidYMid slice"
          style={mirrored ? { transform: "scaleX(-1)" } : undefined}
          aria-hidden
        >
          <rect
            x={group.x * frameSize.w}
            y={group.y * frameSize.h}
            width={group.w * frameSize.w}
            height={group.h * frameSize.h}
            rx={frameSize.w * 0.015}
            fill="none"
            stroke={color}
            strokeWidth={frameSize.w * 0.004}
            strokeDasharray={good ? undefined : `${frameSize.w * 0.015} ${frameSize.w * 0.01}`}
          />
        </svg>
      )}
      <div
        aria-live="polite"
        className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-3 py-1 text-sm font-medium"
        style={{ color }}
      >
        {hint.message}
      </div>
    </>
  );
}
