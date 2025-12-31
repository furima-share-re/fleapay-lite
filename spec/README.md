# Specification（機械仕様）

このディレクトリには、**機械が読める仕様** を記載します。

## 定義

**Spec** とは：
- API 仕様（OpenAPI / Swagger）
- データベーススキーマ
- メッセージフォーマット
- インターフェース定義

## Truth との違い

| 項目 | Truth | Spec |
|------|-------|------|
| **内容** | 数値・条件・制約 | 構造・型・インターフェース |
| **例** | 「タイムアウトは5秒」 | 「timeout フィールドは integer 型」 |
| **変更の影響** | ビジネスロジック | データ構造・互換性 |

## Spec は正である

`spec/**` も `truth/**` と同様に **正（Source of Truth）** です。

### ✅ Spec に書くもの

- API エンドポイント
- リクエスト/レスポンス構造
- データベーステーブル定義
- 型定義

### ❌ Spec に書かないもの

- 数値（例：タイムアウト値） → `truth/**` へ
- 説明・背景 → `docs/**` へ
- 意思決定理由 → `adr/**` へ

## ファイル構成

### `openapi.yml`
API 仕様を OpenAPI 3.x 形式で記載します。

**含めるもの**:
- エンドポイント定義
- リクエスト/レスポンススキーマ
- 認証方式
- エラーコード

**含めないもの**:
- タイムアウト値 → `truth/infra/limits.yml`
- レート制限値 → `truth/infra/limits.yml`
- ビジネスロジック → `truth/business/`

## 正しい書き方の例

### ✅ 良い例（構造のみ）

```yaml
# spec/openapi.yml
paths:
  /api/posts:
    post:
      summary: "投稿作成"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                text:
                  type: string
                  description: "投稿本文"
                images:
                  type: array
                  items:
                    type: string
                    format: uri
```

### ❌ 悪い例（数値が含まれている）

```yaml
# spec/openapi.yml
paths:
  /api/posts:
    post:
      summary: "投稿作成"
      x-timeout: 5000  # ← これは truth/infra/limits.yml に書く
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                text:
                  type: string
                  minLength: 10      # ← これは truth/ugc/ugc_metrics.yml に書く
                  maxLength: 5000    # ← これは truth/ugc/ugc_metrics.yml に書く
```

### ✅ 正しい分離

```yaml
# spec/openapi.yml（構造のみ）
schema:
  type: object
  properties:
    text:
      type: string
      description: "投稿本文。制約は truth/ugc/ugc_metrics.yml 参照"

# truth/ugc/ugc_metrics.yml（数値）
post_constraints:
  text:
    min_length: 10
    max_length: 5000
```

## バージョニング

API 仕様はバージョン管理します。

```yaml
# spec/openapi.yml
openapi: 3.0.0
info:
  title: "Project API"
  version: "1.0.0"
```

破壊的変更を行う場合は：
1. ADR を作成
2. 移行計画を立てる
3. 段階的にロールアウト

## CI による検証

- **OpenAPI Validator** - 仕様の妥当性
- **Schema Consistency** - truth との整合性
- **Breaking Change Detection** - 破壊的変更の検知

## 参照

- 数値・条件: `truth/**`
- 説明・背景: `docs/**`
- 意思決定記録: `adr/**`

