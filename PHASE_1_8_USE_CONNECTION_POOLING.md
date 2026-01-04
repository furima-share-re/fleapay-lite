# Phase 1.8: Connection Pooling URLの使用

**作成日**: 2026-01-04  
**エラー**: `Network is unreachable` (IPv6接続エラー)  
**原因**: SupabaseのDirect Connection URLがIPv6のみで、GitHub Actionsから接続できない

---

## ✅ 問題の分析

**エラーの意味：**
- SupabaseのDirect Connection URL（`db.snowkercpcuixnwxchkc.supabase.co`）がIPv6のみ
- GitHub ActionsのUbuntu環境からIPv6接続ができない
- 「Network is unreachable」エラーが発生

**解決策：**
- SupabaseのConnection Pooling URLを使用（IPv4対応）
- Connection Pooling URLは通常IPv4対応で、`aws-1-ap-northeast-1.pooler.supabase.com`のようなホスト名を使用

---

## 🔧 修正内容

**GitHub SecretsにConnection Pooling URLを設定：**

**Connection Pooling URLの形式：**
```
postgresql://postgres.snowkercpcuixnwxchkc:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**注意事項：**
- ポート番号: `6543`（Connection Pooling用）
- ユーザー名: `postgres.snowkercpcuixnwxchkc`（プロジェクトIDを含む）
- パスワード: URLエンコードが必要（`.cx2eeaZJ55Qp@f` → `%2Ecx2eeaZJ55Qp%40f`）

---

## 📋 次のステップ

1. **GitHub Secretsを更新**
   - GitHubリポジトリ → Settings → Secrets and variables → Actions
   - `SUPABASE_DATABASE_URL`を更新
   - Connection Pooling URLを設定

2. **ワークフローを再実行**
   - GitHub Actionsでワークフローを実行

---

## ⚠️ 注意事項

### Connection Pooling URLの制限

**`pg_restore`との互換性：**
- Connection Pooling URLは`pg_restore`と互換性がない場合があります
- `psql`でのSQLファイルインポートには使用可能

**代替方法：**
- Supabase DashboardのSQL Editorを使用
- Supabase CLIを使用

---

**まずは、GitHub SecretsにConnection Pooling URLを設定してください！**

