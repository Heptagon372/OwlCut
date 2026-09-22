// Face Landmarker(478점) → AR 기준점, 얼굴 박스, 떨림 보정 — 순수 함수.
import type { FaceGeometry, Pt } from "@/types/ar";
import type { Box } from "./framing";

// MediaPipe 얼굴 메시 표준 인덱스
export const LM = {
  forehead: 10,
  chin: 152,
  faceA: 234,
  faceB: 454,
  eyeA: [33, 133] as const, // 한쪽 눈 바깥·안쪽 꼬리
  eyeB: [362, 263] as const,
  nose: 1,
  lipUpper: 13,
  lipLower: 14,
  mouthA: 61,
  mouthB: 291,
  cheekA: 205,
  cheekB: 425,
} as const;

export const LANDMARK_COUNT = 468; // 이 이상이면 유효 (홍채 포함 모델은 478)

type Landmark = { x: number; y: number };

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const byX = (a: Pt, b: Pt): [Pt, Pt] => (a.x <= b.x ? [a, b] : [b, a]);

/**
 * 랜드마크 → AR 기준점. mirrored=true 면 x를 뒤집어 거울 화면/좌우 반전 캡처 좌표로.
 * 좌/우는 반전 후 x 순서로 정하므로 항상 "이미지상" 왼쪽/오른쪽.
 */
export function faceGeometryFromLandmarks(lms: Landmark[], mirrored = false): FaceGeometry | null {
  if (!lms || lms.length < LANDMARK_COUNT) return null;
  const p = (i: number): Pt => ({ x: mirrored ? 1 - lms[i].x : lms[i].x, y: lms[i].y });

  const [eyeLeft, eyeRight] = byX(mid(p(LM.eyeA[0]), p(LM.eyeA[1])), mid(p(LM.eyeB[0]), p(LM.eyeB[1])));
  const [mouthLeft, mouthRight] = byX(p(LM.mouthA), p(LM.mouthB));
  const [cheekLeft, cheekRight] = byX(p(LM.cheekA), p(LM.cheekB));
  const [faceLeft, faceRight] = byX(p(LM.faceA), p(LM.faceB));
  const forehead = p(LM.forehead);
  const chin = p(LM.chin);
  const faceH = dist(forehead, chin) || 1;

  return {
    eyeLeft,
    eyeRight,
    nose: p(LM.nose),
    mouth: mid(p(LM.lipUpper), p(LM.lipLower)),
    mouthLeft,
    mouthRight,
    forehead,
    chin,
    cheekLeft,
    cheekRight,
    faceLeft,
    faceRight,
    mouthOpen: Math.min(1, dist(p(LM.lipUpper), p(LM.lipLower)) / faceH / 0.25),
  };
}

/** 랜드마크 전체를 감싸는 박스 (자동 프레이밍용) */
export function landmarkBox(lms: Landmark[]): Box | null {
  if (!lms?.length) return null;
  let x1 = 1, y1 = 1, x2 = 0, y2 = 0;
  for (const l of lms) {
    if (l.x < x1) x1 = l.x;
    if (l.y < y1) y1 = l.y;
    if (l.x > x2) x2 = l.x;
    if (l.y > y2) y2 = l.y;
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// ---------- 떨림 보정: One Euro Filter (Casiez et al., CHI 2012) ----------
// 가만히 있을 땐 강하게 거르고(떨림 제거), 빠르게 움직이면 약하게 걸러(지연 최소) AR 스티커가 따라붙게 한다.
export class OneEuro {
  private x: number | null = null;
  private dx = 0;
  private t: number | null = null;

  constructor(
    private readonly minCutoff = 1.5, // Hz — 낮을수록 정지 시 더 부드럽게
    private readonly beta = 8, // 속도 반응 (정규화 좌표 기준)
    private readonly dCutoff = 1,
  ) {}

  filter(value: number, tMs: number): number {
    if (this.x === null || this.t === null) {
      this.x = value;
      this.t = tMs;
      return value;
    }
    const dt = Math.max((tMs - this.t) / 1000, 1e-3);
    this.t = tMs;
    const alpha = (cutoff: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff) / dt);
    this.dx += alpha(this.dCutoff) * ((value - this.x) / dt - this.dx);
    this.x += alpha(this.minCutoff + this.beta * Math.abs(this.dx)) * (value - this.x);
    return this.x;
  }
}

const POINT_KEYS = [
  "eyeLeft", "eyeRight", "nose", "mouth", "mouthLeft", "mouthRight",
  "forehead", "chin", "cheekLeft", "cheekRight", "faceLeft", "faceRight",
] as const;

function toVector(g: FaceGeometry): number[] {
  const v: number[] = [];
  for (const k of POINT_KEYS) v.push(g[k].x, g[k].y);
  v.push(g.mouthOpen);
  return v;
}

function fromVector(v: number[]): FaceGeometry {
  const g = {} as Record<string, Pt | number>;
  POINT_KEYS.forEach((k, i) => (g[k] = { x: v[i * 2], y: v[i * 2 + 1] }));
  g.mouthOpen = v[POINT_KEYS.length * 2];
  return g as unknown as FaceGeometry;
}

/** 여러 얼굴의 떨림 보정. 얼굴 순서는 코 x 좌표로 맞추고, 인원이 바뀌면 필터를 새로 시작한다. */
export class FaceSmoother {
  private filters: OneEuro[][] = [];

  smooth(faces: FaceGeometry[], tMs: number): FaceGeometry[] {
    const sorted = [...faces].sort((a, b) => a.nose.x - b.nose.x);
    if (sorted.length !== this.filters.length) {
      this.filters = sorted.map((f) => toVector(f).map(() => new OneEuro()));
    }
    return sorted.map((f, i) => fromVector(toVector(f).map((v, j) => this.filters[i][j].filter(v, tMs))));
  }

  reset() {
    this.filters = [];
  }
}

/** 모든 기준점에 같은 좌표 변환 (예: 전체 화면 → 가운데 정사각형 크롭 좌표). 좌우가 바뀌는 변환엔 mirrorFace */
export function transformFace(g: FaceGeometry, f: (p: Pt) => Pt): FaceGeometry {
  const out = { mouthOpen: g.mouthOpen } as FaceGeometry;
  for (const k of POINT_KEYS) out[k] = f(g[k]);
  return out;
}

/** 거울 반전 (화면 좌표 ↔ 비디오 좌표) — 좌/우 이름도 다시 맞춘다 */
export function mirrorFace(g: FaceGeometry): FaceGeometry {
  const m = (p: Pt): Pt => ({ x: 1 - p.x, y: p.y });
  return {
    eyeLeft: m(g.eyeRight),
    eyeRight: m(g.eyeLeft),
    nose: m(g.nose),
    mouth: m(g.mouth),
    mouthLeft: m(g.mouthRight),
    mouthRight: m(g.mouthLeft),
    forehead: m(g.forehead),
    chin: m(g.chin),
    cheekLeft: m(g.cheekRight),
    cheekRight: m(g.cheekLeft),
    faceLeft: m(g.faceRight),
    faceRight: m(g.faceLeft),
    mouthOpen: g.mouthOpen,
  };
}
