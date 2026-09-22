// 재시도 도우미 (설계도 10 "Storage 업로드 실패 → 재시도 3회"). 순수 로직 — sleep 을 바꿔 끼워 테스트한다.
// run 은 throw 하지 않고 결과를 돌려주는 함수, shouldRetry 가 그 결과로 다시 할지 정한다.

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withRetry<T>(
  run: (attempt: number) => Promise<T>,
  {
    attempts,
    delaysMs,
    shouldRetry,
    onAttempt,
    sleep = defaultSleep,
  }: {
    attempts: number;
    delaysMs: number[]; // i번째 실패 뒤 기다릴 시간 (모자라면 마지막 값 반복)
    shouldRetry: (result: T) => boolean;
    onAttempt?: (attempt: number) => void;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<T> {
  let result!: T;
  for (let i = 1; i <= attempts; i++) {
    onAttempt?.(i);
    result = await run(i);
    if (i === attempts || !shouldRetry(result)) break;
    await sleep(delaysMs[Math.min(i - 1, delaysMs.length - 1)] ?? 0);
  }
  return result;
}
