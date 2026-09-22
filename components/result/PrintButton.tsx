"use client";
// 출력 버튼 (설계도 7-6): 큐 등록 후 상태를 폴링해 보여준다.
// 프린터 오류는 여기서만 표시되고 QR/다운로드 흐름에는 영향 없음.
import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fetchPrintStatus, requestPrint } from "@/lib/api";
import type { PrintStatus } from "@/types/print";

const POLL_MS = 2000;
const GIVE_UP_MS = 3 * 60_000;

const LABEL: Record<PrintStatus, string> = {
  waiting: "출력 대기 중…",
  printing: "출력 중…",
  completed: "출력 완료! 🎉",
  failed: "출력에 실패했어요. 직원에게 문의해 주세요.",
};

type State =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "tracking"; status: PrintStatus }
  | { kind: "error"; message: string };

export function PrintButton({ sessionId }: { sessionId: string | null }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!sessionId) {
    return (
      <Button variant="secondary" disabled className="w-full" title="원격 저장이 설정돼야 출력할 수 있어요">
        <Printer className="h-4 w-4" aria-hidden />
        출력 (원격 저장 필요)
      </Button>
    );
  }

  const poll = (startedAt: number) => {
    timer.current = setTimeout(async () => {
      const res = await fetchPrintStatus(sessionId);
      const status = res?.status ?? "waiting";
      setState({ kind: "tracking", status });
      if (status === "completed" || status === "failed") return;
      if (Date.now() - startedAt > GIVE_UP_MS) {
        setState({ kind: "error", message: "출력이 지연되고 있어요. 직원에게 문의해 주세요." });
        return;
      }
      poll(startedAt);
    }, POLL_MS);
  };

  const start = async () => {
    setState({ kind: "requesting" });
    const res = await requestPrint(sessionId);
    if (!res.ok) {
      setState({ kind: "error", message: res.message });
      return;
    }
    setState({ kind: "tracking", status: res.status });
    poll(Date.now());
  };

  const busy =
    state.kind === "requesting" ||
    (state.kind === "tracking" && (state.status === "waiting" || state.status === "printing"));
  const done = state.kind === "tracking" && state.status === "completed";

  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      <Button variant="secondary" onClick={start} disabled={busy || done} className="w-full">
        <Printer className="h-4 w-4" aria-hidden />
        {busy ? "출력 요청됨" : done ? "출력 완료" : state.kind === "tracking" ? "다시 출력" : "출력하기"}
      </Button>
      <p aria-live="polite" className="min-h-4 text-center text-xs text-muted">
        {state.kind === "tracking" && LABEL[state.status]}
        {state.kind === "error" && <span className="text-status-critical">{state.message}</span>}
      </p>
    </div>
  );
}
