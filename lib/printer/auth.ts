// 프린트 서버 ↔ API 공유 토큰 검증 (서버 전용).
// 토큰이 없으면 큐를 아무나 읽을 수 없도록 프린트 서버용 엔드포인트 전체를 닫는다.
import { verifyBearer } from "@/lib/auth/bearer";

// 프린트 서버 이름 (devices.id 로 저장)
export const PRINTER_NAME = /^[\w .-]{1,64}$/;

export function isPrintTokenConfigured(): boolean {
  return Boolean(process.env.PRINT_SERVER_TOKEN);
}

export function verifyPrintToken(req: Request): boolean {
  return verifyBearer(req, process.env.PRINT_SERVER_TOKEN);
}
