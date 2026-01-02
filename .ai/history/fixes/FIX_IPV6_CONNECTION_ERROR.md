# IPv6接続エラーの修正

**エラー内容**: `connect ENETUNREACH 2406:da14:271:990e:700c:1843:6a5d:7a0b:5432`  
**確認日時**: 2026-01-02

---

## 🔍 問題の原因

接続文字列がIPv6アドレスを返しているが、Render環境からIPv6接続ができない可能性があります。

**エラー詳細**:
- エラーコード: `ENETUNREACH`
- アドレス: `2406:da14:271:990e:700c:1843:6a5d:7a0b`（IPv6）
- ポート: `5432`

---

## ✅ 解決方法

### 方法1: Connection Poolingを使用（推奨）

Connection Poolingは通常IPv4アドレスを使用するため、この問題を回避できます。

**接続文字列の形式**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**特徴**:
- ポート: `6543`（Connection Pooling）
- ホスト名: `aws-0-ap-northeast-1.pooler.supabase.com`（IPv4）
- 接続プーリングにより、高負荷時にも安定

---

### 方法2: 接続文字列にIPv4を強制

接続文字列に`?options=--ipv4`を追加する方法もありますが、Supabaseでは通常Connection Poolingを使用することを推奨します。

---

## 🔧 修正手順

### ステップ1: Supabase DashboardでConnection Pooling接続文字列を取得

1. **Supabase Dashboard**にログイン
2. プロジェクト `edo ichiba staging` を選択
3. **Settings** → **Database** を開く
4. **Connection string** セクションを確認
5. **Connection Pooling** タブを選択（または **URI** タブでConnection Pooling形式を確認）
6. 接続文字列をコピー

**期待される形式**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**確認ポイント**:
- ✅ ポート番号: `:6543`（Connection Pooling）
- ✅ ホスト名: `aws-0-*.pooler.supabase.com`（IPv4）
- ✅ ユーザー名: `postgres.mluvjdhqgfpcfsmvjae`（Project IDが含まれている）

---

### ステップ2: Render環境変数を更新

1. **Render Dashboard**にログイン
2. `fleapay-lite-t1` サービスを選択
3. **Environment** タブを開く
4. `DATABASE_URL` 環境変数を編集

**現在の値（削除）**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

**新しい値（Connection Pooling）**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**重要**: 
- `[YOUR-PASSWORD]` をSupabaseプロジェクト作成時に設定したデータベースパスワードに置き換えてください
- リージョン（`ap-northeast-1`）はプロジェクトのリージョンに合わせてください
- Supabase Dashboardから接続文字列をコピーすることを推奨します

5. **Save** をクリック

---

### ステップ3: 再デプロイの確認

環境変数を保存すると、Renderが自動的に再デプロイを開始します。

1. **Events** または **Logs** タブを開く
2. デプロイが完了するまで待つ（通常2-5分）
3. ログでエラーがないか確認

---

### ステップ4: 動作確認

再デプロイ完了後、以下で確認：

```powershell
# ヘルスチェック
$response = Invoke-WebRequest -Uri "https://fleapay-lite-t1.onrender.com/api/ping" -UseBasicParsing
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**期待される応答**:
```json
{
  "ok": true,
  "timestamp": "2026-01-02T...",
  "version": "3.2.0-seller-summary-fixed",
  "prisma": "connected"
}
```

**確認ポイント**:
- ✅ `prisma: "connected"` が含まれている
- ✅ エラーログにデータベース接続エラーがない
- ✅ IPv6接続エラーがない

---

## 📋 接続文字列の比較

| 項目 | 直接接続（IPv6エラー） | Connection Pooling（推奨） |
|------|---------------------|-------------------------|
| **ユーザー名** | `postgres` | `postgres.mluvjdhqgfpcfsmvjae` |
| **ホスト名** | `db.mluvjdhqgfpcfsmvjae.supabase.co` | `aws-0-ap-northeast-1.pooler.supabase.com` |
| **ポート** | `:5432` | `:6543` |
| **アドレス** | IPv6（問題あり） | IPv4（推奨） |
| **接続プーリング** | なし | あり（高負荷時にも安定） |

---

## ✅ チェックリスト

### Connection Pooling接続文字列
- [ ] Supabase DashboardでConnection Pooling接続文字列を取得
- [ ] ポート番号（`:6543`）が含まれている
- [ ] ホスト名が `aws-0-*.pooler.supabase.com` である
- [ ] パスワードが正しく設定されている

### Render環境変数
- [ ] `DATABASE_URL`をConnection Pooling接続文字列に更新
- [ ] 接続文字列をそのままコピー＆ペースト
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

## 🔗 関連ドキュメント

- [CORRECT_DATABASE_URL.md](./CORRECT_DATABASE_URL.md) - 正しいDATABASE_URLの設定
- [FIX_SUPABASE_CONNECTION_ERROR.md](./FIX_SUPABASE_CONNECTION_ERROR.md) - 接続エラーの修正
- [SUPABASE_CONNECTION_INFO.md](./SUPABASE_CONNECTION_INFO.md) - Supabase接続情報取得方法

