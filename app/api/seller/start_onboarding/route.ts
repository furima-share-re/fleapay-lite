// app/api/seller/start_onboarding/route.ts
// Phase 2.3: Next.js画面移行（セラー登録画面のAPI Route Handler）

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase.js';
import { Pool } from 'pg';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { 
  apiVersion: '2025-10-29.clover'
});

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { publicId, displayName, email, password } = body || {};

    // 1) 入力チェック
    if (!publicId || !displayName || !email || !password) {
      return NextResponse.json(
        { error: 'missing_params' },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'password_too_short' },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(publicId)) {
      return NextResponse.json(
        { error: 'invalid_public_id' },
        { status: 400 }
      );
    }

    const normalizedId = publicId.toLowerCase();

    // 2) ID重複チェック
    const existing = await pool.query(
      `SELECT 1 FROM sellers WHERE id = $1 LIMIT 1`,
      [normalizedId]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        { error: 'id_taken' },
        { status: 409 }
      );
    }

    // 3) Supabase Authにユーザーを作成
    if (!supabase) {
      return NextResponse.json({ 
        error: "supabase_not_configured", 
        message: "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables." 
      }, { status: 500 });
    }
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          seller_id: normalizedId,
          display_name: displayName
        }
      }
    });

    if (authError) {
      console.error('Supabase Auth signup error', authError);
      return NextResponse.json(
        { 
          error: 'auth_error', 
          message: authError.message 
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { 
          error: 'auth_failed', 
          message: 'ユーザー作成に失敗しました' 
        },
        { status: 500 }
      );
    }

    const supabaseUserId = authData.user.id;

    // 4) Stripeの出店者アカウント（Express）を作成
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'JP',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    });

    // 5) Fleapayのデータベースに保存
    try {
      await pool.query(
        `INSERT INTO sellers (id, display_name, stripe_account_id, email, auth_provider, supabase_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [normalizedId, displayName, account.id, email, 'supabase', supabaseUserId]
      );
    } catch (insertError: unknown) {
      // auth_providerカラムが存在しない場合のフォールバック
      const errorMessage = insertError instanceof Error ? insertError.message : '';
      if (errorMessage.includes('auth_provider') || errorMessage.includes('does not exist')) {
        await pool.query(
          `INSERT INTO sellers (id, display_name, stripe_account_id, email, supabase_user_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [normalizedId, displayName, account.id, email, supabaseUserId]
        );
      } else {
        throw insertError;
      }
    }

    // 6) 本人確認ページ（Stripe Onboarding）を作成
    const returnUrl = `${BASE_URL}/seller-dashboard.html?s=${encodeURIComponent(normalizedId)}`;
    const refreshUrl = `${BASE_URL}/seller-register.html?retry=1`;

    const link = await stripe.accountLinks.create({
      account: account.id,
      type: 'account_onboarding',
      return_url: returnUrl,
      refresh_url: refreshUrl
    });

    // 7) フロントにURLを返す
    return NextResponse.json({ url: link.url });

  } catch (err) {
    console.error('start_onboarding error', err);
    return NextResponse.json(
      { 
        error: 'internal_error', 
        detail: (err as Error).message 
      },
      { status: 500 }
    );
  }
}

