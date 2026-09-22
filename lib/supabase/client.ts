// Supabase 클라이언트 (설계도 4). 모든 DB/Storage 접근은 서버 라우트에서
// SERVICE_ROLE_KEY로만 수행한다 (RLS 우회). 서비스 키는 절대 클라이언트로 노출 금지.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "photos";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

let adminClient: SupabaseClient | null = null;

// 서버 전용 admin 클라이언트 (lazy). import 시점엔 절대 throw하지 않음(빌드 안전).
export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return adminClient;
}
