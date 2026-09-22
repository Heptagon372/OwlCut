// 색 유틸 — 순수 함수.

// #rrggbb → WCAG 상대 휘도 (0=검정, 1=흰색). 형식이 틀리면 null.
export function relativeLuminance(hex: string): number | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return null;
  const [r, g, b] = m.slice(1).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const DARK = "#111111";
const LIGHT = "#f5f5f5";

// 배경 위에서 잘 읽히는 글자색 (대비가 더 큰 쪽)
export function readableTextOn(background: string, fallback = DARK): string {
  const L = relativeLuminance(background);
  if (L === null) return fallback;
  const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return contrast(L, relativeLuminance(DARK)!) >= contrast(L, relativeLuminance(LIGHT)!) ? DARK : LIGHT;
}
