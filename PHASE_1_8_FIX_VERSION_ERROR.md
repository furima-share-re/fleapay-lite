# Phase 1.8: PostgreSQLバージョンエラーの修正

**作成日**: 2026-01-04  
**エラー**: `pg_restore: error: unsupported version (1.16) in file header`  
**原因**: バックアップファイルの形式がPostgreSQLクライアントのバージョンと互換性がない

---

## ✅ 修正内容

**ワークフローファイルを修正しました：**

1. **PostgreSQLクライアントをバージョン18に更新**
2. **バックアップファイルをSQL形式に変換**
3. **SQLファイルを`psql`でインポート**

---

## ⚠️ 重要な注意事項

### IPv4互換性の問題

**スクリーンショットに「Not IPv4 compatible」という警告が表示されています。**

**これは、SupabaseのデータベースがIPv4と互換性がないことを示しています。**
- これが、以前のDNS解決の問題の根本原因だった可能性があります
- GitHub ActionsのUbuntu環境はIPv6をサポートしているため、接続できる可能性が高いです

**対処方法：**
- IPv4アドオンの購入を検討（有料）
- または、IPv6をサポートする環境を使用（GitHub ActionsはIPv6をサポート）

---

## 📋 修正後のワークフロー

**ワークフローファイルを修正しました：**

```yaml
- name: Setup PostgreSQL
  run: |
    sudo apt-get update
    sudo apt-get install -y postgresql-client-18

- name: Convert backup to SQL format
  run: |
    cd tmp/2026-01-03T15_42Z/fleapay_prod_db
    pg_restore --file=backup.sql --format=directory --verbose .

- name: Import database
  env:
    DATABASE_URL: ${{ secrets.SUPABASE_DATABASE_URL }}
  run: |
    cd tmp/2026-01-03T15_42Z/fleapay_prod_db
    psql "$DATABASE_URL" -f backup.sql
```

**変更点：**
- PostgreSQLクライアントをバージョン18に更新
- バックアップファイルをSQL形式に変換
- `psql`を使用してSQLファイルをインポート

---

## 📋 次のステップ

1. **変更をコミット**
   ```powershell
   git add .github/workflows/import-db.yml
   git commit -m "Fix PostgreSQL version compatibility and convert to SQL format"
   git push
   ```

2. **GitHub Actionsワークフローを再実行**
   - GitHubリポジトリ → **Actions**タブ
   - **Import Database**ワークフローを選択
   - **Run workflow**をクリック

---

## ⚠️ トラブルシューティング

### エラー1: PostgreSQLクライアントのインストールに失敗

**対処方法：**
- PostgreSQLのリポジトリを追加：
  ```yaml
  - name: Setup PostgreSQL
    run: |
      sudo apt-get update
      sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
      wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
      sudo apt-get update
      sudo apt-get install -y postgresql-client-18
  ```

---

### エラー2: SQLファイルが大きすぎる

**対処方法：**
- SQLファイルを分割する必要がある場合があります
- または、`psql`の`-f`オプションの代わりに、標準入力を使用：
  ```yaml
  psql "$DATABASE_URL" < backup.sql
  ```

---

**まずは、変更をコミットして、GitHub Actionsワークフローを再実行してください！**

