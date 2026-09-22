// 스티커(그림·글자·이모지·외부 낙서)와 프레임 데이터, 스티커 끌기·크기·회전 계산
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { FRAMES, STICKERS, STICKER_CATEGORIES } from "@/lib/data/registry";
import { STICKER_ART } from "@/lib/stickers/art";
import { DOODLE_ART } from "@/lib/stickers/doodles";
import {
  STICKER_MAX,
  STICKER_MIN,
  anchorToPosition,
  clampSticker,
  moveSticker,
  newSticker,
  normalizeDeg,
  stickerBox,
  transformSticker,
} from "@/lib/stickers/geometry";
import { isOverPhotos, seeded } from "@/lib/image/frameArt";
import type { StickerInstance } from "@/types/design";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

function wellFormed(id: string, svg: string) {
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[-\d. ]+" width="[\d.]+" height="[\d.]+"/, id);
  assert.ok(!/NaN|undefined/.test(svg), `${id}: 잘못된 값`);
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>/g)) {
    const [, close, name, self] = m;
    if (self) continue;
    if (close) assert.equal(stack.pop(), name, `${id}: </${name}> 짝 안 맞음`);
    else stack.push(name);
  }
  assert.equal(stack.length, 0, `${id}: 안 닫힌 태그 ${stack.join(",")}`);
}

describe("스티커 목록", () => {
  it("id 중복 없음, 종류가 유효하고 종류마다 스티커가 있다", () => {
    const ids = STICKERS.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, "중복 id");
    const cats = new Set(STICKER_CATEGORIES.map((c) => c.id));
    for (const s of STICKERS) assert.ok(cats.has(s.category), `${s.id}: 종류 ${s.category}`);
    for (const c of STICKER_CATEGORIES) assert.ok(STICKERS.filter((s) => s.category === c.id).length >= 5, `${c.id}: 스티커가 너무 적음`);
    assert.ok(STICKERS.length >= 100, `스티커 ${STICKERS.length}개`);
  });

  it("그림 스티커는 그림이 있고, 그림은 모두 목록에 쓰인다", () => {
    const art = { ...STICKER_ART, ...DOODLE_ART };
    for (const s of STICKERS) {
      if (s.glyph || s.word) continue;
      assert.ok(art[s.id], `${s.id}: 그림 없음`);
    }
    const listed = new Set(STICKERS.map((s) => s.id));
    for (const id of Object.keys(art)) assert.ok(listed.has(id), `안 쓰는 그림 ${id}`);
  });

  it("모든 SVG 가 올바른 XML", () => {
    for (const [id, svg] of Object.entries({ ...STICKER_ART, ...DOODLE_ART })) wellFormed(id, svg);
  });

  it("외부 낙서 그림은 출처(CC0) 표기된 파일에서 dd- 접두사로만", () => {
    for (const id of Object.keys(DOODLE_ART)) assert.ok(id.startsWith("dd-"), id);
    for (const id of Object.keys(STICKER_ART)) assert.ok(!id.startsWith("dd-"), id);
  });

  it("글자 스티커: 폰트·모양 값이 유효, 이모지는 글리프만", () => {
    const fonts = ["hand", "hangulHand", "display", "serif", "mono"];
    const shapes = [undefined, "none", "bubble", "tag", "burst", "window"];
    for (const s of STICKERS.filter((x) => x.word)) {
      assert.ok(fonts.includes(s.word!.font), `${s.id}: 폰트`);
      assert.ok(shapes.includes(s.word!.shape), `${s.id}: 모양`);
      assert.ok(s.word!.text.trim(), `${s.id}: 빈 글자`);
    }
    for (const s of STICKERS.filter((x) => x.category === "emoji")) assert.ok(s.glyph, s.id);
  });
});

