// Firebase(Firestore + Cloud Storage) 구현. Supabase 대신 쓸 수 있다 (lib/db/index.ts 가 고름).
// - 시각은 ISO 문자열로 저장 → 문자열 비교만으로 기간 조회 (Supabase 와 같은 동작)
// - Firestore 는 한 쿼리에서 여러 필드에 범위 조건을 쓰기 어렵다 → 완성본 여부를 has_final(참/거짓)로 따로 둔다
// - firebase-admin 은 필요할 때만 불러온다 (Supabase 만 쓰는 배포에서는 로드하지 않음)
import type { Firestore, Query } from "firebase-admin/firestore";
import type { Bucket } from "@google-cloud/storage";
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
const IN_LIMIT = 30; // Firestore 'in' 한 번에 최대 30개

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_STORAGE_BUCKET &&
      (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_PROJECT_ID),
  );
}

/** 서비스 계정: JSON 원문 또는 base64 (한 줄로 넣기 쉬우라고 둘 다 받는다) */
function serviceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(text) as Record<string, string>;
}

let cached: { db: Firestore; bucket: Bucket } | null = null;

async function connect() {
  if (cached) return cached;
  const [{ cert, getApps, initializeApp, applicationDefault }, { getFirestore }, { getStorage }] = await Promise.all([
    import("firebase-admin/app"),
    import("firebase-admin/firestore"),
    import("firebase-admin/storage"),
  ]);
  const sa = serviceAccount();
  const app =
    getApps().find((a) => a.name === "owlcut") ??
    initializeApp(
      {
        credential: sa ? cert(sa) : applicationDefault(),
        projectId: sa?.project_id ?? process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      },
      "owlcut",
    );
  const db = getFirestore(app);
  // 값이 없는 필드를 그냥 넘겨도 되게 (Supabase 쪽 코드와 모양을 맞추기 위해)
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // 이미 설정된 경우
  }
  cached = { db, bucket: getStorage(app).bucket() };
  return cached;
}

const chunk = <T>(list: T[], size = IN_LIMIT): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

export class FirebaseStore implements BoothStore {
  readonly kind = "firebase" as const;

  private async col(name: string) {
    const { db } = await connect();
    return db.collection(name);
  }

  private async docs<T>(q: Query): Promise<(T & { id: string })[]> {
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
  }

  private async count(q: Query): Promise<number> {
    const snap = await q.count().get();
    return snap.data().count;
  }

  // ---------- 세션 ----------
  async getSession(id: string): Promise<SessionRow | null> {
    const snap = await (await this.col("sessions")).doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data() as Omit<SessionRow, "id">;
    // 해시가 없으면 null (undefined 는 '컬럼 자체가 없음' 이라는 Supabase 전용 뜻이라 쓰지 않는다)
    return { id, ...data, upload_token_hash: data.upload_token_hash ?? null };
  }

  async insertSession(row: SessionRow): Promise<void> {
    const { id, ...rest } = row;
    await (await this.col("sessions")).doc(id).set({ created_at: nowIso(), ...rest });
  }

  async updateSession(id: string, patch: Partial<SessionRow>): Promise<void> {
    await (await this.col("sessions")).doc(id).set(patch, { merge: true });
  }

  async countSessionsSince(iso: string): Promise<number> {
    return this.count((await this.col("sessions")).where("created_at", ">=", iso));
  }

  async listExpiredSessionIds(now: string, limit: number): Promise<string[]> {
    // status != 'expired' 는 범위 조건과 같이 못 쓰므로 만료된 것만 받아서 걸러낸다
    const rows = await this.docs<SessionRow>(
      (await this.col("sessions")).where("expires_at", "<", now).orderBy("expires_at").limit(limit * 2),
    );
    return rows.filter((r) => r.status !== "expired").slice(0, limit).map((r) => r.id);
  }

  async markSessionsExpired(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { db } = await connect();
    const batch = db.batch();
    for (const id of ids) batch.set(db.collection("sessions").doc(id), { status: "expired" }, { merge: true });
    await batch.commit();
  }

  // ---------- 디자인 ----------
  async latestFinalDesign(sessionId: string) {
    const rows = await this.docs<DesignRow>(
      (await this.col("designs"))
        .where("session_id", "==", sessionId)
        .where("has_final", "==", true)
        .orderBy("created_at", "desc")
        .limit(1),
    );
    const d = rows[0];
    return d ? { id: d.id, final_image_path: d.final_image_path ?? null } : null;
  }

