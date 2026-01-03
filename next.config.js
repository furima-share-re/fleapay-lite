/** @type {import('next').NextConfig} */
const nextConfig = {
  // Phase 2.6: Express.js廃止 - Next.js完全移行
  output: 'standalone',
  
  // 環境変数の設定
  env: {
    // 既存の環境変数をNext.jsでも使用可能にする
  },
  
  // 静的ファイルの配信
  // 既存のpublic/ディレクトリをNext.jsでも使用
};

// ES module形式でエクスポート（package.jsonに"type": "module"があるため）
export default nextConfig;

