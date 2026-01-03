# Helicone + Langfuse + Promptfoo 実装時間見積もり

**作成日**: 2026-01-03  
**対象**: fleapay-lite プロジェクト  
**目的**: LLM監視ツール3つの実装時間を見積もる

---

## 📊 現在の状況

### OpenAI API使用箇所

| ファイル | 用途 | モデル | 実装状況 |
|---------|------|--------|---------|
| `app/api/analyze-item/route.ts` | 商品画像解析 | `gpt-4o` | ✅ 実装済み |
| `app/api/photo-frame/route.ts` | 写真フレーム加工 | `dall-e-2` | ✅ 実装済み |

**合計**: 2箇所のAPIエンドポイント

---

## 🎯 各ツールの役割と実装内容

### 1. Helicone（LLM API監視）

**役割**: LLM API呼び出しの監視・コスト可視化  
**実装方法**: OpenAI SDKのプロキシ経由設定

**実装内容**:
- `lib/openai.ts` 作成（Helicone経由のOpenAI SDK設定）
- 既存のOpenAI呼び出しを`lib/openai.ts`経由に変更（2箇所）
- 環境変数設定（`HELICONE_API_KEY`）

**実装時間**: **5-10分**（コーディングのみ）

**詳細内訳**:
- `lib/openai.ts`作成: 3-5分（シンプルな設定ファイル）
- 既存コード変更（2箇所）: 2-3分（import文の変更のみ）
- 環境変数設定: 2-3分（Render Dashboardで設定）

**事前準備**（実装時間に含めない）:
- Heliconeアカウント作成・API Key取得: 5-10分（事前準備）
- 動作確認・テスト: 10-15分（実装後の確認）

**合計**: **5-10分**（コーディングのみ） + **15-25分**（事前準備・確認含む）

---

### 2. Langfuse（LLM観測・トレーシング）

**役割**: LLMアプリケーションの観測・トレーシング・評価  
**実装方法**: Langfuse SDK統合

**実装内容**:
- Langfuse SDKインストール（`langfuse`）
- Langfuseクライアント作成（`lib/langfuse.ts`）
- 各APIエンドポイントにトレーシング追加（2箇所）
- 環境変数設定（`LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`）
- Langfuse Cloudアカウント作成（またはセルフホスト）

**実装時間**: **30分-1時間**（コーディングのみ）

**詳細内訳**:

#### 1. 設計フェーズ（10-15分）
- **トレーシングデータ構造の設計**: 5-10分
  - 記録するメタデータの決定（ユーザーID、IP、リクエストID等）
  - プロンプト・レスポンスの記録方法の決定
  - エラーハンドリング時の記録方法の決定
- **各APIエンドポイントの設計**: 5分
  - `/api/analyze-item`: 商品画像解析のトレーシング設計
  - `/api/photo-frame`: 写真フレーム加工のトレーシング設計

#### 2. 実装フェーズ（20-45分）
- **SDKインストール**: 2-3分
  ```bash
  npm install langfuse
  ```
- **`lib/langfuse.ts`作成**: 10-15分
  - Langfuseクライアント初期化
  - ヘルパー関数作成（trace, generation等）
- **各APIエンドポイントにトレーシング追加**: 15-30分
  - `/api/analyze-item`: 8-15分
    - trace作成
    - generation作成（プロンプト・レスポンス記録）
    - エラーハンドリング時の記録
  - `/api/photo-frame`: 7-15分
    - trace作成
    - generation作成（プロンプト・画像レスポンス記録）
    - エラーハンドリング時の記録
- **環境変数設定**: 3-5分
  - `LANGFUSE_SECRET_KEY`
  - `LANGFUSE_PUBLIC_KEY`
  - `LANGFUSE_BASE_URL`（オプション）

**事前準備・確認**（実装時間に含めない）:
- Langfuseアカウント作成・API Key取得: 10-15分
- 動作確認・テスト: 15-30分
  - ダッシュボードでトレーシングデータ確認
  - プロンプト・レスポンスの記録確認

**合計**: **30分-1時間**（コーディングのみ） + **25-45分**（事前準備・確認含む）

**注意事項**:
- LangfuseはHeliconeと併用可能（Heliconeはプロキシ、LangfuseはSDK統合）
- 設計フェーズで記録するメタデータを明確にすることで、実装がスムーズになる

