# initDb()へのseller_subscriptions追加 - デグレードチェック

**更新日**: 2026-01-02  
**変更内容**: `server.js`の`initDb()`関数に`seller_subscriptions`テーブルの作成を追加

---

## ✅ デグレードチェック結果

### 1. テーブル作成の順序 ✅

**確認結果**: 問題なし

**理由**:
- `seller_subscriptions`テーブルは独立しており、他のテーブルへの外部キー参照がない
- 他のテーブルからも参照されていない（`sellers`テーブルへの外部キーは定義されていない）
- テーブル作成の位置は`kids_achievements`の後、`alter table`の前で適切

**テーブル作成順序**:
1. `sellers` ✅
2. `frames` ✅
3. `orders` ✅
4. `stripe_payments` ✅
5. `order_items` ✅
6. `images` ✅
7. `qr_sessions` ✅
8. `buyer_attributes` ✅
9. `order_metadata` ✅
10. `kids_achievements` ✅
11. **`seller_subscriptions`** ✅ (新規追加)
12. `alter table orders` (既存カラム追加) ✅

---

### 2. 外部キー制約 ✅

**確認結果**: 問題なし

**理由**:
- `seller_subscriptions`テーブルには外部キー制約がない
- `seller_id`は`text`型で、`sellers`テーブルへの外部キー参照がない
- 他のテーブルからも参照されていない

**注意**: 将来的に外部キー制約を追加する場合は、`sellers`テーブルが先に作成されている必要がありますが、現在は問題ありません。

---

### 3. 既存テーブルへの影響 ✅

**確認結果**: 問題なし

**理由**:
- `CREATE TABLE IF NOT EXISTS`を使用しているため、既にテーブルが存在する場合は何もしない
- 既存のテーブル構造に影響を与えない
- 既存のデータに影響を与えない

---

### 4. インデックス作成 ✅

**確認結果**: 問題なし

**理由**:
- `CREATE INDEX IF NOT EXISTS`を使用しているため、既にインデックスが存在する場合は何もしない
- 既存のインデックスと競合しない
- インデックス名は一意（`seller_subscriptions_seller_idx`など）

**作成されるインデックス**:
- `seller_subscriptions_seller_idx` (seller_id)
- `seller_subscriptions_status_idx` (status)
- `seller_subscriptions_seller_status_idx` (seller_id, status)

---

### 5. 既存APIエンドポイントへの影響 ✅

**確認結果**: 問題なし

**理由**:
- `payments.js`の`/api/seller/summary`エンドポイントは既に`try-catch`でエラーハンドリングされている
- テーブルが存在しない場合でも、デフォルト値（`planType: "standard"`, `isSubscribed: false`）を返す
- テーブルが作成されると、正常に動作するようになる

**既存のエラーハンドリング**:
```javascript
try {
  const subRes = await pool.query(/* seller_subscriptions へのクエリ */);
  // ...
} catch (subError) {
  // テーブルが存在しない場合やその他のエラーは無視してデフォルト値を使用
  console.warn("seller_subscriptions table not found or error:", subError.message);
}
```

---

### 6. データベース接続への影響 ✅

**確認結果**: 問題なし

**理由**:
- `initDb()`関数は既存の接続プール（`pool`）を使用
- テーブル作成は単一のトランザクションで実行される
- エラーが発生した場合、`initDb().catch()`でエラーハンドリングされている

---

### 7. Prismaスキーマとの整合性 ✅

**確認結果**: 問題なし

**理由**:
- `prisma/schema.prisma`に`SellerSubscription`モデルが既に定義されている
- テーブル構造がPrismaスキーマと一致している
- Prisma Clientは`postinstall`スクリプトで自動生成される

---

### 8. 既存のマイグレーションスクリプトへの影響 ✅

**確認結果**: 問題なし

**理由**:
- `supabase_schema.sql`にも`seller_subscriptions`テーブル定義が追加されている
- 手動マイグレーションスクリプト（`create_seller_subscriptions_table.sql`）も存在する
- 複数の方法でテーブルを作成できるが、`initDb()`で自動的に作成されるため、手動実行は不要になる

