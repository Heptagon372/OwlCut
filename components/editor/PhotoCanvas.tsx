"use client";
import { useEffect, useRef } from "react";
import { renderToCanvas } from "@/lib/image/compose";
import { buildComposeInput } from "@/lib/image/buildComposeInput";
import type { DesignState } from "@/types/design";
import type { CapturedPhoto } from "@/types/session";

interface Props {
  photos: CapturedPhoto[];
  design: DesignState;
  className?: string;
}

// 디자인 상태가 바뀔 때마다 합성 엔진으로 실시간 미리보기를 렌더한다.
export function PhotoCanvas({ photos, design, className }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    void renderToCanvas(buildComposeInput(photos, design), canvas).catch(() => {
      /* 미리보기 실패는 무시 (다음 렌더에서 복구) */
    });
  }, [photos, design]);

  // 높이 제한은 className(max-h-*)으로. 인라인 maxHeight:100%는 부모 높이가 auto라 무효가 되어
  // 세로로 긴 레이아웃이 잘리던 문제가 있었음. width/height auto → 비율 유지하며 축소.
  return (
    <canvas
      ref={ref}
      className={className}
      style={{ display: "block", maxWidth: "100%", width: "auto", height: "auto" }}
    />
  );
}
