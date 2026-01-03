# 移行計画 全体像（完全版）

**作成日**: 2026-01-02  
**対象**: fleapay-lite プロジェクト

---

## 📊 全体構造

### Phase構成

```
Phase 1: 基盤整備（データベース移行）
├── Phase 1.1: TypeScript導入 ✅
├── Phase 1.2: Supabase作成 + Prisma設定 ✅
├── Phase 1.3: 検証環境データ移行 ✅
├── Phase 1.4: 検証環境環境移行 ✅
├── Phase 1.5: Supabase Auth移行（新規ユーザー） ✅
├── Phase 1.6: 既存ユーザー移行 ✅
├── Phase 1.7: RLS実装 ⏳（最終工程）
└── Phase 1.8: 本番環境DB移行 ⏳（最終工程）

Phase 2: Next.js移行（フロントエンド刷新）
├── Phase 2.1: Next.jsプロジェクト初期設定 ✅
├── Phase 2.2: Next.js API Routes移行 ⏳
└── Phase 2.3: Next.jsページ移行 ⏳
```

---

## 📈 全体進捗率

### 基本数値

| 項目 | 数値 |
|------|------|
| **完了Phase数** | 7/11 |
| **全体進捗率** | **63.6%** |
| **残りPhase数** | 4 |

### 詳細内訳

| Phase | 状態 | 進捗 |
|-------|------|------|
| **Phase 1.1** | ✅ 完了 | 100% |
| **Phase 1.2** | ✅ 完了 | 100% |
| **Phase 1.3** | ✅ 完了 | 100% |
| **Phase 1.4** | ✅ 完了 | 100% |
| **Phase 1.5** | ✅ 完了 | 100% |
| **Phase 1.6** | ✅ 完了 | 100% |
| **Phase 2.1** | ✅ 完了 | 100% |
| **Phase 2.2** | ⏳ 未着手 | 0% |
| **Phase 2.3** | ⏳ 未着手 | 0% |
| **Phase 1.7** | ⏳ 未着手 | 0% |
| **Phase 1.8** | ⏳ 未着手 | 0% |

---

## 🎯 Phase 2 詳細（Next.js移行）

### Phase 2.1: Next.jsプロジェクト初期設定 ✅ **完了**

**実装日**: 2026-01-02  
**状態**: ✅ **完了**

**実施内容**:
- ✅ Next.js依存関係追加（`next`, `react`, `react-dom`）
- ✅ `next.config.js` 作成
- ✅ App Router構造作成（`app/` ディレクトリ）
- ✅ `/api/ping` エンドポイント移行完了
- ✅ Express.jsとNext.jsの並行稼働設定

**実装ファイル**:
- `next.config.js`
- `app/layout.tsx`
- `app/page.tsx`
- `app/api/ping/route.ts`
- `package.json`（Next.js依存関係追加）

**動作確認**:
- ✅ Next.js開発サーバー起動確認
- ✅ `/api/ping` エンドポイント動作確認
- ✅ Express.jsとNext.jsの並行稼働確認

---

### Phase 2.2: Next.js API Routes移行 ⏳ **未着手**

**予定期間**: Month 2-3  
**状態**: ⏳ 未着手  
**優先度**: 🔴 **最優先**

**実施内容**:
1. **APIエンドポイントの移行**
   - Express.jsルート → Next.js Route Handlers
   - `/api/seller/*` エンドポイント移行
   - `/api/admin/*` エンドポイント移行
   - `/api/auth/*` エンドポイント移行
   - `/api/pending/*` エンドポイント移行

2. **Server Actions実装**
   - 内部API呼び出しをServer Actions化
   - 型安全性の向上

3. **動作確認**
   - 各APIエンドポイントの動作確認
   - Express.jsとの並行稼働確認

**移行対象API**:
- `/api/seller/summary` - 売上サマリー取得
- `/api/seller/start_onboarding` - 新規ユーザー登録
- `/api/auth/reset-password` - パスワードリセット
- `/api/admin/*` - 管理API
- その他のAPIエンドポイント

---

### Phase 2.3: Next.jsページ移行 ⏳ **未着手**

**予定期間**: Month 2-3  
**状態**: ⏳ 未着手  
**優先度**: 🔴 **最優先**

**実施内容**:
1. **Tailwind CSS + shadcn/ui導入**
   - Tailwind CSS設定
   - shadcn/uiコンポーネント導入

2. **静的HTMLファイルの移行**
   - `public/*.html` → Next.jsページコンポーネント
   - `seller-dashboard.html` → `app/seller/dashboard/page.tsx`
   - `seller-purchase.html` → `app/seller/purchase/page.tsx`
   - `checkout.html` → `app/checkout/page.tsx`
   - その他のHTMLファイル

3. **React Hook Form + Zod導入**
   - フォーム管理の改善
   - バリデーションの型安全性向上

4. **動作確認**
   - 各ページの動作確認
   - 既存機能との互換性確認

**移行対象ページ**:
- `seller-dashboard.html` - セラーダッシュボード
- `seller-purchase.html` - 商品購入画面
- `seller-purchase-standard.html` - 標準プラン購入画面
- `checkout.html` - 決済画面
- `checkout-matsuri.html` - 祭り決済画面
- `admin-dashboard.html` - 管理ダッシュボード
- その他のHTMLファイル

---

## 📊 Phase別進捗詳細

### Phase 1（基盤整備）の進捗

