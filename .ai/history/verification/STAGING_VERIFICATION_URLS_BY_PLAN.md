# 検証環境 プラン別動作確認URLリスト

**更新日**: 2026-01-02  
**環境**: 検証環境（Staging）  
**ベースURL**: `https://fleapay-lite-t1.onrender.com`

---

## 📋 テストユーザー一覧

| ユーザーID | プラン | アクセス許可 | 説明 |
|-----------|--------|------------|------|
| `test-seller-standard` | `standard` | ❌ 拒否 | 標準プラン（レジ画面にアクセスできない） |
| `test-seller-pro` | `pro` | ✅ 許可 | プロプラン（レジ画面にアクセスできる） |
| `test-seller-kids` | `kids` | ✅ 許可 | キッズプラン（レジ画面にアクセスできる） |

---

## 🔧 テストユーザー作成SQL

Supabase SQL Editorで以下を実行：

```sql
-- 1. sellersテーブルにテストユーザーを作成
INSERT INTO sellers (id, display_name, shop_name, email, created_at, updated_at)
VALUES 
  ('test-seller-standard', 'Test Seller (Standard)', 'Standard Shop', 'standard@test.example.com', now(), now()),
  ('test-seller-pro', 'Test Seller (Pro)', 'Pro Shop', 'pro@test.example.com', now(), now()),
  ('test-seller-kids', 'Test Seller (Kids)', 'Kids Shop', 'kids@test.example.com', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. seller_subscriptionsテーブルにプランを設定
INSERT INTO seller_subscriptions (seller_id, plan_type, status, started_at)
VALUES 
  ('test-seller-standard', 'standard', 'active', now()),
  ('test-seller-pro', 'pro', 'active', now()),
  ('test-seller-kids', 'kids', 'active', now());
```

---

## 📊 動作確認URLリスト

### 1. Standardプラン (`test-seller-standard`)

#### APIエンドポイント

| エンドポイント | URL | 期待される応答 |
|--------------|-----|--------------|
| 売上サマリー | `https://fleapay-lite-t1.onrender.com/api/seller/summary?s=test-seller-standard` | `planType: "standard"`, `isSubscribed: false` |
| 売上分析 | `https://fleapay-lite-t1.onrender.com/api/seller/analytics?s=test-seller-standard&period=daily&days=30` | 正常に動作 |

#### フロントエンド

| ページ | URL | 期待される動作 |
|--------|-----|--------------|
| セラーダッシュボード | `https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-standard` | ✅ ダッシュボードが表示される<br>✅ QRコードが表示される |
| レジ画面（標準プラン） | `https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-standard` | ❌ 「このレジ画面はご利用いただけません」と表示される<br>❌ アクセス拒否 |

---

### 2. Proプラン (`test-seller-pro`)

#### APIエンドポイント

| エンドポイント | URL | 期待される応答 |
|--------------|-----|--------------|
| 売上サマリー | `https://fleapay-lite-t1.onrender.com/api/seller/summary?s=test-seller-pro` | `planType: "pro"`, `isSubscribed: true` |
| 売上分析 | `https://fleapay-lite-t1.onrender.com/api/seller/analytics?s=test-seller-pro&period=daily&days=30` | 正常に動作 |

#### フロントエンド

| ページ | URL | 期待される動作 |
|--------|-----|--------------|
| セラーダッシュボード | `https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-pro` | ✅ ダッシュボードが表示される<br>✅ QRコードが表示される |
| レジ画面（標準プラン） | `https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-pro` | ✅ レジ画面が表示される<br>✅ カメラ機能が使用できる |

---

### 3. Kidsプラン (`test-seller-kids`)

#### APIエンドポイント

| エンドポイント | URL | 期待される応答 |
|--------------|-----|--------------|
| 売上サマリー | `https://fleapay-lite-t1.onrender.com/api/seller/summary?s=test-seller-kids` | `planType: "kids"`, `isSubscribed: true` |
| 売上分析 | `https://fleapay-lite-t1.onrender.com/api/seller/analytics?s=test-seller-kids&period=daily&days=30` | 正常に動作 |

#### フロントエンド

