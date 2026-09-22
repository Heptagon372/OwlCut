// 관리자 대시보드 통계 (GET /api/admin/stats 응답). 클라이언트/서버 공용 타입.
import type { ProviderId } from "./ai";

export interface AdminConfigStatus {
  supabase: boolean;
  aiProviders: ProviderId[];  // 키가 설정된 프로바이더
  printToken: boolean;
  appUrl: string | null;
}

export interface AdminDevice {
  id: string;
  lastSeenAt: string;
  online: boolean;
  platform: string | null;
  dryRun: boolean;
  systemPrinter: string | null;
}

export interface AdminModelUsage {
  model: string;
  requests: number;
  success: number;
  avgLatencyMs: number | null;
}

export interface AdminPrintFailure {
  id: string;
  error: string | null;
  printer: string | null;
  updatedAt: string;
}

export interface AdminStats {
  generatedAt: string;
  config: AdminConfigStatus;
  // Supabase 미설정이면 아래는 null
  today: {
    sessions: number;
    sessionsLastHour: number;
    completed: number;
    completedAi: number;
    aiRequests: number;
    aiSuccess: number;
    printsCompleted: number;
  } | null;
  printQueue: { waiting: number; printing: number; failedToday: number } | null;
  recentFailures: AdminPrintFailure[];
  devices: AdminDevice[];
  aiByModel: AdminModelUsage[];
}