---

### 3. Promptfoo（プロンプトテスト・評価）

**役割**: プロンプトのテスト・評価・ベンチマーク  
**実装方法**: CI/CD統合 + 設定ファイル作成

**実装内容**:
- Promptfooインストール（`npm install -D promptfoo`）
- プロンプトテスト設定ファイル作成（`promptfoo.yml`）
- テストケース作成（商品画像解析・写真フレーム加工）
- CI/CD統合（`.github/workflows/promptfoo.yml`）
- 評価指標の定義（JSON形式・画像品質等）

**実装時間**: **2-3時間**（コーディングのみ）

**詳細内訳**:

#### 1. 設計フェーズ（1-1.5時間）
- **テストケース設計**: 30-45分
  - `/api/analyze-item`用テストケース設計: 15-20分
    - テスト画像の選定（商品写真、値札あり/なし等）
    - 期待値の定義（JSON形式、summary、total）
    - エッジケースの定義（値札なし、複数商品等）
  - `/api/photo-frame`用テストケース設計: 15-25分
    - テスト画像の選定（人物写真、風景写真等）
    - 期待値の定義（画像形式、サイズ、品質）
    - エッジケースの定義（小さい画像、大きい画像等）
- **評価指標の設計**: 30-45分
  - `/api/analyze-item`評価指標: 15-20分
    - JSON形式チェック
    - summaryの品質評価（文字数、内容の妥当性）
    - totalの数値チェック
    - エラーハンドリングの確認
  - `/api/photo-frame`評価指標: 15-25分
    - 画像形式チェック（PNG、サイズ）
    - 画像品質評価（解像度、ファイルサイズ）
    - エラーハンドリングの確認

#### 2. 実装フェーズ（1-1.5時間）
- **Promptfooインストール**: 2-3分
  ```bash
  npm install -D promptfoo
  ```
- **`promptfoo.yml`設定ファイル作成**: 30分
  - プロバイダー設定（OpenAI gpt-4o, dall-e-2）
  - テストケース定義
  - 評価指標定義
  - アサーション定義
- **テストケース実装**: 30-45分
  - `/api/analyze-item`テストケース: 15-20分
    - テスト画像の配置
    - 期待値の定義（YAML形式）
    - アサーションの記述
  - `/api/photo-frame`テストケース: 15-25分
    - テスト画像の配置
    - 期待値の定義（YAML形式）
    - アサーションの記述
- **CI/CD統合**: 30分
  - `.github/workflows/promptfoo.yml`作成
  - テスト実行の設定
  - レポート出力の設定

**事前準備・確認**（実装時間に含めない）:
- テスト用画像サンプル準備: 15-30分
  - 商品写真（値札あり/なし）
  - 人物写真（様々なサイズ）
- 動作確認・テスト: 30分-1時間
  - ローカルでのテスト実行
  - CI/CDでのテスト実行確認
  - レポートの確認

**合計**: **2-3時間**（コーディングのみ） + **45分-1.5時間**（事前準備・確認含む）

**注意事項**:
- 設計フェーズが重要（テストケース・評価指標の設計）
- テストケースの作成に時間がかかる（画像サンプル準備・期待値定義）
- 評価指標の設計が必要（JSON形式チェック・画像品質評価等）

---

## 📈 実装時間の合計

### 基本実装（最小構成）

| ツール | 実装時間（コーディング） | 事前準備・確認 | 優先度 |
|-------|----------------------|--------------|--------|
| **Helicone** | **5-10分** | 15-25分 | 🔴 高（コスト監視） |
| **Langfuse** | **30分-1時間** | 25-45分 | 🟡 中（観測・トレーシング） |
| **Promptfoo** | **2-3時間** | 45分-1.5時間 | 🟢 低（テスト・評価） |
| **合計** | **3-4時間** | **1.5-2.5時間** | |

**実装期間**: **0.5-1日**（コーディングのみの場合）

---

### 推奨実装順序

1. **Phase 1: Helicone導入**（5-10分 + 事前準備15-25分）
   - 最優先（コスト監視が重要）
   - 実装が最も簡単（5-10分で完了）
   - 即座にコスト可視化が可能

