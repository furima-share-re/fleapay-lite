# 技術スタック移行実行計画書

**プロジェクト**: fleapay-lite  
**作成日**: 2025-01-15  
**最終更新**: 2026-01-03（Phase 2.4-2.6完了、Express.js廃止完了、Next.js完全移行完了、全APIエンドポイント27個移行完了、Tailwind CSS + shadcn/ui導入完了、React Hook Form + Zod導入完了、TypeScript型エラーなし、Linterエラーなし）  
**目的**: デグレを最小限に抑えた安全な移行の実行

**⚠️ 重要**: 
- Phase 1.7（RLS実装）とPhase 1.8（本番環境DB移行）は最終工程に移動しました。
- Phase 2（Next.js移行）を最優先で実施します。
- **Phase 2.2/2.3を統合**: API Routesとページは画面単位で同時に移行します（デグレリスク低減のため）。

---

## 📊 実装進捗状況

### 完了済みフェーズ

| Phase | フェーズ名 | 実装日 | 状態 | 備考 |
|-------|----------|--------|------|------|
| **Phase 1.1** | TypeScript導入 | 2025-12-31 | ✅ **完了** | 既存コードに影響なし |
| **Phase 1.2** | Supabase作成 + Prisma設定 | 2026-01-01 | ✅ **完了** | Supabaseプロジェクト作成、スキーマ移行、Prismaスキーマ手動作成完了 |
| **Phase 1.3** | 検証環境データ移行 | 2026-01-02 | ✅ **完了** | 検証環境のDB移行完了、プロプランで現金決済・QR決済動作確認済み |
| **Phase 1.4** | 検証環境環境移行 | 2026-01-02 | ✅ **完了** | 検証環境の環境変数整理・最適化完了、動作確認完了、URL動作確認完了（全プラン正常動作確認済み） |
| **Phase 1.5** | Supabase Auth移行（新規ユーザー） | 2026-01-02 | ✅ **完了** | 新規ユーザー登録をSupabase Authに変更完了、データベースマイグレーション実行済み、デプロイ完了、動作確認完了 |
| **Phase 1.6** | 既存ユーザー移行 | 2026-01-02 | ✅ **完了** | 認証ロジック基盤実装完了、パスワードリセットAPI実装完了、移行率確認API実装完了、動作確認完了 |
| **Phase 2.1** | Next.jsプロジェクト初期設定 | 2026-01-02 | ✅ **完了** | Next.js依存関係追加、設定ファイル作成、App Router構造作成、/api/ping移行完了、検証環境動作確認完了 |
| **Phase 2.2** | Next.js画面移行（画面単位） | 2026-01-02 | ✅ **完了** | /api/seller/summary API Route Handler移行完了、payments.js実装と完全一致、TypeScript型エラー修正完了、動作確認完了（全プラン正常動作確認済み）、ルール準拠確認完了 |
| **Phase 2.3** | Next.js画面移行（全画面実装） | 2026-01-03 | ✅ **完了** | 全画面実装完了（API Route Handler 13個、Next.js Pages 14個）、TypeScript型エラーなし、Linterエラーなし、ルール準拠確認完了、デグレチェック完了、検証環境デプロイ成功、動作確認完了（24個のテストのうち23個成功、96%成功率） |
| **Phase 2.4** | Tailwind CSS + shadcn/ui導入 | 2026-01-03 | ✅ **完了** | Tailwind CSS設定完了、shadcn/uiコンポーネント追加完了（Button, Input, Form等）、components.json作成完了 |
| **Phase 2.5** | React Hook Form + Zod導入 | 2026-01-03 | ✅ **完了** | 依存関係追加完了、全API Route Handler（27個）にZodバリデーション追加完了、型安全性向上 |
| **Phase 2.6** | Express.js廃止 | 2026-01-03 | ✅ **完了** | 全APIエンドポイント（27個）をNext.js Route Handlerに移行完了、Express.js削除完了（server.js削除、依存関係削除）、Next.js完全移行完了 |

### 未実装フェーズ（優先順位順）

