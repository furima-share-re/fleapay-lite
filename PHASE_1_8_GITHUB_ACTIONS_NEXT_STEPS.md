# Phase 1.8: GitHub Actionsの次のステップ

**作成日**: 2026-01-04  
**状況**: バックアップファイルをコミット済み  
**次のステップ**: GitHub Secretsに接続情報を設定してワークフローを実行

---

## ✅ Step 2: GitHub Secretsに接続情報を設定

**GitHub Secretsに接続情報を設定：**

### 手順

1. **GitHubリポジトリ**に移動
   - URL: `https://github.com/YOUR_USERNAME/fleapay-lite`
   - または、ブラウザでGitHubリポジトリを開く

2. **Settings** → **Secrets and variables** → **Actions**を開く
   - リポジトリの上部メニューから **Settings** をクリック
   - 左サイドバーから **Secrets and variables** → **Actions** を選択

3. **New repository secret**をクリック

4. **Name**: `SUPABASE_DATABASE_URL`

5. **Value**: 以下の接続文字列をコピー&ペースト
   ```
   postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres
   ```
   - **注意**: パスワードに`@`が含まれているため、URLエンコード済みの値を使用
   - 特殊文字のURLエンコード: `.` → `%2E`, `@` → `%40`

6. **Add secret**をクリック

---

## ✅ Step 3: GitHub Actionsワークフローを実行

**GitHub Actionsワークフローを実行：**

### 手順

1. **GitHubリポジトリ** → **Actions**タブを開く
   - リポジトリの上部メニューから **Actions** をクリック

2. **Import Database**ワークフローを選択
   - 左サイドバーから **Import Database** を選択

3. **Run workflow**をクリック
   - 右側の **Run workflow** ボタンをクリック

4. **Run workflow**ボタンをクリック
   - 確認ダイアログで **Run workflow** をクリック

5. **ワークフローの実行を待つ**
   - ワークフローの実行状況が表示されます
   - 完了まで約5-10分かかります

---

## 📋 接続文字列の確認

**GitHub Secretsに設定する接続文字列：**

```
postgresql://postgres:%2Ecx2eeaZJ55Qp%40f@db.snowkercpcuixnwxchkc.supabase.co:5432/postgres
```

**パスワードのURLエンコード：**
- 元のパスワード: `.cx2eeaZJ55Qp@f`
- URLエンコード後: `%2Ecx2eeaZJ55Qp%40f`
- `.` → `%2E`
- `@` → `%40`

---

## ⚠️ トラブルシューティング

### エラー1: ワークフローが実行されない

**対処方法：**
- GitHub Secretsが正しく設定されているか確認
- ワークフローファイルの構文が正しいか確認

---

### エラー2: 接続エラーが発生

**対処方法：**
- 接続文字列が正しいか確認
- パスワードのURLエンコードが正しいか確認
- Supabaseのファイアウォール設定を確認

---

### エラー3: バックアップファイルが見つからない

**対処方法：**
- バックアップファイルがリポジトリにコミットされているか確認
- ワークフローファイルのパスが正しいか確認

---

## 🎯 推奨手順

1. **GitHub Secretsに接続情報を設定**
2. **GitHub Actionsワークフローを実行**
3. **ワークフローの実行状況を確認**
4. **完了したら、データを確認**

---

**まずは、GitHub Secretsに接続情報を設定して、GitHub Actionsワークフローを実行してください！**

