# AIコード共通化評価

**評価日**: 2026-01-03  
**評価対象**: `lib/llm/` ディレクトリ全体

## 📊 共通化評価

**総合評価: 70/100点** 🟡 **良好（改善の余地あり）**

| 評価項目 | スコア | 状況 |
|---------|--------|------|
| 共通APIの提供 | ✅ 90/100 | 優秀 - `lib/llm/index.ts`で統一 |
| モデル設定の一元化 | ⚠️ 60/100 | 普通 - 環境変数対応だが一部ハードコード |
| プロバイダー抽象化 | ✅ 95/100 | 優秀 - 完全に抽象化 |
| タスクルーティング | ✅ 90/100 | 優秀 - 自動選択+フォールバック |
| モデル変更の容易さ | ⚠️ 50/100 | 要改善 - 一部ファイル修正が必要 |

---

## ✅ 共通化されている点

### 1. 統一されたAPI

```typescript
// lib/llm/index.ts から統一エクスポート
import {
  chatCompletion,
  generateImage,
  analyzeImage,
  generateText,
  editImage,
  createEmbedding,
  chatCompletionStream,
} from '@/lib/llm';

// 拡張機能も統一
import {
  speechToText,
  textToSpeech,
  generateSNSPost,
  gatherInformation,
  generatePodcastEpisode,
} from '@/lib/llm/features';
```

**評価**: 🟢 優秀 - すべての機能が統一されたAPIで呼び出し可能

---

### 2. タスクルーティング（自動プロバイダー選択）

```typescript
// executeTask が自動的に最適なプロバイダーを選択
import { executeTask } from '@/lib/llm';

const response = await executeTask('image-analysis', {
  messages: [{ role: 'user', content: 'Analyze this' }],
  // model を指定しなくても config.ts から自動取得
});
```

**評価**: 🟢 優秀 - タスクタイプで自動選択

---

### 3. 環境変数によるモデル設定

```bash
# 環境変数でモデルを変更可能
LLM_TASK_TEXT_GENERATION_MODEL=gpt-4-turbo
LLM_TASK_IMAGE_ANALYSIS_MODEL=gpt-4o-mini
```

**評価**: 🟢 優秀 - 環境変数で一元管理可能

---

## ⚠️ 改善が必要な点

### 1. モデル名のハードコード

以下のファイルでモデル名がハードコードされています：

#### `lib/llm/index.ts`

```typescript
// ❌ ハードコード
export async function analyzeImage(...) {
  return executeTask('image-analysis', {
    model: 'gpt-4o', // ← ハードコード
    ...
  });
}

export async function generateText(...) {
  return executeTask('text-generation', {
    model: 'gpt-4o', // ← ハードコード
    ...
  });
}
```

#### `lib/llm/features/sns-posting.ts`

```typescript
// ❌ ハードコード
const response = await executeTask('text-generation', {
  model: 'gpt-4o', // ← ハードコード
  ...
});
```

#### `lib/llm/features/podcast.ts`

```typescript
// ❌ ハードコード
const response = await executeTask('text-generation', {
  model: 'gpt-4o', // ← ハードコード
  ...
});
```

#### `lib/llm/features/information-gathering.ts`

```typescript
// ❌ ハードコード
const response = await executeTask('text-generation', {
  model: 'gpt-4o', // ← ハードコード
  ...
});
```

**問題**: モデルを変更するたびに複数ファイルを修正する必要がある

---

## 🔧 改善提案

### 解決策1: `executeTask`でモデルを自動取得（推奨）

`executeTask`は既に`config.ts`からモデルを取得する仕組みがあるため、`model`を指定しないようにする：

```typescript
// ✅ 改善後
export async function analyzeImage(...) {
  return executeTask('image-analysis', {
    // model を削除 → config.ts から自動取得
    messages: [...],
    ...options,
  });
}
```

### 解決策2: `getTaskConfig`を使用してモデルを取得

```typescript
import { getTaskConfig } from '@/lib/llm';

const config = getTaskConfig('text-generation');
const response = await executeTask('text-generation', {
  model: config.preferredModel, // 環境変数から取得
  ...
});
```

---

## 📈 改善後の予想スコア

| 評価項目 | 現在 | 改善後 | 差分 |
|---------|------|--------|------|
| 共通APIの提供 | 90 | 90 | - |
| モデル設定の一元化 | 60 | 95 | +35 |
| プロバイダー抽象化 | 95 | 95 | - |
| タスクルーティング | 90 | 90 | - |
| モデル変更の容易さ | 50 | 95 | +45 |
| **総合** | **70** | **93** | **+23** |

---

## ✅ 結論

### 現在の状況

- ✅ **共通化はされている** - 統一されたAPIで呼び出し可能
- ⚠️ **モデル変更時に一部ファイル修正が必要** - ハードコードされたモデル名がある

### 改善後

- ✅ **完全に共通化** - 環境変数のみでモデル変更可能
- ✅ **ファイル修正不要** - モデル変更時にコード修正は不要

**推奨**: ハードコードされたモデル名を削除し、`config.ts`から自動取得するように改善する。

