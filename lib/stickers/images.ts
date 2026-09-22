"use client";
// 스티커 id → 이미지 (그림 SVG · 글자 PNG · 이모지 PNG). 한 번 만든 이미지는 캐시해 편집 화면과 합성이 같이 쓴다.
import { getSticker } from "@/lib/data/registry";
import { getArt, loadArt, svgDataUrl } from "@/lib/art/svg";
import { STICKER_ART } from "./art";
import { renderEmojiSticker, renderWordSticker, stampDate } from "./word";

// 날짜 도장처럼 오늘 날짜가 들어가는 글자 스티커는 날짜별로 캐시한다
// (id 로만 캐시하면 키오스크를 며칠 켜 둘 때 첫날 날짜가 계속 찍힘)
const key = (id: string) => (getSticker(id)?.word?.text.includes("{date}") ? `st:${id}:${stampDate()}` : `st:${id}`);
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
  const k = key(id);
  const hit = getArt(k);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(k);
  if (!p) {
    // 그림을 못 만들면(오프라인에서 낙서 묶음 로드 실패 등) 그 스티커만 건너뛴다 — 합성 전체가 실패하면 안 됨
    p = sourceFor(id)
      .catch(() => null)
      .then((src) => loadArt(k, src));
    pending.set(k, p);
    void p.finally(() => pending.delete(k));
  }
  return p;
}

export async function ensureStickers(ids: string[]): Promise<void> {
  await Promise.all([...new Set(ids)].map(loadSticker));
}
