# 手動でデータダンプする方法

`pg_dump` コマンドが見つからない場合の対処方法です。

## 🔧 解決方法

### オプション1: PostgreSQLクライアントツールをインストール

#### Windowsの場合

1. [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/) からインストーラーをダウンロード
2. インストール時に **Command Line Tools** を選択
3. インストール後、PowerShellを再起動

#### インストール確認

```powershell
# pg_dumpのバージョンを確認
pg_dump --version
```

### オプション2: Supabase SQL Editorで直接スキーマを実行

PostgreSQLクライアントツールがインストールできない場合、既存のスキーマ定義から直接SQLを作成できます。

#### 2.1 server.jsからスキーマを抽出

`server.js` の `initDb()` 関数にスキーマ定義が含まれています。これをSupabase SQL Editorで実行できます。

---

## 📝 推奨手順：server.jsからスキーマを抽出

### ステップ1: server.jsのスキーマ部分を確認

`server.js` の `initDb()` 関数（235行目あたり）にスキーマ定義があります。

### ステップ2: Supabase用に調整

1. `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` を削除（Supabaseでは既に有効）
2. `IF NOT EXISTS` はそのまま使用可能
3. Supabase SQL Editorで実行

### ステップ3: Supabase SQL Editorで実行

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. プロジェクト `edo ichiba staging` を選択
3. **SQL Editor** を開く
4. **New query** をクリック
5. スキーマSQLをコピー＆ペースト
6. **Run** をクリック

---

## 🔄 代替方法：Render Dashboardから直接エクスポート

Render Dashboardから直接データベースをエクスポートする方法：

1. Render Dashboardにログイン
2. データベース `fleapay-lite-db` を選択
3. **Backups** タブを開く
4. **Create Backup** をクリック
5. バックアップが完了したらダウンロード

**注意**: この方法はデータも含みます。スキーマのみが必要な場合は、上記の方法を使用してください。

---

## 📋 次のステップ

スキーマの移行が完了したら：

1. **データの移行**（必要に応じて）
2. **Prisma設定の更新**（`npx prisma db pull`）
3. **動作確認**

---

## 🔗 関連リンク

- **PostgreSQLダウンロード**: https://www.postgresql.org/download/windows/
- **Supabase SQL Editor**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/sql/new

