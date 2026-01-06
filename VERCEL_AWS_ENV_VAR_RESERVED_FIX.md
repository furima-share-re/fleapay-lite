# Vercel予約環境変数名の回避方法

**作成日**: 2026-01-06  
**問題**: `AWS_ACCESS_KEY`、`AWS_S3_BUCKET`、`AWS_SECRET_KEY` がVercelで予約されているため使用できない

---

## 🔴 問題の詳細

Vercelでは以下の環境変数名が予約されているため、使用できません：
- ❌ `AWS_ACCESS_KEY`
- ❌ `AWS_S3_BUCKET`
- ❌ `AWS_SECRET_KEY`

現在Vercelに設定されている環境変数：
- `AWS_ACCESS_KEY_1`
- `AWS_S3_BUCKET_1`
- `AWS_SECRET_KEY_1`

---

## ✅ 解決方法

### 方法1: コードのフォールバック機能を活用（推奨）

コードには既にフォールバック機能が実装されています。標準的なAWS環境変数名を使用します。

#### ステップ1: 環境変数の値をメモ

1. Vercel Dashboardで以下の環境変数の値をコピー：
   - `AWS_ACCESS_KEY_1` の値
   - `AWS_S3_BUCKET_1` の値
   - `AWS_SECRET_KEY_1` の値

#### ステップ2: 標準的なAWS環境変数名で追加

以下の環境変数を追加します：

| Key | Value | Environment |
|-----|-------|-------------|
| `AWS_ACCESS_KEY_ID` | （メモした `AWS_ACCESS_KEY_1` の値） | All Environments |
| `AWS_SECRET_ACCESS_KEY` | （メモした `AWS_SECRET_KEY_1` の値） | All Environments |
| `AWS_S3_BUCKET_NAME` | （メモした `AWS_S3_BUCKET_1` の値） | All Environments |

**注意**: `AWS_S3_BUCKET` は予約されているため、`AWS_S3_BUCKET_NAME` を使用します。

#### ステップ3: コードを修正

`app/api/pending/start/route.ts` を修正して、新しい環境変数名に対応させます：

```typescript
// 修正前
const AWS_BUCKET = process.env.AWS_S3_BUCKET;

// 修正後
const AWS_BUCKET = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
```

**注意**: `AWS_ACCESS_KEY_ID` と `AWS_SECRET_ACCESS_KEY` は既にコードでフォールバックとして対応済みです。

---

### 方法2: `_1` サフィックス付きの環境変数名に対応（代替案）

コードを修正して、`_1` サフィックス付きの環境変数名にも対応させます。

#### コードの修正

`app/api/pending/start/route.ts` を修正：

```typescript
// 修正前
const AWS_REGION = process.env.AWS_REGION;
const AWS_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;

// 修正後
const AWS_REGION = process.env.AWS_REGION;
const AWS_BUCKET = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_1;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_1;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY_1;
```

この方法では、Vercelの環境変数名を変更する必要がありません。

---

## 📊 推奨方法の比較

| 方法 | メリット | デメリット | 推奨度 |
|------|---------|-----------|--------|
| **方法1: 標準的なAWS環境変数名** | ✅ 標準的な命名規則に従う<br>✅ 他の環境でも使用可能<br>✅ コードの可読性が高い | ⚠️ コードの修正が必要（`AWS_S3_BUCKET_NAME`） | ⭐⭐⭐⭐⭐ |
| **方法2: `_1` サフィックス対応** | ✅ Vercelの環境変数を変更不要<br>✅ すぐに動作する | ❌ 非標準的な命名規則<br>❌ 他の環境で問題が発生する可能性 | ⭐⭐⭐ |

---

## 🔧 実装手順（方法1: 推奨）

### Step 1: コードの修正

`app/api/pending/start/route.ts` を修正：

```typescript
// S3クライアントの初期化
const AWS_REGION = process.env.AWS_REGION;
const AWS_BUCKET = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET; // 修正: AWS_S3_BUCKET_NAME を追加
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID; // 既に対応済み
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY; // 既に対応済み
const HAS_S3_CONFIG = !!(AWS_REGION && AWS_BUCKET && AWS_ACCESS_KEY && AWS_SECRET_KEY);
```

### Step 2: Vercelで環境変数を追加

1. Vercel Dashboard > Settings > Environment Variables を開く
2. 以下の環境変数を追加：
   - `AWS_ACCESS_KEY_ID` = （`AWS_ACCESS_KEY_1` の値）
   - `AWS_SECRET_ACCESS_KEY` = （`AWS_SECRET_KEY_1` の値）
   - `AWS_S3_BUCKET_NAME` = （`AWS_S3_BUCKET_1` の値）

### Step 3: 動作確認

1. 新しいデプロイメントをトリガー
2. S3アップロード機能をテスト
3. 正常に動作することを確認

---

## 🔍 確認方法

修正後、以下の方法で確認できます：

### 1. 環境変数の確認

Vercel Dashboardで、以下の環境変数が設定されていることを確認：
- ✅ `AWS_ACCESS_KEY_ID` （`AWS_ACCESS_KEY_1` の代わり）
- ✅ `AWS_SECRET_ACCESS_KEY` （`AWS_SECRET_KEY_1` の代わり）
- ✅ `AWS_S3_BUCKET_NAME` （`AWS_S3_BUCKET_1` の代わり）
- ✅ `AWS_REGION` （既に設定済み）

### 2. デプロイ後の動作確認

1. `/api/pending/start` エンドポイントで画像アップロードをテスト
2. S3へのアップロードが成功することを確認
3. ログでエラーが発生していないことを確認

---

## 📋 チェックリスト

- [ ] `AWS_ACCESS_KEY_1` の値をメモ
- [ ] `AWS_S3_BUCKET_1` の値をメモ
- [ ] `AWS_SECRET_KEY_1` の値をメモ
- [ ] `app/api/pending/start/route.ts` を修正（`AWS_S3_BUCKET_NAME` に対応）
- [ ] `AWS_ACCESS_KEY_ID` を追加（メモした値を使用）
- [ ] `AWS_SECRET_ACCESS_KEY` を追加（メモした値を使用）
- [ ] `AWS_S3_BUCKET_NAME` を追加（メモした値を使用）
- [ ] 新しいデプロイメントをトリガー
- [ ] S3機能が正常に動作することを確認

---

## ⚠️ 注意事項

1. **環境変数の削除**
   - `AWS_ACCESS_KEY_1`、`AWS_S3_BUCKET_1`、`AWS_SECRET_KEY_1` は削除しても構いませんが、動作確認後に削除することを推奨します

2. **他の環境への影響**
   - 開発環境やステージング環境でも同じ環境変数名を使用する必要があります

3. **コードの互換性**
   - 修正後も、既存の環境変数名（`AWS_S3_BUCKET`）にも対応しているため、他の環境への影響は最小限です

---

## 📚 参考

- [AWS SDK for JavaScript v3 - Environment Variables](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-credentials-from-environment-variables.html)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- `app/api/pending/start/route.ts` - S3環境変数の使用箇所

---

**最終更新**: 2026-01-06  
**ステータス**: ✅ **解決方法確定** - 方法1（標準的なAWS環境変数名）を推奨

