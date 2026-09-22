"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBoothStore } from "@/lib/store/boothStore";
import { composeToDataUrl } from "@/lib/image/compose";
import { buildComposeInput } from "@/lib/image/buildComposeInput";
import { uploadFinal } from "@/lib/api";
import { QRCodeView } from "@/components/result/QRCodeView";
import { PrintButton } from "@/components/result/PrintButton";
import { Button } from "@/components/ui/Button";
import { Logo, OwlMark } from "@/components/brand/Logo";
import { IdleGuard } from "@/components/kiosk/IdleGuard";
import { Download, House, Images, Smartphone } from "lucide-react";

type Status = "composing" | "uploading" | "done" | "error";

export default function ResultPage() {
  const router = useRouter();
  const { photos, design, sessionId, setSessionId, finalDataUrl, setFinal, reset } = useBoothStore();
  const [status, setStatus] = useState<Status>("composing");
  const [remote, setRemote] = useState<string | null>(null);
  const [uploadedSessionId, setUploadedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (photos.length === 0) return;
    let active = true;
    (async () => {
      try {
        setStatus("composing");
        const dataUrl = await composeToDataUrl(buildComposeInput(photos, design));
        if (!active) return;
        setStatus("uploading");
        const sid = sessionId ?? crypto.randomUUID();
        if (!sessionId) setSessionId(sid);
        const result = await uploadFinal(sid, dataUrl, design);
        if (!active) return;
        setFinal(dataUrl, result?.downloadUrl ?? null);
        setRemote(result?.downloadUrl ?? null);
        setUploadedSessionId(result ? sid : null);
        setStatus("done");
      } catch {
        if (active) setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <p className="mt-4 text-xl font-semibold">완성할 사진이 없어요</p>
          <Button className="mt-6" onClick={() => router.push("/")}>
            처음으로
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
    status === "composing" ? "합성 중…" : status === "uploading" ? "저장 중…" : status === "error" ? "합성에 실패했어요" : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:py-8">
      {/* QR을 찍고 떠나는 경우가 많아 짧게 */}
      <IdleGuard seconds={60} />
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <Button variant="secondary" size="sm" onClick={goHome}>
          <House className="h-4 w-4" aria-hidden />
          처음으로
        </Button>
      </header>

      <section className="grid flex-1 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* 완성 이미지 */}
        <div className="glass rounded-card p-4">
          <div className="grid min-h-[60vh] place-items-center rounded-[22px] bg-white/35 p-5">
            {finalDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={finalDataUrl}
                alt="완성된 네컷"
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
                <h1 className="mt-1 text-5xl font-[200] tracking-[-0.04em]">완성!</h1>
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
                      폰으로 받기
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">휴대폰 카메라로 QR을 스캔하세요</p>
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
              {status === "done" && !remote && (
                <p className="text-sm text-ink-muted">원격 저장이 설정되지 않아 QR은 꺼져 있어요. 아래에서 바로 저장하세요.</p>
              )}
            </div>
          </div>

          {/* 저장 · 출력 */}
          <div className="glass flex flex-col gap-3 rounded-card p-5">
            <Button size="lg" onClick={download} disabled={!finalDataUrl} className="w-full">
              <Download className="h-5 w-5" aria-hidden />
              이미지 저장
            </Button>
            <PrintButton sessionId={uploadedSessionId} />
          </div>
        </div>
      </section>
    </main>
  );
}
