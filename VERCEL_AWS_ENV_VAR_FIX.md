# Vercel AWS環境変数名修正ガイド

**作成日**: 2026-01-06  
**問題**: 環境変数名に `_1` が付いているため、コードで参照できない

---

## 🔴 問題の原因

Vercel Dashboardに以下の環境変数名で設定されていますが、コードでは `_1` なしの名前を参照しています：

| Vercel Dashboard | コードでの参照 | 状態 |
|-----------------|--------------|------|
| `AWS_ACCESS_KEY_1` | `AWS_ACCESS_KEY` | ❌ 不一致 |
| `AWS_S3_BUCKET_1` | `AWS_S3_BUCKET` | ❌ 不一致 |
| `AWS_SECRET_KEY_1` | `AWS_SECRET_KEY` | ❌ 不一致 |

---

## ✅ 解決方法

### 方法1: 環境変数名を修正（推奨）

Vercel Dashboardで環境変数名を `_1` なしに変更します。

#### ステップ1: 環境変数の値をバックアップ

1. Vercel Dashboardでプロジェクトを開く
2. **Settings** > **Environment Variables** を開く
3. 以下の環境変数の値をメモまたはコピー：
   - `AWS_ACCESS_KEY_1` の値
   - `AWS_S3_BUCKET_1` の値
   - `AWS_SECRET_KEY_1` の値

#### ステップ2: 古い環境変数を削除

以下の環境変数を削除：
- `AWS_ACCESS_KEY_1`
- `AWS_S3_BUCKET_1`
- `AWS_SECRET_KEY_1`

#### ステップ3: 新しい環境変数を追加

正しい名前で環境変数を追加：

| 環境変数名 | 値 | 環境 |
|-----------|-----|------|
| `AWS_ACCESS_KEY` | （ステップ1でメモした値） | Production, Preview, Development |
| `AWS_S3_BUCKET` | （ステップ1でメモした値） | Production, Preview, Development |
| `AWS_SECRET_KEY` | （ステップ1でメモした値） | Production, Preview, Development |

---

## 📋 コードでの使用箇所

### `app/api/pending/start/route.ts`

```typescript
const AWS_REGION = process.env.AWS_REGION;
const AWS_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;
```

**注意**: コードでは以下の順序で環境変数を参照します：
1. `AWS_ACCESS_KEY` → 見つからない場合 → `AWS_ACCESS_KEY_ID`
2. `AWS_SECRET_KEY` → 見つからない場合 → `AWS_SECRET_ACCESS_KEY`

---

## 🔍 確認方法

環境変数を修正した後、以下の方法で確認できます：

### 方法1: デプロイログで確認

1. Vercel Dashboardで **Deployments** を開く
2. 最新のデプロイを選択
3. **Build Logs** を確認
4. エラーが解消されているか確認

### 方法2: アプリケーションで確認

S3アップロード機能を使用して、正常に動作するか確認します。

---

## ⚠️ 注意事項

1. **環境変数の値**: 環境変数名を変更しても、値は変更する必要はありません。

2. **環境の選択**: 環境変数を追加する際は、適切な環境（Production, Preview, Development）を選択してください。

3. **既存の環境変数**: もし `AWS_ACCESS_KEY_ID` や `AWS_SECRET_ACCESS_KEY` が既に設定されている場合、それらも有効です（コードでフォールバックとして使用されます）。

---

## 📚 参考

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [AWS SDK for JavaScript v3 - S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)

---

**最終更新**: 2026-01-06

