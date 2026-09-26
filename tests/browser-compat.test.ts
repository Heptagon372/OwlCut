// 애플(Safari·iOS)에서 깨지는 API·CSS 가 다시 들어오지 않게 막는다.
// 기준: iOS 15 (2021년 아이폰까지) — 부스 옆 방문자 폰과 아이패드 키오스크를 생각한 선.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, it } from "vitest";
import { newUuid } from "@/lib/ids";

const ROOT = process.cwd();
const CLIENT_DIRS = ["lib", "components", "app"];
const SKIP = new Set(["node_modules", ".next", "api"]); // app/api = 서버(Node), 브라우저 제약 없음

function sources(dir: string, out: { path: string; code: string }[] = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    // 경로는 항상 / 로 (윈도우에서도 같은 규칙으로 비교)
    else if ([".ts", ".tsx", ".css"].includes(extname(name)))
      out.push({ path: p.slice(ROOT.length + 1).replaceAll("\\", "/"), code: readFileSync(p, "utf8") });
  }
  return out;
}

// 서버에서만 도는 코드(Node)는 브라우저 제약이 없다
const SERVER_ONLY = ["lib/ai/", "lib/storage/", "lib/supabase/", "lib/admin/", "lib/printer/", "lib/rateLimit"];
const FILES = CLIENT_DIRS.flatMap((d) => sources(join(ROOT, d))).filter(
  (f) => !SERVER_ONLY.some((prefix) => f.path.startsWith(prefix)),
);
const hits = (re: RegExp, allow: (p: string) => boolean = () => false) =>
  FILES.filter((f) => re.test(f.code) && !allow(f.path)).map((f) => f.path);

describe("브라우저 호환 (Safari·iOS 15 기준)", () => {
  it("ctx.roundRect 대신 공용 roundRectPath (Safari 16.4 이전엔 없어서 합성 전체가 실패했다)", () => {
    assert.deepEqual(hits(/\.roundRect\s*\(/), []);
  });

  it("AbortSignal.timeout 은 폴백을 거쳐 쓴다 (Safari 16 이전에 없음)", () => {
    assert.deepEqual(hits(/AbortSignal\.timeout\s*\(/, (p) => p === "lib/api.ts"), []);
  });

  it("crypto.randomUUID 를 브라우저 코드에서 직접 부르지 않는다 (비보안 접속·구형 사파리)", () => {
    assert.deepEqual(hits(/crypto\.randomUUID\s*\(/, (p) => p === "lib/ids.ts" || p === "lib/stickers/geometry.ts"), []);
  });

  it("newUuid 는 randomUUID 가 없어도 UUID 를 만든다", () => {
    const real = globalThis.crypto.randomUUID;
    try {
      // @ts-expect-error 구형 브라우저 흉내
      globalThis.crypto.randomUUID = undefined;
      const id = newUuid();
      assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.notEqual(newUuid(), id);
    } finally {
      globalThis.crypto.randomUUID = real;
    }
  });

  it("dvh·overflow:clip 은 대체가 있는 유틸리티로 (globals.css 의 screen-tall·preview-tall·clip-box)", () => {
    assert.deepEqual(hits(/\bh-dvh\b|\boverflow-clip\b|calc\(100dvh/, (p) => p === "app/globals.css"), []);
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    for (const util of ["screen-tall", "preview-tall", "clip-box", "drag-surface"]) {
      assert.ok(css.includes(`@utility ${util}`), util);
    }
    assert.ok(/height: 100vh;\s*height: 100dvh;/.test(css), "dvh 앞에 vh 대체가 있어야 한다");
    assert.ok(/contain: paint;\s*overflow: clip;/.test(css), "overflow:clip 앞에 contain:paint 대체");
  });

  it("아이폰 노치: viewport-fit=cover + body 안전영역 여백", () => {
    const layout = readFileSync(join(ROOT, "app/layout.tsx"), "utf8");
    assert.ok(layout.includes('viewportFit: "cover"'));
    assert.ok(readFileSync(join(ROOT, "app/globals.css"), "utf8").includes("env(safe-area-inset-top)"));
  });

  it("카메라 <video> 는 iOS 에서 전체화면으로 튀지 않게 playsInline·muted", () => {
    const view = readFileSync(join(ROOT, "components/camera/CameraView.tsx"), "utf8");
    assert.ok(view.includes("playsInline"));
    assert.ok(view.includes("muted"));
  });
});
