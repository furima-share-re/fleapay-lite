# テストユーザー設定ガイド（Prisma使用）

**目的**: 手動SQL操作を避け、Prismaクライアントを使ってテストユーザーのプランを設定する

---

## 📋 概要

`scripts/setup-test-users.js`スクリプトを使用して、テストユーザーのプランを設定します。このスクリプトは：

- ✅ Prismaクライアントを使用（手動SQL不要）
- ✅ セラーの存在確認と自動作成
- ✅ 既存のアクティブなサブスクリプションの自動無効化
- ✅ 新しいサブスクリプションの作成

---

## 🚀 使用方法

### 1. すべてのテストユーザーを一括設定

```bash
node scripts/setup-test-users.js setup-all
```

**実行内容**:
- `test-seller-standard` → `standard`プラン
- `test-seller-pro` → `pro`プラン
- `test-seller-kids` → `kids`プラン

---

### 2. 特定のユーザーのプランを設定

```bash
node scripts/setup-test-users.js set <sellerId> <planType>
```

**例**:
```bash
# test-seller-proをproプランに設定
node scripts/setup-test-users.js set test-seller-pro pro

# test-seller-standardをstandardプランに設定
node scripts/setup-test-users.js set test-seller-standard standard
```

**有効なプランタイプ**: `standard`, `pro`, `kids`

---

### 3. 特定のユーザーのプランを確認

```bash
node scripts/setup-test-users.js check <sellerId>
```

**例**:
```bash
node scripts/setup-test-users.js check test-seller-pro
```

---

## 🔧 実行環境

### ローカル環境

1. **環境変数の設定**:
   ```bash
   # .env ファイルに DATABASE_URL が設定されていることを確認
   DATABASE_URL="postgresql://..."
   ```

2. **Prismaクライアントの生成**:
   ```bash
   npx prisma generate
   ```

3. **スクリプトの実行**:
   ```bash
   node scripts/setup-test-users.js setup-all
   ```

---

### Render環境（検証環境）

Render環境では、以下の方法で実行できます：

#### 方法A: Render Shellを使用

1. Render Dashboard → サービス → Shell を開く
2. 以下のコマンドを実行:
   ```bash
   node scripts/setup-test-users.js setup-all
   ```

#### 方法B: 一時的なAPIエンドポイントを作成

`server.js`に一時的なエンドポイントを追加して、ブラウザから実行：

```javascript
// 一時的な管理エンドポイント（本番環境では削除）
app.post('/api/admin/setup-test-users', requireAdmin, async (req, res) => {
  const { exec } = require('child_process');
  exec('node scripts/setup-test-users.js setup-all', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message, stderr });
    }
    res.json({ success: true, output: stdout });
  });
});
```

---

## 📊 実行例

### すべてのテストユーザーを設定

```bash
$ node scripts/setup-test-users.js setup-all

🚀 テストユーザーのプラン設定を開始します...

📋 test-seller-standard を standard プランに設定中...
✅ Seller確認/作成: test-seller-standard (Test Seller (standard))
✅ サブスクリプション作成: 123e4567-e89b-12d3-a456-426614174000
   - プラン: standard
   - ステータス: active
   - 開始日時: 2026-01-02T14:30:00.000Z

📋 test-seller-pro を pro プランに設定中...
✅ Seller確認/作成: test-seller-pro (Test Seller (pro))
✅ サブスクリプション作成: 123e4567-e89b-12d3-a456-426614174001
   - プラン: pro
   - ステータス: active
   - 開始日時: 2026-01-02T14:30:00.000Z

📋 test-seller-kids を kids プランに設定中...
✅ Seller確認/作成: test-seller-kids (Test Seller (kids))
✅ サブスクリプション作成: 123e4567-e89b-12d3-a456-426614174002
   - プラン: kids
   - ステータス: active
   - 開始日時: 2026-01-02T14:30:00.000Z

✅ すべてのテストユーザーの設定が完了しました！

📊 設定結果の確認:
  ✅ test-seller-standard: standard (Test Seller (standard))
  ✅ test-seller-pro: pro (Test Seller (pro))
  ✅ test-seller-kids: kids (Test Seller (kids))
```

---

### 特定のユーザーのプランを設定

```bash
$ node scripts/setup-test-users.js set test-seller-pro pro

📋 test-seller-pro を pro プランに設定中...
✅ Seller確認/作成: test-seller-pro (Test Seller (pro))
✅ 1件の既存サブスクリプションを無効化しました
✅ サブスクリプション作成: 123e4567-e89b-12d3-a456-426614174003
   - プラン: pro
   - ステータス: active
   - 開始日時: 2026-01-02T14:30:00.000Z

📊 test-seller-pro の現在のプラン:
   - プラン: pro
   - ステータス: active
   - 開始日時: 2026-01-02T14:30:00.000Z
   - 終了日時: なし（無期限）
   - セラー名: Test Seller (pro)
```

---

## 🔍 トラブルシューティング

### エラー: `PrismaClient is not configured`

**原因**: Prismaクライアントが生成されていない

**解決方法**:
```bash
npx prisma generate
```

---

### エラー: `Can't reach database server`

**原因**: `DATABASE_URL`が正しく設定されていない

**解決方法**:
1. `.env`ファイルに`DATABASE_URL`が設定されているか確認
2. 接続文字列が正しいか確認（SupabaseのConnection Poolingを使用）

---

### エラー: `Invalid value for argument 'planType'`

**原因**: 無効なプランタイプが指定された

**解決方法**: `standard`, `pro`, `kids`のいずれかを指定してください

---

## 📝 まとめ

1. **手動SQL操作は不要**: Prismaクライアントを使用
2. **一括設定**: `setup-all`コマンドで全テストユーザーを設定
3. **個別設定**: `set`コマンドで特定のユーザーのプランを設定
4. **確認**: `check`コマンドで現在のプランを確認

これで、データベース操作をコード化し、手動SQL操作を避けることができます。