describe("스티커 끌기·크기·회전", () => {
  const base: StickerInstance = { uid: "a", id: "bow-pink", x: 0.5, y: 0.5, size: 0.3, rotation: 0 };

  it("화면에서 끈 px → 타일 비율 이동, 타일 밖으로는 못 나감", () => {
    const m = moveSticker(base, 60, -30, 600, 300);
    close(m.x, 0.6);
    close(m.y, 0.4);
    const out = moveSticker(base, 9999, -9999, 600, 300);
    assert.equal(out.x, 1);
    assert.equal(out.y, 0);
  });

  it("손잡이: 중심에서 멀어진 만큼 크게, 돈 만큼 회전", () => {
    const c = { x: 100, y: 100 };
    const t = transformSticker(base, c, { x: 150, y: 100 }, { x: 100, y: 200 }); // 거리 50→100, 0°→90°
    close(t.size, 0.6);
    close(t.rotation, 90);
    const tiny = transformSticker(base, c, { x: 150, y: 100 }, { x: 101, y: 100 });
    assert.equal(tiny.size, STICKER_MIN);
    const huge = transformSticker(base, c, { x: 101, y: 100 }, { x: 900, y: 100 });
    assert.equal(huge.size, STICKER_MAX);
    assert.deepEqual(transformSticker(base, c, { x: 100.5, y: 100 }, { x: 300, y: 300 }), base); // 중심을 잡으면 무시
  });

  it("회전은 -180~180, 이상한 값은 기본값", () => {
    close(normalizeDeg(270), -90);
    close(normalizeDeg(-540), 180);
    const bad = clampSticker({ ...base, x: NaN, size: Infinity, rotation: NaN });
    assert.equal(bad.x, 0.5);
    assert.equal(bad.size, 0.32);
    assert.equal(bad.rotation, 0);
  });

  it("크기는 타일 짧은 변 기준 → 세로 스트립·가로 레이아웃 모두 같은 느낌", () => {
    assert.deepEqual(stickerBox(base, 600, 1800), { cx: 300, cy: 900, w: 180 });
    assert.deepEqual(stickerBox(base, 1800, 600), { cx: 900, cy: 300, w: 180 });
  });

  it("AI 9분할 위치 변환, 새 스티커는 겹치지 않게 비껴서", () => {
    assert.deepEqual(anchorToPosition("top-right"), { x: 0.82, y: 0.08 });
    assert.deepEqual(anchorToPosition("center"), { x: 0.5, y: 0.5 });
    const a = newSticker("heart", 0, "u1");
    const b = newSticker("heart", 1, "u2");
    assert.notDeepEqual([a.x, a.y], [b.x, b.y]);
    assert.equal(a.uid, "u1");
  });
});

describe("프레임", () => {
  const stickerIds = new Set(STICKERS.map((s) => s.id));
  const patterns = ["dots", "checker", "gingham", "stripes", "grid", "hearts", "stars", "sparkles", "confetti"];
  const fonts = [undefined, "sans", "display", "hand", "hangulHand", "serif", "mono"];

  it("16종 이상, id 중복 없음, AI 가 고를 설명이 있다", () => {
    assert.ok(FRAMES.length >= 16, `프레임 ${FRAMES.length}개`);
    assert.equal(new Set(FRAMES.map((f) => f.id)).size, FRAMES.length);
    for (const f of FRAMES) assert.ok(f.description && f.description.length > 10, f.id);
  });

  it("배경·장식·폰트 값이 유효하고 장식 스티커는 실제로 있다", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const f of FRAMES) {
      const bg = f.background;
      if (bg.type === "pattern") {
        assert.ok(patterns.includes(bg.pattern), `${f.id}: 패턴`);
        assert.ok(hex.test(bg.bg) && hex.test(bg.fg), `${f.id}: 색`);
      }
      if (bg.type === "gradient" && bg.stops) assert.ok(bg.stops.length >= 2 && bg.stops.every((c) => hex.test(c)), f.id);
      assert.ok(fonts.includes(f.footer?.font), `${f.id}: 폰트`);
      for (const d of f.decorations ?? []) {
        if (d.type === "sticker" || d.type === "slotSticker") assert.ok(stickerIds.has(d.id), `${f.id}: 없는 스티커 ${d.id}`);
        if (d.type === "sticker" || d.type === "text") {
          assert.ok(d.x >= 0 && d.x <= 1 && d.y >= 0 && d.y <= 1, `${f.id}: 위치`);
        }
      }
    }
  });

  it("사진 칸 장식은 사진 위, 필름 구멍·테두리는 사진 아래", () => {
    assert.equal(isOverPhotos({ type: "slotSticker", id: "tape-pink", at: "top-left", size: 0.2 }), true);
    assert.equal(isOverPhotos({ type: "slotLabel", kind: "film", color: "#fff", size: 0.03 }), true);
    assert.equal(isOverPhotos({ type: "filmHoles", color: "#fff" }), false);
    assert.equal(isOverPhotos({ type: "sticker", id: "cloud", x: 0, y: 0, size: 0.2 }), false);
    assert.equal(isOverPhotos({ type: "sticker", id: "cloud", x: 0, y: 0, size: 0.2, over: true }), true);
  });

  it("패턴 난수는 시드 고정 → 미리보기와 인화가 같다", () => {
    const a = seeded(7);
    const b = seeded(7);
    const xs = Array.from({ length: 5 }, () => a());
    assert.deepEqual(xs, Array.from({ length: 5 }, () => b()));
    assert.ok(xs.every((v) => v >= 0 && v < 1));
  });
});
