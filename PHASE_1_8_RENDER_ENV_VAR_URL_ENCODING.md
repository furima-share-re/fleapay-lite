# Phase 1.8: Render環境変数設定でのURLエンコード

**作成日**: 2026-01-04  
**質問**: Renderの環境変数設定でURLエンコードが必要か？

---

## ✅ 回答

**はい、URLエンコードが必要です。**

特に、パスワードに `@` が含まれている場合は**必須**です。

---

## 🔍 理由

### 1. PostgreSQL接続文字列の形式

PostgreSQLの接続文字列（URL形式）は以下の形式です：

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

**問題点**:
- `@` は接続文字列の区切り文字として使われます
- パスワードに `@` が含まれている場合、接続文字列パーサーが正しく解釈できません

### 2. 特殊文字のURLエンコード

以下の文字はURLエンコードが必要です：

| 文字 | URLエンコード後 | 理由 |
|------|----------------|------|
| `.` | `%2E` | ドメイン名の区切り文字と混同される可能性 |
| `@` | `%40` | **必須** - 接続文字列の区切り文字 |
| `:` | `%3A` | ポート番号の区切り文字と混同される可能性 |
| `/` | `%2F` | パスの区切り文字と混同される可能性 |
| `#` | `%23` | フラグメントの区切り文字と混同される可能性 |
| `?` | `%3F` | クエリパラメータの区切り文字と混同される可能性 |

---

## 📋 現在のパスワード

**元のパスワード**: `.cx2eeaZJ55Qp@f`

**含まれる特殊文字**:
- `.` (ドット)
- `@` (アットマーク) ← **特に重要**

---

## ✅ 正しい接続文字列

### 方法1: URLエンコードを使用（推奨）

**パスワードをURLエンコード**:
- `.` → `%2E`
- `@` → `%40`

**エンコード後のパスワード**: `%2Ecx2eeaZJ55Qp%40f`

**正しい接続文字列**:
```
postgresql://postgres.snowkercpcuixnwxchkc:%2Ecx2eeaZJ55Qp%40f@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

---

### 方法2: 環境変数で個別に設定（代替方法）

Renderの環境変数で個別に設定する場合：

```
PGHOST=aws-1-ap-northeast-1.pooler.supabase.com
PGPORT=6543
PGUSER=postgres.snowkercpcuixnwxchkc
PGPASSWORD=.cx2eeaZJ55Qp@f
PGDATABASE=postgres
```

**注意**: この方法は、アプリケーションが個別の環境変数を読み取る必要があります。

---

## 🔧 Render環境変数設定手順

### Step 1: パスワードをURLエンコード

**PowerShellでエンコード**:
```powershell
$password = ".cx2eeaZJ55Qp@f"
Add-Type -AssemblyName System.Web
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
Write-Host "エンコードされたパスワード: $encodedPassword"
```

**期待される出力**:
```
エンコードされたパスワード: .cx2eeaZJ55Qp%40f
```

**注意**: PowerShellの`UrlEncode`は`.`をエンコードしない場合があります。手動で確認してください。

**手動エンコード**:
- `.` → `%2E`
- `@` → `%40`

**完全にエンコードされたパスワード**: `%2Ecx2eeaZJ55Qp%40f`

---

### Step 2: Render Dashboardで環境変数を設定

1. **Render Dashboardにログイン**
   - https://dashboard.render.com

2. **サービスを選択**
   - `fleapay-lite-web`（本番環境）

3. **Environmentタブを開く**

4. **`DATABASE_URL`環境変数を編集**

5. **接続文字列を設定**:
   ```
   postgresql://postgres.snowkercpcuixnwxchkc:%2Ecx2eeaZJ55Qp%40f@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
   ```

6. **Save Changesをクリック**

7. **再デプロイ**
   - 環境変数を保存すると、自動的に再デプロイが開始されます

---

## ⚠️ よくある間違い

### ❌ 間違い1: URLエンコードなし

```
postgresql://postgres.snowkercpcuixnwxchkc:.cx2eeaZJ55Qp@f@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**問題点**:
- `@` が2つあるため、接続文字列パーサーが正しく解釈できない
- パスワードが `.cx2eeaZJ55Qp` と解釈され、`f@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres` がホスト名として解釈される

**エラー例**:
```
Error: could not translate host name "f@aws-1-ap-northeast-1.pooler.supabase.com"
```

---

### ❌ 間違い2: 一部のみエンコード

```
postgresql://postgres.snowkercpcuixnwxchkc:.cx2eeaZJ55Qp%40f@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**問題点**:
- `.` がエンコードされていない
- 一部の環境では問題が発生する可能性がある

---

### ✅ 正しい: 完全にエンコード

```
postgresql://postgres.snowkercpcuixnwxchkc:%2Ecx2eeaZJ55Qp%40f@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**確認ポイント**:
- ✅ `.` → `%2E`
- ✅ `@` → `%40`
- ✅ 接続文字列に `@` が1つだけ（ユーザー名とパスワードの区切り）

---

## 🔍 動作確認

### 接続テスト

**PowerShellで接続テスト**:
```powershell
# 接続文字列を設定
$connectionString = "postgresql://postgres.snowkercpcuixnwxchkc:%2Ecx2eeaZJ55Qp%40f@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"

# psqlで接続テスト
psql $connectionString -c "SELECT version();"
```

**期待される結果**:
- PostgreSQLのバージョン情報が表示される
- エラーが発生しない

---

## 📋 チェックリスト

### Render環境変数設定

- [ ] パスワードをURLエンコード済み
  - [ ] `.` → `%2E`
  - [ ] `@` → `%40`
- [ ] 接続文字列に `@` が1つだけ（ユーザー名とパスワードの区切り）
- [ ] 接続文字列の形式が正しい
  - [ ] `postgresql://` で始まる
  - [ ] ユーザー名が正しい（`postgres.snowkercpcuixnwxchkc`）
  - [ ] パスワードがエンコードされている
  - [ ] ホスト名が正しい（`aws-1-ap-northeast-1.pooler.supabase.com`）
  - [ ] ポート番号が正しい（`6543`）
  - [ ] データベース名が正しい（`postgres`）
- [ ] Render Dashboardで環境変数を保存
- [ ] 再デプロイが完了
- [ ] 接続テストが成功

---

## 🎯 結論

**Renderの環境変数設定では、URLエンコードが必要です。**

特に、パスワードに `@` が含まれている場合は**必須**です。

**正しい接続文字列**:
```
postgresql://postgres.snowkercpcuixnwxchkc:%2Ecx2eeaZJ55Qp%40f@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**設定手順**:
1. パスワードをURLエンコード（`.cx2eeaZJ55Qp@f` → `%2Ecx2eeaZJ55Qp%40f`）
2. Render Dashboardで環境変数を設定
3. 再デプロイ
4. 接続テスト

---

**まずは、URLエンコードされた接続文字列をRender Dashboardで設定してください！**





