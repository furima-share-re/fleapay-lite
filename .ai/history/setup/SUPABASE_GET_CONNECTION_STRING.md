# Supabase接続文字列の取得方法

現在、**Database Settings** 画面にいます。接続文字列を取得するには、以下の手順を実行してください。

## 🔍 接続文字列の取得手順

### 方法1: Connection stringセクションから取得（推奨）

1. 現在の **Database Settings** 画面で、ページを下にスクロール
2. **Connection string** または **Connection info** セクションを探す
3. 以下のいずれかのタブを選択：
   - **URI** タブ（推奨）
   - **JDBC** タブ
   - **Node.js** タブ
   - **psql** タブ

4. 表示された接続文字列をコピー

**URI形式の例**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

または

```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

### 方法2: Connection pooling設定から確認

現在の画面で確認できる情報：
- **Pool Size**: 15 connections（Microプラン）
- **Max Client Connections**: 200 clients
- **Connection pooling**: SHARED/DEDICATED POOLER

**重要**: 
- **Dedicated Pooler** を使用する場合: ポート `6543` を使用
- **Direct connection** を使用する場合: ポート `5432` を使用

### 方法3: 接続文字列を手動で構築

以下の情報を組み合わせて接続文字列を作成：

**Dedicated Pooler（推奨）**:
```
postgresql://postgres.mluvjdhqgfpcfsmvjae:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**Direct connection**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

**必要な情報**:
- **Project ID**: `mluvjdhqgfpcfsmvjae`（既に確認済み）
- **Database Password**: プロジェクト作成時に設定したパスワード
- **Region**: `ap-northeast-1`（Tokyo）または `ap-southeast-1`（Singapore）

---

## 📋 確認済み情報

- **プロジェクト名**: `edo ichiba staging`
- **Project ID**: `mluvjdhqgfpcfsmvjae`
- **プラン**: PRO / Micro
- **Pool Size**: 15 connections
- **Max Client Connections**: 200 clients

---

## 🔑 データベースパスワードについて

### パスワードを忘れた場合

1. 現在の **Database Settings** 画面で **Reset database password** をクリック
2. 新しいパスワードを設定
3. **重要**: 新しいパスワードを安全に保管

**注意**: パスワードをリセットすると、既存の接続が切断される可能性があります。

### パスワードの確認方法

- プロジェクト作成時に設定したパスワードを使用
- パスワードマネージャーに保存していないか確認
- チームメンバーに確認（共有している場合）

---

## 🔧 接続文字列の使用例

### 環境変数として設定

```env
# 検証環境（staging）
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres
```

### psqlで接続テスト

```powershell
# PowerShell
$env:DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.mluvjdhqgfpcfsmvjae.supabase.co:5432/postgres"
psql $env:DATABASE_URL -c "SELECT version();"
```

接続できれば、PostgreSQLのバージョン情報が表示されます。

---

## 📝 次のステップ

接続文字列を取得したら：

1. **API Keysの取得**
   - Settings > API を開く
   - `anon` `public` key と `service_role` `secret` key を取得

2. **環境変数の設定**
   - Render Dashboardで環境変数を設定
   - ローカル `.env` ファイルを更新

3. **接続テスト**
   - `psql` または Prisma で接続を確認

---

## 🔗 関連リンク

- **Database Settings**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/database/settings
- **Connection string**: Database Settings画面の下の方に表示されているはずです
- **API Settings**: https://supabase.com/dashboard/project/mluvjdhqgfpcfsmvjae/settings/api

---

## ⚠️ 注意事項

1. **パスワードの管理**
   - データベースパスワードは安全に保管してください
   - Gitにコミットしないでください
   - パスワードマネージャーの使用を推奨します

2. **接続方式の選択**
   - **Dedicated Pooler**（ポート6543）: 接続プーリングを使用（推奨）
   - **Direct connection**（ポート5432）: 直接接続

3. **SSL設定**
   - 本番環境では **Enforce SSL** を有効にすることを推奨

---

**次のアクション**: Database Settings画面を下にスクロールして、**Connection string** セクションを探してください。

