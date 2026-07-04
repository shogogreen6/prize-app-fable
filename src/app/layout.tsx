import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "プライズウォッチ",
  description:
    "好きなアニメのクレーンゲームプライズ最新情報をまとめてチェック",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
            <Link href="/" className="font-bold text-lg">
              🎯 プライズウォッチ
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link
                href="/"
                className="hover:underline underline-offset-4 decoration-2"
              >
                プライズ一覧
              </Link>
              <Link
                href="/animes"
                className="hover:underline underline-offset-4 decoration-2"
              >
                アニメ管理
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
          {children}
        </main>
        <footer className="mx-auto max-w-6xl w-full px-4 py-4 text-xs text-neutral-500">
          出典: バンプレストナビサイト (bsp-prize.jp) / セガプラザ
          (segaplaza.jp) — 個人利用の情報集約アプリ
        </footer>
      </body>
    </html>
  );
}
