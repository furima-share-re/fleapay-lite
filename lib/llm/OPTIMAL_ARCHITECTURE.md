# LLM抽象化レイヤー - 最適な構成設計

既存コードを無視した、拡張性と汎用性を重視した最適な構成です。

## 🎯 設計原則

1. **タスク指向**: タスクタイプに応じて最適なプロバイダー/モデルを自動選択
2. **設定駆動**: 環境変数・設定ファイル・コードで柔軟に設定可能
3. **フォールバック**: プライマリプロバイダー失敗時の自動フォールバック
4. **拡張性**: 新しいプロバイダー・モデルを簡単に追加可能
5. **型安全**: TypeScriptで完全に型付け

## 📐 アーキテクチャ

```
lib/llm/
├── types.ts              # 共通型定義
├── config.ts             # 設定管理（タスク別推奨設定）
├── factory.ts            # プロバイダーファクトリー
├── router.ts             # タスクルーター（最適プロバイダー選択）
├── providers/            # プロバイダー実装
│   ├── base.ts           # ベースクラス
│   ├── openai.ts
│   ├── anthropic.ts
│   └── gemini.ts
└── index.ts              # エクスポート・簡易API
```

## 🏗️ 最適な構成の詳細

### 1. タスクタイプ定義

```typescript
// lib/llm/types.ts

export type TaskType = 
  | 'image-analysis'      // 画像解析
  | 'image-generation'    // 画像生成
  | 'image-edit'          // 画像編集
  | 'text-generation'     // テキスト生成
  | 'long-context'        // 長文処理
  | 'code-generation'     // コード生成
  | 'json-extraction'     // JSON抽出
  | 'cost-optimized';     // コスト重視

export interface TaskConfig {
  taskType: TaskType;
  preferredProvider?: LLMProvider;
  preferredModel?: string;
  fallbackProviders?: LLMProvider[];
  options?: Partial<ChatCompletionOptions>;
}
```

### 2. タスク別推奨設定

```typescript
// lib/llm/config.ts

export const TASK_RECOMMENDATIONS: Record<TaskType, TaskConfig> = {
  'image-analysis': {
    taskType: 'image-analysis',
    preferredProvider: 'openai',
    preferredModel: 'gpt-4o',
    fallbackProviders: ['gemini', 'anthropic'],
    options: {
      temperature: 0.1,
      max_tokens: 500,
    },
  },
  'long-context': {
    taskType: 'long-context',
    preferredProvider: 'anthropic',
    preferredModel: 'claude-3-opus',
    fallbackProviders: ['openai'],
    options: {
      temperature: 0.7,
      max_tokens: 4096,
    },
  },
  'cost-optimized': {
    taskType: 'cost-optimized',
    preferredProvider: 'gemini',
    preferredModel: 'gemini-pro',
    fallbackProviders: ['openai'],
    options: {
      temperature: 0.5,
    },
  },
  // ...
};
```

### 3. タスクルーター（最適プロバイダー自動選択）

```typescript
// lib/llm/router.ts

export async function executeTask<T extends TaskType>(
  taskType: T,
  options: ChatCompletionOptions,
  customConfig?: Partial<TaskConfig>
): Promise<ChatCompletionResponse> {
  const config = { ...TASK_RECOMMENDATIONS[taskType], ...customConfig };
  const providers = [
    config.preferredProvider,
    ...(config.fallbackProviders || []),
  ].filter(Boolean) as LLMProvider[];

  // 推奨プロバイダーから順に試行
  for (const providerName of providers) {
    const provider = getLLMProvider(providerName);
    if (!provider || !provider.isAvailable()) continue;

    try {
      const mergedOptions = {
        ...config.options,
        ...options,
        model: options.model || config.preferredModel || options.model,
      };
      
      return await provider.chatCompletion(mergedOptions);
    } catch (error) {
      console.warn(`Provider ${providerName} failed, trying fallback...`, error);
      continue;
    }
  }

  throw new Error(`All providers failed for task type: ${taskType}`);
}
```

### 4. プロバイダーベースクラス

```typescript
// lib/llm/providers/base.ts

export abstract class BaseLLMProvider implements LLMProviderInterface {
  abstract readonly name: LLMProvider;
  abstract readonly supportedTaskTypes: TaskType[];
  abstract readonly supportedModels: string[];

  abstract isAvailable(): boolean;
  abstract chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;

  /**
   * タスクタイプに対応しているか
   */
  supportsTaskType(taskType: TaskType): boolean {
    return this.supportedTaskTypes.includes(taskType);
  }

  /**
   * モデルをサポートしているか
   */
  supportsModel(model: string): boolean {
    return this.supportedModels.includes(model);
  }
}
```

### 5. プロバイダー実装例

```typescript
// lib/llm/providers/openai.ts

export class OpenAIProvider extends BaseLLMProvider {
  readonly name = 'openai' as const;
  readonly supportedTaskTypes: TaskType[] = [
    'image-analysis',
    'image-generation',
    'image-edit',
    'text-generation',
    'json-extraction',
  ];
  readonly supportedModels = [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'dall-e-2',
    'dall-e-3',
  ];

  // ... 実装
}
```

## 🚀 使用方法

### 基本的な使い方（タスク指向）

```typescript
import { executeTask } from '@/lib/llm';

// タスクタイプを指定するだけで最適なプロバイダー/モデルを自動選択
const response = await executeTask('image-analysis', {
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Analyze this image' },
      { type: 'image_url', image_url: { url: imageUrl } }
    ]
  }],
});

// 自動的に gpt-4o が選択され、失敗時は gemini → anthropic にフォールバック
```

