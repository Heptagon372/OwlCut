// 서버 간 호출용 Bearer 토큰 검증 (프린트 서버, 정리 크론). 서버 전용.
import { createHash, timingSafeEqual } from "node:crypto";

const sha = (s: string) => createHash("sha256").update(s).digest();

/** expected 가 비어 있으면 항상 false (설정 안 된 엔드포인트는 닫아 둔다). */
export function verifyBearer(req: Request, expected: string | undefined): boolean {
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  // 길이 차이로 인한 타이밍 누출 방지를 위해 해시끼리 비교
  return timingSafeEqual(sha(token), sha(expected));
}
