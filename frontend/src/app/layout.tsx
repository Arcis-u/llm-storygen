import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interactive Story AI — Tiểu Thuyết Tương Tác Nhập Vai",
  description:
    "Nền tảng tạo tiểu thuyết tương tác sử dụng AI Đa Tác Vụ. Nhập vai nhân vật chính, đưa ra quyết định, và định hình cốt truyện của riêng bạn.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="noise-overlay" aria-hidden="true" />
        <div className="ambient-bg" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
