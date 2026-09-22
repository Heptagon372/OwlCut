// 자동 프레이밍 판단 로직 — 순수 함수 (설계도 7-2).
// 좌표는 모두 원본 비디오 기준 0~1 정규화. 여러 명이면 얼굴 박스들의 합집합으로 판단.
import type { Focus } from "@/types/design";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type FramingState = "none" | "move-left" | "move-right" | "closer" | "farther" | "good";

export interface FramingHint {
  state: FramingState;
  message: string;
}

const CENTER_TOLERANCE = 0.15; // 화면 중앙 ±15% 안이면 OK
const MIN_FACE_HEIGHT = 0.12;  // 이보다 작으면 너무 멂
const MAX_FACE_HEIGHT = 0.5;   // 이보다 크면 너무 가까움
const MAX_GROUP_WIDTH = 0.9;   // 단체 촬영에서 좌우가 잘리는 폭

export function toBox(
  bb: { originX: number; originY: number; width: number; height: number },
  videoWidth: number,
  videoHeight: number,
): Box {
  return {
    x: bb.originX / videoWidth,
    y: bb.originY / videoHeight,
    w: bb.width / videoWidth,
    h: bb.height / videoHeight,
  };
}

export function unionBox(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  const x1 = Math.min(...boxes.map((b) => b.x));
  const y1 = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x + b.w));
  const y2 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// 얼굴 박스들 중 가장 큰 얼굴 높이 (단체 박스 높이는 거리 판단에 부적합)
export function largestFaceHeight(boxes: Box[]): number {
  return boxes.reduce((m, b) => Math.max(m, b.h), 0);
}

// mirrored=true 면 미리보기가 거울처럼 보이므로, 화면상 이동 방향 = 사용자의 이동 방향.
export function framingHint(
  group: Box | null,
  faceHeight: number,
  mirrored: boolean,
): FramingHint {
  if (!group) return { state: "none", message: "얼굴이 보이도록 카메라를 봐 주세요" };

  const cx = group.x + group.w / 2;
  const displayX = mirrored ? 1 - cx : cx;

  if (faceHeight < MIN_FACE_HEIGHT) return { state: "closer", message: "조금 더 가까이 와 주세요" };
  if (faceHeight > MAX_FACE_HEIGHT || group.w > MAX_GROUP_WIDTH) {
    return { state: "farther", message: "한 걸음 뒤로 가 주세요" };
  }

  // 화면에서 인물이 왼쪽에 치우침 → 화면상 오른쪽으로 옮겨야 함
  const needsScreenRight = displayX < 0.5 - CENTER_TOLERANCE;
  const needsScreenLeft = displayX > 0.5 + CENTER_TOLERANCE;
  if (needsScreenRight || needsScreenLeft) {
    // 거울 화면이면 화면 방향 = 사용자 방향, 아니면 반대
    const userMovesRight = mirrored ? needsScreenRight : needsScreenLeft;
    return userMovesRight
      ? { state: "move-right", message: "오른쪽으로 조금 이동해 주세요" }
      : { state: "move-left", message: "왼쪽으로 조금 이동해 주세요" };
  }

  return { state: "good", message: "좋아요! 이대로 👍" };
}

// 캡처 이미지 기준 크롭 초점. 캡처가 좌우 반전되면 x도 반전.
export function focusFromBox(group: Box | null, mirrored: boolean): Focus | null {
  if (!group) return null;
  const cx = group.x + group.w / 2;
  const cy = group.y + group.h / 2;
  return { x: mirrored ? 1 - cx : cx, y: cy };
}