| ページ | URL | 期待される動作 |
|--------|-----|--------------|
| セラーダッシュボード | `https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-kids` | ✅ ダッシュボードが表示される<br>✅ QRコードが表示される |
| レジ画面（標準プラン） | `https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-kids` | ✅ レジ画面が表示される<br>✅ カメラ機能が使用できる |

---

## 🔍 動作確認手順

### ステップ1: テストユーザー作成

Supabase SQL Editorで上記のSQLを実行

---

### ステップ2: API動作確認

#### Standardプラン
```bash
curl "https://fleapay-lite-t1.onrender.com/api/seller/summary?s=test-seller-standard"
```

**期待される応答**:
```json
{
  "sellerId": "test-seller-standard",
  "planType": "standard",
  "isSubscribed": false,
  ...
}
```

#### Proプラン
```bash
curl "https://fleapay-lite-t1.onrender.com/api/seller/summary?s=test-seller-pro"
```

**期待される応答**:
```json
{
  "sellerId": "test-seller-pro",
  "planType": "pro",
  "isSubscribed": true,
  ...
}
```

#### Kidsプラン
```bash
curl "https://fleapay-lite-t1.onrender.com/api/seller/summary?s=test-seller-kids"
```

**期待される応答**:
```json
{
  "sellerId": "test-seller-kids",
  "planType": "kids",
  "isSubscribed": true,
  ...
}
```

---

### ステップ3: フロントエンド動作確認

#### Standardプラン
1. **ダッシュボード**: `https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-standard`
   - ✅ ダッシュボードが表示される
   - ✅ QRコードが表示される

2. **レジ画面**: `https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-standard`
   - ❌ 「このレジ画面はご利用いただけません」と表示される

#### Proプラン
1. **ダッシュボード**: `https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-pro`
   - ✅ ダッシュボードが表示される
   - ✅ QRコードが表示される

2. **レジ画面**: `https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-pro`
   - ✅ レジ画面が表示される
   - ✅ カメラ機能が使用できる

#### Kidsプラン
1. **ダッシュボード**: `https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-kids`
   - ✅ ダッシュボードが表示される
   - ✅ QRコードが表示される

2. **レジ画面**: `https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-kids`
   - ✅ レジ画面が表示される
   - ✅ カメラ機能が使用できる

---

## 📝 動作確認チェックリスト

### Standardプラン (`test-seller-standard`)

- [ ] `/api/seller/summary?s=test-seller-standard` → `planType: "standard"`, `isSubscribed: false`
- [ ] `/seller-dashboard.html?s=test-seller-standard` → ダッシュボードが表示される
- [ ] `/seller-purchase-standard.html?s=test-seller-standard` → アクセス拒否メッセージが表示される

### Proプラン (`test-seller-pro`)

- [ ] `/api/seller/summary?s=test-seller-pro` → `planType: "pro"`, `isSubscribed: true`
- [ ] `/seller-dashboard.html?s=test-seller-pro` → ダッシュボードが表示される
- [ ] `/seller-purchase-standard.html?s=test-seller-pro` → レジ画面が表示される

### Kidsプラン (`test-seller-kids`)

- [ ] `/api/seller/summary?s=test-seller-kids` → `planType: "kids"`, `isSubscribed: true`
- [ ] `/seller-dashboard.html?s=test-seller-kids` → ダッシュボードが表示される
- [ ] `/seller-purchase-standard.html?s=test-seller-kids` → レジ画面が表示される

---

## 🔗 クイックアクセスリンク

### Standardプラン
- [ダッシュボード](https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-standard)
- [レジ画面](https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-standard) (アクセス拒否される)

### Proプラン
- [ダッシュボード](https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-pro)
- [レジ画面](https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-pro)

### Kidsプラン
- [ダッシュボード](https://fleapay-lite-t1.onrender.com/seller-dashboard.html?s=test-seller-kids)
- [レジ画面](https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-kids)

---

## 📊 Supabase Dashboard

- **プロジェクト**: https://app.supabase.com/project/mluvjdhqgfpcfsmvjae
- **SQL Editor**: https://app.supabase.com/project/mluvjdhqgfpcfsmvjae/sql/new
- **Table Editor**: https://app.supabase.com/project/mluvjdhqgfpcfsmvjae/editor