---

## 📋 変更内容の詳細

### 追加されたコード

```sql
-- seller_subscriptions
create table if not exists seller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  seller_id text not null,
  plan_type text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint seller_subscriptions_plan_type_check
    check (plan_type in ('standard', 'pro', 'kids')),
  constraint seller_subscriptions_status_check
    check (status in ('active', 'inactive', 'cancelled'))
);

create index if not exists seller_subscriptions_seller_idx
  on seller_subscriptions(seller_id);

create index if not exists seller_subscriptions_status_idx
  on seller_subscriptions(status);

create index if not exists seller_subscriptions_seller_status_idx
  on seller_subscriptions(seller_id, status);
```

### 変更位置

- **ファイル**: `server.js`
- **関数**: `initDb()`
- **位置**: `kids_achievements`テーブル作成の後、`alter table orders`の前（421-444行目）

---

## ✅ 動作確認項目

### 1. サーバー起動時の確認

**期待される動作**:
- `initDb()`が正常に実行される
- `seller_subscriptions`テーブルが作成される
- ログに`✅ DB init done (PATCHED v3.7 - seller_subscriptions table added)`が表示される

**確認方法**:
- Render Dashboard → Logs タブで確認

---

### 2. 既存APIエンドポイントの確認

**確認すべきエンドポイント**:
- `/api/ping` - ヘルスチェック
- `/api/seller/summary?s=test-seller-1` - 売上サマリー
- `/api/seller/analytics` - 売上分析
- `/api/orders/buyer-attributes` - 購入者属性
- `/api/orders/metadata` - 注文メタデータ

**期待される動作**:
- すべてのエンドポイントが正常に動作する
- `seller_subscriptions`テーブルが存在する場合、`/api/seller/summary`が正常にプラン情報を返す
- テーブルが存在しない場合でも、エラーにならずデフォルト値を返す（既存の動作）

---

### 3. データベーススキーマの確認

**確認方法**:
- Supabase Dashboard → Table Editor → `seller_subscriptions`テーブルが存在することを確認

**期待される状態**:
- テーブルが作成されている
- インデックスが作成されている
- 制約（`plan_type_check`, `status_check`）が設定されている

---

## 📝 まとめ

### ✅ デグレードなし

**確認結果**:
- ✅ テーブル作成の順序に問題なし
- ✅ 外部キー制約に問題なし
- ✅ 既存テーブルへの影響なし
- ✅ インデックス作成に問題なし
- ✅ 既存APIエンドポイントへの影響なし
- ✅ データベース接続への影響なし
- ✅ Prismaスキーマとの整合性あり
- ✅ 既存のマイグレーションスクリプトとの整合性あり

### 🎯 改善点

**追加された機能**:
- サーバー起動時に自動的に`seller_subscriptions`テーブルが作成される
- 手動でSupabase SQL Editorで実行する必要がなくなる
- コードでデータベーススキーマを管理できる

### ⚠️ 注意事項

**データ挿入は別途必要**:
- テーブルは自動的に作成されるが、テストユーザーへのプロプラン設定（データ挿入）は別途必要
- 将来的には、管理画面やAPIエンドポイントからプランを設定できるようにすることを推奨

---

## 🔍 推奨される動作確認手順

1. **サーバー起動確認**:
   - Render環境で再デプロイ
   - ログで`✅ DB init done (PATCHED v3.7 - seller_subscriptions table added)`を確認

2. **テーブル作成確認**:
   - Supabase Table Editorで`seller_subscriptions`テーブルが存在することを確認

3. **API動作確認**:
   - `/api/seller/summary?s=test-seller-1`を呼び出し
   - エラーが発生しないことを確認（テーブルが存在する場合、プラン情報が返される）

4. **既存機能確認**:
   - 他のAPIエンドポイントが正常に動作することを確認

