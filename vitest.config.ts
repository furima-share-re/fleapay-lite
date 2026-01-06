import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    // テスト環境の設定
    environment: "node",
    // テストファイルのパターン
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
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

