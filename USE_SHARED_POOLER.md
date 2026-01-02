# Shared Pooler（Connection Pooling）を使用する方法

**問題**: Direct connectionがIPv4互換ではない  
**解決策**: Shared Pooler（Connection Pooling）を使用

---

## 🔍 現在の状況

Supabase Dashboardで以下の警告が表示されています：

**"Not IPv4 compatible"**
- Direct connection（直接接続）はIPv6のみ
- Render環境はIPv4ネットワークのため接続できない
- 解決策: Shared Poolerを使用する

---

## ✅ 解決方法: Shared Poolerを使用

### ステップ1: Supabase DashboardでShared Pooler接続文字列を取得

1. **Supabase Dashboard**で「Connect to your project」モーダルを開く
2. **Connection String** タブが選択されていることを確認
3. **Method** ドロップダウンを確認
4. **"Direct connection"** から **"Shared Pooler"** に変更

**または**:

1. **Settings** → **Database** → **Connection string** を開く
2. **Connection Pooling** タブを選択
3. **URI** タブを選択
4. 接続文字列をコピー

---

### ステップ2: Shared Pooler接続文字列の形式

**期待される形式**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**特徴**:
- ✅ ユーザー名: `postgres.mluvjdhqgfpcfsmvjae`（Project IDが含まれている）
- ✅ ホスト名: `aws-0-ap-northeast-1.pooler.supabase.com`（IPv4互換）
- ✅ ポート: `:6543`（Connection Pooling）
- ✅ IPv4互換

---

### ステップ3: Render環境変数を更新

1. **Render Dashboard**にログイン
2. `fleapay-lite-t1` サービスを選択
3. **Environment** タブを開く
4. `DATABASE_URL` 環境変数を編集

**現在の値（削除）**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

**新しい値（Shared Pooler）**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**重要**: 
- `[YOUR-PASSWORD]` をSupabaseプロジェクト作成時に設定したデータベースパスワードに置き換えてください
- リージョン（`ap-northeast-1`）はプロジェクトのリージョンに合わせてください
- Supabase Dashboardから接続文字列をコピーすることを推奨します

5. **Save** をクリック

---

## 📋 接続方式の比較

| 項目 | Direct connection | Shared Pooler（推奨） |
|------|------------------|---------------------|
| **IPv4互換** | ❌ なし | ✅ あり |
| **IPv6互換** | ✅ あり | ✅ あり |
| **ポート** | `:5432` | `:6543` |
| **接続プーリング** | なし | あり（高負荷時にも安定） |
| **Render環境** | ❌ 接続不可 | ✅ 接続可能 |
| **ユーザー名** | `postgres` | `postgres.mluvjdhqgfpcfsmvjae` |
| **ホスト名** | `db.mluvjdhqgfpcfsmvjae.supabase.co` | `aws-0-ap-northeast-1.pooler.supabase.com` |

---

## 🔧 Supabase Dashboardでの設定方法

### 方法1: Methodドロップダウンで変更

1. 「Connect to your project」モーダルを開く
2. **Connection String** タブを選択
3. **Method** ドロップダウンで **"Shared Pooler"** を選択
4. 接続文字列をコピー

### 方法2: Connection Poolingタブから取得

1. **Settings** → **Database** → **Connection string** を開く
2. **Connection Pooling** タブを選択
3. **URI** タブを選択
4. 接続文字列をコピー

---

## ✅ チェックリスト

### Shared Pooler接続文字列
- [ ] Supabase DashboardでMethodを"Shared Pooler"に変更
- [ ] 接続文字列をコピー
- [ ] ポート番号（`:6543`）が含まれている
- [ ] ホスト名が `aws-0-*.pooler.supabase.com` である
- [ ] ユーザー名が `postgres.mluvjdhqgfpcfsmvjae` である

### Render環境変数
- [ ] `DATABASE_URL`をShared Pooler接続文字列に更新
- [ ] 接続文字列をそのままコピー＆ペースト
- [ ] パスワードが正しく設定されている
- [ ] 環境変数を保存

### 再デプロイ
- [ ] 環境変数を保存
- [ ] 再デプロイが完了するまで待つ
- [ ] ログでエラーがないか確認

### 動作確認
- [ ] ヘルスチェックで`prisma: "connected"`を確認
- [ ] エラーログにデータベース接続エラーがない
- [ ] IPv6接続エラーがない

---

## 🎯 次のステップ

1. **Supabase Dashboard**でMethodを"Shared Pooler"に変更
2. 接続文字列をコピー
3. **Render Dashboard**で`DATABASE_URL`環境変数を更新
4. 再デプロイを待つ
5. 動作確認

---

## 🔗 関連ドキュメント

- [FIX_IPV6_CONNECTION_ERROR.md](./FIX_IPV6_CONNECTION_ERROR.md) - IPv6接続エラーの修正
- [CORRECT_DATABASE_URL.md](./CORRECT_DATABASE_URL.md) - 正しいDATABASE_URLの設定
- [SUPABASE_CONNECTION_INFO.md](./SUPABASE_CONNECTION_INFO.md) - Supabase接続情報取得方法

