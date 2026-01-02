# Shared Poolerを使用する（緊急対応）

**更新日**: 2026-01-02

---

## 🔴 現在の問題

スクリーンショットを確認しました。現在、**"Dedicated Pooler"** を使用していますが、これは **"Not IPv4 compatible"** と表示されています。

**エラー原因**:
- ❌ "Dedicated Pooler" はIPv4非互換
- ❌ Render環境はIPv4ネットワークのため接続できない
- ✅ "Shared Pooler" は **"IPV4 COMPATIBLE"** と表示されている

---

## ✅ 解決策

**"Using the Shared Pooler"** セクションを展開して、その接続文字列を使用してください。

---

## 🔧 手順

### ステップ1: Shared Poolerセクションを展開

1. Supabase Dashboardの「Connect to your project」モーダルで
2. **"Using the Shared Pooler"** セクションをクリックして展開
   - セクションの右側に下向き矢印（▼）があるはずです
   - クリックすると展開されます

### ステップ2: 接続文字列をコピー

展開された「Using the Shared Pooler」セクション内に接続文字列が表示されます。

**期待される接続文字列の形式**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**特徴**:
- ✅ ホスト名: `aws-0-*.pooler.supabase.com`（IPv4互換）
- ✅ ポート: `:6543`
- ✅ クエリパラメータ: `?pgbouncer=true`
- ✅ **"IPV4 COMPATIBLE"** ラベルが表示されている

### ステップ3: Render環境変数を更新

1. **Render Dashboard**にログイン
2. `fleapay-lite-t1` サービスを選択
3. **Environment** タブを開く
4. `DATABASE_URL` 環境変数を編集
5. **Shared Pooler**の接続文字列を貼り付け
   - パスワード部分（`[YOUR-PASSWORD]`）をSupabaseプロジェクトのデータベースパスワードに置き換えてください
6. **Save** をクリック

### ステップ4: 再デプロイ

環境変数を保存すると、自動的に再デプロイが開始されます。

**確認ポイント**:
- ✅ ログに `ENETUNREACH` エラーがない
- ✅ ログに `Database: Connected` が表示される
- ✅ IPv6接続エラーがない

---

## 📋 チェックリスト

### Supabase Dashboard
- [ ] "Using the Shared Pooler"セクションを展開
- [ ] 接続文字列をコピー
- [ ] "IPV4 COMPATIBLE"ラベルが表示されていることを確認
- [ ] ホスト名が `aws-0-*.pooler.supabase.com` 形式であることを確認

### Render環境変数
- [ ] `DATABASE_URL`をShared Pooler接続文字列に更新
- [ ] パスワードが正しく設定されている
- [ ] 環境変数を保存

### 再デプロイ
- [ ] 再デプロイが完了するまで待つ
- [ ] ログでエラーがないか確認
- [ ] `Database: Connected`が表示されることを確認

---

## 🎯 重要なポイント

### Dedicated Pooler vs Shared Pooler

| 項目 | Dedicated Pooler | Shared Pooler |
|------|-----------------|---------------|
| **IPv4互換** | ❌ なし | ✅ あり |
| **用途** | 専用リソースが必要な場合 | 共有リソースで十分な場合 |
| **Render環境** | ❌ 接続不可 | ✅ 接続可能（推奨） |
| **コスト** | 有料（IPv4アドオン必要） | 無料 |

**結論**: Render環境では **Shared Pooler** を使用する必要があります。

---

## 🔗 関連ドキュメント

- [FIX_IPV6_POOLER_CONNECTION.md](./FIX_IPV6_POOLER_CONNECTION.md) - IPv6接続エラーの修正
- [SELECT_SHARED_POOLER.md](./SELECT_SHARED_POOLER.md) - Shared Poolerの選択方法
- [USE_SHARED_POOLER.md](./USE_SHARED_POOLER.md) - Shared Poolerの使用方法