  async saveFinalDesign(sessionId: string, row: Partial<DesignRow>): Promise<"inserted" | "updated"> {
    const col = await this.col("designs");
    const existing = await this.latestFinalDesign(sessionId);
    const body = { ...row, session_id: sessionId, has_final: Boolean(row.final_image_path) };
    if (existing) {
      await col.doc(existing.id).set(body, { merge: true });
      return "updated";
    }
    await col.add({ created_at: nowIso(), ...body });
    return "inserted";
  }

  async insertDesign(row: Partial<DesignRow> & { session_id: string }): Promise<void> {
    await (await this.col("designs")).add({
      created_at: nowIso(),
      ...row,
      has_final: Boolean(row.final_image_path),
    });
  }

  async scrubDesigns(sessionIds: string[]): Promise<void> {
    const { db } = await connect();
    for (const ids of chunk(sessionIds)) {
      const snap = await db.collection("designs").where("session_id", "in", ids).get();
      if (snap.empty) continue;
      const batch = db.batch();
      for (const d of snap.docs) batch.set(d.ref, { prompt: null, text_layers: [] }, { merge: true });
      await batch.commit();
    }
  }

  async countFinalDesignsSince(iso: string, opts: { mode?: string } = {}): Promise<number> {
    let q = (await this.col("designs")).where("has_final", "==", true).where("created_at", ">=", iso);
    if (opts.mode) q = q.where("mode", "==", opts.mode);
    return this.count(q);
  }

  async listFinalDesignsSince(iso: string, limit: number): Promise<DesignUsageRow[]> {
    return this.docs<DesignUsageRow>(
      (await this.col("designs")).where("has_final", "==", true).where("created_at", ">=", iso).limit(limit),
    );
  }

  // ---------- 원본 사진 ----------
  async insertPhoto(row: { session_id: string; order_index: number; image_path: string }): Promise<void> {
    await (await this.col("photos")).add({ created_at: nowIso(), ...row });
  }

  // ---------- 출력 큐 ----------
  async countPrints(sessionId: string): Promise<number> {
    return this.count((await this.col("prints")).where("session_id", "==", sessionId));
  }

  async insertPrint(row: { session_id: string; image_path: string; copies: number; paper?: string | null }) {
    const ref = await (await this.col("prints")).add({
      ...row,
      status: "waiting",
      printer: null,
      error: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    return { id: ref.id, status: "waiting" as PrintStatus };
  }

  async latestPrint(sessionId: string) {
    const rows = await this.docs<PrintRow>(
      (await this.col("prints")).where("session_id", "==", sessionId).orderBy("created_at", "desc").limit(1),
    );
    const p = rows[0];
    return p ? { id: p.id, status: p.status, error: p.error ?? null } : null;
  }

  async failStuckPrints(beforeIso: string): Promise<void> {
    const { db } = await connect();
    const snap = await db.collection("prints").where("status", "==", "printing").where("updated_at", "<", beforeIso).get();
    if (snap.empty) return;
    const batch = db.batch();
    for (const d of snap.docs) batch.set(d.ref, { status: "failed", error: "timeout", updated_at: nowIso() }, { merge: true });
    await batch.commit();
  }

  async listWaitingPrintIds(limit: number): Promise<string[]> {
    const rows = await this.docs<PrintRow>(
      (await this.col("prints")).where("status", "==", "waiting").orderBy("created_at", "asc").limit(limit),
    );
    return rows.map((r) => r.id);
  }

  async claimPrint(id: string, printer: string): Promise<PrintRow | null> {
    const { db } = await connect();
    const ref = db.collection("prints").doc(id);
    // 트랜잭션: 아직 waiting 일 때만 가져간다 (두 프린터가 같은 작업을 뽑지 않게)
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as PrintRow | undefined;
      if (!snap.exists || data?.status !== "waiting") return null;
      tx.set(ref, { status: "printing", printer, updated_at: nowIso() }, { merge: true });
      return {
        id,
        session_id: data.session_id,
        image_path: data.image_path ?? null,
        copies: data.copies,
        paper: data.paper ?? null,
        status: "printing" as PrintStatus,
        printer,
      };
    });
  }

