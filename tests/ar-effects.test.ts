import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { MAX_MOSAICS, MAX_WARPS, effectWarps, faceFrame, mosaicRegions, placements, toSlot } from "@/lib/ar/geometry";
import { EFFECTS, EFFECT_CATEGORIES, getEffect, isEffect, needsShader } from "@/lib/ar/effects";
import { ASSETS } from "@/lib/ar/assets";
import { mosaicUniforms, warpUniforms } from "@/lib/filters/engine";
import type { AnchorName, ArEffect, FaceGeometry, Pt } from "@/types/ar";

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

// 정면 얼굴 (폭 0.4, 1000x1000 이미지에서 400px). rot 만큼 이미지 중심 기준 회전
function face(rot = 0, cx = 0.5, cy = 0.5): FaceGeometry {
  const r = (x: number, y: number): Pt => {
    const dx = x - 0.5;
    const dy = y - 0.5;
    return { x: cx + dx * Math.cos(rot) - dy * Math.sin(rot), y: cy + dx * Math.sin(rot) + dy * Math.cos(rot) };
  };
  return {
    forehead: r(0.5, 0.26),
    chin: r(0.5, 0.74),
    faceLeft: r(0.3, 0.46),
    faceRight: r(0.7, 0.46),
    eyeLeft: r(0.41, 0.44),
    eyeRight: r(0.59, 0.44),
    nose: r(0.5, 0.55),
    mouth: r(0.5, 0.63),
    mouthLeft: r(0.45, 0.63),
    mouthRight: r(0.55, 0.63),
    cheekLeft: r(0.39, 0.56),
    cheekRight: r(0.61, 0.56),
    mouthOpen: 0,
  };
}

const effect = (e: Partial<ArEffect>): ArEffect => ({ id: "t", label: "t", category: "fx", parts: [], ...e });

describe("얼굴 좌표계", () => {
  it("정면: 각도 0, 폭은 윤곽 사이 거리(px)", () => {
    const f = faceFrame(face(), 1000, 1000);
    close(f.angle, 0);
    close(f.width, 400);
    close(f.height, 480);
    close(f.anchors.headTop.y, 260 - 0.12 * 400);
    close(f.anchors.eyes.x, 500);
  });

  it("고개를 기울이면 각도와 '위쪽' 방향이 같이 돈다", () => {
    const f = faceFrame(face(Math.PI / 6), 1000, 1000);
    close(f.angle, Math.PI / 6);
    close(f.width, 400, 1e-3);
    // 정수리는 이마에서 얼굴 '위'(= -uy) 방향
    const d = { x: f.anchors.headTop.x - f.anchors.forehead.x, y: f.anchors.headTop.y - f.anchors.forehead.y };
    close(d.x, Math.sin(Math.PI / 6) * 48, 1e-3);
    close(d.y, -Math.cos(Math.PI / 6) * 48, 1e-3);
  });
});

describe("스티커 배치", () => {
  it("크기·위치는 얼굴 폭 단위 → 얼굴이 가까우면 커짐", () => {
    const e = effect({ parts: [{ asset: "crown", at: "headTop", offset: [0, -0.2], size: 0.7 }] });
    const [near] = placements(e, [face()], 1000, 1000);
    close(near.w, 280);
    close(near.cy, 260 - 48 - 80);
    const small = { ...face(), faceLeft: { x: 0.4, y: 0.46 }, faceRight: { x: 0.6, y: 0.46 } };
    close(placements(e, [small], 1000, 1000)[0].w, 140);
  });

  it("mirrorSecond: 두 번째는 좌우 대칭 위치 + 반대 회전 + 뒤집기", () => {
    const e = effect({ parts: [{ asset: "pink-bow", at: ["headTop", "headTop"], offset: [-0.4, 0], size: 0.3, rotate: -18, mirrorSecond: true }] });
    const [a, b] = placements(e, [face()], 1000, 1000);
    close(a.cx, 500 - 160);
    close(b.cx, 500 + 160);
    close(a.angle, (-18 * Math.PI) / 180);
    close(b.angle, (18 * Math.PI) / 180);
    assert.equal(a.flip, false);
    assert.equal(b.flip, true);
  });

  it("기울어진 얼굴: 오프셋이 얼굴 축을 따라 회전", () => {
    const rot = Math.PI / 2; // 90도
    const e = effect({ parts: [{ asset: "halo", at: "faceCenter", offset: [0, -0.5], size: 1 }] });
    const [p] = placements(e, [face(rot)], 1000, 1000);
    const c = faceFrame(face(rot), 1000, 1000).anchors.faceCenter;
    close(p.cx - c.x, 200, 1e-3); // 얼굴 '위'가 이미지 오른쪽
    close(p.cy - c.y, 0, 1e-3);
    close(p.angle, rot);
  });

  it("얼굴이 여러 명이면 사람마다 붙는다", () => {
    const e = getEffect("cat")!;
    assert.equal(placements(e, [face(0, 0.3), face(0, 0.7)], 1000, 1000).length, e.parts.length * 2);
  });

  it("toSlot: 사진 크롭 → 네컷 슬롯 좌표", () => {
    const p = { asset: "x", cx: 300, cy: 200, w: 100, angle: 0.3, flip: false };
    const out = toSlot(p, { sx: 100, sy: 50, sw: 800 }, { x: 40, y: 60, w: 400 });
    assert.deepEqual(out, { ...p, cx: 40 + 100, cy: 60 + 75, w: 50 });
  });
});

