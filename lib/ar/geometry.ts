// AR 배치 계산 — 순수 함수. 얼굴마다 "얼굴 좌표계"(x: 두 눈을 잇는 방향, y: 아래, 단위: 얼굴 폭)를 만들고
// 스티커를 그 좌표계에 놓는다 → 얼굴이 가까워지면 커지고, 기울면 같이 돈다.
import type { AnchorName, ArEffect, FaceGeometry, MosaicRegion, Placement, Pt, Warp, WarpSpec } from "@/types/ar";

export const MAX_WARPS = 8;
export const MAX_MOSAICS = 4;

export interface FaceFrame {
  width: number; // 얼굴 폭(px)
  height: number; // 이마~턱(px)
  angle: number; // 눈 기울기(라디안)
  ux: Pt; // 얼굴 가로축 단위벡터
  uy: Pt; // 얼굴 세로축(아래) 단위벡터
  anchors: Record<AnchorName, Pt>; // px
}

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function faceFrame(g: FaceGeometry, W: number, H: number): FaceFrame {
  const P = (p: Pt): Pt => ({ x: p.x * W, y: p.y * H });
  const eL = P(g.eyeLeft);
  const eR = P(g.eyeRight);
  const angle = Math.atan2(eR.y - eL.y, eR.x - eL.x);
  const ux = { x: Math.cos(angle), y: Math.sin(angle) };
  const uy = { x: -Math.sin(angle), y: Math.cos(angle) };
  const fL = P(g.faceLeft);
  const fR = P(g.faceRight);
  const width = Math.hypot(fR.x - fL.x, fR.y - fL.y) || 1;
  const forehead = P(g.forehead);
  const chin = P(g.chin);
  const height = Math.hypot(chin.x - forehead.x, chin.y - forehead.y) || width;
  const move = (p: Pt, dx: number, dy: number): Pt => ({
    x: p.x + (ux.x * dx + uy.x * dy) * width,
    y: p.y + (ux.y * dx + uy.y * dy) * width,
  });

  return {
    width,
    height,
    angle,
    ux,
    uy,
    anchors: {
      forehead,
      headTop: move(forehead, 0, -0.12), // 윤곽 맨 위(이마)보다 조금 위 = 정수리 쪽
      eyes: mid(eL, eR),
      eyeLeft: eL,
      eyeRight: eR,
      nose: P(g.nose),
      mouth: P(g.mouth),
      chin,
      cheekLeft: P(g.cheekLeft),
      cheekRight: P(g.cheekRight),
      faceCenter: mid(forehead, chin),
      earLeft: move(fL, 0, -0.08),
      earRight: move(fR, 0, -0.08),
    },
  };
}

/** 효과의 그림들을 얼굴마다 배치 (px) */
export function placements(effect: ArEffect, faces: FaceGeometry[], W: number, H: number): Placement[] {
  const out: Placement[] = [];
  for (const g of faces) {
    const f = faceFrame(g, W, H);
    for (const part of effect.parts) {
      const ats = Array.isArray(part.at) ? part.at : [part.at];
      ats.forEach((a, i) => {
        const flip = i === 1 && Boolean(part.mirrorSecond);
        const [ox0, oy] = part.offset ?? [0, 0];
        const ox = flip ? -ox0 : ox0; // 반대쪽은 가로 위치도 대칭
        const base = f.anchors[a];
        const rot = ((part.rotate ?? 0) * Math.PI) / 180;
        out.push({
          asset: part.asset,
          cx: base.x + (f.ux.x * ox + f.uy.x * oy) * f.width,
          cy: base.y + (f.ux.y * ox + f.uy.y * oy) * f.width,
          w: part.size * f.width,
          angle: f.angle + (flip ? -rot : rot),
          flip,
        });
      });
    }
  }
  return out;
}

/** 얼굴 왜곡(왕눈이 등) — 셰이더용. 좌표는 이미지 정규화, 반경은 px.
 *  extra 는 효과와 별개로 얹는 왜곡 (카메라 보정의 '갸름하게') */
export function effectWarps(
  effect: ArEffect | null,
  faces: FaceGeometry[],
  W: number,
  H: number,
  extra: WarpSpec[] = [],
): Warp[] {
  const specs = [...(effect?.warps ?? []), ...extra];
  if (!specs.length) return [];
  const out: Warp[] = [];
  for (const g of faces) {
    const f = faceFrame(g, W, H);
    for (const w of specs) {
      if (out.length >= MAX_WARPS) return out;
      const p = f.anchors[w.at];
      out.push({ x: p.x / W, y: p.y / H, r: w.radius * f.width, s: w.strength });
    }
  }
  return out;
}

/** 얼굴 모자이크 영역 (타원) */
export function mosaicRegions(effect: ArEffect | null, faces: FaceGeometry[], W: number, H: number): MosaicRegion[] {
  if (!effect?.mosaic) return [];
  return faces.slice(0, MAX_MOSAICS).map((g) => {
    const f = faceFrame(g, W, H);
    const c = f.anchors.faceCenter;
    return { x: c.x / W, y: c.y / H, rx: f.width * 0.62, ry: f.height * 0.68, angle: f.angle };
  });
}

/** 원본 이미지 px 배치 → 네컷 슬롯 px (cover 크롭 반영). 가로세로 비율이 같으므로 배율 하나 */
export function toSlot(
  p: Placement,
  crop: { sx: number; sy: number; sw: number },
  slot: { x: number; y: number; w: number },
): Placement {
  const k = slot.w / crop.sw;
  return { ...p, cx: slot.x + (p.cx - crop.sx) * k, cy: slot.y + (p.cy - (crop.sy)) * k, w: p.w * k };
}
