# Stripe決済フロー テストケース仕様書

## 概要

このドキュメントは、Stripe Checkout Sessionを使用した決済フローにおける、各シナリオの画面遷移、ステータス、データベース状態を定義し、テストケースを提供します。

## Stripe Checkout Session の基本フロー

```
1. Checkout Session作成
   ↓
2. ユーザーがStripe Checkoutページにリダイレクト
   ↓
3. 決済処理（カード入力、3D Secure認証など）
   ↓
4. リダイレクト（success_url または cancel_url）
   ↓
5. Webhookイベント受信（非同期）
```

## リダイレクトURL

- **成功時**: `/success?order={orderId}`
- **キャンセル時**: `/cancel?s={sellerId}&order={orderId}`

## テストケース一覧

### テスト要否の分類

| 分類 | テストケース | 理由 |
|------|------------|------|
| **✅ テスト必要** | TC-001, TC-002, TC-006, TC-008, TC-014 | アプリケーション側にリダイレクトされ、画面・DBの確認が必要 |
| **⚠️ テスト不要（リダイレクトなし）** | TC-003, TC-004, TC-005, TC-007, TC-015 | Stripe Checkoutページ内に留まり、アプリケーション側にリダイレクトされない |
| **⚠️ テスト不要（フロー外）** | TC-009, TC-010, TC-011, TC-012, TC-013 | 決済完了後の処理（返金・チャージバック）で、Stripe Checkout Sessionのフロー外 |

---

## TC-001: 決済成功（通常カード）

### 前提条件
- 有効なテストカードを使用
- 3D Secure認証が不要なカード

### 使用するテストカード
```
カード番号: 4242 4242 4242 4242
有効期限: 任意の未来の日付（例: 12/34）
CVC: 任意の3桁（例: 123）
郵便番号: 任意（例: 12345）
```

### フロー
1. Checkout Session作成
2. Stripe Checkoutページにリダイレクト
3. カード情報入力
4. 決済成功
5. `/success?order={orderId}` にリダイレクト

### 期待される状態

#### Stripe側
- **Checkout Session Status**: `complete`
- **PaymentIntent Status**: `succeeded`
- **Charge Status**: `succeeded`

#### データベース（Webhook処理後）
- `orders.status`: `'paid'`
- `orders.stripe_sid`: PaymentIntent ID
- `stripe_payments.status`: `'succeeded'`
- `stripe_payments.payment_intent_id`: PaymentIntent ID
- `order_metadata.payment_state`: `'stripe_completed'`

#### 画面表示
- `/success` ページが表示される
- `isPaid = true` が返される
- 「決済ステータス: 完了」と表示される
- 金額が正しく表示される

### 検証ポイント
- [ ] successページにリダイレクトされる
- [ ] `/api/checkout/result?orderId={orderId}` が `isPaid: true` を返す
- [ ] `orders.status` が `'paid'` に更新される
- [ ] `stripe_payments` レコードが作成され、`status = 'succeeded'` である
- [ ] Webhook `payment_intent.succeeded` が受信される
- [ ] 画面に「決済完了」と表示される

---

## TC-002: 3D Secure認証が必要なカード（認証成功）

### 前提条件
- 3D Secure認証が必要なテストカードを使用

### 使用するテストカード
```
カード番号: 4000 0025 0000 3155
有効期限: 任意の未来の日付（例: 12/34）
CVC: 任意の3桁（例: 123）
郵便番号: 任意（例: 12345）
```

### フロー
1. Checkout Session作成
2. Stripe Checkoutページにリダイレクト
3. カード情報入力
4. 3D Secure認証画面が表示される
5. 認証成功（認証コード: 任意）
6. 決済成功
7. `/success?order={orderId}` にリダイレクト

### 期待される状態

#### Stripe側
- **Checkout Session Status**: `complete`
- **PaymentIntent Status**: `succeeded` (一時的に `requires_action` → `succeeded`)
- **Charge Status**: `succeeded`

