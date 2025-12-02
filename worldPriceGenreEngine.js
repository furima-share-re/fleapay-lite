// worldPriceGenreEngine.js
// FleaPay 世界相場エンジン用：80ジャンル判定 ＋ eBay検索キーワード生成（v3.8）
//
// 役割:
//  1. summary(商品タイトル)から FleaPay 内部ジャンル(80分類)を推定する
//  2. ジャンルに応じた eBay 検索クエリを生成する(Query Builder)
//  3. eBay API連携による世界相場取得 (v3.8追加)
//
// 設計の元になっている仕様:World Price Engine v3.8 相場取得設計書
//  - Genre Engine(80ジャンル分類)
//  - Query Builder(ジャンル別 eBay検索クエリ生成)
//  - ジャンル別 minSamples / NG条件 / world price weights
//  - 世界相場更新ロジック (v3.8)

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
    matchKeywords: ["ゲームウォッチ", "game & watch", "lsiゲーム", "lcd game"],
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
  {
    id: "accessory_jewelry",
    label: "アクセサリー・ジュエリー",
    matchKeywords: ["ネックレス", "リング", "指輪", "ジュエリー", "bracelet"],
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
  // 「日本製」「国内版」なども Japanese 判定に含める
  if (/(日本語|日本版|日本製|国内版|japanese|jpn)/i.test(original)) {
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
  const lowerEndIndex = Math.max(1, Math.floor(n * 0.4));
  const middleStartIndex = lowerEndIndex;
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

// =====================
// 🌍 世界相場 更新ロジック (v3.8)
// =====================

// eBay API 用の環境変数
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID || "";
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET || "";
const EBAY_ENV = process.env.EBAY_ENV || "production"; // or "sandbox"

// デバッグログ用フラグ
const WORLD_PRICE_DEBUG = process.env.WORLD_PRICE_DEBUG === "1";

// データソースモード: active or sold
export const EBAY_SOURCE_MODE =
  process.env.EBAY_SOURCE_MODE || "active";

// eBay アクセストークンの簡易キャッシュ
const ebayTokenCache = {
  token: null,
  expiresAt: 0, // epoch ms
};

// 為替レートキャッシュ (USD/JPY, GBP/JPY)
let fxCache = {
  usd_jpy: null,
  gbp_jpy: null,
  expiresAt: 0,
};

// セット(lot / まとめ売り)っぽい summary なら世界相場を付けない
function isSetLikeSummary(text = "") {
  const t = text.toLowerCase();

  const jpKeywords = [
    "セット",
    "まとめ売り",
    "まとめて",
    "大量",
    "山盛り",
    "福袋",
    "オリパ",
    "束",
    "複数枚",
  ];

  const enKeywords = ["set", "lot", "bulk", "bundle", "mixed", "random"];

  return [...jpKeywords, ...enKeywords].some((kw) => t.includes(kw));
}

// eBay OAuth トークン取得(client_credentials)
async function getEbayAccessToken() {
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
    console.warn("[world-price] EBAY_CLIENT_ID/SECRET not set, skip eBay call");
    return null;
  }

  const now = Date.now();
  if (ebayTokenCache.token && ebayTokenCache.expiresAt > now + 60_000) {
    return ebayTokenCache.token;
  }

  const tokenUrl =
    EBAY_ENV === "sandbox"
      ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
      : "https://api.ebay.com/identity/v1/oauth2/token";

  const basic = Buffer.from(
    `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`,
    "utf8"
  ).toString("base64");

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("scope", "https://api.ebay.com/oauth/api_scope");

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[world-price] ebay token error", res.status, text);
    return null;
  }

  const json = await res.json();
  const accessToken = json.access_token;
  const expiresIn = Number(json.expires_in || 0); // 秒

  if (!accessToken) {
    console.error("[world-price] ebay token missing in response");
    return null;
  }

  ebayTokenCache.token = accessToken;
  ebayTokenCache.expiresAt = Date.now() + expiresIn * 1000;

  console.log("[world-price] ebay token refreshed, expiresIn(s)=", expiresIn);

  return accessToken;
}

