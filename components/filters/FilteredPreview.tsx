"use client";
// 촬영 화면 실시간 필터 미리보기: <video> 위에 WebGL 캔버스를 겹쳐 같은 셰이더로 그린다.
// 원본 필터면 캔버스를 숨기고 비디오를 그대로 보여준다 (GPU 절약, 컨텍스트는 유지).
import { useEffect, useRef } from "react";
import { FilterEngine } from "@/lib/filters/engine";
import { isNeutral } from "@/lib/filters/offline";
import type { FilterParams } from "@/types/filter";

const MAX_PREVIEW_WIDTH = 960; // 미리보기 해상도 상한 (촬영 원본과 무관)

export function FilteredPreview({
  videoElRef,
  params,
  intensity,
  mirror,
  onUnsupported,
}: {
  videoElRef: React.RefObject<HTMLVideoElement | null>;
  params: FilterParams;
  intensity: number;
  mirror: boolean;
  onUnsupported: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const latest = useRef({ params, intensity, dirty: true });
  const neutral = isNeutral(params, intensity);

  useEffect(() => {
    latest.current = { params, intensity, dirty: true };
  }, [params, intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: FilterEngine;
    try {
      engine = new FilterEngine(canvas);
    } catch {
      onUnsupported();
      return;
    }
    let raf = 0;
    let lastTime = -1;
    let frame = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const v = videoElRef.current;
      const cur = latest.current;
      if (!v || v.readyState < 2 || !v.videoWidth || isNeutral(cur.params, cur.intensity)) return;
      if (v.currentTime === lastTime && !cur.dirty) return; // 새 프레임이 없으면 다시 그리지 않음
      lastTime = v.currentTime;
      cur.dirty = false;
      const scale = Math.min(1, MAX_PREVIEW_WIDTH / v.videoWidth);
      const ok = engine.render(v, v.videoWidth, v.videoHeight, cur.params, {
        width: v.videoWidth * scale,
        height: v.videoHeight * scale,
        intensity: cur.intensity,
        seed: (frame++ % 97) * 1.37, // 그레인이 필름처럼 살짝 움직이게
      });
      if (!ok && engine.isLost) {
        cancelAnimationFrame(raf);
        onUnsupported();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoElRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      style={{ transform: mirror ? "scaleX(-1)" : undefined, visibility: neutral ? "hidden" : "visible" }}
    />
  );
}
