import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans-kr",
  display: "swap"
});

export const metadata: Metadata = {
  title: "SOMA AI Promo Desk",
  description: "소상공인을 위한 Solar 기반 홍보 문구와 mock 이미지 생성 작업대"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className={notoSansKr.variable}>{children}</body>
    </html>
  );
}
