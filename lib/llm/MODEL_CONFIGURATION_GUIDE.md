# モデル設定ガイド

**更新日**: 2026-01-03  
**対象**: すべてのLLM機能

---

## 📋 概要

**モデル変更は環境変数のみで可能です。コード修正は不要です。**

すべてのモデル設定は`lib/llm/config.ts`で一元管理され、環境変数で上書き可能です。

---

## 🔧 環境変数によるモデル設定

### タスク別モデル設定

各タスクタイプごとに環境変数でモデルを設定できます：

```bash
# 画像解析
LLM_TASK_IMAGE_ANALYSIS_PROVIDER=openai
LLM_TASK_IMAGE_ANALYSIS_MODEL=gpt-4o

# 画像生成
LLM_TASK_IMAGE_GENERATION_PROVIDER=openai
LLM_TASK_IMAGE_GENERATION_MODEL=dall-e-3

# 画像編集
LLM_TASK_IMAGE_EDIT_PROVIDER=openai
LLM_TASK_IMAGE_EDIT_MODEL=dall-e-2

# テキスト生成
LLM_TASK_TEXT_GENERATION_PROVIDER=openai
LLM_TASK_TEXT_GENERATION_MODEL=gpt-4o

# 長文処理
LLM_TASK_LONG_CONTEXT_PROVIDER=anthropic
LLM_TASK_LONG_CONTEXT_MODEL=claude-3-opus

# コード生成
LLM_TASK_CODE_GENERATION_PROVIDER=openai
LLM_TASK_CODE_GENERATION_MODEL=gpt-4o

# JSON抽出
LLM_TASK_JSON_EXTRACTION_PROVIDER=openai
LLM_TASK_JSON_EXTRACTION_MODEL=gpt-4o

# コスト重視
LLM_TASK_COST_OPTIMIZED_PROVIDER=gemini
LLM_TASK_COST_OPTIMIZED_MODEL=gemini-pro
```

---

## ✅ モデル変更の影響範囲

### 自動的に適用される機能

以下の機能は`executeTask`を使用しているため、環境変数の変更が自動的に適用されます：

- ✅ **画像解析** (`analyzeImage`)
- ✅ **テキスト生成** (`generateText`)
- ✅ **SNS自動投稿** (`generateSNSPost`)
- ✅ **情報収集** (`gatherInformation`)
- ✅ **ポッドキャスト** (`generatePodcastEpisode`)

**コード修正不要** - 環境変数のみで変更可能

---

### 直接モデル指定が必要な機能

以下の機能は直接モデルを指定する必要がありますが、オプションで上書き可能です：

- ⚠️ **画像生成** (`generateImage`) - オプションで`model`を指定可能
- ⚠️ **音声認識** (`speechToText`) - オプションで`model`を指定可能
- ⚠️ **音声合成** (`textToSpeech`) - オプションで`model`を指定可能
- ⚠️ **埋め込み** (`createEmbedding`) - オプションで`model`を指定可能

**使用例**:

```typescript
// デフォルトモデルを使用（whisper-1）
await speechToText({ audio: audioFile });

// モデルを指定
await speechToText({ 
  audio: audioFile,
  model: 'whisper-1-large' // オプションで上書き可能
});
```

---

## 🎯 モデル変更の手順

### 1. 環境変数を設定

```bash
# .env ファイルまたは Render の環境変数設定
LLM_TASK_TEXT_GENERATION_MODEL=gpt-4-turbo
LLM_TASK_IMAGE_ANALYSIS_MODEL=gpt-4o-mini
```

### 2. アプリケーションを再起動

```bash
# 開発環境
npm run dev

# 本番環境（Render等）
# 環境変数変更後、自動的に再デプロイ
```

### 3. 確認

コード修正は不要です。環境変数の変更が自動的に適用されます。

---

## 📊 デフォルトモデル一覧

| タスクタイプ | デフォルトプロバイダー | デフォルトモデル |
|------------|---------------------|----------------|
| 画像解析 | openai | gpt-4o |
| 画像生成 | openai | dall-e-3 |
| 画像編集 | openai | dall-e-2 |
| テキスト生成 | openai | gpt-4o |
| 長文処理 | anthropic | claude-3-opus |
| コード生成 | openai | gpt-4o |
| JSON抽出 | openai | gpt-4o |
| コスト重視 | gemini | gemini-pro |

---

## 🔍 モデル設定の確認方法

### 実行時に確認

```typescript
import { getTaskConfig } from '@/lib/llm';

const config = getTaskConfig('text-generation');
console.log('Provider:', config.preferredProvider);
console.log('Model:', config.preferredModel);
```

### 環境変数の確認

```bash
# 現在の環境変数を確認
echo $LLM_TASK_TEXT_GENERATION_MODEL
```

---

## ✅ 結論

**モデル変更は環境変数のみで可能です。**

- ✅ コード修正不要
- ✅ 環境変数で一元管理
- ✅ タスク別に設定可能
- ✅ デフォルト値あり

**新しいモデルがリリースされても、環境変数を変更するだけで対応可能です。**

