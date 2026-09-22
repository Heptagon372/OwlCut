// 자리 비움 판단 — 순수 함수 (타이머 훅과 분리해 테스트 가능).

export type IdlePhase = "active" | "warning" | "expired";

export interface IdleState {
  phase: IdlePhase;
  secondsLeft: number; // 처음 화면으로 돌아가기까지 남은 초 (warning 일 때 표시)
}

export function idleState(now: number, lastActivity: number, timeoutMs: number, warnMs: number): IdleState {
  const left = timeoutMs - (now - lastActivity);
  if (left <= 0) return { phase: "expired", secondsLeft: 0 };
  return { phase: left <= warnMs ? "warning" : "active", secondsLeft: Math.ceil(left / 1000) };
}

const MIN_SECONDS = 20;
const MAX_SECONDS = 60 * 30;

/** 페이지별 기본값, NEXT_PUBLIC_IDLE_SECONDS 가 있으면 모든 화면에 그 값을 쓴다 (운영자가 숫자 하나로 조절) */
export function idleTimeoutSeconds(pageDefault: number, env: string | undefined): number {
  const n = Number(env);
  const v = env && Number.isFinite(n) && n > 0 ? n : pageDefault;
  return Math.min(Math.max(Math.round(v), MIN_SECONDS), MAX_SECONDS);
}
