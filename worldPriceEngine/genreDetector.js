// worldPriceEngine/genreDetector.js
// summary → genreId 判定

import { WORLD_PRICE_GENRES } from "./genres.js";

/**
 * summary から最もスコアの高いジャンルIDを返す
 *  - 先に「ポケカ BOX / パック」を優先判定してから、従来スコアリングへフォールバック
 */
export function detectGenreIdFromSummary(summaryRaw = "") {
  const sRaw = String(summaryRaw || "");
  const s = sRaw.toLowerCase();

  // 🔸 先行判定: ポケカ BOX / パック
  const hasPokemonWord = /ポケカ|ポケモンカード|pokemon card/i.test(sRaw);
  const hasBoxWord =
    /(booster box|box|ボックス|boxset|box set|カートン|ＢＯＸ)/i.test(sRaw);
  const hasPackWord =
    /(booster pack|booster|pack|パック)/i.test(sRaw);

  if (hasPokemonWord) {
    // 「box 1個 + 収録パック数」の表記が多いので BOX を優先
    if (hasBoxWord && !hasPackWord) {
      return "tcg_pokemon_sealed_box";
    }
    if (hasPackWord && !hasBoxWord) {
      return "tcg_pokemon_sealed_pack";
    }
    if (hasBoxWord && hasPackWord) {
      return "tcg_pokemon_sealed_box";
    }
  }

  // 従来ロジック: matchKeywords スコア最大のジャンルを採用
  let bestId = "daily_goods_other"; // 汎用ジャンルをデフォルトに
  let bestScore = 0;

  for (const g of WORLD_PRICE_GENRES) {
    let score = 0;
    for (const kw of g.matchKeywords) {
      if (!kw) continue;
      if (s.includes(String(kw).toLowerCase())) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = g.id;
    }
  }
  return bestId;
}
