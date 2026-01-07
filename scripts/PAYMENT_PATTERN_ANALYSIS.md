# 決済パターン分析結果

## 提供データからのパターン分析

### データサマリー
- 総注文数: 34件（重複含む）
- 分析対象: seller-test01

---

## パターン分類

### 1. **現金決済（Cash）**
**判定条件**: `is_cash = true`

**特徴**:
- `payment_status = null`
- `amount_net = null`
- `order_status` は `pending` または `paid` の可能性

**該当データ**:
- order_no: 168 (`is_cash = true`, `payment_status = null`)
- order_no: 165 (`is_cash = true`, `payment_status = null`)

**パターン**: 
```
is_cash = true → 現金決済
```

---

### 2. **Stripe決済（成功）**
**判定条件**: `payment_status = 'succeeded'`

**特徴**:
- `is_cash = false` または `is_cash = null`
- `payment_status = 'succeeded'`
- `order_status = 'paid'`
- `amount_net` が設定されている（手数料差し引き後）

**該当データ**:
- order_no: 164 (`is_cash = null`, `payment_status = 'succeeded'`, `amount_net = 4000`)
- order_no: 161 (`is_cash = false`, `payment_status = 'succeeded'`, `amount_net = 3000`)
- order_no: 160 (`is_cash = false`, `payment_status = 'succeeded'`, `amount_net = 1000`) ×2
- order_no: 154 (`is_cash = false`, `payment_status = 'succeeded'`, `amount_net = 21500`)
- order_no: 149 (`is_cash = null`, `payment_status = 'succeeded'`, `amount_net = 400`)
- order_no: 148 (`is_cash = null`, `payment_status = 'succeeded'`, `amount_net = 6500`)
- order_no: 147 (`is_cash = null`, `payment_status = 'succeeded'`, `amount_net = 14400`)
- order_no: 146 (`is_cash = null`, `payment_status = 'succeeded'`, `amount_net = 4000`)
- order_no: 145 (`is_cash = null`, `payment_status = 'succeeded'`, `amount_net = 3700`)
- order_no: 136 (`is_cash = null`, `payment_status = 'succeeded'`, `amount_net = 3500`)
- order_no: 135 (`is_cash = null`, `payment_status = 'succeeded'`, `amount_net = 100`)

**パターン**: 
```
payment_status = 'succeeded' → Stripe決済成功
（is_cash が false または null でも、payment_status = 'succeeded' ならStripe決済）
```

---

### 3. **Stripe決済（待機中・QR決済待ち）**
**判定条件**: `is_cash = false` かつ `payment_status = null` かつ `order_status = 'pending'`

**特徴**:
- `is_cash = false`
- `payment_status = null`
- `order_status = 'pending'`
- `amount_net = null`

**該当データ**:
- order_no: 171 (`is_cash = false`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 170 (`is_cash = false`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 169 (`is_cash = false`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 167 (`is_cash = false`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 166 (`is_cash = false`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 163 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 162 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 158 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 157 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 156 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 155 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 153 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 151 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 150 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 144 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 143 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 142 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 141 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 140 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 139 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 138 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 137 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)
- order_no: 134 (`is_cash = null`, `payment_status = null`, `order_status = 'pending'`)

**パターン**: 
```
is_cash = false → Stripe決済（QR決済待ち）
is_cash = null AND payment_status = null AND order_status = 'pending' → Stripe決済待ち（is_cash未設定）
```

---

## パターン判定ロジック

### 優先順位（上から順に判定）

1. **現金決済**
   ```sql
   is_cash = true
   ```

2. **Stripe決済（成功）**
   ```sql
   payment_status = 'succeeded'
   ```
   - `is_cash` の値に関係なく、`payment_status = 'succeeded'` ならStripe決済成功

3. **Stripe決済（待機中）**
   ```sql
   is_cash = false OR (is_cash IS NULL AND payment_status IS NULL AND order_status = 'pending')
   ```

4. **決済方法未確定**
   ```sql
   is_cash IS NULL AND payment_status IS NULL AND order_status != 'paid'
   ```

---

## 統計サマリー

### 現金決済
- 件数: 2件
- 合計金額: 200円
- 平均金額: 100円

### Stripe決済（成功）
- 件数: 12件
- 合計金額（net）: 67,200円
- 平均金額（net）: 5,600円

### Stripe決済（待機中）
- 件数: 23件
- 合計金額: 約70,000円（推定）

---

## コードベースでの実装

### 判定ロジック（`lib/sql-conditions.ts`より）
```typescript
// 現金決済
om.is_cash = true

// Stripe成功決済
sp.status = 'succeeded'

// Stripe決済がない場合（現金かその他の決済）
sp.id IS NULL
```

### 売上計算ロジック
```sql
CASE 
  WHEN om.is_cash = true THEN o.amount  -- 現金決済
  WHEN sp.id IS NOT NULL AND sp.status = 'succeeded' THEN sp.amount_net  -- Stripe成功決済
  ELSE 0
END
```

---

## 注意点

1. **`is_cash = null` の扱い**
   - 古いデータや移行データでは `is_cash` が `null` の場合がある
   - `payment_status = 'succeeded'` があれば、Stripe決済として扱う

2. **`is_cash = false` と `is_cash = null` の違い**
   - `is_cash = false`: 明示的にStripe決済（QR決済）を選択
   - `is_cash = null`: 決済方法が未設定（古いデータの可能性）

3. **`payment_status` の優先度**
   - `payment_status = 'succeeded'` が最優先で判定
   - `is_cash` の値よりも `payment_status` を優先して判定すべき

---

## 推奨される判定ロジック

```sql
CASE 
  WHEN om.is_cash = true THEN '現金決済'
  WHEN sp.status = 'succeeded' THEN 'Stripe決済（成功）'
  WHEN om.is_cash = false THEN 'Stripe決済（QR決済待ち）'
  WHEN om.is_cash IS NULL AND sp.id IS NULL THEN '決済方法未確定'
  ELSE 'その他'
END AS payment_type
```




