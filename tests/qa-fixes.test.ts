// QA 에서 잡은 문제들의 재발 방지
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { stampDate } from "@/lib/stickers/word";
import { forEachChunked } from "@/lib/yieldToMain";

describe("필름 날짜 도장", () => {
  it("'YY MM DD 형식, 날짜가 바뀌면 값도 바뀐다 (캐시 키에 쓰임)", () => {
    assert.equal(stampDate(new Date(2026, 8, 23)), "'26 09 23");
    assert.equal(stampDate(new Date(2027, 0, 5)), "'27 01 05");
    assert.notEqual(stampDate(new Date(2026, 8, 23, 23, 59)), stampDate(new Date(2026, 8, 24, 0, 1)));
  });
});

describe("나눠서 처리 (썸네일 수십 장을 만들 때 화면이 멈칫하지 않게)", () => {
  it("모든 항목을 순서대로 처리", async () => {
    const seen: number[] = [];
    const done = await forEachChunked([1, 2, 3, 4, 5], (n) => seen.push(n), () => true, 0);
    assert.equal(done, true);
    assert.deepEqual(seen, [1, 2, 3, 4, 5]);
  });

  it("중간에 취소되면(화면이 바뀜) 멈추고 false", async () => {
    const seen: number[] = [];
    let alive = true;
    const done = await forEachChunked([1, 2, 3, 4, 5], (n) => {
      seen.push(n);
      if (n === 2) alive = false;
    }, () => alive, 0);
    assert.equal(done, false);
    assert.deepEqual(seen, [1, 2]);
  });
});
