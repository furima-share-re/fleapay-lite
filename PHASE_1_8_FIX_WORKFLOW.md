# Phase 1.8: GitHub Actionsワークフローの修正

**作成日**: 2026-01-04  
**エラー**: `pg_restore: error: too many command-line arguments (first is ".")`  
**修正**: `--format=directory`オプションを追加

---

## ✅ 修正内容

**ワークフローファイルを修正しました：**

```yaml
- name: Import database
  env:
    DATABASE_URL: ${{ secrets.SUPABASE_DATABASE_URL }}
  run: |
    cd tmp/2026-01-03T15_42Z/fleapay_prod_db
    pg_restore --dbname="$DATABASE_URL" --verbose --clean --no-owner --no-privileges --format=directory .
```

**変更点：**
- `--format=directory`オプションを追加（ディレクトリ形式のバックアップであることを明示）
- `$DATABASE_URL`を引用符で囲む（スペースが含まれる場合に備えて）

---

## 📋 次のステップ

1. **変更をコミット**
   ```powershell
   git add .github/workflows/import-db.yml
   git commit -m "Fix pg_restore command syntax"
   git push
   ```

2. **GitHub Actionsワークフローを再実行**
   - GitHubリポジトリ → **Actions**タブ
   - **Import Database**ワークフローを選択
   - **Run workflow**をクリック

---

## ⚠️ トラブルシューティング

### エラー1: まだ構文エラーが発生する場合

**対処方法：**
- `pg_restore`のバージョンを確認
- 別の構文を試す：
  ```yaml
  pg_restore -d "$DATABASE_URL" --verbose --clean --no-owner --no-privileges --format=directory .
  ```

---

### エラー2: 接続エラーが発生する場合

**対処方法：**
- GitHub Secretsの接続文字列が正しいか確認
- パスワードのURLエンコードが正しいか確認

---

**まずは、変更をコミットして、GitHub Actionsワークフローを再実行してください！**

