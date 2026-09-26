"use client";
// MediaPipe(TFLite/WASM)는 정보성 로그를 console.error·warn 으로 내보낸다.
//   "INFO: Created TensorFlow Lite XNNPACK delegate for CPU."
//   "W0000 ... gl_context.cc ... OpenGL error checking is disabled"
// 개발 모드에서 Next 오류 오버레이가 이걸 빨간 오류로 띄워 진짜 오류를 덮어 버리므로,
// 아래 패턴과 정확히 맞는 줄만 조용히 넘긴다 (그 외 메시지는 원래대로 전달 — 진짜 오류를 숨기지 않는다).
const NOISE = [
  /Created TensorFlow Lite XNNPACK delegate/i,
  /TensorFlow Lite XNNPACK delegate for CPU/i,
  /Sets FaceBlendshapesGraph acceleration/i,
  /OpenGL error checking is disabled/i,
  /Graph successfully started running/i,
  /GL version: .*renderer:/i,
  /feedback manager requires a graph with 2 calculators/i,
  /All log messages before absl::InitializeLog/i,
];

const isNoise = (args: unknown[]): boolean => {
  const first = args[0];
  if (typeof first !== "string") return false;
  return NOISE.some((re) => re.test(first));
};

let depth = 0;
let restore: (() => void) | null = null;

/** 추적을 쓰는 동안만 걸러 준다. 반환값을 호출하면 원래대로 (여러 번 켜도 안전) */
export function silenceMediapipeLogs(): () => void {
  depth++;
  if (depth === 1 && typeof console !== "undefined") {
    const error = console.error;
    const warn = console.warn;
    const log = console.log;
    console.error = (...args: unknown[]) => {
      if (!isNoise(args)) error.apply(console, args as []);
    };
    console.warn = (...args: unknown[]) => {
      if (!isNoise(args)) warn.apply(console, args as []);
    };
    console.log = (...args: unknown[]) => {
      if (!isNoise(args)) log.apply(console, args as []);
    };
    restore = () => {
      console.error = error;
      console.warn = warn;
      console.log = log;
    };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth = Math.max(0, depth - 1);
    if (depth === 0 && restore) {
      restore();
      restore = null;
    }
  };
}

/** 테스트용 */
export const isMediapipeNoise = (message: unknown): boolean => isNoise([message]);
