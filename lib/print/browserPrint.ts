"use client";
// 프린트 서버 없이 이 기기에 연결된 프린터로 바로 인쇄.
// 숨긴 iframe 에 완성 이미지 한 장만 담고 @page 로 용지 크기를 지정한다.
// (크롬/엣지를 --kiosk-printing 으로 띄우면 대화상자 없이 바로 나간다.)
import { PRINT_SPEC, type PrintSize } from "@/lib/settings/settings";

/** 사진이 용지에 꽉 차되 잘리지 않게: 여백 0 + object-fit: contain */
export function printPageHtml(imageUrl: string, size: PrintSize): string {
  const [w, h] = PRINT_SPEC[size].mm;
  // 가로로 긴 사진이면 용지도 가로로 (스트립은 세로 그대로)
  return `<!doctype html><html><head><meta charset="utf-8"><title>OwlCut</title><style>
  @page { size: ${w}mm ${h}mm; margin: 0; }
  @media print { html, body { width: ${w}mm; height: ${h}mm; } }
  html, body { margin: 0; padding: 0; background: #fff; }
  img { width: 100%; height: 100%; object-fit: contain; display: block; }
  </style></head><body><img src="${imageUrl}" alt=""></body></html>`;
}

export type DirectPrintResult = { ok: true } | { ok: false; error: "no_image" | "blocked" };

/** 인쇄 창을 띄운다. 이미지가 준비된 뒤에 부르고, 결과 화면에서 상태를 보여 줄 것 */
export async function printDirect(imageUrl: string | null, size: PrintSize, copies = 1): Promise<DirectPrintResult> {
  if (!imageUrl) return { ok: false, error: "no_image" };
  if (typeof document === "undefined") return { ok: false, error: "blocked" };

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;";
  document.body.appendChild(frame);

  try {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) return { ok: false, error: "blocked" };
    doc.open();
    doc.write(printPageHtml(imageUrl, size));
    doc.close();

    // 이미지가 그려진 뒤에 인쇄해야 빈 종이가 나오지 않는다
    const img = doc.querySelector("img");
    if (img && !img.complete) {
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 4000);
      });
    }
    for (let i = 0; i < Math.max(1, copies); i++) {
      win.focus();
      win.print();
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "blocked" };
  } finally {
    // 인쇄 대화상자가 닫힌 뒤 치운다 (바로 지우면 미리보기가 비는 브라우저가 있음)
    setTimeout(() => frame.remove(), 15_000);
  }
}
