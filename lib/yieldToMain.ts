// 긴 반복 작업(썸네일 수십 장 만들기 등)을 쪼개 중간중간 브라우저에 차례를 넘긴다.
// 한 번에 몰아서 하면 촬영 화면 실시간 미리보기가 0.2초씩 멈칫한다 (long task).
export function yieldToMain(): Promise<void> {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (s?.yield) return s.yield();
  return new Promise((r) => setTimeout(r, 0));
}

/** 약 budgetMs 마다 한 번씩 양보하며 items 를 처리. 취소되면(false 반환) 중단 */
export async function forEachChunked<T>(
  items: readonly T[],
  fn: (item: T) => void,
  isAlive: () => boolean = () => true,
  budgetMs = 12,
): Promise<boolean> {
  let start = performance.now();
  for (const item of items) {
    if (!isAlive()) return false;
    fn(item);
    if (performance.now() - start > budgetMs) {
      await yieldToMain();
      start = performance.now();
    }
  }
  return isAlive();
}
