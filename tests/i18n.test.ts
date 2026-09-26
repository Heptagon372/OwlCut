// 한/영 문구와 설정. 새 문구를 한쪽 언어만 넣고 잊는 일을 막는다.
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { MESSAGES, translate, type MessageKey } from "@/lib/i18n/messages";
import { errorKey } from "@/lib/i18n/errors";
import {
  DEFAULT_SETTINGS,
  PRINT_SIZES,
  PRINT_SPEC,
  SCALE_VALUE,
  UI_SCALES,
  langFromAcceptLanguage,
  parseSettings,
  serializeSettings,
} from "@/lib/settings/settings";
import { FILTERS, FILTER_CATEGORIES, FRAMES, LAYOUTS, STICKERS, STICKER_CATEGORIES } from "@/lib/data/registry";
import { EFFECTS, EFFECT_CATEGORIES } from "@/lib/ar/effects";

const HANGUL = /[가-힣]/;

describe("문구 사전", () => {
  it("한국어·영어 키가 똑같고 빈 문구가 없다", () => {
    const ko = Object.keys(MESSAGES.ko).sort();
    const en = Object.keys(MESSAGES.en).sort();
    assert.deepEqual(en, ko);
    for (const [key, value] of Object.entries(MESSAGES.en)) assert.ok(value.trim(), key);
    for (const [key, value] of Object.entries(MESSAGES.ko)) assert.ok(value.trim(), key);
  });

  it("영어 문구에 한글이 남아 있지 않다", () => {
    const left = Object.entries(MESSAGES.en).filter(([, v]) => HANGUL.test(v));
    assert.deepEqual(left, []);
  });

  it("자리표시자({n} 등)가 두 언어에 같이 있다", () => {
    const marks = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(MESSAGES.ko) as MessageKey[]) {
      assert.deepEqual(marks(MESSAGES.en[key]), marks(MESSAGES.ko[key]), key);
    }
  });

  it("자리표시자를 채우고, 없는 값은 그대로 남긴다", () => {
    assert.equal(translate("ko", "common.shots", { n: 4 }), "4컷");
    assert.equal(translate("en", "common.shots", { n: 4 }), "4 shots");
    assert.equal(translate("ko", "camera.running", { done: 2, total: 4 }), "촬영 중 · 2/4");
    assert.equal(translate("en", "idle.desc", {}), "Returning to the start screen in {n}s.");
  });

  it("서버 오류 코드 → 문구 (모르는 코드도 안내가 나온다)", () => {
    assert.equal(errorKey("rate_limited"), "err.rateLimited");
    assert.equal(errorKey("network"), "err.network");
    assert.equal(errorKey("무슨코드"), "err.unknown");
    assert.equal(errorKey(undefined), "err.unknown");
    for (const code of ["network", "SUPABASE_NOT_CONFIGURED", "limit_reached", "expired", "weird"]) {
      assert.ok(translate("en", errorKey(code)).length > 0);
    }
  });
});

describe("데이터 이름 (영어 설정)", () => {
  const groups: [string, { id: string; label: string; labelEn?: string }[]][] = [
    ["레이아웃", LAYOUTS],
    ["프레임", FRAMES],
    ["필터", FILTERS],
    ["스티커", STICKERS],
    ["AR 효과", EFFECTS],
    ["필터 분류", FILTER_CATEGORIES],
    ["스티커 분류", STICKER_CATEGORIES],
    ["AR 분류", EFFECT_CATEGORIES],
  ];

  it("모든 항목에 영어 이름이 있다", () => {
    for (const [name, list] of groups) {
      const missing = list.filter((x) => !x.labelEn?.trim()).map((x) => x.id);
      assert.deepEqual(missing, [], `${name}: 영어 이름 없음`);
    }
  });

  it("영어 이름에 한글이 없다 (한국어 문구를 그대로 복사하지 않았는지)", () => {
    for (const [name, list] of groups) {
      const bad = list.filter((x) => HANGUL.test(x.labelEn ?? "")).map((x) => x.id);
      assert.deepEqual(bad, [], `${name}: 영어 이름에 한글`);
    }
  });
});

describe("부스 설정", () => {
  it("쿠키로 저장하고 그대로 읽는다", () => {
    const s = { lang: "en" as const, uiScale: "lg" as const, printSize: "2x6" as const, printMode: "direct" as const };
    assert.deepEqual(parseSettings(serializeSettings(s)), s);
  });

  it("쿠키가 없거나 깨졌으면 기본값 (행사 중 화면이 비지 않게)", () => {
    assert.deepEqual(parseSettings(undefined), DEFAULT_SETTINGS);
    assert.deepEqual(parseSettings("not json"), DEFAULT_SETTINGS);
    assert.deepEqual(parseSettings(encodeURIComponent('{"lang":"fr","uiScale":"huge"}')), DEFAULT_SETTINGS);
    assert.deepEqual(parseSettings(encodeURIComponent('{"lang":"en"}')), { ...DEFAULT_SETTINGS, lang: "en" });
  });

  it("화면 크기는 rem 배율 (작게 < 보통 < 크게)", () => {
    const values = UI_SCALES.map((s) => SCALE_VALUE[s]);
    assert.deepEqual(values, [...values].sort((a, b) => a - b));
    assert.equal(SCALE_VALUE.md, 1);
  });

  it("인화 크기마다 mm·dpi·영어 이름이 있다", () => {
    for (const size of PRINT_SIZES) {
      const spec = PRINT_SPEC[size];
      assert.ok(spec.mm[0] > 0 && spec.mm[1] > 0, size);
      assert.ok(spec.dpi >= 300, size);
      assert.ok(spec.labelEn && !HANGUL.test(spec.labelEn), size);
    }
  });

  it("방문자 폰(설정 쿠키 없음)은 브라우저 언어를 따른다", () => {
    assert.equal(langFromAcceptLanguage("ko-KR,ko;q=0.9,en-US;q=0.8"), "ko");
    assert.equal(langFromAcceptLanguage("en-US,en;q=0.9"), "en");
    assert.equal(langFromAcceptLanguage("ja-JP"), "en");
    assert.equal(langFromAcceptLanguage(null), DEFAULT_SETTINGS.lang);
  });
});
