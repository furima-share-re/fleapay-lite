// worldPriceEngine/stats.js
// 価格配列 → 統計値（buildPriceStats）

import { getGenreMinSamples } from "./genres.js";

// 🆕 数値配列の中央値ヘルパー
export function medianOf(arr) {
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