describe("얼굴 왜곡·모자이크", () => {
  it("왜곡 중심은 정규화, 반경은 얼굴 폭 비례(px)", () => {
    const w = effectWarps(getEffect("big-eyes"), [face()], 1000, 1000);
    assert.equal(w.length, 2);
    close(w[0].x, 0.41);
    close(w[0].r, getEffect("big-eyes")!.warps![0].radius * 400);
    assert.equal(effectWarps(getEffect("cat"), [face()], 1000, 1000).length, 0);
  });

  it(`셰이더 한도: 왜곡 ${MAX_WARPS}개, 모자이크 ${MAX_MOSAICS}명까지`, () => {
    const four = [face(0, 0.2), face(0, 0.4), face(0, 0.6), face(0, 0.8)];
    assert.equal(effectWarps(getEffect("funny-face"), four, 1000, 1000).length, MAX_WARPS);
    assert.equal(mosaicRegions(getEffect("mosaic"), [...four, face()], 1000, 1000).length, MAX_MOSAICS);
    assert.equal(mosaicRegions(getEffect("big-eyes"), four, 1000, 1000).length, 0);
  });

  it("uniform 변환: 이미지 y(아래 +) → 텍스처 y(위 +), 각도 부호 반대", () => {
    const u = warpUniforms([{ x: 0.25, y: 0.1, r: 30, s: 0.4 }], 800, 600);
    assert.equal(u.length, MAX_WARPS * 4);
    close(u[0], 200);
    close(u[1], 540);
    close(u[2], 30);
    close(u[3], 0.4, 1e-6);
    const m = mosaicUniforms([{ x: 0.5, y: 0.25, rx: 90, ry: 110, angle: 0.2 }], 800, 600);
    close(m.a[1], 450);
    close(m.b[0], -0.2);
    close(m.b[1], 200 / 9, 1e-4);
    close(mosaicUniforms([{ x: 0, y: 0, rx: 3, ry: 3, angle: 0 }], 10, 10).b[1], 4); // 블록 최소 4px
  });
});

describe("효과 목록", () => {
  const ANCHORS: AnchorName[] = [
    "forehead", "headTop", "eyes", "eyeLeft", "eyeRight", "nose", "mouth", "chin",
    "cheekLeft", "cheekRight", "faceCenter", "earLeft", "earRight",
  ];

  it("id 중복 없음, 카테고리·기준점·그림이 모두 유효", () => {
    const ids = EFFECTS.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(!ids.includes("none"));
    const cats = new Set(EFFECT_CATEGORIES.map((c) => c.id));
    for (const e of EFFECTS) {
      assert.ok(cats.has(e.category), e.id);
      assert.ok(e.parts.length || e.warps?.length || e.mosaic, `${e.id}: 아무 효과도 없음`);
      for (const p of e.parts) {
        assert.ok(ASSETS[p.asset], `${e.id}: 그림 ${p.asset} 없음`);
        for (const a of [p.at].flat()) assert.ok(ANCHORS.includes(a), `${e.id}: 기준점 ${a}`);
        assert.ok(p.size > 0 && p.size < 3, `${e.id}: 크기 ${p.size}`);
      }
      for (const w of e.warps ?? []) {
        assert.ok(ANCHORS.includes(w.at));
        assert.ok(Math.abs(w.strength) <= 0.6 && w.radius > 0, `${e.id}: 왜곡 범위`);
      }
    }
  });

  it("카테고리마다 효과가 있다", () => {
    for (const c of EFFECT_CATEGORIES) assert.ok(EFFECTS.some((e) => e.category === c.id), c.id);
  });

  it("isEffect / getEffect / needsShader", () => {
    assert.equal(isEffect("none"), true);
    assert.equal(isEffect("cat"), true);
    assert.equal(isEffect("../etc"), false);
    assert.equal(isEffect(3), false);
    assert.equal(getEffect("none"), null);
    assert.equal(getEffect(undefined), null);
    assert.equal(needsShader(getEffect("cat")), false);
    assert.equal(needsShader(getEffect("big-eyes")), true);
    assert.equal(needsShader(getEffect("mosaic")), true);
  });

  it("모든 그림이 쓰이고, SVG 가 올바른 XML (태그 짝·크기 속성)", () => {
    const used = new Set(EFFECTS.flatMap((e) => e.parts.map((p) => p.asset)));
    for (const [id, svg] of Object.entries(ASSETS)) {
      assert.ok(used.has(id), `안 쓰는 그림 ${id}`);
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[\d. ]+" width="\d+" height="\d+"/, id);
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
  });
});
