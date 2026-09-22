import assert from "node:assert/strict";
import { it as t } from "vitest";
import { normalizeAIDesign, extractJson, fallbackDesign } from "@/lib/ai/normalize";
import { DESIGN_SCHEMA, SYSTEM_PROMPT } from "@/lib/ai/prompt";


t("정상 응답 → 그대로 적용, 텍스트색은 프레임 기본색", () => {
  const { design, warnings } = normalizeAIDesign({
    frame: "cyber_purple", filter: "cool", effect: "cat",
    stickers: [{ type: "owl", position: "top-right" }, { type: "star", position: "top_left" }],
    text: { content: "S.OWL 2026", position: "bottom" },
  });
  assert.equal(design.frameId, "cyber_purple");
  assert.equal(design.filter, "cool");
  assert.equal(design.effect, "cat");
  assert.deepEqual(design.stickers.map((s) => [s.id, s.x, s.y]), [["owl", 0.82, 0.08], ["star", 0.18, 0.08]]);
  assert.ok(design.stickers.every((s) => s.uid && s.size > 0 && s.rotation === 0));
  assert.notEqual(design.stickers[0].uid, design.stickers[1].uid);
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
  assert.deepEqual(design.stickers.map((s) => [s.x, s.y]), [[0.18, 0.08], [0.82, 0.08], [0.18, 0.86], [0.82, 0.86]]);
});

t("AR 효과: 모르는 값은 없음 + 경고, 빠져 있으면 조용히 없음", () => {
  const bad = normalizeAIDesign({ frame: "basic", filter: "none", effect: "unicorn-horn", stickers: [], text: { content: "", position: "bottom" } });
  assert.equal(bad.design.effect, "none");
  assert.ok(bad.warnings.includes("unknown_effect"));
  const missing = normalizeAIDesign({ frame: "basic", filter: "none", stickers: [], text: { content: "", position: "bottom" } });
  assert.equal(missing.design.effect, "none");
  assert.deepEqual(missing.warnings, []);
  assert.equal(fallbackDesign().effect, "none");
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
  assert.deepEqual(props.frame.enum?.slice(0, 4), ["basic", "owl_classic", "cyber_purple", "mono"]);
  assert.ok(props.frame.enum?.includes("film_black") && props.frame.enum.includes("pink_gingham"));
  assert.ok(props.stickers && JSON.stringify(props.stickers).includes("bow-pink"));
  assert.equal(props.effect.enum?.[0], "none");
  assert.ok(props.effect.enum?.includes("bunny") && props.effect.enum.includes("mosaic"));
  assert.ok((DESIGN_SCHEMA.required as string[]).includes("effect")); // OpenAI strict 는 모든 속성이 required 여야 함
  assert.ok(SYSTEM_PROMPT.includes("cyber_purple") && SYSTEM_PROMPT.includes("🦉") && SYSTEM_PROMPT.includes("bunny: 토끼"));
});

