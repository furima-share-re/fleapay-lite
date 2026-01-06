# データ整合性検証ガイド

## 📋 概要
`scripts/verify_migration.sql`を実行して、マイグレーション後のデータ整合性を確認します。

## ✅ 期待される結果

### チェック1: payment_stateがNULLのレコード
```sql
check_name: 'payment_state NULL check'
count: 0
result: 'PASS'
```
**期待値**: `count = 0`, `result = 'PASS'`  
**意味**: すべての`order_metadata`レコードに`payment_state`が設定されている

---

### チェック2: is_cashがNULLのレコード
```sql
check_name: 'is_cash NULL check'
count: 0
result: 'PASS'
```
**期待値**: `count = 0`, `result = 'PASS'`  
**意味**: すべての`order_metadata`レコードに`is_cash`が設定されている

---

### チェック3: Stripe矛盾チェック
```sql
check_name: 'Stripe contradiction check'
count: 0
result: 'PASS'
```
**期待値**: `count = 0`, `result = 'PASS'`  
**意味**: `is_cash = true`なのに`stripe_payments.status = 'succeeded'`という矛盾がない

---

### チェック4: payment_stateとis_cashの整合性
```sql
check_name: 'payment_state consistency check'
count: 0
result: 'PASS'
```
**期待値**: `count = 0`, `result = 'PASS'`  
**意味**: 
- `is_cash = true` → `payment_state = 'cash_completed'`
- `is_cash = false` → `payment_state IN ('stripe_pending', 'stripe_completed')`

---

### チェック5: 決済状態別の件数確認（情報表示）
```sql
payment_state        | is_cash | count
---------------------|---------|------
cash_completed       | true    | X
stripe_completed     | false   | Y
stripe_pending       | false   | Z
```
**期待値**: 各状態の件数が表示される（参考情報）  
**意味**: 決済状態の分布を確認

**例**:
```
payment_state        | is_cash | count
---------------------|---------|------
cash_completed       | true    | 150
stripe_completed     | false   | 80
stripe_pending       | false   | 5
```

---

### チェック6: 売上金額の確認（情報表示）
```sql
check_name: 'Total sales check'
total_sales: XXXX
```
**期待値**: マイグレーション前後で同じ金額であるべき  
**意味**: マイグレーションで売上金額が変わっていないことを確認

---

## 🎯 合格基準

**すべてのチェック（1-4）で`result = 'PASS'`であれば問題ありません。**

### ✅ 合格例
```
check_name                      | count | result
--------------------------------|-------|-------
payment_state NULL check        | 0     | PASS
is_cash NULL check              | 0     | PASS
Stripe contradiction check       | 0     | PASS
payment_state consistency check | 0     | PASS
```

### ❌ 不合格例
```
check_name                      | count | result
--------------------------------|-------|-------
payment_state NULL check        | 5     | FAIL  ← 問題あり！
is_cash NULL check              | 0     | PASS
Stripe contradiction check       | 0     | PASS
payment_state consistency check | 2     | FAIL  ← 問題あり！
```

---

## 🔍 問題が検出された場合

### チェック1または2でFAIL
- **原因**: マイグレーションが不完全
- **対応**: マイグレーションスクリプトを再実行、または手動でNULLを修正

### チェック3でFAIL
- **原因**: データの矛盾（Stripe成功なのに現金フラグが立っている）
- **対応**: 該当レコードを確認し、`is_cash`または`stripe_payments`のデータを修正

### チェック4でFAIL
- **原因**: `payment_state`と`is_cash`の整合性が取れていない
- **対応**: 該当レコードを確認し、整合性を保つように修正

---

## 📝 実行方法

### Supabase SQL Editorで実行
1. Supabase Dashboard → SQL Editor
2. `scripts/verify_migration.sql`の内容をコピー＆ペースト
3. 実行ボタンをクリック
4. 結果を確認

### psqlで実行
```bash
psql $DATABASE_URL -f scripts/verify_migration.sql
```

### Prisma Studio / データベースクライアントで実行
1. データベースクライアントを開く
2. `scripts/verify_migration.sql`の内容を実行
3. 結果を確認

---

## 📊 チェック結果の記録

検証結果を記録しておくことを推奨します：

```markdown
## 検証日時: 2025-01-15 10:00:00

### 結果
- ✅ チェック1: PASS (count: 0)
- ✅ チェック2: PASS (count: 0)
- ✅ チェック3: PASS (count: 0)
- ✅ チェック4: PASS (count: 0)
- 📊 チェック5: 決済状態分布
  - cash_completed: 150件
  - stripe_completed: 80件
  - stripe_pending: 5件
- 💰 チェック6: 総売上金額: 2,500,000円
```

---

## 🚨 注意事項

- マイグレーション実行前に必ずバックアップを取得
- 本番環境では、ステージング環境で十分にテストしてから実行
- 検証結果は必ず記録・保存

