#!/bin/bash
# 全画面チェックツールの使用例

echo "=========================================="
echo "全画面チェックツール - 使用例"
echo "=========================================="
echo ""

# 色の定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 例1: ローカル環境の基本チェック
echo -e "${GREEN}例1: ローカル環境の基本チェック${NC}"
echo "コマンド: npm run check-screens"
echo "説明: ローカル環境（http://localhost:3000）の全画面をチェック"
echo ""

# 例2: ステージング環境のチェック
echo -e "${GREEN}例2: ステージング環境のチェック${NC}"
echo "コマンド: npm run check-screens:staging"
echo "説明: ステージング環境の全画面をチェック"
echo ""

# 例3: 結果をファイルに保存
echo -e "${GREEN}例3: 結果をファイルに保存${NC}"
echo "コマンド: OUTPUT_FILE=check-results.json npm run check-screens"
echo "説明: JSON形式で結果を保存（HTMLも自動生成）"
echo ""

# 例4: HTML形式のみ出力
echo -e "${GREEN}例4: HTML形式のみ出力${NC}"
echo "コマンド: OUTPUT_FORMAT=html npm run check-screens > report.html"
echo "説明: HTMLレポートをファイルに保存"
echo ""

# 例5: 高度版（スクリーンショット付き）
echo -e "${GREEN}例5: 高度版（スクリーンショット付き）${NC}"
echo "コマンド: npm run check-screens:advanced"
echo "説明: Puppeteerを使用した詳細チェック（スクリーンショット付き）"
echo ""

# 例6: カスタムURL
echo -e "${GREEN}例6: カスタムURLを指定${NC}"
echo "コマンド: BASE_URL=https://example.com npm run check-screens"
echo "説明: 任意のURLをチェック対象に指定"
echo ""

# 実際に実行する例
echo -e "${YELLOW}実際に実行してみますか？ (y/n)${NC}"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${GREEN}実行中...${NC}"
    echo ""
    
    # サーバーが起動しているか確認
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✓ ローカルサーバーに接続できました"
        echo ""
        npm run check-screens
    else
        echo -e "${RED}✗ ローカルサーバーに接続できませんでした${NC}"
        echo "まず 'npm run dev' でサーバーを起動してください"
        echo ""
        echo "または、ステージング環境をチェックしますか？ (y/n)"
        read -r staging_response
        if [[ "$staging_response" =~ ^[Yy]$ ]]; then
            npm run check-screens:staging
        fi
    fi
fi

echo ""
echo "=========================================="
echo "詳細な使い方は scripts/USAGE_GUIDE.md を参照してください"
echo "=========================================="





