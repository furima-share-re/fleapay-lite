# Phase 1.8: バックアップファイル形式エラーの代替アプローチ

**作成日**: 2026-01-04  
**エラー**: `pg_restore: error: unsupported version (1.16) in file header`  
**原因**: バックアップファイルがPostgreSQL 18で作成されており、GitHub ActionsのPostgreSQLクライアントが対応していない可能性

---

## ✅ 問題の分析

**バックアップファイルの形式：**
- 形式: `.dir.tar.gz`（ディレクトリ形式）
- 作成元: PostgreSQL 18（Render）
- バージョン: 1.16（PostgreSQL 18の形式）

**GitHub ActionsのPostgreSQLクライアント：**
- Ubuntuのデフォルトリポジトリには、PostgreSQL 18が含まれていない可能性
- PostgreSQL公式リポジトリからインストールしても、バージョンが一致しない可能性

---

## 🔄 代替アプローチ1: 既存のSQLファイルを使用

**ユーザーは既にローカルでSQLファイルを生成しています：**
- `backup.sql`（87.2MB）
- 9つの分割ファイル（`backup_part_1.sql` ～ `backup_part_9.sql`）

**このSQLファイルを使用する方法：**

1. **SQLファイルをリポジトリにコミット**
   - Git LFSを使用して大きなファイルを管理
   - または、GitHub Actionsで直接ダウンロード

2. **GitHub ActionsでSQLファイルをインポート**
   - `psql`を使用してSQLファイルを実行

---

## 🔄 代替アプローチ2: バックアップファイルをGit LFSで管理

**Git LFSを使用してバックアップファイルを管理：**

1. **Git LFSをセットアップ**
   ```bash
   git lfs install
   git lfs track "*.tar.gz"
   git lfs track "tmp/**/*.dat"
   ```

2. **バックアップファイルをコミット**
   ```bash
   git add tmp/2026-01-03T15_42Z/fleapay_prod_db
   git commit -m "Add database backup files"
   ```

3. **GitHub Actionsで使用**
   - バックアップファイルが自動的にダウンロードされる
   - `pg_restore`でインポート

---

## 🔄 代替アプローチ3: Supabase CLIを使用

**Supabase CLIを使用してインポート：**

1. **Supabase CLIをインストール**
   ```yaml
   - name: Setup Supabase CLI
     run: |
       npm install -g supabase
   ```

2. **Supabaseプロジェクトにリンク**
   ```yaml
   - name: Link Supabase project
     env:
       SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
       SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
     run: |
       supabase link --project-ref $SUPABASE_PROJECT_ID
   ```

3. **データベースをインポート**
   ```yaml
   - name: Import database
     run: |
       cd tmp/2026-01-03T15_42Z/fleapay_prod_db
       supabase db push --db-url "${{ secrets.SUPABASE_DATABASE_URL }}"
   ```

---

## 🔄 代替アプローチ4: バックアップファイルを別の形式に変換

**ローカルでバックアップファイルをSQL形式に変換：**

1. **既に実行済み**
   - `pg_restore --file=backup.sql --format=directory --verbose .`
   - `backup.sql`（87.2MB）が生成されている

2. **SQLファイルをGit LFSで管理**
   ```bash
   git lfs install
   git lfs track "*.sql"
   git add backup.sql
   git commit -m "Add SQL backup file"
   ```

3. **GitHub ActionsでSQLファイルをインポート**
   ```yaml
   - name: Import database
     env:
       DATABASE_URL: ${{ secrets.SUPABASE_DATABASE_URL }}
     run: |
       cd tmp/2026-01-03T15_42Z/fleapay_prod_db
       psql "$DATABASE_URL" -f backup.sql
   ```

---

## 📋 推奨アプローチ

**最も確実な方法：既存のSQLファイルを使用**

1. **SQLファイルをGit LFSで管理**
   - `backup.sql`（87.2MB）をGit LFSでコミット

2. **GitHub ActionsでSQLファイルをインポート**
   - `psql`を使用してSQLファイルを実行

---

## 🔍 現在のワークフローの問題点

**現在のワークフロー：**
```yaml
- name: Import database
  env:
    DATABASE_URL: ${{ secrets.SUPABASE_DATABASE_URL }}
  run: |
    cd tmp/2026-01-03T15_42Z/fleapay_prod_db
    pg_restore --dbname="$DATABASE_URL" --verbose --clean --no-owner --no-privileges --format=directory .
```

**問題：**
- バックアップファイルの形式（1.16）が、GitHub ActionsのPostgreSQLクライアントでサポートされていない
- PostgreSQL 18のバックアップファイルを読み込むには、PostgreSQL 18の`pg_restore`が必要

---

## ✅ 次のステップ

**推奨：既存のSQLファイルを使用**

1. **SQLファイルをGit LFSで管理**
2. **GitHub ActionsでSQLファイルをインポート**

**または、バックアップファイルをGit LFSで管理して、PostgreSQL 18のクライアントを確実にインストール**