| 項目 | 進捗 |
|------|------|
| **Phase 1.1-1.6** | ✅ **100%完了**（6/6） |
| **Phase 1.7-1.8** | ⏳ **未着手**（0/2） |
| **Phase 1全体** | **75.0%完了**（6/8） |

**完了内容**:
- ✅ TypeScript導入
- ✅ Supabase + Prisma設定
- ✅ 検証環境データ移行
- ✅ 検証環境環境移行
- ✅ Supabase Auth移行（新規・既存ユーザー）

**残り作業**:
- ⏳ RLS実装（最終工程）
- ⏳ 本番環境DB移行（最終工程）

---

### Phase 2（Next.js移行）の進捗

| 項目 | 進捗 |
|------|------|
| **Phase 2.1** | ✅ **100%完了**（1/1） |
| **Phase 2.2-2.3** | ⏳ **未着手**（0/2） |
| **Phase 2全体** | **33.3%完了**（1/3） |

**完了内容**:
- ✅ Next.jsプロジェクト初期設定
- ✅ `/api/ping` エンドポイント移行

**残り作業**:
- ⏳ API Routes移行（Phase 2.2）
- ⏳ ページ移行（Phase 2.3）

---

## 🎯 実施順序（優先順位）

### 最優先（現在進行中）

1. **Phase 2.2: Next.js API Routes移行**
   - 期間: Month 2-3
   - 優先度: 🔴 **最優先**
   - 状態: ⏳ 未着手

2. **Phase 2.3: Next.jsページ移行**
   - 期間: Month 2-3
   - 優先度: 🔴 **最優先**
   - 状態: ⏳ 未着手

### 最終工程（Phase 2完了後）

3. **Phase 1.7: RLS実装**
   - 期間: Week 4 Day 1-2
   - 優先度: 🔴 **セキュリティ**
   - 状態: ⏳ 未着手
   - **実施タイミング**: Phase 2完了後

4. **Phase 1.8: 本番環境DB移行**
   - 期間: Week 4 Day 3-5
   - 優先度: 🔴 **リスク管理**
   - 状態: ⏳ 未着手
   - **実施タイミング**: Phase 2完了後

---

## 📋 完了条件

### Phase 2完了の定義

Phase 2が完了するのは、以下の3つのサブフェーズがすべて完了した時点です：

- ✅ Phase 2.1: Next.jsプロジェクト初期設定（完了）
- ⏳ Phase 2.2: Next.js API Routes移行（未着手）
- ⏳ Phase 2.3: Next.jsページ移行（未着手）

**Phase 2全体の進捗**: 33.3%完了（1/3）

---

### 移行計画全体完了の定義

移行計画が完了するのは、以下のすべてが完了した時点です：

- ✅ Phase 1.1-1.6: 完了
- ✅ Phase 2.1: 完了
- ⏳ Phase 2.2-2.3: 未着手
- ⏳ Phase 1.7: 未着手（最終工程）
- ⏳ Phase 1.8: 未着手（最終工程）

**全体進捗**: 63.6%完了（7/11 Phase）

---

## 🎯 次のステップ

### 短期目標（Month 2-3）

1. **Phase 2.2: Next.js API Routes移行**
   - Express.jsルートをNext.js Route Handlersへ移行
   - Server Actions実装

2. **Phase 2.3: Next.jsページ移行**
   - 静的HTMLファイルをNext.jsページコンポーネントへ移行
   - Tailwind CSS + shadcn/ui導入
   - React Hook Form + Zod導入

### 中期目標（Phase 2完了後）

3. **Phase 1.7: RLS実装**
   - 検証環境でRLS実装・動作確認
   - 本番環境に適用

4. **Phase 1.8: 本番環境DB移行**
   - 本番環境Supabaseプロジェクト作成
   - 本番環境データ移行
   - 動作確認

---

## 📊 進捗率の推移

| 日付 | 完了Phase数 | 進捗率 | 主な完了内容 |
|------|-----------|--------|------------|
| 2025-12-31 | 1/11 | 9.1% | Phase 1.1: TypeScript導入 |
| 2026-01-01 | 2/11 | 18.2% | Phase 1.2: Supabase + Prisma設定 |
| 2026-01-02 | 7/11 | **63.6%** | Phase 1.3-1.6 + Phase 2.1完了 |

**直近の進捗**: 2026-01-02にPhase 1.3-1.6とPhase 2.1を完了し、進捗率が18.2%から63.6%に大幅向上

---

## ✅ 結論

### 現状サマリー

- **全体進捗率**: **63.6%**（7/11 Phase完了）
- **Phase 1（基盤整備）**: **75.0%完了**（6/8）
- **Phase 2（Next.js移行）**: **33.3%完了**（1/3）
- **検証環境**: **60.0%完了**（3/5）
- **本番環境**: **0%完了**（0/3）

### 次のアクション

1. **Phase 2.2: Next.js API Routes移行**を最優先で実施
2. **Phase 2.3: Next.jsページ移行**を実施
3. Phase 2完了後、**Phase 1.7/1.8**を最終工程として実施

### 期待される効果

Phase 2完了時点で:
- AI修正成功率: 60% → **98%**
- 開発効率: **2-3倍向上**
- 全体進捗率: 63.6% → **81.8%**（9/11 Phase完了）

---

**レポート作成者**: AI Assistant  
**次回更新推奨日**: Phase 2.2開始時