#### データベース（Webhook処理後）
- `orders.status`: `'paid'`
- `stripe_payments.status`: `'succeeded'`
- `order_metadata.payment_state`: `'stripe_completed'`

#### 画面表示
- 3D Secure認証画面が表示される
- 認証後、successページにリダイレクトされる
- `isPaid = true` が返される

### 検証ポイント
- [ ] 3D Secure認証画面が表示される
- [ ] 認証成功後、successページにリダイレクトされる
- [ ] `isPaid = true` が返される
- [ ] `orders.status` が `'paid'` に更新される
- [ ] `stripe_payments.status = 'succeeded'` である

---

## TC-003: 3D Secure認証が必要なカード（認証失敗）

> **⚠️ テスト不要**: このケースはStripe Checkoutページ内でエラーが表示されるだけで、アプリケーション側にリダイレクトされません。画面・DBテストは不要です。

### 前提条件
- 3D Secure認証が必要なテストカードを使用
- 認証に失敗するカード

### 使用するテストカード
```
カード番号: 4000 0000 0000 3055
有効期限: 任意の未来の日付（例: 12/34）
CVC: 任意の3桁（例: 123）
郵便番号: 任意（例: 12345）
```

### フロー
1. Checkout Session作成
2. Stripe Checkoutページにリダイレクト
3. カード情報入力
4. 3D Secure認証画面が表示される
5. 認証失敗
6. エラーメッセージが表示される
7. ユーザーがキャンセルまたは再試行

### 期待される状態

#### Stripe側
- **Checkout Session Status**: `expired` または `open`（再試行可能）
- **PaymentIntent Status**: `requires_payment_method` または `canceled`

#### データベース
- `orders.status`: `'pending'`（変更なし）
- `stripe_payments`: レコードが作成されない

#### 画面表示
- **Stripe Checkoutページ内**にエラーメッセージが表示される
- 再試行またはキャンセルが可能
- **アプリケーション側にはリダイレクトされない**

### 検証ポイント
- [ ] 3D Secure認証画面が表示される（Stripe Checkoutページ内）
- [ ] 認証失敗時にエラーメッセージが表示される（Stripe Checkoutページ内）
- [ ] `orders.status` が `'pending'` のままである
- [ ] `stripe_payments` レコードが作成されない
- [ ] ユーザーが再試行できる（Stripe Checkoutページ内）

### テスト方針
- **画面テスト**: 不要（Stripe Checkoutページ内の動作のため）
- **DBテスト**: 不要（データベースは変更されない）
- **Stripe側の動作確認**: 必要（Stripe Checkoutページでエラーが表示されることを確認）

---

## TC-004: カード残高不足

> **⚠️ テスト不要**: このケースはStripe Checkoutページ内でエラーが表示されるだけで、アプリケーション側にリダイレクトされません。画面・DBテストは不要です。

### 前提条件
- 残高不足のテストカードを使用

### 使用するテストカード
```
カード番号: 4000 0000 0000 9995
有効期限: 任意の未来の日付（例: 12/34）
CVC: 任意の3桁（例: 123）
郵便番号: 任意（例: 12345）
```

### フロー
1. Checkout Session作成
2. Stripe Checkoutページにリダイレクト
3. カード情報入力
4. 決済失敗（残高不足エラー）
5. エラーメッセージが表示される
6. ユーザーがキャンセルまたは再試行

### 期待される状態

#### Stripe側
- **Checkout Session Status**: `expired` または `open`（再試行可能）
- **PaymentIntent Status**: `payment_failed` または `requires_payment_method`

#### データベース
- `orders.status`: `'pending'`（変更なし）
- `stripe_payments`: レコードが作成されない
- **注意**: `payment_intent.payment_failed` Webhookは現在未処理

#### 画面表示
- **Stripe Checkoutページ内**にエラーメッセージが表示される（「カード残高が不足しています」など）
- 再試行またはキャンセルが可能
- **アプリケーション側にはリダイレクトされない**

