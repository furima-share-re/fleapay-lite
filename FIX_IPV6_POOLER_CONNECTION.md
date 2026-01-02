# IPv6接続エラーの修正（Transaction Pooler）

**更新日**: 2026-01-02

---

## 🔴 現在のエラー

```
DB init error Error: connect ENETUNREACH 2406:da14:271:990e:700c:1843:6a5d:7a0b:6543
```

**問題点**:
- ✅ Transaction pooler（ポート6543）を使用している
- ❌ しかし、IPv6アドレスに接続しようとしている
- ❌ Render環境はIPv4ネットワークのため、IPv6アドレスに接続できない

---

## 🎯 解決策

接続文字列のホスト名がIPv6アドレスに解決されている可能性があります。**IPv4互換のホスト名を使用する接続文字列に更新**する必要があります。

---

## 🔧 修正手順

### ステップ1: Supabase Dashboardで接続文字列を再取得

1. **Supabase Dashboard**にログイン
2. プロジェクト `edo ichiba staging` を選択
3. **Settings** → **Database** を開く
4. **Connection string** セクションを確認
5. **Method** ドロップダウンで以下を確認：
   - ✅ **"Transaction pooler"** が選択されている
   - ✅ **"SHARED POOLER"** ボタンが選択されている

### ステップ2: 接続文字列の確認

**期待される接続文字列の形式**:

```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**確認ポイント**:
- ✅ ホスト名が `aws-0-*.pooler.supabase.com` 形式である（IPv4互換）
- ✅ ポート番号が `:6543` である
- ✅ クエリパラメータ `?pgbouncer=true` が含まれている
- ❌ IPv6アドレス（`2406:da14:...`）が含まれていない

**重要**: 接続文字列にIPv6アドレスが含まれている場合、またはホスト名がIPv6アドレスに解決される場合は、Supabaseサポートに問い合わせるか、別のリージョンのプーラーを使用する必要があります。

### ステップ3: 接続文字列をコピー

Supabase Dashboardから接続文字列をコピーします。

**注意**: 
- 接続文字列全体をコピーしてください
- パスワード部分（`[YOUR-PASSWORD]`）が正しく設定されていることを確認してください

### ステップ4: Render環境変数を更新

1. **Render Dashboard**にログイン
2. `fleapay-lite-t1` サービスを選択
3. **Environment** タブを開く
4. `DATABASE_URL` 環境変数を編集

**現在の値（削除）**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true
```

**新しい値（Supabase Dashboardからコピー）**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**重要**: 
- `[YOUR-PASSWORD]` をSupabaseプロジェクト作成時に設定したデータベースパスワードに置き換えてください
- リージョン（`ap-northeast-1`）はプロジェクトのリージョンに合わせてください
- 接続文字列をそのままコピー＆ペーストしてください（手動で編集しない）

5. **Save** をクリック

### ステップ5: 再デプロイ

1. 環境変数を保存すると、自動的に再デプロイが開始されます
2. **Logs** タブでデプロイの進行状況を確認
3. エラーログに以下がないことを確認：
   - ❌ `ENETUNREACH` エラー
   - ❌ IPv6アドレスへの接続エラー
   - ✅ `Database: Connected` が表示される

---

## 🔍 トラブルシューティング

### 問題1: 接続文字列にIPv6アドレスが含まれている

**症状**: Supabase Dashboardからコピーした接続文字列にIPv6アドレスが含まれている

**解決策**:
1. Supabase Dashboardで「Transaction pooler」→「SHARED POOLER」を再選択
2. 接続文字列を再取得
3. ホスト名が `aws-0-*.pooler.supabase.com` 形式であることを確認

### 問題2: ホスト名がIPv6アドレスに解決される

**症状**: 接続文字列のホスト名は正しいが、DNS解決でIPv6アドレスが返される

**解決策**:
1. Supabaseサポートに問い合わせる
2. 別のリージョンのプーラーを使用する（可能な場合）
3. 一時的にDirect connectionを使用する（IPv4互換の場合）

### 問題3: 接続文字列が正しいが、まだIPv6エラーが発生する

**症状**: 接続文字列は正しいが、まだ `ENETUNREACH` エラーが発生する

**解決策**:
1. Render環境変数の `DATABASE_URL` を再確認
2. 接続文字列に余分なスペースや改行が含まれていないことを確認
3. パスワードが正しく設定されていることを確認
4. 再デプロイを実行

---

## 📋 チェックリスト

### Supabase Dashboard設定
- [ ] Methodドロップダウンで「Transaction pooler」を選択
- [ ] 「SHARED POOLER」ボタンをクリック
- [ ] 接続文字列をコピー
- [ ] ホスト名が `aws-0-*.pooler.supabase.com` 形式である
- [ ] ポート番号（`:6543`）が含まれている
- [ ] クエリパラメータ `?pgbouncer=true` が含まれている
- [ ] IPv6アドレスが含まれていない

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
- [ ] ヘルスチェックで`Database: Connected`を確認
- [ ] エラーログにデータベース接続エラーがない
- [ ] IPv6接続エラーがない

---

## 🎯 次のステップ

1. **Supabase Dashboard**で接続文字列を再取得
2. **Render Dashboard**で`DATABASE_URL`環境変数を更新
3. 再デプロイを待つ
4. 動作確認

---

## 🔗 関連ドキュメント

- [SELECT_SHARED_POOLER.md](./SELECT_SHARED_POOLER.md) - Shared Poolerの選択方法
- [USE_SHARED_POOLER.md](./USE_SHARED_POOLER.md) - Shared Poolerの使用方法
- [FIX_IPV6_CONNECTION_ERROR.md](./FIX_IPV6_CONNECTION_ERROR.md) - IPv6接続エラーの修正
- [CORRECT_DATABASE_URL.md](./CORRECT_DATABASE_URL.md) - 正しいDATABASE_URLの設定

