// Phase 2: Next.js移行
// ルートレイアウト

import type { Metadata } from 'next';

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
      <body>{children}</body>
    </html>
  );
}

