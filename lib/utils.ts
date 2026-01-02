// lib/utils.ts
// Phase 2.3: 共通ユーティリティ関数

import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/**
 * JSTの日付境界を取得
 */
export function jstDayBounds() {
  const nowUtc = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // JST = UTC+9
  const nowJstMs = nowUtc.getTime() + jstOffset;
  const nowJst = new Date(nowJstMs);
  
  // JST基準で今日の0:00を求める
  const todayJst = new Date(nowJst);
  todayJst.setUTCHours(0, 0, 0, 0);
  
  // UTC基準の日付境界に戻す
  const todayStart = new Date(todayJst.getTime() - jstOffset);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  
  return { todayStart, tomorrowStart, yesterdayStart };
}

/**
 * 次のorder_noを取得（PrismaClient版）
 */
export async function getNextOrderNo(prisma: PrismaClient, sellerId: string): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ next_no: bigint }>>`
    SELECT COALESCE(MAX(order_no), 0) + 1 AS next_no 
    FROM orders 
    WHERE seller_id = ${sellerId}
  `;
  return Number(result[0]?.next_no || 1);
}

/**
 * セラーのStripeアカウントIDを解決（PrismaClient版）
 */
export async function resolveSellerAccountId(prisma: PrismaClient, sellerId: string): Promise<string | null> {
  if (!sellerId) return null;
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { stripeAccountId: true }
  });
  return seller?.stripeAccountId || null;
}

/**
 * 出店者用URL生成
 */
export function buildSellerUrls(sellerId: string, stripeAccountId: string | null, orderId: string | null = null) {
  const base = BASE_URL;
  const sellerUrl = `${base}/seller-purchase.html?s=${encodeURIComponent(sellerId)}`;
  
  let checkoutUrl = `${base}/checkout.html?s=${encodeURIComponent(sellerId)}`;
  if (orderId) {
    checkoutUrl += `&order=${encodeURIComponent(orderId)}`;
  }
  if (stripeAccountId) {
    checkoutUrl += `&acct=${encodeURIComponent(stripeAccountId)}`;
  }
  
  const dashboardUrl = `${base}/seller-dashboard.html?s=${encodeURIComponent(sellerId)}`;
  return { sellerUrl, checkoutUrl, dashboardUrl };
}

/**
 * エラーをサニタイズ
 */
export function sanitizeError(error: unknown): { error: string; message?: string } {
  if (error instanceof Error) {
    return { error: 'internal_error', message: error.message };
  }
  return { error: 'internal_error' };
}

/**
 * レート制限用のメモリマップ
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const hits = new Map<string, number[]>();

/**
 * レート制限チェック
 */
export function bumpAndAllow(key: string, limit: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length <= limit;
}

/**
 * クライアントIPアドレスを取得（Next.js Request版）
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

/**
 * 同一オリジンチェック（Next.js Request版）
 */
export function isSameOrigin(request: Request): boolean {
  if (!BASE_URL) return true;
  const referer = request.headers.get('referer') || request.headers.get('origin') || '';
  return referer.startsWith(BASE_URL);
}

/**
 * 監査ログ出力
 */
export function audit(event: string, payload: Record<string, unknown>) {
  console.log(`[AUDIT] ${event}`, JSON.stringify(payload, null, 2));
}

/**
 * 文字列をURLフレンドリーなスラッグ形式に変換
 */
export function slugify(str: string): string {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[ぁ-ん]/g, "")    // ざっくりひらがな削除
    .replace(/[^\w\-]+/g, "-")  // 英数と - _ 以外を -
    .replace(/\-+/g, "-")
    .replace(/^\-+|\-+$/g, "");
}

