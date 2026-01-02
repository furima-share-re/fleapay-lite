# 動作確認手順

**更新日**: 2026-01-02

---

## 🚀 ステップ1: ローカルサーバーの起動

### 1.1 プロジェクトルートに移動

```powershell
cd "C:\Users\yasho\OneDrive\ドキュメント\GitHub\fleapay-lite"
```

### 1.2 サーバーを起動

```powershell
npm run dev
```

**期待される出力**:
```
✅ DB init done
Server running on http://localhost:3000
```

**注意**: サーバーが起動したら、このウィンドウは開いたままにしてください。

---

## 🔍 ステップ2: 別のPowerShellウィンドウで動作確認

サーバーが起動したら、**新しいPowerShellウィンドウ**を開いて以下を実行してください。

### 2.1 ヘルスチェック

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/ping" -UseBasicParsing
Write-Output "Status: $($response.StatusCode)"
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

---

### 2.2 フレーム一覧取得

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/frames" -UseBasicParsing
Write-Output "Status: $($response.StatusCode)"
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**注意**: `/api/frames`ではなく`/api/admin/frames`です。

**期待される応答**:
```json
{
  "frames": [
    {
      "id": "frame-test-1",
      "displayName": "Test Frame 1",
      "category": "test",
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "orderCount": 0
    }
  ]
}
```

---

### 2.3 売主情報取得

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/seller/check-id?id=seller-test-1" -UseBasicParsing
Write-Output "Status: $($response.StatusCode)"
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

---

### 2.4 注文一覧取得

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/seller/order-detail-full?sellerId=seller-test-1" -UseBasicParsing
Write-Output "Status: $($response.StatusCode)"
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**期待される応答**:
```json
{
  "orders": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "seller_id": "seller-test-1",
      "order_no": 1,
      "amount": 1000,
      "status": "pending",
      "frame_id": "frame-test-1",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 🌐 ステップ3: Render環境での動作確認（オプション）

### 3.1 Render環境のURLを確認

1. [Render Dashboard](https://dashboard.render.com) にログイン
2. `fleapay-lite-t1` サービスを選択
3. **Settings** タブを開く
4. **Service URL** を確認

**例**: `https://fleapay-lite-t1.onrender.com`

### 3.2 Render環境でヘルスチェック

```powershell
$response = Invoke-WebRequest -Uri "https://fleapay-lite-t1.onrender.com/api/ping" -UseBasicParsing -TimeoutSec 30
Write-Output "Status: $($response.StatusCode)"
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**注意**: Render環境は初回アクセス時に起動に時間がかかる場合があります（コールドスタート）。

---

## ✅ 動作確認チェックリスト

### ローカル環境

- [ ] サーバーが起動している（`npm run dev`）
- [ ] ヘルスチェック（`/api/ping`）が正常に動作
  - [ ] ステータスコード: `200`
  - [ ] `prisma: "connected"` が含まれている
- [ ] フレーム一覧（`/api/admin/frames`）が正常に動作
  - [ ] ステータスコード: `200`
  - [ ] データが取得できる
- [ ] 売主情報（`/api/seller/check-id`）が正常に動作
  - [ ] ステータスコード: `200`
  - [ ] データが取得できる
- [ ] 注文一覧（`/api/seller/order-detail-full`）が正常に動作
  - [ ] ステータスコード: `200`
  - [ ] データが取得できる

### Render環境（オプション）

- [ ] Render環境のURLが確認できた
- [ ] ヘルスチェック（`/api/ping`）が正常に動作
- [ ] データが正しく取得できる

---

## 🐛 トラブルシューティング

### 問題1: サーバーが起動しない

**確認事項**:
- `.env`ファイルが存在するか
- `DATABASE_URL`が正しく設定されているか
- 依存関係がインストールされているか（`npm install`）

### 問題2: データベース接続エラー

**確認事項**:
- Supabaseの接続文字列が正しいか
- パスワードが正しいか
- Supabaseのデータベースが起動しているか

### 問題3: データが取得できない

**確認事項**:
- Supabase SQL Editorでデータが存在するか
- テーブル名が正しいか
- カラム名が正しいか

---

## 📋 次のステップ

動作確認が完了したら：

1. **Phase 1.3: データ移行** を完了としてマーク
2. **進捗レポート** を更新
3. **Phase 1.4: Supabase Auth移行** に進む

---

## 🔗 関連ドキュメント

- [ACTION_VERIFICATION_URLS.md](./ACTION_VERIFICATION_URLS.md) - URL一覧
- [VERIFICATION_RESULTS.md](./VERIFICATION_RESULTS.md) - 動作確認結果レポート

