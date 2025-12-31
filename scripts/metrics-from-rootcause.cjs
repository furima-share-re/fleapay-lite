#!/usr/bin/env node
/**
 * metrics-from-rootcause.cjs
 *
 * Inputs:
 *  - artifacts/generative-report.json
 *  - artifacts/rootcause-report.json
 * Optional:
 *  - truth/_index.yml (to enrich impact_level if available)
 *  - metrics/*.json (to compute trend vs previous week)
 *
 * Outputs:
 *  - metrics/YYYY-MM-DD.json (decision-grade metrics)
 *  - metrics/YYYY-MM-DD.md   (one-page weekly executive report)
 *
 * Usage:
 *  node scripts/metrics-from-rootcause.cjs \
 *    artifacts/generative-report.json \
 *    artifacts/rootcause-report.json \
 *    metrics/2025-12-31
 *
 * The third argument is output prefix without extension.
 * It will write `${prefix}.json` and `${prefix}.md`.
 */

const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function safeReadJson(p) {
  try {
    if (!fs.existsSync(p)) return null;
    return readJson(p);
  } catch {
    return null;
  }
}
function safeReadYaml(p) {
  try {
    if (!fs.existsSync(p)) return null;
    return yaml.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function todayTokyoISODate() {
  // GitHub Actions uses UTC by default; we want a stable "report date"
  // Prefer env var if provided
  if (process.env.REPORT_DATE) return process.env.REPORT_DATE;
  const d = new Date();
  // Use UTC date to avoid timezone surprises in CI; can override with REPORT_DATE
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function listMetricFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(dir, f))
    .sort(); // ISO date filenames sort correctly
}

function findPreviousMetrics(metricsDir, currentBaseName) {
  const files = listMetricFiles(metricsDir);
  const cur = path.join(metricsDir, `${currentBaseName}.json`);
  const idx = files.indexOf(cur);
  if (idx <= 0) return null;
  return safeReadJson(files[idx - 1]);
}

/**
 * Tries to normalize different report shapes.
 * We only rely on:
 *  - total
 *  - mismatchCount OR mismatches length
 *  - perTruth array if present (for top offenders)
 */
function normalizeGenerativeReport(report) {
  const total =
    report?.total ??
    report?.summary?.total ??
    report?.runsTotal ??
    report?.casesTotal ??
    0;

  const mismatchCount =
    report?.mismatchCount ??
    report?.summary?.mismatchCount ??
    (Array.isArray(report?.mismatches) ? report.mismatches.length : null) ??
    (Array.isArray(report?.results)
      ? report.results.filter((r) => r?.ok === false || r?.match === false).length
      : null) ??
    0;

  // Try to get per-truth mismatches
  let byTruth = [];
  if (Array.isArray(report?.byTruth)) byTruth = report.byTruth;
  else if (Array.isArray(report?.truthResults)) byTruth = report.truthResults;
  else if (Array.isArray(report?.results)) {
    // results may include truthPath + ok
    const map = new Map();
    for (const r of report.results) {
      const truthPath = r?.truthPath || r?.truth || r?.truth_file || r?.file;
      if (!truthPath) continue;
      const ok = r?.ok ?? r?.match ?? r?.passed;
      const isMismatch = ok === false;
      if (!map.has(truthPath)) map.set(truthPath, { truth: truthPath, total: 0, mismatches: 0 });
      const row = map.get(truthPath);
      row.total += 1;
      if (isMismatch) row.mismatches += 1;
    }
    byTruth = [...map.values()];
  }

  // Normalize keys
  byTruth = byTruth
    .map((x) => ({
      truth: x.truth || x.truthPath || x.file,
      total: x.total ?? x.runs ?? 0,
      mismatches: x.mismatches ?? x.mismatchCount ?? 0,
      impact_level: x.impact_level || x.impact || null,
    }))
    .filter((x) => x.truth);

  return { total, mismatchCount, byTruth };
}

function normalizeRootcauseReport(report) {
  // Try to support multiple shapes; extract "causes" counts if possible
  const causes =
    report?.summary?.causes ??
    report?.causes ??
    report?.rootCauses ??
    report?.categories ??
    null;

  // Normalize into [{type,count}] best-effort
  const list = [];
  if (Array.isArray(causes)) {
    for (const c of causes) {
      const type = c.type || c.name || c.category;
      const count = c.count ?? c.n ?? 0;
      if (type) list.push({ type, count });
    }
  } else if (causes && typeof causes === "object") {
    for (const [k, v] of Object.entries(causes)) {
      list.push({ type: k, count: typeof v === "number" ? v : (v?.count ?? 0) });
    }
  }

  // Also try errorTypes if present (from rootcause-report.json structure)
  if (report?.errorTypes && typeof report.errorTypes === "object") {
    for (const [k, v] of Object.entries(report.errorTypes)) {
      const count = typeof v === "number" ? v : 0;
      if (count > 0) {
        list.push({ type: k, count });
      }
    }
  }

  list.sort((a, b) => b.count - a.count);
  return { causesTop: list.slice(0, 5) };
}

function loadImpactIndex() {
  const idx = safeReadYaml("truth/_index.yml");
  const files = idx?.files || {};
  // index keys may be "infra/timeout.yml" etc (without truth/)
  const map = new Map();
  for (const [k, v] of Object.entries(files)) {
    const truthPath = k.startsWith("truth/") ? k : `truth/${k}`;
    map.set(truthPath, v?.impact_level || v?.impactLevel || null);
  }
  return map;
}

function impactBucket(impact) {
  const v = (impact || "unknown").toLowerCase();
  if (v === "critical") return "critical";
  if (v === "high") return "high";
  if (v === "medium") return "medium";
  if (v === "low") return "low";
  return "unknown";
}

function rate(numer, denom) {
  if (!denom || denom <= 0) return 0;
  return numer / denom;
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function deltaPct(curr, prev) {
  const d = curr - prev;
  const sign = d > 0 ? "+" : "";
  return `${sign}${(d * 100).toFixed(1)}pt`;
}

function decisionFlags(metrics) {
  // Conservative defaults; tune later based on your governance
  const criticalRate = metrics.by_impact_level.critical.rate;
  const highRate = metrics.by_impact_level.high.rate;
  const overall = metrics.summary.mismatch_rate;

  // Suggested policy (edit if you want):
  // - Any critical mismatch => immediate block required
  // - High > 3% => human review required
  // - Overall > 5% => governance escalation
  const ci_block_required = metrics.by_impact_level.critical.mismatches > 0;
  const human_review_required = highRate > 0.03 || overall > 0.05;
  const governance_escalation = overall > 0.08;

  return { ci_block_required, human_review_required, governance_escalation };
}

function formatExecutiveMd({ date, metrics, prevMetrics }) {
  const s = metrics.summary;

  const lines = [];
  lines.push(`# 週次AI品質報告（Truth Consistency）`);
  lines.push(`- 対象週: **${date}**`);
  lines.push(`- 実行: **${s.total_runs}** / 誤認: **${s.mismatch_runs}** / 誤認率: **${pct(s.mismatch_rate)}**`);

  if (prevMetrics) {
    const prev = prevMetrics.summary?.mismatch_rate ?? 0;
    lines.push(`- 前週比: **${deltaPct(s.mismatch_rate, prev)}**（前週 ${pct(prev)}）`);
  }

  lines.push(``);
  lines.push(`## 経営判断フラグ`);
  lines.push(`- CIブロック必須（criticalに誤認）: **${metrics.decision_flags.ci_block_required ? "YES" : "NO"}**`);
  lines.push(`- 人手レビュー強化推奨: **${metrics.decision_flags.human_review_required ? "YES" : "NO"}**`);
  lines.push(`- ガバナンスエスカレーション: **${metrics.decision_flags.governance_escalation ? "YES" : "NO"}**`);

  lines.push(``);
  lines.push(`## 影響度別（誤認率）`);
  const b = metrics.by_impact_level;
  lines.push(`- critical: ${b.critical.mismatches}/${b.critical.runs} (${pct(b.critical.rate)})`);
  lines.push(`- high:     ${b.high.mismatches}/${b.high.runs} (${pct(b.high.rate)})`);
  lines.push(`- medium:   ${b.medium.mismatches}/${b.medium.runs} (${pct(b.medium.rate)})`);
  lines.push(`- low:      ${b.low.mismatches}/${b.low.runs} (${pct(b.low.rate)})`);
  lines.push(`- unknown:  ${b.unknown.mismatches}/${b.unknown.runs} (${pct(b.unknown.rate)})`);

  lines.push(``);
  lines.push(`## Top Offenders（誤認が集中したtruth）`);
  if (!metrics.top_offenders.length) {
    lines.push(`- （該当なし）`);
  } else {
    for (const t of metrics.top_offenders.slice(0, 5)) {
      lines.push(`- ${t.truth} [${t.impact_level}] : ${t.count}件`);
    }
  }

  lines.push(``);
  lines.push(`## Root Cause Top（構造的原因）`);
  if (!metrics.rootcause_top.length) {
    lines.push(`- （該当なし / 0件）`);
  } else {
    for (const c of metrics.rootcause_top) {
      lines.push(`- ${c.type}: ${c.count}`);
    }
  }

  lines.push(``);
  lines.push(`## 今週の推奨アクション（最小）`);
  if (s.mismatch_runs === 0) {
    lines.push(`- ✅ 誤認0：現状維持。次週も同条件で継続監視。`);
  } else {
    lines.push(`- ① Top Offenders の truth を **構造改善（依存/命名/粒度）**`);
    lines.push(`- ② 影響度が high/critical の場合は **Phase 5 ガード強化（対象拡張/閾値調整）**`);
    lines.push(`- ③ 変更PRに ADRリンク（なぜその値/構造か）を追加`);
  }

  return lines.join("\n");
}

function main() {
  const [genPath, rootPath, outPrefixArg] = process.argv.slice(2);
  if (!genPath || !rootPath) {
    console.error("Usage: node scripts/metrics-from-rootcause.cjs <generative-report.json> <rootcause-report.json> <outPrefix>");
    process.exit(1);
  }

  const date = todayTokyoISODate();
  const outPrefix = outPrefixArg || path.join("metrics", date);

  const gen = readJson(genPath);
  const root = safeReadJson(rootPath); // rootcause may not exist if no mismatches

  const g = normalizeGenerativeReport(gen);
  const r = root ? normalizeRootcauseReport(root) : { causesTop: [] };

  const impactMap = loadImpactIndex();

  // Enrich byTruth impact levels
  const enrichedByTruth = g.byTruth.map((row) => {
    const impact = row.impact_level || impactMap.get(row.truth) || null;
    return { ...row, impact_level: impact || "unknown" };
  });

  // By-impact aggregation
  const buckets = ["critical", "high", "medium", "low", "unknown"];
  const byImpact = Object.fromEntries(
    buckets.map((k) => [k, { runs: 0, mismatches: 0, rate: 0 }])
  );

  for (const row of enrichedByTruth) {
    const bucket = impactBucket(row.impact_level);
    byImpact[bucket].runs += row.total || 0;
    byImpact[bucket].mismatches += row.mismatches || 0;
  }
  for (const k of buckets) {
    byImpact[k].rate = rate(byImpact[k].mismatches, byImpact[k].runs);
  }

  // Top offenders: sort by mismatch count desc, then by rate
  const topOffenders = enrichedByTruth
    .filter((x) => (x.mismatches || 0) > 0)
    .map((x) => ({
      truth: x.truth,
      impact_level: impactBucket(x.impact_level),
      count: x.mismatches,
      runs: x.total,
      rate: rate(x.mismatches, x.total),
    }))
    .sort((a, b) => b.count - a.count || b.rate - a.rate)
    .slice(0, 10);

  const summary = {
    total_runs: g.total,
    mismatch_runs: g.mismatchCount,
    mismatch_rate: rate(g.mismatchCount, g.total),
  };

  const metrics = {
    week: date,
    summary,
    by_impact_level: {
      critical: byImpact.critical,
      high: byImpact.high,
      medium: byImpact.medium,
      low: byImpact.low,
      unknown: byImpact.unknown,
    },
    top_offenders: topOffenders.map((t) => ({
      truth: t.truth,
      impact_level: t.impact_level,
      count: t.count,
    })),
    rootcause_top: r.causesTop,
    decision_flags: {}, // computed below
  };
  metrics.decision_flags = decisionFlags(metrics);

  // Trend vs previous metrics
  const metricsDir = path.dirname(outPrefix);
  const baseName = path.basename(outPrefix);
  ensureDir(metricsDir);

  const prev = findPreviousMetrics(metricsDir, baseName);
  const reportMd = formatExecutiveMd({ date, metrics, prevMetrics: prev });

  fs.writeFileSync(`${outPrefix}.json`, JSON.stringify(metrics, null, 2));
  fs.writeFileSync(`${outPrefix}.md`, reportMd);

  console.log(`✅ Wrote: ${outPrefix}.json`);
  console.log(`✅ Wrote: ${outPrefix}.md`);
}

main();

