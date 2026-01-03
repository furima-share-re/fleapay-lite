# LLM抽象化レイヤーへの移行ガイド

既存コードを新しいLLM抽象化レイヤーに段階的に移行する方法です。

## 🎯 移行方針

- **段階的移行**: 既存コードを一度に変更せず、必要に応じて移行
- **後方互換性**: `lib/openai.ts`は残し、既存コードはそのまま動作
- **新規コード**: 新規コードは`lib/llm`を使用

## 📋 移行手順

### Step 1: 既存コードの確認

現在の使用箇所を確認：

```bash
grep -r "from '@/lib/openai'" app/
```

### Step 2: 新APIへの置き換え

#### Before

```typescript
// app/api/analyze-item/route.ts
import { openai, isOpenAIAvailable } from '@/lib/openai';

if (!isOpenAIAvailable()) {
  return NextResponse.json(
    { error: 'openai_not_configured' },
    { status: 503 }
  );
}

const response = await openai!.chat.completions.create({
  model: 'gpt-4o',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: '...' },
      { type: 'image_url', image_url: { url: dataUrl } }
    ]
  }],
  max_tokens: 200
});

const content = response.choices[0]?.message?.content || '{}';
```

#### After

```typescript
// app/api/analyze-item/route.ts
import { chatCompletion } from '@/lib/llm';

try {
  const response = await chatCompletion({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: '...' },
        { type: 'image_url', image_url: { url: dataUrl } }
      ]
    }],
    max_tokens: 200
  });

  const content = response.content || '{}';
} catch (error) {
  if (error.message.includes('not available')) {
    return NextResponse.json(
      { error: 'llm_not_configured' },
      { status: 503 }
    );
  }
  throw error;
}
```

### Step 3: 画像編集APIの移行

#### Before

```typescript
// app/api/photo-frame/route.ts
import { openai, isOpenAIAvailable } from '@/lib/openai';

if (!isOpenAIAvailable()) {
  return NextResponse.json(
    { error: 'openai_not_configured' },
    { status: 503 }
  );
}

const result = await openai!.images.edit({
  model: 'dall-e-2',
  image: fileObj,
  prompt,
  size: '1024x1024',
});

const b64 = result.data?.[0]?.b64_json;
const buf = Buffer.from(b64, 'base64');
```

#### After

```typescript
// app/api/photo-frame/route.ts
import { imageEdit } from '@/lib/llm';

try {
  const result = await imageEdit({
    model: 'dall-e-2',
    image: fileObj,
    prompt,
    size: '1024x1024',
  });

  const buf = result.image; // 既にBuffer形式
} catch (error) {
  if (error.message.includes('not available')) {
    return NextResponse.json(
      { error: 'llm_not_configured' },
      { status: 503 }
    );
  }
  throw error;
}
```

## 🔄 段階的移行の例

### Phase 1: 新規コードのみ新APIを使用

既存コードはそのまま、新規機能のみ新APIを使用：

```typescript
// 新規エンドポイント
import { chatCompletion } from '@/lib/llm';

// 既存エンドポイント（変更なし）
import { openai } from '@/lib/openai';
```

### Phase 2: 既存コードを段階的に移行

1箇所ずつ移行し、動作確認：

```typescript
// 1. まず新APIでテスト
import { chatCompletion } from '@/lib/llm';
// import { openai } from '@/lib/openai'; // コメントアウト

// 2. 動作確認後、既存インポートを削除
```

### Phase 3: 完全移行

すべてのコードを新APIに移行：

```bash
# 既存のlib/openai.tsは残す（deprecated扱い）
# すべての使用箇所をlib/llmに変更
```

## 🎨 プロバイダー特性に応じた使い分け

### 画像解析（GPT-4o推奨）

```typescript
import { chatCompletion } from '@/lib/llm';

const response = await chatCompletion({
  model: 'gpt-4o', // 画像解析に最適
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Analyze this image' },
      { type: 'image_url', image_url: { url: imageUrl } }
    ]
  }],
});
```

### 長文処理（Claude推奨、将来追加）

```typescript
import { getLLMProvider } from '@/lib/llm';

const provider = getLLMProvider('anthropic'); // 将来追加
if (provider) {
  const response = await provider.chatCompletion({
    model: 'claude-3-opus', // 長文処理に最適
    messages: [{ role: 'user', content: veryLongText }],
  });
}
```

### コスト重視（Gemini推奨、将来追加）

```typescript
import { chatCompletion } from '@/lib/llm';

const response = await chatCompletion({
  model: 'gemini-pro', // コスト効率が良い
  messages: [{ role: 'user', content: 'Hello' }],
});
```

## ⚠️ 注意事項

1. **エラーハンドリング**: 新APIは例外を投げるため、try-catchが必要
2. **レスポンス形式**: `response.content`で直接アクセス（`response.choices[0]?.message?.content`ではない）
3. **プロバイダー固有機能**: `getNativeClient()`でアクセス可能
4. **環境変数**: `LLM_PROVIDER`でプロバイダーを選択可能（デフォルト: `openai`）

## 📊 移行チェックリスト

- [ ] 既存コードの使用箇所を確認
- [ ] 新APIの動作確認（テスト環境）
- [ ] 1箇所ずつ移行
- [ ] エラーハンドリングの追加
- [ ] レスポンス形式の変更対応
- [ ] 本番環境での動作確認
- [ ] 既存コードの削除（オプション）

## 🔍 トラブルシューティング

### エラー: "No LLM provider is available"

環境変数を確認：

```bash
# OpenAI設定
OPENAI_API_KEY=sk-...
HELICONE_API_KEY=sk-...

# プロバイダー選択（オプション）
LLM_PROVIDER=openai
```

### エラー: "Provider does not support image editing"

画像編集は対応プロバイダーのみ：

```typescript
import { getLLMProvider } from '@/lib/llm';

const provider = getLLMProvider('openai');
if (provider?.imageEdit) {
  // 画像編集が利用可能
}
```

### 既存コードとの互換性

既存の`lib/openai.ts`は残しているため、既存コードはそのまま動作します。段階的に移行してください。

