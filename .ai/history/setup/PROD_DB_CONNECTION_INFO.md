# 本番データベース（fleapay-prod-db）接続情報

**更新日**: 2026-01-01  
**データソース**: Render Dashboard

---

## 📋 データベース情報

### 基本情報

- **データベース名**: `fleapay-prod-db`
- **インスタンスID**: `dpg-d4bj8re3jp1c73bjaph0-a`
- **環境**: Production

### リソース制限

- **メモリ**: 0.25 GB limit
- **CPU**: 0.1 CPU limit
- **ディスク**: 15 GB limit
- **接続数**: 100 limit

### 現在の状態

- **テーブル**: No tables yet（テーブルがまだ作成されていない）
- **インデックス**: No indexes yet
- **プロセス**: No data yet
- **クエリ**: No queries yet

**重要**: 本番データベースにはまだテーブルが存在しないようです。スキーマ移行が必要です。

---

## 🔑 接続情報

### 接続文字列（推定）

以前の会話で確認した接続文字列：

```
postgresql://fleapay_prod_db_user:FoitIIxnvLQY0GXU2jCwu2cfGq3Q3h6M@dpg-d4bj8re3jp1c73bjaph0-a:5432/fleapay_prod_db
```

### 接続情報の確認方法

1. **Render Dashboard**にログイン
2. `fleapay-prod-db` データベースを選択
3. **Info** タブを開く
4. **Internal Database URL** または **External Database URL** を確認

---

## 📊 データ移行の状況

### 現在の状態

- ✅ データベースは作成済み
- ❌ スキーマがまだ移行されていない（テーブルが存在しない）
- ❌ データがまだ移行されていない

### 次のステップ

1. **スキーマ移行**（Supabase SQL Editorで実行）
   - `supabase_schema.sql` の内容をSupabase SQL Editorで実行
   - または、`server.js` の `initDb()` 関数からスキーマを抽出して実行

2. **データ移行**（オプション）
   - 検証環境のデータを移行する場合
   - または、本番環境のデータを移行する場合

---

## 🚀 データ移行の手順

### オプション1: 検証環境のデータを使用（推奨）

検証環境（`fleapay-lite-t1`）のデータを本番Supabaseに移行：

1. **検証環境のデータをダンプ**
   ```powershell
   # 検証環境の接続文字列を使用
   node scripts/migrate-data-nodejs.js dump "postgresql://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db" "./dump-staging"
   ```

2. **本番Supabaseにインポート**
   ```powershell
   # 本番Supabaseの接続文字列を使用
   node scripts/migrate-data-nodejs.js import "postgresql://postgres:[PROD-PASSWORD]@db.[PROD-PROJECT-REF].supabase.co:5432/postgres" "./dump-staging"
   ```

### オプション2: 本番環境のデータを使用

本番環境（`fleapay-prod-db`）のデータをSupabaseに移行：

1. **本番環境のデータをダンプ**
   ```powershell
   # 本番環境の接続文字列を使用
   node scripts/migrate-data-nodejs.js dump "postgresql://fleapay_prod_db_user:FoitIIxnvLQY0GXU2jCwu2cfGq3Q3h6M@dpg-d4bj8re3jp1c73bjaph0-a:5432/fleapay_prod_db" "./dump-prod"
   ```

2. **Supabaseにインポート**
   ```powershell
   # Supabaseの接続文字列を使用
   node scripts/migrate-data-nodejs.js import "postgresql://postgres:[PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres" "./dump-prod"
   ```

**注意**: 本番環境のデータベースにはまだテーブルが存在しないため、まずスキーマ移行が必要です。

---

## ⚠️ 重要な注意事項

1. **スキーマ移行が先**
   - 本番データベースにはまだテーブルが存在しないため、まずスキーマ移行が必要です
   - Supabase SQL Editorで `supabase_schema.sql` を実行してください

2. **データソースの選択**
   - 検証環境のデータ: テストデータで軽量
   - 本番環境のデータ: 実データに近いが、現在テーブルが存在しない

3. **接続文字列の確認**
   - Render Dashboardから実際の接続文字列を確認してください
   - パスワードやホスト名が正しいか確認してください

---

## 🔗 関連リンク

- **Render Dashboard**: https://dashboard.render.com/d/dpg-d4bj8re3jp1c73bjaph0-a/metrics
- **Supabase Dashboard**: https://app.supabase.com
- **データ移行ガイド**: [DATA_MIGRATION_WITHOUT_LOCAL.md](./DATA_MIGRATION_WITHOUT_LOCAL.md)

---

## 📝 チェックリスト

### スキーマ移行

- [ ] Supabase SQL Editorで `supabase_schema.sql` を実行
- [ ] テーブルが作成されたことを確認
- [ ] インデックスが作成されたことを確認

### データ移行

- [ ] データソースを選択（検証環境 or 本番環境）
- [ ] データをダンプ（CSV形式）
- [ ] Supabaseにインポート
- [ ] データ整合性を確認