// 為替レート取得(外部API + 1時間キャッシュ)
async function getFxRates() {
  const now = Date.now();

  if (fxCache.expiresAt > now && fxCache.usd_jpy && fxCache.gbp_jpy) {
    return {
      usd_jpy: fxCache.usd_jpy,
      gbp_jpy: fxCache.gbp_jpy,
    };
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();

    const usd_jpy = Number(data.rates?.JPY || 150);
    const gbp_usd = Number(data.rates?.GBP || 0.79);
    const gbp_jpy = usd_jpy * (1 / gbp_usd);

    fxCache = {
      usd_jpy,
      gbp_jpy,
      expiresAt: now + 60 * 60 * 1000,
    };

    console.log("[fx] updated:", fxCache);

    return { usd_jpy, gbp_jpy };
  } catch (e) {
    console.error("[fx] fetch error", e);
    return {
      usd_jpy: fxCache.usd_jpy || 150,
      gbp_jpy: fxCache.gbp_jpy || 190,
    };
  }
}

// ---- v3.8: 売上最大化 & 利益最大化 価格計算 ----

function estimateConversionRate(p, basePrice) {
  if (!basePrice || basePrice <= 0) return 0.3;
  const r = p / basePrice;

  if (r <= 0.6) return 0.9;
  if (r <= 0.8) {
    return 0.9 - ((0.9 - 0.7) * (r - 0.6)) / 0.2;
  }
  if (r <= 1.0) {
    return 0.7 - ((0.7 - 0.5) * (r - 0.8)) / 0.2;
  }
  if (r <= 1.4) {
    return 0.5 - ((0.5 - 0.2) * (r - 1.0)) / 0.4;
  }
  if (r <= 1.8) {
    return 0.2 - ((0.2 - 0.1) * (r - 1.4)) / 0.4;
  }
  return 0.05;
}

function computeOptimalPrices({
  virtualMedian,
  costAmount,
  stepCount = 15,
}) {
  if (!virtualMedian || virtualMedian <= 0) {
    return {
      revenueMaxPrice: null,
      profitMaxPrice: null,
    };
  }

  const base = virtualMedian;
  const minP = base * 0.6;
  const maxP = base * 1.8;

  let bestRevenue = { p: null, val: -Infinity };
  let bestProfit = { p: null, val: -Infinity };

  for (let i = 0; i <= stepCount; i++) {
    const t = i / stepCount;
    const p = minP + (maxP - minP) * t;
    const conv = estimateConversionRate(p, base);
    const expectedSales = p * conv;

    if (expectedSales > bestRevenue.val) {
      bestRevenue = { p, val: expectedSales };
    }

    const profitPerSale = p - (costAmount || 0);
    const expectedProfit = profitPerSale * conv;

    if (expectedProfit > bestProfit.val && profitPerSale > 0) {
      bestProfit = { p, val: expectedProfit };
    }
  }

  const round10 = (x) => Math.round(x / 10) * 10;

  return {
    revenueMaxPrice:
      bestRevenue.p != null ? round10(bestRevenue.p) : null,
    profitMaxPrice:
      bestProfit.p != null ? round10(bestProfit.p) : null,
  };
}

// ---- v3.7: Post-filter & Trust-score ----

