// app/api/admin/ebay-sold/route.ts
// 管理者: eBay売れ筋データ取得API

import { NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/utils';
import { fetchEbayTopSoldItems } from '@/worldPriceEngine/ebayClient.js';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-devtoken';

function requireAdmin(request: Request): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

const ALLOWED_MARKETPLACES = new Set([
  'EBAY_US',
  'EBAY_GB',
  'EBAY_JP',
  'EBAY_DE',
  'EBAY_AU',
  'EBAY_FR',
  'EBAY_CA',
]);

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const keyword = (url.searchParams.get('q') || '').trim();
    const limitRaw = Number(url.searchParams.get('limit') || 10);
    const marketplaceRaw = (url.searchParams.get('marketplace') || 'EBAY_US').toUpperCase();

    if (!keyword) {
      return NextResponse.json(
        { ok: false, error: 'keyword_required', message: '検索キーワードが必要です' },
        { status: 400 }
      );
    }

    const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 10));
    const marketplace = ALLOWED_MARKETPLACES.has(marketplaceRaw) ? marketplaceRaw : 'EBAY_US';

    const result = await fetchEbayTopSoldItems(keyword, marketplace, { limit });

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          error: 'ebay_unavailable',
          message: 'eBay売れ筋データを取得できませんでした'
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      keyword,
      marketplace,
      total: result.total || 0,
      items: result.items || [],
    });
  } catch (e) {
    console.error('/api/admin/ebay-sold error', e);
    return NextResponse.json(
      { ok: false, ...sanitizeError(e) },
      { status: 500 }
    );
  }
}
