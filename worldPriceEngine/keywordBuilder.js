// worldPriceEngine/keywordBuilder.js
// summary → eBay キーワード生成

import { detectGenreIdFromSummary } from "./genreDetector.js";

/**
 * 共通:サマリーの正規化
 */
export function normalizeSummary(summaryRaw = "") {
  return String(summaryRaw || "")
    // 全角スペース → 半角
    .replace(/　+/g, " ")
    // 「シャイニートレジャーbox」などの連結を認識しやすくする
    .replace(/BOX/g, " box ")
    .replace(/ＢＯＸ/g, " box ")
    .replace(/ボックス/g, " box ")
    .replace(/box/gi, " box ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pokemon / キャラ名などを英語名にマップする簡易辞書
 */
const CHARACTER_MAP = [
  { re: /ピカチュウ|pikachu/i, en: "Pikachu" },
  { re: /リザードン|charizard/i, en: "Charizard" },
  { re: /ギャラドス|gyarados/i, en: "Gyarados" },
  { re: /イーブイ|eevee/i, en: "Eevee" },
  { re: /ミュウツー|mewtwo/i, en: "Mewtwo" },
  { re: /ミュウ(?!ツー)|\bmew\b/i, en: "Mew" },
  { re: /ナガバ|yu\s*nagaba/i, en: "Yu Nagaba" },
];

/**
 * ポケカ 弾名 → 英語セット名 + 型番(SV*) マップ
 *  eBay 側で一般的に使われる表記をキーワードとして追加する
 */
const POKEMON_SET_MAP = [
  { re: /(シャイニートレジャー|シャイニートレジャーex|sv4a)/i, en: "Shiny Treasure ex SV4a" },
  { re: /(ポケモンカード151|カード151|\b151\b|sv2a)/i, en: "Pokemon Card 151 SV2a" },
  { re: /(クレイバースト|sv2d)/i, en: "Clay Burst SV2D" },
  { re: /(スノーハザード|sv2p)/i, en: "Snow Hazard SV2P" },
  { re: /(古代の咆哮|sv4k)/i, en: "Ancient Roar SV4K" },
  { re: /(未来の一閃|sv4m)/i, en: "Future Flash SV4M" },
  { re: /(黒炎の支配者|sv3)/i, en: "Ruler of the Black Flame SV3" },
  { re: /(トリプレットビート|sv1a)/i, en: "Triplet Beat SV1A" },
  { re: /(バイオレットex|sv1s)/i, en: "Violet ex SV1S" },
  { re: /(スカーレットex|sv1v)/i, en: "Scarlet ex SV1V" },
];

/**
 * buildEbayKeywordFromSummary
 *
 * summary(日本語タイトル)から eBay用検索キーワードを生成する。
 * - ジャンル別にベースの英単語を変える
 * - カード番号 / 型番 / PSAグレード / 言語などを抽出して足す
 */
export function buildEbayKeywordFromSummary(summaryRaw = "") {
  const original = normalizeSummary(summaryRaw);
  if (!original) return "";

  const lower = original.toLowerCase();
  const genreId = detectGenreIdFromSummary(original);
  const tokens = [];

  // --- ジャンル別ベースワード ---
  switch (genreId) {
    // TCG系
    case "tcg_pokemon_single":
    case "tcg_pokemon_sealed_pack":
    case "tcg_pokemon_sealed_box":
      tokens.push("Pokemon card");
      break;
    case "tcg_yugioh_single":
      tokens.push("Yu-Gi-Oh card");
      break;
    case "tcg_onepiece_single":
      tokens.push("One Piece card");
      break;
    case "tcg_mtgsingle":
      tokens.push("MTG", "Magic the Gathering");
      break;
    case "tcg_weis_single":
      tokens.push("Weiss Schwarz");
      break;
    case "tcg_other_single":
    case "tcg_other_sealed_pack":
    case "tcg_other_sealed_box":
    case "non_tcg_trading_card":
      tokens.push("trading card");
      break;
    case "tcg_graded_card": {
      // 🔧 鑑定カードでも作品名をベースキーワードにする
      if (/ポケカ|ポケモンカード|pokemon card/i.test(original)) {
        tokens.push("Pokemon card");
      } else if (/遊戯王|yu-gi-oh/i.test(original)) {
        tokens.push("Yu-Gi-Oh card");
      } else if (/ワンピースカード|one piece card/i.test(original)) {
        tokens.push("One Piece card");
      } else {
        tokens.push("graded card");
      }
      break;
    }
    case "tcg_bulk_lot":
      tokens.push("bulk lot", "card lot");
      break;

    // フィギュア・一番くじ・ガチャ
    case "figure_domestic":
    case "figure_scale":
    case "figure_overseas":
      tokens.push("figure");
      break;
    case "ichiban_kuji_top_prize":
    case "ichiban_kuji_lower_prize":
      tokens.push("Ichiban Kuji");
      break;
    case "gacha_capsule_toy":
      tokens.push("gashapon", "capsule toy");
      break;

    // ゲーム
    case "game_console_modern":
    case "game_console_retro":
    case "game_console_handheld":
    case "game_console_junk":
      tokens.push("video game console");
      break;
    case "game_software_switch":
      tokens.push("Nintendo Switch", "Switch game");
      break;
    case "game_software_ps":
      tokens.push("PlayStation", "PS game");
      break;
    case "game_software_xbox_pc":
      tokens.push("Xbox game", "PC game");
      break;
    case "game_software_retro":
      tokens.push("retro game");
      break;

    // デジタル家電
    case "smartphone_iphone":
      tokens.push("iPhone");
      break;
    case "smartphone_android":
      tokens.push("Android phone");
      break;
    case "tablet":
      tokens.push("tablet");
      break;
    case "digital_camera":
      tokens.push("digital camera");
      break;
    case "film_camera":
      tokens.push("film camera");
      break;
    case "video_camera":
      tokens.push("video camera", "camcorder");
      break;

    // ファッション・バッグ
    case "bag_luxury":
      tokens.push("authentic handbag");
      break;
    case "bag_casual":
      tokens.push("bag");
      break;
    case "fashion_shoes":
      tokens.push("sneakers");
      break;
    case "accessory_watch":
      tokens.push("wristwatch");
      break;

    // メディア
    case "media_dvd_bluray":
      tokens.push("DVD", "Blu-ray");
      break;
    case "media_cd_record":
      tokens.push("CD", "vinyl record");
      break;

    default:
      // 汎用
      break;
  }

  // --- キャラ名・シリーズ名(Pokemon等) ---
  let hasPokemonChar = false;
  for (const { re, en } of CHARACTER_MAP) {
    if (re.test(original)) {
      tokens.push(en);
      hasPokemonChar = true;
    }
  }
  if (
    !tokens.some((t) => t.toLowerCase().includes("pokemon")) &&
    hasPokemonChar
  ) {
    tokens.push("Pokemon");
  }

  // --- ポケカ弾・セット名 ---
  for (const { re, en } of POKEMON_SET_MAP) {
    if (re.test(original)) {
      tokens.push(en);
    }
  }

  // --- PSA グレード ---
  const psaMatch = original.match(/psa\s*([0-9]{1,2})/i);
  if (psaMatch && (genreId === "tcg_graded_card" || /psa/i.test(original))) {
    const grade = psaMatch[1];
    tokens.push("PSA", grade);
  }

  // --- 言語 ---
  if (/(日本語|日本版|日本製|国内版|japanese|jpn)/i.test(original)) {
    tokens.push("Japanese");
  }

  // 🔧 日本語トレカっぽい summary にはデフォルトで「Japanese」を付ける
  if (
    !tokens.includes("Japanese") &&
    /[ぁ-んァ-ン一-龠]/.test(original) && // 日本語が含まれる
    !/english|英語版|eng版/i.test(original) &&
    (/(ポケカ|ポケモンカード|遊戯王|ワンピースカード|tcg)/i.test(original) || 
     (genreId && (genreId.startsWith("tcg_") || genreId === "non_tcg_trading_card")))
  ) {
    tokens.push("Japanese");
  }

  // --- 共通: TCGのカード番号・セットコード (SC-51, OP01-001, P-028 など) ---
  const setCodeMatches = original.match(/\b([A-Z]{1,4}-?\d{1,3}(?:-\d{1,3})?)\b/gi);
  if (setCodeMatches) {
    setCodeMatches.forEach(code => tokens.push(code));
  }

  // --- レアリティ ---
  if (/\bsr\b|スーパーレア/i.test(original)) tokens.push("SR");
  if (/\bhr\b|ハイパーレア/i.test(original)) tokens.push("HR");
  if (/\bur\b|ウルトラレア/i.test(original)) tokens.push("UR");
  if (/\bsar\b/i.test(original)) tokens.push("SAR");
  if (/\bar\b/i.test(original)) tokens.push("AR");
  if (/illustration rare/i.test(lower)) tokens.push("Full Art");

  // --- レアリティ + 番号 (例: AR 181, SAR 123, SEC 01, P-028) ---
  const rarityNumMatch = original.match(
    /\b(SR|UR|HR|AR|SAR|SEC|P)\s*-?\s*([0-9]{1,4})\b/i
  );
  if (rarityNumMatch) {
    const rCode = rarityNumMatch[1].toUpperCase();
    const rNum = rarityNumMatch[2];
    tokens.push(`${rCode} ${rNum}`);
  }

  // --- プロモ / イベントパック (ONE PIECE, 遊戯王など共通) ---
  if (/promo|プロモ|イベント|event pack|cs\s*\d{4}/i.test(original)) {
    tokens.push("promo");
  }

  // --- カード番号 例: 091/078 ---
  const numMatches = original.match(/\b(\d{1,3}\/\d{1,3})\b/g);
  if (numMatches) {
    for (const num of numMatches) tokens.push(num);
  }

  // --- 型番・モデル番号 (iPhone 12, DMC-GF7 など) ---
  const modelMatches = original.match(/[A-Za-z]{1,5}[-\s]?\d{2,4}[A-Za-z]?/g);
  if (modelMatches) {
    for (const m of modelMatches) {
      tokens.push(m.replace(/\s+/g, ""));
    }
  }

  // --- スマホ系: ストレージ容量など ---
  if (genreId === "smartphone_iphone" || genreId === "smartphone_android") {
    const storageMatch = original.match(/\b(64|128|256|512)\s?gb\b/i);
    if (storageMatch) tokens.push(`${storageMatch[1]}GB`);
    if (/simフリー|sim free|unlocked/i.test(original)) {
      tokens.push("unlocked");
    }
  }

  // --- 一番くじ プライズ名(ざっくり) ---
  if (genreId && genreId.startsWith("ichiban_kuji")) {
    if (/ラストワン/i.test(original)) tokens.push("Last One prize");
    if (/[abcａｂｃ]賞/i.test(original)) tokens.push("prize");
  }

  // --- sealed pack/box 系 ---
  if (
    genreId === "tcg_pokemon_sealed_pack" ||
    genreId === "tcg_other_sealed_pack"
  ) {
    tokens.push("booster pack", "sealed");
  }
  if (
    genreId === "tcg_pokemon_sealed_box" ||
    genreId === "tcg_other_sealed_box"
  ) {
    tokens.push("booster box", "sealed");
  }

  // 重複除去
  const keyword = Array.from(new Set(tokens.filter(Boolean))).join(" ");

  // 何も組み立てられなかった場合は summary をそのまま返す
  return keyword || original;
}
