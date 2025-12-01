// worldPriceGenreEngine.js
// FleaPay 世界相場エンジン用：80ジャンル判定 ＋ eBay検索キーワード生成（v3.6）
//
// 役割:
//  1. summary(商品タイトル)から FleaPay 内部ジャンル(80分類)を推定する
//  2. ジャンルに応じた eBay 検索クエリを生成する(Query Builder)
//
// 設計の元になっている仕様:World Price Engine v3.6 相場取得設計書
//  - Genre Engine(80ジャンル分類)
//  - Query Builder(ジャンル別 eBay検索クエリ生成)
//  - ジャンル別 minSamples / NG条件 / world price weights
//
// このファイルは「ジャンル判定とキーワード生成」に専念し、
// 価格計算・Post-filter・信頼スコアなどは別モジュールで行う前提。

/**
 * WORLD_PRICE_GENRES
 *  - id: 内部ID(相場エンジンで使用)
 *  - label: UI表示用
 *  - matchKeywords: summary に含まれていたらスコアを加算するキーワード群
 */
export const WORLD_PRICE_GENRES = [
  // 2.2.1 ゲーム系(14)
  {
    id: "game_console_modern",
    label: "ゲーム機(現行)",
    matchKeywords: [
      "switch",
      "ニンテンドースイッチ",
      "ps4",
      "ps5",
      "プレイステーション4",
      "プレイステーション5",
    ],
  },
  {
    id: "game_console_retro",
    label: "ゲーム機(レトロ)",
    matchKeywords: [
      "ファミコン",
      "スーパーファミコン",
      "メガドライブ",
      "pcエンジン",
      "セガサターン",
      "ドリームキャスト",
      "レトロフリーク",
      "retro",
    ],
  },
  {
    id: "game_console_handheld",
    label: "携帯ゲーム機",
    matchKeywords: [
      "3ds",
      "2ds",
      "ds lite",
      "psp",
      "ps vita",
      "ゲームボーイ",
      "game boy",
      "ゲームボーイカラー",
      "ゲームボーイアドバンス",
    ],
  },
  {
    id: "game_console_junk",
    label: "ゲーム機(ジャンク)",
    matchKeywords: ["ジャンク", "電源入らず", "動作未確認", "for parts"],
  },
  {
    id: "game_controller",
    label: "ゲームコントローラー",
    matchKeywords: ["コントローラー", "コントローラ", "joy-con", "ジョイコン", "dualshock"],
  },
  {
    id: "game_accessory",
    label: "ゲーム周辺機器",
    matchKeywords: ["メモリーカード", "周辺機器", "マルチタップ", "wii fit", "バランスボード"],
  },
  {
    id: "game_software_switch",
    label: "ゲームソフト(Switch)",
    matchKeywords: ["switch", "ニンテンドースイッチ", "nsw"],
  },
  {
    id: "game_software_ps",
    label: "ゲームソフト(PlayStation)",
    matchKeywords: ["ps4", "ps5", "ps3", "playstation"],
  },
  {
    id: "game_software_xbox_pc",
    label: "ゲームソフト(Xbox/PC)",
    matchKeywords: ["xbox", "steam", "pc game"],
  },
  {
    id: "game_software_retro",
    label: "ゲームソフト(レトロ)",
    matchKeywords: ["ファミコン", "スーパーファミコン", "メガドライブ", "64", "n64", "ゲームボーイ"],
  },
  {
    id: "game_software_dl_code",
    label: "ダウンロードコード",
    matchKeywords: ["ダウンロードコード", "download code", "dlコード"],
  },
  {
    id: "game_memory_card",
    label: "メモリーカード・記録メディア",
    matchKeywords: ["メモリーカード", "memory card", "メモリカード"],
  },
  {
    id: "arcade_board",
    label: "アーケード基板",
    matchKeywords: ["mvs", "jamma", "アーケード基板", "業務用基板"],
  },
  {
    id: "retro_handheld_lcd",
    label: "レトロ携帯LCDゲーム",
    matchKeywords: ["ゲームウォッチ", "game & watch", "lsIゲーム", "lcd game"],
  },

  // 2.2.2 デジタル家電(10)
  {
    id: "smartphone_iphone",
    label: "スマホ(iPhone)",
    matchKeywords: ["iphone", "アイフォン"],
  },
  {
    id: "smartphone_android",
    label: "スマホ(Android)",
    matchKeywords: ["android", "ギャラクシー", "xperia", "pixel"],
  },
  {
    id: "tablet",
    label: "タブレット",
    matchKeywords: ["ipad", "タブレット"],
  },
  {
    id: "digital_camera",
    label: "デジタルカメラ",
    matchKeywords: ["デジカメ", "digital camera", "ミラーレス", "一眼レフ"],
  },
  {
    id: "film_camera",
    label: "フィルムカメラ",
    matchKeywords: ["フィルムカメラ", "レンジファインダー", "オールドレンズ"],
  },
  {
    id: "video_camera",
    label: "ビデオカメラ",
    matchKeywords: ["ビデオカメラ", "ハンディカム", "camcorder"],
  },
  {
    id: "pc_laptop",
    label: "ノートPC",
    matchKeywords: ["ノートpc", "laptop", "macbook"],
  },
  {
    id: "pc_accessory",
    label: "PC周辺機器",
    matchKeywords: ["キーボード", "マウス", "pc周辺機器", "ssd", "hdd"],
  },
  {
    id: "audio_headphone",
    label: "ヘッドホン・イヤホン",
    matchKeywords: ["ヘッドホン", "イヤホン", "airpods", "earphone"],
  },
  {
    id: "audio_speaker",
    label: "スピーカー",
    matchKeywords: ["スピーカー", "sound bar", "サウンドバー"],
  },

  // 2.2.3 ホビー・おもちゃ(16)
  {
    id: "figure_domestic",
    label: "フィギュア(国内メーカー)",
    matchKeywords: ["フィギュア", "一番くじ", "プライズ", "banpresto", "バンプレスト"],
  },
  {
    id: "figure_scale",
    label: "スケールフィギュア",
    matchKeywords: ["1/", "スケールフィギュア", "アルター", "グッスマ", "good smile"],
  },
  {
    id: "figure_overseas",
    label: "フィギュア(海外・アメトイ)",
    matchKeywords: ["marvel legends", "hot toys", "マーベルレジェンド", "メズコ"],
  },
  {
    id: "ichiban_kuji_top_prize",
    label: "一番くじ 上位賞",
    matchKeywords: ["一番くじ", "ラストワン", "a賞", "b賞"],
  },
  {
    id: "ichiban_kuji_lower_prize",
    label: "一番くじ 下位賞",
    matchKeywords: ["一番くじ", "c賞", "d賞", "ラバーストラップ", "タオル"],
  },
  {
    id: "gacha_capsule_toy",
    label: "ガチャ・カプセルトイ",
    matchKeywords: ["ガチャ", "カプセルトイ", "カプセルフィギュア"],
  },
  {
    id: "plastic_model_robot",
    label: "プラモデル(ロボ・メカ)",
    matchKeywords: ["ガンプラ", "hg", "mg", "rg", "ゾイド", "ロボット"],
  },
  {
    id: "plastic_model_vehicle",
    label: "プラモデル(車/戦車/飛行機)",
    matchKeywords: ["プラモデル", "戦車", "タミヤ", "飛行機", "カーモデル"],
  },
  {
    id: "plastic_model_other",
    label: "プラモデル(その他)",
    matchKeywords: ["プラモデル", "プラモ"],
  },
  {
    id: "mini_car_tomica",
    label: "ミニカー(トミカ)",
    matchKeywords: ["トミカ", "tomica"],
  },
  {
    id: "mini_car_others",
    label: "ミニカー(その他)",
    matchKeywords: ["ミニカー", "hot wheels", "ホットウィール"],
  },
  {
    id: "rc_car",
    label: "ラジコン",
    matchKeywords: ["ラジコン", "rcカー", "rc car"],
  },
  {
    id: "railroad_model",
    label: "鉄道模型",
    matchKeywords: ["nゲージ", "hoゲージ", "鉄道模型", "kato", "tomix"],
  },
  {
    id: "board_game",
    label: "ボードゲーム",
    matchKeywords: ["ボードゲーム", "カードゲーム", "ボドゲ"],
  },
  {
    id: "toy_others",
    label: "おもちゃその他",
    matchKeywords: ["おもちゃ", "toy"],
  },

  // 2.2.4 トレカ・TCG(16)
  {
    id: "tcg_pokemon_single",
    label: "ポケカ(シングル)",
    matchKeywords: ["ポケカ", "ポケモンカード", "pokemon card"],
  },
  {
    id: "tcg_yugioh_single",
    label: "遊戯王(シングル)",
    matchKeywords: ["遊戯王", "yu-gi-oh"],
  },
  {
    id: "tcg_onepiece_single",
    label: "ワンピースカード(シングル)",
    matchKeywords: ["ワンピースカード", "one piece card"],
  },
  {
    id: "tcg_mtgsingle",
    label: "MTG(シングル)",
    matchKeywords: ["mtg", "magic: the gathering", "magic the gathering"],
  },
  {
    id: "tcg_weis_single",
    label: "ヴァイス等(シングル)",
    matchKeywords: ["ヴァイスシュヴァルツ", "weiss sch", "ヴァイス"],
  },
  {
    id: "tcg_other_single",
    label: "その他TCG(シングル)",
    matchKeywords: ["デュエマ", "デュエルマスターズ", "バトスピ", "card game"],
  },
  {
    id: "tcg_graded_card",
    label: "鑑定済みカード(PSA/BGS/CGC)",
    matchKeywords: ["psa", "bgs", "cgc", "鑑定"],
  },
  {
    id: "tcg_pokemon_sealed_pack",
    label: "ポケカ未開封パック",
    matchKeywords: ["ポケカ", "ポケモンカード", "パック", "booster"],
  },
  {
    id: "tcg_pokemon_sealed_box",
    label: "ポケカ未開封BOX",
    matchKeywords: ["ポケカ", "ポケモンカード", "box", "ボックス"],
  },
  {
    id: "tcg_other_sealed_pack",
    label: "その他TCG未開封パック",
    matchKeywords: ["パック", "booster", "ブースター"],
  },
  {
    id: "tcg_other_sealed_box",
    label: "その他TCG未開封BOX",
    matchKeywords: ["box", "ボックス", "booster box"],
  },
  {
    id: "tcg_bulk_lot",
    label: "トレカ大量まとめ売り",
    matchKeywords: ["まとめ売り", "大量", "bulk", "lot", "束"],
  },
  {
    id: "tcg_supplies",
    label: "TCGサプライ",
    matchKeywords: ["スリーブ", "デッキケース", "プレイマット", "デッキシールド"],
  },
  {
    id: "tcg_playmat",
    label: "プレイマット",
    matchKeywords: ["プレイマット", "playmat"],
  },
  {
    id: "tcg_token_metal",
    label: "メダル・トークン類",
    matchKeywords: ["コイン", "メダル", "トークン"],
  },
  {
    id: "non_tcg_trading_card",
    label: "TCG以外のトレカ",
    matchKeywords: ["トレカ", "トレーディングカード", "カードダス", "アイドルカード"],
  },

  // 2.2.5 ファッション(12)
  {
    id: "fashion_vintage_top",
    label: "古着(トップス)",
    matchKeywords: ["古着", "tシャツ", "シャツ"],
  },
  {
    id: "fashion_vintage_bottom",
    label: "古着(ボトムス)",
    matchKeywords: ["古着", "ジーンズ", "デニム", "パンツ"],
  },
  {
    id: "fashion_vintage_outer",
    label: "古着(アウター)",
    matchKeywords: ["古着", "ジャケット", "コート"],
  },
  {
    id: "fashion_brand_top",
    label: "ブランド服(トップス)",
    matchKeywords: ["supreme", "シュプリーム", "stussy", "ナイキ", "nike"],
  },
  {
    id: "fashion_brand_bottom",
    label: "ブランド服(ボトムス)",
    matchKeywords: ["supreme", "stussy", "ナイキ", "adidas"],
  },
  {
    id: "fashion_brand_outer",
    label: "ブランド服(アウター)",
    matchKeywords: ["supreme", "north face", "ノースフェイス", "canada goose"],
  },
  {
    id: "fashion_shoes",
    label: "靴",
    matchKeywords: ["スニーカー", "shoes", "ブーツ", "sneaker"],
  },
  {
    id: "fashion_cap_hat",
    label: "帽子",
    matchKeywords: ["キャップ", "帽子", "beanie"],
  },
  {
    id: "bag_luxury",
    label: "バッグ(ハイブランド)",
    matchKeywords: ["ルイヴィトン", "louis vuitton", "gucci", "シャネル", "chanel", "エルメス"],
  },
  {
    id: "bag_casual",
    label: "バッグ(カジュアル)",
    matchKeywords: ["バッグ", "リュック", "backpack", "トート"],
  },
  {
    id: "wallet_small_leather",
    label: "財布・小物",
    matchKeywords: ["財布", "ウォレット", "card case", "名刺入れ"],
  },
  {
    id: "accessory_watch",
    label: "腕時計",
    matchKeywords: ["腕時計", "watch", "ロレックス", "オメガ"],
  },
  {
    id: "accessory_jewelry",
    label: "アクセサリー・ジュエリー",
    matchKeywords: ["ネックレス", "リング", "指輪", "ジュエリー", "bracelet"],
  },

  // 2.2.6 雑貨・文房具・生活(10)
  {
    id: "keyholder",
    label: "キーホルダー",
    matchKeywords: ["キーホルダー", "keychain"],
  },
  {
    id: "can_badge",
    label: "缶バッジ",
    matchKeywords: ["缶バッジ", "カンバッジ", "badge"],
  },
  {
    id: "stationery",
    label: "文房具",
    matchKeywords: ["ボールペン", "シャーペン", "ノート", "文房具"],
  },
  {
    id: "character_goods",
    label: "キャラクター雑貨",
    matchKeywords: ["キャラクターグッズ", "キャラグッズ", "グッズ"],
  },
  {
    id: "tableware",
    label: "食器",
    matchKeywords: ["マグカップ", "皿", "プレート", "茶碗"],
  },
  {
    id: "interior_small",
    label: "インテリア小物",
    matchKeywords: ["インテリア", "置物", "オブジェ"],
  },
  {
    id: "kitchen_goods",
    label: "キッチン用品",
    matchKeywords: ["フライパン", "鍋", "キッチン用品"],
  },
  {
    id: "cosmetics_perfume",
    label: "コスメ・香水",
    matchKeywords: ["香水", "フレグランス", "コスメ", "化粧品"],
  },
  {
    id: "kids_goods",
    label: "キッズ用品",
    matchKeywords: ["キッズ", "子供服", "ベビー"],
  },
  {
    id: "daily_goods_other",
    label: "日用品その他",
    matchKeywords: ["日用品", "生活用品"],
  },

  // 2.2.7 メディア(2)
  {
    id: "media_dvd_bluray",
    label: "DVD / Blu-ray",
    matchKeywords: ["dvd", "blu-ray", "ブルーレイ"],
  },
  {
    id: "media_cd_record",
    label: "CD・レコード",
    matchKeywords: ["cd", "レコード", "lp"],
  },
];

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

