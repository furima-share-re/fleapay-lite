# DB移行スクリプト

検証環境のデータベースをRender PostgreSQLからSupabaseに移行するためのスクリプト集です。

## 📋 前提条件

1. PostgreSQLクライアントツールがインストールされていること
   - `pg_dump`: スキーマ・データのダンプ用
   - `psql`: データベース接続・クエリ実行用

2. 必要な接続情報
   - Render PostgreSQLの接続文字列（External Database URL）
   - Supabaseの接続文字列（Database URL）

## 📚 詳細ガイド

詳細な手順は [`migrate-to-supabase.md`](./migrate-to-supabase.md) を参照してください。

## 🚀 クイックスタート

### PowerShell (Windows)

#### 1. Render DBからスキーマ・データをダンプ

```powershell
.\scripts\dump-render-db.ps1 `
  -RenderDatabaseUrl "postgres://user:pass@host:5432/db" `
  -OutputDir "./dump"
```

#### 2. Supabaseにデータをインポート

```powershell
.\scripts\import-to-supabase.ps1 `
  -SupabaseDatabaseUrl "postgresql://postgres:pass@db.project.supabase.co:5432/postgres" `
  -DataDir "./dump"
```

#### 3. データ整合性をチェック

```powershell
.\scripts\verify-migration.ps1 `
  -SourceUrl "postgres://user:pass@host:5432/db" `
  -TargetUrl "postgresql://postgres:pass@db.project.supabase.co:5432/postgres"
```

### Bash (Git Bash / WSL / Linux / macOS)

#### 1. Render DBからスキーマ・データをダンプ

```bash
./scripts/dump-render-db.sh \
  "postgres://user:pass@host:5432/db" \
  "./dump"
```

#### 2. Supabaseにデータをインポート

```bash
./scripts/import-to-supabase.sh \
  "postgresql://postgres:pass@db.project.supabase.co:5432/postgres" \
  "./dump"
```

## 📝 手順の概要

1. **Supabaseプロジェクト作成**
   - Supabase Dashboardでプロジェクトを作成
   - 接続情報を取得

2. **Render DBからのダンプ**
   - スキーマのみダンプ（`schema.sql`）
   - データをCSV形式でダンプ（各テーブルごと）

3. **スキーマの前処理**
   - `schema.sql` から以下を削除：
     - `CREATE EXTENSION` 行
     - `ALTER TABLE ... OWNER TO ...` 行
     - `GRANT` / `REVOKE` 行

4. **Supabaseへのスキーマ移行**
   - Supabase SQL Editorで `schema.sql` を実行

5. **Supabaseへのデータ移行**
   - スクリプトを使用してデータをインポート（親→子の順）

6. **データ整合性チェック**
   - レコード数の比較
   - サンプルデータの確認

7. **環境変数の更新**
   - `.env` ファイルの `DATABASE_URL` を更新
   - Render環境変数も更新

8. **Prisma設定の更新**
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

## ⚠️ 注意事項

- データ移行前に**必ずバックアップ**を取得してください
- スキーマの前処理（EXTENSION、OWNER、GRANT削除）は**必須**です
- データのインポート順序は**親→子**の順で実行してください（外部キー制約を満たすため）
- 大規模なデータ（10万行以上）の場合は、COPY方式が推奨されます

## 🐛 トラブルシューティング

### `pg_dump` や `psql` が見つからない

**Windows**:
- [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/)からインストール
- インストール後、PATHに追加されていることを確認

**macOS**:
```bash
brew install postgresql
```

**WSL / Linux**:
```bash
sudo apt-get install postgresql-client
```

### 接続エラー

- 接続文字列が正しいか確認
- パスワードに特殊文字が含まれる場合は、URLエンコードが必要な場合があります
- Supabaseの場合は、外部接続が許可されているか確認

### 外部キー制約エラー

- データのインポート順序を確認（親テーブル→子テーブル）
- 親テーブルのデータが存在することを確認

## 📚 関連ドキュメント

- [migrate-to-supabase.md](./migrate-to-supabase.md) - 詳細な移行ガイド
- [../MIGRATION_EXECUTION_PLAN.md](../MIGRATION_EXECUTION_PLAN.md) - 全体の移行計画
- [../PHASE_1_2_SETUP_GUIDE.md](../PHASE_1_2_SETUP_GUIDE.md) - Prisma設定ガイド

