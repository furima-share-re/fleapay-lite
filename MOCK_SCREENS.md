# おみくじアプリ モック画面一覧

## 📱 画面構成

このアプリには 3 つの実装バージョンがあり、それぞれ異なるアニメーション技術を使用しています。

### バージョン一覧

1. **Framer Motion 版** (`/omikuji-fm`) - 2D アニメーション
2. **React Three Fiber 版** (`/omikuji-r3f`) - 3D アニメーション
3. **Theatre.js + Leva 版** (`/omikuji-theatre`) - 3D アニメーション + アニメーション制御

---

## 🎯 画面フロー

```
メインページ → 振るページ → 結果ページ
```

---

## 📄 画面詳細

### 1. メインページ (Main Page)

**URL:**

- Framer Motion 版: `https://edo-ichiba.com/omikuji-fm`
- React Three Fiber 版: `http://localhost:3000/omikuji-r3f`
- Theatre.js + Leva 版: `http://localhost:3000/omikuji-theatre`

**ファイル:**

- `app/omikuji-fm/page.tsx`
- `app/omikuji-r3f/page.tsx`
- `app/omikuji-theatre/page.tsx`

**主な要素:**

- ✅ タイトル: "EDO ICHIBA" + "Omikuji Fortune-Telling"
- ✅ 大きな「運試し」テキスト（光るエフェクト付き）
- ✅ 左右の暖簾（青海波パターン、金色の楕円モチーフ）
- ✅ 中央のおみくじ箱（赤、金色の装飾、鶴と桜のモチーフ）
- ✅ 背景の夜空（星 50 個、金色の花火 8 個）
- ✅ 市場の屋台と人のシルエット
- ✅ 上部の提灯（7 個、赤い提灯の列）
- ✅ "DRAW FORTUNE" ボタン（楕円形、金色のボーダー、コインアイコン付き）
- ✅ 左右から浮かぶ小判（2 個）
- ✅ 下部ナビゲーションバー（4 つのアイコン: ⛩ 📜 🎭 ⚙️）

**特徴:**

- 3D 版では、おみくじ箱が 3D モデルとして表示される
- Theatre.js 版では、開発環境で Leva コントロールパネルが表示される

---

### 2. 振るページ (Shake Page)

**URL:**

- Framer Motion 版: `http://localhost:3000/omikuji-fm/shake`
- React Three Fiber 版: `http://localhost:3000/omikuji-r3f/shake`
- Theatre.js + Leva 版: `http://localhost:3000/omikuji-theatre/shake`

**ファイル:**

- `app/omikuji-fm/shake/page.tsx`
- `app/omikuji-r3f/shake/page.tsx`
- `app/omikuji-theatre/shake/page.tsx`

**主な要素:**

- ✅ ヘッダー（左矢印、中央に"EDO ICHIBA OMIKUJI"、右に Wi-Fi/バッテリーアイコン）
- ✅ 大きな「よーっ!」テキスト（金色の縁取り、背後に花火の爆発エフェクト）
- ✅ 左右の暖簾（「江戸市場」の文字、振る動作で揺れる）
- ✅ 右下から伸びる手（着物の袖、モーションブラー効果）
- ✅ 八角形のおみくじ箱（上部にスリット、前面に「おみくじ」ラベル）
- ✅ 小判が大量に舞い上がる（50 個、上に向かって螺旋状に）
- ✅ 小判の文字（「大吉」「福」「吉」「中吉」「小吉」「口力切」）
- ✅ 光の輪と粒子エフェクト
- ✅ 背景の花火（金色、8 個）
- ✅ 背景の提灯（小判模様の赤い提灯、右側に複数の提灯）
- ✅ 市場の屋台と人のシルエット
- ✅ "Shake to Reveal!" ボタン（波打つ括弧付き: `((` と `))`）

**動作:**

- 自動的に振る動作が開始（500ms 後）
- 3 秒後に結果画面へ自動リダイレクト

**特徴:**

- Framer Motion 版: 2D アニメーションで小判が舞い上がる
- React Three Fiber 版: 3D 空間で小判が螺旋状に飛び出す
- Theatre.js 版: アニメーションを Theatre.js で制御可能

---

### 3. 結果ページ (Result Page)

**URL:**

- Framer Motion 版: `http://localhost:3000/omikuji-fm/result?fortune=大吉`
- React Three Fiber 版: `http://localhost:3000/omikuji-r3f/result?fortune=大吉`
- Theatre.js + Leva 版: `http://localhost:3000/omikuji-theatre/result?fortune=大吉`

**ファイル:**

- `app/omikuji-fm/result/page.tsx`
- `app/omikuji-r3f/result/page.tsx`
- `app/omikuji-theatre/result/page.tsx`

