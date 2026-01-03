# LLM抽象化レイヤー - 最適な構成設計（設計書準拠版）

**設計書参照**: AI駆動開発技術スタック完全版 5.5章「AI精度向上ツールスタック」

## 🎯 設計原則（設計書準拠）

1. **原則7: AI判断は記録される** - Heliconeで全LLM API呼び出しを記録
2. **原則3: 変更は機械的に検証される** - PromptfooでCI/CD統合
3. **プロンプト管理**: Langfuseで一元管理（コードデプロイ不要）
4. **A/Bテスト**: Langfuseで段階的改善
5. **回帰テスト**: Promptfooで品質保証

## 📐 3ツール構成（設計書推奨）

```
┌─────────────────────────────────────────────────────────┐
│                    LLM抽象化レイヤー                      │
│  (lib/llm/)                                              │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Router      │  │  Providers   │  │  Prompts     │ │
│  │  (タスク選択) │  │  (実装)      │  │  (Langfuse)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                  │                  │         │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          ▼                  ▼                  ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │Helicone  │      │Langfuse  │      │Promptfoo │
    │(監視)    │      │(管理)     │      │(テスト)   │
    └──────────┘      └──────────┘      └──────────┘
```

## 🏗️ 最適な構成の詳細

### 1. ディレクトリ構造

```
lib/llm/
├── types.ts              # 共通型定義
├── config.ts             # タスク別推奨設定
├── factory.ts            # プロバイダーファクトリー
├── router.ts             # タスクルーター
├── prompts.ts            # Langfuse統合（プロンプト管理）
├── tracing.ts            # Langfuse統合（トレーシング）
├── providers/            # プロバイダー実装
│   ├── base.ts           # ベースクラス
│   ├── openai.ts         # OpenAI（Helicone統合済み）
│   ├── anthropic.ts      # Anthropic（将来追加）
│   └── gemini.ts         # Gemini（将来追加）
└── index.ts              # エクスポート・簡易API
```

### 2. Langfuse統合（プロンプト管理）

**設計書の要件**:
- プロンプトのバージョン管理
- Web UIで編集可能（コードデプロイ不要）
- A/Bテスト機能
- 履歴追跡

**実装方針**:
```typescript
// lib/llm/prompts.ts
import { Langfuse } from 'langfuse';

export async function getPrompt(
  promptName: string,
  variables?: Record<string, string>
): Promise<string> {
  // Langfuseからプロンプトを取得
  // 変数を動的に埋め込み
}

// lib/llm/tracing.ts
export function createTrace(taskType: string, userId?: string) {
  // Langfuseトレース作成
  // Heliconeと連携
}
```

### 3. Promptfoo統合（テスト自動化）

**設計書の要件**:
- 回帰テスト
- CI/CD統合
- 品質保証

**実装方針**:
```yaml
# promptfooconfig.yaml
providers:
  - openai:gpt-4o

prompts:
  - file://prompts/product-analysis.txt

tests:
  - vars:
      productImage: "..."
    assert:
      - type: llm-rubric
        value: "商品の状態を正確に判定していること"
```

### 4. Helicone連携（既存維持）

**設計書の要件**:
- 全LLM API呼び出しの記録
- コスト・レイテンシ追跡
- Langfuseと併用

**実装方針**:
- 既存の`lib/llm/providers/openai.ts`を維持
- LangfuseトレースにHelicone識別子を追加

## 🚀 実装ロードマップ（設計書準拠）

### Week 1: Helicone導入（✅ 完了）

- [x] `lib/llm/providers/openai.ts` - Helicone統合済み
- [x] 環境変数設定

### Week 2: Langfuse導入

**Day 1-2: セルフホストセットアップ**
- LangfuseをRenderでセルフホスト（無料）
- 環境変数設定（`LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`）

**Day 3: プロンプト移行**
- `lib/llm/prompts.ts`作成
- 既存プロンプトをLangfuseに移行

**Day 4: トレーシング実装**
- `lib/llm/tracing.ts`作成
- 各APIエンドポイントにトレーシング追加

### Week 3: Promptfoo導入

**Day 1: 設定ファイル作成**
- `promptfooconfig.yaml`作成
- テストケース追加

