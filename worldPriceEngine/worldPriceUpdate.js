// worldPriceEngine/worldPriceUpdate.js
// orders テーブルの世界相場更新(runWorldPriceUpdate, queueWorldPriceUpdate)

import { detectGenreIdFromSummary } from "./genreDetector.js";
import { buildEbayKeywordFromSummary } from "./keywordBuilder.js";
import {
  EBAY_SOURCE_MODE,
  fetchWorldPriceFromEbayMarketplace,
  fetchWorldPriceFromEbaySold,
} from "./ebayClient.js";

// デバッグログ用フラグ
const WORLD_PRICE_DEBUG = process.env.WORLD_PRICE_DEBUG === "1";

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

// 世界相場更新: orders テーブルへの書き込み
export async function runWorldPriceUpdate(pool, orderId, sellerId) {
  const orderRes = await pool.query(
    `
      select id, summary, amount, cost_amount, deleted_at
      from orders
      where id = $1
    `,
    [orderId]
  );
  if (orderRes.rowCount === 0) {
    console.warn("[world-price] order not found", orderId);
    return;
  }
  // 🆕 削除済み注文はスキップ
  if (orderRes.rows[0].deleted_at) {
    console.warn("[world-price] order deleted, skip", orderId);
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
