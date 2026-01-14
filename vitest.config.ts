import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

// ESMモジュール対応: __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    // テスト環境の設定
    environment: "node",
    // テストファイルのパターン
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    // タイムアウト設定（時々発生する接続エラー対策）
    testTimeout: 30000, // 30秒
    hookTimeout: 30000, // フックのタイムアウトも30秒
    // カバレッジ設定（オプション）
    // coverage: {
    //   provider: "v8",
    //   reporter: ["text", "json", "html"],
    // },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