### 検証ポイント
- [ ] エラーメッセージが表示される（Stripe Checkoutページ内）
- [ ] `orders.status` が `'pending'` のままである
- [ ] `stripe_payments` レコードが作成されない
- [ ] ユーザーが再試行できる（Stripe Checkoutページ内）

### テスト方針
- **画面テスト**: 不要（Stripe Checkoutページ内の動作のため）
- **DBテスト**: 不要（データベースは変更されない）
- **Stripe側の動作確認**: 必要（Stripe Checkoutページでエラーが表示されることを確認）

---

## TC-005: カード期限切れ

> **⚠️ テスト不要**: このケースはStripe Checkoutページ内でエラーが表示されるだけで、アプリケーション側にリダイレクトされません。画面・DBテストは不要です。

### 前提条件
- 期限切れのテストカードを使用

### 使用するテストカード
```
カード番号: 4000 0000 0000 0069
有効期限: 過去の日付（例: 01/20）
CVC: 任意の3桁（例: 123）
郵便番号: 任意（例: 12345）
```

### フロー
1. Checkout Session作成
2. Stripe Checkoutページにリダイレクト
3. カード情報入力
4. 決済失敗（期限切れエラー）
5. エラーメッセージが表示される

### 期待される状態

#### Stripe側
- **Checkout Session Status**: `expired` または `open`（再試行可能）
- **PaymentIntent Status**: `payment_failed` または `requires_payment_method`

#### データベース
- `orders.status`: `'pending'`（変更なし）
- `stripe_payments`: レコードが作成されない

#### 画面表示
- **Stripe Checkoutページ内**にエラーメッセージが表示される（「カードの有効期限が切れています」など）
- **アプリケーション側にはリダイレクトされない**

### 検証ポイント
- [ ] エラーメッセージが表示される（Stripe Checkoutページ内）
- [ ] `orders.status` が `'pending'` のままである
- [ ] `stripe_payments` レコードが作成されない

### テスト方針
- **画面テスト**: 不要（Stripe Checkoutページ内の動作のため）
- **DBテスト**: 不要（データベースは変更されない）
- **Stripe側の動作確認**: 必要（Stripe Checkoutページでエラーが表示されることを確認）

---

## TC-006: ユーザーがキャンセルボタンをクリック

### 前提条件
- Checkout Sessionが作成されている
- ユーザーが決済をキャンセルする

### フロー
1. Checkout Session作成
2. Stripe Checkoutページにリダイレクト
3. ユーザーが「キャンセル」ボタンをクリック
4. `/cancel?s={sellerId}&order={orderId}` にリダイレクト

### 期待される状態

#### Stripe側
- **Checkout Session Status**: `expired` または `open`
- **PaymentIntent Status**: `canceled` または 作成されない

#### データベース
- `orders.status`: `'pending'`（変更なし）
- `stripe_payments`: レコードが作成されない

#### 画面表示
- `/cancel` ページが表示される
- 「決済は完了していません」と表示される
- 「もう一度試す」ボタンが表示される

### 検証ポイント
- [ ] cancelページにリダイレクトされる
- [ ] `/api/checkout/result?orderId={orderId}` が `isPaid: false` を返す
- [ ] `orders.status` が `'pending'` のままである
- [ ] `stripe_payments` レコードが作成されない
- [ ] 画面に「決済未完了」と表示される

---

## TC-007: Checkout Sessionタイムアウト

> **⚠️ テスト不要**: このケースはユーザーが離脱しているため、アプリケーション側にリダイレクトされません。画面・DBテストは不要です。

### 前提条件
- Checkout Sessionが作成されている
- ユーザーが一定時間（通常24時間）内に決済を完了しない

### フロー
1. Checkout Session作成
2. Stripe Checkoutページにリダイレクト
3. ユーザーが何もせずにページを離れる
4. Sessionが期限切れになる

### 期待される状態