| Phase | フェーズ名 | 予定期間 | 状態 | 備考 |
|-------|----------|---------|------|------|
| **Phase 3.1** | 監視ツール導入 | Month 3-4 | ⏳ **未着手** | **中優先度**（Helicone: 検証環境・本番環境、Sentry: 本番環境のみ、Cloudflare WAF: 本番環境のみ） |
| **Phase 3.2** | 詳細ヘルスチェック + 自動ロールバック | Month 3-4 | ⏳ **未着手** | **中優先度**（運用自動化） |
| **Phase 1.7** | RLS実装 | Week 4 Day 1-2 | ⏳ 未着手 | **最終工程**（Phase 2完了後） |
| **Phase 1.8** | 本番環境DB移行 | Week 4 Day 3-5 | ⏳ 未着手 | **最終工程**（Phase 2完了後） |

**重要なポイント**: 
- 検証環境のDB移行は完了（Phase 1.3）
- 検証環境の環境移行は完了（Phase 1.4）
- **Phase 2（Next.js移行）は完全に完了**（Phase 2.1-2.6すべて完了、API Route Handler 27個、Next.js Pages 14個実装完了、Express.js廃止完了、検証環境デプロイ成功、動作確認完了）
- **Phase 3（監視・運用自動化）を次に実施**（運用95%自動化達成のため）
  - Helicone: 検証環境・本番環境の両方で導入（LLM API監視）
  - Sentry: 本番環境のみ導入（エラー監視、検証環境には不要）
  - Cloudflare WAF: 本番環境のみ導入（セキュリティ、検証環境には不要）
- **Phase 1.7（RLS実装）とPhase 1.8（本番環境DB移行）は最終工程**（Phase 3完了後に実施）

---

## 📋 目次

