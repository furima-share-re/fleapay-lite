// worldPriceGenreEngine.js
// FleaPay 世界相場エンジン用：ジャンル判定＋eBay検索キーワード生成

export const WORLD_PRICE_GENRES = [
  {
    id: "graded_card",
    label: "PSA/BGS 付きカード",
    matchKeywords: ["psa", "bgs", "鑑定"],
  },
  {
    id: "raw_card",
    label: "ノーマルカード単品",
    matchKeywords: ["カード", "トレカ", "ポケカ", "pokemon", "遊戯王", "yu-gi-oh", "mtg"],
  },
  {
    id: "sealed_pack",
    label: "パック・BOX（未開封）",
    matchKeywords: ["パック", "パック ", "box", "ボックス", "booster"],
  },
  {
    id: "figure",
    label: "フィギュア",
    matchKeywords: ["フィギュア", "ねんどろいど", "一番くじ", "figure"],
  },
  {
    id: "plush",
    label: "ぬいぐるみ",
    matchKeywords: ["ぬいぐるみ", "ぬい", "plush"],
  },
  {
    id: "fashion",
    label: "服・帽子・バッグ・靴など",
    matchKeywords: ["服", "tシャツ", "ジャケット", "帽子", "キャップ", "bag", "バッグ", "スニーカー", "shoes"],
  },
  {
    id: "toy",
    label: "おもちゃ・ホビー",
    matchKeywords: ["おもちゃ", "toy", "ラブブ"],
  },
  {
    id: "antique",
    label: "骨董・ビンテージ",
    matchKeywords: ["骨董", "骨とう", "ビンテージ", "アンティーク", "こけし"],
  },
  {
    id: "other",
    label: "その他",
    matchKeywords: [],
  },
];

// 🔍 summary(日本語タイトルなど)から FleaPay 内部ジャンルを推定
export function detectGenreIdFromSummary(summaryRaw = "") {
  const s = String(summaryRaw || "").toLowerCase();
  let bestId = "other";
  let bestScore = 0;

  for (const g of WORLD_PRICE_GENRES) {
    let score = 0;
    for (const kw of g.matchKeywords) {
      if (!kw) continue;
      if (s.includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = g.id;
    }
  }
  return bestId;
}

// eBay検索用キーワード生成（旧 buildEbayKeywordFromSummary の移植＋ジャンル考慮）
export function buildEbayKeywordFromSummary(summaryRaw = "") {
  const original = String(summaryRaw || "").trim();
  if (!original) return "";

  // 空白を正規化
  let normalized = original.replace(/\s+/g, " ").replace(/　+/g, " ");
  const lower = normalized.toLowerCase();

  const genreId = detectGenreIdFromSummary(normalized);
  const tokens = [];

  // ▼ジャンルに応じたベース単語
  if (/(ポケモン|ポケカ|pokemon)/i.test(normalized)) {
    tokens.push("Pokemon", "Pokemon card");
  }
  if (/(遊戯王|yu-?gi-?oh)/i.test(normalized)) {
    tokens.push("Yu-Gi-Oh card");
  }
  if (/mtg|マジック[:： ]?ザ[:： ]?ギャザリング/i.test(normalized)) {
    tokens.push("MTG", "Magic the Gathering");
  }
  if (/フィギュア/i.test(normalized)) tokens.push("figure");
  if (/ねんどろいど/i.test(normalized)) tokens.push("Nendoroid");
  if (/ぬいぐるみ/i.test(normalized)) tokens.push("plush");
  if (/こけし/i.test(normalized)) tokens.push("kokeshi doll");
  if (/バッグ|カバン/i.test(normalized)) tokens.push("bag");
  if (/リュック/i.test(normalized)) tokens.push("backpack");
  if (/帽子|キャップ/i.test(normalized)) tokens.push("hat");
  if (/時計/i.test(normalized)) tokens.push("watch");
  if (/ゲーム|カセット|ソフト/i.test(normalized)) tokens.push("video game");

  // sealed_pack なら「Pack/Box」系を明示
  if (genreId === "sealed_pack") {
    tokens.push("booster pack", "sealed", "box");
  }

  // ▼キャラ名・著名カードのカナ/英語 → 統一英語名
  const charMap = [
    { re: /ピカチュウ|Pikachu/i, en: "Pikachu" },
    { re: /リザードン|Charizard/i, en: "Charizard" },
    { re: /ギャラドス|Gyarados/i, en: "Gyarados" },
    { re: /イーブイ|Eevee/i, en: "Eevee" },
    { re: /ミュウツー|Mewtwo/i, en: "Mewtwo" },
    { re: /ミュウ(?!ツー)|\bMew\b/i, en: "Mew" },
    { re: /ナガバ|Yu\s+Nagaba/i, en: "Yu Nagaba" },
  ];
  let hasPokemonChar = false;
  for (const { re, en } of charMap) {
    if (re.test(normalized)) {
      tokens.push(en);
      hasPokemonChar = true;
    }
  }
  if (
    !tokens.some((t) => t.toLowerCase().includes("pokemon")) &&
    hasPokemonChar
  ) {
    tokens.push("Pokemon card");
  }

  // ▼PSAグレード (psa10 → "PSA 10") ※ graded_card のとき優先
  const psaMatch = normalized.match(/psa\s*([0-9]{1,2})/i);
  if (psaMatch && genreId === "graded_card") {
    tokens.push("PSA", psaMatch[1]); // → "PSA 10"
  }

  // ▼言語・地域
  if (/(日本語|日本版|jpn|japanese)/i.test(lower)) {
    tokens.push("Japanese", "Japan", "JPN");
  } else if (/jpn/i.test(original)) {
    tokens.push("Japanese", "JPN");
  }

  // ▼レアリティ/キーワード
  if (/sr\b|スーパーレア/i.test(normalized)) tokens.push("SR");
  if (/hr\b|ハイパーレア/i.test(normalized)) tokens.push("HR");
  if (/ur\b|ウルトラレア/i.test(normalized)) tokens.push("UR");
  if (/sar\b/i.test(normalized)) tokens.push("SAR");
  if (/ar\b/i.test(normalized)) tokens.push("AR");
  if (/sar\b|ar\b|illustration rare/i.test(lower)) tokens.push("Full Art");

  // ▼番号(091/078, 25/102 など)
  const numMatches = normalized.match(/\b(\d{1,3}\/\d{1,3})\b/g);
  if (numMatches) {
    for (const num of numMatches) tokens.push(num);
  }

  // ▼型番・カード番号っぽいもの（SV1V-XXX 等）はそのまま追加
  const codeMatches = normalized.match(/[A-Za-z]{1,4}[-/ ]?\d{2,4}[A-Za-z]?/g);
  if (codeMatches) {
    for (const code of codeMatches) {
      tokens.push(code.replace(/\s+/g, ""));
    }
  }

  // ▼パック系特有の語
  if (genreId === "sealed_pack") {
    if (/box/i.test(normalized)) tokens.push("box");
    if (/パック/i.test(normalized)) tokens.push("pack");
    if (/メガ|mega/i.test(normalized)) tokens.push("Mega");
  }

  // 重複除去して結合
  const keyword = Array.from(new Set(tokens.filter(Boolean))).join(" ");

  // NOTE: WORLD_PRICE_DEBUG ログは payments.js 側で出す（ここでは出さない）

  // 何も作れなかった場合は元の summary でフォールバック
  return keyword || original;
}
