// 완성 네컷의 designs 행 저장 — 세션당 1행 (서버 전용).
// 업로드 응답이 늦어 클라이언트가 재시도해도 행이 늘지 않게 update-or-insert.
// (행이 두 개 생기면 관리자 "완성된 네컷" 수가 부풀려진다.) 실패는 throw → 클라이언트가 재시도.
import type { SupabaseClient } from "@supabase/supabase-js";

export async function saveFinalDesign(
  db: SupabaseClient,
  sessionId: string,
  row: Record<string, unknown>,
): Promise<"inserted" | "updated"> {
  const { data: existing, error } = await db
    .from("designs")
    .select("id")
    .eq("session_id", sessionId)
    .not("final_image_path", "is", null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  if (existing?.id) {
    const { error: upErr } = await db.from("designs").update(row).eq("id", existing.id);
    if (upErr) throw upErr;
    return "updated";
  }
  const { error: insErr } = await db.from("designs").insert({ ...row, session_id: sessionId });
  if (insErr) throw insErr;
  return "inserted";
}
