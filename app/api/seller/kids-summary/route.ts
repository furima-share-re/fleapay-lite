// app/api/seller/kids-summary/route.ts
// Phase 2.3: Next.js画面移行（KidsサマリーAPI Route Handler）

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { sanitizeError } from '@/lib/utils';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sellerId = url.searchParams.get('s');
  
  if (!sellerId) {
    return NextResponse.json(
      { error: 'seller_id_required' },
      { status: 400 }
    );
  }

  try {
    // 1) 基本集計
    const totalOrdersResult = await pool.query(
      `SELECT COUNT(*) AS cnt FROM orders WHERE seller_id = $1 AND deleted_at IS NULL`,
      [sellerId]
    );
    const totalOrders = Number(totalOrdersResult.rows[0]?.cnt || 0);

    const attrsResult = await pool.query(
      `SELECT 
         COUNT(*) AS total_with_attrs,
         COUNT(*) FILTER (WHERE customer_type = 'inbound') AS inbound_cnt,
         COUNT(*) FILTER (WHERE age_band = 'child') AS child_cnt
       FROM buyer_attributes ba
       JOIN orders o ON o.id = ba.order_id
       WHERE o.seller_id = $1 AND o.deleted_at IS NULL`,
      [sellerId]
    );

    const ordersWithAttrs = Number(attrsResult.rows[0]?.total_with_attrs || 0);
    const inboundCount = Number(attrsResult.rows[0]?.inbound_cnt || 0);
    const childCustomerCount = Number(attrsResult.rows[0]?.child_cnt || 0);

    const cashResult = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE om.is_cash = true) AS cash_cnt
       FROM orders o
       LEFT JOIN order_metadata om ON om.order_id = o.id
       WHERE o.seller_id = $1 AND o.deleted_at IS NULL`,
      [sellerId]
    );
    const cashOrders = Number(cashResult.rows[0]?.cash_cnt || 0);

    const cashlessResult = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM stripe_payments
       WHERE seller_id = $1
         AND status = 'succeeded'`,
      [sellerId]
    );
    const cashlessOrders = Number(cashlessResult.rows[0]?.cnt || 0);

    const dataScore =
      totalOrders === 0
        ? 0
        : Math.round((ordersWithAttrs / totalOrders) * 100);

    // 2) 実績判定
    const achievements: Array<{ code: string; kind: string; label: string; description: string }> = [];
    const badges: Array<{ code: string; label: string; description: string }> = [];
    const titles: Array<{ code: string; label: string; description: string }> = [];

    function addBadge(code: string, label: string, description: string) {
      badges.push({ code, label, description });
      achievements.push({ code, kind: 'badge', label, description });
    }

    function addTitle(code: string, label: string, description: string) {
      titles.push({ code, label, description });
      achievements.push({ code, kind: 'title', label, description });
    }

    // バッジ判定
    if (totalOrders >= 1) {
      addBadge('FIRST_SALE', 'はじめての売り子', '1回めの販売に成功！');
    }
    if (totalOrders >= 5) {
      addBadge('FIVE_SALES', '小さな商人', '5回以上 売れました');
    }
    if (cashlessOrders >= 1) {
      addBadge(
        'CASHLESS_1',
        'キャッシュレス入門',
        'QR / カードで1回決済できました'
      );
    }
    if (inboundCount >= 1) {
      addBadge(
        'INBOUND_FRIEND_1',
        '海外のお客さま いらっしゃい',
        'インバウンドのお客さまに1回以上販売'
      );
    }
    if (dataScore >= 80 && totalOrders >= 3) {
      addBadge(
        'DATA_SCORE_80',
        'データ名人',
        '購入者のタグ入力を 80%以上できました'
      );
    }

    // 称号判定
    if (totalOrders >= 10 && dataScore >= 70) {
      addTitle(
        'TITLE_YOUNG_MASTER',
        '若旦那 / 若女将 見習い',
        'たくさん売って、お客さまの情報もちゃんと入力できました'
      );
    }
    if (totalOrders >= 30 && dataScore >= 80) {
      addTitle(
        'TITLE_FULL_MASTER',
        '本物の若旦那 / 若女将',
        '売上とデータの両方でトップクラス！'
      );
    }

    // 3) DB に "初めて取った日" を保存（UPSERT）
    if (achievements.length > 0) {
      const values: string[] = [];
      const params: (string | number)[] = [];
      achievements.forEach((a, idx) => {
        const base = idx * 3;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
        params.push(sellerId, a.code, a.kind);
      });

      await pool.query(
        `
        INSERT INTO kids_achievements (seller_id, code, kind)
        VALUES ${values.join(',')}
        ON CONFLICT (seller_id, code) DO NOTHING
        `,
        params
      );
    }

    // 既に保存された first_earned_at も取得して返す
    const earnedRows = await pool.query(
      `SELECT code, kind, first_earned_at
         FROM kids_achievements
        WHERE seller_id = $1`,
      [sellerId]
    );

    const earnedMap: Record<string, { first_earned_at: Date | null; kind: string }> = {};
    for (const r of earnedRows.rows) {
      earnedMap[r.code] = {
        first_earned_at: r.first_earned_at,
        kind: r.kind,
      };
    }

    const badgesWithDate = badges.map((b) => ({
      ...b,
      first_earned_at: earnedMap[b.code]?.first_earned_at || null,
    }));
    const titlesWithDate = titles.map((t) => ({
      ...t,
      first_earned_at: earnedMap[t.code]?.first_earned_at || null,
    }));

    return NextResponse.json({
      stats: {
        totalOrders,
        ordersWithAttrs,
        cashOrders,
        cashlessOrders,
        inboundCount,
        childCustomerCount,
        dataScore,
      },
      badges: badgesWithDate,
      titles: titlesWithDate,
    });
  } catch (e) {
    console.error('/api/seller/kids-summary error', e);
    return NextResponse.json(
      sanitizeError(e),
      { status: 500 }
    );
  }
}

