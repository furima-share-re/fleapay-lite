# URLで直接取引データを確認する方法

ブラウザやcurlコマンドで直接APIエンドポイントにアクセスして取引データを確認できます。

## 📋 利用可能なAPIエンドポイント

### 1. セラー取引サマリー（取引履歴含む）

**URL**: `/api/seller/summary`

**パラメータ**:
- `s`: セラーID（必須）

**例**:
```
http://localhost:3000/api/seller/summary?s=seller123
```

**本番環境**:
```
https://your-domain.com/api/seller/summary?s=seller123
```

**レスポンス**: 取引履歴、売上KPI、スコアなどが含まれます

---

### 2. 注文詳細（写真＋属性含む）

**URL**: `/api/seller/order-detail-full`

**パラメータ**:
- `s`: セラーID（必須）
- `orderId`: 注文ID（必須）

**例**:
```
http://localhost:3000/api/seller/order-detail-full?s=seller123&orderId=123e4567-e89b-12d3-a456-426614174000
```

**レスポンス**: 注文の詳細情報、画像、購入者属性など

---

### 3. 決済結果取得

**URL**: `/api/checkout/result`

**パラメータ**:
- `orderId`: 注文ID（必須）

**例**:
```
http://localhost:3000/api/checkout/result?orderId=123e4567-e89b-12d3-a456-426614174000
```

**レスポンス**: 決済状況、支払い情報など

---

### 4. 管理者ダッシュボード（全取引データ）

**URL**: `/api/admin/dashboard`

**パラメータ**: なし（認証が必要な場合あり）

**例**:
```
http://localhost:3000/api/admin/dashboard
```

**レスポンス**: 全体の取引統計、緊急事項など

---

## 🌐 ブラウザで確認する方法

### 方法1: 直接URLを開く

1. ブラウザを開く
2. アドレスバーにURLを入力
3. Enterキーを押す

**例**:
```
http://localhost:3000/api/seller/summary?s=seller123
```

### 方法2: JSONビューアー拡張機能を使用

ChromeやFirefoxのJSONビューアー拡張機能をインストールすると、見やすく表示されます。

---

## 💻 curlコマンドで確認する方法

### PowerShellで実行

```powershell
# セラー取引サマリーを取得
curl "http://localhost:3000/api/seller/summary?s=seller123"

# JSONを整形して表示（jqが必要）
curl "http://localhost:3000/api/seller/summary?s=seller123" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### ファイルに保存

```powershell
# JSONファイルに保存
curl "http://localhost:3000/api/seller/summary?s=seller123" -o transactions.json

# その後、Cursorでtransactions.jsonを開く
```

---

## 📝 実践例

### 例1: 特定のセラーの取引履歴を確認

**ブラウザ**:
```
http://localhost:3000/api/seller/summary?s=seller123
```

**PowerShell**:
```powershell
curl "http://localhost:3000/api/seller/summary?s=seller123" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 例2: 特定の注文の詳細を確認

**ブラウザ**:
```
http://localhost:3000/api/seller/order-detail-full?s=seller123&orderId=<order-id>
```

**PowerShell**:
```powershell
curl "http://localhost:3000/api/seller/order-detail-full?s=seller123&orderId=<order-id>" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 例3: データをJSONファイルに保存してCursorで確認

```powershell
# データを取得してファイルに保存
curl "http://localhost:3000/api/seller/summary?s=seller123" -o data/transactions.json

# Cursorで data/transactions.json を開く
```

---

## 🔍 レスポンスの見方

### `/api/seller/summary` のレスポンス例

```json
{
  "kpiToday": {
    "sales": 50000,
    "count": 5
  },
  "kpiTotal": {
    "sales": 1000000,
    "count": 100
  },
  "recent": [
    {
      "orderId": "...",
      "amount": 10000,
      "status": "paid",
      "createdAt": "2026-01-04T12:00:00Z"
    }
  ],
  "score": {
    "total": 85
  }
}
```

### `/api/seller/order-detail-full` のレスポンス例

```json
{
  "order": {
    "id": "...",
    "amount": 10000,
    "status": "paid",
    "summary": "商品名"
  },
  "images": [
    {
      "url": "...",
      "kind": "processed"
    }
  ],
  "orderItems": [
    {
      "name": "商品名",
      "quantity": 1,
      "amount": 10000
    }
  ],
  "buyerAttributes": {
    "customerType": "regular",
    "gender": "male",
    "ageBand": "30-40"
  }
}
```

---

## ⚙️ 本番環境での使用

本番環境のURLを使用する場合：

```powershell
# 本番環境のURLに置き換え
curl "https://your-domain.com/api/seller/summary?s=seller123"
```

---

## 💡 Cursorで確認する手順

1. **curlでデータを取得してファイルに保存**:
   ```powershell
   curl "http://localhost:3000/api/seller/summary?s=seller123" -o data/transactions.json
   ```

2. **Cursorでファイルを開く**:
   - 左側のファイルエクスプローラーで `data/transactions.json` を開く

3. **データを分析**:
   - CursorのAI機能で「このデータを分析して」と聞くことも可能

---

## ❓ トラブルシューティング

### エラー: "seller_id_required"

**原因**: `s` パラメータが不足しています

**解決方法**: URLに `?s=seller123` を追加

### エラー: "order_not_found"

**原因**: 指定した注文IDが存在しないか、アクセス権限がありません

**解決方法**: 正しい注文IDを確認

### エラー: 接続できない

**原因**: サーバーが起動していない可能性があります

**解決方法**: 
- 開発サーバーを起動: `npm run dev`
- または本番環境のURLを使用

---

## 📚 関連ドキュメント

- **API仕様**: `spec/openapi.yml`
- **スクリプトでの確認方法**: `scripts/HOW_TO_USE_VIEW_TRANSACTIONS.md`


