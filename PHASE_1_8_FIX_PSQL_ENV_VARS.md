# Phase 1.8: psql環境変数の修正

**作成日**: 2026-01-04  
**エラー**: `psql`がローカルのソケットに接続しようとしている  
**原因**: `psql`コマンドはURL形式の接続文字列を直接受け取れない

---

## ✅ 問題の分析

**エラーの意味：**
- `psql`コマンドは、URL形式の接続文字列（`postgresql://...`）を直接引数として受け取ることができません
- `psql "$DATABASE_URL"`という形式では、`psql`が接続文字列を正しく解釈できません
- `psql`は、個別の環境変数（`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`）を使用する必要があります

---

## 🔧 修正内容

**ワークフローファイルを更新：**
1. `DATABASE_URL`を解析して、個別の環境変数に分割
2. URLエンコードされたパスワードをデコード
3. `psql`コマンドに環境変数を使用

---

## 📋 修正後のワークフロー

```yaml
- name: Import database from SQL file
  env:
    DATABASE_URL: ${{ secrets.SUPABASE_DATABASE_URL }}
  run: |
    cd tmp/2026-01-03T15_42Z/fleapay_prod_db
    if [ -f backup.sql ]; then
      echo "Using backup.sql file"
      echo "DATABASE_URL is set: ${DATABASE_URL:0:50}..."
      # Parse DATABASE_URL and set individual environment variables for psql
      # Format: postgresql://user:password@host:port/database
      export PGHOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
      export PGPORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
      export PGUSER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
      export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p' | sed 's/%2E/./g' | sed 's/%40/@/g')
      export PGDATABASE=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
      echo "PGHOST: $PGHOST"
      echo "PGPORT: $PGPORT"
      echo "PGUSER: $PGUSER"
      echo "PGDATABASE: $PGDATABASE"
      psql -f backup.sql
    else
      echo "backup.sql not found. Trying pg_restore with directory format..."
      pg_restore --dbname="$DATABASE_URL" --verbose --clean --no-owner --no-privileges --format=directory . || true
    fi
```

**変更点：**
- `DATABASE_URL`を解析して、個別の環境変数に分割
- URLエンコードされたパスワードをデコード（`%2E` → `.`, `%40` → `@`）
- `psql`コマンドに環境変数を使用（`psql -f backup.sql`）

---

## ⚠️ トラブルシューティング

### エラー1: sedコマンドが正しく動作しない場合

**対処方法：**
- `sed`コマンドの構文を確認
- 接続文字列の形式を確認

---

### エラー2: パスワードのデコードが正しく動作しない場合

**対処方法：**
- URLエンコードされたパスワードを手動でデコード
- または、GitHub Secretsにデコードされたパスワードを設定

---

### エラー3: 接続文字列の解析が正しく動作しない場合

**対処方法：**
- 接続文字列の形式を確認：
  ```
  postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres
  ```
- 各パラメータが正しく抽出されているか確認

---

## 📋 次のステップ

1. **変更をコミット**
   ```powershell
   git add .github/workflows/import-db.yml
   git commit -m "Fix psql to use individual environment variables"
   git push
   ```

2. **GitHub Actionsワークフローを再実行**
   - GitHubリポジトリ → **Actions**タブ
   - **Import Database**ワークフローを選択
   - **Run workflow**をクリック
   - ブランチを選択: `main`
   - **Run workflow**をクリック

---

**まずは、変更をコミットして、GitHub Actionsワークフローを再実行してください！**

