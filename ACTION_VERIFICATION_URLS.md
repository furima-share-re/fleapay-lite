# 動作確認用URL一覧

**更新日**: 2026-01-02  
**目的**: Supabase移行後の動作確認

---

## 🌐 環境別URL

### 検証環境（Staging）

#### Render環境
- **サービス名**: `fleapay-lite-t1`
- **URL**: [Render Dashboard](https://dashboard.render.com) で確認
  - Render Dashboard → `fleapay-lite-t1` → **Settings** → **Service URL**

#### Supabase環境
- **プロジェクト名**: `edo ichiba staging`
- **Project ID**: `mluvjdhqgfpcfsmvjae`
- **Supabase Dashboard**: https://app.supabase.com/project/mluvjdhqgfpcfsmvjae
- **Supabase URL**: https://mluvjdhqgfpcfsmvjae.supabase.co
- **SQL Editor**: https://app.supabase.com/project/mluvjdhqgfpcfsmvjae/sql/new
- **Table Editor**: https://app.supabase.com/project/mluvjdhqgfpcfsmvjae/editor

---

## 🔍 APIエンドポイント（動作確認用）

### 基本エンドポイント

#### 1. ヘルスチェック
```
GET /api/ping
```

**期待される応答**:
```json
{
  "status": "ok",
  "database": "connected"
}
```

**確認ポイント**:
- ✅ サーバーが起動している
- ✅ データベース接続が正常
- ✅ Prisma Clientが正常に動作

---

#### 2. フレーム一覧取得
```
GET /api/frames
```

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

**確認ポイント**:
- ✅ `frames`テーブルからデータが取得できる
- ✅ Prisma経由でデータが取得できる

---

#### 3. 売主情報取得
```
GET /api/seller/:sellerId
```

**例**:
```
GET /api/seller/seller-test-1
```

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

**確認ポイント**:
- ✅ `sellers`テーブルからデータが取得できる
- ✅ 外部キー制約が正しく機能している

---

#### 4. 注文一覧取得
```
GET /api/orders?sellerId=:sellerId
```

**例**:
```
GET /api/orders?sellerId=seller-test-1
```

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

**確認ポイント**:
- ✅ `orders`テーブルからデータが取得できる
- ✅ UUID型のカラムが正しく処理されている
- ✅ 外部キー制約が正しく機能している

---

## 📋 動作確認チェックリスト

### データベース接続確認

- [ ] **ヘルスチェック**: `GET /api/ping`
  - [ ] ステータス: `200 OK`
  - [ ] レスポンス: `{"status": "ok", "database": "connected"}`

### データ取得確認

- [ ] **フレーム一覧**: `GET /api/frames`
  - [ ] ステータス: `200 OK`
  - [ ] データが正しく取得できる

- [ ] **売主情報**: `GET /api/seller/:sellerId`
  - [ ] ステータス: `200 OK`
  - [ ] データが正しく取得できる

- [ ] **注文一覧**: `GET /api/orders?sellerId=:sellerId`
  - [ ] ステータス: `200 OK`
  - [ ] UUID型のカラムが正しく処理されている

### データ整合性確認

- [ ] **外部キー制約**: 注文データに売主IDとフレームIDが正しく関連付けられている
- [ ] **データ型**: UUID型のカラムが正しく処理されている
- [ ] **タイムスタンプ**: `created_at`が正しく設定されている

---

## 🔧 ローカル環境での動作確認

### ローカルサーバー起動

```powershell
# プロジェクトルートで実行
npm run dev
```

**期待される出力**:
```
✅ DB init done
Server running on http://localhost:3000
```

### ローカル環境のURL

- **ベースURL**: http://localhost:3000
- **ヘルスチェック**: http://localhost:3000/api/ping
- **フレーム一覧**: http://localhost:3000/api/frames
- **売主情報**: http://localhost:3000/api/seller/seller-test-1
- **注文一覧**: http://localhost:3000/api/orders?sellerId=seller-test-1

---

## 🌐 Render環境での動作確認

### Render環境のURL取得方法

1. **Render Dashboard**にログイン
2. `fleapay-lite-t1` サービスを選択
3. **Settings** タブを開く
4. **Service URL** を確認

**例**:
```
https://fleapay-lite-t1.onrender.com
```

### Render環境のAPIエンドポイント

- **ベースURL**: `https://[SERVICE-NAME].onrender.com`
- **ヘルスチェック**: `https://[SERVICE-NAME].onrender.com/api/ping`
- **フレーム一覧**: `https://[SERVICE-NAME].onrender.com/api/frames`
- **売主情報**: `https://[SERVICE-NAME].onrender.com/api/seller/:sellerId`
- **注文一覧**: `https://[SERVICE-NAME].onrender.com/api/orders?sellerId=:sellerId`

---

## 🧪 テスト用データ

### テスト用のID

- **フレームID**: `frame-test-1`
- **売主ID**: `seller-test-1`
- **注文ID**: UUID（自動生成）

### テスト用のINSERT文

```sql
-- Supabase SQL Editorで実行済みのデータ
-- frames
INSERT INTO frames (id, display_name, category, metadata, created_at) VALUES 
('frame-test-1', 'Test Frame 1', 'test', '{}', NOW());

-- sellers
INSERT INTO sellers (id, display_name, shop_name, email, password_hash, created_at) VALUES 
('seller-test-1', 'Test Seller 1', 'Test Shop', 'test@example.com', 'test-hash', NOW());

-- orders
INSERT INTO orders (seller_id, order_no, frame_id, amount, status, created_at) VALUES 
('seller-test-1', 1, 'frame-test-1', 1000, 'pending', NOW());
```

---

## 📊 Supabase SQL Editorでの確認

### データ存在確認

```sql
-- レコード数の確認
SELECT 'frames' as table_name, COUNT(*) as count FROM frames
UNION ALL
SELECT 'sellers', COUNT(*) FROM sellers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders;
```

### サンプルデータ確認

```sql
-- 最新の注文を確認
SELECT id, seller_id, order_no, amount, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 売主情報を確認
SELECT id, display_name, shop_name, email, created_at 
FROM sellers 
LIMIT 10;

-- フレーム情報を確認
SELECT id, display_name, category, created_at 
FROM frames 
LIMIT 10;
```

---

## 🔗 関連リンク

### Supabase Dashboard
- **プロジェクト**: https://app.supabase.com/project/mluvjdhqgfpcfsmvjae
- **SQL Editor**: https://app.supabase.com/project/mluvjdhqgfpcfsmvjae/sql/new
- **Table Editor**: https://app.supabase.com/project/mluvjdhqgfpcfsmvjae/editor
- **Database**: https://app.supabase.com/project/mluvjdhqgfpcfsmvjae/settings/database

### Render Dashboard
- **Dashboard**: https://dashboard.render.com
- **サービス**: Render Dashboard → `fleapay-lite-t1`

---

## ✅ 動作確認の手順

### ステップ1: データベース接続確認

1. Supabase SQL Editorでデータが存在することを確認
2. ローカル環境で `npm run dev` を実行
3. `GET /api/ping` にアクセスして接続確認

### ステップ2: データ取得確認

1. `GET /api/frames` でフレーム一覧を取得
2. `GET /api/seller/seller-test-1` で売主情報を取得
3. `GET /api/orders?sellerId=seller-test-1` で注文一覧を取得

### ステップ3: Render環境での確認

1. Render Dashboardでサービスが正常にデプロイされていることを確認
2. Render環境のURLで各APIエンドポイントにアクセス
3. レスポンスが正しいことを確認

---

## 🐛 トラブルシューティング

### 問題1: データベース接続エラー

**確認事項**:
- Render環境変数の `DATABASE_URL` が正しく設定されているか
- Supabaseの接続文字列が正しいか
- パスワードが正しいか

### 問題2: データが取得できない

**確認事項**:
- Supabase SQL Editorでデータが存在するか
- テーブル名が正しいか
- カラム名が正しいか

### 問題3: UUID型エラー

**確認事項**:
- `orders`テーブルの`id`がUUID型であることを確認
- INSERT文でUUIDを正しく指定しているか

---

## 📝 次のステップ

動作確認が完了したら：

1. **Phase 1.3: データ移行** を完了としてマーク
2. **Phase 1.4: Supabase Auth移行** に進む
3. **進捗レポート** を更新

---

## 🔗 関連ドキュメント

- [FIX_UUID_INSERT_ERROR.md](./FIX_UUID_INSERT_ERROR.md) - UUID型エラーの修正方法
- [DATA_MIGRATION_METHOD_B.md](./DATA_MIGRATION_METHOD_B.md) - データ移行方法B
- [MIGRATION_EXECUTION_PLAN.md](./MIGRATION_EXECUTION_PLAN.md) - 移行実行計画

