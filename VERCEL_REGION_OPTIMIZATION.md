# Vercelリージョン最適化ガイド（hnd1への変更）

**作成日**: 2026-01-06  
**目的**: Vercelのリージョンを`iad1`（US East）から`hnd1`（Tokyo）に変更してレイテンシを改善

---

## 📊 現在の状況

### ログ分析結果

| エンドポイント | 現在のリージョン | 実行時間 | メモリ使用量 |
|--------------|----------------|---------|------------|
| `/api/analyze-item` | `iad1` (US East) | 2,940ms | 296MB / 2,048MB |
| `/api/seller/summary` | `iad1` (US East) | 6,637ms | 280MB / 2,048MB |

### 問題点

- **レイテンシ**: 日本からのアクセスでUS Eastリージョンを使用しているため、RTTが大きい
- **パフォーマンス**: リージョン最適化により10-20%の改善が期待できる

---

## ✅ 実装完了

### 1. `vercel.json`の作成

リージョンを`hnd1`（Tokyo）に設定しました：

```json
{
  "regions": ["hnd1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    },
    "app/api/analyze-item/route.ts": {
      "maxDuration": 300
    },
    "app/api/**/*.py": {
      "runtime": "python3.9",
      "maxDuration": 300
    }
  },
  "crons": []
}
```

### 設定内容の説明

- **`regions: ["hnd1"]`**: すべてのServerless Functionsを東京リージョンで実行
- **`functions`**: エンドポイントごとの実行時間制限を設定
  - 通常のAPI: 60秒
  - AI分析API (`analyze-item`): 300秒（5分）- 画像処理とAI API呼び出しに対応
  - Python Functions: 300秒

---

## 🚀 デプロイ手順

### Step 1: 変更をコミット

```bash
git add vercel.json
git commit -m "feat: Vercelリージョンをhnd1（Tokyo）に変更"
git push origin main
```

### Step 2: Vercelでの確認

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクト `edoichiba-fleapay` を選択
3. **Settings** > **General** を開く
4. **Region** が `Tokyo (hnd1)` に設定されていることを確認

### Step 3: デプロイの確認

1. **Deployments** タブを開く
2. 最新のデプロイメントを確認
3. ログでリージョンが `hnd1` になっていることを確認

---

## 📈 期待される効果

### レイテンシ改善

| 項目 | 変更前 (iad1) | 変更後 (hnd1) | 改善率 |
|------|--------------|--------------|--------|
| 日本からのRTT | 150-200ms | 5-15ms | **90%以上** |
| `/api/analyze-item` | 2,940ms | 2,700-2,800ms | **5-8%** |
| `/api/seller/summary` | 6,637ms | 6,000-6,200ms | **7-10%** |

### その他の効果

- **ユーザー体験**: 日本からのアクセスが大幅に高速化
- **コスト**: リージョン変更による追加コストなし
- **可用性**: 東京リージョンは99.9% SLAを提供

---

## 🔍 検証方法

### 1. リージョンの確認

```bash
# Vercel CLIで確認
vercel inspect <deployment-url>

# または、ログで確認
# Vercel Dashboard > Logs で region フィールドを確認
```

### 2. パフォーマンステスト

```bash
# 日本からアクセスしてレイテンシを測定
curl -w "@curl-format.txt" -o /dev/null -s \
  https://edoichiba-fleapay.vercel.app/api/ping

# curl-format.txt の内容:
# time_namelookup:  %{time_namelookup}\n
# time_connect:  %{time_connect}\n
# time_starttransfer:  %{time_starttransfer}\n
# time_total:  %{time_total}\n
```

### 3. ログでの確認

Vercel Dashboardのログで以下のように表示されることを確認：

```json
{
  "region": "hnd1",
  "requestPath": "/api/analyze-item",
  "durationMs": 2700
}
```

---

## ⚠️ 注意事項

### 1. グローバルユーザーへの影響

- **日本ユーザー**: 大幅な改善（推奨）
- **海外ユーザー**: 若干のレイテンシ増加の可能性
  - 解決策: 将来的にマルチリージョン対応を検討

### 2. データベースリージョン

- Supabaseのリージョンも東京に設定されていることを確認
- 異なるリージョン間の通信はレイテンシが増加する

### 3. 外部APIのリージョン

- OpenAI API: グローバルエンドポイント（影響なし）
- Helicone: グローバルプロキシ（影響なし）
- Stripe: グローバルAPI（影響なし）

---

## 🔄 ロールバック手順

もし問題が発生した場合：

### 方法1: `vercel.json`を削除

```bash
git rm vercel.json
git commit -m "revert: Vercelリージョン設定を削除（デフォルトに戻す）"
git push origin main
```

### 方法2: リージョンを変更

```json
{
  "regions": ["iad1"]
}
```

---

## 📚 参考資料

- [Vercel - Edge Network Regions](https://vercel.com/docs/edge-network/regions)
- [Vercel - Functions Configuration](https://vercel.com/docs/functions/serverless-functions/runtimes)
- [Vercel - vercel.json Configuration](https://vercel.com/docs/projects/project-configuration)

---

## ✅ チェックリスト

- [x] `vercel.json`を作成
- [x] リージョンを`hnd1`に設定
- [x] Function実行時間を適切に設定
- [ ] 変更をコミット・プッシュ
- [ ] Vercel Dashboardで確認
- [ ] デプロイ後のログでリージョンを確認
- [ ] パフォーマンステストを実施
- [ ] 改善効果を測定

---

## 🎯 次のステップ（オプション）

### 1. マルチリージョン対応

将来的にグローバルユーザーに対応する場合：

```json
{
  "regions": ["hnd1", "iad1", "sfo1"]
}
```

### 2. Edge Functionsの活用

静的コンテンツや軽量な処理はEdge Functionsを使用：

```typescript
// middleware.ts
export const config = {
  runtime: 'edge',
  regions: ['hnd1']
}
```

### 3. CDNキャッシュの最適化

Vercelの自動CDNキャッシュを活用して、さらにパフォーマンスを向上。

---

**最終更新**: 2026-01-06  
**ステータス**: ✅ 実装完了（デプロイ待ち）

