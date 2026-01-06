# 1ユーザー1000分のビルドパイプライン実現方法

## 🎯 目標
1ユーザーあたりのビルドパイプライン分数を1000分/月にする

## 📊 現状の制限

| プラン | ビルドパイプライン/月 |
|--------|---------------------|
| Hobby | 500分（全員で共有） |
| Professional | 500分/ユーザー |
| Organization | 500分/ユーザー |
| Enterprise | カスタム |

**標準プランでは最大500分/ユーザー/月が上限**

---

## ✅ 解決策1: 複数のワークスペースを使用（実用的・推奨）

### 方法
同じユーザーアカウントで2つのワークスペースを作成し、それぞれでProfessionalプランを使用

### 構成例

```
ワークスペース1（本番用）
├─ ユーザー: you@example.com
├─ プラン: Professional ($19/月)
└─ ビルドパイプライン: 500分/月

ワークスペース2（開発用）
├─ ユーザー: you@example.com（同じアカウント）
├─ プラン: Professional ($19/月）
└─ ビルドパイプライン: 500分/月

合計: 1000分/月
```

### コスト
- **$38/月**（$19 × 2ワークスペース）

### メリット
- ✅ 実装が簡単（今すぐ実行可能）
- ✅ 環境を分離できる（本番/開発）
- ✅ 制限内で確実に動作
- ✅ Render公式のサポート対象

### デメリット
- ❌ コストが2倍になる
- ❌ 2つのワークスペースを管理する必要がある

### 実装手順

1. **ワークスペース1（本番用）の作成**
   - Render Dashboardで新しいワークスペースを作成
   - 名前: `fleapay-lite-production`
   - プラン: Professional ($19/月)
   - 既存の本番サービスを移行

2. **ワークスペース2（開発用）の作成**
   - Render Dashboardで新しいワークスペースを作成
   - 名前: `fleapay-lite-development`
   - プラン: Professional ($19/月)
   - プレビュー環境や開発サービスを配置

3. **サービスの分配**
   ```
   ワークスペース1（本番）:
   - fleapay-lite-web（本番環境）
   - fleapay-lite-db（本番DB）

   ワークスペース2（開発）:
   - fleapay-lite-web-preview（プレビュー環境）
   - fleapay-lite-web-staging（ステージング環境）
   ```

---

## ✅ 解決策2: Renderに直接問い合わせ（Enterpriseプラン）

### 方法
Renderのサポートに問い合わせて、カスタムプランで1000分/ユーザーを交渉

### 問い合わせ先
- Email: support@render.com
- または Render Dashboard → Help → Contact Support

### 問い合わせ内容の例

```
Subject: Custom Build Pipeline Minutes - 1000 minutes per user

Hello Render Team,

I'm currently using the Professional plan with 500 build pipeline 
minutes per user per month. I need to increase this to 1000 minutes 
per user per month.

Is it possible to:
1. Add additional build pipeline minutes as an add-on?
2. Create a custom plan with 1000 minutes per user?
3. Upgrade to Enterprise plan with custom configuration?

We are willing to pay additional fees for this feature.

Best regards,
[Your Name]
```

### コスト見積もり
- Enterpriseプラン: カスタム価格（通常$数百/月以上）
- または追加オプション: 未定（要問い合わせ）

### メリット
- ✅ 1つのワークスペースで管理可能
- ✅ 公式サポート

### デメリット
- ❌ 対応可能か不明（公式に確認が必要）
- ❌ コストが高くなる可能性
- ❌ 実装までに時間がかかる可能性

---

## ✅ 解決策3: さらなるビルド時間の最適化

### 目標
ビルド時間を50%削減 → 実質的に1000分相当に

### 現在のビルド時間
- **7分/デプロイ**（最適化前）
- **5-6分/デプロイ**（既存の最適化後）

### 追加の最適化案

#### 3.1 GitHub Actionsで事前ビルド（オプション）

