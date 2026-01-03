# LLM抽象化レイヤー

汎用的で拡張性の高いLLMプロバイダー抽象化レイヤーです。複数のLLMプロバイダー（OpenAI、Anthropic、Google Geminiなど）を統一的なインターフェースで扱えます。

## 🎯 特徴

- **汎用性**: 複数のLLMプロバイダーに対応
- **拡張性**: 新しいプロバイダーを簡単に追加可能
- **特性の活用**: 各プロバイダーの独自機能も使用可能
- **後方互換性**: 既存コードを壊さず段階的に移行可能
- **型安全**: TypeScriptで完全に型付け

## 📦 使用方法

### 基本的な使い方

```typescript
import { chatCompletion, imageEdit } from '@/lib/llm';

// チャット完了（テキスト生成）
const response = await chatCompletion({
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ],
  max_tokens: 100,
});

console.log(response.content);

// 画像編集
const imageResponse = await imageEdit({
  model: 'dall-e-2',
  image: imageFile,
  prompt: 'Add a beautiful frame',
});
```

### プロバイダーを明示的に指定

```typescript
import { getLLMProvider } from '@/lib/llm';

// 環境変数から自動選択（デフォルト: openai）
const provider = getLLMProvider();

// 明示的に指定
const openaiProvider = getLLMProvider('openai');
// const anthropicProvider = getLLMProvider('anthropic'); // 将来追加
```

### プロバイダー固有の機能を使用

```typescript
import { getLLMProvider } from '@/lib/llm';

const provider = getLLMProvider('openai');
if (provider) {
  // 共通インターフェース経由
  const response = await provider.chatCompletion({ ... });
  
  // プロバイダー固有の機能にアクセス
  const nativeClient = provider.getNativeClient<OpenAI>();
  if (nativeClient) {
    // OpenAI SDKの全機能を使用可能
    const stream = await nativeClient.chat.completions.create({
      stream: true,
      // ...
    });
  }
}
```

## 🔧 環境変数

```bash
# プロバイダー選択（オプション、デフォルト: openai）
LLM_PROVIDER=openai

# OpenAI設定（既存）
OPENAI_API_KEY=sk-...
HELICONE_API_KEY=sk-...

# 将来追加するプロバイダー
# ANTHROPIC_API_KEY=sk-...
# GEMINI_API_KEY=...
```

## 🚀 新しいプロバイダーの追加方法

### 1. プロバイダークラスを作成

`lib/llm/providers/anthropic.ts`:

```typescript
import type { LLMProviderInterface, ChatCompletionOptions, ChatCompletionResponse } from '../types';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider implements LLMProviderInterface {
  readonly name = 'anthropic' as const;
  private client: Anthropic | null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (!this.client) throw new Error('Anthropic client not available');
    
    // Anthropic API呼び出し
    const response = await this.client.messages.create({
      model: options.model,
      messages: options.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : msg.content[0].text,
      })),
      max_tokens: options.max_tokens || 1024,
    });

    return {
      content: response.content[0].text,
      model: response.model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
      raw: response,
    };
  }

  getNativeClient(): Anthropic | null {
    return this.client;
  }
}
```

### 2. ファクトリーに登録

`lib/llm/factory.ts`:

```typescript
import { AnthropicProvider } from './providers/anthropic';

function createProvider(provider: LLMProvider): LLMProviderInterface | null {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':  // 追加
      return new AnthropicProvider();
    // ...
  }
}
```

### 3. 型定義に追加（オプション）

`lib/llm/types.ts`:

```typescript
export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | ...;
```

## 📝 既存コードからの移行

### Before (既存コード)

```typescript
import { openai, isOpenAIAvailable } from '@/lib/openai';

if (!isOpenAIAvailable()) {
  return NextResponse.json({ error: 'not_configured' }, { status: 503 });
}

const response = await openai!.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

### After (新API)

```typescript
import { chatCompletion } from '@/lib/llm';

try {
  const response = await chatCompletion({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello' }],
  });
  console.log(response.content);
} catch (error) {
  // エラーハンドリング
}
```

## 🎨 プロバイダー特性に応じた使い分け

### タスク別の推奨プロバイダー

```typescript
// 画像解析（GPT-4o推奨）
const imageAnalysis = await chatCompletion({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: [{ type: 'image_url', ... }] }],
});

// 長文処理（Claude推奨）
const longText = await chatCompletion({
  model: 'claude-3-opus',
  messages: [{ role: 'user', content: veryLongText }],
});

// コスト重視（Gemini推奨）
const cheap = await chatCompletion({
  model: 'gemini-pro',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

## 📚 APIリファレンス

### `chatCompletion(options)`

チャット完了を実行します。

**パラメータ:**
- `model`: モデル名（例: `'gpt-4o'`, `'claude-3-opus'`）
- `messages`: メッセージ配列
- `temperature?`: 温度パラメータ（0-2）
- `max_tokens?`: 最大トークン数
- `response_format?`: レスポンス形式（`{ type: 'json_object' }`など）

**戻り値:**
```typescript
{
  content: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  raw?: unknown; // プロバイダー固有のレスポンス
}
```

### `imageEdit(options)`

画像編集を実行します（対応プロバイダーのみ）。

**パラメータ:**
- `model`: モデル名（例: `'dall-e-2'`）
- `image`: FileまたはBuffer
- `prompt`: プロンプト
- `size?`: 画像サイズ（例: `'1024x1024'`）

**戻り値:**
```typescript
{
  image: Buffer; // base64デコード済み
  model: string;
  raw?: unknown;
}
```

## 🔍 トラブルシューティング

### プロバイダーが利用できない

```typescript
const provider = getLLMProvider('anthropic');
if (!provider) {
  console.error('Anthropic provider is not available. Check ANTHROPIC_API_KEY.');
}
```

### プロバイダー固有の機能を使用する

```typescript
const provider = getLLMProvider('openai');
const nativeClient = provider?.getNativeClient<OpenAI>();
if (nativeClient) {
  // OpenAI SDKの全機能を使用
}
```

## 📝 注意事項

- 既存の`lib/openai.ts`は後方互換性のために残していますが、新規コードでは`lib/llm`を使用してください
- プロバイダーによってサポートする機能が異なります（`imageEdit`など）
- Heliconeは現在OpenAIのみ対応（将来他のプロバイダーにも対応予定）

