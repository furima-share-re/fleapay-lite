# URL リスト - 動作確認用

**対象サイト**: https://edo-ichiba.com/  
**作成日**: 2025 年 1 月  
**用途**: 動作確認・テスト用

---

## 📄 ページ一覧

### トップ・基本ページ

| URL                              | 説明                 | 備考       |
| -------------------------------- | -------------------- | ---------- |
| `https://edo-ichiba.com/`        | トップページ         | Next.js 版 |
| `https://edo-ichiba.com/success` | 決済成功ページ       | 多言語対応 |
| `https://edo-ichiba.com/thanks`  | サンクスページ       |            |
| `https://edo-ichiba.com/cancel`  | 決済キャンセルページ | 多言語対応 |

### 出店者関連ページ

| URL                                               | 説明                            | パラメータ      | 備考                              |
| ------------------------------------------------- | ------------------------------- | --------------- | --------------------------------- |
| `https://edo-ichiba.com/seller-dashboard.html`    | 出店者ダッシュボード（HTML 版） | `?s={sellerId}` | 売上サマリー、取引履歴、QR コード |
| `https://edo-ichiba.com/seller-purchase-standard` | 出店者購入画面（標準版）        | `?s={sellerId}` | カメラ、AI 解析、QR コード決済    |
| `https://edo-ichiba.com/seller-register`          | 出店者登録ページ                |                 | React Hook Form + Zod             |
| `https://edo-ichiba.com/kids-dashboard`           | Kids ダッシュボード             | `?s={sellerId}` | Kids プラン専用                   |
| `https://edo-ichiba.com/kids-dashboard-mock`      | Kids ダッシュボード（モック）   |                 |                                   |

### 決済・チェックアウト

| URL                                            | 説明                            | パラメータ                      | 備考                     |
| ---------------------------------------------- | ------------------------------- | ------------------------------- | ------------------------ |
| `https://edo-ichiba.com/checkout`              | チェックアウトページ            | `?s={sellerId}&order={orderId}` | 多言語対応、自動リトライ |
| `https://edo-ichiba.com/checkout.html`         | チェックアウトページ（HTML 版） |                                 |                          |
| `https://edo-ichiba.com/checkout-matsuri.html` | チェックアウトページ（祭り版）  |                                 |                          |

### オンボーディング

| URL                                          | 説明                       | 備考 |
| -------------------------------------------- | -------------------------- | ---- |
| `https://edo-ichiba.com/onboarding/complete` | オンボーディング完了ページ |      |
| `https://edo-ichiba.com/onboarding/refresh`  | オンボーディング更新ページ |      |

### 管理者ページ

| URL                                      | 説明                 | 備考 |
| ---------------------------------------- | -------------------- | ---- |
| `https://edo-ichiba.com/admin/dashboard` | 管理者ダッシュボード |      |
| `https://edo-ichiba.com/admin/sellers`   | 出店者管理           |      |
| `https://edo-ichiba.com/admin/frames`    | AI フレーム管理      |      |
| `https://edo-ichiba.com/admin/payments`  | 決済管理             |      |
| `https://edo-ichiba.com/admin/frames`    | フレーム管理         |      |

### おみくじ関連ページ

