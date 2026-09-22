// 출력 관련 타입 (설계도 7-6).

export type PrintStatus = "waiting" | "printing" | "completed" | "failed";

// 프린트 서버가 가져가는 작업 1건
export interface PrintJob {
  id: string;
  session_id: string;
  image_url: string;
  copies: number;
}

// 부스 화면이 보는 출력 상태
export interface PrintStatusResponse {
  id: string;
  status: PrintStatus;
  error?: string | null;
}
