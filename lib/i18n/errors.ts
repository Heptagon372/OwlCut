// 서버가 주는 오류 코드 → 화면에 보여 줄 문구. 서버 message 는 한국어(로그·개발용)이므로
// 방문객 화면에서는 코드로 골라 쓴다 (영어 설정에서 한국어가 섞이지 않게).
import type { MessageKey } from "./messages";

const KEY: Record<string, MessageKey> = {
  network: "err.network",
  SUPABASE_NOT_CONFIGURED: "err.notConfigured",
  bad_request: "err.badRequest",
  bad_session: "err.badRequest",
  forbidden: "err.forbidden",
  expired: "err.expired",
  not_found: "err.notFound",
  no_final_image: "err.notFound",
  limit_reached: "err.printLimit",
  enqueue_failed: "err.print",
  rate_limited: "err.rateLimited",
  ai_failed: "err.ai",
  no_model: "err.notConfigured",
};

export const errorKey = (code?: string | null): MessageKey => (code && KEY[code]) || "err.unknown";