#### Stripe側
- **Checkout Session Status**: `expired`
- **PaymentIntent Status**: `canceled` または 作成されない

#### データベース
- `orders.status`: `'pending'`（変更なし）
- `stripe_payments`: レコードが作成されない

#### 画面表示
- ユーザーが再度アクセスした場合、エラーメッセージが表示される（Stripe Checkoutページ内）
- **アプリケーション側にはリダイレクトされない**

### 検証ポイント
- [ ] Sessionが期限切れになる
- [ ] `orders.status` が `'pending'` のままである
- [ ] `stripe_payments` レコードが作成されない

### テスト方針
- **画面テスト**: 不要（ユーザーが離脱しているため）
- **DBテスト**: 不要（データベースは変更されない）
- **Stripe側の動作確認**: 必要（Sessionが期限切れになることを確認）

---

## TC-008: Webhook遅延によるタイミング問題

### 前提条件
- 決済が成功したが、Webhookが遅延している

### フロー
1. Checkout Session作成
2. 決済成功
3. `/success?order={orderId}` にリダイレクト
4. Webhookがまだ受信されていない状態で `/api/checkout/result` を呼び出す
5. **Webhook受信まで待機（ポーリング、最大30秒）**
6. Webhook受信後、決済状態を確定

### 期待される状態

#### データベース（Webhook受信前）
- `orders.status`: `'pending'`（まだ更新されていない）
- `stripe_payments`: レコードがまだ作成されていない

#### データベース（Webhook受信後）
- `orders.status`: `'paid'`
- `stripe_payments.status`: `'succeeded'`

#### 画面表示（Webhook受信前）
- `/success` ページが表示される
- **「決済確認中…」と表示される（Webhook受信待ち）**
- `/api/checkout/result` が `webhookReceived: false` を返す
- **ポーリングが開始される（3秒間隔、最大30秒）**

#### 画面表示（Webhook受信後）
- **Webhook受信時に決済が成功していた場合**: 「決済完了」と表示される
- **Webhook受信時に決済が失敗していた場合**: `/cancel` にリダイレクトされる

#### 画面表示（タイムアウト時）
- 最大30秒待機してもWebhookが受信されない場合
- Stripe APIで確認できた場合は「決済完了」と表示される
- 確認できない場合は `/cancel` にリダイレクトされる

### 検証ポイント
- [ ] Webhook受信前は「決済確認中…」と表示される
- [ ] ポーリングが開始される（3秒間隔）
- [ ] Webhook受信後、`orders.status` が `'paid'` に更新される
- [ ] `stripe_payments` レコードが作成される
- [ ] Webhook受信時に決済が失敗していたら `/cancel` にリダイレクトされる
- [ ] タイムアウト時（30秒）の動作が正しい

### 重要なポイント
- **商品を渡す前にWebhook受信を待つ**: Webhook受信まで「決済確認中」と表示されるため、店員は商品を渡さない
- **Webhook受信時に処理中止可能**: Webhook受信時に決済が失敗していたら、自動的に `/cancel` にリダイレクトされる
- **タイムアウト処理**: 最大30秒待機してもWebhookが受信されない場合のフォールバック処理

---

## TC-009: 決済成功後の返金（全額返金）

> **⚠️ テスト不要**: このケースは決済完了後の処理（返金）であり、Stripe Checkout Sessionのフロー外です。画面・DBテストは不要です（Webhook処理の確認のみ）。

### 前提条件
- 決済が成功している
- 管理者が返金処理を実行

### フロー
1. 決済成功（TC-001を参照）
2. 管理者がStripeダッシュボードまたはAPIで返金を実行
3. Webhook `charge.refunded` が受信される

### 期待される状態

#### Stripe側
- **Charge Status**: `refunded`
- **PaymentIntent Status**: `succeeded`（変更なし）

#### データベース（Webhook処理後）
- `stripe_payments.status`: `'refunded'`
- `stripe_payments.refunded_total`: 返金額
- `orders.status`: `'paid'`（変更なし）

