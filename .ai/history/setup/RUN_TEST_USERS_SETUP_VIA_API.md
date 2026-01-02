# テストユーザー設定API使用ガイド

**目的**: ローカル環境でNode.jsが使えない場合でも、Render環境のAPI経由でテストユーザーのプランを設定する

---

## 📋 概要

`/api/admin/setup-test-users`エンドポイントを使用して、ブラウザからテストユーザーのプランを設定できます。

- ✅ 手動SQL操作不要
- ✅ ローカル環境のNode.js不要
- ✅ ブラウザから実行可能
- ✅ Prismaクライアントを使用（安全）

---

## 🔧 使用方法

### 1. すべてのテストユーザーを一括設定

**リクエスト**:
```bash
curl -X POST https://fleapay-lite-t1.onrender.com/api/admin/setup-test-users \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{"action": "setup-all"}'
```

**または、ブラウザのコンソールから**:
```javascript
fetch('/api/admin/setup-test-users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-token': window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN')
  },
  body: JSON.stringify({ action: 'setup-all' })
})
.then(res => res.json())
.then(data => console.log(data));
```

**レスポンス**:
```json
{
  "ok": true,
  "results": [
    {
      "sellerId": "test-seller-standard",
      "planType": "standard",
      "success": true,
      "subscriptionId": "...",
      "deactivatedCount": 0
    },
    {
      "sellerId": "test-seller-pro",
      "planType": "pro",
      "success": true,
      "subscriptionId": "...",
      "deactivatedCount": 0
    },
    {
      "sellerId": "test-seller-kids",
      "planType": "kids",
      "success": true,
      "subscriptionId": "...",
      "deactivatedCount": 0
    }
  ]
}
```

---

### 2. 特定のユーザーのプランを設定

**リクエスト**:
```bash
curl -X POST https://fleapay-lite-t1.onrender.com/api/admin/setup-test-users \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{"action": "set", "sellerId": "test-seller-pro", "planType": "pro"}'
```

**ブラウザのコンソールから**:
```javascript
fetch('/api/admin/setup-test-users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-token': window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN')
  },
  body: JSON.stringify({
    action: 'set',
    sellerId: 'test-seller-pro',
    planType: 'pro'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**レスポンス**:
```json
{
  "ok": true,
  "sellerId": "test-seller-pro",
  "planType": "pro",
  "subscriptionId": "...",
  "deactivatedCount": 1
}
```

---

### 3. 特定のユーザーのプランを確認

**リクエスト**:
```bash
curl -X POST https://fleapay-lite-t1.onrender.com/api/admin/setup-test-users \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{"action": "check", "sellerId": "test-seller-pro"}'
```

**ブラウザのコンソールから**:
```javascript
fetch('/api/admin/setup-test-users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-token': window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN')
  },
  body: JSON.stringify({
    action: 'check',
    sellerId: 'test-seller-pro'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**レスポンス**:
```json
{
  "ok": true,
  "sellerId": "test-seller-pro",
  "planType": "pro",
  "status": "active",
  "startedAt": "2026-01-02T14:30:00.000Z",
  "endedAt": null,
  "displayName": "Test Seller (pro)"
}
```

---

## 🔐 認証

このAPIは管理APIのため、`x-admin-token`ヘッダーが必要です。

**トークンの取得方法**:
1. 管理画面にログイン
2. ブラウザのコンソールで以下を実行:
   ```javascript
   console.log(window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN'));
   ```

---

## 📝 実装例（HTMLページ）

管理画面にボタンを追加して、ワンクリックでテストユーザーを設定することもできます：

```html
<button onclick="setupTestUsers()">テストユーザーを設定</button>

<script>
async function setupTestUsers() {
  const token = window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN');
  
  try {
    const res = await fetch('/api/admin/setup-test-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ action: 'setup-all' })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      alert('✅ テストユーザーの設定が完了しました！');
      console.log(data);
    } else {
      alert('❌ エラーが発生しました: ' + JSON.stringify(data));
    }
  } catch (error) {
    alert('❌ 通信エラー: ' + error.message);
  }
}
</script>
```

---

## 🔍 トラブルシューティング

### エラー: `unauthorized`

**原因**: `x-admin-token`が正しく設定されていない

**解決方法**: 管理画面にログインして、トークンを確認してください

---

### エラー: `invalid_plan_type`

**原因**: `planType`が`standard`, `pro`, `kids`のいずれでもない

**解決方法**: 有効なプランタイプを指定してください

---

### エラー: `internal_error`

**原因**: データベース接続エラーやPrismaクライアントの初期化エラー

**解決方法**: 
1. Renderのログを確認
2. `DATABASE_URL`が正しく設定されているか確認
3. Prismaクライアントが生成されているか確認（`prisma generate`）

---

## 📊 まとめ

1. **APIエンドポイント**: `/api/admin/setup-test-users`
2. **認証**: `x-admin-token`ヘッダーが必要
3. **アクション**:
   - `setup-all`: すべてのテストユーザーを設定
   - `set`: 特定のユーザーのプランを設定
   - `check`: 特定のユーザーのプランを確認

これで、ローカル環境でNode.jsが使えない場合でも、ブラウザからテストユーザーのプランを設定できます。

