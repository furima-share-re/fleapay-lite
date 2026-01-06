# Vercel環境変数名不一致の修正ガイド

**作成日**: 2026-01-06  
**問題**: Vercelに設定されている環境変数名がコードベースと一致していない

---

## 🔴 問題の詳細

### コードベースで使用されている環境変数名

`app/api/pending/start/route.ts` で使用されている環境変数：

```typescript
const AWS_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;
```

**コードが探している環境変数名**:
- ✅ `AWS_S3_BUCKET`
- ✅ `AWS_ACCESS_KEY` または `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_KEY` または `AWS_SECRET_ACCESS_KEY`

### Vercelに設定されている環境変数名（画像から確認）

**実際に設定されている環境変数名**:
- ❌ `AWS_ACCESS_KEY_1` （`_1` サフィックスが付いている）
- ❌ `AWS_S3_BUCKET_1` （`_1` サフィックスが付いている）
- ❌ `AWS_SECRET_KEY_1` （`_1` サフィックスが付いている）

---

## ⚠️ 影響

この不一致により、**AWS S3機能が動作しません**：

1. **S3アップロード機能が無効化される**
   - `app/api/pending/start/route.ts` の画像アップロード機能が動作しない
   - `HAS_S3_CONFIG` が `false` になる

2. **エラーログ**
   - コードは `AWS_S3_BUCKET` を探すが、`AWS_S3_BUCKET_1` しか存在しない
   - 結果として `AWS_BUCKET` が `undefined` になり、S3クライアントが初期化されない

---

## ✅ 修正方法

### 方法1: 環境変数名を修正（推奨）

Vercel Dashboardで環境変数名を修正します。

#### ステップ1: 現在の値をメモ

1. Vercel Dashboard > Settings > Environment Variables を開く
2. 以下の環境変数の値をコピーしてメモ：
   - `AWS_ACCESS_KEY_1` の値
   - `AWS_S3_BUCKET_1` の値
   - `AWS_SECRET_KEY_1` の値

#### ステップ2: 古い環境変数を削除

1. `AWS_ACCESS_KEY_1` を削除
2. `AWS_S3_BUCKET_1` を削除
3. `AWS_SECRET_KEY_1` を削除

#### ステップ3: 正しい名前で環境変数を追加

以下の環境変数を追加します：

| Key | Value | Environment |
|-----|-------|-------------|
| `AWS_ACCESS_KEY` | （ステップ1でメモした値） | All Environments |
| `AWS_S3_BUCKET` | （ステップ1でメモした値） | All Environments |
| `AWS_SECRET_KEY` | （ステップ1でメモした値） | All Environments |

**注意**: 
- `AWS_ACCESS_KEY_ID` や `AWS_SECRET_ACCESS_KEY` も有効です（コードでフォールバックとして使用されます）
- ただし、`AWS_ACCESS_KEY` と `AWS_SECRET_KEY` を推奨します

---

### 方法2: コードを修正（非推奨）

コードを修正して `_1` サフィックス付きの環境変数名にも対応させる方法もありますが、**推奨しません**。

理由：
- 環境変数名の一貫性が失われる
- 他の環境（開発環境など）でも問題が発生する可能性
- 標準的な命名規則に従わなくなる

---

## 🔍 確認方法

修正後、以下の方法で確認できます：

### 1. 環境変数の確認

Vercel Dashboardで、以下の環境変数が設定されていることを確認：
- ✅ `AWS_S3_BUCKET` （`_1` サフィックスなし）
- ✅ `AWS_ACCESS_KEY` または `AWS_ACCESS_KEY_ID` （`_1` サフィックスなし）
- ✅ `AWS_SECRET_KEY` または `AWS_SECRET_ACCESS_KEY` （`_1` サフィックスなし）

### 2. デプロイ後の動作確認

1. 新しいデプロイメントをトリガー
2. `/api/pending/start` エンドポイントで画像アップロードをテスト
3. S3へのアップロードが成功することを確認

### 3. ログでの確認

Vercel Dashboard > Logs で、以下のログが表示されないことを確認：
- ❌ `S3 configuration missing` のようなエラー
- ✅ S3アップロードが成功しているログ

---

## 📋 チェックリスト

修正作業のチェックリスト：

- [ ] `AWS_ACCESS_KEY_1` の値をメモ
- [ ] `AWS_S3_BUCKET_1` の値をメモ
- [ ] `AWS_SECRET_KEY_1` の値をメモ
- [ ] `AWS_ACCESS_KEY_1` を削除
- [ ] `AWS_S3_BUCKET_1` を削除
- [ ] `AWS_SECRET_KEY_1` を削除
- [ ] `AWS_ACCESS_KEY` を追加（メモした値を使用）
- [ ] `AWS_S3_BUCKET` を追加（メモした値を使用）
- [ ] `AWS_SECRET_KEY` を追加（メモした値を使用）
- [ ] 新しいデプロイメントをトリガー
- [ ] S3機能が正常に動作することを確認

---

## 🚨 注意事項

1. **環境変数の削除と追加の順序**
   - 先に新しい環境変数を追加してから、古い環境変数を削除することも可能です
   - ただし、値のコピーを忘れないように注意してください

2. **デプロイメントのタイミング**
   - 環境変数を変更した後、新しいデプロイメントが必要です
   - Vercelは自動的に再デプロイをトリガーします

3. **他の環境変数**
   - `AWS_REGION` も設定されていることを確認してください
   - これがないと、S3クライアントが正常に初期化されません

---

## 📚 参考

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- `app/api/pending/start/route.ts` - S3環境変数の使用箇所
- `VERCEL_AWS_ENV_VAR_FIX.md` - 以前の修正ガイド

---

**最終更新**: 2026-01-06  
**ステータス**: 🔴 **要修正** - 環境変数名の不一致を修正する必要があります

