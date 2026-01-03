# test-seller-pro プラン修正（即座に実行）

**問題**: `test-seller-pro`でアクセスしているのに、`planType: "standard"`、`isSubscribed: false`になっている

**解決方法**: ブラウザのコンソールからAPIを実行してプランを修正

---

## 🔧 即座に修正する方法

### ステップ1: 検証環境の管理画面を開く

```
https://fleapay-lite-t1.onrender.com/admin-dashboard.html
```

---

### ステップ2: ブラウザのコンソールを開く

1. **F12**キーを押す（または右クリック → 「検証」）
2. **Console**タブを選択

---

### ステップ3: 以下のコードを実行

```javascript
// test-seller-proをproプランに設定
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
.then(data => {
  console.log('✅ 設定結果:', data);
  if (data.ok) {
    alert('✅ test-seller-proをproプランに設定しました！\n\nページをリロードして確認してください。');
  } else {
    alert('❌ エラー: ' + JSON.stringify(data));
  }
})
.catch(error => {
  console.error('❌ エラー:', error);
  alert('❌ 通信エラー: ' + error.message);
});
```

---

### ステップ4: 設定結果を確認

コンソールに以下のような結果が表示されます：

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

### ステップ5: レジ画面で確認

以下のURLにアクセスして、レジ画面が表示されることを確認：

```
https://fleapay-lite-t1.onrender.com/seller-purchase-standard.html?s=test-seller-pro
```

**期待される動作**: レジ画面が表示される（アクセス拒否されない）

---

## 🔍 すべてのテストユーザーを一括設定する場合

```javascript
// すべてのテストユーザーを一括設定
fetch('/api/admin/setup-test-users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-token': window.ADMIN_TOKEN || localStorage.getItem('ADMIN_TOKEN')
  },
  body: JSON.stringify({ action: 'setup-all' })
})
.then(res => res.json())
.then(data => {
  console.log('✅ 設定結果:', data);
  if (data.ok) {
    alert('✅ すべてのテストユーザーを設定しました！\n\n' + 
          JSON.stringify(data.results, null, 2));
  } else {
    alert('❌ エラー: ' + JSON.stringify(data));
  }
})
.catch(error => {
  console.error('❌ エラー:', error);
  alert('❌ 通信エラー: ' + error.message);
});
```

---

## 🔍 現在のプランを確認する場合

```javascript
// test-seller-proの現在のプランを確認
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
.then(data => {
  console.log('📊 現在のプラン:', data);
  if (data.ok) {
    alert(`📊 ${data.sellerId}のプラン:\n` +
          `プラン: ${data.planType}\n` +
          `ステータス: ${data.status}\n` +
          `表示名: ${data.displayName}`);
  } else {
    alert('❌ プランが見つかりません: ' + data.message);
  }
})
.catch(error => {
  console.error('❌ エラー:', error);
  alert('❌ 通信エラー: ' + error.message);
});
```

---

## 📝 まとめ

1. **管理画面を開く**: `https://fleapay-lite-t1.onrender.com/admin-dashboard.html`
2. **コンソールを開く**: F12キー
3. **コードを実行**: 上記のJavaScriptコードをコピー＆ペースト
4. **確認**: レジ画面にアクセスして動作確認

これで`test-seller-pro`が正しく`pro`プランとして認識され、レジ画面にアクセスできるようになります。

