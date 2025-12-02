// worldPriceGenreEngine.js
// FleaPay 世界相場エンジン用：80ジャンル判定 ＋ eBay検索キーワード生成（v3.8）
//
// Facade - 1階層下のモジュールから再エクスポート
//
// 設計の元になっている仕様:World Price Engine v3.8 相場取得設計書
//  - Genre Engine(80ジャンル分類)
//  - Query Builder(ジャンル別 eBay検索クエリ生成)
//  - ジャンル別 minSamples / NG条件 / world price weights
//  - 世界相場更新ロジック (v3.8)

// ジャンル定義 & minSamples/weights/NG 条件
export {
  WORLD_PRICE_GENRES,
  getGenreMeta,
  getGenreMinSamples,
  getWorldPriceWeights,
  isListingAllowedForGenre,
} from "./worldPriceEngine/genres.js";

// ジャンル判定
export { detectGenreIdFromSummary } from "./worldPriceEngine/genreDetector.js";

// eBay キーワード生成
export { buildEbayKeywordFromSummary } from "./worldPriceEngine/keywordBuilder.js";

// 価格統計
export { buildPriceStats } from "./worldPriceEngine/stats.js";

// eBay API 連携
export {
  EBAY_SOURCE_MODE,
  fetchWorldPriceFromEbayMarketplace,
} from "./worldPriceEngine/ebayClient.js";

// 世界相場更新
export {
  runWorldPriceUpdate,
  queueWorldPriceUpdate,
} from "./worldPriceEngine/worldPriceUpdate.js";
