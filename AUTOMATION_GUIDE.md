# マイグレーション自動化ガイド

**更新日**: 2026-01-06  
**目的**: テーブル追加やスキーマ変更を自動化する方法

---

## 🤖 自動化の概要

このプロジェクトでは、**手動でSupabase SQL Editorを開く必要はありません**。コマンドラインから自動実行できます。

---

## 🚀 クイックスタート

### 1. マイグレーションファイルを作成

```bash
# supabase/migrations/ ディレクトリにSQLファイルを作成
# 例: supabase/migrations/20260106_120000_add_products_table.sql
```

### 2. 環境変数を設定

```bash
# .envファイルに設定するか、環境変数として設定
export DATABASE_URL="postgresql://postgres:password@host:5432/database"
```

### 3. マイグレーションを実行

**PowerShell (Windows)**:
```powershell
.\scripts\apply-migration.ps1 -MigrationFile "supabase\migrations\20260106_120000_add_products_table.sql"
```

**Node.js (クロスプラットフォーム)**:
```bash
npm run migrate supabase/migrations/20260106_120000_add_products_table.sql
```

### 4. Prismaスキーマを更新

```bash
npm run migrate:prisma
```

---

## 📋 詳細な手順

### 方法1: PowerShellスクリプト（Windows推奨）

```powershell
# 1. 環境変数を設定（.envファイルから読み込む場合）
# または、PowerShellで直接設定
$env:DATABASE_URL = "postgresql://postgres:password@host:5432/database"

# 2. マイグレーションを実行
.\scripts\apply-migration.ps1 -MigrationFile "supabase\migrations\20260106_120000_add_products_table.sql"

# 3. Prismaスキーマを更新
npm run migrate:prisma
```

### 方法2: Node.jsスクリプト（クロスプラットフォーム）

```bash
# 1. 環境変数を設定
export DATABASE_URL="postgresql://postgres:password@host:5432/database"

# 2. マイグレーションを実行
npm run migrate supabase/migrations/20260106_120000_add_products_table.sql

# 3. Prismaスキーマを更新
npm run migrate:prisma
```

### 方法3: 直接psqlコマンドを使用

```bash
# 環境変数から接続文字列を取得
psql $DATABASE_URL -f supabase/migrations/20260106_120000_add_products_table.sql

# Prismaスキーマを更新
npm run migrate:prisma
```

---

## 🔧 必要な環境

### 前提条件

1. **PostgreSQLクライアントツール**
   - `psql` コマンドが利用可能であること
   - [PostgreSQL公式サイト](https://www.postgresql.org/download/)からインストール

2. **Node.js**
   - Node.js 20以降（Supabase CLIを使用する場合）
   - 既にインストール済みの場合は不要

3. **環境変数**
   - `DATABASE_URL`: データベース接続文字列

---

## 📝 npmスクリプト

`package.json`に以下のスクリプトが追加されています：

| スクリプト | 説明 |
|-----------|------|
| `npm run migrate <file>` | マイグレーションファイルを実行 |
| `npm run migrate:prisma` | Prismaスキーマを更新（`db pull` + `generate`） |

---

## 🔄 完全なワークフロー例

### 例: `notifications` テーブルを追加

```bash
# 1. マイグレーションファイルを作成
# supabase/migrations/20260106_130000_add_notifications_table.sql

# 2. 環境変数を確認
echo $DATABASE_URL

# 3. マイグレーションを実行
npm run migrate supabase/migrations/20260106_130000_add_notifications_table.sql

# 4. Prismaスキーマを更新
npm run migrate:prisma

# 5. 動作確認
npm run dev
```

---

## ⚠️ 注意事項

### エラーハンドリング

- マイグレーション実行中にエラーが発生した場合、スクリプトは自動的に停止します
- エラーメッセージを確認し、SQLファイルを修正してから再実行してください

### 本番環境での実行

- 本番環境でマイグレーションを実行する前に、必ず開発環境でテストしてください
- バックアップを取ってから実行することを推奨します

### 環境変数の管理

- `.env`ファイルを使用する場合は、`.gitignore`に追加されていることを確認してください
- 本番環境では、環境変数を適切に設定してください

---

## 🚀 今後の改善予定

### CI/CDパイプラインへの組み込み

将来的には、以下のような自動化が可能です：

1. **GitHub Actions**: プッシュ時に自動的にマイグレーションを検証
2. **Render Build Hooks**: デプロイ時に自動的にマイグレーションを適用
3. **Supabase CLI**: `supabase db push`を使用した自動マイグレーション

---

## 📚 関連ドキュメント

- `HOW_TO_ADD_TABLE.md` - テーブル追加の詳細ガイド
- `SECURITY_POLICY_SQL.md` - SQL直接実行のセキュリティポリシー
- `scripts/apply-migration.js` - Node.js版マイグレーションスクリプト
- `scripts/apply-migration.ps1` - PowerShell版マイグレーションスクリプト

---

**最終更新**: 2026-01-06  
**実装者**: AI Assistant

