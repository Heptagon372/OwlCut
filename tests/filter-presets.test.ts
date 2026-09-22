import assert from "node:assert/strict";
import { it as t } from "vitest";
import { FILTERS, FILTER_CATEGORIES, getFilter, isFilter } from "@/lib/data/registry";
import { DESIGN_SCHEMA } from "@/lib/ai/prompt";
import { normalizeAIDesign } from "@/lib/ai/normalize";

const RANGES: Record<string, [number, number]> = {
  exposure: [-1, 1], brightness: [-0.3, 0.3], contrast: [0.5, 1.6], saturation: [0, 2], vibrance: [0, 1],
  temperature: [-1, 1], tint: [-1, 1], highlights: [-1, 1], shadows: [-1, 1], fade: [0, 0.3], bw: [0, 1],
  sepia: [0, 1], splitAmount: [0, 1], glow: [0, 1], smooth: [0, 1], vignette: [0, 1], grain: [0, 0.15], leak: [0, 1],
};
const COLORS = ["splitShadow", "splitHighlight", "leakColor"];
const HEX = /^#[0-9a-f]{6}$/i;

t(`프리셋 ${FILTERS.length}개, id 중복 없음`, () => {
  assert.ok(FILTERS.length >= 30);
  assert.equal(new Set(FILTERS.map((f) => f.id)).size, FILTERS.length);
});

t("기존 id(none/warm/cool/vivid/soft/bw) 유지 → 저장된 디자인·AI 호환", () => {
  for (const id of ["none", "warm", "cool", "vivid", "soft", "bw"]) assert.ok(isFilter(id), id);
  assert.equal(getFilter("없는필터").id, "none");
  assert.deepEqual(getFilter("none").params, {});
});

t("모든 카테고리에 3개 이상, 알 수 없는 카테고리 없음", () => {
  const cats = new Set(FILTER_CATEGORIES.map((c) => c.id));
  for (const f of FILTERS) assert.ok(cats.has(f.category), `${f.id}: ${f.category}`);
  for (const c of cats) assert.ok(FILTERS.filter((f) => f.category === c).length >= 3, c);
});

t("모든 파라미터가 아는 항목이고 범위 안", () => {
  for (const f of FILTERS) {
    assert.ok(f.label && f.description, `${f.id}: label/description`);
    for (const [k, v] of Object.entries(f.params)) {
      if (k in RANGES) {
        const [lo, hi] = RANGES[k];
        assert.ok(typeof v === "number" && v >= lo && v <= hi, `${f.id}.${k}=${v} (범위 ${lo}~${hi})`);
      } else if (COLORS.includes(k)) {
        assert.match(String(v), HEX, `${f.id}.${k}`);
      } else if (k === "bwMix") {
        const s = (v as number[]).reduce((a, b) => a + b, 0);
        assert.ok(Math.abs(s - 1) < 0.02, `${f.id}.bwMix 합 ${s}`);
      } else if (k === "curves") {
        for (const [ch, pts] of Object.entries(v as Record<string, number[][]>)) {
          assert.ok(["rgb", "r", "g", "b"].includes(ch), `${f.id}.curves.${ch}`);
          assert.ok(pts.length >= 2 && pts.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1), `${f.id}.curves.${ch}`);
          for (let i = 1; i < pts.length; i++) assert.ok(pts[i][0] > pts[i - 1][0] && pts[i][1] >= pts[i - 1][1], `${f.id}.curves.${ch} 단조`);
        }
      } else {
        assert.fail(`${f.id}: 알 수 없는 파라미터 ${k}`);
      }
    }
    // 스플릿 토닝 색이 있으면 양도 있어야 효과가 난다
    if (f.params.splitShadow || f.params.splitHighlight) assert.ok((f.params.splitAmount ?? 0) > 0, `${f.id}: splitAmount 없음`);
    if (f.params.leakColor) assert.ok((f.params.leak ?? 0) > 0, `${f.id}: leak 없음`);
  }
});

t("흑백 카테고리는 실제로 흑백/세피아", () => {
  for (const f of FILTERS.filter((x) => x.category === "bw")) assert.ok((f.params.bw ?? 0) >= 0.9 || (f.params.sepia ?? 0) >= 0.5, f.id);
});

t("뷰티 카테고리는 모두 피부 보정 포함", () => {
  for (const f of FILTERS.filter((x) => x.category === "beauty")) assert.ok((f.params.smooth ?? 0) > 0, f.id);
});

t("AI 스키마 enum = 프리셋 전체, 새 필터 id도 AI 응답에서 통과", () => {
  const props = DESIGN_SCHEMA.properties as Record<string, { enum?: string[] }>;
  assert.deepEqual(props.filter.enum, FILTERS.map((f) => f.id));
  const { design } = normalizeAIDesign({ frame: "mono", filter: "bw-studio", stickers: [], text: { content: "", position: "bottom" } });
  assert.equal(design.filter, "bw-studio");
});

