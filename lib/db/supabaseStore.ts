// Supabase(Postgres + Storage) 구현. 스키마는 supabase/schema.sql.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/client";
import type {
  AiRequestRow,
  BoothStore,
  DesignRow,
  DesignUsageRow,
  DeviceRow,
  FailedPrint,
  PrintRow,
  SessionRow,
} from "./store";
import type { PrintStatus } from "@/types/print";

const nowIso = () => new Date().toISOString();

// sessions.upload_token_hash 는 나중에 추가된 컬럼 — schema.sql 을 다시 실행하기 전이면 없을 수 있다.
// 행사 중 업로드가 멈추지 않도록, 컬럼이 없으면 토큰 확인만 건너뛰고 계속한다 (경고는 sessionAuth 에서).
export function isMissingColumn(e: { code?: string; message?: string } | null): boolean {
  if (!e) return false;
  return e.code === "42703" || e.code === "PGRST204" || /upload_token_hash/.test(e.message ?? "");
}

export class SupabaseStore implements BoothStore {
  readonly kind = "supabase" as const;

  constructor(private db: SupabaseClient = getSupabaseAdmin()) {}

  private get bucket() {
    return this.db.storage.from(STORAGE_BUCKET);
  }

  // ---------- 세션 ----------
  async getSession(id: string): Promise<SessionRow | null> {
    let { data, error } = await this.db
      .from("sessions")
      .select("id, status, expires_at, upload_token_hash")
      .eq("id", id)
      .maybeSingle();
    if (isMissingColumn(error)) {
      ({ data, error } = await this.db.from("sessions").select("id, status, expires_at").eq("id", id).maybeSingle());
      if (!error && data) return { ...(data as SessionRow), upload_token_hash: undefined };
    }
    if (error) throw error;
    return (data as SessionRow) ?? null;
  }

  async insertSession(row: SessionRow): Promise<void> {
    let res = await this.db.from("sessions").insert(row);
    if (isMissingColumn(res.error)) {
      const rest = { ...row };
      delete rest.upload_token_hash; // 컬럼이 아직 없는 예전 스키마
      res = await this.db.from("sessions").insert(rest);
    }
    if (res.error) throw res.error;
  }

  async updateSession(id: string, patch: Partial<SessionRow>): Promise<void> {
    const { error } = await this.db.from("sessions").update(patch).eq("id", id);
    if (error) throw error;
  }

  async countSessionsSince(iso: string): Promise<number> {
    const { count } = await this.db.from("sessions").select("id", { count: "exact", head: true }).gte("created_at", iso);
    return count ?? 0;
  }

