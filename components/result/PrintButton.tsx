"use client";
// 출력 버튼 (설계도 7-6).
//  - 부스 프린터(출력 큐): 서버에 등록하고 상태를 폴링. 행사장 프린트 서버가 뽑는다.
//  - 이 기기에서 바로: 프린트 서버 없이 키오스크에 연결된 프린터로 (lib/print/browserPrint).
// 설정의 '인쇄 방식'이 auto 면 사진이 서버에 올라갔을 때 큐를 쓰고, 아니면 바로 인쇄로 넘어간다.
// 프린터 오류는 여기서만 표시되고 QR/다운로드 흐름에는 영향 없음.
import { useEffect, useRef, useState } from "react";
import { CircleAlert, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fetchPrintStatus, requestPrint, type BoothSession } from "@/lib/api";
import { printDirect } from "@/lib/print/browserPrint";
import { useSettings } from "@/lib/i18n/context";
import { errorKey } from "@/lib/i18n/errors";
import type { MessageKey } from "@/lib/i18n/messages";
import type { PrintStatus } from "@/types/print";

const POLL_MS = 2000;
const GIVE_UP_MS = 3 * 60_000;

const LABEL: Record<PrintStatus, MessageKey> = {
  waiting: "print.waiting",
  printing: "print.printing",
  completed: "print.completed",
  failed: "print.failed",
};

type State =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "tracking"; status: PrintStatus }
  | { kind: "sent" } // 이 기기에서 바로 인쇄 — 인쇄 대화상자로 넘어감
  | { kind: "error"; message: string };

// session = 서버에 올라간 세션(없으면 바로 인쇄만 가능), imageUrl = 완성본 dataURL
export function PrintButton({ session, imageUrl }: { session: BoothSession | null; imageUrl: string | null }) {
  const { t, printSize, printMode } = useSettings();
  const [state, setState] = useState<State>({ kind: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const poll = (startedAt: number, sessionId: string) => {
    timer.current = setTimeout(async () => {
      const res = await fetchPrintStatus(sessionId);
      const status = res?.status ?? "waiting";
      setState({ kind: "tracking", status });
      if (status === "completed" || status === "failed") return;
      if (Date.now() - startedAt > GIVE_UP_MS) {
        setState({ kind: "error", message: t("print.delayed") });
        return;
      }
      poll(startedAt, sessionId);
    }, POLL_MS);
  };

  if (printMode === "off") return null;
  const useQueue = printMode === "auto" && Boolean(session);

  const start = async () => {
    setState({ kind: "requesting" });
    if (useQueue && session) {
      const res = await requestPrint(session, printSize);
      if (!res.ok) {
        setState({ kind: "error", message: t(errorKey(res.error)) });
        return;
      }
      setState({ kind: "tracking", status: res.status });
      poll(Date.now(), session.id);
      return;
    }
    const res = await printDirect(imageUrl, printSize);
    setState(res.ok ? { kind: "sent" } : { kind: "error", message: t("print.noPrinter") });
  };

  const busy =
    state.kind === "requesting" ||
    (state.kind === "tracking" && (state.status === "waiting" || state.status === "printing"));
  const done = state.kind === "tracking" && state.status === "completed";
  const label = busy
    ? t("print.requested")
    : done
      ? t("print.doneBtn")
      : state.kind === "tracking" || state.kind === "sent"
        ? t("print.again")
        : t("print.go");

  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      <Button variant="secondary" onClick={start} disabled={busy || !imageUrl} className="w-full">
        <Printer className="h-4 w-4" aria-hidden />
        {label}
      </Button>
      <p aria-live="polite" className="min-h-4 text-center text-xs text-muted">
        {state.kind === "tracking" && t(LABEL[state.status])}
        {state.kind === "sent" && t("print.sentDirect")}
        {state.kind === "error" && (
          <span className="inline-flex items-start gap-1 text-foreground">
            <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            {state.message}
          </span>
        )}
      </p>
    </div>
  );
}
