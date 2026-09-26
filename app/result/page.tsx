"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBoothStore } from "@/lib/store/boothStore";
import { composeToDataUrl } from "@/lib/image/compose";
import { buildComposeInput } from "@/lib/image/buildComposeInput";
import { UPLOAD_ATTEMPTS, localSession, uploadFinal, type BoothSession } from "@/lib/api";
import { QRCodeView } from "@/components/result/QRCodeView";
import { PrintButton } from "@/components/result/PrintButton";
import { Button } from "@/components/ui/Button";
import { Logo, OwlMark } from "@/components/brand/Logo";
import { IdleGuard } from "@/components/kiosk/IdleGuard";
import { Download, House, Images, RotateCw, Smartphone, WandSparkles, WifiOff } from "lucide-react";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { useT } from "@/lib/i18n/context";

// done = QR 준비됨 · local = 원격 저장을 쓸 수 없음(미설정/거절) → 로컬 저장만
// offline = 연결 문제로 3번 실패 → 연결되면(또는 20초마다) 자동으로 다시 올림 (설계도 10)
type Status = "composing" | "uploading" | "done" | "local" | "offline" | "error";

const AUTO_RETRY_MS = 20_000;

export default function ResultPage() {
  const router = useRouter();
  const t = useT();
  const { photos, design, sessionId, sessionToken, setSession, finalDataUrl, setFinal, reset } = useBoothStore();
  const [status, setStatus] = useState<Status>("composing");
  const [attempt, setAttempt] = useState(1);
  const [localReason, setLocalReason] = useState<"not_configured" | "rejected">("not_configured");
  const [remote, setRemote] = useState<string | null>(null);
  const [uploadedSession, setUploadedSession] = useState<BoothSession | null>(null);
  const sessionRef = useRef<BoothSession | null>(null);
  const uploadingRef = useRef(false);
  const mountedRef = useRef(false);

  const upload = useCallback(
    async (dataUrl: string) => {
      const session = sessionRef.current;
      if (!session || uploadingRef.current) return;
      uploadingRef.current = true;
      setStatus("uploading");
      const res = await uploadFinal(session, dataUrl, design, setAttempt);
      uploadingRef.current = false;
      if (!mountedRef.current) return;
      if (res.ok) {
        setFinal(dataUrl, res.downloadUrl);
        setRemote(res.downloadUrl);
        setUploadedSession(session);
        setStatus("done");
      } else if (res.reason === "failed") {
        setStatus("offline");
      } else {
        setLocalReason(res.reason);
        setStatus("local");
      }
    },
    [design, setFinal],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (photos.length === 0) return;
    let active = true;
    (async () => {
      try {
        setStatus("composing");
        const dataUrl = await composeToDataUrl(buildComposeInput(photos, design));
        if (!active) return;
        setFinal(dataUrl, null); // 올리는 동안에도 완성본을 보여 주고 바로 저장할 수 있게
        // 세션이 없으면(홈을 거치지 않음) 부스가 직접 id·토큰을 만든다
        const session = sessionId && sessionToken ? { id: sessionId, token: sessionToken } : localSession();
        if (session.id !== sessionId) setSession(session);
        sessionRef.current = session;
        await upload(dataUrl);
      } catch {
        if (active) setStatus("error");
      }
    })();
    return () => {
      active = false;
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 연결 문제로 실패했으면: 온라인 복귀 이벤트 + 주기적으로 다시 올림 (와이파이는 붙어 있는데 인터넷만 끊긴 경우 대비)
  useEffect(() => {
    if (status !== "offline" || !finalDataUrl) return;
    const retry = () => void upload(finalDataUrl);
    window.addEventListener("online", retry);
    const timer = setInterval(retry, AUTO_RETRY_MS);
    return () => {
      window.removeEventListener("online", retry);
      clearInterval(timer);
    };
  }, [status, finalDataUrl, upload]);

  const goHome = () => {
    reset();
    router.push("/");
  };

  if (photos.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="glass w-full rounded-card p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink text-white">
            <Images className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-4 text-xl font-semibold">{t("result.emptyTitle")}</p>
          <Button className="mt-6" onClick={() => router.push("/")}>
            {t("common.home")}
          </Button>
        </div>
      </main>
    );
  }

  const download = () => {
    if (!finalDataUrl) return;
    const a = document.createElement("a");
    a.href = finalDataUrl;
    a.download = `owlcut_${Date.now()}.png`;
    a.click();
  };

  const statusText =
    status === "composing"
      ? t("result.composing")
      : status === "uploading"
        ? attempt > 1
          ? t("result.savingRetry", { n: attempt, total: UPLOAD_ATTEMPTS })
          : t("result.saving")
        : status === "error"
          ? t("result.composeFailed")
          : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:py-8">
      {/* QR을 찍고 떠나는 경우가 많아 짧게 */}
      <IdleGuard seconds={60} />
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          <SettingsSheet />
          <Button variant="secondary" size="sm" onClick={goHome}>
            <House className="h-4 w-4" aria-hidden />
            {t("common.home")}
          </Button>
        </div>
      </header>

      <section className="grid flex-1 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* 완성 이미지 */}
        <div className="glass rounded-card p-4">
          <div className="grid min-h-[60vh] place-items-center rounded-[22px] bg-white/35 p-5">
            {finalDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={finalDataUrl}
                alt={t("result.alt")}
                className="max-h-[70vh] rounded-md shadow-[0_28px_56px_-24px_rgba(0,0,0,0.5)]"
              />
            ) : (
              <div className="h-[56vh] w-56 animate-pulse rounded-md bg-white/60" />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* QR (검은 카드) */}
          <div className="ink rounded-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-ink-muted">S.OWL PHOTO BOOTH</p>
                <h1 className="mt-1 text-5xl font-[200] tracking-[-0.04em]">{t("result.done")}</h1>
              </div>
              <OwlMark className="h-10 w-10 text-white" />
            </div>

            <div className="mt-6" aria-live="polite">
              {statusText && (
                <p className={`text-sm ${status === "error" ? "text-[#ff8a8a]" : "text-ink-muted"}`}>{statusText}</p>
              )}
              {status === "done" && remote && (
                <div className="flex items-center gap-4">
                  <div className="shrink-0 rounded-2xl bg-white p-1.5">
                    <QRCodeView url={remote} size={140} />
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <Smartphone className="h-4 w-4" aria-hidden />
                      {t("result.toPhone")}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">{t("result.scanHint")}</p>
                    <a
                      href={remote}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block truncate text-xs text-ink-muted underline"
                    >
                      {remote}
                    </a>
                  </div>
                </div>
              )}
              {status === "local" && (
                <p className="text-sm text-ink-muted">
                  {localReason === "not_configured" ? t("result.noRemote") : t("result.uploadFailed")}
                </p>
              )}
              {status === "offline" && (
                <div className="space-y-3">
                  <p className="flex items-start gap-2 text-sm text-ink-muted">
                    <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {t("result.offline")}
                  </p>
                  <Button variant="light" size="sm" onClick={() => finalDataUrl && void upload(finalDataUrl)}>
                    <RotateCw className="h-4 w-4" aria-hidden />
                    {t("common.retry")}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 저장 · 출력 */}
          <div className="glass flex flex-col gap-3 rounded-card p-5">
            <Button size="lg" onClick={download} disabled={!finalDataUrl} className="w-full">
              <Download className="h-5 w-5" aria-hidden />
              {t("result.save")}
            </Button>
            {/* 완성 뒤에도 더 꾸밀 수 있게 — 디자인·사진은 그대로 있고 다시 완성하면 같은 세션에 덮어쓴다(멱등) */}
            <Button variant="secondary" onClick={() => router.push("/edit")} className="w-full">
              <WandSparkles className="h-4 w-4" aria-hidden />
              {t("result.decorateMore")}
            </Button>
            {/* 출력은 사진이 서버에 올라가야 가능 — 안 되는 상황이면 버튼을 아예 숨긴다 */}
            {uploadedSession && <PrintButton session={uploadedSession} />}
          </div>
        </div>
      </section>
    </main>
  );
}
