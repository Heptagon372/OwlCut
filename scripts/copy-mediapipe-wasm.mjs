// postinstall: MediaPipe WASM 런타임을 public/ 로 복사해 자체 호스팅한다 (행사장 CDN 장애 대비).
// 34MB라 git에는 넣지 않음 (.gitignore: /public/mediapipe). SIMD / non-SIMD 비모듈 빌드만 복사.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "node_modules/@mediapipe/tasks-vision/wasm";
const DEST = "public/mediapipe/wasm";
const FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

if (!existsSync(SRC)) {
  console.warn("[mediapipe] tasks-vision 미설치 — WASM 복사 건너뜀 (얼굴 추적 비활성)");
  process.exit(0);
}

mkdirSync(DEST, { recursive: true });
for (const f of FILES) copyFileSync(join(SRC, f), join(DEST, f));
console.log(`[mediapipe] WASM ${FILES.length}개 → ${DEST}`);
