"use client";
import type { RefObject } from "react";
import { Countdown } from "./Countdown";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  mirror: boolean;
  count: number | null;
  flash: boolean;
  shotIndex: number; // 지금까지 찍은 장수
  total: number;
}

// 라이브 프리뷰 + 진행 표시 + 카운트다운 + 플래시 오버레이.
export function CameraView({ videoRef, mirror, count, flash, shotIndex, total }: Props) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full object-cover"
        style={mirror ? { transform: "scaleX(-1)" } : undefined}
      />

      <div className="absolute left-4 top-4 flex gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full transition ${i < shotIndex ? "bg-accent" : "bg-white/30"}`}
          />
        ))}
      </div>

      <Countdown value={count} />

      {flash && <div className="absolute inset-0 bg-white opacity-80" />}
    </div>
  );
}
