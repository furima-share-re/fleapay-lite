# LLM実装の環境変数

## ✅ 結論：環境変数の修正は**不要**です

既存の環境変数で動作します。新しい必須環境変数は追加されていません。

---

## 📋 環境変数の使用状況

### 必須環境変数（既存）

| 環境変数 | 用途 | 既存 | 備考 |
|---------|------|------|------|
| `OPENAI_API_KEY` | OpenAI API認証 | ✅ | 既存のまま使用 |
| `HELICONE_API_KEY` | Helicone監視 | ✅ | 既存のまま使用 |
| `NODE_ENV` | 環境名 | ✅ | 既存のまま使用 |

### オプション環境変数（デフォルト値あり）

#### プロバイダー選択

| 環境変数 | デフォルト値 | 用途 |
|---------|------------|------|
| `LLM_PROVIDER` | `'openai'` | デフォルトプロバイダー選択 |

**設定例**:
```bash
# デフォルトプロバイダーを変更する場合のみ設定
LLM_PROVIDER=anthropic
```

#### タスク別設定（オプション）

各タスクタイプごとにプロバイダーとモデルをカスタマイズ可能：

| 環境変数 | デフォルト値 | 用途 |
|---------|------------|------|
| `LLM_TASK_IMAGE_ANALYSIS_PROVIDER` | `'openai'` | 画像解析タスクのプロバイダー |
| `LLM_TASK_IMAGE_ANALYSIS_MODEL` | `'gpt-4o'` | 画像解析タスクのモデル |
| `LLM_TASK_IMAGE_GENERATION_PROVIDER` | `'openai'` | 画像生成タスクのプロバイダー |
| `LLM_TASK_IMAGE_GENERATION_MODEL` | `'dall-e-3'` | 画像生成タスクのモデル |
| `LLM_TASK_IMAGE_EDIT_PROVIDER` | `'openai'` | 画像編集タスクのプロバイダー |
| `LLM_TASK_IMAGE_EDIT_MODEL` | `'dall-e-2'` | 画像編集タスクのモデル |
| `LLM_TASK_TEXT_GENERATION_PROVIDER` | `'openai'` | テキスト生成タスクのプロバイダー |
| `LLM_TASK_TEXT_GENERATION_MODEL` | `'gpt-4o'` | テキスト生成タスクのモデル |
| `LLM_TASK_LONG_CONTEXT_PROVIDER` | `'anthropic'` | 長文処理タスクのプロバイダー |
| `LLM_TASK_LONG_CONTEXT_MODEL` | `'claude-3-opus'` | 長文処理タスクのモデル |
| `LLM_TASK_CODE_GENERATION_PROVIDER` | `'openai'` | コード生成タスクのプロバイダー |
| `LLM_TASK_CODE_GENERATION_MODEL` | `'gpt-4o'` | コード生成タスクのモデル |
| `LLM_TASK_JSON_EXTRACTION_PROVIDER` | `'openai'` | JSON抽出タスクのプロバイダー |
| `LLM_TASK_JSON_EXTRACTION_MODEL` | `'gpt-4o'` | JSON抽出タスクのモデル |
| `LLM_TASK_COST_OPTIMIZED_PROVIDER` | `'gemini'` | コスト重視タスクのプロバイダー |
| `LLM_TASK_COST_OPTIMIZED_MODEL` | `'gemini-pro'` | コスト重視タスクのモデル |

**注意**: これらの環境変数は**オプション**です。設定しなくてもデフォルト値で動作します。

#### Langfuse統合（オプション）

Langfuseを使用する場合のみ設定：

| 環境変数 | デフォルト値 | 用途 |
|---------|------------|------|
| `LANGFUSE_PUBLIC_KEY` | - | Langfuse Public Key（未設定時は無効化） |
| `LANGFUSE_SECRET_KEY` | - | Langfuse Secret Key（未設定時は無効化） |
| `LANGFUSE_HOST` | `'https://cloud.langfuse.com'` | Langfuseホスト（セルフホスト時） |

**注意**: Langfuse関連の環境変数は**オプション**です。設定しなくても動作します（プロンプト管理とトレーシングが無効化されます）。

---

## 🎯 動作確認

### 最小構成（既存の環境変数のみ）

```bash
# 既存の環境変数（必須）
OPENAI_API_KEY=sk-...
HELICONE_API_KEY=sk-...
NODE_ENV=production
```

**これだけで動作します！** ✅

### カスタマイズ例

```bash
# デフォルトプロバイダーを変更
LLM_PROVIDER=anthropic

# 画像解析タスクのモデルを変更
LLM_TASK_IMAGE_ANALYSIS_MODEL=gpt-4-turbo

# Langfuseを使用する場合（オプション）
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
```

---

## ✅ まとめ

**環境変数の修正は不要です。**

- ✅ 既存の環境変数（`OPENAI_API_KEY`, `HELICONE_API_KEY`）で動作
- ✅ 新しい必須環境変数は追加されていない
- ✅ オプション環境変数はデフォルト値で動作
- ✅ Langfuse関連はオプション（設定しなくても動作）

**そのまま使用できます！** 🎉

