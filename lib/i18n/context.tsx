"use client";
// 설정(언어·화면 크기·인화 크기)을 화면 전체에 전달한다.
// 값은 서버(root layout)가 쿠키에서 읽어 넘겨 주므로 첫 그림부터 올바른 언어 → 깜빡임 없음.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_SETTINGS,
  SCALE_VALUE,
  SETTINGS_COOKIE,
  SETTINGS_MAX_AGE,
  serializeSettings,
  type Lang,
  type Settings,
} from "@/lib/settings/settings";
import { translate, type MessageKey } from "./messages";

export type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

interface Ctx extends Settings {
  t: T;
  /** 데이터(필터·프레임·스티커) 이름: 영어 이름이 있으면 그것으로 */
  label: (item: { label: string; labelEn?: string }) => string;
  set: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ initial, children }: { initial: Settings; children: ReactNode }) {
  const [settings, setSettings] = useState(initial);

  const set = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      document.cookie = `${SETTINGS_COOKIE}=${serializeSettings(next)}; path=/; max-age=${SETTINGS_MAX_AGE}; samesite=lax`;
      // 화면 크기는 rem 배율 → 글자·버튼·여백이 함께 커진다. 언어는 스크린리더·자동 번역용.
      document.documentElement.style.setProperty("--ui-scale", String(SCALE_VALUE[next.uiScale]));
      document.documentElement.lang = next.lang;
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(() => {
    const t: T = (key, vars) => translate(settings.lang, key, vars);
    return {
      ...settings,
      t,
      label: (item) => (settings.lang === "en" ? (item.labelEn ?? item.label) : item.label),
      set,
    };
  }, [settings, set]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** 제공자 밖(테스트·독립 컴포넌트)에서도 터지지 않게 기본 설정으로 대체 */
export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (ctx) return ctx;
  return {
    ...DEFAULT_SETTINGS,
    t: (key, vars) => translate(DEFAULT_SETTINGS.lang, key, vars),
    label: (item) => item.label,
    set: () => {},
  };
}

export const useT = (): T => useSettings().t;
export const useLang = (): Lang => useSettings().lang;
