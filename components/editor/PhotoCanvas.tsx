"use client";
import { useEffect, useRef } from "react";
import { renderToCanvas } from "@/lib/image/compose";
import { getFrame, getLayout } from "@/lib/data/registry";
import type { DesignState } from "@/types/design";

interface Props {
  photos: string[];
  design: DesignState;
  className?: string;
}

// 디자인 상태가 바뀔 때마다 합성 엔진으로 실시간 미리보기를 렌더한다.
export function PhotoCanvas({ photos, design, className }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    void renderToCanvas(
      {
        photos,
        layout: getLayout(design.layoutId),
        frame: getFrame(design.frameId),
        stickers: design.stickers,
        textLayers: design.textLayers,
        filter: design.filter,
      },
      canvas,
    ).catch(() => {
      /* 미리보기 실패는 무시 (다음 렌더에서 복구) */
    });
  }, [photos, design]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
    />
  );
}