/**
 * 共通:サマリーの正規化
 */
function normalizeSummary(summaryRaw = "") {
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
    case "tcg_graded_card":
      tokens.push("graded card");
      break;
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
  if (/(日本語|日本版|japanese|jpn)/i.test(lower)) {
    tokens.push("Japanese");
  }

  // --- レアリティ ---
  if (/\bsr\b|スーパーレア/i.test(original)) tokens.push("SR");
  if (/\bhr\b|ハイパーレア/i.test(original)) tokens.push("HR");
  if (/\bur\b|ウルトラレア/i.test(original)) tokens.push("UR");
  if (/\bsar\b/i.test(original)) tokens.push("SAR");
  if (/\bar\b/i.test(original)) tokens.push("AR");
  if (/illustration rare/i.test(lower)) tokens.push("Full Art");

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
  if (genreId.startsWith("ichiban_kuji")) {
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

/**
 * (オプション)ジャンル定義を取得するヘルパー
 */
export function getGenreMeta(genreId) {
  return WORLD_PRICE_GENRES.find((g) => g.id === genreId) || null;
}

// ================================
// v3.6 追加: ジャンル別 minSamples / NG条件 / weight
// ================================

// ジャンル別 最低サンプル数(minSamples)
const GENRE_MIN_SAMPLES = {
  tcg_graded_card: 3,
  tcg_pokemon_single: 5,
  // 🔽 BOX / パックは件数が少ないことが多いので 3 件から相場採用
  tcg_pokemon_sealed_box: 3,
  tcg_pokemon_sealed_pack: 3,
  ichiban_kuji_top_prize: 5,
  figure_domestic: 6,
  digital_camera: 8,
  smartphone_iphone: 8,
  smartphone_android: 8,
  fashion_vintage_top: 8,
  fashion_vintage_outer: 8,
};

export function getGenreMinSamples(genreId) {
  return GENRE_MIN_SAMPLES[genreId] || 5;
}

// US/UK の重み(世界最安レンジ計算用) v3.6
const GENRE_WORLD_WEIGHTS = {
  tcg_pokemon_single: { us: 0.8, uk: 0.2 },
  tcg_graded_card: { us: 0.85, uk: 0.15 },
  // ポケカ BOX / パックも US をやや重く
  tcg_pokemon_sealed_box: { us: 0.85, uk: 0.15 },
  tcg_pokemon_sealed_pack: { us: 0.85, uk: 0.15 },
  ichiban_kuji_top_prize: { us: 0.6, uk: 0.4 },
  digital_camera: { us: 0.9, uk: 0.1 },
  smartphone_iphone: { us: 0.9, uk: 0.1 },
  smartphone_android: { us: 0.9, uk: 0.1 },
};

export function getWorldPriceWeights(genreId) {
  const w = GENRE_WORLD_WEIGHTS[genreId];
  return w || { us: 1.0, uk: 1.0 };
}

// 共通NGワード
const COMMON_LOT_KEYWORDS = [
  "lot",
  "bulk",
  "bundle",
  "セット",
  "まとめ売り",
  "大量",
  "福袋",
  "オリパ",
];

const JUNK_KEYWORDS = ["ジャンク", "for parts", "broken", "故障"];

// v3.6: ジャンル別 NG 条件
export function isListingAllowedForGenre(
  genreId,
  titleRaw = "",
  shortDescriptionRaw = ""
) {
  const t = `${titleRaw || ""} ${shortDescriptionRaw || ""}`
    .toLowerCase()
    .trim();

  // ジャンルが特定できないときは何も絞らない(安全側)
  if (!genreId) return true;

  const includesAny = (words) => words.some((w) => t.includes(w.toLowerCase()));

  // --- 共通: lot/bulk 系は基本NG (ただし tcg_bulk_lot は例外でOK) ---
  if (includesAny(COMMON_LOT_KEYWORDS) && genreId !== "tcg_bulk_lot") {
    return false;
  }

  // --- ゲーム機・スマホ系: ジャンクはNG (ジャンク専用ジャンル以外) ---
  if (
    (genreId.startsWith("game_console_") ||
      genreId === "smartphone_iphone" ||
      genreId === "smartphone_android") &&
    includesAny(JUNK_KEYWORDS)
  ) {
    // ゲーム機ジャンク用 genre は別で扱う前提
    if (genreId !== "game_console_junk") {
      return false;
    }
  }

  // --- TCGシングル系: lot/set/box/pack/graded を避ける ---
  const isTcgSingle =
    [
      "tcg_pokemon_single",
      "tcg_yugioh_single",
      "tcg_onepiece_single",
      "tcg_mtgsingle",
      "tcg_weis_single",
      "tcg_other_single",
    ].includes(genreId);

  if (isTcgSingle) {
    if (
      includesAny([
        "set",
        "box",
        "booster box",
        "boosterbox",
        "case",
        "pack",
        "パック",
        "ボックス",
      ])
    ) {
      return false;
    }
    if (includesAny(["psa", "bgs", "cgc", "鑑定"])) {
      // 鑑定カードは tcg_graded_card 側で扱う
      return false;
    }
  }

  // --- 鑑定カード: PSA/BGS/CGC 無しはNG / lot系もNG ---
  if (genreId === "tcg_graded_card") {
    const hasGrading =
      /psa|bgs|cgc|鑑定/i.test(t) || /graded card/i.test(t);
    if (!hasGrading) return false;
    if (includesAny(COMMON_LOT_KEYWORDS)) return false;
  }

  // --- 未開封パック系: box/case はNG ---
  if (
    genreId === "tcg_pokemon_sealed_pack" ||
    genreId === "tcg_other_sealed_pack"
  ) {
    if (
      includesAny([
        "box",
        "booster box",
        "case",
        "ボックス",
        "box set",
      ])
    ) {
      return false;
    }
    if (includesAny(["opened", "unsealed", "開封済"])) {
      return false;
    }
  }

  // --- 未開封BOX系: bulk/lot/bundle/case系のみNG
  if (
    genreId === "tcg_pokemon_sealed_box" ||
    genreId === "tcg_other_sealed_box"
  ) {
    // 🔧 従来は「パック」を含むBOXも除外してしまっていた
    //    → 1BOX内のパック数表記(例: 10パック入り)まで落ちていたので修正
    if (includesAny(["bulk", "lot", "bundle", "case", "カートン", "セット", "set"])) {
      return false;
    }
  }

  // --- 一番くじ 上位賞: A/B賞 or ラストワンが無いものは避ける ---
  if (genreId === "ichiban_kuji_top_prize") {
    const isTop =
      /ラストワン/.test(t) ||
      /[abａｂ]賞/.test(t);
    if (!isTop) return false;
  }

  // ここまで引っかからなければ採用
  return true;
}

// ================================
// 価格配列 → 相場統計ユーティリティ
//  - v3.6: ジャンル別 minSamples 対応
//  - lowJpy: 最安値
//  - medianJpy: 仮想落札中央値
//  - highJpy: 上位レンジ平均(やや高め)
// ================================

// 🆕 数値配列の中央値ヘルパー
function medianOf(arr) {
  if (!arr || !arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

// 🆕 価格配列から統計値を計算(v3.6: ジャンル別 minSamples 対応)
export function buildPriceStats(pricesJpy, genreId) {
  if (!Array.isArray(pricesJpy) || !pricesJpy.length) return null;

  // 数値だけにして昇順ソート
  const sorted = pricesJpy
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);

  const n = sorted.length;
  const minSamples = getGenreMinSamples(genreId);
  if (n < minSamples) {
    // ジャンル別 minSamples に満たない場合は「相場不足」として扱わない
    return null;
  }

  // ① 生の全体中央値(参考値)
  const rawMedian = medianOf(sorted);

  // ② マルチバンド分布(v3.5)
  //    lower_band : 0〜40%
  //    middle_band: 40〜70%
  //    upper_band : 70〜100%(相場には使わない)
  const lowerEndIndex = Math.max(1, Math.floor(n * 0.4));          // [0, lowerEndIndex)
  const middleStartIndex = lowerEndIndex;                          // [middleStartIndex, middleEndIndex)
  const middleEndIndex = Math.max(middleStartIndex + 1, Math.floor(n * 0.7));

  const lowerBand = sorted.slice(0, lowerEndIndex);
  const middleBand = sorted.slice(middleStartIndex, middleEndIndex);

  const lowerBandMedian = medianOf(lowerBand);
  const middleBandMedian = medianOf(middleBand);

  // ③ 仮想落札中央値 virtualSoldMedian
  //    lower を 70%、middle を 30% でミックス
  let virtualMedian = rawMedian;

  if (lowerBandMedian != null && middleBandMedian != null) {
    virtualMedian = lowerBandMedian * 0.7 + middleBandMedian * 0.3;
  } else if (lowerBandMedian != null) {
    virtualMedian = lowerBandMedian;
  } else if (middleBandMedian != null) {
    virtualMedian = middleBandMedian;
  }

  // ④ ジャンル補正係数(今は 1.0 固定。将来 genreId を渡して動的にする想定)
  const genreAdjustFactor = 1.0;
  virtualMedian = virtualMedian * genreAdjustFactor;

  // ⑤ 「高めの相場」:上位25%平均(従来ロジックも維持)
  const topCount = Math.max(1, Math.floor(n * 0.25));
  const highSlice = sorted.slice(sorted.length - topCount);
  const highAvg =
    highSlice.reduce((sum, v) => sum + v, 0) / (highSlice.length || 1);

  // ⑥ 最安値(送料込み)
  const low = sorted[0];

  return {
    // v3.6:仮想落札相場としての中央値
    medianJpy: Math.round(virtualMedian),

    // デバッグ/将来のチューニング用に補助情報も持っておく
    rawMedianJpy: Math.round(rawMedian),
    lowerBandMedianJpy:
      lowerBandMedian != null ? Math.round(lowerBandMedian) : null,
    middleBandMedianJpy:
      middleBandMedian != null ? Math.round(middleBandMedian) : null,

    // 「高めの相場」と厳密な最安値
    highJpy: Math.round(highAvg),
    lowJpy: Math.round(low),

    // サンプル数
    sampleCount: n,
  };
}
