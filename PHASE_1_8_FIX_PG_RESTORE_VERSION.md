# Phase 1.8: pg_restoreバージョンエラーの修正

**作成日**: 2026-01-04  
**エラー**: `pg_restore: error: unsupported version (1.16) in file header`  
**原因**: PostgreSQLクライアントのバージョンが古い、またはバックアップファイルの形式が新しい

---

## ✅ 修正内容

**ワークフローファイルを修正しました：**

1. **PostgreSQLクライアントのインストール方法を改善**
   - GPGキーの追加方法を変更
   - PostgreSQLクライアント18を確実にインストール

2. **バージョン確認ステップを追加**
   - `pg_restore`のバージョンを確認

3. **直接pg_restoreを使用**
   - SQL形式への変換をスキップ
   - 直接`pg_restore`でインポート

---

## 📋 修正後のワークフロー

```yaml
- name: Setup PostgreSQL
  run: |
    sudo apt-get update
    sudo apt-get install -y wget ca-certificates gnupg lsb-release
    sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
    sudo apt-get update
    sudo apt-get install -y postgresql-client-18

- name: Verify PostgreSQL version
  run: |
    pg_restore --version

- name: Import database
  env:
    DATABASE_URL: ${{ secrets.SUPABASE_DATABASE_URL }}
  run: |
    cd tmp/2026-01-03T15_42Z/fleapay_prod_db
    pg_restore --dbname="$DATABASE_URL" --verbose --clean --no-owner --no-privileges --format=directory .
```

**変更点：**
- GPGキーの追加方法を変更（`apt-key`の代わりに`gpg --dearmor`を使用）
- `gnupg`と`lsb-release`パッケージを追加
- バージョン確認ステップを追加
- 直接`pg_restore`でインポート（SQL形式への変換をスキップ）

---

## 📋 次のステップ

1. **変更をコミット**
   ```powershell
   git add .github/workflows/import-db.yml
   git commit -m "Fix PostgreSQL client installation and use direct pg_restore"
   git push
   ```

2. **GitHub Actionsワークフローを再実行**
   - GitHubリポジトリ → **Actions**タブ
   - **Import Database**ワークフローを選択
   - **Run workflow**をクリック

---

## ⚠️ トラブルシューティング

### エラー1: まだバージョンエラーが発生する場合

**対処方法：**
- PostgreSQLクライアントのバージョンを確認：
  ```yaml
  - name: Verify PostgreSQL version
    run: |
      pg_restore --version
      psql --version
  ```

---

### エラー2: PostgreSQLクライアントのインストールに失敗

**対処方法：**
- 別の方法でインストール：
  ```yaml
  - name: Setup PostgreSQL
    run: |
      sudo apt-get update
      sudo apt-get install -y postgresql-client
  ```

---

**まずは、変更をコミットして、GitHub Actionsワークフローを再実行してください！**

