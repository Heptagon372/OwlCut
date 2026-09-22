import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { readableTextOn, relativeLuminance } from "@/lib/image/color";

describe("readableTextOn — 배경색을 직접 바꿨을 때 글자색", () => {
  const cases: [string, string][] = [
    ["#111111", "#f5f5f5"],
    ["#000000", "#f5f5f5"],
    ["#ffffff", "#111111"],
    ["#ffd6e0", "#111111"], // 핑크 프리셋
    ["#cfe8ff", "#111111"], // 하늘 프리셋
    ["#f5ecd9", "#111111"], // 크림
    ["#2a0a4a", "#f5f5f5"], // 짙은 보라
    ["#d03b3b", "#f5f5f5"],
  ];
  for (const [bg, want] of cases) {
    it(`배경 ${bg} → 글자 ${want}`, () => assert.equal(readableTextOn(bg), want));
  }

  it("잘못된 색 형식이면 fallback", () => {
    assert.equal(readableTextOn("red", "#abcdef"), "#abcdef");
  });

  it("휘도 양 끝값", () => {
    assert.equal(relativeLuminance("#ffffff"), 1);
    assert.equal(relativeLuminance("#000000"), 0);
    assert.equal(relativeLuminance("nope"), null);
  });
});
