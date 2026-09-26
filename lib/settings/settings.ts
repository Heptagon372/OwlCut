// 부스 설정 — 언어 · 화면 크기 · 인화 크기. 쿠키에 저장해 서버가 첫 화면부터 같은 설정으로 그린다
// (클라이언트 저장소만 쓰면 새로고침 때 한국어 → 영어로 바뀌며 깜빡인다).
export const LANGS = ["ko", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const UI_SCALES = ["sm", "md", "lg"] as const;
export type UiScale = (typeof UI_SCALES)[number];
/** rem 배율 — Tailwind 크기가 전부 rem 이라 글자·버튼·여백이 함께 커진다 */
export const SCALE_VALUE: Record<UiScale, number> = { sm: 0.9, md: 1, lg: 1.18 };

// 인화 크기 (사진관 프린터 기준). ratio = 가로/세로, 같은 비율의 레이아웃을 권한다
export const PRINT_SIZES = ["4x6", "2x6", "5x7", "a6"] as const;
export type PrintSize = (typeof PRINT_SIZES)[number];
export const PRINT_SPEC: Record<PrintSize, { label: string; labelEn: string; mm: [number, number]; dpi: number }> = {
  "4x6": { label: "4x6 (10x15cm)", labelEn: '4x6 in (10x15cm)', mm: [102, 152], dpi: 300 },
  "2x6": { label: "2x6 반띵 스트립", labelEn: "2x6 in strip", mm: [51, 152], dpi: 300 },
  "5x7": { label: "5x7 (13x18cm)", labelEn: "5x7 in (13x18cm)", mm: [127, 178], dpi: 300 },
  a6: { label: "A6 엽서", labelEn: "A6 postcard", mm: [105, 148], dpi: 300 },
};

// 인쇄 방식: auto = 부스 프린터(출력 큐)가 되면 그걸로, 안 되면 이 기기에서 바로
//           direct = 항상 이 기기에 연결된 프린터, off = 출력 버튼 숨김
export const PRINT_MODES = ["auto", "direct", "off"] as const;
export type PrintMode = (typeof PRINT_MODES)[number];

export interface Settings {
  lang: Lang;
  uiScale: UiScale;
  printSize: PrintSize;
  printMode: PrintMode;
}

export const DEFAULT_SETTINGS: Settings = { lang: "ko", uiScale: "md", printSize: "4x6", printMode: "auto" };
export const SETTINGS_COOKIE = "owlcut_settings";
export const SETTINGS_MAX_AGE = 60 * 60 * 24 * 365;

const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback;

/** 쿠키 값 → 설정 (깨진 값은 기본값) */
export function parseSettings(raw: string | undefined | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Partial<Settings>;
    return {
      lang: oneOf(LANGS, v.lang, DEFAULT_SETTINGS.lang),
      uiScale: oneOf(UI_SCALES, v.uiScale, DEFAULT_SETTINGS.uiScale),
      printSize: oneOf(PRINT_SIZES, v.printSize, DEFAULT_SETTINGS.printSize),
      printMode: oneOf(PRINT_MODES, v.printMode, DEFAULT_SETTINGS.printMode),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const serializeSettings = (s: Settings) => encodeURIComponent(JSON.stringify(s));

/** 방문자 폰(다운로드 페이지)은 설정 쿠키가 없으므로 브라우저 언어로 */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return DEFAULT_SETTINGS.lang;
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("ko") ? "ko" : first ? "en" : DEFAULT_SETTINGS.lang;
}
