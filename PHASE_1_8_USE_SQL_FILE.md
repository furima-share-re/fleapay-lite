# Phase 1.8: SQLファイルを使用したデータ移行

**作成日**: 2026-01-04  
**目的**: 既存の`backup.sql`ファイルを使用してデータ移行を実行

---

## ✅ アプローチの変更

**問題**: `pg_restore`のバージョンエラー（`unsupported version (1.16)`）

**解決策**: 既にローカルで生成済みの`backup.sql`ファイルを使用

---

## 📋 手順

### Step 1: Git LFSのセットアップ

**Git LFSをインストール（まだの場合）:**
```powershell
git lfs install
```

**`.gitattributes`ファイルを作成（既に作成済み）:**
```
*.sql filter=lfs diff=lfs merge=lfs -text
*.tar.gz filter=lfs diff=lfs merge=lfs -text
tmp/**/*.dat filter=lfs diff=lfs merge=lfs -text
```

---

### Step 2: SQLファイルをGit LFSでコミット

**SQLファイルを追加:**
```powershell
# プロジェクトルートに移動
cd C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite

# SQLファイルをGit LFSで追加
git lfs track "tmp/**/*.sql"
git add tmp/2026-01-03T15_42Z/fleapay_prod_db/backup.sql
git add .gitattributes

# コミット
git commit -m "Add SQL backup file for database migration"
git push
```

---

### Step 3: GitHub Actionsワークフローの確認

**ワークフローは既に更新済み:**
- Git LFSを有効化（`lfs: true`）
- `backup.sql`ファイルを使用してインポート
- `pg_restore`が失敗した場合のフォールバック

---

### Step 4: GitHub Actionsワークフローを実行

1. **GitHubリポジトリにアクセス**
   - https://github.com/furima-share-re/fleapay-lite

2. **Actionsタブを開く**
   - リポジトリの上部メニューから「Actions」を選択

3. **ワークフローを実行**
   - 左側のメニューから「Import Database」を選択
   - 「Run workflow」ボタンをクリック
   - ブランチを選択（`branch-1229`）
   - 「Run workflow」をクリック

---

## ⚠️ 注意事項

### Git LFSの制限

**GitHubの無料プラン:**
- Git LFSのストレージ: 1GB
- 帯域幅: 1GB/月

**`backup.sql`ファイル:**
- サイズ: 87.2MB
- ✅ 無料プランで十分

---

### SQLファイルの場所

**現在の場所:**
```
tmp/2026-01-03T15_42Z/fleapay_prod_db/backup.sql
```

**GitHub Actionsでの使用:**
```yaml
cd tmp/2026-01-03T15_42Z/fleapay_prod_db
psql "$DATABASE_URL" -f backup.sql
```

---

## 🔍 トラブルシューティング

### エラー1: Git LFSがインストールされていない

**対処方法:**
```powershell
# Git LFSをインストール
winget install Git.GitLFS
# または
choco install git-lfs
```

---

### エラー2: SQLファイルが大きすぎる

**対処方法:**
- Git LFSを使用していることを確認
- ファイルサイズを確認（87.2MBは問題なし）

---

### エラー3: GitHub ActionsでSQLファイルが見つからない

**対処方法:**
- Git LFSが正しく設定されているか確認
- `actions/checkout@v3`に`lfs: true`が設定されているか確認

---

## ✅ 次のステップ

1. **Git LFSをセットアップ**
2. **SQLファイルをコミット**
3. **GitHub Actionsワークフローを実行**

---

**まずは、Git LFSをセットアップして、SQLファイルをコミットしてください！**




