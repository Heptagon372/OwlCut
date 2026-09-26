import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import localFont from "next/font/local";
import { Black_Han_Sans, Caveat, DM_Serif_Display, Gaegu, Manrope, Space_Mono } from "next/font/google";
import { SettingsProvider } from "@/lib/i18n/context";
import { DEFAULT_SETTINGS, SCALE_VALUE, SETTINGS_COOKIE, langFromAcceptLanguage, parseSettings, type Settings } from "@/lib/settings/settings";
import "./globals.css";

// 한글: Pretendard (github.com/orioncactus/pretendard, OFL-1.1) — 가변 폰트, 45~920 굵기
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

// 영문·숫자 디스플레이: Manrope (Google Fonts, OFL-1.1) — 가변 폰트, 200~800 굵기
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

// 프레임 문구·글자 스티커용 (모두 Google Fonts, OFL-1.1). 캔버스에서 쓰므로 lib/fonts.ts 가 CSS 변수로 실제 이름을 읽는다.
// 화면 첫 로딩에 필요 없으므로 preload 끔 (쓸 때 document.fonts.load 로 불러옴)
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-hand", display: "swap", preload: false });
const gaegu = Gaegu({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-hangul-hand", display: "swap", preload: false });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-serif", display: "swap", preload: false });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap", preload: false });
const blackHan = Black_Han_Sans({ subsets: ["latin"], weight: "400", variable: "--font-hangul-display", display: "swap", preload: false });
const decoFonts = [caveat, gaegu, dmSerif, spaceMono, blackHan].map((f) => f.variable).join(" ");

// viewport-fit=cover + 아래 body 의 safe-area 여백 → 노치 있는 아이폰에서도 버튼이 가려지지 않음
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e4e4e8",
};

// 탭 제목도 설정 언어로 (부스 쿠키 → 없으면 브라우저 언어)
export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await currentSettings();
  return lang === "en"
    ? { title: "OwlCut · S.OWL PHOTO BOOTH", description: "Shoot, decorate, and get your photo strip by QR" }
    : { title: "아울네컷 · S.OWL PHOTO BOOTH", description: "촬영하고, 꾸미고, QR로 바로 받는 네컷 포토부스" };
}

// 설정은 쿠키에 있으므로 서버가 첫 그림부터 같은 언어·크기로 그린다 (새로고침 때 문구가 바뀌며 깜빡이지 않게).
// 부스에는 설정 쿠키가 있고, QR 로 들어온 방문자 폰에는 없다 → 폰은 브라우저 언어를 따른다.
async function currentSettings(): Promise<Settings> {
  const saved = (await cookies()).get(SETTINGS_COOKIE)?.value;
  if (saved) return parseSettings(saved);
  return { ...DEFAULT_SETTINGS, lang: langFromAcceptLanguage((await headers()).get("accept-language")) };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await currentSettings();
  return (
    <html
      lang={settings.lang}
      // --ui-scale: rem 배율 (globals.css 의 html font-size) → 글자·버튼·여백이 함께 커진다
      style={{ "--ui-scale": SCALE_VALUE[settings.uiScale] } as React.CSSProperties}
      className={`${pretendard.variable} ${manrope.variable} ${decoFonts} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <div className="app-bg" aria-hidden />
        <SettingsProvider initial={settings}>{children}</SettingsProvider>
      </body>
    </html>
  );
}
