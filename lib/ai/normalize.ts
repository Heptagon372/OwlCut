// AI 응답(JSON) 검증·보정 — 순수 함수 (설계도 7-4 "요청 처리 흐름").
// 없는 frame/sticker id는 기본값으로 치환하거나 버리고, 형식이 깨지면 basic 프레임으로 fallback.
import {
  DEFAULT_FILTER,
  DEFAULT_FRAME_ID,
  getFrame,
  hasFrame,
  hasSticker,
  isFilter,
} from "@/lib/data/registry";
import { ANCHORS, type Anchor, type StickerInstance, type TextAnchor } from "@/types/design";
import type { AIDesignResult } from "@/types/ai";
import { MAX_CAPTION_LENGTH, MAX_STICKERS } from "./prompt";

const STICKER_SIZE = 120;
const CAPTION_SIZE = 44;

export function fallbackDesign(): AIDesignResult {
  return { frameId: DEFAULT_FRAME_ID, filter: DEFAULT_FILTER, stickers: [], textLayers: [] };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// "top_right", "Top Right", "middle" 같은 변형을 표준 앵커로
function toAnchor(v: unknown): Anchor | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/^middle$/, "center");
  return (ANCHORS as string[]).includes(s) ? (s as Anchor) : null;
}

function toTextAnchor(v: unknown): TextAnchor {
  return v === "top" || v === "center" || v === "bottom" ? v : "bottom";
}

// 모델이 코드펜스나 설명을 섞어 보냈을 때 JSON 본문만 추출
export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body.trim();
}

export function normalizeAIDesign(raw: unknown): { design: AIDesignResult; warnings: string[] } {
  const warnings: string[] = [];
  if (!isRecord(raw)) return { design: fallbackDesign(), warnings: ["invalid_shape"] };

  // frame
  let frameId = DEFAULT_FRAME_ID;
  if (typeof raw.frame === "string" && hasFrame(raw.frame)) frameId = raw.frame;
  else warnings.push("unknown_frame");

  // filter
  let filter = DEFAULT_FILTER;
  if (typeof raw.filter === "string" && isFilter(raw.filter)) filter = raw.filter;
  else warnings.push("unknown_filter");

  // stickers: 알 수 없는 스티커/위치는 버리고, 같은 위치 중복 제거, 최대 개수 제한
  const stickers: StickerInstance[] = [];
  const used = new Set<Anchor>();
  const rawStickers = Array.isArray(raw.stickers) ? raw.stickers : [];
  for (const item of rawStickers) {
    if (stickers.length >= MAX_STICKERS) {
      warnings.push("too_many_stickers");
      break;
    }
    if (!isRecord(item)) continue;
    const id = typeof item.type === "string" ? item.type : "";
    const anchor = toAnchor(item.position);
    if (!hasSticker(id) || !anchor) {
      warnings.push("dropped_sticker");
      continue;
    }
    if (used.has(anchor)) continue;
    used.add(anchor);
    stickers.push({ id, anchor, size: STICKER_SIZE });
  }

  // text
  const textLayers = [];
  if (isRecord(raw.text) && typeof raw.text.content === "string") {
    const content = raw.text.content.replace(/\s+/g, " ").trim().slice(0, MAX_CAPTION_LENGTH);
    if (content) {
      textLayers.push({
        content,
        anchor: toTextAnchor(raw.text.position),
        color: getFrame(frameId).defaultTextColor ?? "#ffffff",
        size: CAPTION_SIZE,
      });
    }
  }

  return { design: { frameId, filter, stickers, textLayers }, warnings };
}
