/** @type {import('next').NextConfig} */
const nextConfig = {
  // Phase 2: Next.js移行
  // ExpressとNext.jsの共存期間中は、既存の静的ファイルを配信
  output: 'standalone',
  
  // 環境変数の設定
  env: {
    // 既存の環境変数をNext.jsでも使用可能にする
  },
  
  // 既存のAPIエンドポイントとの共存
  async rewrites() {
    return [
      // Next.jsのAPIルートを優先し、存在しない場合はExpressにフォールバック
      // （実装段階で調整）
    ];
  },
  
  // 静的ファイルの配信
  // 既存のpublic/ディレクトリをNext.jsでも使用
};

// ES module形式でエクスポート（package.jsonに"type": "module"があるため）
export default nextConfig;