  async listExpiredSessionIds(now: string, limit: number): Promise<string[]> {
    const { data, error } = await this.db
      .from("sessions")
      .select("id")
      .lt("expires_at", now)
      .neq("status", "expired")
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => r.id as string);
  }

  async markSessionsExpired(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await this.db.from("sessions").update({ status: "expired" }).in("id", ids);
    if (error) throw error;
  }

  // ---------- 디자인 ----------
  async latestFinalDesign(sessionId: string) {
    const { data, error } = await this.db
      .from("designs")
      .select("id, final_image_path")
      .eq("session_id", sessionId)
      .not("final_image_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? { id: data.id as string, final_image_path: (data.final_image_path as string) ?? null } : null;
  }

  async saveFinalDesign(sessionId: string, row: Partial<DesignRow>): Promise<"inserted" | "updated"> {
    const existing = await this.latestFinalDesign(sessionId);
    if (existing) {
      const { error } = await this.db.from("designs").update(row).eq("id", existing.id);
      if (error) throw error;
      return "updated";
    }
    const { error } = await this.db.from("designs").insert({ ...row, session_id: sessionId });
    if (error) throw error;
    return "inserted";
  }

  async insertDesign(row: Partial<DesignRow> & { session_id: string }): Promise<void> {
    const { error } = await this.db.from("designs").insert(row);
    if (error) throw error;
  }

  async scrubDesigns(sessionIds: string[]): Promise<void> {
    if (!sessionIds.length) return;
    const { error } = await this.db.from("designs").update({ prompt: null, text_layers: [] }).in("session_id", sessionIds);
    if (error) throw error;
  }

  async countFinalDesignsSince(iso: string, opts: { mode?: string } = {}): Promise<number> {
    let q = this.db
      .from("designs")
      .select("id", { count: "exact", head: true })
      .not("final_image_path", "is", null)
      .gte("created_at", iso);
    if (opts.mode) q = q.eq("mode", opts.mode);
    const { count } = await q;
    return count ?? 0;
  }

  async listFinalDesignsSince(iso: string, limit: number): Promise<DesignUsageRow[]> {
    const { data } = await this.db
      .from("designs")
      .select("filter, layout, layout_options")
      .not("final_image_path", "is", null)
      .gte("created_at", iso)
      .limit(limit);
    return (data ?? []) as DesignUsageRow[];
  }

  // ---------- 원본 사진 ----------
  async insertPhoto(row: { session_id: string; order_index: number; image_path: string }): Promise<void> {
    const { error } = await this.db.from("photos").insert(row);
    if (error) throw error;
  }

  // ---------- 출력 큐 ----------
  async countPrints(sessionId: string): Promise<number> {
    const { count } = await this.db.from("prints").select("id", { count: "exact", head: true }).eq("session_id", sessionId);
    return count ?? 0;
  }

  async insertPrint(row: { session_id: string; image_path: string; copies: number; paper?: string | null }) {
    const { data, error } = await this.db
      .from("prints")
      .insert({ ...row, status: "waiting" })
      .select("id, status")
      .single();
    if (error) throw error;
    return { id: data.id as string, status: data.status as PrintStatus };
  }

  async latestPrint(sessionId: string) {
    const { data } = await this.db
      .from("prints")
      .select("id, status, error")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? { id: data.id as string, status: data.status as PrintStatus, error: (data.error as string) ?? null } : null;
  }

  async failStuckPrints(beforeIso: string): Promise<void> {
    await this.db
      .from("prints")
      .update({ status: "failed", error: "timeout", updated_at: nowIso() })
      .eq("status", "printing")
      .lt("updated_at", beforeIso);
  }

  async listWaitingPrintIds(limit: number): Promise<string[]> {
    const { data } = await this.db
      .from("prints")
      .select("id")
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(limit);
    return (data ?? []).map((r) => r.id as string);
  }

  async claimPrint(id: string, printer: string): Promise<PrintRow | null> {
    // 조건부 update: 아직 waiting 인 작업만 (다른 프린터가 먼저 가져갔으면 0행)
    const { data } = await this.db
      .from("prints")
      .update({ status: "printing", printer, updated_at: nowIso() })
      .eq("id", id)
      .eq("status", "waiting")
      .select("id, session_id, image_path, copies, paper")
      .maybeSingle();
    return data
      ? {
          id: data.id as string,
          session_id: data.session_id as string,
          image_path: (data.image_path as string) ?? null,
          copies: data.copies as number,
          paper: (data.paper as string) ?? null,
          status: "printing",
          printer,
        }
      : null;
  }

  async finishPrint(
    id: string,
    printer: string,
    status: Extract<PrintStatus, "completed" | "failed">,
    error?: string,
  ): Promise<{ session_id: string } | null> {
    const { data } = await this.db
      .from("prints")
      .update({
        status,
        error: status === "failed" ? (error ?? "unknown").slice(0, 500) : null,
        updated_at: nowIso(),
      })
      .eq("id", id)
      .eq("printer", printer)
      .eq("status", "printing")
      .select("id, session_id")
      .maybeSingle();
    return data ? { session_id: data.session_id as string } : null;
  }

  async failPrint(id: string, error: string): Promise<void> {
    await this.db.from("prints").update({ status: "failed", error, updated_at: nowIso() }).eq("id", id);
  }

  async failWaitingPrints(sessionIds: string[], error: string): Promise<void> {
    if (!sessionIds.length) return;
    const { error: err } = await this.db
      .from("prints")
      .update({ status: "failed", error, updated_at: nowIso() })
      .in("session_id", sessionIds)
      .eq("status", "waiting");
    if (err) throw err;
  }

  async countPrintsByStatus(status: PrintStatus, sinceIso?: string): Promise<number> {
    let q = this.db.from("prints").select("id", { count: "exact", head: true }).eq("status", status);
    if (sinceIso) q = q.gte("updated_at", sinceIso);
    const { count } = await q;
    return count ?? 0;
  }

  async listRecentFailedPrints(limit: number): Promise<FailedPrint[]> {
    const { data } = await this.db
      .from("prints")
      .select("id, error, printer, updated_at")
      .eq("status", "failed")
      .order("updated_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as FailedPrint[];
  }

  // ---------- 장비 ----------
  async upsertDevice(row: DeviceRow): Promise<void> {
    await this.db.from("devices").upsert(row, { onConflict: "id" });
  }

  async listDevices(limit: number): Promise<DeviceRow[]> {
    const { data } = await this.db
      .from("devices")
      .select("id, kind, last_seen_at, info")
      .order("last_seen_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as DeviceRow[];
  }

  // ---------- AI 사용량 ----------
  async insertAiRequest(row: AiRequestRow): Promise<void> {
    await this.db.from("ai_requests").insert(row);
  }

  async listAiRequestsSince(iso: string, limit: number) {
    const { data } = await this.db.from("ai_requests").select("model, ok, latency_ms").gte("created_at", iso).limit(limit);
    return (data ?? []) as { model: string | null; ok: boolean; latency_ms: number | null }[];
  }

  // ---------- 파일 ----------
  async upload(path: string, body: Buffer, contentType: string): Promise<void> {
    const { error } = await this.bucket.upload(path, body, { contentType, upsert: true });
    if (error) throw error;
  }

  async signedUrl(path: string, seconds: number, downloadName?: string): Promise<string | null> {
    if (seconds <= 0) return null;
    const { data, error } = await this.bucket.createSignedUrl(
      path,
      seconds,
      downloadName ? { download: downloadName } : undefined,
    );
    return error ? null : data.signedUrl;
  }

  async listFiles(folder: string, limit: number): Promise<string[]> {
    const { data } = await this.bucket.list(folder, { limit });
    return (data ?? []).map((f) => f.name);
  }

  async removeFiles(paths: string[]): Promise<number> {
    if (!paths.length) return 0;
    const { data, error } = await this.bucket.remove(paths);
    if (error) throw error;
    return data?.length ?? 0;
  }
}