2. **Phase 2: Langfuse導入**（30分-1時間 + 事前準備25-45分）
   - 観測・トレーシング機能追加
   - Heliconeと併用可能
   - プロンプト・レスポンスの詳細分析が可能

3. **Phase 3: Promptfoo導入**（2-3時間 + 事前準備45分-1.5時間）
   - プロンプトテスト・評価機能追加
   - CI/CD統合で継続的な品質管理
   - プロンプト改善のサイクル構築

---

## 💰 コスト見積もり

### 月額コスト

| ツール | プラン | 月額コスト | 備考 |
|-------|--------|----------|------|
| **Helicone** | Growth | $50 | 検証環境・本番環境の両方 |
| **Langfuse** | Cloud Starter | $29 | またはセルフホスト（無料） |
| **Promptfoo** | オープンソース | $0 | セルフホスト（無料） |
| **合計** | | **$79/月** | |

**注意**: Langfuseはセルフホスト可能（無料、ただし運用コストあり）

---

## 🎯 実装の詳細内訳

### Helicone実装詳細

**実装ファイル**:
- `lib/openai.ts`（新規作成）
- `app/api/analyze-item/route.ts`（変更）
- `app/api/photo-frame/route.ts`（変更）

**実装コード例**:
```typescript
// lib/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://oai.helicone.ai/v1',
  defaultHeaders: {
    'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY}`,
    'Helicone-Property-Environment': process.env.NODE_ENV || 'development',
    'Helicone-Property-Project': 'fleapay-lite',
  },
});
```

**変更箇所**:
- `app/api/analyze-item/route.ts`: `import { openai } from '@/lib/openai'`
- `app/api/photo-frame/route.ts`: `import { openai } from '@/lib/openai'`

---

### Langfuse実装詳細

**実装ファイル**:
- `lib/langfuse.ts`（新規作成）
- `app/api/analyze-item/route.ts`（変更）
- `app/api/photo-frame/route.ts`（変更）

**設計フェーズの詳細**:

#### 1. トレーシングデータ構造の設計（5-10分）

**記録するメタデータ**:
- `trace`: リクエスト全体のトレース
  - `name`: APIエンドポイント名（`analyze-item`, `photo-frame`）
  - `userId`: ユーザーID（IPアドレスまたはセッションID）
  - `metadata`: 追加メタデータ（画像サイズ、ファイル名等）
- `generation`: LLM API呼び出しの詳細
  - `name`: モデル名（`gpt-4o`, `dall-e-2`）
  - `model`: モデル名
  - `input`: プロンプト・画像情報
  - `output`: レスポンス内容
  - `metadata`: トークン数、コスト等

**設計決定事項**:
- `/api/analyze-item`: 画像解析のトレーシング
  - プロンプトテキストの記録
  - JSONレスポンスの記録
  - エラー時の記録方法
- `/api/photo-frame`: 画像編集のトレーシング
  - プロンプトテキストの記録
  - 画像レスポンスの記録方法（base64 or URL）
  - エラー時の記録方法

#### 2. 実装コード例

```typescript
// lib/langfuse.ts
import { Langfuse } from 'langfuse';

export const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
});

// app/api/analyze-item/route.ts
import { langfuse } from '@/lib/langfuse';

const trace = langfuse.trace({
  name: 'analyze-item',
  userId: clientIp(request), // IPアドレス
  metadata: {
    imageSize: file.size,
    fileName: file.name,
  },
});

const generation = trace.generation({
  name: 'openai-chat-completion',
  model: 'gpt-4o',
  input: {
    prompt: '商品画像解析プロンプト...',
    imageSize: file.size,
  },
});

// OpenAI API呼び出し後
generation.end({
  output: response.choices[0]?.message?.content,
  metadata: {
    tokens: response.usage?.total_tokens,
  },
});

