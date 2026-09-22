"use client";
import type { ReactNode, Ref } from "react";
import { Countdown } from "./Countdown";

interface Props {
  videoRef: Ref<HTMLVideoElement>;
  mirror: boolean;
  count: number | null;
  flash: boolean;
  shotIndex: number; // 지금까지 찍은 장수
  total: number;
  filterLayer?: ReactNode;  // 실시간 필터 캔버스 (비디오 바로 위)
  videoFilterCss?: string;  // WebGL이 없을 때 비디오에 직접 거는 CSS 필터
  overlay?: ReactNode;      // 자동 프레이밍 가이드 등
}

// 라이브 프리뷰 + 필터 + 진행 표시 + 카운트다운 + 플래시 오버레이.
export function CameraView({
  videoRef,
  mirror,
  count,
  flash,
  shotIndex,
  total,
  filterLayer,
  videoFilterCss,
  overlay,
}: Props) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[22px] bg-ink">
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full object-cover"
        style={{ transform: mirror ? "scaleX(-1)" : undefined, filter: videoFilterCss }}
      />

      {filterLayer}

      {overlay}

      <div className="ink-glass absolute left-4 top-4 flex items-center gap-2.5 rounded-full py-1.5 pl-3 pr-3.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff4d4d]" aria-hidden />
          LIVE
        </span>
        <span className="flex gap-1.5" aria-label={`${shotIndex}/${total}컷 촬영됨`}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition ${i < shotIndex ? "bg-white" : "bg-white/25"}`}
            />
          ))}
        </span>
      </div>

      <Countdown value={count} />

      {flash && <div className="absolute inset-0 bg-white opacity-80" />}
    </div>
  );
}
