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

  if (photos.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="text-lg text-muted">완성할 사진이 없어요.</p>
        <Button onClick={() => router.push("/")}>처음으로</Button>
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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-4 py-6 md:flex-row md:items-start md:justify-center">
      <div className="flex justify-center">
        {finalDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={finalDataUrl}
            alt="완성된 네컷"
            className="max-h-[74vh] rounded-2xl border border-border"
          />
        ) : (
          <div className="h-96 w-64 animate-pulse rounded-2xl bg-card" />
        )}
      </div>

      <div className="flex w-full max-w-xs flex-col items-center gap-4">
        <h1 className="text-3xl font-black">완성! 🦉</h1>

        {status === "composing" && <p className="text-muted">합성 중…</p>}
        {status === "uploading" && <p className="text-muted">저장 중…</p>}
        {status === "done" && remote && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-sm text-muted">QR을 스캔해 폰으로 받으세요</p>
            <QRCodeView url={remote} />
            <a
              href={remote}
              target="_blank"
              rel="noreferrer"
              className="max-w-full break-all text-center text-xs text-accent-2 underline"
            >
              {remote}
            </a>
          </div>
        )}
        {status === "done" && !remote && (
          <p className="text-center text-sm text-muted">
            원격 저장이 설정되지 않아 QR은 비활성화됐어요. 아래에서 바로 다운로드하세요.
          </p>
        )}
        {status === "error" && (
          <p className="text-center text-red-400">합성에 실패했어요. 다시 시도해 주세요.</p>
        )}

        <Button onClick={download} disabled={!finalDataUrl} className="w-full">
          다운로드
        </Button>
        <PrintButton sessionId={uploadedSessionId} />
        <Button
          variant="ghost"
          onClick={() => {
            reset();
            router.push("/");
          }}
          className="w-full"
        >
          처음으로
        </Button>
      </div>
    </main>
  );
}
