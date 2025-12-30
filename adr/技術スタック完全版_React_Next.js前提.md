# AI駆動開発：技術スタック完全版（React/Next.js前提・最適化済み）

**参考元**: `環境_完全版 (1).html`

> **注意**: 本ドキュメントは意思決定の根拠（ADR）です。数値・条件の詳細は `truth/` を参照してください。

---

## 概要

React/Next.js + TypeScript前提により、AI駆動開発の効果を最大化する技術スタックの完全版。

### 主要指標（参考）

- AI修正成功率: 目標98%
- 自動化レベル: 目標95%
- 月額コスト: 約$115（エンタープライズ運用）

> **数値の詳細**: `truth/infra/` を参照

---

## 0. 絶対ルール（AI駆動開発9原則の実装）

### 原則1: 人間は環境を構築しない
ローカルDB、Docker、複雑なセットアップは排除。GitHub Codespaces + Templateで「選択」するだけ。

### 原則2: 人間は設計詳細を決めない
UIレイアウト、関数設計はAI生成。人間は「要件」と「制約」のみ指定。

### 原則3: 変更は機械的に検証される
すべてのPRはCI/CD（型チェック・lint・テスト・Migration安全性）を通過必須。

### 原則4: 永続データは人が触らない
スキーマ変更は手動SQL禁止。AI生成のMigrationのみ許可。

### 原則5: 日常運用は自動化が正
監視、アラート、ロールバック、障害対応の95%を自動化。

### 原則6: 横展開は一括適用される
仕様変更時はAider等で影響範囲を自動特定し、一括修正。

### 原則7: AI判断は記録される
すべてのLLM呼び出しはHeliconeで記録（コスト・レイテンシ・トレース）。

### 原則8: 人間は判断と承認に集中
実装詳細はAIに任せ、人間はレビュー・承認・方針決定に専念。

### 原則9: 失敗は自動で隔離される
ヘルスチェック失敗時は自動ロールバック。障害は自動で前バージョンに戻す。

---

## 1. 開発環境（原則1：人間は環境を構築しない）

| カテゴリ | 採用技術 | AI駆動開発における優位性 |
|---------|---------|----------------------|
| 作業環境 | GitHub Codespaces | ワンクリックで統一環境起動、ローカル構築作業ゼロ |
| 日常実装 | Cursor | React/Next.js最適化済み、AI修正成功率98% |
| 横断変更 | Aider（決戦時のみ） | 複数ファイル一括変更、影響範囲の自動特定 |
| リポジトリ | GitHub（PR運用） | 1テーマ1PR原則、CI合格がマージ条件 |
| CI/CD | GitHub Actions | Next.js専用テンプレート、型/lint/Migration安全性ゲート |

---

## 2. アプリ技術・フレームワーク（最適解確定）

### フロントエンド構成

| 領域 | 採用技術 | AI修正成功率 | 選択理由 |
|-----|---------|------------|---------|
| フレームワーク | Next.js 14+ (App Router) + TypeScript | 98% | AIの学習データ最大、型安全性でAI生成精度向上 |
| UI | Tailwind CSS | 98% | 単一ファイル完結、AIがコンテキスト維持しやすい |
| コンポーネント | shadcn/ui | 95% | コピー可能（依存関係最小）、AIが理解しやすいパターン |
| フォーム | React Hook Form + Zod | 95% | 宣言的設計、型とバリデーション一体化 |
| 状態管理 | Server Components + URL State | 95% | 状態管理ライブラリ不要、学習コスト0.5日 |

### API構成（原則4：永続データは人が触らない）

標準パターン：Server Actions（内部API）

```typescript
'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { revalidatePath, redirect } from 'next/navigation'

const productSchema = z.object({
  title: z.string().min(1, '商品名は必須です'),
  price: z.number().min(0, '価格は0以上である必要があります'),
  description: z.string().optional(),
})

export async function createProduct(formData: FormData) {
  const result = productSchema.safeParse({
    title: formData.get('title'),
    price: Number(formData.get('price')),
    description: formData.get('description'),
  })
  
  if (!result.success) {
    return { error: result.error.flatten() }
  }
  
  try {
    const product = await db.product.create({ 
      data: result.data 
    })
    
    revalidatePath('/products')
    redirect(`/products/${product.id}`)
  } catch (error) {
    return { error: 'データベースエラーが発生しました' }
  }
}
```

---

## 3. サーバー（Renderで統一・原則5実装）

| コンポーネント | 形態 | 導入タイミング | 月額コスト |
|-------------|------|--------------|----------|
| Web Service | Next.js + AI API | 初日 | $25 |
| Worker | Python FastAPI（例外時のみ） | AI処理5秒超過時 | $7 |
| Cron Job | 定期処理 | バッチ処理必要時 | $0 |

### Python追加の判断基準（例外条件）

