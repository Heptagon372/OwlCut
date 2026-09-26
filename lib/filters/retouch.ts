// 카메라 보정 — 필터와 따로, 어떤 필터를 골라도 위에 얹힌다 (부스에서 가장 많이 찾는 세 가지).
//   skin  피부 보정: 피부색 영역만 부드럽게 + 아주 옅은 광
//   bright 밝기: 노출 + 그림자 띄우기 (역광에서도 얼굴이 밝게)
//   slim  갸름하게: 얼굴 윤곽을 안쪽으로 당기는 왜곡 (얼굴을 찾았을 때만)
// 값은 0~1. 사진은 원본으로 저장하고 보정값만 들고 다니다가 그릴 때 적용한다(비파괴).
import type { FilterParams } from "@/types/filter";
import type { WarpSpec } from "@/types/ar";
import type { Retouch } from "@/types/design";

export const DEFAULT_RETOUCH: Retouch = { skin: 0, bright: 0, slim: 0 };

// 가장 센 값에서도 "보정한 티"가 과하지 않게 잡은 상한
const MAX_SMOOTH = 0.6;
const MAX_GLOW = 0.18;
const MAX_EXPOSURE = 0.28;
const MAX_SHADOWS = 0.3;
const MAX_SLIM = 0.28; // 왜곡 세기 (|s| < 1 이어야 접히지 않음)

const clamp01 = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0);

export function clampRetouch(r: Partial<Retouch> | null | undefined): Retouch {
  return { skin: clamp01(r?.skin), bright: clamp01(r?.bright), slim: clamp01(r?.slim) };
}

export const isRetouchOn = (r: Retouch | null | undefined): boolean =>
  Boolean(r && (r.skin > 0 || r.bright > 0 || r.slim > 0));

/** 필터 파라미터 위에 보정을 얹는다 (순수 함수). 필터가 이미 쓰는 값과는 더 센 쪽으로 합친다 */
export function withRetouch(params: FilterParams, retouch: Retouch | null | undefined): FilterParams {
  const r = clampRetouch(retouch);
  if (!isRetouchOn(r)) return params;
  const out: FilterParams = { ...params };
  if (r.skin > 0) {
    // 필터가 이미 피부를 부드럽게 한다면 더 센 쪽을 쓴다 (겹쳐서 뭉개지지 않게)
    out.smooth = Math.max(params.smooth ?? 0, r.skin * MAX_SMOOTH);
    out.glow = Math.max(params.glow ?? 0, r.skin * MAX_GLOW);
  }
  if (r.bright > 0) {
    out.exposure = (params.exposure ?? 0) + r.bright * MAX_EXPOSURE;
    out.shadows = (params.shadows ?? 0) + r.bright * MAX_SHADOWS;
    out.highlights = (params.highlights ?? 0) - r.bright * 0.15; // 밝힐 때 하이라이트가 날아가지 않게
  }
  return out;
}

/** 갸름하게 — 턱 양옆을 안쪽으로. 얼굴 기준 좌표라 거리·각도가 달라져도 같은 결과 */
export function retouchWarps(retouch: Retouch | null | undefined): WarpSpec[] {
  const { slim } = clampRetouch(retouch);
  if (slim <= 0) return [];
  return [{ at: "mouth", radius: 0.85, strength: -slim * MAX_SLIM }];
}

/** 화면에 보여 줄 단계 (0·약·보통·강) — 슬라이더 대신 누르는 부스 조작에 맞춘다 */
export const RETOUCH_STEPS = [0, 0.35, 0.65, 1] as const;
