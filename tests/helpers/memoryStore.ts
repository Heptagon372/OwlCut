// 메모리 저장소 — 테스트용 BoothStore 구현.
// 라우트·도메인 코드가 Supabase/Firebase 없이도 돌아가는지 확인하고,
// 두 구현이 지켜야 할 동작(조건부 claim, 세션당 1행, 삭제 규칙)을 글로 남긴다.
import type {
  AiRequestRow,
  BoothStore,
  DesignRow,
  DesignUsageRow,
  DeviceRow,
  FailedPrint,
  PrintRow,
  SessionRow,
} from "@/lib/db/store";
import type { PrintStatus } from "@/types/print";

let seq = 0;
const nextId = () => `id-${++seq}`;
const nowIso = () => new Date().toISOString();

export class MemoryStore implements BoothStore {
  readonly kind = "supabase" as const; // 실제 구현 중 하나인 척 (라우트는 종류를 보지 않는다)
  sessions = new Map<string, SessionRow>();
  designs: (DesignRow & { id: string })[] = [];
  prints: PrintRow[] = [];
  devices = new Map<string, DeviceRow>();
  ai: AiRequestRow[] = [];
  photos: { session_id: string; order_index: number; image_path: string }[] = [];
  files = new Map<string, { body: Buffer; contentType: string }>();
  /** 일부러 실패시키고 싶은 동작 (재시도·오류 처리 테스트) */
  fail: Partial<Record<"upload" | "removeFiles" | "saveFinalDesign" | "listExpiredSessionIds", boolean>> = {};

  // ---------- 세션 ----------
  async getSession(id: string) {
    return this.sessions.get(id) ?? null;
  }
  async insertSession(row: SessionRow) {
    this.sessions.set(row.id, { created_at: nowIso(), ...row });
  }
  async updateSession(id: string, patch: Partial<SessionRow>) {
    const row = this.sessions.get(id);
    if (row) this.sessions.set(id, { ...row, ...patch });
  }
  async countSessionsSince(iso: string) {
    return [...this.sessions.values()].filter((s) => (s.created_at ?? "") >= iso).length;
  }
  async listExpiredSessionIds(now: string, limit: number) {
    if (this.fail.listExpiredSessionIds) throw new Error("db down");
    return [...this.sessions.values()]
      .filter((s) => (s.expires_at ?? "") < now && s.status !== "expired")
      .slice(0, limit)
      .map((s) => s.id);
  }
  async markSessionsExpired(ids: string[]) {
    for (const id of ids) await this.updateSession(id, { status: "expired" });
  }

  // ---------- 디자인 ----------
  async latestFinalDesign(sessionId: string) {
    const rows = this.designs.filter((d) => d.session_id === sessionId && d.final_image_path);
    const last = rows[rows.length - 1];
    return last ? { id: last.id, final_image_path: last.final_image_path ?? null } : null;
  }
  async saveFinalDesign(sessionId: string, row: Partial<DesignRow>) {
    if (this.fail.saveFinalDesign) throw new Error("db down");
    const existing = await this.latestFinalDesign(sessionId);
    if (existing) {
      const i = this.designs.findIndex((d) => d.id === existing.id);
      this.designs[i] = { ...this.designs[i], ...row };
      return "updated" as const;
    }
    this.designs.push({ id: nextId(), created_at: nowIso(), session_id: sessionId, ...row });
    return "inserted" as const;
  }
  async insertDesign(row: Partial<DesignRow> & { session_id: string }) {
    this.designs.push({ id: nextId(), created_at: nowIso(), ...row });
  }
  async scrubDesigns(sessionIds: string[]) {
    for (const d of this.designs) {
      if (sessionIds.includes(d.session_id)) {
        d.prompt = null;
        d.text_layers = [];
      }
    }
  }
  async countFinalDesignsSince(iso: string, opts: { mode?: string } = {}) {
    return this.designs.filter(
      (d) => d.final_image_path && (d.created_at ?? "") >= iso && (!opts.mode || d.mode === opts.mode),
    ).length;
  }
  async listFinalDesignsSince(iso: string, limit: number): Promise<DesignUsageRow[]> {
    return this.designs
      .filter((d) => d.final_image_path && (d.created_at ?? "") >= iso)
      .slice(0, limit)
      .map(({ filter, layout, layout_options }) => ({ filter, layout, layout_options }));
  }

  // ---------- 사진 ----------
  async insertPhoto(row: { session_id: string; order_index: number; image_path: string }) {
    this.photos.push(row);
  }

