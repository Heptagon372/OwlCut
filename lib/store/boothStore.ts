"use client";
// 촬영 → 편집 → 결과로 이어지는 클라이언트 상태 (zustand 모듈 싱글턴).
// 클라이언트 사이드 네비게이션(Link/router.push) 사이에서 유지된다.
// * 전체 새로고침 시 초기화됨 → booth 흐름은 앞으로만 진행(재촬영은 흐름 내에서).
import { create } from "zustand";
import type { CapturedPhoto } from "@/types/session";
import type { DesignState } from "@/types/design";
import {
  DEFAULT_FILTER,
  DEFAULT_FRAME_ID,
  DEFAULT_LAYOUT_ID,
} from "@/lib/data/registry";

const initialDesign: DesignState = {
  mode: "manual",
  layoutId: DEFAULT_LAYOUT_ID,
  frameId: DEFAULT_FRAME_ID,
  stickers: [],
  textLayers: [],
  filter: DEFAULT_FILTER,
  photoOrder: [0, 1, 2, 3],
  slotSpacing: 0,
  slotRounding: 0,
  backgroundColor: null,
};

interface BoothState {
  sessionId: string | null;
  photos: CapturedPhoto[];
  design: DesignState;
  finalDataUrl: string | null;
  downloadUrl: string | null;
  aiModelId: string | null; // 모델 선택 창의 선택값 (null = 서버 기본 모델)
  setSessionId: (id: string | null) => void;
  setPhotos: (photos: CapturedPhoto[]) => void;
  resetPhotos: () => void;
  setDesign: (patch: Partial<DesignState>) => void;
  setFinal: (dataUrl: string | null, downloadUrl: string | null) => void;
  setAiModelId: (id: string | null) => void;
  reset: () => void;
}

export const useBoothStore = create<BoothState>((set) => ({
  sessionId: null,
  photos: [],
  design: initialDesign,
  finalDataUrl: null,
  downloadUrl: null,
  aiModelId: null,
  setSessionId: (sessionId) => set({ sessionId }),
  setPhotos: (photos) => set({ photos }),
  resetPhotos: () => set({ photos: [] }),
  setDesign: (patch) => set((s) => ({ design: { ...s.design, ...patch } })),
  setFinal: (finalDataUrl, downloadUrl) => set({ finalDataUrl, downloadUrl }),
  setAiModelId: (aiModelId) => set({ aiModelId }),
  reset: () =>
    set({
      sessionId: null,
      photos: [],
      design: initialDesign,
      finalDataUrl: null,
      downloadUrl: null,
      aiModelId: null,
    }),
}));
