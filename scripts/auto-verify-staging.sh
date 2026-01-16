#!/bin/bash
# Cursor用: 自動デプロイ状態確認 + 動作確認スクリプト（Bash版）
# 使用方法: ./scripts/auto-verify-staging.sh [BASE_URL]

set -e

BASE_URL="${1:-https://fleapay-lite-t1.onrender.com}"
SKIP_DEPLOYMENT_CHECK="${SKIP_DEPLOYMENT_CHECK:-false}"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  Cursor用: 自動デプロイ状態確認 + 動作確認スクリプト    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Step 1: デプロイ状態確認
if [ "$SKIP_DEPLOYMENT_CHECK" != "true" ]; then
    echo "📋 Step 1: デプロイ状態確認"
    echo "─────────────────────────────────────────────────────────"
    
    # デプロイ状態確認スクリプトを実行
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if ! "$SCRIPT_DIR/check-deployment-status.sh" "$BASE_URL"; then
        echo ""
        echo "❌ デプロイ状態確認に失敗しました。動作確認をスキップします。"
        exit 1
    fi
    
    echo ""
    echo "✅ デプロイ状態確認完了"
    echo ""
else
    echo "⚠️ デプロイ状態確認をスキップします"
    echo ""
fi

# Step 2: 動作確認
echo "📋 Step 2: 動作確認"
echo "─────────────────────────────────────────────────────────"

# 2.1 ヘルスチェック
echo ""
echo "1. ヘルスチェック (/api/ping)"
if command -v jq &> /dev/null; then
    RESPONSE=$(curl -s "$BASE_URL/api/ping")
    STATUS=$(echo "$RESPONSE" | jq -r '.ok // false')
    VERSION=$(echo "$RESPONSE" | jq -r '.version // "unknown"')
    PRISMA=$(echo "$RESPONSE" | jq -r '.prisma // "unknown"')
    
    if [ "$STATUS" = "true" ]; then
        echo "   ✅ ステータス: OK"
        echo "   ✅ バージョン: $VERSION"
        echo "   ✅ Prisma: $PRISMA"
    else
        echo "   ❌ エラー: サーバーが正常に応答していません"
        exit 1
    fi
else
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/ping")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ ステータス: $HTTP_CODE"
    else
        echo "   ❌ エラー: HTTP $HTTP_CODE"
        exit 1
    fi
fi

# 2.2 APIエンドポイント確認
echo ""
echo "2. APIエンドポイント確認"

ENDPOINTS=(
    "test-seller-standard:standard"
    "test-seller-pro:pro"
    "test-seller-kids:kids"
)

ALL_PASSED=true
for endpoint in "${ENDPOINTS[@]}"; do
    SELLER_ID=$(echo "$endpoint" | cut -d':' -f1)
    EXPECTED_PLAN=$(echo "$endpoint" | cut -d':' -f2)
    
    if command -v jq &> /dev/null; then
        RESPONSE=$(curl -s "$BASE_URL/api/seller/summary?s=$SELLER_ID")
        PLAN_TYPE=$(echo "$RESPONSE" | jq -r '.planType // "unknown"')
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/seller/summary?s=$SELLER_ID")
        
        if [ "$HTTP_CODE" = "200" ] && [ "$PLAN_TYPE" = "$EXPECTED_PLAN" ]; then
            echo "   ✅ 売上サマリー ($EXPECTED_PLAN): OK (planType: $PLAN_TYPE)"
        else
            echo "   ⚠️ 売上サマリー ($EXPECTED_PLAN): planType不一致 (期待: $EXPECTED_PLAN, 実際: $PLAN_TYPE)"
            ALL_PASSED=false
        fi
    else
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/seller/summary?s=$SELLER_ID")
        if [ "$HTTP_CODE" = "200" ]; then
            echo "   ✅ 売上サマリー ($EXPECTED_PLAN): OK (Status: $HTTP_CODE)"
        else
            echo "   ⚠️ 売上サマリー ($EXPECTED_PLAN): Status $HTTP_CODE"
            ALL_PASSED=false
        fi
    fi
done

# 2.3 画面確認（HTMLの存在確認）
echo ""
echo "3. 画面確認（HTMLの存在確認）"

PAGES=(
    "seller-dashboard?s=test-seller-pro:セラーダッシュボード"
    "seller-purchase-standard.html?s=test-seller-pro:レジ画面"
)

for page in "${PAGES[@]}"; do
    PAGE_PATH=$(echo "$page" | cut -d':' -f1)
    PAGE_NAME=$(echo "$page" | cut -d':' -f2)
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/$PAGE_PATH")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ $PAGE_NAME: OK (Status: $HTTP_CODE)"
    else
        echo "   ⚠️ $PAGE_NAME: Status $HTTP_CODE"
        ALL_PASSED=false
    fi
done

# 結果サマリー
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
if [ "$ALL_PASSED" = true ]; then
    echo "║  ✅ すべての動作確認が正常に完了しました                ║"
else
    echo "║  ⚠️ 一部の動作確認で問題が発生しました                  ║"
fi
echo "╚═══════════════════════════════════════════════════════════╝"

if [ "$ALL_PASSED" != true ]; then
    exit 1
fi