function calcMedian(arr) {
  if (!arr || !arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function classifyAndScoreListings(priceItems) {
  if (!priceItems.length) return [];

  const prices = priceItems.map((p) => p.totalJpy);
  const median = calcMedian(prices);
  if (!median || median <= 0) {
    return priceItems.map((it) => ({
      ...it,
      postFilterClass: "SAME",
      listingTrustScore: 0.8,
    }));
  }

  return priceItems.map((it) => {
    const ratio = it.totalJpy / median;
    let postFilterClass = "SAME";
    let listingTrustScore = 0.8;

    if (ratio >= 0.75 && ratio <= 1.25) {
      postFilterClass = "SAME";
      listingTrustScore = 0.9;
    } else if (
      (ratio >= 0.5 && ratio < 0.75) ||
      (ratio > 1.25 && ratio <= 1.5)
    ) {
      postFilterClass = "VARIANT";
      listingTrustScore = 0.75;
    } else if (
      (ratio >= 0.3 && ratio < 0.5) ||
      (ratio > 1.5 && ratio <= 2.0)
    ) {
      postFilterClass = "RELATED";
      listingTrustScore = 0.5;
    } else {
      postFilterClass = "ANOMALY";
      listingTrustScore = 0.2;
    }

    return {
      ...it,
      postFilterClass,
      listingTrustScore,
    };
  });
}

function buildTrustedPriceArray(classifiedItems) {
  const arr = [];

  for (const it of classifiedItems) {
    if (it.postFilterClass !== "SAME" && it.postFilterClass !== "VARIANT") {
      continue;
    }

    const t = it.listingTrustScore ?? 0.8;
    const weight = Math.max(1, Math.min(3, Math.round(1 + 2 * (t - 0.5))));

    for (let i = 0; i < weight; i++) {
      arr.push(it.totalJpy);
    }
  }

  return arr;
}

export async function fetchWorldPriceFromEbayMarketplace(
  keyword,
  marketplaceId,
  genreId = null
) {
  let pricesJpy = [];

  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][fetch-start]", { marketplaceId, keyword, genreId });
  }
  console.log("[world-price] fetch", { keyword, marketplaceId });

  const token = await getEbayAccessToken();
  if (!token) {
    console.warn("[world-price] no ebay token, skip");
    return null;
  }

  let q = (keyword || "").trim();
  if (q.length > 80) {
    q = q.slice(0, 80);
  }

  q = q
    .replace(/セット/g, "")
    .replace(/まとめ売り/g, "")
    .replace(/lot/gi, "")
    .replace(/set/gi, "")
    .trim();

  if (!q) {
    console.warn("[world-price] keyword empty after cleanup, skip");
    return null;
  }

  const baseUrl =
    EBAY_ENV === "sandbox"
      ? "https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search"
      : "https://api.ebay.com/buy/browse/v1/item_summary/search";

  const url =
    baseUrl +
    `?q=${encodeURIComponent(q)}` +
    "&limit=50&filter=buyingOptions:{FIXED_PRICE}";

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[world-price] ebay error", marketplaceId, res.status, text);
    return null;
  }

  const data = await res.json();
  const items = Array.isArray(data.itemSummaries)
    ? data.itemSummaries
    : [];

  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][raw-items]", {
      marketplaceId,
      count: items.length,
      sample: items.slice(0, 5).map((i) => i.title),
    });
    console.log("[world-price][debug] raw itemSummaries", {
      marketplaceId,
      q,
      total: items.length,
    });
  }

  if (!items.length) {
    console.log("[world-price] no items", { marketplaceId, q });
    return null;
  }

  let filtered = items;
  const kw = (keyword || "").toUpperCase();

  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][debug] filter start", {
      marketplaceId,
      count: filtered.length,
    });
  }

  if (/PSA\s*10/.test(kw)) {
    filtered = filtered.filter((it) =>
      /(PSA\s*10|PSA10)/i.test(it.title || "")
    );
    if (WORLD_PRICE_DEBUG) {
      console.log("[world-price][debug] after PSA10 filter", {
        marketplaceId,
        count: filtered.length,
      });
    }
  }

  if (/(JAPANESE|JPN|JAPAN)/.test(kw)) {
    const jpLike = filtered.filter((it) => {
      const title = (it.title || "") + " " + (it.shortDescription || "");
      const loc =
        (it.itemLocation &&
          (it.itemLocation.country || it.itemLocation.countryCode)) ||
        "";
      return (
        /(JAPANESE|JPN|JAPAN)/i.test(title) ||
        String(loc).toUpperCase() === "JP"
      );
    });
    if (jpLike.length) {
      filtered = jpLike;
      if (WORLD_PRICE_DEBUG) {
        console.log("[world-price][debug] after Japanese filter", {
          marketplaceId,
          count: filtered.length,
        });
      }
    }
  }

  const numMatch = kw.match(/#?(\d{3})\b/);
  if (numMatch) {
    const num = numMatch[1];
    const numRe = new RegExp(`(\\#${num}(\\D|$)|\\b${num}[A-Z0-9/ ]?)`);
    const byNumber = filtered.filter((it) =>
      numRe.test((it.title || "").toUpperCase())
    );
    if (byNumber.length >= Math.min(filtered.length, 3)) {
      filtered = byNumber;
      if (WORLD_PRICE_DEBUG) {
        console.log("[world-price][debug] after cardNumber filter", {
          marketplaceId,
          count: filtered.length,
        });
      }
    }
  }

  const setTokens = [];
  const setCodeMatch = kw.match(/\bSV[0-9A-Z]{1,2}\b/);
  if (setCodeMatch) {
    setTokens.push(setCodeMatch[0]);
  }
  if (/SCARLET/.test(kw)) setTokens.push("SCARLET");
  if (/VIOLET/.test(kw)) setTokens.push("VIOLET");
  if (setTokens.length) {
    const setRe = new RegExp(setTokens.join("|"), "i");
    const bySet = filtered.filter((it) => setRe.test(it.title || ""));
    if (bySet.length >= Math.min(filtered.length, 3)) {
      filtered = bySet;
      if (WORLD_PRICE_DEBUG) {
        console.log("[world-price][debug] after setName filter", {
          marketplaceId,
          count: filtered.length,
        });
      }
    }
  }

  if (!filtered.length) {
    if (WORLD_PRICE_DEBUG) {
      console.log(
        "[world-price][debug] filtered empty, fallback to original items",
        { marketplaceId }
      );
    }
    filtered = items;
  }

  const { usd_jpy: rateUsd, gbp_jpy: rateGbp } = await getFxRates();

  const priceItems = [];

  for (const it of filtered) {
    // パック/BOXフィルタ + ジャンル別NG
    if (
      !isListingAllowedForGenre(
        genreId,
        it.title || "",
        it.shortDescription || ""
      )
    ) {
      if (WORLD_PRICE_DEBUG) {
        console.log("[world-price][debug] listing excluded by NG rules", {
          marketplaceId,
          genreId,
          title: it.title,
        });
      }
      continue;
    }

    const p = it.price;
    if (!p || !p.value || !p.currency) continue;

    const priceVal = Number(p.value);
    if (!Number.isFinite(priceVal) || priceVal <= 0) continue;

    let shippingVal = 0;
    if (it.shippingOptions && it.shippingOptions.length > 0) {
      const s = it.shippingOptions[0].shippingCost;
      if (s && s.value) {
        shippingVal = Number(s.value);
      }
    }

    const totalVal = priceVal + shippingVal;

    let rate = 0;
    const curr = String(p.currency).toUpperCase();

    if (curr === "USD") rate = rateUsd;
    else if (curr === "GBP") rate = rateGbp;
    else if (curr === "JPY") rate = 1;
    else continue;

    const totalJpy = totalVal * rate;

    if (totalJpy < 1 || totalJpy > 1_000_000_000) continue;

    priceItems.push({
      totalJpy,
      title: it.title || "",
      shortDescription: it.shortDescription || "",
      itemLocation: it.itemLocation || null,
      seller: it.seller || null,
    });

    if (WORLD_PRICE_DEBUG) {
      console.log("[world-price][debug] price breakdown", {
        marketplaceId,
        title: it.title?.substring(0, 50) || "N/A",
        priceVal,
        shippingVal,
        totalVal,
        currency: curr,
        rate,
        totalJpy: Math.round(totalJpy),
      });
    }
  }

  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][filtered-items-count]", {
      marketplaceId,
      genreId,
      count: priceItems.length,
    });
  }

  if (!priceItems.length) {
    if (WORLD_PRICE_DEBUG) {
      console.log("[world-price][debug] no price items after filtering", {
        marketplaceId,
      });
    }
    return null;
  }

  const classified = classifyAndScoreListings(priceItems);
  const trustedPrices = buildTrustedPriceArray(classified);

  pricesJpy = trustedPrices;

  const stats = buildPriceStats(pricesJpy, genreId);

  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][final-prices]", {
      marketplaceId,
      prices: trustedPrices.slice(0, 20),
      stats,
    });
  }

  if (!stats) {
    if (WORLD_PRICE_DEBUG) {
      console.log("[world-price][debug] stats null (sample too small)", {
        marketplaceId,
        q,
        pricesCount: trustedPrices.length,
      });
    }
    return null;
  }

  console.log("[world-price] stats", {
    marketplaceId,
    q,
    ...stats,
  });

  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][debug] final stats", {
      marketplaceId,
      q,
      pricesCount: pricesJpy.length,
      stats,
    });
  }

  return stats;
}

