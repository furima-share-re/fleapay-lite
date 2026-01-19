// worldPriceEngine/ebayClient.js
// eBay から価格取得(fetchWorldPriceFromEbayMarketplace 他)

import { isListingAllowedForGenre } from "./genres.js";
import { buildPriceStats } from "./stats.js";

// eBay API 用の環境変数
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID || "";
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET || "";
const EBAY_ENV = process.env.EBAY_ENV || "production"; // or "sandbox"
const DEFAULT_EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";
const INSIGHTS_SCOPE = "https://api.ebay.com/oauth/api_scope/buy.marketplace.insights";

// デバッグログ用フラグ
const WORLD_PRICE_DEBUG = process.env.WORLD_PRICE_DEBUG === "1";

// データソースモード: active or sold
export const EBAY_SOURCE_MODE =
  process.env.EBAY_SOURCE_MODE || "active";

// eBay アクセストークンの簡易キャッシュ (scope別)
const ebayTokenCache = new Map();

// 為替レートキャッシュ (USD/JPY, GBP/JPY)
let fxCache = {
  usd_jpy: null,
  gbp_jpy: null,
  expiresAt: 0,
};

// eBay OAuth トークン取得(client_credentials)
async function getEbayAccessToken(scopes = DEFAULT_EBAY_SCOPE) {
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
    console.warn("[world-price] EBAY_CLIENT_ID/SECRET not set, skip eBay call");
    return null;
  }

  const scopeKey = Array.isArray(scopes) ? scopes.join(" ") : scopes;
  const now = Date.now();
  const cached = ebayTokenCache.get(scopeKey);
  if (cached && cached.expiresAt > now + 60_000) {
    return cached.token;
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
  body.set("scope", scopeKey);

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

  ebayTokenCache.set(scopeKey, {
    token: accessToken,
    expiresAt: Date.now() + expiresIn * 1000
  });

  console.log("[world-price] ebay token refreshed, expiresIn(s)=", expiresIn);

  return accessToken;
}

export async function fetchEbayTopSoldItems(keyword, marketplaceId, options = {}) {
  const limit = Number(options.limit) || 10;
  const q = (keyword || "").trim();

  if (!q) {
    return { items: [], total: 0 };
  }

  const token = await getEbayAccessToken([DEFAULT_EBAY_SCOPE, INSIGHTS_SCOPE]);
  if (!token) {
    console.warn("[world-price] no ebay token for insights, skip");
    return null;
  }

  const baseUrl =
    EBAY_ENV === "sandbox"
      ? "https://api.sandbox.ebay.com/buy/marketplace_insights/v1_beta/item_sales/search"
      : "https://api.ebay.com/buy/marketplace_insights/v1_beta/item_sales/search";

  const params = new URLSearchParams();
  params.set("q", q);
  params.set("limit", String(limit));

  const url = `${baseUrl}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[world-price] ebay insights error", marketplaceId, res.status, text);
    return null;
  }

  const data = await res.json();
  const rawItems = Array.isArray(data.itemSales) ? data.itemSales : [];

  const items = rawItems.map((item) => {
    const title = item.title || item.item?.title || item.itemId || "";
    const soldQuantity = Number(
      item.totalSoldQuantity ??
      item.soldQuantity ??
      item.quantitySold ??
      item.quantity ??
      0
    );
    const avgPrice =
      item.averageSoldPrice ||
      item.avgSoldPrice ||
      item.averagePrice ||
      null;
    const avgValue = avgPrice?.value ?? avgPrice?.amount ?? null;
    const avgCurrency = avgPrice?.currency || avgPrice?.currencyCode || null;

    return {
      itemId: item.itemId || item.item?.itemId || null,
      title,
      soldQuantity: Number.isFinite(soldQuantity) ? soldQuantity : 0,
      averageSoldPrice: avgValue !== null && Number.isFinite(Number(avgValue))
        ? { value: Number(avgValue), currency: avgCurrency }
        : null,
      itemUrl: item.itemWebUrl || item.item?.itemWebUrl || null,
    };
  });

  items.sort((a, b) => (b.soldQuantity || 0) - (a.soldQuantity || 0));

  return {
    items,
    total: Number(data.totalEntries || data.total || items.length) || 0,
  };
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

  // 🔧 修正②: PSA グレード / 鑑定カードフィルタ（全グレード対応）
  //   - PSA 10 だけでなく、PSA 9 / PSA 8 など全グレードに対応
  const psaGradeMatch = kw.match(/PSA\s*([0-9]{1,2})/i);
  if (psaGradeMatch) {
    const grade = psaGradeMatch[1];
    const psaRe = new RegExp(`PSA\\s*${grade}`, "i");
    filtered = filtered.filter((it) => psaRe.test(it.title || ""));
    if (WORLD_PRICE_DEBUG) {
      console.log("[world-price][debug] after PSA grade filter", {
        marketplaceId,
        grade,
        count: filtered.length,
      });
    }
  } else if (/PSA/i.test(kw)) {
    // グレード番号が取れない場合でも、少なくとも PSA 表記は必須にする
    filtered = filtered.filter((it) => /PSA/i.test(it.title || ""));
    if (WORLD_PRICE_DEBUG) {
      console.log("[world-price][debug] after generic PSA filter", {
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

  // 🔧 カード番号フィルタ
  //  - まず「AR 181」「SAR 123」などのレアリティ＋番号パターンを優先
  //  - それが無ければ、3桁数字の「最後のもの」をカード番号とみなす
  let cardNum = null;

  // ① レアリティ + 番号 (AR 181 / SAR 123 / SR 091 など)
  const rarityNum = kw.match(/\b(SR|UR|HR|AR|SAR|SEC|P)\s*([0-9]{2,3})\b/i);
  if (rarityNum) {
    cardNum = rarityNum[2];
  }

  // ② フォールバック: 純粋な3桁数字の「最後のもの」
  if (!cardNum) {
    const allNums = kw.match(/\b([0-9]{3})\b/g);
    if (allNums && allNums.length) {
      cardNum = allNums[allNums.length - 1]; // 最後の3桁を採用
    }
  }

  if (cardNum) {
    const numRe = new RegExp(`(\\#${cardNum}(\\D|$)|\\b${cardNum}[A-Z0-9/ ]?)`);
    const byNumber = filtered.filter((it) =>
      numRe.test((it.title || "").toUpperCase())
    );
    if (byNumber.length) {
      filtered = byNumber;
      if (WORLD_PRICE_DEBUG) {
        console.log("[world-price][debug] after cardNumber filter", {
          marketplaceId,
          cardNum,
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
export async function fetchWorldPriceFromEbaySold(keyword, marketplaceId, genreId) {
  if (WORLD_PRICE_DEBUG) {
    console.log("[world-price][debug] fetchSold not implemented, keyword=", {
      keyword,
      marketplaceId,
    });
  }
  return null;
}
