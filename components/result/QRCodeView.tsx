"use client";
import { useEffect, useState } from "react";
import { generateQrDataUrl } from "@/lib/qr/generateQr";

export function QRCodeView({ url, size = 192 }: { url: string; size?: number }) {
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

  if (!qr) return <div className="animate-pulse rounded-xl bg-black/10" style={{ width: size, height: size }} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={qr} alt="다운로드 QR 코드" width={size} height={size} className="rounded-xl bg-white" />
  );
}
