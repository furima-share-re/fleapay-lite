# Render検証環境（fleapay-lite-t1）設定手順

現在、Render Dashboardの環境変数設定画面にいます。

## 📋 現在の環境変数（確認済み）

- `AWS_ACCESS_KEY`
- `AWS_S3_BUCKET`
- `AWS_SECRET_KEY`
- `BASE_URL`
- `DATABASE_URL` ← **これをSupabase接続文字列に更新**
- `SKIP_WEBHOOK_VERIFY`
- `STRIPE_PUBLISHABLE...`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SEC...`

---

## 🔧 設定手順

### ステップ1: DATABASE_URLの更新

1. 環境変数一覧で **`DATABASE_URL`** の行を見つける
2. **Edit** ボタン（または値の部分）をクリック
3. 既存の値を削除
4. 以下のSupabase接続文字列を貼り付け：

```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

**重要**: `[YOUR-PASSWORD]` をプロジェクト作成時に設定したデータベースパスワードに置き換えてください。

5. **Save** をクリック

---

### ステップ2: Supabase API環境変数の追加

#### 2.1 NEXT_PUBLIC_SUPABASE_URL を追加

1. **+ Create environment group** または **+ Add** ボタンをクリック
2. 新しい環境変数を追加：
   - **KEY**: `NEXT_PUBLIC_SUPABASE_URL`
   - **VALUE**: `https://mluvjdhqgfpcfsmvjae.supabase.co`
3. **Save** をクリック

#### 2.2 NEXT_PUBLIC_SUPABASE_ANON_KEY を追加

1. **+ Add** ボタンをクリック
2. 新しい環境変数を追加：
   - **KEY**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **VALUE**: [Supabase Dashboard > Settings > API Keys から取得した `anon` `public` key を貼り付け]
3. **Save** をクリック

#### 2.3 SUPABASE_SERVICE_ROLE_KEY を追加

1. **+ Add** ボタンをクリック
2. 新しい環境変数を追加：
   - **KEY**: `SUPABASE_SERVICE_ROLE_KEY`
   - **VALUE**: [Supabase Dashboard > Settings > API Keys > `service_role` `secret` > **Reveal** で表示したキーを貼り付け]
3. **Save** をクリック

**⚠️ 重要**: `SUPABASE_SERVICE_ROLE_KEY` は秘密情報です。値が `***` でマスクされていることを確認してください。

---

## ✅ 設定後の確認

### 追加された環境変数（合計4つ）

1. ✅ `DATABASE_URL` - Supabase接続文字列に更新済み
2. ✅ `NEXT_PUBLIC_SUPABASE_URL` - 新規追加
3. ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 新規追加
4. ✅ `SUPABASE_SERVICE_ROLE_KEY` - 新規追加

### 既存の環境変数（そのまま維持）

以下の環境変数は変更しないでください：
- `AWS_ACCESS_KEY`
- `AWS_S3_BUCKET`
- `AWS_SECRET_KEY`
- `BASE_URL`
- `SKIP_WEBHOOK_VERIFY`
- `STRIPE_PUBLISHABLE...`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SEC...`

---

## 🚀 デプロイの確認

環境変数を保存すると、Renderが自動的に再デプロイを開始します。

1. 左メニューから **Events** または **Logs** を開く
2. デプロイが完了するまで待つ（通常2-5分）
3. デプロイ完了後、動作確認

---

## 🧪 動作確認

### 1. ヘルスチェック

検証環境のURLにアクセス：
```
https://fleapay-lite-t1.onrender.com/api/ping
```

**期待されるレスポンス**:
```json
{
  "ok": true,
  "timestamp": "2025-01-15T...",
  "version": "...",
  "prisma": "connected"
}
```

### 2. エラーログの確認

1. Render Dashboardで **Logs** タブを開く**
2. エラーメッセージがないか確認
3. 接続エラーが出ていないか確認

---

## 📝 設定値のテンプレート

### DATABASE_URL
```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

### NEXT_PUBLIC_SUPABASE_URL
```
https://mluvjdhqgfpcfsmvjae.supabase.co
```

### NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs...
```
（Supabase Dashboardから取得した実際のキーを貼り付け）

### SUPABASE_SERVICE_ROLE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs...
```
（Supabase Dashboard > Reveal で表示した実際のキーを貼り付け）

---

## ⚠️ 注意事項

1. **パスワードの確認**
   - `DATABASE_URL` の `[YOUR-PASSWORD]` を正しいパスワードに置き換えたか確認
   - パスワードに特殊文字が含まれる場合は、URLエンコードが必要な場合があります

2. **キーの確認**
   - `anon` key と `service_role` key が正しくコピーされているか確認
   - キーの前後に余分なスペースがないか確認

3. **既存環境変数の維持**
   - 既存の環境変数（AWS、Stripe等）は変更しないでください
   - 誤って削除しないよう注意してください

---

## 🐛 トラブルシューティング

### 問題1: デプロイが失敗する

**確認事項**:
- 環境変数の値が正しいか（特に `DATABASE_URL` のパスワード）
- キーが正しくコピーされているか
- ログを確認してエラーメッセージを確認

### 問題2: 接続エラー

**確認事項**:
- `DATABASE_URL` が正しいか
- Supabaseプロジェクトがアクティブか
- パスワードが正しいか

### 問題3: 環境変数が反映されない

**対処方法**:
- 環境変数を保存後、手動で再デプロイを実行
- **Manual Deploy** ボタンをクリック

---

## 📚 次のステップ

環境変数の設定が完了したら：

1. **スキーマの移行**（`scripts/migrate-to-supabase.md` を参照）
2. **データの移行**（`scripts/migrate-to-supabase.md` を参照）
3. **動作確認**（すべてのAPIエンドポイント）

---

## 🔗 関連リンク

- **Render Dashboard**: https://dashboard.render.com/web/srv-d491g7bipnbc73dpb5q0/env
- **Supabase Dashboard**: https://app.supabase.com
- **プロジェクト設定**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/settings/general

