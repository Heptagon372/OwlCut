// 이 PC(키오스크) 디스크에 저장하는 BoothStore — Supabase·Firebase 없이도 QR 다운로드가 되게.
// 표는 JSON 파일 한 개(db.json), 파일은 <dir>/files/<경로> 로 둔다. 부스 한 대가 쓰는 양이라 이걸로 충분하다.
// 파일은 그대로 내주지 않고 Supabase 처럼 **만료되는 서명 URL**(/api/file?…&s=HMAC)로만 내려간다.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
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

/** 저장 폴더 (기본: 프로젝트 안 .owlcut-data) */
export function localStoreDir(): string {
  return process.env.LOCAL_STORE_DIR || path.join(process.cwd(), ".owlcut-data");
}

/** 이 PC 저장을 쓸지 — OWLCUT_LOCAL_STORE=1 이거나 폴더를 직접 지정했을 때 */
export function isLocalStoreConfigured(): boolean {
  return process.env.OWLCUT_LOCAL_STORE === "1" || !!process.env.LOCAL_STORE_DIR;
}

interface Db {
  sessions: SessionRow[];
  designs: (DesignRow & { id: string })[];
  photos: { session_id: string; order_index: number; image_path: string }[];
  prints: PrintRow[];
  devices: DeviceRow[];
  ai: AiRequestRow[];
}

const emptyDb = (): Db => ({ sessions: [], designs: [], photos: [], prints: [], devices: [], ai: [] });
const nowIso = () => new Date().toISOString();
const newId = () => randomBytes(12).toString("hex");

/** 경로 조작 방지 — 저장 폴더 밖으로 나가는 경로는 받지 않는다 */
function safeRelative(p: string): string | null {
  if (!p || p.startsWith("/") || p.startsWith("\\") || p.includes("..") || path.isAbsolute(p)) return null;
  return p.split("/").join(path.sep);
}

export class LocalStore implements BoothStore {
  readonly kind = "local" as const;
  private readonly dir: string;
  private db: Db | null = null;
  private writing: Promise<void> = Promise.resolve(); // 쓰기를 줄 세워 JSON 이 깨지지 않게

  constructor(dir: string = localStoreDir()) {
    this.dir = dir;
  }

  private get dbPath() {
    return path.join(this.dir, "db.json");
  }
  private filePath(p: string) {
    const rel = safeRelative(p);
    return rel ? path.join(this.dir, "files", rel) : null;
  }

  private async load(): Promise<Db> {
    if (this.db) return this.db;
    try {
      const raw = await fs.readFile(this.dbPath, "utf8");
      this.db = { ...emptyDb(), ...(JSON.parse(raw) as Partial<Db>) };
    } catch {
      this.db = emptyDb(); // 처음 실행이거나 파일이 깨졌으면 새로 시작 (사진은 로컬 저장으로 받을 수 있다)
    }
    return this.db;
  }

