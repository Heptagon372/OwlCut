// 직접 그린 SVG 그림 공용 도구 (AR 얼굴 효과·스티커·프레임 장식).
// - 그리기 도우미: svg(), pixelSvg(), 별·반짝이·하트 경로
// - 이미지 캐시: SVG 문자열 → data URL → HTMLImageElement (그리기 루프에서 동기로 꺼내 씀)
// SVG를 이미지로 쓰면 외부 폰트를 못 쓰므로 그림 안에 글자는 넣지 않는다 (글자 스티커는 lib/stickers/word.ts).

export const svg = (w: number, h: number, body: string, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}"${extra}>${body}</svg>`;

// 도트 그림: 문자 지도 → 1x1 사각형
export function pixelSvg(rows: string[], colors: Record<string, string>): string {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  let body = "";
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (colors[c]) body += `<rect x="${x}" y="${y}" width="1.04" height="1.04" fill="${colors[c]}"/>`;
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 16}" height="${h * 16}" shape-rendering="crispEdges">${body}</svg>`;
}

export const mirrorRow = (r: string) => [...r].reverse().join("");

export function starPath(cx: number, cy: number, r: number, inner = 0.45, points = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

export const sparklePath = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy - s}Q${cx + s * 0.16} ${cy - s * 0.16} ${cx + s} ${cy}Q${cx + s * 0.16} ${cy + s * 0.16} ${cx} ${cy + s}` +
  `Q${cx - s * 0.16} ${cy + s * 0.16} ${cx - s} ${cy}Q${cx - s * 0.16} ${cy - s * 0.16} ${cx} ${cy - s}Z`;

/** (x,y) = 왼쪽 위, s = 폭 */
export const heartPath = (x: number, y: number, s: number) =>
  `M${x} ${y + s * 0.3}C${x} ${y - s * 0.1} ${x + s * 0.45} ${y - s * 0.15} ${x + s * 0.5} ${y + s * 0.2}` +
  `C${x + s * 0.55} ${y - s * 0.15} ${x + s} ${y - s * 0.1} ${x + s} ${y + s * 0.3}` +
  `C${x + s} ${y + s * 0.6} ${x + s * 0.5} ${y + s * 0.9} ${x + s * 0.5} ${y + s * 0.9}` +
  `C${x + s * 0.5} ${y + s * 0.9} ${x} ${y + s * 0.6} ${x} ${y + s * 0.3}Z`;

/** 가운데 (cx,cy), 폭 s 인 하트 */
export const heartAt = (cx: number, cy: number, s: number) => heartPath(cx - s / 2, cy - s * 0.45, s);

/** 꽃잎 n장 꽃 (가운데 원 포함) */
export function flower(cx: number, cy: number, r: number, petal: string, center: string, n = 5, stroke = "none"): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    const a = (i * 360) / n;
    out += `<ellipse cx="${cx}" cy="${cy - r * 0.55}" rx="${r * 0.36}" ry="${r * 0.5}" fill="${petal}" stroke="${stroke}" stroke-width="2" transform="rotate(${a} ${cx} ${cy})"/>`;
  }
  return out + `<circle cx="${cx}" cy="${cy}" r="${r * 0.28}" fill="${center}"/>`;
}

// ---------- 이미지 캐시 ----------
const cache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

export const svgDataUrl = (s: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;

/** 로드된 그림 (없으면 null) */
export function getArt(key: string): HTMLImageElement | null {
  return cache.get(key) ?? null;
}

/** key 로 캐시하며 src(data URL 등)를 이미지로 로드 */
export function loadArt(key: string, src: string | null | undefined): Promise<HTMLImageElement | null> {
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(key);
  if (inflight) return inflight;
  if (!src || typeof Image === "undefined") return Promise.resolve(null);
  const p = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      cache.set(key, img);
      pending.delete(key);
      resolve(img);
    };
    img.onerror = () => {
      pending.delete(key);
      resolve(null);
    };
    img.src = src;
  });
  pending.set(key, p);
  return p;
}
