# Shared Poolerの選択方法

**問題**: Direct connectionがIPv4互換ではない  
**解決策**: Transaction pooler の SHARED POOLER を使用

---

## 🎯 推奨設定

### Transaction pooler → SHARED POOLER

**理由**:
- ✅ IPv4互換
- ✅ ステートレスアプリケーションに適している
- ✅ Render環境のようなWebサービスに最適
- ✅ 無料で利用可能

---

## 🔧 設定手順

### ステップ1: Methodドロップダウンで選択

現在のSupabase Dashboard画面で：

1. **Method** ドロップダウンを開く（現在「Direct connection」が選択されている）
2. **"Transaction pooler"** を選択
3. **"SHARED POOLER"** ボタンをクリック

**説明**: "Ideal for stateless applications like serverless functions where each interaction with Postgres is brief and isolated."

---

### ステップ2: 接続文字列をコピー

Methodを「Transaction pooler」→「SHARED POOLER」に変更すると、接続文字列が更新されます。

**期待される接続文字列**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**特徴**:
- ✅ ポート: `:6543`（Transaction Pooling）
- ✅ ホスト名: `aws-0-ap-northeast-1.pooler.supabase.com`（IPv4互換）
- ✅ ユーザー名: `postgres.mluvjdhqgfpcfsmvjae`（Project IDが含まれている）
- ✅ クエリパラメータ: `?pgbouncer=true`（Transaction Pooling用）

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

**新しい値（Transaction pooler - SHARED POOLER）**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**重要**: 
- `[YOUR-PASSWORD]` をSupabaseプロジェクト作成時に設定したデータベースパスワードに置き換えてください
- リージョン（`ap-northeast-1`）はプロジェクトのリージョンに合わせてください
- Supabase Dashboardから接続文字列をコピーすることを推奨します（手動で編集しない）

5. **Save** をクリック

---

## 📋 接続方式の比較

| 項目 | Direct connection | Transaction pooler (SHARED) | Session pooler (SHARED) |
|------|------------------|---------------------------|------------------------|
| **IPv4互換** | ❌ なし | ✅ あり | ✅ あり |
| **ポート** | `:5432` | `:6543` | `:6543` |
| **用途** | 永続接続 | ステートレスアプリ | Direct Connectionの代替 |
| **Render環境** | ❌ 接続不可 | ✅ 接続可能（推奨） | ✅ 接続可能 |
| **接続プーリング** | なし | Transaction Pooling | Session Pooling |
| **クエリパラメータ** | なし | `?pgbouncer=true` | `?pgbouncer=true` |

---

## ✅ チェックリスト

### Supabase Dashboard設定
- [ ] Methodドロップダウンで「Transaction pooler」を選択
- [ ] 「SHARED POOLER」ボタンをクリック
- [ ] 接続文字列をコピー
- [ ] ポート番号（`:6543`）が含まれている
- [ ] ホスト名が `aws-0-*.pooler.supabase.com` である
- [ ] クエリパラメータ `?pgbouncer=true` が含まれている

### Render環境変数
- [ ] `DATABASE_URL`をTransaction pooler接続文字列に更新
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

1. **Supabase Dashboard**でMethodを「Transaction pooler」→「SHARED POOLER」に変更
2. 接続文字列をコピー
3. **Render Dashboard**で`DATABASE_URL`環境変数を更新
4. 再デプロイを待つ
5. 動作確認

---

## 🔗 関連ドキュメント

- [USE_SHARED_POOLER.md](./USE_SHARED_POOLER.md) - Shared Poolerの使用方法
- [FIX_IPV6_CONNECTION_ERROR.md](./FIX_IPV6_CONNECTION_ERROR.md) - IPv6接続エラーの修正
- [CORRECT_DATABASE_URL.md](./CORRECT_DATABASE_URL.md) - 正しいDATABASE_URLの設定

