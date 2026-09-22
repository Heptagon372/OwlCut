// 세션 id 검증. 저장소 경로(finals/{id}.png 등)에 들어가므로 UUID 형식만 허용 (경로 조작 방지).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}
