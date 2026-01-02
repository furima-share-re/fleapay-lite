# Prismaスキーマエラーの修正

**エラー内容**: `Error validating model "KidsAchievement": At most one field must be marked as the id field with the @id attribute.`

**修正日**: 2026-01-02

---

## 🔍 問題の原因

`KidsAchievement`モデルで複合主キーを定義する際に、両方のフィールドに`@id`を付けていました。

**誤った定義**:
```prisma
model KidsAchievement {
  sellerId     String   @id  // ❌ エラー
  code          String   @id  // ❌ エラー
  ...
}
```

**Prismaの制約**: 複合主キーは`@@id([field1, field2])`という形式で定義する必要があります。

---

## ✅ 修正内容

**修正後の定義**:
```prisma
model KidsAchievement {
  sellerId     String
  code          String
  kind          String
  firstEarnedAt DateTime @default(now()) @map("first_earned_at") @db.Timestamptz(6)

  seller Seller @relation(fields: [sellerId], references: [id])

  @@id([sellerId, code])  // ✅ 複合主キー
  @@index([sellerId], name: "kids_achievements_seller_idx")
  @@map("kids_achievements")
}
```

**変更点**:
- `sellerId`と`code`から`@id`を削除
- `@@id([sellerId, code])`を追加（複合主キー）

---

## 📋 次のステップ

### ステップ1: Gitにコミット・プッシュ

```powershell
# 変更を確認
git status

# 変更を追加
git add prisma/schema.prisma

# コミット
git commit -m "Fix: Correct composite primary key definition in KidsAchievement model"

# プッシュ
git push
```

### ステップ2: Render環境の再デプロイ確認

1. **Render Dashboard** → `fleapay-lite-t1` → **Events** タブ
2. 最新のデプロイを確認
3. **Logs** タブでビルドログを確認

**期待される結果**:
```
> postinstall
> prisma generate
```

**エラーがないことを確認**:
- `prisma generate`が正常に実行される
- バリデーションエラーがない

### ステップ3: 動作確認

再デプロイ完了後（通常2-5分）、以下で確認：

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
- ✅ エラーログにPrismaスキーマバリデーションエラーがない

---

## ✅ チェックリスト

- [x] Prismaスキーマの複合主キー定義を修正
- [ ] Gitにコミット・プッシュ
- [ ] Render環境の再デプロイ確認
- [ ] ビルドログで`prisma generate`が正常に実行されることを確認
- [ ] ヘルスチェックで`prisma: "connected"`を確認

---

## 🔗 関連ドキュメント

- [FIX_PRISMA_NOT_AVAILABLE.md](./FIX_PRISMA_NOT_AVAILABLE.md) - Prisma Client未初期化エラーの修正
- [FIX_RENDER_DATABASE_CONNECTION.md](./FIX_RENDER_DATABASE_CONNECTION.md) - データベース接続エラーの修正