**主な要素:**

- ✅ 運勢の種類（大吉、中吉、小吉、吉、末吉、凶）
- ✅ 運勢カード（グラデーション背景、運勢に応じた色）
- ✅ 小判が降り注ぐ（30 個、上から下へ）
- ✅ 花火エフェクト（20 個、複数の色）
- ✅ 桜の花びら（20 個、舞い散る）
- ✅ 背景の夜空と星
- ✅ 再挑戦ボタン

**運勢の色:**

- 大吉: 赤系 (`from-red-500 to-red-700`)
- 中吉: オレンジ系 (`from-orange-500 to-orange-700`)
- 小吉: 黄色系 (`from-yellow-500 to-yellow-700`)
- 吉: 緑系 (`from-green-500 to-green-700`)
- 末吉: 青系 (`from-blue-500 to-blue-700`)
- 凶: グレー系 (`from-gray-500 to-gray-700`)

**特徴:**

- 3D 版では、小判と花火が 3D 空間で表示される
- 運勢に応じたエフェクトの強さが変わる

---

## 🎨 デザイン要素

### カラーパレット

- **背景**: 深い青 (`#1B365D`, `#0f2740`, `black`)
- **おみくじ箱**: 赤 (`#dc2626`) + 金色の装飾 (`#FFD700`)
- **小判**: 金色グラデーション (`from-yellow-400 to-yellow-600`)
- **提灯**: 赤 (`#dc2626`) + 白
- **テキスト**: 白 + 金色の光るエフェクト

### アニメーション

- **Framer Motion 版**:

  - 2D アニメーション
  - 滑らかなトランジション
  - パフォーマンス最適化済み

- **React Three Fiber 版**:

  - 3D 空間でのアニメーション
  - WebGL レンダリング
  - リアルな 3D 効果

- **Theatre.js + Leva 版**:
  - 3D アニメーション
  - 開発環境でアニメーションをリアルタイム編集可能
  - Leva コントロールパネルでパラメータ調整

---

## 🔗 ナビゲーション

### メインページ → 振るページ

- "DRAW FORTUNE" ボタンをクリック
- 自動的に `/omikuji-{version}/shake` へ遷移

### 振るページ → 結果ページ

- 自動的に 3 秒後に遷移
- 運勢はランダム（現在は固定で「大吉」）

### 結果ページ → メインページ

- 再挑戦ボタンをクリック
- またはブラウザの戻るボタン

---

## 📝 実装メモ

### 共通要素

すべてのバージョンで以下の要素が共通：

- 背景の夜空と星
- 提灯
- 暖簾
- 市場のシルエット
- 基本的なレイアウト構造

### バージョン固有の要素

**Framer Motion 版:**

- 2D アニメーション
- 軽量で高速
- モバイル対応が容易

**React Three Fiber 版:**

- 3D おみくじ箱
- 3D 小判と花火
- より視覚的にインパクトがある

**Theatre.js + Leva 版:**

- 3D アニメーション
- 開発環境でアニメーション編集可能
- プロトタイピングに最適

---

## 🚀 開発環境での確認方法

1. 開発サーバーを起動:

   ```bash
   npm run dev
   ```

2. ブラウザで以下にアクセス:

   - Framer Motion 版: `http://localhost:3000/omikuji-fm`
   - React Three Fiber 版: `http://localhost:3000/omikuji-r3f`
   - Theatre.js + Leva 版: `http://localhost:3000/omikuji-theatre`

3. 各画面を確認:
   - メインページ → "DRAW FORTUNE" をクリック
   - 振るページ → 自動的に結果ページへ遷移
   - 結果ページ → 再挑戦ボタンでメインページへ戻る

---

## 📊 画面遷移図

```
┌─────────────────┐
│   メインページ   │
│  (page.tsx)     │
└────────┬────────┘
         │ "DRAW FORTUNE" クリック
         ▼
┌─────────────────┐
│   振るページ     │
│ (shake/page.tsx)│
└────────┬────────┘
         │ 自動リダイレクト (3秒後)
         ▼
┌─────────────────┐
│   結果ページ     │
│(result/page.tsx)│
└────────┬────────┘
         │ 再挑戦ボタン
         ▼
┌─────────────────┐
│   メインページ   │
│  (page.tsx)     │
└─────────────────┘
```

---

## 🎯 今後の改善予定

- [ ] パフォーマンス最適化（メモ化）
- [ ] コードの共通化（背景要素をコンポーネント化）
- [ ] アクセシビリティ対応（aria-label 追加）
- [ ] エラーハンドリング（Error Boundary 実装）
- [ ] 実際の運勢抽選ロジックの実装

---

最終更新: 2024 年
