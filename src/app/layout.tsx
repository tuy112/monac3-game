import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
      title: "모나크모나크 3 | 왕관의 대지",
      description: "왕국을 세우고 영토를 넓히는 전략 게임",
};

export default function RootLayout({
      children,
}: Readonly<{
      children: React.ReactNode;
}>) {
      return (
            <html lang="ko">
                  <body>{children}</body>
            </html>
      );
}
