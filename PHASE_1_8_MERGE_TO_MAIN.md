# Phase 1.8: メインブランチへのマージ

**作成日**: 2026-01-04  
**目的**: データベース移行のワークフローをメインブランチにマージ

---

## ✅ ブランチの確認

**現在のブランチ**: `branch-1229`  
**メインブランチ**: `main`  
**リモートのHEAD**: `origin/main`

---

## 📋 マージ手順

### Step 1: 現在の変更をコミット

```powershell
# 変更をステージング
git add .github/workflows/import-db.yml
git add .gitattributes
git add PHASE_1_8_USE_SQL_FILE.md

# コミット
git commit -m "Use SQL file for database migration with Git LFS"
git push
```

---

### Step 2: メインブランチに切り替え

```powershell
# メインブランチに切り替え
git checkout main

# 最新の状態に更新
git pull origin main
```

---

### Step 3: branch-1229をマージ

```powershell
# branch-1229をマージ
git merge branch-1229

# マージをプッシュ
git push origin main
```

---

### Step 4: GitHub Actionsワークフローを実行

1. **GitHubリポジトリにアクセス**
   - https://github.com/furima-share-re/fleapay-lite

2. **Actionsタブを開く**
   - リポジトリの上部メニューから「Actions」を選択

3. **ワークフローを実行**
   - 左側のメニューから「Import Database」を選択
   - 「Run workflow」ボタンをクリック
   - **ブランチを選択**: `main` ← **メインブランチを選択**
   - 「Run workflow」をクリック

---

## ⚠️ 注意事項

### マージ時の競合

**競合が発生した場合:**
- 競合を解決してからマージを完了
- または、`branch-1229`の変更を`main`に直接適用

---

### SQLファイルの場所

**SQLファイルは`branch-1229`にあります:**
- `tmp/2026-01-03T15_42Z/fleapay_prod_db/backup.sql`

**マージ後も同じ場所にあります:**
- メインブランチでも同じパスでアクセス可能

---

## 🔄 代替方法: メインブランチで直接作業

**メインブランチで直接作業する場合:**

```powershell
# メインブランチに切り替え
git checkout main
git pull origin main

# 変更を適用（cherry-pickまたは手動でコピー）
# または、branch-1229から必要なファイルをコピー
```

---

## ✅ 推奨アプローチ

**メインブランチにマージしてから実行:**
1. ✅ 本番環境のデータベース移行はメインブランチで実行
2. ✅ ワークフローの変更がメインブランチに反映される
3. ✅ 他の開発者も同じワークフローを使用可能

---

**まずは、変更をコミットして、メインブランチにマージしてください！**




