// 톤 커브 → 256단계 LUT (순수 함수). 제어점 사이를 단조 3차 보간(Fritsch–Carlson)해서
// 커브가 튀거나 역전되지 않게 한다 (포토샵/라이트룸 커브와 같은 성질).
import type { CurvePoint, FilterParams } from "@/types/filter";

const IDENTITY: CurvePoint[] = [[0, 0], [1, 1]];

export function curveLut(points: CurvePoint[] | undefined, size = 256): Uint8Array {
  const pts = normalizePoints(points);
  const n = pts.length;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);

  // 구간 기울기
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  // 접선 (Fritsch–Carlson)
  const m: number[] = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }

  const out = new Uint8Array(size);
  let seg = 0;
  for (let k = 0; k < size; k++) {
    const x = k / (size - 1);
    let y: number;
    if (x <= xs[0]) y = ys[0];
    else if (x >= xs[n - 1]) y = ys[n - 1];
    else {
      while (seg < n - 2 && x > xs[seg + 1]) seg++;
      const h = xs[seg + 1] - xs[seg];
      const t = (x - xs[seg]) / h;
      const t2 = t * t;
      const t3 = t2 * t;
      y =
        (2 * t3 - 3 * t2 + 1) * ys[seg] +
        (t3 - 2 * t2 + t) * h * m[seg] +
        (-2 * t3 + 3 * t2) * ys[seg + 1] +
        (t3 - t2) * h * m[seg + 1];
    }
    out[k] = Math.round(Math.min(Math.max(y, 0), 1) * 255);
  }
  return out;
}

// 범위 밖 값 자르기, x 정렬, 같은 x 중복 제거. 점이 2개 미만이면 직선.
function normalizePoints(points: CurvePoint[] | undefined): CurvePoint[] {
  if (!points || points.length < 2) return IDENTITY;
  const clamped = points
    .filter((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))
    .map(([x, y]) => [Math.min(Math.max(x, 0), 1), Math.min(Math.max(y, 0), 1)] as CurvePoint)
    .sort((a, b) => a[0] - b[0]);
  const uniq: CurvePoint[] = [];
  for (const p of clamped) if (!uniq.length || p[0] > uniq[uniq.length - 1][0]) uniq.push(p);
  return uniq.length >= 2 ? uniq : IDENTITY;
}

export function hasCurves(params: FilterParams): boolean {
  const c = params.curves;
  return Boolean(c && (c.rgb || c.r || c.g || c.b));
}

// 256x1 RGBA 텍스처 데이터: R/G/B = 채널별 커브, A = 전체(rgb) 커브
export function curveTextureData(params: FilterParams): Uint8Array {
  const rgb = curveLut(params.curves?.rgb);
  const r = curveLut(params.curves?.r);
  const g = curveLut(params.curves?.g);
  const b = curveLut(params.curves?.b);
  const data = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    data[i * 4] = r[i];
    data[i * 4 + 1] = g[i];
    data[i * 4 + 2] = b[i];
    data[i * 4 + 3] = rgb[i];
  }
  return data;
}
