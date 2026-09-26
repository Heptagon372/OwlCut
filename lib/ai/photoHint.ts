"use client";
// AI에게 함께 보낼 참고 사진 만들기 — 원본은 크고(1280px) 토큰도 비싸므로 작게 줄여 보낸다.
// 얼굴이 보일 정도면 충분하다 (인원·옷차림·배경·밝기 참고용).
const MAX_SIDE = 320;
const QUALITY = 0.7;

export async function smallPhoto(dataUrl: string | undefined | null): Promise<string | null> {
  if (!dataUrl || typeof document === "undefined") return null;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("load"));
      el.src = dataUrl;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", QUALITY);
  } catch {
    return null; // 사진을 못 만들어도 글만으로 요청은 된다
  }
}
