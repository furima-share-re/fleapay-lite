# Phase 1.8: psql接続エラーの修正

**作成日**: 2026-01-04  
**エラー**: `psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed`  
**原因**: `psql`が環境変数`DATABASE_URL`を読み取れていない、または接続文字列の形式が正しくない

---

## ✅ 問題の分析

**エラーの意味：**
- `psql`がローカルのPostgreSQLサーバーに接続しようとしている
- GitHub Actionsの環境では、ローカルのPostgreSQLサーバーは実行されていない
- `DATABASE_URL`環境変数が正しく設定されていない可能性

---

## 🔧 修正内容

**ワークフローファイルを更新：**
1. 環境変数の確認ログを追加
2. `psql`コマンドの接続文字列を明示的に指定

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
      psql "$DATABASE_URL" -f backup.sql
    else
      echo "backup.sql not found. Trying pg_restore with directory format..."
      pg_restore --dbname="$DATABASE_URL" --verbose --clean --no-owner --no-privileges --format=directory . || true
    fi
```

**変更点：**
- 環境変数の確認ログを追加（最初の50文字を表示）
- `psql`コマンドの接続文字列を明示的に指定（`"$DATABASE_URL"`）

---

## ⚠️ トラブルシューティング

### エラー1: まだローカル接続エラーが発生する場合

**対処方法：**
- GitHub Secretsに`SUPABASE_DATABASE_URL`が正しく設定されているか確認
- 接続文字列の形式を確認：
  ```
  postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres
  ```

---

### エラー2: パスワード認証エラーが発生する場合

**対処方法：**
- パスワードがURLエンコードされているか確認
- Direct Connection URLを使用しているか確認（Connection Pooling URLではない）

---

### エラー3: ホスト名解決エラーが発生する場合

**対処方法：**
- SupabaseプロジェクトIDが正しいか確認
- 接続文字列のホスト名が正しいか確認

---

## 📋 次のステップ

1. **変更をコミット**
   ```powershell
   git add .github/workflows/import-db.yml
   git commit -m "Fix psql connection string in GitHub Actions"
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

