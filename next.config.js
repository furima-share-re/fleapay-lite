/** @type {import('next').NextConfig} */
const nextConfig = {
  // Phase 2.6: Express.js廃止 - Next.js完全移行
  output: 'standalone',
  
  // ビルド最適化: 本番環境でソースマップを無効化（ビルド時間短縮）
  productionBrowserSourceMaps: false,
  
  // SWCによる高速化（Next.js 12+でデフォルト有効）
  swcMinify: true,
  
  // 実験的機能: 並列ビルドを有効化（ビルド時間短縮）
  experimental: {
    // ページの並列コンパイルを有効化
    optimizeCss: true,
  },
  
  // 環境変数の設定
  env: {
    // 既存の環境変数をNext.jsでも使用可能にする
  },
  
  // 静的ファイルの配信
  // 既存のpublic/ディレクトリをNext.jsでも使用
  
  // 画像最適化設定
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.genspark.ai',
        pathname: '/api/files/**',
      },
    ],
    unoptimized: false,
  },
  
  // BASE_URLが設定されている場合、assetPrefixを設定
  // Render環境では通常空文字列で問題ないが、必要に応じて設定
  // assetPrefix: process.env.BASE_URL || '',
};

// ES module形式でエクスポート（package.jsonに"type": "module"があるため）
export default nextConfig;

