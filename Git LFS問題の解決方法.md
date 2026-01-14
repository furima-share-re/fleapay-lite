# Git LFS問題の解決方法

**作成日**: 2026-01-14  
**問題**: マイグレーションファイルがGit LFSのポインタファイルになっている

---

## 🔍 エラーの原因

エラーログから確認できること：
```
ERROR: syntax error at or near "version" (SQLSTATE 42601)
At statement: 0                                          
version https://git-lfs.github.com/spec/v1
```

**原因**: `.gitattributes`で`*.sql`がGit LFSで追跡されているため、マイグレーションファイルがGit LFSのポインタファイルとして保存されています。GitHub Actionsでチェックアウトした際に、実際のSQLファイルではなくポインタファイルが取得されているため、SQLとして実行できません。

---

## ✅ 解決方法

### ステップ1: .gitattributesを修正（完了）

`.gitattributes`を修正して、`supabase/migrations/*.sql`はGit LFSで追跡しないようにしました。

### ステップ2: 既存のマイグレーションファイルをGit LFSから解除

既にGit LFSで追跡されているマイグレーションファイルを解除する必要があります。

#### ローカルで実行するコマンド

```powershell
# プロジェクトディレクトリに移動
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"

# Git LFSからマイグレーションファイルを解除
git lfs untrack "supabase/migrations/*.sql"

# 既存のポインタファイルを実際のファイルに置き換える
git lfs pull --include="supabase/migrations/*.sql"
git add supabase/migrations/*.sql
git commit -m "fix: remove migrations from Git LFS"

# 変更をプッシュ
git push origin main
```

**注意**: このコマンドを実行すると、マイグレーションファイルがGit LFSから解除され、通常のGitファイルとして保存されます。

---

## 🔧 代替方法：GitHub ActionsでGit LFSをセットアップ

もしマイグレーションファイルをGit LFSで管理し続けたい場合は、GitHub ActionsでGit LFSをセットアップする必要があります。

### ワークフローファイルにGit LFSのセットアップを追加

`.github/workflows/apply-migrations.yml`の各ジョブに以下を追加：

```yaml
- name: Setup Git LFS
  uses: git-lfs/setup-git-lfs@v3
  with:
    version: latest

- name: Checkout with LFS
  uses: actions/checkout@v4
  with:
    lfs: true
```

ただし、**推奨される方法は、マイグレーションファイルをGit LFSから解除すること**です。マイグレーションファイルは通常小さいため、Git LFSで管理する必要はありません。

---

## 📋 チェックリスト

Git LFS問題を解決するために：

- [x] `.gitattributes`を修正（完了）
- [ ] ローカルでGit LFSからマイグレーションファイルを解除
- [ ] 変更をコミットしてプッシュ
- [ ] ワークフローを再実行して確認

---

## 🔗 関連ファイル

- `.gitattributes` - Git LFSの設定ファイル（修正済み）
- `.github/workflows/apply-migrations.yml` - ワークフローファイル
- `supabase/migrations/` - マイグレーションファイル

---

## 📝 まとめ

**問題**: マイグレーションファイルがGit LFSのポインタファイルになっている

**解決方法**:
1. ✅ `.gitattributes`を修正（完了）
2. ⏳ ローカルでGit LFSからマイグレーションファイルを解除
3. ⏳ 変更をコミットしてプッシュ
4. ⏳ ワークフローを再実行

**重要なポイント**:
- ✅ マイグレーションファイルは通常小さいため、Git LFSで管理する必要はない
- ✅ `supabase/migrations/*.sql`はGit LFSから除外する
- ✅ 既存のファイルをGit LFSから解除する必要がある
