// worldPriceEngine/genres.js
// ジャンル定義 & minSamples/weights/NG 条件

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
 * (オプション)ジャンル定義を取得するヘルパー
 */
export function getGenreMeta(genreId) {
  return WORLD_PRICE_GENRES.find((g) => g.id === genreId) || null;
}

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

  // --- 未開封BOX系: bulk/lot/bundle/case系NG + 「BOXらしさ」が必須 ---
  if (
    genreId === "tcg_pokemon_sealed_box" ||
    genreId === "tcg_other_sealed_box"
  ) {
    if (includesAny(["bulk", "lot", "bundle", "case", "カートン", "セット", "set"])) {
      return false;
    }

    // ✅ 本当に「BOX」であることをタイトルから確認
    const isBoxLike = /(booster box|box set|box|ボックス|ボックスセット)/i.test(t);
    if (!isBoxLike) {
      // 「10pack」「パックのみ」などはここで落ちる
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