  /** 표를 고치고 저장한다 (한 번에 하나씩) */
  private async edit<T>(fn: (db: Db) => T): Promise<T> {
    const db = await this.load();
    const result = fn(db);
    const write = this.writing.then(async () => {
      await fs.mkdir(this.dir, { recursive: true });
      const tmp = `${this.dbPath}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db), "utf8");
      await fs.rename(tmp, this.dbPath); // 쓰다 만 파일이 남지 않게
    });
    this.writing = write.catch(() => {});
    await write;
    return result;
  }

  // ---------- 세션 ----------
  async getSession(id: string) {
    const db = await this.load();
    return db.sessions.find((s) => s.id === id) ?? null;
  }
  async insertSession(row: SessionRow) {
    await this.edit((db) => {
      db.sessions = db.sessions.filter((s) => s.id !== row.id);
      db.sessions.push({ created_at: nowIso(), ...row });
    });
  }
  async updateSession(id: string, patch: Partial<SessionRow>) {
    await this.edit((db) => {
      const i = db.sessions.findIndex((s) => s.id === id);
      if (i >= 0) db.sessions[i] = { ...db.sessions[i], ...patch };
    });
  }
  async countSessionsSince(iso: string) {
    const db = await this.load();
    return db.sessions.filter((s) => (s.created_at ?? "") >= iso).length;
  }
  async listExpiredSessionIds(now: string, limit: number) {
    const db = await this.load();
    return db.sessions
      .filter((s) => (s.expires_at ?? "") < now && s.status !== "expired")
      .slice(0, limit)
      .map((s) => s.id);
  }
  async markSessionsExpired(ids: string[]) {
    await this.edit((db) => {
      for (const s of db.sessions) if (ids.includes(s.id)) s.status = "expired";
    });
  }

  // ---------- 디자인 ----------
  async latestFinalDesign(sessionId: string) {
    const db = await this.load();
    const rows = db.designs.filter((d) => d.session_id === sessionId && d.final_image_path);
    const last = rows[rows.length - 1];
    return last ? { id: last.id, final_image_path: last.final_image_path ?? null } : null;
  }
  async saveFinalDesign(sessionId: string, row: Partial<DesignRow>) {
    return this.edit((db) => {
      // 세션당 1행 — 재시도가 완성 수를 부풀리지 않게 (멱등)
      const i = db.designs.findIndex((d) => d.session_id === sessionId && d.final_image_path);
      if (i >= 0) {
        db.designs[i] = { ...db.designs[i], ...row };
        return "updated" as const;
      }
      db.designs.push({ id: newId(), created_at: nowIso(), session_id: sessionId, ...row });
      return "inserted" as const;
    });
  }
  async insertDesign(row: Partial<DesignRow> & { session_id: string }) {
    await this.edit((db) => {
      db.designs.push({ id: newId(), created_at: nowIso(), ...row });
    });
  }
  async scrubDesigns(sessionIds: string[]) {
    await this.edit((db) => {
      for (const d of db.designs) {
        if (sessionIds.includes(d.session_id)) {
          d.prompt = null;
          d.text_layers = [];
        }
      }
    });
  }
  async countFinalDesignsSince(iso: string, opts: { mode?: string } = {}) {
    const db = await this.load();
    return db.designs.filter(
      (d) => d.final_image_path && (d.created_at ?? "") >= iso && (!opts.mode || d.mode === opts.mode),
    ).length;
  }
  async listFinalDesignsSince(iso: string, limit: number): Promise<DesignUsageRow[]> {
    const db = await this.load();
    return db.designs
      .filter((d) => d.final_image_path && (d.created_at ?? "") >= iso)
      .slice(-limit)
      .map(({ filter, layout, layout_options }) => ({ filter, layout, layout_options }));
  }

  // ---------- 원본 사진 ----------
  async insertPhoto(row: { session_id: string; order_index: number; image_path: string }) {
    await this.edit((db) => {
      db.photos = db.photos.filter(
        (p) => !(p.session_id === row.session_id && p.order_index === row.order_index),
      );
      db.photos.push(row);
    });
  }

  // ---------- 출력 큐 ----------
  async countPrints(sessionId: string) {
    const db = await this.load();
    return db.prints.filter((p) => p.session_id === sessionId).length;
  }
  async insertPrint(row: { session_id: string; image_path: string; copies: number; paper?: string | null }) {
    return this.edit((db) => {
      const job: PrintRow = {
        id: newId(),
        ...row,
        paper: row.paper ?? null,
        printer: null,
        status: "waiting",
        error: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      db.prints.push(job);
      return { id: job.id, status: job.status };
    });
  }
  async latestPrint(sessionId: string) {
    const db = await this.load();
    const rows = db.prints.filter((p) => p.session_id === sessionId);
    const last = rows[rows.length - 1];
    return last ? { id: last.id, status: last.status, error: last.error ?? null } : null;
  }
  async failStuckPrints(beforeIso: string) {
    await this.edit((db) => {
      for (const p of db.prints) {
        if (p.status === "printing" && (p.updated_at ?? "") < beforeIso) {
          p.status = "failed";
          p.error = "timeout";
          p.updated_at = nowIso();
        }
      }
    });
  }
  async listWaitingPrintIds(limit: number) {
    const db = await this.load();
    return db.prints.filter((p) => p.status === "waiting").slice(0, limit).map((p) => p.id);
  }
  async claimPrint(id: string, printer: string) {
    return this.edit((db) => {
      const p = db.prints.find((x) => x.id === id);
      if (!p || p.status !== "waiting") return null; // 이미 다른 프린터가 가져감
      p.status = "printing";
      p.printer = printer;
      p.updated_at = nowIso();
      return { ...p };
    });
  }
  async finishPrint(id: string, printer: string, status: Extract<PrintStatus, "completed" | "failed">, error?: string) {
    return this.edit((db) => {
      const p = db.prints.find((x) => x.id === id);
      if (!p || p.status !== "printing" || p.printer !== printer) return null;
      p.status = status;
      p.error = status === "failed" ? (error ?? "unknown").slice(0, 500) : null;
      p.updated_at = nowIso();
      return { session_id: p.session_id };
    });
  }
  async failPrint(id: string, error: string) {
    await this.edit((db) => {
      const p = db.prints.find((x) => x.id === id);
      if (p) {
        p.status = "failed";
        p.error = error;
        p.updated_at = nowIso();
      }
    });
  }
  async failWaitingPrints(sessionIds: string[], error: string) {
    await this.edit((db) => {
      for (const p of db.prints) {
        if (sessionIds.includes(p.session_id) && p.status === "waiting") {
          p.status = "failed";
          p.error = error;
          p.updated_at = nowIso();
        }
      }
    });
  }
  async countPrintsByStatus(status: PrintStatus, sinceIso?: string) {
    const db = await this.load();
    return db.prints.filter((p) => p.status === status && (!sinceIso || (p.updated_at ?? "") >= sinceIso)).length;
  }
  async listRecentFailedPrints(limit: number): Promise<FailedPrint[]> {
    const db = await this.load();
    return db.prints
      .filter((p) => p.status === "failed")
      .slice(-limit)
      .reverse()
      .map((p) => ({ id: p.id, error: p.error ?? null, printer: p.printer ?? null, updated_at: p.updated_at ?? null }));
  }

  // ---------- 장비 ----------
  async upsertDevice(row: DeviceRow) {
    await this.edit((db) => {
      db.devices = db.devices.filter((d) => d.id !== row.id);
      db.devices.push(row);
    });
  }
  async listDevices(limit: number) {
    const db = await this.load();
    return db.devices.slice(0, limit);
  }

  // ---------- AI 사용량 ----------
  async insertAiRequest(row: AiRequestRow) {
    await this.edit((db) => {
      db.ai.push({ created_at: nowIso(), ...row });
    });
  }
  async listAiRequestsSince(iso: string, limit: number) {
    const db = await this.load();
    return db.ai
      .filter((r) => (r.created_at ?? "") >= iso)
      .slice(-limit)
      .map((r) => ({ model: r.model, ok: r.ok, latency_ms: r.latency_ms }));
  }

  // ---------- 파일 ----------
  async upload(p: string, body: Buffer, contentType: string) {
    const full = this.filePath(p);
    if (!full) throw new Error("bad_path");
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    // 내려줄 때 쓸 형식은 옆에 적어 둔다 (확장자만 보고 맞히지 않게)
    await fs.writeFile(`${full}.type`, contentType, "utf8");
  }
  async signedUrl(p: string, seconds: number, downloadName?: string) {
    if (seconds <= 0) return null;
    const full = this.filePath(p);
    if (!full) return null;
    try {
      await fs.stat(full);
    } catch {
      return null; // 없는 파일
    }
    return signLocalFileUrl(p, seconds, downloadName, await this.secret());
  }
  async listFiles(folder: string, limit: number) {
    const full = this.filePath(folder);
    if (!full) return [];
    try {
      const names = await fs.readdir(full);
      return names.filter((n) => !n.endsWith(".type")).slice(0, limit);
    } catch {
      return [];
    }
  }
  async removeFiles(paths: string[]) {
    let n = 0;
    for (const p of paths) {
      const full = this.filePath(p);
      if (!full) continue;
      try {
        await fs.unlink(full);
        n++; // 없는 파일은 세지 않는다 (오류도 아니다)
      } catch {
        /* 이미 없음 */
      }
      await fs.unlink(`${full}.type`).catch(() => {});
    }
    return n;
  }

  /** 서명 키 — 처음 한 번 만들어 저장 폴더에 둔다 (서버를 다시 켜도 주소가 살아 있게) */
  private secretPromise: Promise<Buffer> | null = null;
  secret(): Promise<Buffer> {
    if (!this.secretPromise) {
      this.secretPromise = (async () => {
        const file = path.join(this.dir, "secret");
        try {
          return Buffer.from((await fs.readFile(file, "utf8")).trim(), "hex");
        } catch {
          const key = randomBytes(32);
          await fs.mkdir(this.dir, { recursive: true });
          await fs.writeFile(file, key.toString("hex"), "utf8");
          return key;
        }
      })();
    }
    return this.secretPromise;
  }

  /** 서명이 맞고 아직 안 지났으면 파일을 읽어 준다 (/api/file 이 쓴다) */
  async readSigned(params: URLSearchParams, now = Date.now()) {
    const p = params.get("p") ?? "";
    const exp = Number(params.get("e"));
    const name = params.get("n") ?? undefined;
    const sig = params.get("s") ?? "";
    if (!p || !Number.isFinite(exp) || !sig) return null;
    if (exp * 1000 < now) return null; // 유효시간 지남
    if (!verifySignature(p, exp, name, sig, await this.secret())) return null;
    const full = this.filePath(p);
    if (!full) return null;
    try {
      const body = await fs.readFile(full);
      const contentType = await fs.readFile(`${full}.type`, "utf8").catch(() => "application/octet-stream");
      return { body, contentType: contentType.trim(), downloadName: name };
    } catch {
      return null;
    }
  }
}

function signature(p: string, exp: number, name: string | undefined, secret: Buffer): string {
  return createHmac("sha256", secret).update(`${p}|${exp}|${name ?? ""}`).digest("base64url");
}

function verifySignature(p: string, exp: number, name: string | undefined, sig: string, secret: Buffer): boolean {
  const want = Buffer.from(signature(p, exp, name, secret));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** /api/file 서명 주소. NEXT_PUBLIC_APP_URL 이 있으면 절대 주소, 없으면 같은 서버 기준 상대 주소 */
export function signLocalFileUrl(p: string, seconds: number, downloadName: string | undefined, secret: Buffer): string {
  const exp = Math.floor(Date.now() / 1000) + Math.floor(seconds);
  const q = new URLSearchParams({ p, e: String(exp), s: signature(p, exp, downloadName, secret) });
  if (downloadName) q.set("n", downloadName);
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return `${base}/api/file?${q.toString()}`;
}
