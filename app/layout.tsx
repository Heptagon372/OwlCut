import type { Metadata } from "next";
import localFont from "next/font/local";
import { Black_Han_Sans, Caveat, DM_Serif_Display, Gaegu, Manrope, Space_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "아울네컷 · S.OWL PHOTO BOOTH",
  description: "촬영하고, 꾸미고, QR로 바로 받는 네컷 포토부스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${manrope.variable} ${decoFonts} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="app-bg" aria-hidden />
        {children}
      </body>
    </html>
  );
}
