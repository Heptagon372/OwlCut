// /api/ai 비용 보호용 인메모리 요청 제한 (IP당 분당 N회).
// 서버리스에선 인스턴스별로만 동작하는 기본 방어선. 운영 규모가 커지면 Redis 등으로 교체.
const WINDOW_MS = 60_000;
const MAX_KEYS = 5_000;
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, limit = 8): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  if (hits.size >= MAX_KEYS && !hits.has(key)) hits.clear();
  hits.set(key, recent);
  return true;
}

export function clientKey(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}
