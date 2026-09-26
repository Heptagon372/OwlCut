import assert from "node:assert/strict";
import { it as t } from "vitest";
import * as auth from "@/lib/admin/auth";
import { POPULAR_TOP, startOfTodayKST, summarizeByModel, summarizePopular } from "@/lib/admin/stats";
process.env.ADMIN_PASSWORD = "correct horse"; // auth는 호출 시점에 env를 읽음


t("비밀번호 확인", () => {
  assert.equal(auth.checkPassword("correct horse"), true);
  assert.equal(auth.checkPassword("correct hors"), false);
  assert.equal(auth.checkPassword(""), false);
});

t("세션 토큰: 발급 → 검증 통과", () => {
  assert.equal(auth.verifySessionToken(auth.createSessionToken()), true);
});

t("세션 토큰: 만료 / 서명 변조 / 형식 오류 → 거부", () => {
  const now = Date.now();
  const tok = auth.createSessionToken(now);
  assert.equal(auth.verifySessionToken(tok, now + 13 * 3600_000), false); // 12시간 후 만료
  const [exp, sig] = tok.split(".");
  assert.equal(auth.verifySessionToken(`${Number(exp) + 999999}.${sig}`), false); // 만료시각 연장 시도
  // 마지막 글자를 반드시 다른 값으로 (원래가 "0" 이면 바꾼 게 아니라 같은 서명이 된다)
  assert.equal(auth.verifySessionToken(`${exp}.${sig.slice(0, -1)}${sig.endsWith("0") ? "1" : "0"}`), false);
  assert.equal(auth.verifySessionToken("garbage"), false);
  assert.equal(auth.verifySessionToken(undefined), false);
});

t("비밀번호를 바꾸면 기존 세션 무효", () => {
  const tok = auth.createSessionToken();
  process.env.ADMIN_PASSWORD = "new password";
  assert.equal(auth.verifySessionToken(tok), false);
  process.env.ADMIN_PASSWORD = "correct horse";
  assert.equal(auth.verifySessionToken(tok), true);
});

t("Cookie 헤더에서 세션 읽기", () => {
  const tok = auth.createSessionToken();
  const req = (cookie: string) => new Request("http://x/api/admin/stats", { headers: { cookie } });
  assert.equal(auth.isAdminRequest(req(`a=1; owlcut_admin=${encodeURIComponent(tok)}; b=2`)), true);
  assert.equal(auth.isAdminRequest(req("owlcut_admin=nope")), false);
  assert.equal(auth.isAdminRequest(new Request("http://x")), false);
});

t("ADMIN_PASSWORD 미설정이면 모든 세션 거부", () => {
  const tok = auth.createSessionToken();
  delete process.env.ADMIN_PASSWORD;
  assert.equal(auth.verifySessionToken(tok), false);
  assert.equal(auth.checkPassword(""), false);
  process.env.ADMIN_PASSWORD = "correct horse";
});

t("오늘 = 한국 시간 자정 기준", () => {
  // 2026-09-22 01:30 KST == 2026-09-21 16:30 UTC → 시작은 2026-09-21 15:00 UTC
  assert.equal(startOfTodayKST(new Date("2026-09-21T16:30:00Z")).toISOString(), "2026-09-21T15:00:00.000Z");
  // 2026-09-22 23:59 KST == 14:59 UTC → 같은 날
  assert.equal(startOfTodayKST(new Date("2026-09-22T14:59:00Z")).toISOString(), "2026-09-21T15:00:00.000Z");
});

t("모델별 사용량 집계 (요청 많은 순, 평균 응답)", () => {
  const rows = [
    { model: "claude-opus-5", ok: true, latency_ms: 2000 },
    { model: "claude-opus-5", ok: false, latency_ms: 4000 },
    { model: "gemini-2.5-flash", ok: true, latency_ms: null },
    { model: "claude-opus-5", ok: true, latency_ms: 3000 },
  ];
  assert.deepEqual(summarizeByModel(rows), [
    { model: "claude-opus-5", requests: 3, success: 2, avgLatencyMs: 3000 },
    { model: "gemini-2.5-flash", requests: 1, success: 1, avgLatencyMs: null },
  ]);
});

t("인기 필터·AR 효과·레이아웃 (많이 쓴 순, 상위 5개, 이름 표시)", () => {
  const row = (filter: string | null, effect: string | undefined, layout: string | null) => ({
    filter,
    layout,
    layout_options: effect === undefined ? null : { effect },
  });
  const rows = [
    row("bw", "cat", "classic-strip"),
    row("bw", "cat", "classic-strip"),
    row("warm", "bunny", "classic-strip"),
    row(null, undefined, null), // AR 기능 이전 행: 효과 없음, 레이아웃 없음은 집계 제외
    row("retired-preset", "none", "classic-strip"),
    ...["a", "b", "c", "d", "e"].map((f) => row(f, "none", "classic-strip")),
  ];
  const p = summarizePopular(rows);
  assert.equal(p.total, 10);
  assert.deepEqual(p.filters[0], { id: "bw", label: "클래식 흑백", count: 2 });
  assert.equal(p.filters.length, POPULAR_TOP);
  assert.deepEqual(p.effects.map((e) => [e.id, e.label, e.count]), [
    ["none", "없음", 7],
    ["cat", "고양이", 2],
    ["bunny", "토끼", 1],
  ]);
  assert.deepEqual(p.layouts, [{ id: "classic-strip", label: p.layouts[0].label, count: 9 }]);
  assert.equal(summarizePopular([{ filter: "gone", layout: null, layout_options: null }]).filters[0].label, "gone");
});

