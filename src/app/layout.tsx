import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VideoForge - AI動画エディタ",
  description: "ブラウザで完結するAI動画編集ツール。自動無音カット・字幕生成・テロップ追加・SNSテンプレート対応。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script src="/coi-serviceworker.js" />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
