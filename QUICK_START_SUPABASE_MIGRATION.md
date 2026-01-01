# Supabase移行クイックスタートガイド

`pg_dump`がインストールされていない場合の簡易手順です。

## ✅ 完了済み

- [x] Supabaseプロジェクト作成
- [x] 接続情報取得
- [x] Render環境変数設定

## 🚀 次のステップ

### ステップ1: スキーマの移行

1. **`supabase_schema.sql` ファイルを開く**
   - プロジェクトルートに `supabase_schema.sql` が作成されています

2. **Supabase SQL Editorで実行**
   - [Supabase Dashboard](https://app.supabase.com) にログイン
   - プロジェクト `edo ichiba staging` を選択
   - **SQL Editor** を開く
   - **New query** をクリック
   - `supabase_schema.sql` の内容をコピー＆ペースト
   - **Run** をクリック

3. **エラーが出た場合**
   - エラーメッセージを確認
   - 該当行を修正または削除
   - 再度実行

### ステップ2: データの移行（オプション）

データがある場合は、以下のいずれかの方法で移行：

#### 方法A: PostgreSQLクライアントツールをインストール

1. [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/) からインストール
2. インストール後、PowerShellを再起動
3. `.\scripts\dump-render-db.ps1` を実行

#### 方法B: Render Dashboardからバックアップを取得

1. Render Dashboardでデータベースを選択
2. **Backups** タブからバックアップを作成
3. ダウンロードして復元

### ステップ3: Prisma設定の更新

```powershell
# プロジェクトルートで実行
npx prisma db pull
npx prisma generate
```

### ステップ4: 動作確認

```powershell
# ローカルサーバーを起動
npm run dev

# 別ターミナルでヘルスチェック
Invoke-WebRequest -Uri "http://localhost:3000/api/ping" -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## 📋 チェックリスト

- [ ] `supabase_schema.sql` をSupabase SQL Editorで実行
- [ ] テーブルが作成されたことを確認
- [ ] データを移行（必要に応じて）
- [ ] `npx prisma db pull` を実行
- [ ] `npx prisma generate` を実行
- [ ] ローカルで動作確認
- [ ] Render環境で動作確認

---

## 🔗 関連リンク

- **Supabase SQL Editor**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/sql/new
- **PostgreSQLダウンロード**: https://www.postgresql.org/download/windows/