**追加トリガー：**
- パフォーマンス基準 - AI処理が5秒超過（ユーザー体験悪化）
- 複雑性基準 - RAGパイプライン、大量文書処理が必要
- 実験頻度基準 - AI実験を週3回以上回す

**追加時のルール：**
- ✅ RenderのWorkerとして追加（他プラットフォーム禁止）
- ✅ Next.js → Python間はHTTP（認証/タイムアウト/リトライ規約固定）
- ✅ Heliconeログ統一（Node/Python同一プロパティ命名）

---

## 4. DB（Supabase統一・原則3/4実装）

### スキーマ管理（人間はスキーマを触らない）

| 項目 | 技術 | 運用ルール |
|-----|------|----------|
| ORM | Prisma | DDLはAI生成。人間はレビューと承認のみ |
| Migration | AI生成のみ | 人間はSQL直接実行禁止 |
| 変更フロー | ステージング→マージ→本番 | 本番直変更禁止 |

### α期間の鉄則：追加のみ（原則3の実装）

**許可:**
- テーブル追加
- カラム追加（nullable/default付き）
- インデックス追加
- 新しいENUM値追加

**禁止:**
- DROP TABLE
- RENAME COLUMN
- 型変更・NOT NULL化
- カラム削除

---

## 5. AI観測・監視（原則7：記録されないAI判断は存在しない）

### 開発時のAI監視

| 用途 | 技術 | 記録対象 | 月額コスト |
|-----|------|---------|----------|
| 実装AI | Cursor（GPT-4/Claude） | コード生成履歴、変更差分、プロンプト履歴 | $20 |
| バージョン管理 | Git + GitHub | 全コミット、PR、レビュー履歴 | $0 |

### 本番稼働のAI監視（Helicone）

| 用途 | 技術 | 記録対象 | 月額コスト |
|-----|------|---------|----------|
| LLM API監視 | Helicone | 全LLM API呼び出し、コスト・レイテンシ・トークン数、プロンプト・レスポンス全文 | $50 |
| エラー監視 | Sentry | 全例外、パフォーマンス、ユーザーセッション | $26 |
| インフラ監視 | Cloudflare + Render | DDoS、SLA、リソース使用率 | $20 |

---

## 6. 運用コスト最適化（UU 10,000人規模）

### Phase別コスト構造

| Phase | 期間 | 月額コスト | 達成目標 | ROI |
|------|------|----------|---------|-----|
| MVP | Week 1 | $200-250 | 1週間でURL存在 | - |
| Phase 1 | Week 2-3 | $246-296 | SLA 99%達成 | 900% |
| Phase 2 | Month 2 | $315-365 | 運用95%自動化 | 580% |
| スケール | Month 6+ | $900-1,200 | UU 50,000人対応 | 300% |

> **詳細なコスト内訳**: `truth/infra/cost.yml` を参照

---

## 7. 実装ロードマップ（定量的根拠付き）

### Week 1-2: MVP基盤（SLA 99%達成）

- **Day 1-2**: Next.js Template + Supabase統合
- **Day 3-4**: 主要画面3-5枚（AI生成）
- **Day 5-6**: Cloudflare + Sentry導入
- **Day 7**: 本番デプロイ + ヘルスチェック

**投資**: $46/月 → **SLA 99%達成**

### Month 2: 運用自動化95%達成

- **Week 5**: Helicone導入 + LLM API監視
- **Week 6**: PagerDuty設定 + アラートルール
- **Week 7**: 自動ロールバック実装
- **Week 8**: 運用テスト + ドキュメント

**追加投資**: $69/月 → **運用95%自動化達成**

---

## 8. セキュリティ実装（原則9：失敗の自動隔離）

### セキュリティ脅威マトリクス

主要な脅威と対策状況を明示。

> **詳細なセキュリティ設定**: `truth/infra/security.yml` を参照

### 自動ロールバック実装

ヘルスチェック失敗検知時に自動的に前バージョンへロールバック。

---

## 9. 最終推奨アクション

### ✅ 即座実行（今すぐ）

1. Cloudflare Pro - $20/月（DDoS防御・SLA +5%）
2. ヘルスチェック実装 - $0（障害検知90%高速化）
3. Sentry Team - $26/月（エラー検知率+95%）

**合計**: $46/月で SLA 99%基盤確立

### ⭕ 1ヶ月以内実行

1. Helicone Growth - $50/月（LLM API監視・本番稼働のコスト追跡）
2. PagerDuty Starter - $19/月（24/7アラート）
3. 自動ロールバック - $0（デプロイ障害90%削減）

**追加**: $69/月で 運用95%自動化達成

---

## 結論

この技術スタックは、**AI駆動開発の9原則を完璧に実装した最適解**です。

**月額$115（約16,700円）**で、**「凡人が、AIと一緒に、1週間でMVPを作り、95%自動化で運用できる」**システムが完成します。

---

*Document Version: 1.0*  
*Last Updated: 2025*  
*参考元: 環境_完全版 (1).html*

