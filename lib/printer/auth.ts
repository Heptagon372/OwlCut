// 프린트 서버 ↔ API 공유 토큰 검증 (서버 전용).
// 토큰이 없으면 큐를 아무나 읽을 수 없도록 프린트 서버용 엔드포인트 전체를 닫는다.
import { createHash, timingSafeEqual } from "node:crypto";

const sha = (s: string) => createHash("sha256").update(s).digest();

// 프린트 서버 이름 (devices.id 로 저장)
export const PRINTER_NAME = /^[\w .-]{1,64}$/;

export function isPrintTokenConfigured(): boolean {
  return Boolean(process.env.PRINT_SERVER_TOKEN);
}

export function verifyPrintToken(req: Request): boolean {
  const expected = process.env.PRINT_SERVER_TOKEN;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  // 길이 차이로 인한 타이밍 누출 방지를 위해 해시끼리 비교
  return timingSafeEqual(sha(token), sha(expected));
}
