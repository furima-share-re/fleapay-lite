// lib/checkout-server.ts
// Server-only helper to fetch initial checkout data without an HTTP roundtrip.
// Used by app/checkout/page.tsx (Server Component) to SSR the amount.

import 'server-only';
import { prisma } from '@/lib/prisma';
import { normalizeSellerId } from '@/lib/utils';

const PENDING_TTL_MIN = parseInt(process.env.PENDING_TTL_MIN || '10', 10);

export type CheckoutInitialOrder = {
  orderId: string;
  sellerId: string;
  amount: number;
  summary: string;
};

export type CheckoutInitialData =
  | { kind: 'ready'; order: CheckoutInitialOrder }
  | { kind: 'pending_amount'; order: CheckoutInitialOrder } // amount===0、店員が金額入力中
  | { kind: 'expired' }
  | { kind: 'not_found' }
  | { kind: 'empty' }; // QR に order が含まれない場合

/**
 * /checkout 初期描画用のデータ取得。
 * /api/seller/order-detail と同等の判定を Prisma 直叩きで行い、
 * HTTP オーバーヘッドとクライアント側の追加 fetch を排除する。
 *
 * - findUnique({where:{id}, select:{...}}) で必要列だけ取得（PK 検索 + 列削減）
 * - seller/deleted の検証は in-memory で行う
 */
export async function getCheckoutInitialData(
  orderIdRaw: string | undefined,
  sellerIdRaw: string | undefined
): Promise<CheckoutInitialData> {
  const orderId = (orderIdRaw || '').trim();
  const sellerId = normalizeSellerId((sellerIdRaw || '').trim());

  if (!orderId) {
    return { kind: 'empty' };
  }

  // UUID 形式チェック（Prisma で db.Uuid 列にゴミを投げると例外になるため）
  const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
  if (!isUuidLike) {
    return { kind: 'not_found' };
  }

  let order;
  try {
    order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        sellerId: true,
        amount: true,
        summary: true,
        status: true,
        createdAt: true,
        deletedAt: true,
        orderMetadata: { select: { isCash: true } },
      },
    });
  } catch (err) {
    console.error('[checkout-server] prisma error', err);
    return { kind: 'not_found' };
  }

  if (!order || order.deletedAt !== null) {
    return { kind: 'not_found' };
  }

  // sellerId が URL と一致しない場合（他人の注文）も not_found 扱い
  if (sellerId && order.sellerId !== sellerId) {
    return { kind: 'not_found' };
  }

  const expireMs = PENDING_TTL_MIN * 60 * 1000;
  const isExpiredByTime = Date.now() - order.createdAt.getTime() > expireMs;
  const isInactiveStatus = order.status !== 'pending';
  const isCash = order.orderMetadata?.isCash === true;

  if (isExpiredByTime || isInactiveStatus || isCash) {
    return { kind: 'expired' };
  }

  const amount = Number(order.amount) || 0;
  const base: CheckoutInitialOrder = {
    orderId: order.id,
    sellerId: order.sellerId,
    amount,
    summary: order.summary ?? '',
  };

  if (amount > 0) {
    return { kind: 'ready', order: base };
  }
  return { kind: 'pending_amount', order: base };
}
