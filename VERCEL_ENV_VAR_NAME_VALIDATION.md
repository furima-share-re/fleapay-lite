# Vercel環境変数名 バリデーションエラー修正ガイド

**作成日**: 2026-01-06  
**エラー**: 「名前に無効な文字が含まれています。使用できるのは文字、数字、アンダースコアのみです。また、名前の先頭に数字は使用できません。」

---

## 🔴 エラーの原因

Vercelの環境変数名には以下の規則があります：

### 使用可能な文字
- ✅ 英字（A-Z, a-z）
- ✅ 数字（0-9）
- ✅ アンダースコア（`_`）

### 使用できない文字
- ❌ ハイフン（`-`）
- ❌ その他の特殊文字（`@`, `#`, `$`, `%`, `&`, `*`, など）
- ❌ 先頭に数字（例: `1DATABASE_URL`）

---

## ✅ 解決方法

### ステップ1: 環境変数名の確認

Vercel Dashboardで、すべての環境変数名を確認してください。

**確認方法**:
1. Vercel Dashboardでプロジェクトを開く
2. **Settings** > **Environment Variables** を開く
3. 各環境変数名を確認

### ステップ2: 問題のある環境変数名を特定

以下のパターンに該当する環境変数名がないか確認：

#### パターン1: ハイフン（`-`）を含む
- ❌ `NEXT-PUBLIC-SUPABASE-URL` （間違い）
- ✅ `NEXT_PUBLIC_SUPABASE_URL` （正しい）

#### パターン2: 数字で始まる
- ❌ `2DATABASE_URL`
- ✅ `DATABASE_URL_2` （必要に応じて）

#### パターン3: 特殊文字を含む
- ❌ `DATABASE_URL@PROD`
- ✅ `DATABASE_URL_PROD`

### ステップ3: 環境変数名の修正

問題のある環境変数名を見つけたら、以下の手順で修正：

1. **古い環境変数を削除**
   - 環境変数の値をメモしておく
   - 削除ボタンをクリック

2. **新しい環境変数を追加**
   - **Key**: 正しい形式の名前（ハイフンをアンダースコアに変更など）
   - **Value**: メモしておいた値を貼り付け
   - **Environment**: 適切な環境を選択

---

## 📋 現在のプロジェクトで使用されている環境変数名（確認済み）

### ✅ 正しい形式の環境変数名

以下の環境変数名は正しい形式です：

| 環境変数名 | 形式 | 状態 |
|-----------|------|------|
| `DATABASE_URL` | ✅ 正しい | 問題なし |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ 正しい | 問題なし |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ 正しい | 問題なし |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ 正しい | 問題なし |
| `STRIPE_SECRET_KEY` | ✅ 正しい | 問題なし |
| `STRIPE_PUBLISHABLE_KEY` | ✅ 正しい | 問題なし |
| `STRIPE_WEBHOOK_SECRET` | ✅ 正しい | 問題なし |
| `APP_BASE_URL` | ✅ 正しい | 問題なし |
| `NODE_ENV` | ✅ 正しい | 問題なし |
| `ADMIN_TOKEN` | ✅ 正しい | 問題なし |
| `AWS_REGION` | ✅ 正しい | 問題なし |
| `AWS_ACCESS_KEY` | ✅ 正しい | 問題なし |
| `AWS_SECRET_KEY` | ✅ 正しい | 問題なし |
| `AWS_S3_BUCKET` | ✅ 正しい | 問題なし |
| `EBAY_CLIENT_ID` | ✅ 正しい | 問題なし |
| `EBAY_CLIENT_SECRET` | ✅ 正しい | 問題なし |
| `EBAY_ENV` | ✅ 正しい | 問題なし |
| `EBAY_SOURCE_MODE` | ✅ 正しい | 問題なし |
| `HELICONE_API_KEY` | ✅ 正しい | 問題なし |
| `OPENAI_API_KEY` | ✅ 正しい | 問題なし |
| `OPENAI_PROMPT` | ✅ 正しい | 問題なし |
| `OPENAI_PROMPT_PHOTO_FRAME` | ✅ 正しい | 問題なし |
| `PENDING_TTL_MIN` | ✅ 正しい | 問題なし |
| `SELLER_API_TOKEN` | ✅ 正しい | 問題なし |
| `WORLD_PRICE_DEBUG` | ✅ 正しい | 問題なし |
| `ADMIN_BOOTSTRAP_SQL_ENABLED` | ✅ 正しい | 問題なし |

---

## 🔍 よくある間違い

### 間違い1: ハイフンを使用

```env
# ❌ 間違い
NEXT-PUBLIC-SUPABASE-URL=https://...

# ✅ 正しい
NEXT_PUBLIC_SUPABASE_URL=https://...
```

### 間違い2: 数字で始まる

```env
# ❌ 間違い
2DATABASE_URL=postgresql://...

# ✅ 正しい
DATABASE_URL_2=postgresql://...
```

### 間違い3: 特殊文字を含む

```env
# ❌ 間違い
DATABASE_URL@PROD=postgresql://...

# ✅ 正しい
DATABASE_URL_PROD=postgresql://...
```

---

## 🔧 修正手順

### ステップ1: 問題のある環境変数を特定

Vercel Dashboardで、すべての環境変数名を確認し、以下の条件に該当するものがないか確認：

1. ハイフン（`-`）を含む
2. 数字で始まる
3. 特殊文字を含む

### ステップ2: 環境変数の値をバックアップ

問題のある環境変数の値をメモまたはコピーしておきます。

### ステップ3: 古い環境変数を削除

問題のある環境変数を削除します。

### ステップ4: 新しい環境変数を追加

正しい形式の名前で環境変数を再追加します。

**例**:
- 古い名前: `NEXT-PUBLIC-SUPABASE-URL`
- 新しい名前: `NEXT_PUBLIC_SUPABASE_URL`

### ステップ5: コードの確認（必要に応じて）

環境変数名を変更した場合、コード内でその環境変数を参照している箇所も更新する必要があります。

**確認方法**:
```bash
# プロジェクトルートで実行
grep -r "NEXT-PUBLIC-SUPABASE-URL" .
```

結果が返ってきた場合、コードも更新する必要があります。

---

## ⚠️ 注意事項

1. **`NEXT_PUBLIC_*` プレフィックス**: Next.jsでは、フロントエンドで使用する環境変数は `NEXT_PUBLIC_` で始める必要があります。これは変更しないでください。

2. **環境変数の値**: 環境変数名を変更しても、値は変更する必要はありません。

3. **コードの更新**: 環境変数名を変更した場合、コード内でその環境変数を参照している箇所も更新する必要があります。

---

## 📚 参考

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

**最終更新**: 2026-01-06

