# Vercel環境変数エラー修正ガイド

**作成日**: 2026-01-06  
**問題**: 「環境変数の名前は予約されています。別の名前を選択してください。」

---

## 🔴 問題の原因

Vercelでは以下の環境変数名が予約されている可能性があります：

1. **`BASE_URL`** - Vercelの予約語（既に `APP_BASE_URL` に変更済み）
2. **`DATABASE_URL2`** - コードベースで使用されていない不要な環境変数

PDFを確認すると、`DATABASE_URL2` が設定されていますが、このプロジェクトでは使用されていません。不要な環境変数は削除することを推奨します。

---

## ✅ 解決方法

### 1. 環境変数名の変更

`BASE_URL` を `APP_BASE_URL` に変更してください。

**Vercel Dashboardでの設定**:

| 旧環境変数名 | 新環境変数名 | 値の例 |
|------------|------------|--------|
| `BASE_URL` | `APP_BASE_URL` | `https://app.fleapay.jp` |

### 2. コードの更新

以下のファイルで `BASE_URL` を `APP_BASE_URL` に変更しました：

- ✅ `app/api/checkout/session/route.ts`
- ✅ `app/api/seller/start_onboarding/route.ts`
- ✅ `lib/utils.ts`

### 3. Vercelの自動環境変数

Vercelでは以下の環境変数が自動的に提供されます：

- `VERCEL_URL`: 現在のデプロイメントのURL（例: `your-project.vercel.app`）
  - **注意**: プロトコル（`https://`）は含まれていません
  - コードでは自動的に `https://` を追加します
- `VERCEL_ENV`: 環境（`production`, `preview`, `development`）

コードでは、`APP_BASE_URL` が設定されていない場合、`VERCEL_URL` をフォールバックとして使用するように変更しました。

**優先順位**:
1. `APP_BASE_URL`（明示的に設定された場合）
2. `https://${VERCEL_URL}`（Vercelが自動提供）
3. `http://localhost:3000`（ローカル開発時のデフォルト）

---

## 📝 設定手順

### ステップ1: Vercel Dashboardで環境変数を更新

1. Vercel Dashboardでプロジェクトを開く
2. **Settings** > **Environment Variables** を開く
3. **以下の環境変数を削除**：
   - `BASE_URL`（既に `APP_BASE_URL` に変更済み）
   - `DATABASE_URL2`（コードで使用されていない不要な変数）
4. **新しい環境変数を追加**（まだ追加していない場合）：
   - **Key**: `APP_BASE_URL`
   - **Value**: `https://app.fleapay.jp`（または使用するドメイン）
   - **Environment**: Production, Preview, Development（必要に応じて選択）

### ステップ2: デプロイ

環境変数を更新したら、自動的に再デプロイが開始されます。

---

## 🔍 確認方法

デプロイ後、以下のエンドポイントで動作を確認できます：

```bash
# ヘルスチェック
curl https://[YOUR_DOMAIN]/api/ping

# チェックアウトセッション作成（テスト）
curl -X POST https://[YOUR_DOMAIN]/api/checkout/session \
  -H "Content-Type: application/json" \
  -d '{"sellerId": "test-seller"}'
```

---

## ⚠️ 注意事項

1. **カスタムドメインを使用する場合**: `APP_BASE_URL` にカスタムドメインを設定してください
2. **プレビュー環境**: プレビュー環境では `VERCEL_URL` が自動的に使用されるため、`APP_BASE_URL` の設定は任意です
3. **本番環境**: 本番環境では `APP_BASE_URL` を明示的に設定することを推奨します

---

## 📚 参考

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel System Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables#system-environment-variables)

---

**最終更新**: 2026-01-06

