// 관리자 대시보드 통계 집계 (설계도 Phase 8). 서버 전용.
// "오늘"은 한국 시간(KST) 자정 기준. 테이블이 없거나 쿼리가 실패한 항목은 0/빈 목록으로 처리.
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { PROVIDERS } from "@/lib/ai/registry";
import { isPrintTokenConfigured } from "@/lib/printer/auth";
import type { ProviderId } from "@/types/ai";
import type { AdminModelUsage, AdminStats } from "@/types/admin";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const DEVICE_ONLINE_MS = 30_000; // 프린트 서버는 3초마다 heartbeat

export function startOfTodayKST(now = new Date()): Date {
  const k = new Date(now.getTime() + KST_OFFSET_MS);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - KST_OFFSET_MS);
}

export function summarizeByModel(
  rows: { model: string | null; ok: boolean; latency_ms: number | null }[],
): AdminModelUsage[] {
  const map = new Map<string, { requests: number; success: number; latencySum: number; latencyN: number }>();
  for (const r of rows) {
    const key = r.model ?? "(알 수 없음)";
    const m = map.get(key) ?? { requests: 0, success: 0, latencySum: 0, latencyN: 0 };
    m.requests++;
    if (r.ok) m.success++;
    if (typeof r.latency_ms === "number") {
      m.latencySum += r.latency_ms;
      m.latencyN++;
    }
    map.set(key, m);
  }
  return [...map.entries()]
    .map(([model, m]) => ({
      model,
      requests: m.requests,
      success: m.success,
      avgLatencyMs: m.latencyN ? Math.round(m.latencySum / m.latencyN) : null,
    }))
    .sort((a, b) => b.requests - a.requests);
}

function configStatus(): AdminStats["config"] {
  return {
    supabase: isSupabaseConfigured(),
    aiProviders: (Object.keys(PROVIDERS) as ProviderId[]).filter((id) => PROVIDERS[id].isConfigured()),
    printToken: isPrintTokenConfigured(),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
  };
}

export async function getAdminStats(now = new Date()): Promise<AdminStats> {
  const base: AdminStats = {
    generatedAt: now.toISOString(),
    config: configStatus(),
    today: null,
    printQueue: null,
    recentFailures: [],
    devices: [],
    aiByModel: [],
  };
  if (!base.config.supabase) return base;

  const db = getSupabaseAdmin();
  const today = startOfTodayKST(now).toISOString();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count, error } = await q;
    return error ? 0 : (count ?? 0);
  };
  const head = { count: "exact" as const, head: true };

  const [
    sessions, sessionsLastHour, completed, completedAi,
    waiting, printing, printsCompleted, failedToday,
    aiRows, failures, devices,
  ] = await Promise.all([
    count(db.from("sessions").select("id", head).gte("created_at", today)),
    count(db.from("sessions").select("id", head).gte("created_at", hourAgo)),
    count(db.from("designs").select("id", head).not("final_image_path", "is", null).gte("created_at", today)),
    count(db.from("designs").select("id", head).not("final_image_path", "is", null).eq("mode", "ai").gte("created_at", today)),
    count(db.from("prints").select("id", head).eq("status", "waiting")),
    count(db.from("prints").select("id", head).eq("status", "printing")),
    count(db.from("prints").select("id", head).eq("status", "completed").gte("updated_at", today)),
    count(db.from("prints").select("id", head).eq("status", "failed").gte("updated_at", today)),
    db.from("ai_requests").select("model, ok, latency_ms").gte("created_at", today).limit(5000),
    db.from("prints").select("id, error, printer, updated_at").eq("status", "failed").order("updated_at", { ascending: false }).limit(5),
    db.from("devices").select("id, last_seen_at, info").order("last_seen_at", { ascending: false }).limit(20),
  ]);

  const ai = aiRows.error ? [] : (aiRows.data ?? []);
  base.aiByModel = summarizeByModel(ai);
  base.today = {
    sessions,
    sessionsLastHour,
    completed,
    completedAi,
    aiRequests: ai.length,
    aiSuccess: ai.filter((r) => r.ok).length,
    printsCompleted,
  };
  base.printQueue = { waiting, printing, failedToday };
  base.recentFailures = (failures.error ? [] : (failures.data ?? [])).map((f) => ({
    id: f.id,
    error: f.error,
    printer: f.printer,
    updatedAt: f.updated_at,
  }));
  base.devices = (devices.error ? [] : (devices.data ?? [])).map((d) => {
    const info = (d.info ?? {}) as Record<string, unknown>;
    return {
      id: d.id,
      lastSeenAt: d.last_seen_at,
      online: now.getTime() - new Date(d.last_seen_at).getTime() < DEVICE_ONLINE_MS,
      platform: typeof info.platform === "string" ? info.platform : null,
      dryRun: info.dryRun === true,
      systemPrinter: typeof info.systemPrinter === "string" ? info.systemPrinter : null,
    };
  });
  return base;
}
