# Render環境のデータベース接続エラー修正

**エラー内容**: `getaddrinfo ENOTFOUND dpg-d48vk9idbo4c7385fnbg-a`

**原因**: Render環境変数の`DATABASE_URL`が古いRender PostgreSQLを指している

---

## 🔧 修正手順

### ステップ1: Render環境変数の確認と更新

1. **Render Dashboard**にログイン
2. `fleapay-lite-t1` サービスを選択
3. **Environment** タブを開く
4. `DATABASE_URL` 環境変数を確認

**現在の値（エラーの原因）**:
```
postgres://fleapay_db_user:sysAV7m1QUQtNFdxzIDVzynj5qlgAmzF@dpg-d48vk9idbo4c7385fnbg-a:5432/fleapay-db
```

**修正後の値（Supabase接続文字列）**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

**重要**: `[YOUR-PASSWORD]` をSupabaseプロジェクト作成時に設定したデータベースパスワードに置き換えてください。

---

### ステップ2: 環境変数の更新

1. `DATABASE_URL` の行で **Edit** をクリック
2. 既存の値を削除
3. Supabase接続文字列を貼り付け：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
   ```
4. **Save** をクリック

---

### ステップ3: Prisma Clientの生成確認

`package.json`の`postinstall`スクリプトが正しく設定されているか確認：

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

**確認方法**:
1. Render Dashboard → `fleapay-lite-t1` → **Logs** タブ
2. ビルドログで以下を確認：
   ```
   > postinstall
   > prisma generate
   ```
3. エラーがないか確認

**もし`postinstall`が実行されていない場合**:
- `package.json`を確認
- Gitにコミット・プッシュ
- Renderが自動的に再デプロイ

---

### ステップ4: 再デプロイの確認

環境変数を保存すると、Renderが自動的に再デプロイを開始します。

1. **Events** または **Logs** タブを開く
2. デプロイが完了するまで待つ（通常2-5分）
3. デプロイ完了後、動作確認

---

## ✅ 修正後の確認

### 1. ヘルスチェック

```powershell
$response = Invoke-WebRequest -Uri "https://fleapay-lite-t1.onrender.com/api/ping" -UseBasicParsing
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**期待される応答**:
```json
{
  "ok": true,
  "timestamp": "2026-01-02T...",
  "version": "3.2.0-seller-summary-fixed",
  "prisma": "connected"
}
```

**確認ポイント**:
- ✅ `prisma: "connected"` が含まれている
- ✅ エラーログにデータベース接続エラーがない

---

### 2. 売主情報取得

```powershell
$response = Invoke-WebRequest -Uri "https://fleapay-lite-t1.onrender.com/api/seller/check-id?id=seller-test-1" -UseBasicParsing
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**期待される応答**:
```json
{
  "exists": true,
  "seller": {
    "id": "seller-test-1",
    "display_name": "Test Seller 1",
    "shop_name": "Test Shop",
    "email": "test@example.com"
  }
}
```

**確認ポイント**:
- ✅ ステータスコード: `200 OK`
- ✅ データが取得できる
- ✅ エラーログにデータベース接続エラーがない

---

## 📋 チェックリスト

### 環境変数の更新
- [ ] Render Dashboardで`DATABASE_URL`を確認
- [ ] Supabase接続文字列に更新
- [ ] パスワードが正しく設定されている

### Prisma Clientの生成
- [ ] `package.json`の`postinstall`スクリプトが設定されている
- [ ] ビルドログで`prisma generate`が実行されている
- [ ] エラーがない

### 再デプロイ
- [ ] 環境変数を保存
- [ ] 再デプロイが完了するまで待つ
- [ ] 動作確認

---

## 🐛 トラブルシューティング

### 問題1: 環境変数を更新してもエラーが続く

**確認事項**:
- 環境変数が正しく保存されているか
- 再デプロイが完了しているか
- パスワードが正しいか

**対処方法**:
1. Render Dashboardで環境変数を再確認
2. サービスを手動で再デプロイ
3. ログを確認

### 問題2: Prisma Clientが生成されない

**確認事項**:
- `package.json`の`postinstall`スクリプトが設定されているか
- ビルドログでエラーがないか

**対処方法**:
1. `package.json`を確認
2. Gitにコミット・プッシュ
3. Renderが自動的に再デプロイ

### 問題3: データベース接続エラーが続く

**確認事項**:
- Supabaseの接続文字列が正しいか
- パスワードが正しいか
- Supabaseのデータベースが起動しているか

**対処方法**:
1. Supabase Dashboardで接続文字列を再確認
2. パスワードを再確認
3. Supabase SQL Editorで接続確認

---

## 🔗 関連ドキュメント

- [RENDER_STAGING_SETUP_STEPS.md](./RENDER_STAGING_SETUP_STEPS.md) - Render環境変数設定手順
- [SUPABASE_CONNECTION_INFO.md](./SUPABASE_CONNECTION_INFO.md) - Supabase接続情報取得方法
- [STAGING_VERIFICATION_RESULTS.md](./STAGING_VERIFICATION_RESULTS.md) - 動作確認結果

