"use client";
import { useEffect, useState } from "react";
import { generateQrDataUrl } from "@/lib/qr/generateQr";

export function QRCodeView({ url }: { url: string }) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    generateQrDataUrl(url)
      .then((d) => active && setQr(d))
      .catch(() => active && setQr(null));
    return () => {
      active = false;
    };
  }, [url]);

  if (!qr) return <div className="h-48 w-48 animate-pulse rounded-xl bg-card" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={qr}
      alt="다운로드 QR 코드"
      width={192}
      height={192}
      className="rounded-xl bg-white p-2"
    />
  );
}
