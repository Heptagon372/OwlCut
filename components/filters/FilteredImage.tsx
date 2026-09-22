"use client";
// 원본 사진에 필터를 입혀 보여주는 <img> (촬영 직후 4컷 확인 화면 등). 원본은 그대로 둔다.
import { useEffect, useState } from "react";
import { getFilter } from "@/lib/data/registry";
import { filteredSnapshot, isNeutral, loadImage } from "@/lib/filters/offline";

const MAX = 480;

export function FilteredImage({
  src,
  filterId,
  intensity = 1,
  alt,
  className,
}: {
  src: string;
  filterId: string;
  intensity?: number;
  alt: string;
  className?: string;
}) {
  const [filtered, setFiltered] = useState<{ key: string; url: string } | null>(null);
  const params = getFilter(filterId).params;
  const key = `${src.length}:${src.slice(-32)}|${filterId}|${intensity}`;

  useEffect(() => {
    if (isNeutral(params, intensity)) return;
    let active = true;
    loadImage(src)
      .then((img) => {
        if (!active) return;
        const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const url = filteredSnapshot(img, params, {
          width: Math.round(img.naturalWidth * scale),
          height: Math.round(img.naturalHeight * scale),
          intensity,
        });
        setFiltered({ key, url });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const url = !isNeutral(params, intensity) && filtered?.key === key ? filtered.url : src;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}
