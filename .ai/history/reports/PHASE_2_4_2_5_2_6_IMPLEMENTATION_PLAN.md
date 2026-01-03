# Phase 2.4, 2.5, 2.6 同時実装計画

**作成日**: 2026-01-03  
**目的**: Phase 2.4（Tailwind CSS + shadcn/ui）、Phase 2.5（React Hook Form + Zod）、Phase 2.6（Express.js廃止）を同時に実装

---

## 📋 実装ステップ

### Phase 2.4: Tailwind CSS + shadcn/ui導入

#### ステップ1: Tailwind CSS設定 ✅
- [x] `tailwind.config.js` 作成
- [x] `postcss.config.js` 作成
- [x] `app/globals.css` 作成
- [x] `app/layout.tsx` にglobals.cssをインポート
- [x] `package.json` に依存関係追加

#### ステップ2: shadcn/ui初期化
- [x] `components.json` 作成
- [ ] shadcn/uiコンポーネント追加（Button, Input, Form等）

#### ステップ3: 既存ページの移行
- [ ] インラインスタイルをTailwindクラスに変換
- [ ] カスタムコンポーネントをshadcn/uiコンポーネントに置き換え

---

### Phase 2.5: React Hook Form + Zod導入

#### ステップ1: 依存関係追加 ✅
- [x] `react-hook-form` 追加
- [x] `zod` 追加
- [x] `@hookform/resolvers` 追加

#### ステップ2: フォーム移行
- [ ] `app/seller-register/page.tsx` をReact Hook Form + Zod化
- [ ] `app/checkout/page.tsx` をReact Hook Form + Zod化
- [ ] その他のフォームを移行

#### ステップ3: API Route Handlerのバリデーション
- [ ] Route HandlerでもZodスキーマを使用

---

### Phase 2.6: Express.js廃止

#### ステップ1: 残りAPIエンドポイント移行
- [ ] `/api/orders/*` エンドポイントをNext.js Route Handlerに移行
- [ ] `/api/seller/check-id` をNext.js Route Handlerに移行
- [ ] `/api/auth/reset-password` をNext.js Route Handlerに移行
- [ ] `/api/admin/bootstrap_sql` をNext.js Route Handlerに移行
- [ ] `/api/admin/setup-test-users` をNext.js Route Handlerに移行
- [ ] `/api/photo-frame` をNext.js Route Handlerに移行

#### ステップ2: 静的ファイル配信
- [ ] `public/` ディレクトリの確認
- [ ] Next.jsの静的ファイル配信に移行

#### ステップ3: Express.js削除
- [ ] `server.js` の不要部分削除
- [ ] Express.js依存関係削除
- [ ] `package.json` のスクリプト更新

#### ステップ4: デプロイ設定更新
- [ ] `render.yaml` 更新（Next.jsのみ）
- [ ] 環境変数確認

---

## 🚀 実装順序

1. **Phase 2.4の基本設定**（完了）
2. **Phase 2.5の基本設定**（完了）
3. **Phase 2.6のAPI移行**（進行中）
4. **Phase 2.4のページ移行**（並行）
5. **Phase 2.5のフォーム移行**（並行）
6. **Phase 2.6のExpress.js削除**（最後）

---

## ✅ 完了条件

### Phase 2.4
- [ ] Tailwind CSS動作確認
- [ ] shadcn/uiコンポーネント使用開始
- [ ] 主要画面（3-5画面）をTailwind化

### Phase 2.5
- [ ] 主要フォーム（3-5個）をReact Hook Form + Zod化
- [ ] 型安全性確認
- [ ] バリデーション動作確認

### Phase 2.6
- [ ] 全APIエンドポイントがNext.js Route Handlerで動作
- [ ] Express.js依存関係削除
- [ ] デプロイ動作確認

---

**実装開始日**: 2026-01-03

