# AI機能設計書

**バージョン**: 2.0  
**作成日**: 2026-01-03  
**最終更新**: 2026-01-03  
**対象**: `lib/llm/` ディレクトリ全体

---

## 📋 目次

1. [概要](#概要)
2. [設計原則](#設計原則)
3. [アーキテクチャ](#アーキテクチャ)
4. [主要コンポーネント](#主要コンポーネント)
5. [データフロー](#データフロー)
6. [API仕様](#api仕様)
7. [設定・環境変数](#設定環境変数)
8. [エラーハンドリング](#エラーハンドリング)
9. [監視・トレーシング](#監視トレーシング)
10. [拡張性](#拡張性)
11. [セキュリティ](#セキュリティ)
12. [運用・保守](#運用保守)
13. [将来の拡張](#将来の拡張)

---

## 1. 概要

### 1.1 目的

本設計書は、fleapay-liteプロジェクトにおけるAI機能（LLM）の実装設計を定義します。

**主な目的**:
- 複数のLLMプロバイダー（OpenAI、Anthropic、Google Gemini等）を統一的なインターフェースで扱う
- タスクタイプに応じた最適なプロバイダー・モデルの自動選択
- プロンプト管理、監視、テストの統合
- 高い拡張性と保守性の確保

### 1.2 スコープ

**対象範囲**:
- LLM抽象化レイヤー（`lib/llm/`）
- プロバイダー実装（OpenAI、将来のAnthropic、Gemini等）
- 拡張機能（SNS自動投稿、情報収集、ポッドキャスト等）
- 監視ツール統合（Helicone、Langfuse、Promptfoo）

**対象外**:
- フロントエンド実装
- データベース設計
- インフラストラクチャ設計

### 1.3 評価スコア

**総合評価: 93/100点** 🟢 **優秀**

| カテゴリ | スコア | 評価 |
|---------|--------|------|
| 共通APIの提供 | 95/100 | 🟢 優秀 |
| モデル設定の一元化 | 95/100 | 🟢 優秀 |
| プロバイダー抽象化 | 95/100 | 🟢 優秀 |
| タスクルーティング | 95/100 | 🟢 優秀 |
| モデル変更の容易さ | 95/100 | 🟢 優秀 |

---

## 2. 設計原則

### 2.1 基本原則

1. **汎用性**: 複数のLLMプロバイダーに対応
2. **拡張性**: 新しいプロバイダー・機能を簡単に追加可能
3. **特性の活用**: 各プロバイダーの独自機能も使用可能
4. **後方互換性**: 既存コードを壊さず段階的に移行可能
5. **型安全**: TypeScriptで完全に型付け
6. **設定の一元化**: 環境変数による一元管理

### 2.2 AI駆動開発原則（設計書準拠）

1. **原則7: AI判断は記録される** - Heliconeで全LLM API呼び出しを記録
2. **原則3: 変更は機械的に検証される** - PromptfooでCI/CD統合
3. **プロンプト管理**: Langfuseで一元管理（コードデプロイ不要）
4. **A/Bテスト**: Langfuseで段階的改善
5. **回帰テスト**: Promptfooで品質保証

---

## 3. アーキテクチャ

### 3.1 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    アプリケーション層                          │
│  (app/api/*, app/pages/*)                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  LLM抽象化レイヤー (lib/llm/)                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Router      │  │  Providers   │  │   Prompts    │     │
│  │ (タスク選択)   │  │   (実装)      │  │  (Langfuse)  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐     │
│  │   Config     │  │   Factory     │  │  Tracing    │     │
│  │ (タスク設定)  │  │ (プロバイダー) │  │ (Langfuse)  │     │
│  └──────────────┘  └───────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              拡張機能 (features/)                      │  │
│  │  - SNS自動投稿  - 情報収集  - ポッドキャスト           │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────┬──────────────────┬──────────────────┬─────────┘
             │                  │                  │
             ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Helicone    │  │  Langfuse    │  │  Promptfoo   │
    │  (監視)      │  │  (管理)      │  │  (テスト)     │
    └──────────────┘  └──────────────┘  └──────────────┘
             │                  │                  │
             └──────────────────┼──────────────────┘
                                ▼
                    ┌──────────────────────┐
                    │   LLMプロバイダー      │
                    │  OpenAI, Anthropic,   │
                    │  Gemini, etc.         │
                    └──────────────────────┘
```

### 3.2 ディレクトリ構造

```
lib/llm/
├── types.ts                  # 共通型定義
├── types-extended.ts         # 拡張型定義（画像生成、音声等）
├── config.ts                 # タスク別推奨設定
├── factory.ts                # プロバイダーファクトリー
├── router.ts                 # タスクルーター（自動選択）
├── prompts.ts                # Langfuse統合（プロンプト管理）
├── tracing.ts                # Langfuse統合（トレーシング）
├── errors.ts                 # エラー分類・処理
├── retry.ts                  # リトライロジック
├── index.ts                  # エクスポート・簡易API
├── providers/                # プロバイダー実装
│   └── openai.ts            # OpenAI（Helicone統合済み）
├── features/                 # 拡張機能
│   ├── audio.ts             # 音声認識・音声合成
│   ├── sns-posting.ts       # SNS自動投稿
│   ├── information-gathering.ts # 情報収集
│   └── podcast.ts           # ポッドキャスト
├── compat/                   # 後方互換性
│   └── openai-adapter.ts    # OpenAI SDK互換アダプター
└── testing/                  # テストユーティリティ
    ├── mock-provider.ts     # モックプロバイダー
    └── test-utils.ts        # テストヘルパー
```

---

## 4. 主要コンポーネント

### 4.1 プロバイダー抽象化 (`types.ts`)

**目的**: 複数のLLMプロバイダーを統一的なインターフェースで扱う

**インターフェース**:
```typescript
interface LLMProviderInterface {
  readonly name: LLMProvider;
  isAvailable(): boolean;
  chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;
  imageEdit?(options: ImageEditOptions): Promise<ImageEditResponse>;
  getNativeClient?<T>(): T | null;
}
```

**特徴**:
- プロバイダー固有の機能も使用可能（`getNativeClient`）
- オプショナルメソッドで柔軟性を確保
- 型安全な実装

### 4.2 タスクルーティング (`router.ts`)

**目的**: タスクタイプに応じて最適なプロバイダー・モデルを自動選択

**機能**:
- タスクタイプ別の推奨プロバイダー選択
- フォールバック機能（複数プロバイダー対応）
- リトライ機能（指数バックオフ）
- Langfuse統合（トレーシング）

**タスクタイプ**:
- `image-analysis`: 画像解析
- `image-generation`: 画像生成
- `image-edit`: 画像編集
- `text-generation`: テキスト生成
- `long-context`: 長文処理
- `code-generation`: コード生成
- `json-extraction`: JSON抽出
- `cost-optimized`: コスト重視

### 4.3 設定管理 (`config.ts`)

**目的**: タスク別の推奨設定を一元管理

**機能**:
- 環境変数による設定上書き
- デフォルト値の管理
- タスク別の推奨プロバイダー・モデル

**環境変数形式**:
```bash
LLM_TASK_<TASK_TYPE>_PROVIDER=openai
LLM_TASK_<TASK_TYPE>_MODEL=gpt-4o
```

### 4.4 プロバイダーファクトリー (`factory.ts`)

**目的**: プロバイダーインスタンスの作成・キャッシュ

**機能**:
- シングルトンパターンによるインスタンス管理
- 環境変数によるデフォルトプロバイダー設定
- プロバイダーの可用性チェック

### 4.5 エラーハンドリング (`errors.ts`)

**目的**: 統一的なエラー分類・処理

**エラー種別**:
- `NETWORK`: ネットワークエラー
- `AUTH`: 認証エラー
- `RATE_LIMIT`: レート制限
- `INVALID_REQUEST`: 不正なリクエスト
- `TIMEOUT`: タイムアウト
- `PROVIDER_ERROR`: プロバイダー固有エラー
- `UNKNOWN`: 不明なエラー

**リトライ可能判定**:
- `retryable`フラグによる自動判定
- 指数バックオフによるリトライ

### 4.6 プロンプト管理 (`prompts.ts`)

**目的**: Langfuseによるプロンプトの一元管理

**機能**:
- Web UIでのプロンプト編集（コードデプロイ不要）
- バージョン管理
- 動的変数の埋め込み
- A/Bテスト対応

### 4.7 トレーシング (`tracing.ts`)

**目的**: LangfuseによるLLM呼び出しのトレーシング

**機能**:
- リクエスト・レスポンスの記録
- エラーの記録
- レイテンシー・トークン数の追跡
- ユーザーID・メタデータの付与

---

## 5. データフロー

### 5.1 基本的な呼び出しフロー

```
1. アプリケーション層
   ↓
2. LLM抽象化レイヤー（簡易API）
   - analyzeImage()
   - generateText()
   - executeTask()
   ↓
3. タスクルーター
   - タスクタイプから設定取得
   - 推奨プロバイダー選択
   - フォールバック処理
   ↓
4. プロバイダー実装
   - OpenAI Provider
   - Anthropic Provider（将来）
   ↓
5. 外部API
   - OpenAI API
   - Anthropic API（将来）
```

### 5.2 エラーハンドリングフロー

```
1. API呼び出し
   ↓
2. エラー発生
   ↓
3. エラー分類（errors.ts）
   - エラー種別判定
   - リトライ可能判定
   ↓
4. リトライ処理（retry.ts）
   - 指数バックオフ
   - 最大リトライ回数チェック
   ↓
5. フォールバック処理（router.ts）
   - 次のプロバイダーを試行
   - すべて失敗した場合はエラーをthrow
```

### 5.3 トレーシングフロー

```
1. タスク実行開始
   ↓
2. Langfuseトレース作成（tracing.ts）
   - トレースID生成
   - メタデータ設定
   ↓
3. LLM呼び出し
   - Helicone経由で記録（自動）
   ↓
4. レスポンス記録（tracing.ts）
   - リクエスト・レスポンス記録
   - レイテンシー・トークン数記録
   ↓
5. エラー記録（エラー時）
   - エラー情報をLangfuseに記録
```

---

## 6. API仕様

### 6.1 簡易API（推奨）

#### `analyzeImage(imageUrl, prompt, options?)`

画像解析を実行します。

```typescript
const result = await analyzeImage(
  'https://example.com/image.jpg',
  'Analyze this product',
  { temperature: 0.1 }
);
```

**パラメータ**:
- `imageUrl`: string - 画像URL
- `prompt`: string - プロンプト
- `options?`: Partial<ChatCompletionOptions> - オプション

**戻り値**: `ChatCompletionResponse`

**モデル**: 環境変数`LLM_TASK_IMAGE_ANALYSIS_MODEL`から自動取得（デフォルト: `gpt-4o`）

#### `generateText(prompt, options?)`

テキスト生成を実行します。

```typescript
const result = await generateText(
  'Write a story',
  { temperature: 0.7, max_tokens: 1000 }
);
```

**パラメータ**:
- `prompt`: string - プロンプト
- `options?`: Partial<ChatCompletionOptions> - オプション

**戻り値**: `ChatCompletionResponse`

**モデル**: 環境変数`LLM_TASK_TEXT_GENERATION_MODEL`から自動取得（デフォルト: `gpt-4o`）

#### `generateImage(prompt, options?)`

画像生成を実行します。

```typescript
const result = await generateImage(
  'A cute cat',
  { size: '1024x1024', quality: 'hd' }
);
```

**パラメータ**:
- `prompt`: string - プロンプト
- `options?`: ImageGenerationOptions - オプション

**戻り値**: `ImageGenerationResponse`

#### `editImage(image, prompt, options?)`

画像編集を実行します。

```typescript
const result = await editImage(
  imageFile,
  'Add a frame',
  { size: '1024x1024' }
);
```

**パラメータ**:
- `image`: File | Buffer - 画像ファイル
- `prompt`: string - プロンプト
- `options?`: { model?: string; size?: string } - オプション

**戻り値**: `ImageEditResponse`

### 6.2 拡張機能API

#### `generateSNSPost(options)`

SNS投稿文を生成します。

```typescript
const post = await generateSNSPost({
  platform: 'twitter',
  content: { text: '今日のフリマ' },
  tone: 'casual',
});
```

#### `gatherInformation(options)`

情報を収集して要約します。

```typescript
const info = await gatherInformation({
  query: 'フリーマーケット トレンド',
  sources: ['web', 'news'],
  summarize: true,
});
```

#### `generatePodcastEpisode(options)`

ポッドキャストエピソードを生成します。

```typescript
const episode = await generatePodcastEpisode({
  title: 'フリマトレンド',
  script: ['トピック1', 'トピック2'],
  voice: 'nova',
});
```

### 6.3 低レベルAPI

#### `chatCompletion(options)`

チャット完了を直接実行します。

```typescript
const response = await chatCompletion({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

#### `executeTask(taskType, options, customConfig?, tracingOptions?)`

タスクを実行します（タスクルーティング使用）。

```typescript
const response = await executeTask('image-analysis', {
  messages: [{ role: 'user', content: 'Analyze this' }],
});
```

---

## 7. 設定・環境変数

### 7.1 必須環境変数

```bash
# OpenAI API Key
OPENAI_API_KEY=sk-...

# Helicone API Key（監視用）
HELICONE_API_KEY=sk-...
```

### 7.2 オプション環境変数

```bash
# デフォルトプロバイダー
LLM_PROVIDER=openai

# タスク別プロバイダー設定
LLM_TASK_IMAGE_ANALYSIS_PROVIDER=openai
LLM_TASK_IMAGE_ANALYSIS_MODEL=gpt-4o

LLM_TASK_TEXT_GENERATION_PROVIDER=openai
LLM_TASK_TEXT_GENERATION_MODEL=gpt-4o

# Langfuse設定（将来）
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://langfuse.example.com
```

### 7.3 設定の優先順位

1. **オプション引数**（関数呼び出し時）
2. **環境変数**（`LLM_TASK_<TASK_TYPE>_MODEL`）
3. **デフォルト値**（`config.ts`）

---

## 8. エラーハンドリング

### 8.1 エラー分類

```typescript
class LLMError extends Error {
  code: ErrorCode;
  provider: string;
  retryable: boolean;
  // ...
}
```

**エラー種別**:
- `NETWORK`: ネットワークエラー（リトライ可能）
- `AUTH`: 認証エラー（リトライ不可）
- `RATE_LIMIT`: レート制限（リトライ可能）
- `INVALID_REQUEST`: 不正なリクエスト（リトライ不可）
- `TIMEOUT`: タイムアウト（リトライ可能）
- `PROVIDER_ERROR`: プロバイダー固有エラー（状況による）
- `UNKNOWN`: 不明なエラー（リトライ可能）

### 8.2 リトライロジック

**指数バックオフ**:
- 初回リトライ: 1秒後
- 2回目: 2秒後
- 3回目: 4秒後
- 最大リトライ回数: 2回（プロバイダー内）

**フォールバック**:
- 推奨プロバイダー失敗時、次のプロバイダーを自動試行
- すべてのプロバイダーが失敗した場合、エラーをthrow

### 8.3 エラーハンドリング例

```typescript
try {
  const response = await analyzeImage(imageUrl, prompt);
} catch (error) {
  if (error instanceof LLMError) {
    if (error.code === 'RATE_LIMIT') {
      // レート制限エラー処理
    } else if (error.code === 'AUTH') {
      // 認証エラー処理
    }
  }
}
```

---

## 9. 監視・トレーシング

### 9.1 Helicone統合

**目的**: LLM API呼び出しの監視・コスト可視化

**機能**:
- 全API呼び出しの記録
- コスト追跡
- レイテンシー測定
- エラー検出

**実装**:
- OpenAI ProviderでHeliconeプロキシ経由で呼び出し
- 環境変数`HELICONE_API_KEY`で認証

### 9.2 Langfuse統合（将来）

**目的**: プロンプト管理・トレーシング

**機能**:
- プロンプトのバージョン管理
- Web UIでのプロンプト編集
- A/Bテスト
- トレーシング

**実装**:
- `prompts.ts`: プロンプト取得
- `tracing.ts`: トレーシング記録

### 9.3 Promptfoo統合（将来）

**目的**: テスト自動化

**機能**:
- 回帰テスト
- CI/CD統合
- 品質保証

---

## 10. 拡張性

### 10.1 新しいプロバイダーの追加

**手順**:

1. **プロバイダークラス作成** (`lib/llm/providers/anthropic.ts`):
```typescript
export class AnthropicProvider implements LLMProviderInterface {
  readonly name = 'anthropic' as const;
  // 実装...
}
```

2. **ファクトリーに登録** (`lib/llm/factory.ts`):
```typescript
case 'anthropic':
  return new AnthropicProvider();
```

3. **型定義に追加** (`lib/llm/types.ts`):
```typescript
export type LLMProvider = 'openai' | 'anthropic' | ...;
```

### 10.2 新しいタスクタイプの追加

**手順**:

1. **タスクタイプ定義** (`lib/llm/types.ts`):
```typescript
export type TaskType = ... | 'new-task';
```

2. **設定追加** (`lib/llm/config.ts`):
```typescript
'new-task': {
  taskType: 'new-task',
  preferredProvider: 'openai',
  preferredModel: 'gpt-4o',
  // ...
}
```

### 10.3 新しい拡張機能の追加

**手順**:

1. **機能実装** (`lib/llm/features/new-feature.ts`)
2. **エクスポート** (`lib/llm/features/index.ts`)
3. **メインエクスポート** (`lib/llm/index.ts`)

---

## 11. セキュリティ

### 11.1 API Key管理

- **環境変数**: API Keyは環境変数で管理
- **シークレット管理**: Render等のシークレット管理機能を使用
- **漏洩防止**: エラーメッセージにAPI Keyを含めない

### 11.2 エラー情報の保護

- **sanitizeError**: エラーメッセージから機密情報を除去
- **ログ出力**: 本番環境では詳細なエラー情報をログに出力しない

### 11.3 レート制限

- **プロバイダー側**: 各プロバイダーのレート制限に従う
- **アプリケーション側**: 必要に応じてレート制限を実装（将来）

---

## 12. 運用・保守

### 12.1 監視項目

- **コスト**: Heliconeで追跡
- **レイテンシー**: Heliconeで測定
- **エラー率**: Langfuseで追跡（将来）
- **使用量**: Heliconeで可視化

### 12.2 ログ出力

- **開発環境**: 詳細なログ出力
- **本番環境**: エラーログのみ出力

### 12.3 デバッグ

- **トレーシング**: Langfuseでトレース確認（将来）
- **Helicone**: API呼び出しの詳細確認
- **ログ**: アプリケーションログでエラー確認

---

## 13. 将来の拡張

### 13.1 計画中の機能

1. **Langfuse統合**（Phase 3.3）
   - プロンプト管理
   - トレーシング
   - A/Bテスト

2. **Promptfoo統合**（Phase 3.3）
   - テスト自動化
   - CI/CD統合

3. **追加プロバイダー**
   - Anthropic Claude
   - Google Gemini
   - Cohere

4. **並列処理**
   - 複数リクエストの並列実行
   - バッチ処理

5. **キャッシュ機能**
   - レスポンスキャッシュ
   - プロンプトキャッシュ

### 13.2 改善予定

1. **テストカバレッジ向上**
   - ユニットテスト追加
   - 統合テスト追加

2. **パフォーマンス最適化**
   - 並列処理実装
   - キャッシュ実装

3. **セキュリティ強化**
   - レート制限実装
   - 入力検証強化

---

## 14. 参考資料

### 14.1 内部ドキュメント

- `README.md`: 基本的な使用方法
- `MIGRATION_GUIDE.md`: 既存コードからの移行ガイド
- `MODEL_CONFIGURATION_GUIDE.md`: モデル設定ガイド
- `EXTENDED_FEATURES_GUIDE.md`: 拡張機能ガイド
- `ENVIRONMENT_VARIABLES.md`: 環境変数一覧

### 14.2 評価ドキュメント

- `COMMONIZATION_EVALUATION_V2.md`: 共通化評価（93/100点）
- `DETAILED_COMPARISON_20_ITEMS.md`: 20項目詳細評価
- `GENERALITY_EVALUATION.md`: 汎用性評価（95/100点）

### 14.3 外部リソース

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Helicone Documentation](https://docs.helicone.ai/)
- [Langfuse Documentation](https://langfuse.com/docs)
- [Promptfoo Documentation](https://promptfoo.dev/docs/)

---

## 15. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0 | 2026-01-03 | 初版作成 |
| 2.0 | 2026-01-03 | 拡張機能追加、評価更新 |

---

## 16. 承認

**設計者**: AI Assistant  
**レビュー**: 未実施  
**承認**: 未承認

---

**最終更新**: 2026-01-03