// Completed/Sold 用フック(将来用)
async function fetchWorldPriceFromEbaySold(keyword, marketplaceId, genreId) {
  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][debug] fetchSold not implemented, keyword=", {
      keyword,
      marketplaceId,
    });
  }
  return null;
}

// 世界相場更新: orders テーブルへの書き込み
export async function runWorldPriceUpdate(pool, orderId, sellerId) {
  const orderRes = await pool.query(
    `
      select id, summary, amount, cost_amount
      from orders
      where id = $1
    `,
    [orderId]
  );
  if (orderRes.rowCount === 0) {
    console.warn("[world-price] order not found", orderId);
    return;
  }
  const order = orderRes.rows[0];

  const keywordRaw = (order.summary || "").split("\n")[0].trim();
  if (!keywordRaw) {
    console.warn("[world-price] no summary keyword", { orderId });
    return;
  }

  const genreId = detectGenreIdFromSummary(keywordRaw);
  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][genre]", {
      orderId,
      summary: keywordRaw,
      genreId,
    });
  }

  if (isSetLikeSummary(keywordRaw)) {
    console.log("[world-price] detected set/lot item, skip world price", {
      orderId,
      summary: keywordRaw,
    });
    return;
  }

  const keywordForEbay = buildEbayKeywordFromSummary(keywordRaw);

  let us = null;
  let uk = null;

  if (EBAY_SOURCE_MODE === "sold") {
    us = await fetchWorldPriceFromEbaySold(keywordForEbay, "EBAY_US", genreId);
    uk = await fetchWorldPriceFromEbaySold(keywordForEbay, "EBAY_GB", genreId);

    if (!us && !uk) {
      console.warn(
        "[world-price] sold-mode returned no data, fallback to active listings",
        { orderId, keywordForEbay }
      );
      us = await fetchWorldPriceFromEbayMarketplace(
        keywordForEbay,
        "EBAY_US",
        genreId
      );
      uk = await fetchWorldPriceFromEbayMarketplace(
        keywordForEbay,
        "EBAY_GB",
        genreId
      );
    }
  } else {
    us = await fetchWorldPriceFromEbayMarketplace(
      keywordForEbay,
      "EBAY_US",
      genreId
    );
    uk = await fetchWorldPriceFromEbayMarketplace(
      keywordForEbay,
      "EBAY_GB",
      genreId
    );
  }

  if (!us && !uk) {
    console.warn("[world-price] no market data", {
      orderId,
      keywordRaw,
      keywordForEbay,
    });
    return;
  }

  const cand = [us, uk].filter(Boolean);
  const best = cand.reduce((acc, cur) => {
    if (!acc) return cur;
    if ((cur.medianJpy || 0) > (acc.medianJpy || 0)) return cur;
    return acc;
  }, null);

  let worldLow = null;

  const usLow =
    us && typeof us.lowJpy === "number" ? us.lowJpy : null;
  const ukLow =
    uk && typeof uk.lowJpy === "number" ? uk.lowJpy : null;

  if (usLow != null || ukLow != null) {
    const lows = [usLow, ukLow].filter((v) => v != null);
    worldLow = Math.max(...lows);
  }

  if (!best || !best.medianJpy) {
    console.warn("[world-price] best not found", {
      orderId,
      keywordRaw,
      keywordForEbay,
    });
    return;
  }

  if ((worldLow == null || worldLow <= 0) && typeof best.lowJpy === "number") {
    worldLow = best.lowJpy;
  }

  if (worldLow != null) {
    worldLow = Math.round(worldLow);
  }

  const virtualMedian = best.medianJpy;
  const costAmount =
    typeof order.cost_amount === "number" ? order.cost_amount : 0;

  const { revenueMaxPrice, profitMaxPrice } = computeOptimalPrices({
    virtualMedian,
    costAmount,
  });

  await pool.query(
    `
      update orders
         set world_price_median = $1,
             world_price_high = $2,
             world_price_low = $3,
             world_price_sample_count = $4,
             world_price_revenue_max = $5,
             world_price_profit_max = $6,
             updated_at = now()
       where id = $7
    `,
    [
      best.medianJpy,
      best.highJpy,
      worldLow ?? null,
      best.sampleCount || 0,
      revenueMaxPrice,
      profitMaxPrice,
      orderId,
    ]
  );

  console.log("[world-price] updated", {
    orderId,
    median: best.medianJpy,
    high: best.highJpy,
    low: worldLow,
    sample: best.sampleCount,
    revenueMaxPrice,
    profitMaxPrice,
    soldAmount: order.amount,
    errorVsSold: best.medianJpy - order.amount,
  });
}

export async function queueWorldPriceUpdate(pool, orderId, sellerId) {
  setImmediate(() => {
    runWorldPriceUpdate(pool, orderId, sellerId).catch((err) => {
      console.error("[world-price] run error", err);
    });
  });
}
