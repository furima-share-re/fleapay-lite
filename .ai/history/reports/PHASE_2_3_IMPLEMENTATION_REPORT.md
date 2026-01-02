# Phase 2.3: Next.js画面移行（続き）実装レポート

**実装日**: 2026-01-02  
**フェーズ**: Phase 2.3 - Next.js画面移行（続き）  
**状態**: ⏳ **進行中**

---

## 📋 実装内容

### 1. セラー登録画面移行 ✅

**ファイル**: 
- `app/api/seller/start_onboarding/route.ts` - Next.js Route Handler
- `app/seller-register/page.tsx` - Next.jsページ

**実装内容**:
- `server.js`の`/api/seller/start_onboarding` APIをNext.js Route Handlerに移行
- `public/seller-register.html`をNext.jsページに移行
- Supabase Auth統合
- Stripe Onboarding統合

**主な機能**:
1. **入力バリデーション**
   - お店の名前、メールアドレス、パスワードの入力チェック
   - パスワード確認の一致チェック
   - 利用規約への同意チェック

2. **ユーザー登録**
   - Supabase Authにユーザーを作成
   - Stripe Expressアカウントを作成
   - Fleapayデータベースに保存

3. **Stripe Onboarding**
   - 本人確認ページ（Stripe Onboarding）を作成
   - リダイレクトURLを返す

**互換性**:
- 旧フロントエンドとの互換性を維持
- 既存のAPIレスポンス形式を維持

---

## 📝 変更されたファイル

### 新規作成
1. `app/api/seller/start_onboarding/route.ts` - Next.js Route Handler
2. `app/seller-register/page.tsx` - Next.jsページ

### 変更
- なし（既存の`server.js`は後で削除予定）

---

## ⏳ 未実装画面

### 優先度：高

1. **決済画面**
   - `seller-purchase-standard.html` → Next.jsページ
   - `seller-purchase.html` → Next.jsページ
   - `/api/pending/start` → Next.js Route Handler
   - `/api/seller/order-detail` → Next.js Route Handler

2. **チェックアウト画面**
   - `checkout.html` → Next.jsページ
   - `/api/checkout/session` → Next.js Route Handler
   - `/api/checkout/result` → Next.js Route Handler
   - `/api/price/latest` → Next.js Route Handler

3. **管理画面**
   - `admin-dashboard.html` → Next.jsページ
   - `admin-sellers.html` → Next.jsページ
   - `admin-frames.html` → Next.jsページ
   - `admin-payments.html` → Next.jsページ
   - 関連APIエンドポイント → Next.js Route Handler

### 優先度：中

4. **Kidsダッシュボード**
   - `kids-dashboard.html` → Next.jsページ
   - `/api/seller/kids-summary` → Next.js Route Handler

5. **その他の画面**
   - `index.html` → Next.jsページ
   - `thanks.html` → Next.jsページ
   - `success.html` → Next.jsページ
   - `cancel.html` → Next.jsページ
   - `onboarding/complete.html` → Next.jsページ
   - `onboarding/refresh.html` → Next.jsページ

---

## 🎯 次のステップ

### 短期目標

1. **決済画面の移行**
   - `/api/pending/start` API Route Handler作成
   - `seller-purchase-standard.html`をNext.jsページに移行

2. **チェックアウト画面の移行**
   - `/api/checkout/session` API Route Handler作成
   - `/api/checkout/result` API Route Handler作成
   - `checkout.html`をNext.jsページに移行

3. **管理画面の移行**
   - 管理画面関連API Route Handler作成
   - 管理画面をNext.jsページに移行

---

## 📚 関連ドキュメント

- `.ai/history/reports/PHASE_2_2_IMPLEMENTATION_REPORT.md` - Phase 2.2実装レポート
- `.ai/history/reports/PHASE_2_2_DEGRADATION_CHECK.md` - Phase 2.2デグレチェックレポート
- `MIGRATION_EXECUTION_PLAN.md` - 移行実行計画書

---

**レポート作成日**: 2026-01-02  
**実装実施者**: AI Assistant

