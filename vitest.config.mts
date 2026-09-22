import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// 순수 로직(합성 계산·필터 수학·AI 응답 보정·인증 등)과 프린트 서버 루프를 Node에서 테스트.
// 브라우저 전용(WebGL·canvas) 렌더링은 개발 모드 디버그 핸들로 수동 점검 (CLAUDE.md 참고).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
