"use client";
// 원본 사진에 필터(+AR 얼굴 효과)를 입혀 보여주는 <img> (촬영 직후 4컷 확인 화면 등). 원본은 그대로 둔다.
import { useEffect, useState } from "react";
import { getFilter } from "@/lib/data/registry";
import { isNeutral, loadImage } from "@/lib/filters/offline";
import { effectAssets, getEffect } from "@/lib/ar/effects";
import { ensureAssets } from "@/lib/ar/assets";
import { effectSnapshot } from "@/lib/ar/draw";
import { isRetouchOn } from "@/lib/filters/retouch";
import type { FaceGeometry } from "@/types/ar";
import type { Retouch } from "@/types/design";

const MAX = 480;

export function FilteredImage({
  src,
  filterId,
  intensity = 1,
  effectId,
  faces,
  retouch,
  alt,
  className,
}: {
  src: string;
  filterId: string;
  intensity?: number;
  effectId?: string;
  faces?: FaceGeometry[] | null;
  retouch?: Retouch | null;
  alt: string;
  className?: string;
}) {
  const [filtered, setFiltered] = useState<{ key: string; url: string } | null>(null);
  const params = getFilter(filterId).params;
  const effect = faces?.length ? getEffect(effectId) : null;
  const plain = isNeutral(params, intensity) && !effect && !isRetouchOn(retouch);
  const key = `${src.length}:${src.slice(-32)}|${filterId}|${intensity}|${effect?.id ?? ""}|${retouch ? `${retouch.skin},${retouch.bright},${retouch.slim}` : ""}`;

  useEffect(() => {
    if (plain) return;
    let active = true;
    Promise.all([loadImage(src), ensureAssets(effectAssets(effect))])
      .then(([img]) => {
        if (!active) return;
        const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const url = effectSnapshot(img, {
          width: Math.round(img.naturalWidth * scale),
          height: Math.round(img.naturalHeight * scale),
          params,
          intensity,
          effect,
          faces,
          retouch,
          quality: 0.82,
        });
        setFiltered({ key, url });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const url = !plain && filtered?.key === key ? filtered.url : src;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}
