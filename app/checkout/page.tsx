// app/checkout/page.tsx
// Server Component shell。Prisma で初期 order データを取得して
// CheckoutClient（クライアント島）に props で渡す。
// これにより、クライアント側の初回 /api/seller/order-detail fetch が不要になり、
// HTML 受信 → ハイドレーション → 表示までの間に追加の HTTP RTT が発生しなくなる。
//
// さらに CHECKOUT_DIRECT_REDIRECT=1 のときは、この Server Component の中で
// Stripe Checkout Session を作り、決済ページへ 302 で直接飛ばす。
// 購入者は /checkout を描画・ハイドレートしてボタンをタップする必要がなくなる
// （＝QR を読んだらそのまま決済画面まで自動で進む）。
// フラグ OFF、bot アクセス、対象外の注文、Session 作成失敗のいずれでも
// 従来どおりの /checkout 画面にフォールバックする。

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getCheckoutInitialData } from '@/lib/checkout-server';
import { bumpAndAllow } from '@/lib/utils';
import {
  createCheckoutSessionForOrder,
  isDirectRedirectEnabled,
  isLinkPreviewBot,
  loadOrderForDirectRedirect,
} from '@/lib/checkout-stripe';
import CheckoutClient from './CheckoutClient';

// searchParams を使用 + DB 読み出しがあるので、必ず動的レンダリング
export const dynamic = 'force-dynamic';

interface CheckoutPageProps {
  searchParams: Promise<{ order?: string; s?: string }> | { order?: string; s?: string };
}

const RATE_LIMIT_MAX_DIRECT = 6;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 直リダイレクト先の Stripe URL を返す。対象外・失敗時は null（＝従来 UI へ）。
 * ここでは redirect() を呼ばない（NEXT_REDIRECT を握り潰さないため、呼び出し側で投げる）。
 */
async function resolveDirectRedirectUrl(
  orderId: string | null,
  sellerId: string | null
): Promise<string | null> {
  if (!isDirectRedirectEnabled()) return null;
  if (!orderId) return null;

  const userAgent = (await headers()).get('user-agent');
  if (isLinkPreviewBot(userAgent)) return null;

  // POST /api/checkout/session のレート制限を通らない経路なので、ここでも絞る。
  // 会場 Wi-Fi で多数の客が同一 IP になるため、IP ではなく注文単位で数える。
  // 超えたら従来 UI に落とす（そちらは POST 側のレート制限が効く）
  // 形式チェックを先にして、でたらめな ID でリミッターの Map が膨らまないようにする
  if (!UUID_RE.test(orderId)) return null;
  if (!bumpAndAllow(`checkout-direct:${orderId}`, RATE_LIMIT_MAX_DIRECT)) return null;

  const __t0 = Date.now();
  let __lapT = __t0;
  const lap = (label: string) => {
    const now = Date.now();
    console.warn(
      `[TIMING] checkout/direct ${label} step=${now - __lapT}ms total=${now - __t0}ms`
    );
    __lapT = now;
  };

  try {
    const order = await loadOrderForDirectRedirect(prisma, orderId, sellerId);
    lap('loadOrderForDirectRedirect');
    if (!order) return null;

    const result = await createCheckoutSessionForOrder(prisma, order, lap);
    if (!result.ok) {
      // Stripe 未設定・KYC 未完了などは従来 UI 側でエラーを出させる
      console.warn('[checkout] direct redirect skipped', {
        orderId,
        error: result.error,
      });
      return null;
    }
    return result.url;
  } catch (err) {
    // 直リダイレクトの失敗で購入導線を止めない
    console.error('[checkout] direct redirect failed, falling back to UI', err);
    return null;
  }
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  // Next.js 15 は searchParams が Promise になるため両対応
  const params = await Promise.resolve(searchParams);

  const orderId = params.order ?? null;
  const sellerId = params.s ?? null;

  const directUrl = await resolveDirectRedirectUrl(orderId, sellerId);
  if (directUrl) {
    // redirect() は内部で例外を投げるので try/catch の外で呼ぶ
    redirect(directUrl);
  }

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
