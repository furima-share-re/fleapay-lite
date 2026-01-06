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
  // Vercelの本番環境では、VERCEL_PROJECT_PRODUCTION_URLまたはNEXT_PUBLIC_VERCEL_URLを使用
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, '');
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, '');
  }
  return '';
}

// 同一オリジンチェック（Next.js Request用）
export function isSameOrigin(request: NextRequest | Request): boolean {
  try {
    // リクエストのホストを取得（最も確実な方法）
    const host = request.headers.get('host') || '';
    const referer = request.headers.get('referer') || '';
    const origin = request.headers.get('origin') || '';
    
    // ホスト名を正規化（ポート番号を除去）
    const normalizeHostname = (h: string) => h.toLowerCase().split(':')[0];
    const hostLower = host ? normalizeHostname(host) : '';
    
    // request.urlからホスト名を抽出
    let requestHostname = '';
    try {
      const requestUrlStr = request.url ? String(request.url) : '';
      if (requestUrlStr) {
        let requestUrl: URL;
        // request.urlが既に完全なURLの場合はそのまま使用
        if (requestUrlStr.startsWith('http://') || requestUrlStr.startsWith('https://')) {
          requestUrl = new URL(requestUrlStr);
        } else {
          // 相対URLの場合は、hostヘッダーから構築
          const protocol = request.headers.get('x-forwarded-proto') || 'https';
          requestUrl = new URL(requestUrlStr, `${protocol}://${host}`);
        }
        requestHostname = normalizeHostname(requestUrl.hostname);
      }
    } catch (urlError) {
      // URL解析エラーは無視
    }
    
    // チェック1: ホストヘッダーとrequest.urlのホスト名が一致するか（同じドメインからのリクエスト）
    if (hostLower && requestHostname && hostLower === requestHostname) {
      return true;
    }
    
    // チェック2: refererが同じドメインか
    if (hostLower && referer) {
      try {
        const refUrl = new URL(referer);
        if (normalizeHostname(refUrl.hostname) === hostLower) {
          return true;
        }
      } catch (e) {
        // URL解析エラーは無視
      }
    }
    
    // チェック3: originが同じドメインか
    if (hostLower && origin) {
      try {
        const origUrl = new URL(origin);
        if (normalizeHostname(origUrl.hostname) === hostLower) {
          return true;
        }
      } catch (e) {
        // URL解析エラーは無視
      }
    }
    
    // チェック4: BASE_URLが設定されている場合、それと比較
    const BASE_URL = getBaseUrl();
    if (BASE_URL) {
      let baseHostname = '';
      try {
        const baseUrlObj = new URL(BASE_URL);
        baseHostname = baseUrlObj.hostname.toLowerCase();
      } catch (e) {
        // BASE_URLが無効な場合はホスト名のみで比較
        baseHostname = BASE_URL.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
      }
      
      // ホストヘッダーがBASE_URLのホスト名と一致するか
      if (hostLower && hostLower === baseHostname) {
        return true;
      }
      
      // request.urlのホスト名がBASE_URLのホスト名と一致するか
      if (requestHostname && requestHostname === baseHostname) {
        return true;
      }
      
      // refererまたはoriginがBASE_URLで始まるか
      if (referer && referer.startsWith(BASE_URL)) {
        return true;
      }
      
      if (origin && origin.startsWith(BASE_URL)) {
        return true;
      }
    }
    
    // デバッグログ（本番環境でも出力して問題を特定しやすくする）
    console.warn('[isSameOrigin] Check failed:', {
      BASE_URL: BASE_URL || '(not set)',
      host: hostLower,
      referer,
      origin,
      requestHostname,
      requestUrl: request.url ? String(request.url) : ''
    });
  } catch (error) {
    // エラーが発生した場合は、セキュリティのためfalseを返す
    console.error('[isSameOrigin] Error:', error);
  }
  
  return false;
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
// seller_idエイリアス: データベースに存在するseller_idにマッピング
// 例: test-seller-1 → seller-test01
export function normalizeSellerId(sellerId: string): string {
  const sellerIdAliases: Record<string, string> = {
    'test-seller-1': 'seller-test01',
  };
  
  return sellerIdAliases[sellerId] || sellerId;
}

export function slugify(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[ぁ-ん]/g, '')    // ざっくりひらがな削除
    .replace(/[^\w\-]+/g, '-')  // 英数と - _ 以外を -
    .replace(/\-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}
