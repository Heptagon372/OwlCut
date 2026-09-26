// 어떤 저장소를 쓸지 고른다 (서버 전용).
// Supabase 설정이 있으면 Supabase, 없고 Firebase 설정이 있으면 Firebase, 둘 다 없으면 저장 기능만 꺼진다
// (촬영·꾸미기·로컬 저장은 저장소 없이도 동작한다 — 설계도의 원칙).
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { SupabaseStore } from "./supabaseStore";
import { FirebaseStore, isFirebaseConfigured } from "./firebaseStore";
import type { BoothStore, StoreKind } from "./store";

export * from "./store";
export { isFirebaseConfigured };

export const STORE_NOT_CONFIGURED = "SUPABASE_NOT_CONFIGURED"; // 클라이언트가 이미 아는 코드 (호환)

let injected: BoothStore | null = null; // 테스트용 가짜 저장소
let cached: BoothStore | null = null;
let cachedKind: StoreKind | null = null;

export function storeKind(): StoreKind | null {
  if (injected) return injected.kind;
  if (isSupabaseConfigured()) return "supabase";
  if (isFirebaseConfigured()) return "firebase";
  return null;
}

export const isStoreConfigured = (): boolean => storeKind() !== null;

/** 저장소 (없으면 throw — 라우트는 isStoreConfigured 로 먼저 확인하고 503 을 준다) */
export function getStore(): BoothStore {
  if (injected) return injected;
  const kind = storeKind();
  if (!kind) throw new Error(STORE_NOT_CONFIGURED);
  if (!cached || cachedKind !== kind) {
    cached = kind === "supabase" ? new SupabaseStore() : new FirebaseStore();
    cachedKind = kind;
  }
  return cached;
}

/** 테스트용: 가짜 저장소를 끼워 넣는다 (null 이면 원래대로) */
export function setStoreForTest(store: BoothStore | null): void {
  injected = store;
}
