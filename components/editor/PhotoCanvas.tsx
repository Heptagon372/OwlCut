"use client";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { renderToCanvas } from "@/lib/image/compose";
import { buildComposeInput } from "@/lib/image/buildComposeInput";
import type { DesignState } from "@/types/design";
import type { CapturedPhoto } from "@/types/session";

interface Props {
  photos: CapturedPhoto[];
  design: DesignState;
  className?: string;
  // 캔버스 위에 겹칠 층 (편집 화면의 스티커 층). 있으면 스티커는 캔버스 합성에서 뺀다.
  overlay?: ReactNode;
}

// 디자인 상태가 바뀔 때마다 합성 엔진으로 실시간 미리보기를 렌더한다.
export function PhotoCanvas({ photos, design, className, overlay }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const excludeStickers = Boolean(overlay);

  // 스티커를 끄는 동안에는 캔버스를 다시 합성하지 않도록, 스티커를 뺀 디자인 내용이 바뀔 때만 렌더
  const key = useMemo(
    () => JSON.stringify(excludeStickers ? { ...design, stickers: [] } : design),
    [design, excludeStickers],
  );

  // 슬라이더를 끌거나 글자를 빠르게 치면 합성이 여러 번 겹쳐 돈다. 보이는 캔버스에 바로 그리면
  // 먼저 시작한 합성이 나중에 끝나며 새 그림 위에 덧그려진다(옛 사진 가장자리·글자 겹침).
  // → 화면 밖 캔버스에 그리고, 가장 최근에 시작한 합성만 화면에 옮긴다.
  const generation = useRef(0);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gen = ++generation.current;
    const d = JSON.parse(key) as DesignState;
    const off = document.createElement("canvas");
    renderToCanvas(buildComposeInput(photos, d), off)
      .then(() => {
        if (gen !== generation.current) return;
        if (canvas.width !== off.width) canvas.width = off.width;
        if (canvas.height !== off.height) canvas.height = off.height;
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        ctx?.drawImage(off, 0, 0);
      })
      .catch(() => {
        /* 미리보기 실패는 무시 (다음 렌더에서 복구) */
      });
  }, [photos, key]);

  // 높이 제한은 className(max-h-*)으로. 인라인 maxHeight:100%는 부모 높이가 auto라 무효가 되어
  // 세로로 긴 레이아웃이 잘리던 문제가 있었음. width/height auto → 비율 유지하며 축소.
  const canvas = (
    <canvas
      ref={ref}
      className={className}
      style={{ display: "block", maxWidth: "100%", width: "auto", height: "auto" }}
    />
  );
  if (!overlay) return canvas;
  // 겹칠 층이 캔버스와 정확히 같은 크기가 되도록 캔버스 크기에 딱 맞는 상자로 감싼다
  return (
    <div className="relative w-fit max-w-full">
      {canvas}
      {overlay}
    </div>
  );
}
