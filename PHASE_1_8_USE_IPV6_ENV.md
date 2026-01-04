# Phase 1.8: IPv6アドレスを環境変数として使用

**作成日**: 2026-01-04  
**問題**: DNS解決ではIPv6アドレスのみが返されるが、`psql`がIPv4アドレスを探している  
**解決方法**: IPv6アドレスを環境変数として設定

---

## ✅ 解決方法: IPv6アドレスを環境変数として設定

**IPv6アドレスを環境変数として設定：**

```powershell
# Step 1: 環境変数を設定
$env:PGPASSWORD = ".cx2eeaZJ55Qp@f"
$env:PGHOST = "2406:da14:271:990e:700c:1843:6a5d:7a0b"  # IPv6アドレスを直接指定
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGDATABASE = "postgres"

# Step 2: 接続テスト
psql -c "SELECT version();"

# Step 3: データインポート
pg_restore -d $env:PGDATABASE --verbose --clean --no-owner --no-privileges .
```

---

## 📋 完全なコマンド（コピペで実行）

```powershell
# Step 1: 環境変数を設定（IPv6アドレスを直接指定）
$env:PGPASSWORD = ".cx2eeaZJ55Qp@f"
$env:PGHOST = "2406:da14:271:990e:700c:1843:6a5d:7a0b"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGDATABASE = "postgres"

# Step 2: 接続テスト
psql -c "SELECT version();"

# Step 3: データインポート
pg_restore -d $env:PGDATABASE --verbose --clean --no-owner --no-privileges .
```

---

## ⚠️ トラブルシューティング

### エラー1: IPv6接続が失敗する場合

**対処方法：**
- IPv6接続が有効になっているか確認
- ファイアウォール設定を確認
- Supabase Dashboardから接続文字列を直接コピー

---

### エラー2: ネットワーク接続エラー

**対処方法：**
- IPv6接続が利用できない可能性があります
- Supabase Dashboardから接続文字列を直接コピーしてください
- または、別の方法（例：Supabase CLI、またはSupabase DashboardのSQL Editorを使用）を検討してください

---

## 🔄 代替方法: Supabase Dashboardから接続文字列を直接コピー

**Supabase Dashboardから接続文字列を直接コピーして使用：**

1. **Supabase Dashboard**にログイン
2. **プロジェクト `mluvjdhqgfpcefsmvjae`** を選択
3. **Settings** → **Database** を開く
4. **Connection string** セクションを確認
5. **URI** タブの **Direct Connection** を確認
6. **接続文字列をコピー**
7. **PowerShellで、パスワード部分を置き換え**

**これが最も確実な方法です！**

---

**まずは、IPv6アドレスを環境変数として設定して接続テストを実行してください！**