**Day 2: CI/CD統合**
- GitHub Actions統合
- PR時に自動テスト実行

## 📊 ツール役割分担（設計書準拠）

| ツール | 役割 | できること | できないこと |
|--------|------|-----------|-------------|
| **Helicone** | 本番監視 | コスト追跡、レイテンシ測定、問題発見 | プロンプト管理、A/Bテスト |
| **Langfuse** | プロンプト管理 | バージョン管理、A/Bテスト、履歴追跡 | 本番監視、コスト追跡 |
| **Promptfoo** | テスト自動化 | 回帰テスト、CI/CD統合、品質保証 | リアルタイム監視 |

## 🎨 使用例（設計書準拠）

### プロンプト管理（Langfuse）

```typescript
// app/api/analyze-item/route.ts
import { executeTask } from '@/lib/llm';
import { getPrompt } from '@/lib/llm/prompts';
import { createTrace } from '@/lib/llm/tracing';

export async function POST(request: Request) {
  const { imageUrl, userId } = await request.json();
  
  // Langfuseからプロンプトを取得（Web UIで編集可能）
  const promptText = await getPrompt('product-analysis', {
    analysisType: 'condition',
    outputFormat: 'json',
  });
  
  // トレース作成
  const trace = createTrace('product-analysis', userId);
  
  // タスク実行（Heliconeが自動記録）
  const response = await executeTask('image-analysis', {
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: promptText },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }],
  });
  
  // トレース終了
  trace.generation.end({ output: response.content });
  
  return NextResponse.json({ analysis: response.content });
}
```

### テスト自動化（Promptfoo）

```yaml
# promptfooconfig.yaml
description: "商品分析AI機能のテスト"

providers:
  - openai:gpt-4o

prompts:
  - file://prompts/product-analysis.txt

tests:
  - vars:
      productImage: "https://example.com/test-image-1.jpg"
    assert:
      - type: llm-rubric
        value: "商品の状態を正確に判定していること"
      - type: cost
        threshold: 0.01
      - type: latency
        threshold: 3000
```

## 💰 コスト（設計書準拠）

| ツール | 月額コスト | 導入Phase |
|--------|----------|----------|
| **Helicone** | $50 | Week 1（✅ 完了） |
| **Langfuse** | $0（OSS、セルフホスト） | Week 2 |
| **Promptfoo** | $0（OSS） | Week 3 |
| **合計** | **$50/月** | （変更なし） |

## 📈 期待効果（設計書準拠）

| 項目 | ツールなし | 推奨スタック | 差分 |
|------|----------|------------|------|
| **3ヶ月後の精度向上** | +3-8% | +20-35% | +17-27pt |
| **改善サイクル** | 月1回 | 週1-2回 | 4倍速 |
| **手戻り工数** | 月40時間 | 月4時間 | 90%削減 |
| **障害対応** | 月8回 | 月1回 | 87%削減 |
| **総合スコア** | 45/100 | **92/100** | +47pt |

## ✅ 実装チェックリスト

### Week 1: Helicone（✅ 完了）
- [x] `lib/llm/providers/openai.ts` - Helicone統合
- [x] 環境変数設定

### Week 2: Langfuse
- [ ] Langfuseセルフホストセットアップ
- [ ] `lib/llm/prompts.ts`作成
- [ ] `lib/llm/tracing.ts`作成
- [ ] 既存プロンプトをLangfuseに移行
- [ ] 各APIエンドポイントにトレーシング追加

### Week 3: Promptfoo
- [ ] `promptfooconfig.yaml`作成
- [ ] テストケース追加
- [ ] GitHub Actions統合
- [ ] CI/CDで自動テスト実行

## 🎯 まとめ

設計書に基づいた最適な構成：

1. **Helicone**: 本番監視（✅ 実装済み）
2. **Langfuse**: プロンプト管理・トレーシング（Week 2導入）
3. **Promptfoo**: テスト自動化（Week 3導入）

**投資**: $50/月（変更なし）+ 学習1.5日  
**リターン**: 精度+20-35%、工数90%削減、ROI 4,300%  
**回収期間**: 約1週間

この構成により、AI駆動開発9原則に完全適合し、継続的な精度向上が可能になります。