trace.update({
  output: { summary, total },
});
```

**変更箇所**:
- 各APIエンドポイントにトレーシングコード追加
- プロンプト・レスポンス・メタデータの記録
- エラーハンドリング時の記録

---

### Promptfoo実装詳細

**実装ファイル**:
- `promptfoo.yml`（新規作成）
- `.github/workflows/promptfoo.yml`（新規作成）
- `tests/promptfoo/`（テストケースディレクトリ）

**設計フェーズの詳細**:

#### 1. テストケース設計（30-45分）

**`/api/analyze-item`用テストケース設計**:
- **テスト画像の選定**: 5-10分
  - 値札ありの商品写真
  - 値札なしの商品写真
  - 複数商品の写真
  - 読みにくい値札の写真
- **期待値の定義**: 10-15分
  - JSON形式の確認
  - `summary`の品質評価（文字数、内容の妥当性）
  - `total`の数値チェック（0以上、整数）
- **エッジケースの定義**: 5分
  - 値札なしの場合（total = 0）
  - 複数商品の場合
  - 読みにくい値札の場合

**`/api/photo-frame`用テストケース設計**:
- **テスト画像の選定**: 5-10分
  - 人物写真（正面、横向き）
  - 風景写真
  - 小さい画像（512x512以下）
  - 大きい画像（2048x2048以上）
- **期待値の定義**: 10-15分
  - 画像形式の確認（PNG）
  - 画像サイズの確認（1024x1024）
  - 画像品質の評価（ファイルサイズ、解像度）
- **エッジケースの定義**: 5分
  - 小さい画像の場合
  - 大きい画像の場合
  - 不正な画像形式の場合

#### 2. 評価指標の設計（30-45分）

**`/api/analyze-item`評価指標**:
- **JSON形式チェック**: 5分
  - `summary`フィールドの存在確認
  - `total`フィールドの存在確認
  - JSON形式の妥当性確認
- **summaryの品質評価**: 10分
  - 文字数チェック（1-50文字）
  - 内容の妥当性（テンプレ文でないこと）
  - 日本語の確認
- **totalの数値チェック**: 5分
  - 数値型の確認
  - 0以上の確認
  - 整数の確認
- **エラーハンドリングの確認**: 5分
  - 不正な画像形式の場合
  - 画像なしの場合

**`/api/photo-frame`評価指標**:
- **画像形式チェック**: 5分
  - PNG形式の確認
  - ファイルサイズの確認
- **画像品質評価**: 15分
  - 解像度の確認（1024x1024）
  - ファイルサイズの確認（適切な範囲）
  - 画像の可視性確認（base64デコード可能）
- **エラーハンドリングの確認**: 5分
  - 不正な画像形式の場合
  - 画像なしの場合

#### 3. 実装コード例

```yaml
# promptfoo.yml
providers:
  - openai:gpt-4o
  - openai:dall-e-2

tests:
  # /api/analyze-item用テストケース
  - vars:
      image: ./tests/promptfoo/images/sample-product.jpg
    assert:
      - type: contains
        value: "summary"
      - type: contains
        value: "total"
      - type: javascript
        value: |
          const result = JSON.parse(output);
          assert(result.summary.length > 0);
          assert(result.summary.length <= 50);
          assert(typeof result.total === 'number');
          assert(result.total >= 0);
          assert(Number.isInteger(result.total));
  
  # /api/photo-frame用テストケース
  - vars:
      image: ./tests/promptfoo/images/sample-person.jpg
    assert:
      - type: javascript
        value: |
          // 画像がbase64形式で返されることを確認
          assert(output.startsWith('data:image/png;base64,'));
