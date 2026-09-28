import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "世界通貨フローマップ",
  description: "主要8通貨の相対的な強弱を、実世界地図上のアニメーション矢印として可視化するWebアプリ。",
  applicationName: "世界通貨フローマップ",
  icons: { icon: "/app-icon.svg", apple: "/app-icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3f7" },
    { media: "(prefers-color-scheme: dark)", color: "#07131e" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja" suppressHydrationWarning><body>{children}</body></html>;
}
