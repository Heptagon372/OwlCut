// AR 얼굴 효과 타입. 좌표는 모두 이미지 기준 0~1 정규화 (좌상단 원점).
// "왼쪽/오른쪽"은 항상 **이미지상** 왼쪽/오른쪽 (거울 반전 여부와 무관하게 x 순서로 정한다).

export interface Pt {
  x: number;
  y: number;
}

// 얼굴 1개의 AR 기준점 (Face Landmarker 478점 중 필요한 것만 추려 저장 — 사진마다 보관)
export interface FaceGeometry {
  eyeLeft: Pt;
  eyeRight: Pt;
  nose: Pt;
  mouth: Pt;
  mouthLeft: Pt;
  mouthRight: Pt;
  forehead: Pt; // 얼굴 윤곽 맨 위 (이마 위쪽)
  chin: Pt;
  cheekLeft: Pt;
  cheekRight: Pt;
  faceLeft: Pt; // 얼굴 윤곽 좌우 끝
  faceRight: Pt;
  mouthOpen: number; // 입 벌림 0..1 (얼굴 높이 대비)
}

export type AnchorName =
  | "forehead"
  | "headTop"
  | "eyes"
  | "eyeLeft"
  | "eyeRight"
  | "nose"
  | "mouth"
  | "chin"
  | "cheekLeft"
  | "cheekRight"
  | "faceCenter"
  | "earLeft"
  | "earRight";

// 얼굴에 붙는 그림 한 장. 위치·크기 단위 = 얼굴 폭 (얼굴이 가까우면 크게, 기울면 같이 회전)
export interface EffectPart {
  asset: string;                   // lib/ar/assets.ts 의 id
  at: AnchorName | AnchorName[];   // 여러 곳이면 같은 그림을 각각에 (예: 양 볼)
  offset?: [number, number];       // 얼굴 좌표계 기준 이동 (x: 눈 방향, y: 아래 방향), 얼굴 폭 단위
  size: number;                    // 그림 폭 (얼굴 폭 단위)
  mirrorSecond?: boolean;          // at 이 여러 곳일 때 두 번째는 좌우 반전 (양쪽 귀·리본 등)
  rotate?: number;                 // 추가 회전(도)
}

// 얼굴 부분을 부풀리는 왜곡 (왕눈이·퍼니 페이스). strength > 0 확대, < 0 축소
// 중심 배율 = 1/(1-strength) — 0.4 면 1.67배, 반경 절반 지점에서도 약 1.3배
export interface WarpSpec {
  at: AnchorName;
  radius: number;   // 얼굴 폭 단위
  strength: number; // -0.6..0.6
}

export type EffectCategory = "animal" | "lovely" | "funny" | "fx";

export interface ArEffect {
  id: string;
  label: string;
  labelEn?: string;   // 영어 설정에서 보여 줄 이름
  category: EffectCategory;
  parts: EffectPart[];
  warps?: WarpSpec[];
  mosaic?: boolean; // 얼굴 모자이크
}

// 렌더링용으로 계산된 배치 (픽셀 좌표)
export interface Placement {
  asset: string;
  cx: number;
  cy: number;
  w: number;
  angle: number; // 라디안
  flip: boolean;
}

// 셰이더에 넘기는 왜곡·모자이크 (이미지 정규화 좌표, 반경은 픽셀)
export interface Warp {
  x: number;
  y: number;
  r: number;
  s: number;
}

export interface MosaicRegion {
  x: number;
  y: number;
  rx: number; // 픽셀
  ry: number;
  angle: number;
}
