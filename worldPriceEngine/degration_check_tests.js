// デグレチェック用テストスクリプト
// 修正前後の動作比較テスト

/**
 * 🔧 修正内容サマリー
 * 
 * ① PSA用キーワード生成: "graded card" → 作品名ベース (keywordBuilder.js)
 *    ✅ すでに適用済み
 * 
 * ② PSAフィルタ: PSA10専用 → 全グレード対応 (ebayClient.js)
 *    🔧 今回適用
 * 
 * ③ 日本語トレカ: デフォルトで「Japanese」付与 (keywordBuilder.js)
 *    ✅ すでに適用済み
 */

// ======================================
// テストケース定義
// ======================================

const TEST_CASES = {
  // --- PSA グレード判定テスト ---
  psa_grade_detection: [
    {
      name: "PSA10 カード",
      input: "カビゴンar psa10 151 日本製 AR 181 SV2a",
      expected: {
        keyword_contains: ["Pokemon card", "PSA", "10", "Japanese"],
        ebay_filter_grade: "10",
        should_match_titles: [
          "Snorlax AR 181/165 Pokemon Card 151 SV2a PSA 10 Japanese",
          "Pokemon Snorlax 181 SV2A PSA10 Japan"
        ],
        should_NOT_match_titles: [
          "Snorlax AR 181/165 PSA 9 Japanese", // PSA9は除外
          "Snorlax 181 Raw Japanese", // 生カードは除外
          "Snorlax AR PSA 8 English" // PSA8は除外
        ]
      }
    },
    {
      name: "PSA9 カード",
      input: "リザードンex PSA9 日本語",
      expected: {
        keyword_contains: ["Pokemon card", "Charizard", "PSA", "9", "Japanese"],
        ebay_filter_grade: "9",
        should_match_titles: [
          "Charizard ex PSA 9 Japanese",
          "Pokemon Charizard PSA9 Japan"
        ],
        should_NOT_match_titles: [
          "Charizard ex PSA 10 Japanese", // PSA10は除外
          "Charizard ex PSA 8 Japanese", // PSA8は除外
          "Charizard ex Raw Japanese" // 生カードは除外
        ]
      }
    },
    {
      name: "PSA8 カード",
      input: "ピカチュウ PSA8 25周年",
      expected: {
        keyword_contains: ["Pokemon card", "Pikachu", "PSA", "8", "Japanese"],
        ebay_filter_grade: "8",
        should_match_titles: [
          "Pikachu 25th Anniversary PSA 8 Japanese",
          "Pokemon Pikachu PSA8 25th"
        ],
        should_NOT_match_titles: [
          "Pikachu PSA 10 25th Japanese",
          "Pikachu PSA 9 25th Japanese",
          "Pikachu Raw 25th"
        ]
      }
    }
  ],

  // --- 作品名ベースキーワード生成テスト ---
  work_based_keyword: [
    {
      name: "ポケカPSA10",
      input: "カビゴンar psa10 151 日本製 AR 181 SV2a",
      expected: {
        base_keyword: "Pokemon card", // ✅ "graded card" ではない
        keyword_contains: ["Pokemon card", "PSA", "10"],
        keyword_NOT_contains: ["graded card"]
      }
    },
    {
      name: "遊戯王PSA9",
      input: "ブラックマジシャンガール PSA9 初期",
      expected: {
        base_keyword: "Yu-Gi-Oh card",
        keyword_contains: ["Yu-Gi-Oh card", "PSA", "9"],
        keyword_NOT_contains: ["graded card"]
      }
    },
    {
      name: "ワンピースカードPSA10",
      input: "ルフィ シークレット PSA10 OP01-001",
      expected: {
        base_keyword: "One Piece card",
        keyword_contains: ["One Piece card", "PSA", "10"],
        keyword_NOT_contains: ["graded card"]
      }
    },
    {
      name: "作品不明のPSAカード（fallback）",
      input: "未知のTCG PSA10",
      expected: {
        base_keyword: "graded card", // fallback
        keyword_contains: ["graded card", "PSA", "10"]
      }
    }
  ],

  // --- 日本語トレカ自動Japanese付与テスト ---
  japanese_auto_append: [
    {
      name: "日本語ポケカ（Japanese明示なし）",
      input: "ピカチュウ AR 181/165 SV2a",
      expected: {
        keyword_contains: ["Pokemon card", "Pikachu", "Japanese"],
        auto_appended_japanese: true
      }
    },
    {
      name: "日本語遊戯王（Japanese明示なし）",
      input: "ブラックマジシャン 初期",
      expected: {
        keyword_contains: ["Yu-Gi-Oh card", "Japanese"],
        auto_appended_japanese: true
      }
    },
    {
      name: "英語版明示（Japanese付与しない）",
      input: "ピカチュウ 英語版 AR",
      expected: {
        keyword_NOT_contains: ["Japanese"],
        auto_appended_japanese: false
      }
    },
    {
      name: "すでにJapanese明示（重複しない）",
      input: "ピカチュウ AR Japanese",
      expected: {
        keyword_contains: ["Japanese"],
        japanese_count: 1 // 重複なし
      }
    }
  ],

  // --- 既存機能のデグレチェック ---
  degration_check: [
    {
      name: "通常のポケカシングル",
      input: "ピカチュウ AR 181/165 SV2a",
      expected: {
        genre: "tcg_pokemon_single",
        keyword_contains: ["Pokemon card", "Pikachu", "AR", "181"]
      }
    },
    {
      name: "ポケカBOX",
      input: "シャイニートレジャーex BOX シュリンク付き",
      expected: {
        genre: "tcg_pokemon_sealed_box",
        keyword_contains: ["Pokemon card", "Shiny Treasure ex SV4a", "booster box", "sealed"]
      }
    },
    {
      name: "遊戯王シングル",
      input: "ブラックマジシャンガール 20th シークレット",
      expected: {
        genre: "tcg_yugioh_single",
        keyword_contains: ["Yu-Gi-Oh card"]
      }
    },
    {
      name: "フィギュア",
      input: "ねんどろいど 初音ミク",
      expected: {
        genre: "figure_domestic",
        keyword_contains: ["figure"]
      }
    }
  ]
};

