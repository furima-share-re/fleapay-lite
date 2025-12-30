/**
 * Generative Metrics Generator
 *
 * Reads artifacts/generative-report.json and truth/_index.yml
 * Generates metrics/metrics-YYYY-MM-DD.json for trend analysis
 */

const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function loadIndex() {
  const indexPath = path.join("truth", "_index.yml");
  if (!fs.existsSync(indexPath)) {
    return { files: {} };
  }
  const content = fs.readFileSync(indexPath, "utf8");
  const obj = yaml.parse(content);
  return obj || { files: {} };
}

function main() {
  const reportPath = "artifacts/generative-report.json";
  if (!fs.existsSync(reportPath)) {
    console.log("⚠️  generative-report.json not found. Skipping metrics generation.");
    process.exit(0);
  }

  let report;
  try {
    const content = fs.readFileSync(reportPath, "utf-8");
    report = JSON.parse(content);
  } catch (e) {
    console.error(`❌ Failed to parse ${reportPath}: ${e.message}`);
    process.exit(0); // Don't fail workflow
  }

  // Skip if this is an error report
  if (report.error) {
    console.log("⚠️  Error report detected. Skipping metrics generation.");
    process.exit(0);
  }

  const index = loadIndex();
  const files = index.files || {};
  const results = report.results || [];
  const total = results.length;
  const mismatchCount = report.mismatchCount || 0;
  const mismatchRate = total === 0 ? 0 : mismatchCount / total;

  // Group by impact_level
  const byImpact = {
    critical: { total: 0, mismatches: 0 },
    high: { total: 0, mismatches: 0 },
    medium: { total: 0, mismatches: 0 },
    low: { total: 0, mismatches: 0 },
    unknown: { total: 0, mismatches: 0 },
  };

  // Track top offenders
  const offenders = [];

  for (const r of results) {
    const truthPath = r.truthPath;
    const relativePath = truthPath.replace(/^truth\//, "");
    const meta = files[relativePath];
    const impact = (meta?.impact_level || "unknown").toLowerCase();

    if (impact in byImpact) {
      byImpact[impact].total++;
      if (!r.ok) {
        byImpact[impact].mismatches++;
      }
    } else {
      byImpact.unknown.total++;
      if (!r.ok) {
        byImpact.unknown.mismatches++;
      }
    }

    if (!r.ok) {
      offenders.push({
        path: truthPath,
        impact: impact,
      });
    }
  }

  // Calculate rates by impact
  const byImpactRates = {};
  for (const [level, data] of Object.entries(byImpact)) {
    byImpactRates[level] = data.total === 0 ? 0 : data.mismatches / data.total;
  }

  // Get top 5 offenders
  const topOffenders = offenders
    .slice(0, 5)
    .map(o => o.path);

  // Generate date string (YYYY-MM-DD)
  const dateStr = report.date ? report.date.slice(0, 10) : new Date().toISOString().slice(0, 10);

  const metrics = {
    week: dateStr,
    seed: report.seedStr || "unknown",
    total_runs: total,
    mismatch_count: mismatchCount,
    mismatch_rate: mismatchRate,
    by_impact: byImpactRates,
    by_impact_counts: Object.fromEntries(
      Object.entries(byImpact).map(([k, v]) => [k, { total: v.total, mismatches: v.mismatches }])
    ),
    top_offenders: topOffenders,
    generated_at: new Date().toISOString(),
  };

  ensureDir("metrics");
  const metricsPath = path.join("metrics", `metrics-${dateStr}.json`);
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2), "utf-8");

  console.log(`✅ Generated ${metricsPath}`);
  console.log(`Mismatch rate: ${(mismatchRate * 100).toFixed(2)}%`);
  console.log(`Top offenders: ${topOffenders.length > 0 ? topOffenders.join(", ") : "none"}`);
}

main().catch((e) => {
  console.error("❌ Error generating metrics:", e.message);
  process.exit(0); // Don't fail workflow
});

