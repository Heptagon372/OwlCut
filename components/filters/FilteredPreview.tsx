"use client";
// 촬영 화면 실시간 필터 미리보기: <video> 위에 WebGL 캔버스를 겹쳐 같은 셰이더로 그린다.
// AR 얼굴 왜곡·모자이크도 여기서 (추적된 얼굴 좌표를 셰이더에 넘김).
// 원본 필터이고 얼굴 효과도 없으면 캔버스를 숨기고 비디오를 그대로 보여준다 (GPU 절약, 컨텍스트는 유지).
import { useEffect, useRef } from "react";
import { FilterEngine } from "@/lib/filters/engine";
import { isNeutral } from "@/lib/filters/offline";
import { getEffect, needsShader } from "@/lib/ar/effects";
import { effectWarps, mosaicRegions } from "@/lib/ar/geometry";
import { isRetouchOn, retouchWarps, withRetouch } from "@/lib/filters/retouch";
import type { FacesFrame } from "@/lib/tracking/useFaceTracking";
import type { FilterParams } from "@/types/filter";
import type { Retouch } from "@/types/design";

const MAX_PREVIEW_WIDTH = 960; // 미리보기 해상도 상한 (촬영 원본과 무관)

export function FilteredPreview({
  videoElRef,
  params,
  intensity,
  mirror,
  effectId,
  retouch,
  facesRef,
  onUnsupported,
}: {
  videoElRef: React.RefObject<HTMLVideoElement | null>;
  params: FilterParams;
  intensity: number;
  mirror: boolean;
  effectId?: string;
  retouch?: Retouch | null;
  facesRef?: React.RefObject<FacesFrame | null>;
  onUnsupported: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const latest = useRef({ params, intensity, effectId, retouch, dirty: true });
  // 보정을 얹으면 더 이상 '원본'이 아니므로 캔버스를 보여 준다
  const hidden =
    isNeutral(withRetouch(params, retouch), intensity) && !needsShader(getEffect(effectId)) && !isRetouchOn(retouch);

  useEffect(() => {
    latest.current = { params, intensity, effectId, retouch, dirty: true };
  }, [params, intensity, effectId, retouch]);

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
      const effect = getEffect(cur.effectId);
      const extra = retouchWarps(cur.retouch);
      const shaderFx = needsShader(effect) || extra.length > 0;
      const params = withRetouch(cur.params, cur.retouch);
      if (!v || v.readyState < 2 || !v.videoWidth || (isNeutral(params, cur.intensity) && !shaderFx)) return;
      if (v.currentTime === lastTime && !cur.dirty) return; // 새 프레임이 없으면 다시 그리지 않음
      lastTime = v.currentTime;
      cur.dirty = false;
      // 얼굴 좌표는 비디오 원본 기준(반전 전) — 캔버스도 원본으로 그린 뒤 CSS로 반전하므로 그대로 사용
      const faces = shaderFx ? (facesRef?.current?.faces ?? []) : [];
      const scale = Math.min(1, MAX_PREVIEW_WIDTH / v.videoWidth);
      const ok = engine.render(v, v.videoWidth, v.videoHeight, params, {
        width: v.videoWidth * scale,
        height: v.videoHeight * scale,
        intensity: cur.intensity,
        seed: (frame++ % 97) * 1.37, // 그레인이 필름처럼 살짝 움직이게
        warps: effectWarps(effect, faces, v.videoWidth, v.videoHeight, extra),
        mosaics: mosaicRegions(effect, faces, v.videoWidth, v.videoHeight),
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
      style={{ transform: mirror ? "scaleX(-1)" : undefined, visibility: hidden ? "hidden" : "visible" }}
    />
  );
}