// ======================================
// デグレチェック実行ロジック
// ======================================

/**
 * keywordBuilder.js のテスト
 */
function testKeywordBuilder(testCase) {
  const results = [];
  
  console.log(`\n📝 テスト: ${testCase.name}`);
  console.log(`   入力: "${testCase.input}"`);
  
  // ここで実際の buildEbayKeywordFromSummary を呼ぶ
  // const keyword = buildEbayKeywordFromSummary(testCase.input);
  
  // 期待値チェック
  if (testCase.expected.keyword_contains) {
    console.log(`   ✅ チェック: キーワードに以下を含む必要がある`);
    testCase.expected.keyword_contains.forEach(term => {
      console.log(`      - "${term}"`);
      // Assert: keyword.includes(term)
    });
  }
  
  if (testCase.expected.keyword_NOT_contains) {
    console.log(`   ❌ チェック: キーワードに以下を含んではいけない`);
    testCase.expected.keyword_NOT_contains.forEach(term => {
      console.log(`      - "${term}"`);
      // Assert: !keyword.includes(term)
    });
  }
  
  return results;
}

/**
 * ebayClient.js の PSA フィルタテスト
 */
function testPSAFilter(testCase) {
  console.log(`\n🔍 PSAフィルタテスト: ${testCase.name}`);
  console.log(`   入力: "${testCase.input}"`);
  console.log(`   期待グレード: PSA ${testCase.expected.ebay_filter_grade}`);
  
  console.log(`   ✅ マッチすべきタイトル:`);
  testCase.expected.should_match_titles.forEach(title => {
    console.log(`      - "${title}"`);
    // Assert: PSA filter passes this title
  });
  
  console.log(`   ❌ 除外すべきタイトル:`);
  testCase.expected.should_NOT_match_titles.forEach(title => {
    console.log(`      - "${title}"`);
    // Assert: PSA filter blocks this title
  });
}

// ======================================
// メイン実行
// ======================================

console.log("=".repeat(70));
console.log("🧪 World Price Engine v3.8 デグレチェック");
console.log("=".repeat(70));

console.log("\n【修正②】PSA グレード判定テスト");
console.log("-".repeat(70));
TEST_CASES.psa_grade_detection.forEach(testPSAFilter);

console.log("\n\n【修正①】作品名ベースキーワード生成テスト");
console.log("-".repeat(70));
TEST_CASES.work_based_keyword.forEach(testKeywordBuilder);

console.log("\n\n【修正③】日本語トレカ自動Japanese付与テスト");
console.log("-".repeat(70));
TEST_CASES.japanese_auto_append.forEach(testKeywordBuilder);

console.log("\n\n【デグレチェック】既存機能の動作確認");
console.log("-".repeat(70));
TEST_CASES.degration_check.forEach(testKeywordBuilder);

console.log("\n" + "=".repeat(70));
console.log("✅ テストケース定義完了");
console.log("=".repeat(70));

console.log(`
📋 実行方法:
   1. keywordBuilder.js と ebayClient.js を修正版に差し替え
   2. /api/debug/world-price エンドポイントで以下をテスト:
   
   テストSummary:
   - "カビゴンar psa10 151 日本製 AR 181 SV2a"
   - "リザードンex PSA9 日本語"
   - "ピカチュウ PSA8 25周年"
   
   3. レスポンスで以下を確認:
      ✅ keywordForEbay が正しく生成されているか
      ✅ 返ってくる listings の title が期待通りフィルタされているか
      ✅ stats.worldMinPrice / worldMedianPrice が妥当な値か
`);

// ======================================
// 期待される出力例
// ======================================

console.log(`
📊 期待される動作例:

Input: "カビゴンar psa10 151 日本製 AR 181 SV2a"

【修正前】
  keywordForEbay: "graded card PSA 10 Japanese AR 181"
  → ❌ 様々なPSAカードが混ざる

【修正後】
  keywordForEbay: "Pokemon card Snorlax PSA 10 Japanese Pokemon Card 151 SV2a AR 181"
  → ✅ ポケカのSnorlax PSA10 日本語版に絞られる
  
  返ってくる listings:
  ✅ "Snorlax AR 181/165 Pokemon Card 151 SV2a PSA 10 Japanese"
  ✅ "Pokemon Snorlax 181 SV2A PSA10 Japan"
  ❌ "Snorlax AR 181 PSA 9" (除外)
  ❌ "Snorlax 181 Raw Japanese" (除外)
`);