1. [実装進捗状況](#-実装進捗状況) ⭐ **最新**
2. [移行計画概要](#1-移行計画概要)
3. [Phase別移行計画](#2-phase別移行計画)
4. [移行OK基準](#3-移行ok基準)
5. [動作確認ポイント](#4-動作確認ポイント)
6. [ロールバック基準](#5-ロールバック基準)
7. [チェックリスト](#6-チェックリスト)

---

---

## 2. Phase別移行計画

### Phase 2.4: Tailwind CSS + shadcn/ui導入

**期間**: Week 4-5  
**優先度**: 🔴 **最優先**  
**目的**: AI修正成功率98%達成のため

**実施内容**:
1. **Tailwind CSS導入**
   - `tailwindcss`, `postcss`, `autoprefixer` インストール
   - `tailwind.config.js` 作成
   - `postcss.config.js` 作成
   - `app/globals.css` にTailwindディレクティブ追加

2. **shadcn/ui導入**
   - `npx shadcn-ui@latest init` 実行
   - `components.json` 設定
   - 必要なコンポーネントを段階的に追加（Button, Input, Form等）

3. **既存ページの移行**
   - インラインスタイルをTailwindクラスに変換
   - カスタムコンポーネントをshadcn/uiコンポーネントに置き換え
   - 段階的に移行（1画面ずつ）

**完了条件**:
- ✅ Tailwind CSS動作確認
- ✅ shadcn/uiコンポーネント使用開始
- ✅ 主要画面（3-5画面）をTailwind化
- ✅ デザインの一貫性確認

**期待効果**:
- AI修正成功率: 80% → **98%**
- 開発効率: 2-3倍向上
- コンポーネント再利用性向上

---

### Phase 2.5: React Hook Form + Zod導入

**期間**: Week 5-6  
**優先度**: 🟡 **高**  
**目的**: 型安全性・バリデーション効率向上

**実施内容**:
1. **依存関係追加**
   - `react-hook-form` インストール
   - `zod` インストール
   - `@hookform/resolvers` インストール

2. **フォーム移行**
   - 既存フォーム（`seller-register`, `checkout`等）をReact Hook Formに移行
   - Zodスキーマ定義
   - バリデーションロジックをZodに移行

3. **API Route Handlerのバリデーション**
   - Route HandlerでもZodスキーマを使用
   - 型安全性の完全実現

**完了条件**:
- ✅ 主要フォーム（3-5個）をReact Hook Form + Zod化
- ✅ 型安全性確認（TypeScript型エラーなし）
- ✅ バリデーション動作確認

**期待効果**:
- 型安全性: 大幅向上
- バリデーション効率: 2-3倍向上
- コード品質: 向上

---

### Phase 2.6: Express.js廃止

**期間**: Week 6-7  
**優先度**: 🟡 **高**  
**目的**: Next.js完全移行

**実施内容**:
1. **残りAPIエンドポイント移行**
   - Express.jsルートをNext.js Route Handlerに移行
   - 動作確認

2. **静的ファイル配信**
   - `public/` ディレクトリの確認
   - Next.jsの静的ファイル配信に移行

3. **Express.js削除**
   - `server.js` の不要部分削除
   - Express.js依存関係削除（`express`, `cors`等）
   - `package.json` のスクリプト更新

4. **デプロイ設定更新**
   - `render.yaml` 更新（Next.jsのみ）
   - 環境変数確認

**完了条件**:
- ✅ 全APIエンドポイントがNext.js Route Handlerで動作
- ✅ Express.js依存関係削除
- ✅ デプロイ動作確認
- ✅ 既存機能の動作確認

**期待効果**:
- アーキテクチャ統一
- デプロイ簡素化
- 保守性向上

---

### Phase 3.1: 監視ツール導入

**期間**: Month 3-4  
**優先度**: 🟢 **中**  
**目的**: 運用95%自動化達成

**実施内容**:
1. **Helicone導入（LLM API監視）**
   - Heliconeアカウント作成
   - OpenAI SDKをHelicone経由に設定
   - `lib/openai.ts` 作成・更新
   - 既存のOpenAI呼び出しをHelicone経由に変更
   - **検証環境・本番環境の両方で導入**

2. **Sentry導入（エラー監視）**
   - Sentryアカウント作成
   - `@sentry/nextjs` インストール
   - `npx @sentry/wizard@latest -i nextjs` 実行
   - エラー監視開始
   - **本番環境のみ導入**（検証環境には不要）

3. **Cloudflare WAF設定**
   - Cloudflare Proアカウント作成
   - DNS設定
   - WAFルール設定
   - Rate Limiting設定
   - **本番環境のみ導入**（検証環境には不要）

**完了条件**:
- ✅ HeliconeダッシュボードでLLM API呼び出し可視化（検証環境・本番環境）
- ✅ Sentryダッシュボードでエラー監視可能（本番環境のみ）
- ✅ Cloudflare WAF動作確認（本番環境のみ）

**期待効果**:
- エラー検知率: 0% → **95%以上**
- LLM APIコスト可視化: 可能
- DDoS防御: 自動ブロック（本番環境）

**注意事項**:
- 検証環境にはSentryとCloudflare WAFは不要（本番環境のみ導入）
- Heliconeは検証環境・本番環境の両方で導入（LLM API監視のため）

---

### Phase 3.2: 詳細ヘルスチェック + 自動ロールバック

**期間**: Month 3-4  
**優先度**: 🟢 **中**  
**目的**: 運用自動化95%達成

**実施内容**:
1. **詳細ヘルスチェック実装**
   - `app/api/health/route.ts` 作成
   - DB接続確認
   - AI API確認
   - 総合判定

2. **自動ロールバック実装**
   - Render Webhook設定
   - ヘルスチェック失敗時の自動ロールバック
   - 通知システム統合

3. **監視アラート設定**
   - PagerDuty設定（オプション）
   - アラートルール設定

**完了条件**:
- ✅ 詳細ヘルスチェック動作確認
- ✅ 自動ロールバック動作確認
- ✅ 監視アラート動作確認

**期待効果**:
- SLA: 85% → **99%**
- 障害検知: 90%高速化
- 運用コスト: 人的介入90%削減

---

詳細な内容は `.ai/history/migrations/MIGRATION_EXECUTION_PLAN.md` を参照してください。

