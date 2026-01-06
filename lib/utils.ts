import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Tailwind CSS用のユーティリティ
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ====== 既存のユーティリティ関数（Next.js用に書き直し） ======

// レート制限（メモリベース）
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const hits = new Map<string, number[]>();

export function bumpAndAllow(key: string, limit: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length <= limit;
}

// クライアントIP取得（Next.js Request用）
export function clientIp(request: NextRequest | Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

// ベースURL取得ヘルパー
function getBaseUrl(): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, '');
  }
  return '';
}

// 同一オリジンチェック（Next.js Request用）
export function isSameOrigin(request: NextRequest | Request): boolean {
  const BASE_URL = getBaseUrl();
  if (!BASE_URL) return true;
  
  const referer = request.headers.get('referer') || request.headers.get('origin') || '';
  return referer.startsWith(BASE_URL);
}

// 監査ログ
export function audit(event: string, payload: Record<string, unknown>): void {
  console.warn(`[AUDIT] ${event}`, JSON.stringify(payload, null, 2));
}

// StripeアカウントID解決（Prisma用）
export async function resolveSellerAccountId(prisma: PrismaClient, sellerId: string): Promise<string | null> {
  if (!sellerId) return null;
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { stripeAccountId: true }
  });
  return seller?.stripeAccountId || null;
}

// 出店者用URL生成
export function buildSellerUrls(sellerId: string, stripeAccountId: string | null, orderId: string | null = null) {
  const base = getBaseUrl() || 'http://localhost:3000';
  const sellerUrl = `${base}/seller-purchase-standard?s=${encodeURIComponent(sellerId)}`;
  
  let checkoutUrl = `${base}/checkout?s=${encodeURIComponent(sellerId)}`;
  if (orderId) {
    checkoutUrl += `&order=${encodeURIComponent(orderId)}`;
  }
  if (stripeAccountId) {
    checkoutUrl += `&acct=${encodeURIComponent(stripeAccountId)}`;
  }
  
  const dashboardUrl = `${base}/seller-dashboard?s=${encodeURIComponent(sellerId)}`;
  return { sellerUrl, checkoutUrl, dashboardUrl };
}

// JST日付境界計算
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

// 次のorder_no取得（Prisma用）
export async function getNextOrderNo(prisma: PrismaClient, sellerId: string): Promise<number> {
  const result = await prisma.order.findFirst({
    where: { sellerId },
    orderBy: { orderNo: 'desc' },
    select: { orderNo: true }
  });
  return (result?.orderNo || 0) + 1;
}

// エラーサニタイズ
export function sanitizeError(error: unknown, isDevelopment: boolean = process.env.NODE_ENV === 'development') {
  if (isDevelopment) {
    const err = error as Error;
    return { error: "internal_error", detail: err.message, stack: err.stack };
  }
  return { error: "internal_error", message: "サーバー内部エラーが発生しました" };
}

// スラッグ化
export function slugify(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[ぁ-ん]/g, '')    // ざっくりひらがな削除
    .replace(/[^\w\-]+/g, '-')  // 英数と - _ 以外を -
    .replace(/\-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}