| URL                                                  | 説明                          | 備考 |
| ---------------------------------------------------- | ----------------------------- | ---- |
| `https://edo-ichiba.com/omikuji`                     | おみくじ（基本版）            |      |
| `https://edo-ichiba.com/omikuji/result`              | おみくじ結果                  |      |
| `https://edo-ichiba.com/omikuji/shake`               | おみくじ振る                  |      |
| `https://edo-ichiba.com/omikuji-enhanced/phase1`     | おみくじ Enhanced Phase 1     |      |
| `https://edo-ichiba.com/omikuji-enhanced/phase2`     | おみくじ Enhanced Phase 2     |      |
| `https://edo-ichiba.com/omikuji-enhanced/phase3`     | おみくじ Enhanced Phase 3     |      |
| `https://edo-ichiba.com/omikuji-enhanced/phase4`     | おみくじ Enhanced Phase 4     |      |
| `https://edo-ichiba.com/omikuji-edo/phase1`          | おみくじ EDO Phase 1          |      |
| `https://edo-ichiba.com/omikuji-edo/phase2`          | おみくじ EDO Phase 2          |      |
| `https://edo-ichiba.com/omikuji-edo/phase3`          | おみくじ EDO Phase 3          |      |
| `https://edo-ichiba.com/omikuji-edo-enhanced/phase1` | おみくじ EDO Enhanced Phase 1 |      |
| `https://edo-ichiba.com/omikuji-edo-enhanced/phase2` | おみくじ EDO Enhanced Phase 2 |      |
| `https://edo-ichiba.com/omikuji-edo-enhanced/phase3` | おみくじ EDO Enhanced Phase 3 |      |
| `https://edo-ichiba.com/omikuji-fm`                  | おみくじ FM                   |      |
| `https://edo-ichiba.com/omikuji-fm/result`           | おみくじ FM 結果              |      |
| `https://edo-ichiba.com/omikuji-fm/shake`            | おみくじ FM 振る              |      |
| `https://edo-ichiba.com/omikuji-mock`                | おみくじ モック               |      |
| `https://edo-ichiba.com/omikuji-mock/result`         | おみくじ モック 結果          |      |
| `https://edo-ichiba.com/omikuji-mock/shake`          | おみくじ モック 振る          |      |
| `https://edo-ichiba.com/omikuji-r3f`                 | おみくじ R3F                  |      |
| `https://edo-ichiba.com/omikuji-r3f/result`          | おみくじ R3F 結果             |      |
| `https://edo-ichiba.com/omikuji-r3f/shake`           | おみくじ R3F 振る             |      |
| `https://edo-ichiba.com/omikuji-theatre`             | おみくじ Theatre              |      |
| `https://edo-ichiba.com/omikuji-theatre/result`      | おみくじ Theatre 結果         |      |
| `https://edo-ichiba.com/omikuji-theatre/shake`       | おみくじ Theatre 振る         |      |

### EDO ICHIBA 関連

| URL                                 | 説明                      | 備考       |
| ----------------------------------- | ------------------------- | ---------- |
| `https://edo-ichiba.com/edo-ichiba` | EDO ICHIBA デザイン仕様書 | 江戸強化版 |

---

## 🔌 API エンドポイント一覧

### ヘルスチェック・デバッグ

| メソッド | URL                                              | 説明            | 備考 |
| -------- | ------------------------------------------------ | --------------- | ---- |
| GET      | `https://edo-ichiba.com/api/ping`                | ヘルスチェック  |      |
| GET      | `https://edo-ichiba.com/api/debug/db-status`     | DB 状態確認     |      |
| GET      | `https://edo-ichiba.com/api/debug/helicone`      | Helicone 確認   |      |
| GET      | `https://edo-ichiba.com/api/debug/helicone-test` | Helicone テスト |      |

### 出店者関連 API

| メソッド | URL                                                   | 説明                   | パラメータ                        | 備考       |
| -------- | ----------------------------------------------------- | ---------------------- | --------------------------------- | ---------- |
| GET      | `https://edo-ichiba.com/api/seller/summary`           | 売上サマリー取得       | `?s={sellerId}`                   |            |
| GET      | `https://edo-ichiba.com/api/seller/kids-summary`      | Kids サマリー取得      | `?s={sellerId}`                   |            |
| GET      | `https://edo-ichiba.com/api/seller/analytics`         | 売上分析               | `?s={sellerId}&period={period}`   |            |
| GET      | `https://edo-ichiba.com/api/seller/check-id`          | 出店者 ID 確認         | `?id={id}`                        |            |
| GET      | `https://edo-ichiba.com/api/seller/tier-status`       | Tier（ランク）情報取得 | `?s={sellerId}`                   |            |
| GET      | `https://edo-ichiba.com/api/seller/order-detail`      | 注文詳細取得           | `?s={sellerId}&orderId={orderId}` |            |
| GET      | `https://edo-ichiba.com/api/seller/order-detail-full` | 注文詳細取得（完全版） | `?s={sellerId}&orderId={orderId}` |            |
| GET      | `https://edo-ichiba.com/api/seller/orders/{orderId}`  | 注文取得               |                                   | 動的ルート |
| POST     | `https://edo-ichiba.com/api/seller/start_onboarding`  | オンボーディング開始   |                                   |            |

### 管理者関連 API