  async finishPrint(
    id: string,
    printer: string,
    status: Extract<PrintStatus, "completed" | "failed">,
    error?: string,
  ): Promise<{ session_id: string } | null> {
    const { db } = await connect();
    const ref = db.collection("prints").doc(id);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as PrintRow | undefined;
      // 자기가 가져간, 아직 출력 중인 작업만 보고 가능
      if (!data || data.status !== "printing" || data.printer !== printer) return null;
      tx.set(
        ref,
        { status, error: status === "failed" ? (error ?? "unknown").slice(0, 500) : null, updated_at: nowIso() },
        { merge: true },
      );
      return { session_id: data.session_id };
    });
  }

  async failPrint(id: string, error: string): Promise<void> {
    await (await this.col("prints")).doc(id).set({ status: "failed", error, updated_at: nowIso() }, { merge: true });
  }

  async failWaitingPrints(sessionIds: string[], error: string): Promise<void> {
    const { db } = await connect();
    for (const ids of chunk(sessionIds)) {
      const snap = await db.collection("prints").where("session_id", "in", ids).where("status", "==", "waiting").get();
      if (snap.empty) continue;
      const batch = db.batch();
      for (const d of snap.docs) batch.set(d.ref, { status: "failed", error, updated_at: nowIso() }, { merge: true });
      await batch.commit();
    }
  }

  async countPrintsByStatus(status: PrintStatus, sinceIso?: string): Promise<number> {
    let q = (await this.col("prints")).where("status", "==", status);
    if (sinceIso) q = q.where("updated_at", ">=", sinceIso);
    return this.count(q);
  }

  async listRecentFailedPrints(limit: number): Promise<FailedPrint[]> {
    const rows = await this.docs<PrintRow>(
      (await this.col("prints")).where("status", "==", "failed").orderBy("updated_at", "desc").limit(limit),
    );
    return rows.map((r) => ({ id: r.id, error: r.error ?? null, printer: r.printer ?? null, updated_at: r.updated_at ?? null }));
  }

  // ---------- 장비 ----------
  async upsertDevice(row: DeviceRow): Promise<void> {
    const { id, ...rest } = row;
    await (await this.col("devices")).doc(id).set(rest, { merge: true });
  }

  async listDevices(limit: number): Promise<DeviceRow[]> {
    return this.docs<Omit<DeviceRow, "id">>(
      (await this.col("devices")).orderBy("last_seen_at", "desc").limit(limit),
    ) as Promise<DeviceRow[]>;
  }

  // ---------- AI 사용량 ----------
  async insertAiRequest(row: AiRequestRow): Promise<void> {
    await (await this.col("ai_requests")).add({ created_at: nowIso(), ...row });
  }

  async listAiRequestsSince(iso: string, limit: number) {
    return this.docs<{ model: string | null; ok: boolean; latency_ms: number | null }>(
      (await this.col("ai_requests")).where("created_at", ">=", iso).limit(limit),
    );
  }

  // ---------- 파일 ----------
  async upload(path: string, body: Buffer, contentType: string): Promise<void> {
    const { bucket } = await connect();
    await bucket.file(path).save(body, { contentType, resumable: false });
  }

  async signedUrl(path: string, seconds: number, downloadName?: string): Promise<string | null> {
    if (seconds <= 0) return null;
    try {
      const { bucket } = await connect();
      const [url] = await bucket.file(path).getSignedUrl({
        action: "read",
        expires: Date.now() + seconds * 1000,
        responseDisposition: downloadName ? `attachment; filename="${downloadName}"` : undefined,
      });
      return url;
    } catch {
      return null; // 파일이 없거나(보관기간 지남) 서명 권한이 없을 때
    }
  }

  async listFiles(folder: string, limit: number): Promise<string[]> {
    const { bucket } = await connect();
    const [files] = await bucket.getFiles({ prefix: `${folder}/`, maxResults: limit });
    return files.map((f) => f.name.slice(folder.length + 1)).filter(Boolean);
  }

  async removeFiles(paths: string[]): Promise<number> {
    const { bucket } = await connect();
    let removed = 0;
    await Promise.all(
      paths.map(async (p) => {
        try {
          await bucket.file(p).delete();
          removed++;
        } catch (e) {
          // 이미 없는 파일은 오류가 아니다 (다음 정리에서 다시 시도할 필요 없음)
          if ((e as { code?: number }).code !== 404) throw e;
        }
      }),
    );
    return removed;
  }
}
