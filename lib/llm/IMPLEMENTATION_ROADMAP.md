# LLM抽象化レイヤー - 実装ロードマップ（設計書準拠）

**設計書参照**: AI駆動開発技術スタック完全版 5.5章「AI精度向上ツールスタック」

## 📋 実装状況

### ✅ Week 1: Helicone導入（完了）

- [x] `lib/llm/providers/openai.ts` - Helicone統合済み
- [x] 環境変数設定（`HELICONE_API_KEY`）
- [x] 既存APIエンドポイントでHelicone経由の呼び出し確認

### 🔄 Week 2: Langfuse導入（準備完了、実装待ち）

**実装済み**:
- [x] `lib/llm/prompts.ts` - プロンプト管理機能
- [x] `lib/llm/tracing.ts` - トレーシング機能
- [x] `lib/llm/router.ts` - Langfuse統合

**未実装**:
- [ ] Langfuseパッケージインストール: `npm install langfuse`
- [ ] Langfuseセルフホストセットアップ（Renderで無料）
- [ ] 環境変数設定（`LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`）
- [ ] 既存プロンプトをLangfuseに移行
- [ ] 各APIエンドポイントでプロンプト管理を使用

### 📅 Week 3: Promptfoo導入（準備待ち）

**未実装**:
- [ ] `promptfooconfig.yaml`作成
- [ ] テストケース追加
- [ ] GitHub Actions統合
- [ ] CI/CDで自動テスト実行

## 🚀 次のステップ

### Step 1: Langfuseパッケージインストール

```bash
npm install langfuse
```

### Step 2: Langfuseセルフホストセットアップ

1. RenderでLangfuseをセルフホスト（無料）
2. API Keyを取得
3. 環境変数設定

### Step 3: 既存プロンプトをLangfuseに移行

1. Langfuse Web UIでプロンプト作成
2. `lib/llm/prompts.ts`の`getFallbackPrompt`から移行

### Step 4: APIエンドポイント更新

```typescript
// app/api/analyze-item/route.ts
import { executeTask } from '@/lib/llm';
import { getPrompt } from '@/lib/llm/prompts';

export async function POST(request: Request) {
  const { imageUrl, userId } = await request.json();
  
  // Langfuseからプロンプトを取得
  const promptText = await getPrompt('product-analysis');
  
  const response = await executeTask('image-analysis', {
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: promptText },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }],
  }, undefined, { userId });
  
  return NextResponse.json({ analysis: response.content });
}
```

## 📊 期待効果

| 項目 | 現在 | Week 2完了後 | Week 3完了後 |
|------|------|------------|------------|
| **プロンプト管理** | コード内ハードコード | Web UIで編集可能 | Web UIで編集可能 |
| **トレーシング** | Heliconeのみ | Helicone + Langfuse | Helicone + Langfuse |
| **テスト自動化** | なし | なし | CI/CD統合 |
| **精度向上サイクル** | 月1回 | 週1-2回 | 週1-2回 |
| **総合スコア** | 45/100 | 75/100 | **92/100** |

## 💰 コスト

| Phase | 月額コスト | 追加コスト |
|-------|----------|----------|
| Week 1（完了） | $50 | - |
| Week 2 | $50 | $0（Langfuse OSS） |
| Week 3 | $50 | $0（Promptfoo OSS） |

**合計**: $50/月（変更なし）

## ✅ チェックリスト

### Week 2: Langfuse導入

- [ ] `npm install langfuse`
- [ ] Langfuseセルフホストセットアップ
- [ ] 環境変数設定
- [ ] Langfuse Web UIでプロンプト作成
- [ ] `app/api/analyze-item/route.ts`更新
- [ ] `app/api/photo-frame/route.ts`更新
- [ ] 動作確認

### Week 3: Promptfoo導入

- [ ] `promptfooconfig.yaml`作成
- [ ] テストケース追加（最低5ケース）
- [ ] GitHub Actions統合
- [ ] CI/CDで自動テスト実行確認
- [ ] ドキュメント更新