| メソッド | URL                                                             | 説明                     | ヘッダー                        | 備考       |
| -------- | --------------------------------------------------------------- | ------------------------ | ------------------------------- | ---------- |
| GET      | `https://edo-ichiba.com/api/admin/dashboard`                    | 管理者ダッシュボード     | `x-admin-token: admin-devtoken` |            |
| GET      | `https://edo-ichiba.com/api/admin/dashboard/daily-stats`        | 日次統計                 | `x-admin-token: admin-devtoken` |            |
| GET      | `https://edo-ichiba.com/api/admin/sellers`                      | 出店者一覧取得           | `x-admin-token: admin-devtoken` |            |
| GET      | `https://edo-ichiba.com/api/admin/frames`                       | AI フレーム一覧取得      | `x-admin-token: admin-devtoken` |            |
| GET      | `https://edo-ichiba.com/api/admin/payments`                     | 決済一覧取得             | `x-admin-token: admin-devtoken` |            |
| GET      | `https://edo-ichiba.com/api/admin/stripe/summary`               | Stripe サマリー取得      | `x-admin-token: admin-devtoken` |            |
| GET      | `https://edo-ichiba.com/api/admin/migration-status`             | マイグレーション状態取得 | `x-admin-token: admin-devtoken` |            |
| GET      | `https://edo-ichiba.com/api/admin/orders/{orderId}`             | 注文詳細取得（管理者）   | `x-admin-token: admin-devtoken` | 動的ルート |
| POST     | `https://edo-ichiba.com/api/admin/payments/refund`              | 返金処理                 | `x-admin-token: admin-devtoken` |            |
| POST     | `https://edo-ichiba.com/api/admin/disputes/generate_evidence`   | 異議申し立て証拠生成     | `x-admin-token: admin-devtoken` |            |
| POST     | `https://edo-ichiba.com/api/admin/disputes/submit_evidence`     | 異議申し立て証拠提出     | `x-admin-token: admin-devtoken` |            |
| POST     | `https://edo-ichiba.com/api/admin/setup-test-users`             | テストユーザー設定       | `x-admin-token: admin-devtoken` |            |
| POST     | `https://edo-ichiba.com/api/admin/community-goal/update-volume` | コミュニティ目標更新     | `x-admin-token: admin-devtoken` |            |
| GET      | `https://edo-ichiba.com/api/admin/community-goal/status`        | コミュニティ目標状態取得 | `x-admin-token: admin-devtoken` |            |
| POST     | `https://edo-ichiba.com/api/admin/frames`                       | フレーム作成             | `x-admin-token: admin-devtoken` |            |

### 決済関連 API

| メソッド | URL                                           | 説明                         | 備考 |
| -------- | --------------------------------------------- | ---------------------------- | ---- |
| POST     | `https://edo-ichiba.com/api/checkout/session` | チェックアウトセッション作成 |      |
| GET      | `https://edo-ichiba.com/api/checkout/result`  | チェックアウト結果取得       |      |
| POST     | `https://edo-ichiba.com/api/pending/start`    | 注文作成                     |      |
| POST     | `https://edo-ichiba.com/api/webhooks/stripe`  | Stripe Webhook               |      |

### 注文関連 API

| メソッド | URL                                                    | 説明               | 備考 |
| -------- | ------------------------------------------------------ | ------------------ | ---- |
| POST     | `https://edo-ichiba.com/api/orders/update-summary`     | 注文サマリー更新   |      |
| POST     | `https://edo-ichiba.com/api/orders/update-cost`        | 注文コスト更新     |      |
| POST     | `https://edo-ichiba.com/api/orders/update-world-price` | 世界価格更新       |      |
| POST     | `https://edo-ichiba.com/api/orders/metadata`           | 注文メタデータ更新 |      |
| POST     | `https://edo-ichiba.com/api/orders/buyer-attributes`   | 購入者属性更新     |      |

### AI・解析関連 API

| メソッド | URL                                       | 説明             | 備考 |
| -------- | ----------------------------------------- | ---------------- | ---- |
| POST     | `https://edo-ichiba.com/api/analyze-item` | AI 商品解析      |      |
| POST     | `https://edo-ichiba.com/api/photo-frame`  | 写真フレーム処理 |      |

### その他 API