#### 画面表示
- 返金後も `/success` ページは表示されるが、返金状態は表示されない（現在の実装）
- **Stripe Checkout Sessionのフロー外**

### 検証ポイント
- [ ] Webhook `charge.refunded` が受信される
- [ ] `stripe_payments.status` が `'refunded'` に更新される
- [ ] `stripe_payments.refunded_total` が正しく設定される

### テスト方針
- **画面テスト**: 不要（Stripe Checkout Sessionのフロー外）
- **DBテスト**: 不要（Webhook処理の確認のみ）
- **Webhookテスト**: 必要（Webhook処理が正しく動作することを確認）

---

## TC-010: 決済成功後の返金（一部返金）

> **⚠️ テスト不要**: このケースは決済完了後の処理（返金）であり、Stripe Checkout Sessionのフロー外です。画面・DBテストは不要です（Webhook処理の確認のみ）。

### 前提条件
- 決済が成功している
- 管理者が一部返金を実行

### フロー
1. 決済成功（TC-001を参照）
2. 管理者が一部返金を実行
3. Webhook `charge.refund.updated` が受信される

### 期待される状態

#### Stripe側
- **Charge Status**: `partially_refunded`
- **PaymentIntent Status**: `succeeded`（変更なし）

#### データベース（Webhook処理後）
- `stripe_payments.status`: `'partially_refunded'`
- `stripe_payments.refunded_total`: 返金額

#### 画面表示
- **Stripe Checkout Sessionのフロー外**

### 検証ポイント
- [ ] Webhook `charge.refund.updated` が受信される
- [ ] `stripe_payments.status` が `'partially_refunded'` に更新される
- [ ] `stripe_payments.refunded_total` が正しく設定される

### テスト方針
- **画面テスト**: 不要（Stripe Checkout Sessionのフロー外）
- **DBテスト**: 不要（Webhook処理の確認のみ）
- **Webhookテスト**: 必要（Webhook処理が正しく動作することを確認）

---

## TC-011: チャージバック発生

> **⚠️ テスト不要**: このケースは決済完了後の処理（チャージバック）であり、Stripe Checkout Sessionのフロー外です。画面・DBテストは不要です（Webhook処理の確認のみ）。

### 前提条件
- 決済が成功している
- カード会社からチャージバックが発生

### フロー
1. 決済成功（TC-001を参照）
2. カード会社からチャージバックが発生
3. Webhook `charge.dispute.created` が受信される

### 期待される状態

#### Stripe側
- **Dispute Status**: `needs_response`
- **Charge Status**: `disputed`

#### データベース（Webhook処理後）
- `stripe_payments.status`: `'disputed'`
- `stripe_payments.dispute_status`: `'needs_response'`
- `stripe_payments.amount_net`: `0`

#### 画面表示
- **Stripe Checkout Sessionのフロー外**

### 検証ポイント
- [ ] Webhook `charge.dispute.created` が受信される
- [ ] `stripe_payments.status` が `'disputed'` に更新される
- [ ] `stripe_payments.dispute_status` が `'needs_response'` に設定される
- [ ] `stripe_payments.amount_net` が `0` に設定される

### テスト方針
- **画面テスト**: 不要（Stripe Checkout Sessionのフロー外）
- **DBテスト**: 不要（Webhook処理の確認のみ）
- **Webhookテスト**: 必要（Webhook処理が正しく動作することを確認）

---

## TC-012: チャージバッククローズ（勝訴）

> **⚠️ テスト不要**: このケースは決済完了後の処理（チャージバック）であり、Stripe Checkout Sessionのフロー外です。画面・DBテストは不要です（Webhook処理の確認のみ）。

### 前提条件
- チャージバックが発生している（TC-011）
- チャージバックが勝訴でクローズ

### フロー
1. チャージバック発生（TC-011を参照）
2. チャージバックが勝訴でクローズ
3. Webhook `charge.dispute.closed` が受信される（`status: 'won'`）

