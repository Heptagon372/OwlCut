// 세션 관련 타입 (설계도 5. 세션 상태 머신).
import type { Focus } from "./design";

export type SessionStatus =
  | "created"
  | "capturing"
  | "captured"
  | "editing"
  | "composed"
  | "qr_issued"
  | "printed"
  | "expired";

export interface Session {
  id: string;
  status: SessionStatus;
  created_at?: string;
  expires_at?: string;
}

// 촬영된 사진 1장 (클라이언트 로컬 상태)
export interface CapturedPhoto {
  dataUrl: string;
  orderIndex: number;
  focus?: Focus | null; // 얼굴 추적으로 얻은 크롭 초점 (추적 실패 시 null)
}
