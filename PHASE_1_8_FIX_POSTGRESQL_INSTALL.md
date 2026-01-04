# Phase 1.8: PostgreSQLクライアントのインストール修正

**作成日**: 2026-01-04  
**エラー**: `E: Unable to locate package postgresql-client-18`  
**原因**: PostgreSQLの公式リポジトリが追加されていない

---

## ✅ 修正内容

**ワークフローファイルを修正しました：**

```yaml
- name: Setup PostgreSQL
  run: |
    sudo apt-get update
    sudo apt-get install -y wget ca-certificates
    sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
    sudo apt-get update
    sudo apt-get install -y postgresql-client-18
```

**変更点：**
- PostgreSQLの公式リポジトリを追加
- GPGキーを追加
- PostgreSQLクライアント18をインストール

---

## 📋 次のステップ

1. **変更をコミット**
   ```powershell
   git add .github/workflows/import-db.yml
   git commit -m "Add PostgreSQL official repository for client installation"
   git push
   ```

2. **GitHub Actionsワークフローを再実行**
   - GitHubリポジトリ → **Actions**タブ
   - **Import Database**ワークフローを選択
   - **Run workflow**をクリック

---

## ⚠️ トラブルシューティング

### エラー1: GPGキーの追加に失敗

**対処方法：**
- 別の方法でGPGキーを追加：
  ```yaml
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
  ```

---

### エラー2: まだパッケージが見つからない

**対処方法：**
- バージョンを指定せずにインストール：
  ```yaml
  sudo apt-get install -y postgresql-client
  ```

---

**まずは、変更をコミットして、GitHub Actionsワークフローを再実行してください！**

