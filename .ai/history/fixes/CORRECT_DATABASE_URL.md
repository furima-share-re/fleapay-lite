# 正しいDATABASE_URLの設定

**更新日**: 2026-01-02

---

## ❌ 現在の接続文字列（間違い）

```
DATABASE_URL="postgresql://fleapay_prod_db_user:FoitIIxnvLQY0GXU2jCwu2cfGq3Q3h6M@dpg-d4bj8re3jp1c73bjaph0-a/fleapay_prod_db"
```

**問題点**:
1. ❌ 古いRender PostgreSQLを指している（`dpg-d4bj8re3jp1c73bjaph0-a`）
2. ❌ ポート番号が含まれていない（`:5432`が必要）
3. ❌ Supabase接続文字列ではない

---

## ✅ 正しいSupabase接続文字列

### 検証環境（staging）用

#### 形式1: 直接接続（推奨）

```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

**重要**: `[YOUR-PASSWORD]` をSupabaseプロジェクト作成時に設定したデータベースパスワードに置き換えてください。

#### 形式2: Connection Pooling（高負荷時）

```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**重要**: 
- `[YOUR-PASSWORD]` をプロジェクト作成時に設定したデータベースパスワードに置き換えてください
- リージョン（`ap-northeast-1`）はプロジェクトのリージョンに合わせてください

---

## 🔍 接続文字列の確認方法

### Supabase Dashboardから取得

1. **Supabase Dashboard**にログイン
2. プロジェクト `edo ichiba staging` を選択
3. **Settings** → **Database** を開く
4. **Connection string** セクションを確認
5. **URI** タブを選択
6. 接続文字列をコピー

**確認ポイント**:
- ✅ `postgresql://` で始まる
- ✅ ポート番号（`:5432` または `:6543`）が含まれている
- ✅ ホスト名が `db.mluvjdhqgfpcfsmvjae.supabase.co` または `aws-0-*.pooler.supabase.com` である
- ✅ パスワードが正しく設定されている

---

## 📋 接続文字列の比較

| 項目 | 現在の値（間違い） | 正しい値（Supabase） |
|------|------------------|---------------------|
| **プロトコル** | `postgresql://` | `postgresql://` ✅ |
| **ユーザー名** | `fleapay_prod_db_user` | `postgres` ✅ |
| **パスワード** | `FoitIIxnvLQY0GXU2jCwu2cfGq3Q3h6M` | `[YOUR-PASSWORD]` ⚠️ |
| **ホスト名** | `dpg-d4bj8re3jp1c73bjaph0-a` ❌ | `db.mluvjdhqgfpcfsmvjae.supabase.co` ✅ |
| **ポート** | なし ❌ | `:5432` または `:6543` ✅ |
| **データベース名** | `fleapay_prod_db` | `postgres` ✅ |

---

## 🔧 Render環境変数の設定

### ステップ1: Render Dashboardで更新

1. **Render Dashboard**にログイン
2. `fleapay-lite-t1` サービスを選択
3. **Environment** タブを開く
4. `DATABASE_URL` 環境変数を編集

### ステップ2: Supabase接続文字列を貼り付け

**形式1（直接接続）**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

**形式2（Connection Pooling）**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**重要**: 
- `[YOUR-PASSWORD]` をSupabaseプロジェクト作成時に設定したデータベースパスワードに置き換えてください
- Supabase Dashboardから接続文字列をコピーすることを推奨します（手動で編集しない）

5. **Save** をクリック

---

## ✅ 確認ポイント

### 接続文字列の形式

- [ ] `postgresql://` で始まる
- [ ] ポート番号（`:5432` または `:6543`）が含まれている
- [ ] ホスト名がSupabaseのホスト名である（`db.mluvjdhqgfpcfsmvjae.supabase.co` または `aws-0-*.pooler.supabase.com`）
- [ ] パスワードが正しく設定されている

### Supabase接続文字列の特徴

- ✅ ユーザー名: `postgres` または `postgres.mluvjdhqgfpcfsmvjae`
- ✅ ホスト名: `db.mluvjdhqgfpcfsmvjae.supabase.co` または `aws-0-*.pooler.supabase.com`
- ✅ ポート: `5432`（直接接続）または `6543`（Connection Pooling）
- ✅ データベース名: `postgres`

---

## 🔗 関連ドキュメント

- [SUPABASE_CONNECTION_INFO.md](./SUPABASE_CONNECTION_INFO.md) - Supabase接続情報取得方法
- [FIX_SUPABASE_CONNECTION_ERROR.md](./FIX_SUPABASE_CONNECTION_ERROR.md) - 接続エラーの修正
- [RENDER_STAGING_SETUP_STEPS.md](./RENDER_STAGING_SETUP_STEPS.md) - Render環境変数設定手順

