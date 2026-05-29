// app/checkout/page.tsx
// Server Component shell。Prisma で初期 order データを取得して
// CheckoutClient（クライアント島）に props で渡す。
// これにより、クライアント側の初回 /api/seller/order-detail fetch が不要になり、
// HTML 受信 → ハイドレーション → 表示までの間に追加の HTTP RTT が発生しなくなる。

import { getCheckoutInitialData } from '@/lib/checkout-server';
import CheckoutClient from './CheckoutClient';

// searchParams を使用 + DB 読み出しがあるので、必ず動的レンダリング
export const dynamic = 'force-dynamic';

interface CheckoutPageProps {
  searchParams: Promise<{ order?: string; s?: string }> | { order?: string; s?: string };
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  // Next.js 15 は searchParams が Promise になるため両対応
  const params = await Promise.resolve(searchParams);

  const orderId = params.order ?? null;
  const sellerId = params.s ?? null;

  const initialData = await getCheckoutInitialData(
    orderId ?? undefined,
    sellerId ?? undefined
  );

  return (
    <CheckoutClient
      // key で orderId が変わったら再マウントしてクライアント側 state をリセット
      key={orderId ?? 'empty'}
      initialData={initialData}
      orderId={orderId}
      sellerId={sellerId}
    />
  );
}