Renderのビルドパイプラインを使わず、GitHub Actionsでビルド済みアーティファクトをデプロイ

```yaml
# .github/workflows/build.yml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - # ビルド済みファイルをアップロード
```

**メリット**: GitHub Actionsの無料枠でビルド（2000分/月）
**デメリット**: 設定が複雑、Renderの自動デプロイが使えない

#### 3.2 依存関係の大幅削減

```bash
# 未使用のパッケージを検出
npx depcheck

# 未使用の依存関係を削除
npm prune
```

**削減効果**: 5-10%のビルド時間短縮

#### 3.3 インクリメンタルビルドの活用

Next.jsのインクリメンタルビルド機能を最大限活用

**削減効果**: 変更がない場合、10-30%のビルド時間短縮

---

## 📈 コスト比較

### シナリオ: 1ユーザーで月間150回デプロイ（5分/回 = 750分）

| 解決策 | コスト/月 | 利用可能時間 | 残り時間 |
|--------|----------|------------|---------|
| Professional（1ワークスペース） | $19 | 500分 | -250分 ❌ |
| 2ワークスペース（解決策1） | $38 | 1000分 | +250分 ✅ |
| Enterprise（カスタム） | $? | 1000分+ | +250分 ✅ |
| 最適化のみ | $19 | 500分 | -250分 ❌ |

---

## 🎯 推奨される解決策

### 短期（今すぐ実施可能）
**解決策1: 2つのワークスペース** ⭐推奨

- 実装が簡単
- 確実に1000分を確保
- コスト: $38/月

### 中期（1-2週間）
**解決策3: さらなる最適化 + 解決策1**

- ビルド時間をさらに削減
- 実質的に1200-1500分相当に

### 長期（必要に応じて）
**解決策2: Enterpriseプラン**

- Renderに直接問い合わせ
- カスタムプランで最適化

---

## 🚀 実装手順（解決策1の場合）

### ステップ1: ワークスペース1（本番）の作成

1. Render Dashboardにログイン
2. 右上のワークスペース選択 → **Create New Workspace**
3. 設定:
   - Name: `fleapay-lite-production`
   - Plan: **Professional** ($19/月)
4. 既存の本番サービスを移行

### ステップ2: ワークスペース2（開発）の作成

1. 同じアカウントで **Create New Workspace**
2. 設定:
   - Name: `fleapay-lite-development`
   - Plan: **Professional** ($19/月)
3. プレビュー/ステージング環境を配置

### ステップ3: サービスの移行

既存のサービスを適切なワークスペースに移動:
- 本番環境 → ワークスペース1
- プレビュー環境 → ワークスペース2

### ステップ4: 設定の確認

各ワークスペースで:
- ビルドパイプライン分数を確認（500分/ユーザー）
- 合計で1000分を確認

---

## 📋 チェックリスト

- [ ] ワークスペース1（本番）を作成
- [ ] ワークスペース2（開発）を作成
- [ ] 各ワークスペースでProfessionalプランに設定
- [ ] サービスを適切なワークスペースに移動
- [ ] ビルドパイプライン分数を確認（500分×2 = 1000分）
- [ ] Renderサポートに問い合わせ（Enterpriseプランの場合）

---

## 💡 その他の検討事項

### 代替案: GitHub ActionsとRenderの組み合わせ

GitHub Actionsでビルドし、ビルド済みアーティファクトをRenderにデプロイ:
- GitHub Actions: ビルド処理（2000分/月無料）
- Render: デプロイのみ（ビルド時間カウント不要）

ただし、Renderの自動デプロイ機能は使えなくなります。

---

## 📞 サポートへの問い合わせ

解決策2（Enterpriseプラン）を検討する場合:

**Email**: support@render.com
**Subject**: Custom Build Pipeline Minutes - 1000 minutes per user
**内容**: 上記のテンプレートを参照

