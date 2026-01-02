# 動作確認結果レポート

**確認日時**: 2026-01-02  
**環境**: 検証環境（Staging）

---

## 🔍 確認項目

### 1. ローカルサーバーの起動確認

**ステータス**: ⏳ 確認中

**確認方法**:
```powershell
Test-NetConnection -ComputerName localhost -Port 3000
```

**次のステップ**:
- サーバーが起動していない場合: `npm run dev` で起動
- サーバーが起動している場合: APIエンドポイントにアクセス

---

### 2. ヘルスチェック（`/api/ping`）

**URL**: http://localhost:3000/api/ping

**期待される応答**:
```json
{
  "ok": true,
  "timestamp": "2026-01-02T...",
  "version": "3.2.0-seller-summary-fixed",
  "prisma": "connected"
}
```

**確認コマンド**:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/ping" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**結果**: ⏳ 未確認

---

### 3. フレーム一覧取得（`/api/frames`）

**URL**: http://localhost:3000/api/frames

**期待される応答**:
```json
[
  {
    "id": "frame-test-1",
    "display_name": "Test Frame 1",
    "category": "test",
    "metadata": {},
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

**確認コマンド**:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/frames" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**結果**: ⏳ 未確認

---

### 4. 売主情報取得（`/api/seller/:sellerId`）

**URL**: http://localhost:3000/api/seller/seller-test-1

**期待される応答**:
```json
{
  "id": "seller-test-1",
  "display_name": "Test Seller 1",
  "shop_name": "Test Shop",
  "email": "test@example.com",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**確認コマンド**:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/seller/seller-test-1" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**結果**: ⏳ 未確認

---

### 5. 注文一覧取得（`/api/orders`）

**URL**: http://localhost:3000/api/orders?sellerId=seller-test-1

**期待される応答**:
```json
[
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
```

**確認コマンド**:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/orders?sellerId=seller-test-1" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**結果**: ⏳ 未確認

---

## 📋 動作確認手順

### ステップ1: ローカルサーバーの起動

```powershell
# プロジェクトルートで実行
npm run dev
```

**期待される出力**:
```
✅ DB init done
Server running on http://localhost:3000
```

### ステップ2: ヘルスチェック

別のPowerShellウィンドウで実行:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/ping" -UseBasicParsing | Select-Object StatusCode, @{Name='Content';Expression={$_.Content | ConvertFrom-Json}}
```

### ステップ3: 各APIエンドポイントの確認

```powershell
# フレーム一覧
Invoke-WebRequest -Uri "http://localhost:3000/api/frames" -UseBasicParsing | Select-Object StatusCode, @{Name='Content';Expression={$_.Content | ConvertFrom-Json}}

# 売主情報
Invoke-WebRequest -Uri "http://localhost:3000/api/seller/seller-test-1" -UseBasicParsing | Select-Object StatusCode, @{Name='Content';Expression={$_.Content | ConvertFrom-Json}}

# 注文一覧
Invoke-WebRequest -Uri "http://localhost:3000/api/orders?sellerId=seller-test-1" -UseBasicParsing | Select-Object StatusCode, @{Name='Content';Expression={$_.Content | ConvertFrom-Json}}
```

---

## ✅ チェックリスト

- [ ] ローカルサーバーが起動している
- [ ] ヘルスチェック（`/api/ping`）が正常に動作
- [ ] フレーム一覧（`/api/frames`）が正常に動作
- [ ] 売主情報（`/api/seller/:sellerId`）が正常に動作
- [ ] 注文一覧（`/api/orders`）が正常に動作
- [ ] データが正しく取得できる
- [ ] Prisma接続が正常（`prisma: "connected"`）

---

## 🔗 関連ドキュメント

- [ACTION_VERIFICATION_URLS.md](./ACTION_VERIFICATION_URLS.md) - URL一覧
- [FIX_UUID_INSERT_ERROR.md](./FIX_UUID_INSERT_ERROR.md) - UUID型エラーの修正方法

