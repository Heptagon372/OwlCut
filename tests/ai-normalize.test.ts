import assert from "node:assert/strict";
import { it as t } from "vitest";
import { normalizeAIDesign, extractJson, fallbackDesign } from "@/lib/ai/normalize";
import { DESIGN_SCHEMA, SYSTEM_PROMPT } from "@/lib/ai/prompt";


t("정상 응답 → 그대로 적용, 텍스트색은 프레임 기본색", () => {
  const { design, warnings } = normalizeAIDesign({
    frame: "cyber_purple", filter: "cool",
    stickers: [{ type: "owl", position: "top-right" }, { type: "star", position: "top_left" }],
    text: { content: "S.OWL 2026", position: "bottom" },
  });
  assert.equal(design.frameId, "cyber_purple");
  assert.equal(design.filter, "cool");
  assert.deepEqual(design.stickers.map((s) => [s.id, s.anchor]), [["owl", "top-right"], ["star", "top-left"]]);
  assert.equal(design.textLayers[0].content, "S.OWL 2026");
  assert.equal(design.textLayers[0].color, "#f0d5ff");
  assert.deepEqual(warnings, []);
});

t("없는 frame/filter/sticker → 기본값 치환 + 스티커 제거", () => {
  const { design, warnings } = normalizeAIDesign({
    frame: "neon_rainbow", filter: "rainbow-glitter", stickers: [{ type: "unicorn", position: "top" }, { type: "owl", position: "sideways" }],
    text: { content: "", position: "bottom" },
  });
  assert.equal(design.frameId, "basic");
  assert.equal(design.filter, "none");
  assert.equal(design.stickers.length, 0);
  assert.equal(design.textLayers.length, 0);
  assert.ok(warnings.includes("unknown_frame") && warnings.includes("unknown_filter") && warnings.includes("dropped_sticker"));
});

t("같은 위치 중복 제거 + 최대 4개 제한", () => {
  const { design } = normalizeAIDesign({
    frame: "mono", filter: "bw",
    stickers: [
      { type: "owl", position: "top-left" }, { type: "star", position: "top-left" },
      { type: "heart", position: "top-right" }, { type: "moon", position: "bottom-left" },
      { type: "fire", position: "bottom-right" }, { type: "crown", position: "top" },
    ],
    text: { content: "x", position: "top" },
  });
  assert.deepEqual(design.stickers.map((s) => s.anchor), ["top-left", "top-right", "bottom-left", "bottom-right"]);
});

t("형식이 깨진 응답 → basic fallback", () => {
  assert.deepEqual(normalizeAIDesign("not json").design, fallbackDesign());
  assert.deepEqual(normalizeAIDesign(null).design, fallbackDesign());
  assert.deepEqual(normalizeAIDesign([1, 2]).design, fallbackDesign());
});

t("긴 문구는 24자로 자르고, 잘못된 위치는 bottom", () => {
  const { design } = normalizeAIDesign({ frame: "basic", filter: "none", stickers: [], text: { content: "가".repeat(40), position: "left" } });
  assert.equal(design.textLayers[0].content.length, 24);
  assert.equal(design.textLayers[0].anchor, "bottom");
});

t("코드펜스/설명이 섞인 응답에서 JSON 추출", () => {
  const raw = '물론이죠! 디자인입니다:\n```json\n{"frame":"owl_classic","filter":"warm","stickers":[],"text":{"content":"가을","position":"bottom"}}\n```\n즐거운 촬영 되세요';
  const { design } = normalizeAIDesign(JSON.parse(extractJson(raw)));
  assert.equal(design.frameId, "owl_classic");
  assert.equal(design.filter, "warm");
});

t("스키마 enum이 레지스트리에서 생성됨", () => {
  const props = DESIGN_SCHEMA.properties as Record<string, { enum?: string[] }>;
  assert.deepEqual(props.frame.enum, ["basic", "owl_classic", "cyber_purple", "mono"]);
  assert.ok(SYSTEM_PROMPT.includes("cyber_purple") && SYSTEM_PROMPT.includes("🦉"));
});

