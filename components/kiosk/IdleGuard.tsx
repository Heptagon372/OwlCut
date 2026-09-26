"use client";
// 자리 비움 자동 초기화: 일정 시간 조작이 없으면 경고 → 처음 화면으로 돌아가며 사진·디자인을 지운다.
// 다음 방문자가 앞 사람 사진을 보지 않게 하기 위한 키오스크 필수 기능.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Hand } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useBoothStore } from "@/lib/store/boothStore";
import { useT } from "@/lib/i18n/context";
import { idleState, idleTimeoutSeconds, type IdleState } from "@/lib/kiosk/idle";

const WARN_MS = 15_000;
const TICK_MS = 250;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export function IdleGuard({
  seconds,
  enabled = true,
}: {
  seconds: number; // 이 화면의 기본 제한 시간 (NEXT_PUBLIC_IDLE_SECONDS 가 있으면 그 값)
  enabled?: boolean; // false: 멈춤 (예: 4컷 촬영 중에는 화면을 만지지 않으므로)
}) {
  const t = useT();
  const router = useRouter();
  const reset = useBoothStore((s) => s.reset);
  const timeoutMs = idleTimeoutSeconds(seconds, process.env.NEXT_PUBLIC_IDLE_SECONDS) * 1000;
  const lastActivity = useRef(0); // 이펙트가 켜질 때 현재 시각으로 설정
  const fired = useRef(false);
  const [state, setState] = useState<IdleState>({ phase: "active", secondsLeft: timeoutMs / 1000 });

  const touch = useCallback(() => {
    lastActivity.current = Date.now();
    setState((s) => (s.phase === "active" ? s : { phase: "active", secondsLeft: timeoutMs / 1000 }));
  }, [timeoutMs]);

  useEffect(() => {
    if (!enabled) return;
    lastActivity.current = Date.now(); // 다시 켜질 때(촬영 끝 등) 시간을 새로 센다
    fired.current = false;
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, touch, { passive: true, capture: true });
    const timer = setInterval(() => {
      const next = idleState(Date.now(), lastActivity.current, timeoutMs, WARN_MS);
      if (next.phase === "expired") {
        if (fired.current) return;
        fired.current = true;
        reset(); // 사진·디자인·세션을 메모리에서 지움
        router.push("/");
        return;
      }
      // 경고가 아닐 때는 상태를 바꾸지 않음 (불필요한 렌더 방지)
      setState((s) =>
        next.phase === "active" && s.phase === "active"
          ? s
          : s.phase === next.phase && s.secondsLeft === next.secondsLeft
            ? s
            : next,
      );
    }, TICK_MS);
    return () => {
      clearInterval(timer);
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, touch, { capture: true });
    };
  }, [enabled, timeoutMs, touch, reset, router]);

  if (!enabled || state.phase !== "warning") return null;


  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/25 px-4 backdrop-blur-sm"
    >
      <div className="glass-solid w-full max-w-sm rounded-card p-7 text-center">
        <div className="mx-auto w-fit">
          <ProgressRing value={state.secondsLeft / (WARN_MS / 1000)} size={96} stroke={7} label={t("idle.secondsLeft", { n: state.secondsLeft })}>
            <span className="num text-3xl font-light">{state.secondsLeft}</span>
          </ProgressRing>
        </div>
        <h2 id="idle-title" className="mt-4 text-2xl font-semibold">
          {t("idle.title")}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {t("idle.desc", { n: state.secondsLeft })}
          <br />
          {t("idle.note")}
        </p>
        <Button size="lg" onClick={touch} className="mt-6 w-full" autoFocus>
          <Hand className="h-5 w-5" aria-hidden />
          {t("idle.continue")}
        </Button>
      </div>
    </div>
  );
}
