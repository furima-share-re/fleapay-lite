// Phase 2: Next.js移行
// ルートレイアウト

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fleapay',
  description: 'フリマアプリMVP with Stripe and OpenAI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Yusei+Magic&family=M+PLUS+Rounded+1c:wght@500;700;900&display=swap" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Nunito+Sans:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}