### プロバイダーを明示的に指定

```typescript
import { executeTask } from '@/lib/llm';

// カスタム設定でプロバイダーを指定
const response = await executeTask('text-generation', {
  messages: [{ role: 'user', content: 'Hello' }],
}, {
  preferredProvider: 'anthropic',
  preferredModel: 'claude-3-opus',
});
```

### プロバイダーを直接使用（高度な用途）

```typescript
import { getLLMProvider } from '@/lib/llm';

const provider = getLLMProvider('openai');
if (provider) {
  // プロバイダー固有の機能を使用
  const nativeClient = provider.getNativeClient<OpenAI>();
  // ...
}
```

### 簡易API（タスクタイプ推論）

```typescript
import { analyzeImage, generateText, editImage } from '@/lib/llm';

// 画像解析
const analysis = await analyzeImage(imageUrl, 'Analyze this product');

// テキスト生成
const text = await generateText('Write a story');

// 画像編集
const edited = await editImage(imageFile, 'Add a frame');
```

## ⚙️ 設定方法

### 環境変数

```bash
# デフォルトプロバイダー
LLM_PROVIDER=openai

# プロバイダー別API Key
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GEMINI_API_KEY=...

# Helicone（監視）
HELICONE_API_KEY=sk-...

# タスク別設定（オプション）
LLM_TASK_IMAGE_ANALYSIS_PROVIDER=openai
LLM_TASK_IMAGE_ANALYSIS_MODEL=gpt-4o
LLM_TASK_COST_OPTIMIZED_PROVIDER=gemini
```

### 設定ファイル（将来拡張）

```typescript
// lib/llm/config.ts

export const LLM_CONFIG = {
  defaultProvider: process.env.LLM_PROVIDER || 'openai',
  tasks: {
    'image-analysis': {
      provider: process.env.LLM_TASK_IMAGE_ANALYSIS_PROVIDER || 'openai',
      model: process.env.LLM_TASK_IMAGE_ANALYSIS_MODEL || 'gpt-4o',
    },
    // ...
  },
};
```

## 🔧 新しいプロバイダーの追加

### Step 1: プロバイダークラス作成

```typescript
// lib/llm/providers/anthropic.ts

export class AnthropicProvider extends BaseLLMProvider {
  readonly name = 'anthropic' as const;
  readonly supportedTaskTypes: TaskType[] = [
    'text-generation',
    'long-context',
    'code-generation',
  ];
  readonly supportedModels = [
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku',
  ];

  // 実装...
}
```

### Step 2: ファクトリーに登録

```typescript
// lib/llm/factory.ts

import { AnthropicProvider } from './providers/anthropic';

function createProvider(provider: LLMProvider): LLMProviderInterface | null {
  switch (provider) {
    case 'openai': return new OpenAIProvider();
    case 'anthropic': return new AnthropicProvider(); // 追加
    // ...
  }
}
```

### Step 3: タスク推奨設定に追加（オプション）

```typescript
// lib/llm/config.ts

export const TASK_RECOMMENDATIONS: Record<TaskType, TaskConfig> = {
  'long-context': {
    preferredProvider: 'anthropic', // 追加
    preferredModel: 'claude-3-opus',
    // ...
  },
};
```

## 📊 メリット

### 1. タスク指向で直感的

```typescript
// 何のプロバイダーを使うか考えなくて良い
await executeTask('image-analysis', { messages: [...] });
```

### 2. 自動フォールバック

```typescript
// プライマリプロバイダーが失敗しても自動的にフォールバック
// openai → gemini → anthropic
```

### 3. プロジェクト別に最適化

```typescript
// プロジェクトごとに推奨設定を変更可能
// コスト重視プロジェクト: gemini優先
// 高品質重視プロジェクト: claude優先
```

### 4. 新しいモデル追加が簡単

```typescript
// 新しいモデルがリリースされても、設定を追加するだけ
supportedModels: ['gpt-4o', 'gpt-5', 'gpt-6'], // 追加
```

## 🎨 実装例

### 画像解析エンドポイント

```typescript
// app/api/analyze-item/route.ts

import { executeTask } from '@/lib/llm';

export async function POST(request: Request) {
  const imageUrl = await processImage(request);
  
  // タスクタイプを指定するだけで最適なプロバイダー/モデルを自動選択
  const response = await executeTask('image-analysis', {
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this product image...' },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }],
  });

  return NextResponse.json({ analysis: response.content });
}
```

### コスト重視のテキスト生成

```typescript
// app/api/generate-text/route.ts

import { executeTask } from '@/lib/llm';

export async function POST(request: Request) {
  // コスト重視タスクで自動的にgeminiが選択される
  const response = await executeTask('cost-optimized', {
    messages: [{ role: 'user', content: 'Generate text...' }],
  });

  return NextResponse.json({ text: response.content });
}
```

## 📝 まとめ

この構成により：

1. ✅ **タスク指向**: 何をしたいかだけを指定
2. ✅ **自動最適化**: 最適なプロバイダー/モデルを自動選択
3. ✅ **フォールバック**: 失敗時の自動切り替え
4. ✅ **拡張性**: 新しいプロバイダー/モデルを簡単に追加
5. ✅ **柔軟性**: プロジェクトごとに最適化可能
6. ✅ **型安全**: TypeScriptで完全に型付け

既存コードを無視して、この構成で実装すれば、将来的な拡張性とメンテナンス性が大幅に向上します。