### 期待される状態

#### Stripe側
- **Dispute Status**: `won`
- **Charge Status**: `succeeded`

#### データベース（Webhook処理後）
- `stripe_payments.status`: `'succeeded'`
- `stripe_payments.dispute_status`: `'won'`
- `stripe_payments.amount_net`: 元の金額に戻る

#### 画面表示
- **Stripe Checkout Sessionのフロー外**

### 検証ポイント
- [ ] Webhook `charge.dispute.closed` が受信される
- [ ] `stripe_payments.status` が `'succeeded'` に戻る
- [ ] `stripe_payments.dispute_status` が `'won'` に設定される
- [ ] `stripe_payments.amount_net` が元の金額に戻る

### テスト方針
- **画面テスト**: 不要（Stripe Checkout Sessionのフロー外）
- **DBテスト**: 不要（Webhook処理の確認のみ）
- **Webhookテスト**: 必要（Webhook処理が正しく動作することを確認）

---

## TC-013: チャージバッククローズ（敗訴）

> **⚠️ テスト不要**: このケースは決済完了後の処理（チャージバック）であり、Stripe Checkout Sessionのフロー外です。画面・DBテストは不要です（Webhook処理の確認のみ）。

### 前提条件
- チャージバックが発生している（TC-011）
- チャージバックが敗訴でクローズ

### フロー
1. チャージバック発生（TC-011を参照）
2. チャージバックが敗訴でクローズ
3. Webhook `charge.dispute.closed` が受信される（`status: 'lost'`）

### 期待される状態

#### Stripe側
- **Dispute Status**: `lost`
- **Charge Status**: `disputed`

#### データベース（Webhook処理後）
- `stripe_payments.status`: `'disputed'`
- `stripe_payments.dispute_status`: `'lost'`
- `stripe_payments.amount_net`: `0`

#### 画面表示
- **Stripe Checkout Sessionのフロー外**

### 検証ポイント
- [ ] Webhook `charge.dispute.closed` が受信される
- [ ] `stripe_payments.status` が `'disputed'` のままである
- [ ] `stripe_payments.dispute_status` が `'lost'` に設定される
- [ ] `stripe_payments.amount_net` が `0` のままである

### テスト方針
- **画面テスト**: 不要（Stripe Checkout Sessionのフロー外）
- **DBテスト**: 不要（Webhook処理の確認のみ）
- **Webhookテスト**: 必要（Webhook処理が正しく動作することを確認）

---

## TC-014: 複数の決済試行（最初に失敗、2回目に成功）

### 前提条件
- 最初の決済試行が失敗
- 2回目の決済試行が成功

### フロー
1. Checkout Session作成
2. 最初の決済試行（失敗: 残高不足など）
3. ユーザーが再試行
4. 2回目の決済試行（成功）

### 期待される状態

#### Stripe側
- 複数のPaymentIntentが作成される可能性がある
- 最新のPaymentIntentが `succeeded`

#### データベース（Webhook処理後）
- `orders.status`: `'paid'`
- `stripe_payments`: 複数のレコードが作成される可能性がある
- 最新のレコードが `status = 'succeeded'`

#### 画面表示
- `/success` ページが表示される
- **修正後**: `has_succeeded_payment` を確認するため、`isPaid: true` が返される

### 検証ポイント
- [ ] 最初の失敗時、`orders.status` が `'pending'` のままである
- [ ] 2回目の成功時、`orders.status` が `'paid'` に更新される
- [ ] `/api/checkout/result` が `isPaid: true` を返す（修正後）
- [ ] 複数の`stripe_payments`レコードがあっても、正しく判定される

---

## TC-015: 無効なカード番号

> **⚠️ テスト不要**: このケースはStripe Checkoutページ内でバリデーションエラーが表示されるだけで、アプリケーション側にリダイレクトされません。画面・DBテストは不要です。

