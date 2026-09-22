"use client";
// 스티커 id → 이미지 (그림 SVG · 글자 PNG · 이모지 PNG). 한 번 만든 이미지는 캐시해 편집 화면과 합성이 같이 쓴다.
import { getSticker } from "@/lib/data/registry";
import { getArt, loadArt, svgDataUrl } from "@/lib/art/svg";
import { STICKER_ART } from "./art";
import { renderEmojiSticker, renderWordSticker } from "./word";

const key = (id: string) => `st:${id}`;
const pending = new Map<string, Promise<HTMLImageElement | null>>();

async function sourceFor(id: string): Promise<string | null> {
  const def = getSticker(id);
  if (!def) return null;
  if (def.glyph) return renderEmojiSticker(def.glyph);
  if (def.word) return renderWordSticker(def.word);
  // 외부 낙서 그림(180KB)은 쓸 때만 불러온다
  const art = STICKER_ART[id] ?? (id.startsWith("dd-") ? (await import("./doodles")).DOODLE_ART[id] : undefined);
  return art ? svgDataUrl(art) : null;
}

/** 로드된 스티커 이미지 (없으면 null — 그리기에서 동기로 사용) */
export function getStickerImage(id: string): HTMLImageElement | null {
  return getArt(key(id));
}

export function loadSticker(id: string): Promise<HTMLImageElement | null> {
  const hit = getArt(key(id));
  if (hit) return Promise.resolve(hit);
  let p = pending.get(id);
  if (!p) {
    p = sourceFor(id).then((src) => loadArt(key(id), src));
    pending.set(id, p);
    void p.finally(() => pending.delete(id));
  }
  return p;
}

export async function ensureStickers(ids: string[]): Promise<void> {
  await Promise.all([...new Set(ids)].map(loadSticker));
}