| メソッド | URL                                              | 説明                   | 備考 |
| -------- | ------------------------------------------------ | ---------------------- | ---- |
| POST     | `https://edo-ichiba.com/api/auth/reset-password` | パスワードリセット     |      |
| GET      | `https://edo-ichiba.com/api/benchmark/data`      | ベンチマークデータ取得 |      |

---

## 🧪 テスト用パラメータ

### テスト用 sellerId

| sellerId               | プラン   | 用途                    |
| ---------------------- | -------- | ----------------------- |
| `test-seller-standard` | Standard | Standard プラン動作確認 |
| `test-seller-pro`      | Pro      | Pro プラン動作確認      |
| `test-seller-kids`     | Kids     | Kids プラン動作確認     |

### 使用例

```
# 出店者ダッシュボード
https://edo-ichiba.com/seller-dashboard.html?s=test-seller-pro

# 出店者購入画面
https://edo-ichiba.com/seller-purchase-standard?s=test-seller-pro

# チェックアウト
https://edo-ichiba.com/checkout?s=test-seller-pro&order=test-order-001

# Kidsダッシュボード
https://edo-ichiba.com/kids-dashboard?s=test-seller-kids
```

---

## 📝 動作確認チェックリスト

### 基本ページ

- [ ] トップページが表示される
- [ ] 決済成功ページが表示される
- [ ] 決済キャンセルページが表示される
- [ ] サンクスページが表示される

### 出店者機能

- [ ] 出店者ダッシュボードが表示される
- [ ] 売上サマリーが正しく表示される
- [ ] QR コードが生成される
- [ ] 出店者購入画面が動作する（Pro/Kids プラン）
- [ ] カメラ機能が動作する
- [ ] AI 解析が実行される
- [ ] Kids ダッシュボードが表示される（Kids プランのみ）

### 決済機能

- [ ] チェックアウトページが表示される
- [ ] Stripe 決済が動作する
- [ ] 手数料が正しく計算される
- [ ] 決済完了後のリダイレクトが動作する

### 管理者機能

- [ ] 管理者ダッシュボードが表示される
- [ ] 出店者一覧が表示される
- [ ] 決済一覧が表示される
- [ ] AI フレーム管理が動作する

### API 動作確認

- [ ] `/api/ping` が正常に応答する
- [ ] `/api/seller/summary` が正常に応答する
- [ ] `/api/admin/dashboard` が正常に応答する（認証あり）
- [ ] `/api/checkout/session` が正常に動作する

---

## ⚠️ 本番環境での確認時の注意事項

### 決済テスト

- **Stripe 本番モード**: 本番環境では実際の決済が発生します
  - テスト決済を行う場合は、Stripe ダッシュボードで返金処理が必要な場合があります
  - テスト用 sellerId を使用する際も、実際の Stripe アカウントに接続されている場合は注意が必要です

### データへの影響

- **本番データ**: 本番環境のデータベースに直接アクセスします
  - テスト用 sellerId を使用しても、実際のデータが存在する場合は表示されます
  - 管理者 API を使用する際は、本番データへの影響を考慮してください

### 認証・セキュリティ

- **管理者 API**: `x-admin-token` ヘッダーが必要です
  - 本番環境の管理者トークンを使用してください
  - トークンは環境変数から取得されます

### パフォーマンス確認

- **レスポンスタイム**: 本番環境での実際のレスポンスタイムを確認
- **エラーログ**: サーバーログやエラートラッキングツールでエラーを確認
- **CDN キャッシュ**: 静的ファイルのキャッシュ状況を確認

### 推奨確認順序

1. **ヘルスチェック**: `/api/ping` でサーバー状態を確認
2. **基本ページ**: トップページ、成功/キャンセルページの表示確認
3. **出店者機能**: ダッシュボード、購入画面の表示確認
4. **API 動作**: 各 API エンドポイントの正常応答確認
5. **決済機能**: テスト決済での動作確認（注意深く実施）

---

## 🔗 関連ドキュメント

- `手数料修正_動作確認ガイド.md` - 手数料機能の動作確認
- `出店者画面_動作確認ガイド.md` - 出店者側画面の動作確認
- `public/staging-verification-urls.html` - ステージング環境の URL 一覧

---

**最終更新**: 2025 年 1 月
