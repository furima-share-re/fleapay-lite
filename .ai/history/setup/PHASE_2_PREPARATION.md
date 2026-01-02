# Phase 2: Next.js移行 準備ドキュメント

**作成日**: 2026-01-02  
**フェーズ**: Phase 2 - Next.js移行  
**状態**: ⏳ **準備中**

---

## 📋 Phase 2の目的

Express.jsベースのアプリケーションをNext.js App Routerに移行し、AI修正成功率を向上させ、モダンな開発環境を構築する。

**目標**:
- AI修正成功率: 60% → 95%
- 型安全性の確保
- フロントエンドとバックエンドで型定義を自動共有
- デプロイ同期リスク解消

---

## 🔍 現在のアプリケーション構造

### バックエンド
- **フレームワーク**: Express.js
- **APIエンドポイント**: 約30個（`server.js`）
- **データベース**: Supabase PostgreSQL（Prisma ORM）
- **認証**: Supabase Auth + bcryptjs（共存状態）
- **外部サービス**: Stripe、OpenAI、AWS S3

### フロントエンド
- **構成**: 静的HTMLファイル（`public/`）
- **JavaScript**: Vanilla JS
- **スタイリング**: インラインCSS + 一部外部CSS

### 主要ファイル
- `server.js` - Expressサーバー（約2100行）
- `public/` - 静的HTMLファイル（約20ファイル）
- `lib/` - 共通ライブラリ（`prisma.js`, `supabase.js`, `auth.js`）
- `prisma/schema.prisma` - Prismaスキーマ

---

## 📝 Phase 2の実装内容（段階的移行）

### Phase 2.1: Next.jsプロジェクトの初期設定

**実施内容**:
1. Next.js 14 App Routerプロジェクトの作成
2. TypeScript設定の統合
3. 既存の依存関係の移行
4. 環境変数の設定

**変更されるファイル**:
- `package.json` - Next.js依存関係を追加
- `next.config.js` - Next.js設定ファイル（新規作成）
- `tsconfig.json` - Next.js用に調整

---

### Phase 2.2: Express APIのNext.js Route Handlersへの移行

**実施内容**:
1. Express APIエンドポイントをNext.js Route Handlersに移行
2. 段階的な移行（1エンドポイントずつ）
3. ExpressとNext.jsの共存期間を設ける

**移行対象APIエンドポイント**（優先順位順）:
1. `/api/ping` - ヘルスチェック（最もシンプル）
2. `/api/admin/migration-status` - 移行率確認（Phase 1.6で実装済み）
3. `/api/auth/reset-password` - パスワードリセット（Phase 1.6で実装済み）
4. `/api/seller/summary` - セラーサマリー
5. `/api/pending/start` - 注文作成
6. その他のAPIエンドポイント

**変更されるファイル**:
- `app/api/**/route.ts` - Next.js Route Handlers（新規作成）
- `server.js` - 段階的に削除（最終的に削除）

---

### Phase 2.3: 静的HTMLファイルのNext.jsページへの移行

**実施内容**:
1. 静的HTMLファイルをNext.jsページに移行
2. Vanilla JSをReactコンポーネントに変換
3. 段階的な移行（1ページずつ）

**移行対象ページ**（優先順位順）:
1. `index.html` - トップページ
2. `seller-dashboard.html` - セラーダッシュボード
3. `seller-register.html` - 新規登録
4. `checkout.html` - 決済画面
5. その他のページ

**変更されるファイル**:
- `app/**/page.tsx` - Next.jsページ（新規作成）
- `components/**/*.tsx` - Reactコンポーネント（新規作成）
- `public/` - 段階的に削除（最終的に削除）

---

### Phase 2.4: Server Actionsの導入

**実施内容**:
1. 内部API呼び出しをServer Actionsに変換
2. 型安全性の向上
3. APIドキュメント管理の簡素化

**変更されるファイル**:
- `app/actions/**/*.ts` - Server Actions（新規作成）
- フロントエンドコンポーネント - Server Actionsを使用

---

## 🔧 実装戦略

### 1. 段階的移行（共存期間）

**原則**: ExpressとNext.jsを一時的に共存させ、画面単位で段階的にカットオーバー

**実装方法**:
1. Next.jsプロジェクトを既存プロジェクトに追加（`app/`ディレクトリ）
2. Expressサーバーは`server.js`として維持
3. Next.jsは`next dev`で別ポート（例: 3001）で起動
4. リバースプロキシまたは環境変数で振り分け
5. 移行完了後、Expressを削除

### 2. 型安全性の確保

**原則**: TypeScriptを活用し、型定義を自動共有

**実装方法**:
1. Prismaスキーマから型を自動生成
2. APIレスポンスの型定義を共有
3. Server Actionsで型安全性を確保

### 3. デプロイ戦略

**原則**: 検証環境で十分に検証してから本番環境に適用

**実装方法**:
1. 検証環境でNext.jsをデプロイ
2. 動作確認完了後、本番環境に適用
3. Expressは削除せず、バックアップとして保持

---

## ⚠️ 注意事項

### 1. 既存機能の維持

- 既存の全機能が動作することを確認
- データ整合性を維持
- 認証・認可が正常に動作することを確認

### 2. パフォーマンス

- レスポンスタイムが±10%以内を維持
- Server Componentsを活用してクライアントJS量を削減

### 3. セキュリティ

- 認証・認可が正常に動作することを確認
- 環境変数の管理を適切に行う

---

## 📚 関連ドキュメント

- `.ai/history/migrations/MIGRATION_EXECUTION_PLAN.md` - Phase 2詳細（参照先: `TECH_STACK_MIGRATION_PLAN.md` Section 3）
- `adr/技術スタック整合化ロードマップ_AI駆動開発×edoichiba.md` - 技術選択の判断基準
- `server.js` - 既存Expressサーバー
- `prisma/schema.prisma` - Prismaスキーマ

---

**ドキュメント作成日**: 2026-01-02  
**作成者**: AI Assistant

