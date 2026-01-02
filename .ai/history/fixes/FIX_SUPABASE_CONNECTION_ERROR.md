# Supabase接続エラーの修正

**エラー内容**: `getaddrinfo ENOTFOUND db.mluvjdhqgfpcfsmvjae.supabase.co`  
**確認日時**: 2026-01-02

---

## 🔍 現在の状態

### ✅ 正常に動作している項目

1. **Prismaスキーマの修正**: ✅ 完了
   - `KidsAchievement`モデルの複合主キー定義を修正
   - `prisma generate`が正常に実行された

2. **ビルド**: ✅ 成功
   - ビルドが正常に完了
   - サーバーが起動している

### ❌ エラーが発生している項目

1. **データベース接続エラー**: `getaddrinfo ENOTFOUND db.mluvjdhqgfpcfsmvjae.supabase.co`
   - Supabaseデータベースに接続できない

---

## 🔧 原因の可能性

1. **接続文字列の形式が間違っている**
   - ポート番号が含まれていない
   - 接続文字列の形式が正しくない

2. **ホスト名が間違っている**
   - Project IDが間違っている
   - 接続文字列のホスト名が正しくない

3. **パスワードが間違っている**
   - パスワードが正しく設定されていない
   - 特殊文字がURLエンコードされていない

4. **Supabaseのデータベースが起動していない**
   - プロジェクトが一時停止している
   - データベースが起動していない

---

## ✅ 修正手順

### ステップ1: Supabase接続文字列の確認

Supabase Dashboardで正しい接続文字列を取得：

1. **Supabase Dashboard**にログイン
2. プロジェクト `edo ichiba staging` を選択
3. **Settings** → **Database** を開く
4. **Connection string** セクションを確認

**接続文字列の形式（2種類）**:

#### 形式1: 直接接続（推奨）
```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

#### 形式2: Connection Pooling（高負荷時）
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**重要**: 
- `[YOUR-PASSWORD]` をプロジェクト作成時に設定したデータベースパスワードに置き換えてください
- ポート番号（`:5432` または `:6543`）が含まれていることを確認してください

---

### ステップ2: Render環境変数の更新

1. **Render Dashboard**にログイン
2. `fleapay-lite-t1` サービスを選択
3. **Environment** タブを開く
4. `DATABASE_URL` 環境変数を編集

**現在の値（確認）**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

**確認ポイント**:
- ✅ ポート番号（`:5432`）が含まれている
- ✅ パスワードが正しく設定されている
- ✅ ホスト名が正しい（`db.mluvjdhqgfpcfsmvjae.supabase.co`）

**もしポート番号が含まれていない場合**:
- 接続文字列の末尾に `:5432` を追加

**例**:
```
# 間違い
postgresql://postgres:password@db.mluvjdhqgfpcfsmvjae.supabase.co/postgres

# 正しい
postgresql://postgres:password@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

5. **Save** をクリック

---

### ステップ3: Supabaseプロジェクトの状態確認

1. **Supabase Dashboard** → プロジェクト `edo ichiba staging`
2. **Settings** → **General** を開く
3. プロジェクトの状態を確認

**確認ポイント**:
- ✅ プロジェクトがアクティブである
- ✅ データベースが起動している
- ✅ 一時停止していない

---

### ステップ4: 接続文字列の再確認

Supabase Dashboardで接続文字列を再取得：

1. **Settings** → **Database** → **Connection string**
2. **URI** タブを選択
3. 接続文字列をコピー
4. Render環境変数に貼り付け

**注意**: 接続文字列には以下の形式が含まれていることを確認：
- `postgresql://` で始まる
- ポート番号（`:5432` または `:6543`）が含まれている
- パスワードが正しく設定されている

---

### ステップ5: 再デプロイの確認

環境変数を保存すると、Renderが自動的に再デプロイを開始します。

1. **Events** または **Logs** タブを開く
2. デプロイが完了するまで待つ（通常2-5分）
3. ログでエラーがないか確認

---

### ステップ6: 動作確認

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

---

## 🐛 トラブルシューティング

### 問題1: 接続文字列を更新してもエラーが続く

**確認事項**:
- 接続文字列にポート番号が含まれているか
- パスワードが正しいか
- ホスト名が正しいか

**対処方法**:
1. Supabase Dashboardで接続文字列を再取得
2. 接続文字列をそのままコピー＆ペースト（手動で編集しない）
3. 環境変数を保存
4. 再デプロイ

### 問題2: ホスト名が見つからない

**確認事項**:
- Project IDが正しいか（`mluvjdhqgfpcfsmvjae`）
- 接続文字列の形式が正しいか

**対処方法**:
1. Supabase Dashboardで接続文字列を再確認
2. Project IDが正しいか確認
3. 接続文字列をそのままコピー＆ペースト

### 問題3: パスワードエラー

**確認事項**:
- パスワードが正しいか
- 特殊文字がURLエンコードされているか

**対処方法**:
1. Supabase Dashboardでパスワードを再確認
2. 特殊文字が含まれる場合は、URLエンコードが必要な場合があります
3. 接続文字列をそのままコピー＆ペースト（Supabase Dashboardから）

---

## 📋 チェックリスト

### Supabase接続文字列
- [ ] Supabase Dashboardで接続文字列を取得
- [ ] ポート番号（`:5432`）が含まれている
- [ ] パスワードが正しく設定されている
- [ ] ホスト名が正しい

### Render環境変数
- [ ] `DATABASE_URL`をSupabase接続文字列に更新
- [ ] 接続文字列をそのままコピー＆ペースト
- [ ] 環境変数を保存

### Supabaseプロジェクト
- [ ] プロジェクトがアクティブである
- [ ] データベースが起動している

### 再デプロイ
- [ ] 環境変数を保存
- [ ] 再デプロイが完了するまで待つ
- [ ] ログでエラーがないか確認

### 動作確認
- [ ] ヘルスチェックで`prisma: "connected"`を確認
- [ ] エラーログにデータベース接続エラーがない

---

## 🔗 関連ドキュメント

- [SUPABASE_CONNECTION_INFO.md](./SUPABASE_CONNECTION_INFO.md) - Supabase接続情報取得方法
- [FIX_RENDER_DATABASE_CONNECTION.md](./FIX_RENDER_DATABASE_CONNECTION.md) - データベース接続エラーの修正
- [FIX_PRISMA_SCHEMA_ERROR.md](./FIX_PRISMA_SCHEMA_ERROR.md) - Prismaスキーマエラーの修正

