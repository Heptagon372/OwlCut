// 부스가 쓰는 저장소(표 + 파일)의 공통 약속. Supabase 와 Firebase 두 가지로 구현한다.
// 라우트·도메인 코드는 이 인터페이스만 보고, 어떤 서비스인지는 lib/db/index.ts 가 고른다.
// 시각은 어디서나 ISO 문자열(UTC) — 문자열 비교만으로 기간 조회가 되어 두 저장소가 같게 동작한다.
import type { PrintStatus } from "@/types/print";

export type StoreKind = "supabase" | "firebase";

export interface SessionRow {
  id: string;
  status: string;
  created_at?: string | null;
  expires_at?: string | null;
  upload_token_hash?: string | null;
}

export interface DesignRow {
  id?: string;
  session_id: string;
  mode?: string | null;
  prompt?: string | null;
  frame?: string | null;
  stickers?: unknown;
  text_layers?: unknown;
  filter?: string | null;
  layout?: string | null;
  layout_options?: unknown;
  ai_model?: string | null;
  final_image_path?: string | null;
  created_at?: string;
}

/** 관리자 통계에서 쓰는 최소 필드 */
export type DesignUsageRow = Pick<DesignRow, "filter" | "layout" | "layout_options">;

export interface PrintRow {
  id: string;
  session_id: string;
  image_path: string | null;
  copies: number;
  printer?: string | null;
  status: PrintStatus;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeviceRow {
  id: string;
  kind: string;
  last_seen_at: string;
  info: Record<string, unknown> | null;
}

export interface AiRequestRow {
  model: string | null;
  ok: boolean;
  error?: string | null;
  latency_ms: number;
  created_at?: string;
}

export interface FailedPrint {
  id: string;
  error: string | null;
  printer: string | null;
  updated_at: string | null;
}

export interface BoothStore {
  readonly kind: StoreKind;

  // ---------- 세션 ----------
  getSession(id: string): Promise<SessionRow | null>;
  insertSession(row: SessionRow): Promise<void>;
  updateSession(id: string, patch: Partial<SessionRow>): Promise<void>;
  countSessionsSince(iso: string): Promise<number>;
  /** 보관기간이 지났는데 아직 정리 안 된 세션 (cleanup) */
  listExpiredSessionIds(nowIso: string, limit: number): Promise<string[]>;
  markSessionsExpired(ids: string[]): Promise<void>;

  // ---------- 디자인 ----------
  /** 완성본이 있는 가장 최근 디자인 (없으면 null) */
  latestFinalDesign(sessionId: string): Promise<{ id: string; final_image_path: string | null } | null>;
  /** 세션당 1행: 있으면 덮어쓰고 없으면 만든다 (재시도해도 완성 수가 늘지 않게) */
  saveFinalDesign(sessionId: string, row: Partial<DesignRow>): Promise<"inserted" | "updated">;
  insertDesign(row: Partial<DesignRow> & { session_id: string }): Promise<void>;
  /** 방문자가 직접 쓴 값(프롬프트·문구)만 비운다 — 선택값은 통계로 남김 */
  scrubDesigns(sessionIds: string[]): Promise<void>;
  countFinalDesignsSince(iso: string, opts?: { mode?: string }): Promise<number>;
  listFinalDesignsSince(iso: string, limit: number): Promise<DesignUsageRow[]>;

  // ---------- 원본 사진 ----------
  insertPhoto(row: { session_id: string; order_index: number; image_path: string }): Promise<void>;

  // ---------- 출력 큐 ----------
  countPrints(sessionId: string): Promise<number>;
  insertPrint(row: { session_id: string; image_path: string; copies: number }): Promise<{ id: string; status: PrintStatus }>;
  latestPrint(sessionId: string): Promise<{ id: string; status: PrintStatus; error: string | null } | null>;
  /** printing 상태로 멈춘 작업을 실패 처리 (프린트 서버가 죽은 경우) */
  failStuckPrints(beforeIso: string): Promise<void>;
  listWaitingPrintIds(limit: number): Promise<string[]>;
  /** 대기 중일 때만 가져간다 (두 프린터가 같은 작업을 뽑지 않게). 이미 가져갔으면 null */
  claimPrint(id: string, printer: string): Promise<PrintRow | null>;
  /** 자기가 가져간 작업만 보고 가능. 대상이 없으면 null */
  finishPrint(
    id: string,
    printer: string,
    status: Extract<PrintStatus, "completed" | "failed">,
    error?: string,
  ): Promise<{ session_id: string } | null>;
  failPrint(id: string, error: string): Promise<void>;
  failWaitingPrints(sessionIds: string[], error: string): Promise<void>;
  countPrintsByStatus(status: PrintStatus, sinceIso?: string): Promise<number>;
  listRecentFailedPrints(limit: number): Promise<FailedPrint[]>;

  // ---------- 장비 (프린트 서버 heartbeat) ----------
  upsertDevice(row: DeviceRow): Promise<void>;
  listDevices(limit: number): Promise<DeviceRow[]>;

  // ---------- AI 사용량 ----------
  insertAiRequest(row: AiRequestRow): Promise<void>;
  listAiRequestsSince(iso: string, limit: number): Promise<{ model: string | null; ok: boolean; latency_ms: number | null }[]>;

  // ---------- 파일 (비공개 저장소 + 서명 URL) ----------
  upload(path: string, body: Buffer, contentType: string): Promise<void>;
  /** 만료되는 읽기 URL. downloadName 을 주면 그 이름으로 내려받게 한다 */
  signedUrl(path: string, seconds: number, downloadName?: string): Promise<string | null>;
  listFiles(folder: string, limit: number): Promise<string[]>;
  /** 지운 파일 수. 없는 파일은 오류가 아니다 */
  removeFiles(paths: string[]): Promise<number>;
}
