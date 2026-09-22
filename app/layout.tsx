import type { Metadata } from "next";
import localFont from "next/font/local";
import { Manrope } from "next/font/google";
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

export const metadata: Metadata = {
  title: "아울네컷 · S.OWL PHOTO BOOTH",
  description: "촬영하고, 꾸미고, QR로 바로 받는 네컷 포토부스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="app-bg" aria-hidden />
        {children}
      </body>
    </html>
  );
}
