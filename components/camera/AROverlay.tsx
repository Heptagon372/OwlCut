"use client";
// 촬영 화면 AR 스티커 레이어: 추적된 얼굴마다 스티커를 그린다.
// 캔버스 자체는 좌우 반전하지 않고, 얼굴 좌표를 반전해서 그린다 → 글씨·비대칭 그림이 뒤집히지 않고
// 캡처된 사진(거울 반전 저장)과 정확히 같은 모습이 된다.
import { useEffect, useRef } from "react";
import type { FacesFrame } from "@/lib/tracking/useFaceTracking";
import { effectAssets, getEffect } from "@/lib/ar/effects";
import { ensureAssets } from "@/lib/ar/assets";
import { placements } from "@/lib/ar/geometry";
import { drawPlacements } from "@/lib/ar/render";
import { mirrorFace } from "@/lib/tracking/landmarks";

const MAX_WIDTH = 960;

export function AROverlay({
  videoElRef,
  facesRef,
  effectId,
  mirror,
}: {
  videoElRef: React.RefObject<HTMLVideoElement | null>;
  facesRef: React.RefObject<FacesFrame | null>;
  effectId: string;
  mirror: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const latest = useRef({ effectId, mirror, dirty: true });

  useEffect(() => {
    latest.current = { effectId, mirror, dirty: true };
    const effect = getEffect(effectId);
    if (effect) void ensureAssets(effectAssets(effect)).then(() => (latest.current.dirty = true));
  }, [effectId, mirror]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let lastTime = -1;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cur = latest.current;
      const fr = facesRef.current;
      const v = videoElRef.current;
      if (!v || !v.videoWidth) return;
      if (fr?.time === lastTime && !cur.dirty) return;
      lastTime = fr?.time ?? -1;
      cur.dirty = false;

      const scale = Math.min(1, MAX_WIDTH / v.videoWidth);
      const w = Math.round(v.videoWidth * scale);
      const h = Math.round(v.videoHeight * scale);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      const effect = getEffect(cur.effectId);
      if (!effect?.parts.length || !fr?.faces.length) return;
      const faces = cur.mirror ? fr.faces.map(mirrorFace) : fr.faces;
      drawPlacements(ctx, placements(effect, faces, w, h));
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [videoElRef, facesRef]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover" />;
}
