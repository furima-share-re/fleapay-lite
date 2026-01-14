# 戦略F: テストケースドキュメント

## 概要

戦略F（コミュニティ連動型ダイナミックプライシング）の実装に対する包括的なテストケースです。
既存機能への影響（デグレ）を防ぐため、以下の観点でテストを実施します。

## テストファイル

### 1. `strategy-f.test.ts`
**Tier判定ロジックと手数料取得の単体テスト**

- Tier判定ロジック（`determineTier`）
- 月間QR決済回数取得（`getMonthlyQrTransactionCount`, `getCurrentMonthlyQrTransactionCount`）
- コミュニティ目標達成判定（`getCommunityGoalStatus`）
- Tier制に基づく手数料取得（`getFeeRateByTier`）
- 戦略F統合手数料取得（`getFeeRateWithStrategyF`）
- 既存機能との互換性テスト

### 2. `strategy-f-checkout.test.ts`
**チェックアウト処理での統合テスト**

- 環境変数によるTier制の有効/無効切り替え
- チェックアウト処理での手数料計算
- エッジケース（小額注文、0円注文など）
- 既存機能との互換性

### 3. `strategy-f-api.test.ts`
**APIエンドポイントのテスト**

- `/api/seller/tier-status` - 出店者向けTier情報取得
- `/api/admin/community-goal/status` - 管理者向けコミュニティ目標状況取得
- `/api/admin/community-goal/update-volume` - 管理者向け取扱高更新

## 実行方法

### 全テストを実行
```bash
npm test
```

### 戦略F関連のテストのみ実行
```bash
npm test -- strategy-f
```

### 特定のテストファイルのみ実行
```bash
# Tier判定ロジックのテスト
npm test -- strategy-f.test

# チェックアウト処理のテスト
npm test -- strategy-f-checkout

# APIエンドポイントのテスト
npm test -- strategy-f-api
```

### ウォッチモード（開発中に便利）
```bash
npm test -- --watch strategy-f
```

### UIモード（ブラウザで結果を確認）
```bash
npm test -- --ui strategy-f
```

## テストカバレッジ

### Tier判定ロジック
- ✅ Tier 1-5の境界値テスト
- ✅ エッジケース（負の値、非常に大きな値）
- ✅ Tier定義の整合性チェック

### 手数料取得
- ✅ Tier 1-4の固定手数料率
- ✅ Tier 5のダイナミックプライシング（目標達成/未達成）
- ✅ 既存のplan_typeベース手数料取得との互換性
- ✅ 環境変数によるTier制の有効/無効切り替え

### コミュニティ目標
- ✅ 目標達成判定
- ✅ 目標未達成時の処理
- ✅ 目標が設定されていない場合のデフォルト値

### チェックアウト処理
- ✅ Tier制が有効な場合の手数料計算
- ✅ Tier制が無効な場合の手数料計算（既存機能）
- ✅ 小額注文での最低手数料（1円）
- ✅ 0円注文の処理

### APIエンドポイント
- ✅ 認証チェック
- ✅ 正常系レスポンス
- ✅ エラーハンドリング
- ✅ パラメータ検証

## デグレ防止テスト

### 既存機能の互換性
以下の既存機能が引き続き動作することを確認：

1. **`getFeeRateFromMaster`関数**
   - plan_typeベースの手数料取得が動作
   - 複数のプランタイプ（standard, pro, kids）が正しく動作

2. **チェックアウト処理**
   - Tier制が無効な場合、従来の動作を維持
   - プランがない場合のデフォルト処理

3. **手数料計算ロジック**
   - 手数料の不変条件チェック（負の値、注文金額以上にならない）
   - 最低手数料（1円）の適用

## テストデータ

### Tier定義
```typescript
Tier 1: ビギナー（0-3回/月）: 4.5%
Tier 2: レギュラー（4-10回/月）: 4.2%
Tier 3: エキスパート（11-24回/月）: 4.0%
Tier 4: マスター（25-50回/月）: 3.8%
Tier 5: レジェンド（51回以上/月）: 3.3%（通常）または2.8%（目標達成時）
```

### コミュニティ目標（Phase 1）
- 目標取扱高: ¥10,000,000
- 達成時手数料率: 2.8%
- 未達成時手数料率: 3.3%

## 注意事項

1. **環境変数**
   - テスト実行時は`ENABLE_STRATEGY_F_TIER_SYSTEM`の設定に注意
   - デフォルトではTier制が有効（`true`）

2. **モックデータ**
   - Prismaのモックを使用しているため、実際のデータベース接続は不要
   - テストは独立して実行可能

3. **CI/CD**
   - すべてのテストがCI/CDパイプラインで自動実行される
   - テストが失敗した場合、マージはブロックされる

## トラブルシューティング

### テストが失敗する場合

1. **環境変数の確認**
   ```bash
   echo $ENABLE_STRATEGY_F_TIER_SYSTEM
   ```

2. **Prismaスキーマの同期**
   ```bash
   npm run migrate:prisma
   ```

3. **依存関係の再インストール**
   ```bash
   npm install
   ```

4. **テストの詳細ログを確認**
   ```bash
   npm test -- strategy-f --reporter=verbose
   ```

## 関連ドキュメント

- [戦略F実装企画書](../大井競馬場フリマ%20戦略F%20統合企画書.html)
- [手数料徴収機能実装_最終修正完了.md](../../手数料徴収機能実装_最終修正完了.md)
- [手数料率マスタ_運用手順書.md](../../手数料率マスタ_運用手順書.md)