```

**変更箇所**:
- テストケース作成（画像サンプル・期待値定義）
- 評価指標の定義（YAML形式）
- CI/CD統合（GitHub Actions）

---

## ⚠️ 注意事項

### 1. ツール間の重複機能

**HeliconeとLangfuseの重複**:
- 両方ともLLM API呼び出しを記録
- Helicone: プロキシ経由（自動記録）
- Langfuse: SDK統合（手動記録）

**推奨**:
- Helicone: コスト監視・自動記録
- Langfuse: 詳細なトレーシング・評価・分析

**併用メリット**:
- Helicone: 全API呼び出しの自動記録（漏れなし）
- Langfuse: 詳細な分析・評価・セッション管理

---

### 2. 実装の複雑さ

**Helicone**: ⭐⭐（簡単）
- プロキシ設定のみ
- 既存コードへの影響最小

**Langfuse**: ⭐⭐⭐（中程度）
- SDK統合が必要
- 各APIエンドポイントへの追加が必要

**Promptfoo**: ⭐⭐⭐⭐（やや複雑）
- テストケース作成に時間がかかる
- 評価指標の設計が必要

---

### 3. 段階的実装の推奨

**推奨順序**:
1. **Helicone導入**（2-3時間）
   - 即座にコスト監視が可能
   - 実装が最も簡単

2. **Langfuse導入**（4-6時間）
   - 詳細な分析機能追加
   - Heliconeと併用可能

3. **Promptfoo導入**（6-8時間）
   - プロンプト品質管理
   - CI/CD統合で継続的改善

---

### 4. 実装順序による工数の影響

**結論**: **実装順序による工数の増減はほとんどありません**

**理由**:

#### Helicone実装後のLangfuse実装

**Helicone実装後の状態**:
- `lib/openai.ts`が既に存在
- 各APIエンドポイントが`lib/openai.ts`を使用

**Langfuse実装時の変更**:
- `lib/langfuse.ts`を新規作成（Helicone実装とは無関係）
- 各APIエンドポイントにトレーシングコードを追加（Helicone実装とは無関係）
- `lib/openai.ts`への変更は不要

**工数への影響**: **±0分**（影響なし）

**メリット**:
- コードが既に整理されている（`lib/openai.ts`が存在）
- Langfuseの実装時に、整理されたコードに対して追加するだけなので、実装が少し楽になる可能性がある

#### Promptfoo実装

**Helicone/Langfuse実装とは完全に独立**:
- Promptfooは設定ファイルベース（`promptfoo.yml`）
- コードへの変更は不要
- 実装順序による影響は一切ない

**工数への影響**: **±0分**（影響なし）

---

### 5. 実装順序の推奨理由

**Heliconeを先に実装するメリット**:
1. **即座にコスト可視化が可能**（5-10分で完了）
2. **コードの整理**（`lib/openai.ts`が作成される）
3. **リスクが低い**（実装が最も簡単）
4. **後続の実装への影響なし**（Langfuse/Promptfooの実装時間は変わらない）

**Langfuse + Promptfooを後で実装する場合**:
- 工数は変わらない（30分-1時間 + 2-3時間）
- 実装順序による追加工数は発生しない
- むしろ、コードが整理されているため、実装が少し楽になる可能性がある

---

## 📋 実装チェックリスト

### Helicone導入

- [ ] Heliconeアカウント作成
- [ ] API Key取得
- [ ] `lib/openai.ts`作成
- [ ] 既存コード変更（2箇所）
- [ ] 環境変数設定
- [ ] 動作確認・テスト

### Langfuse導入

- [ ] Langfuseアカウント作成（またはセルフホスト）
- [ ] SDKインストール
- [ ] `lib/langfuse.ts`作成
- [ ] 各APIエンドポイントにトレーシング追加（2箇所）
- [ ] 環境変数設定
- [ ] 動作確認・テスト

### Promptfoo導入

- [ ] Promptfooインストール
- [ ] `promptfoo.yml`設定ファイル作成
- [ ] テストケース作成（2つのAPI用）
- [ ] 評価指標の定義
- [ ] CI/CD統合
- [ ] 動作確認・テスト

---

## 🎯 まとめ

### 実装時間の合計

| 構成 | 実装時間（コーディング） | 事前準備・確認 | 期間 |
|------|----------------------|--------------|------|
| **Heliconeのみ** | **5-10分** | 15-25分 | 0.5時間 |
| **Helicone + Langfuse** | **35分-1時間10分** | 40分-1時間10分 | 1.5時間 |
| **Helicone + Langfuse + Promptfoo** | **3-4時間** | 1.5-2.5時間 | 0.5-1日 |

### 推奨実装計画

**Day 1**:
- 午前: Helicone導入（5-10分 + 事前準備15-25分 = 約30分）
- 午前: Langfuse導入（30分-1時間 + 事前準備25-45分 = 約1時間）
- 午後: Promptfoo導入（2-3時間 + 事前準備45分-1.5時間 = 約3-4時間）

**合計**: **1日**（段階的実装の場合）

**注意**: 
- Heliconeは非常に簡単なので、最初の30分で完了可能
- Langfuseも基本的な実装なら30分-1時間で完了可能
- Promptfooはテストケース作成に時間がかかるが、基本的な実装なら2-3時間で完了可能

---

**作成日**: 2026-01-03  
**次回更新**: 実装開始時