  // ---------- 출력 ----------
  async countPrints(sessionId: string) {
    return this.prints.filter((p) => p.session_id === sessionId).length;
  }
  async insertPrint(row: { session_id: string; image_path: string; copies: number; paper?: string | null }) {
    const job: PrintRow = { id: nextId(), ...row, status: "waiting", printer: null, error: null, created_at: nowIso(), updated_at: nowIso() };
    this.prints.push(job);
    return { id: job.id, status: job.status };
  }
  async latestPrint(sessionId: string) {
    const rows = this.prints.filter((p) => p.session_id === sessionId);
    const last = rows[rows.length - 1];
    return last ? { id: last.id, status: last.status, error: last.error ?? null } : null;
  }
  async failStuckPrints(beforeIso: string) {
    for (const p of this.prints) {
      if (p.status === "printing" && (p.updated_at ?? "") < beforeIso) {
        p.status = "failed";
        p.error = "timeout";
        p.updated_at = nowIso();
      }
    }
  }
  async listWaitingPrintIds(limit: number) {
    return this.prints.filter((p) => p.status === "waiting").slice(0, limit).map((p) => p.id);
  }
  async claimPrint(id: string, printer: string) {
    const p = this.prints.find((x) => x.id === id);
    if (!p || p.status !== "waiting") return null; // 이미 다른 프린터가 가져감
    p.status = "printing";
    p.printer = printer;
    p.updated_at = nowIso();
    return { ...p };
  }
  async finishPrint(id: string, printer: string, status: Extract<PrintStatus, "completed" | "failed">, error?: string) {
    const p = this.prints.find((x) => x.id === id);
    if (!p || p.status !== "printing" || p.printer !== printer) return null;
    p.status = status;
    p.error = status === "failed" ? (error ?? "unknown").slice(0, 500) : null;
    p.updated_at = nowIso();
    return { session_id: p.session_id };
  }
  async failPrint(id: string, error: string) {
    const p = this.prints.find((x) => x.id === id);
    if (p) {
      p.status = "failed";
      p.error = error;
      p.updated_at = nowIso();
    }
  }
  async failWaitingPrints(sessionIds: string[], error: string) {
    for (const p of this.prints) {
      if (sessionIds.includes(p.session_id) && p.status === "waiting") {
        p.status = "failed";
        p.error = error;
        p.updated_at = nowIso();
      }
    }
  }
  async countPrintsByStatus(status: PrintStatus, sinceIso?: string) {
    return this.prints.filter((p) => p.status === status && (!sinceIso || (p.updated_at ?? "") >= sinceIso)).length;
  }
  async listRecentFailedPrints(limit: number): Promise<FailedPrint[]> {
    return this.prints
      .filter((p) => p.status === "failed")
      .slice(-limit)
      .reverse()
      .map((p) => ({ id: p.id, error: p.error ?? null, printer: p.printer ?? null, updated_at: p.updated_at ?? null }));
  }

  // ---------- 장비 ----------
  async upsertDevice(row: DeviceRow) {
    this.devices.set(row.id, row);
  }
  async listDevices(limit: number) {
    return [...this.devices.values()].slice(0, limit);
  }

  // ---------- AI ----------
  async insertAiRequest(row: AiRequestRow) {
    this.ai.push({ created_at: nowIso(), ...row });
  }
  async listAiRequestsSince(iso: string, limit: number) {
    return this.ai
      .filter((r) => (r.created_at ?? "") >= iso)
      .slice(0, limit)
      .map((r) => ({ model: r.model, ok: r.ok, latency_ms: r.latency_ms }));
  }

  // ---------- 파일 ----------
  async upload(path: string, body: Buffer, contentType: string) {
    if (this.fail.upload) throw new Error("storage down");
    this.files.set(path, { body, contentType });
  }
  async signedUrl(path: string, seconds: number) {
    if (seconds <= 0 || !this.files.has(path)) return null;
    return `https://memory.test/${path}?exp=${seconds}`;
  }
  async listFiles(folder: string) {
    return [...this.files.keys()].filter((p) => p.startsWith(`${folder}/`)).map((p) => p.slice(folder.length + 1));
  }
  async removeFiles(paths: string[]) {
    if (this.fail.removeFiles) throw new Error("storage down");
    let n = 0;
    for (const p of paths) if (this.files.delete(p)) n++;
    return n; // 없는 파일은 세지 않는다 (오류도 아니다)
  }
}