### 前提条件
- 無効なカード番号を入力

### 使用するテストカード
```
カード番号: 0000 0000 0000 0000
有効期限: 任意の未来の日付（例: 12/34）
CVC: 任意の3桁（例: 123）
郵便番号: 任意（例: 12345）
```

### フロー
1. Checkout Session作成
2. Stripe Checkoutページにリダイレクト
3. 無効なカード番号を入力
4. バリデーションエラーが表示される

### 期待される状態

#### Stripe側
- **Checkout Session Status**: `open`（まだ有効）
- **PaymentIntent Status**: 作成されない

#### データベース
- `orders.status`: `'pending'`（変更なし）
- `stripe_payments`: レコードが作成されない

#### 画面表示
- **Stripe Checkoutページ内**にバリデーションエラーが表示される（「カード番号が無効です」など）
- **アプリケーション側にはリダイレクトされない**

### 検証ポイント
- [ ] バリデーションエラーが表示される（Stripe Checkoutページ内）
- [ ] `orders.status` が `'pending'` のままである
- [ ] `stripe_payments` レコードが作成されない

### テスト方針
- **画面テスト**: 不要（Stripe Checkoutページ内の動作のため）
- **DBテスト**: 不要（データベースは変更されない）
- **Stripe側の動作確認**: 必要（Stripe Checkoutページでバリデーションエラーが表示されることを確認）

---

## テスト実行手順

### 1. テスト環境の準備

```bash
# 環境変数の設定
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_BASE_URL=https://your-test-domain.com
```

### 2. Stripe CLIを使用したWebhookテスト

```bash
# Stripe CLIでWebhookを転送
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# テストイベントを送信
stripe trigger payment_intent.succeeded
stripe trigger charge.refunded
stripe trigger charge.dispute.created
```

### 3. テストカード一覧

| カード番号 | 説明 | テストケース |
|-----------|------|------------|
| 4242 4242 4242 4242 | 通常の成功 | TC-001 |
| 4000 0025 0000 3155 | 3D Secure認証必要（成功） | TC-002 |
| 4000 0000 0000 3055 | 3D Secure認証必要（失敗） | TC-003 |
| 4000 0000 0000 9995 | 残高不足 | TC-004 |
| 4000 0000 0000 0069 | 期限切れ | TC-005 |
| 0000 0000 0000 0000 | 無効なカード番号 | TC-015 |

### 4. データベース確認クエリ

各テストケース実行後、以下のクエリで状態を確認：

```sql
-- 注文の状態確認
SELECT 
  o.id,
  o.status AS order_status,
  o.stripe_sid,
  sp.status AS payment_status,
  sp.payment_intent_id,
  om.payment_state
FROM orders o
LEFT JOIN stripe_payments sp ON sp.order_id = o.id
LEFT JOIN order_metadata om ON om.order_id = o.id
WHERE o.id = 'YOUR_ORDER_ID_HERE'::uuid;
```

---

## 注意事項

1. **Webhookの遅延**: Webhookは非同期で処理されるため、リダイレクト直後にデータベースが更新されていない可能性がある。修正後の実装では、`has_succeeded_payment`を確認することで対応。

2. **複数のPaymentIntent**: ユーザーが複数回決済を試行した場合、複数のPaymentIntentが作成される可能性がある。修正後の実装では、`EXISTS`句を使用して`succeeded`レコードの存在を確認することで対応。

3. **テストモード**: 本番環境では必ずテストモードでテストを実行すること。

4. **Webhook署名検証**: 本番環境では必ずWebhook署名検証を有効にすること。

---

## 関連ドキュメント

- [Stripe Checkout Session ドキュメント](https://stripe.com/docs/payments/checkout)
- [Stripe PaymentIntent ドキュメント](https://stripe.com/docs/payments/payment-intents)
- [Stripe テストカード一覧](https://stripe.com/docs/testing)
- [Stripe Webhook イベント一覧](https://stripe.com/docs/api/events/types)

