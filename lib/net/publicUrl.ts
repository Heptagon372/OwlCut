// QR·다운로드 주소에 쓸 "폰이 접속할 수 있는" 주소를 고른다 (서버 전용).
// NEXT_PUBLIC_APP_URL 이 있으면 그걸 쓰고, 없으면 요청이 들어온 주소를 쓴다.
// 다만 키오스크는 보통 localhost 로 열어 두는데 그 주소는 폰에서 못 열리므로,
// localhost 로 들어온 요청이면 이 PC 의 LAN 주소(같은 와이파이)로 바꿔 준다.
import { networkInterfaces } from "node:os";

/** 이 PC 의 랜(LAN) IPv4 주소. 없으면 null */
export function lanHost(): string | null {
  const groups = Object.values(networkInterfaces());
  const addrs = groups
    .flatMap((list) => list ?? [])
    .filter((i) => !i.internal && String(i.family) === "IPv4")
    .map((i) => i.address);
  // 가상 네트워크(도커·VM)보다 흔한 사설 대역을 먼저
  const preferred = addrs.find((a) => a.startsWith("192.168.") || a.startsWith("10."));
  return preferred ?? addrs[0] ?? null;
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

export const isLoopback = (hostname: string): boolean => LOOPBACK.has(hostname);

/** 폰에서 열 수 있는 이 앱의 주소 (끝에 / 없음) */
export function publicBaseUrl(reqUrl: string, env = process.env.NEXT_PUBLIC_APP_URL, lan = lanHost()): string {
  if (env) return env.replace(/\/$/, "");
  const url = new URL(reqUrl);
  if (isLoopback(url.hostname) && lan) url.hostname = lan;
  return url.origin;
}
