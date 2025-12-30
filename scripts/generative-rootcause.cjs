/**
 * Generative Root Cause Analysis
 *
 * Reads artifacts/generative-report.json and analyzes error patterns.
 * Outputs:
 *  - artifacts/rootcause-report.json
 *  - artifacts/rootcause-report.md
 */

const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readTruth(truthPath) {
  const raw = fs.readFileSync(truthPath, "utf-8");
  return yaml.parse(raw);
}

function analyzeMismatch(truthObj, generatedObj) {
  // Simple structural analysis
  const issues = [];
  
  // Check for missing keys
  const truthKeys = new Set(Object.keys(truthObj || {}));
  const genKeys = new Set(Object.keys(generatedObj || {}));
  
  for (const k of truthKeys) {
    if (!genKeys.has(k)) {
      issues.push({ type: "missing_key", key: k });
    }
  }
  
  // Check for extra keys
  for (const k of genKeys) {
    if (!truthKeys.has(k)) {
      issues.push({ type: "extra_key", key: k });
    }
  }
  
  // Check for type mismatches
  for (const k of truthKeys) {
    if (genKeys.has(k)) {
      const truthVal = truthObj[k];
      const genVal = generatedObj[k];
      if (typeof truthVal !== typeof genVal) {
        issues.push({ type: "type_mismatch", key: k, truthType: typeof truthVal, genType: typeof genVal });
      }
    }
  }
  
  return issues;
}

function main() {
  const reportPath = "artifacts/generative-report.json";
  if (!fs.existsSync(reportPath)) {
    console.log(`⚠️  generative-report.json not found: ${reportPath}`);
    console.log("This may happen when no truth files were sampled or generative-runner.cjs failed.");
    console.log("Skipping root cause analysis. This is not an error if no mismatches were detected.");
    process.exit(0); // Exit successfully - this is expected when no mismatches
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  const results = report.results || [];
  
  const mismatches = results.filter(r => !r.ok);
  const total = results.length;
  const mismatchCount = mismatches.length;

  // Group by error type
  const errorTypes = {
    missing_key: [],
    extra_key: [],
    type_mismatch: [],
    unknown: [],
  };

  // Analyze each mismatch
  for (const m of mismatches) {
    const truthPath = m.truthPath;
    if (!fs.existsSync(truthPath)) {
      errorTypes.unknown.push({ truthPath, reason: "file_not_found" });
      continue;
    }

    try {
      const truthObj = readTruth(truthPath);
      // For now, we don't have the generated object stored, so we mark as unknown
      // In a real implementation, you'd store the diff in the report
      errorTypes.unknown.push({ truthPath, reason: "no_diff_stored" });
    } catch (e) {
      errorTypes.unknown.push({ truthPath, reason: `parse_error: ${e.message}` });
    }
  }

  // Generate root cause summary
  const rootCauseReport = {
    date: new Date().toISOString(),
    seedStr: report.seedStr || "unknown",
    summary: {
      total,
      mismatchCount,
      errorRate: report.errorRate || 0,
    },
    errorTypes: {
      missing_key: errorTypes.missing_key.length,
      extra_key: errorTypes.extra_key.length,
      type_mismatch: errorTypes.type_mismatch.length,
      unknown: errorTypes.unknown.length,
    },
    details: {
      missing_key: errorTypes.missing_key,
      extra_key: errorTypes.extra_key,
      type_mismatch: errorTypes.type_mismatch,
      unknown: errorTypes.unknown,
    },
    recommendations: [],
  };

  // Generate recommendations
  if (errorTypes.missing_key.length > 0) {
    rootCauseReport.recommendations.push({
      type: "missing_key",
      severity: "high",
      message: "Generated output is missing required keys. Check prompt completeness.",
    });
  }

  if (errorTypes.extra_key.length > 0) {
    rootCauseReport.recommendations.push({
      type: "extra_key",
      severity: "medium",
      message: "Generated output includes unexpected keys. Check prompt specificity.",
    });
  }

  if (errorTypes.type_mismatch.length > 0) {
    rootCauseReport.recommendations.push({
      type: "type_mismatch",
      severity: "high",
      message: "Type mismatches detected. Check output format specification.",
    });
  }

  if (mismatchCount === 0) {
    rootCauseReport.recommendations.push({
      type: "success",
      severity: "info",
      message: "No mismatches detected. Current generator is accurate.",
    });
  }

  // Write JSON report
  ensureDir("artifacts");
  fs.writeFileSync(
    "artifacts/rootcause-report.json",
    JSON.stringify(rootCauseReport, null, 2),
    "utf-8"
  );

  // Write Markdown report
  const md = [];
  md.push(`# Generative Root Cause Analysis`);
  md.push(``);
  md.push(`- Date: ${rootCauseReport.date}`);
  md.push(`- Seed: ${rootCauseReport.seedStr}`);
  md.push(`- Total: ${total}`);
  md.push(`- Mismatches: ${mismatchCount}`);
  md.push(`- Error Rate: ${(rootCauseReport.summary.errorRate * 100).toFixed(2)}%`);
  md.push(``);
  md.push(`## Error Type Summary`);
  md.push(``);
  md.push(`| Type | Count |`);
  md.push(`|------|-------|`);
  md.push(`| Missing Key | ${rootCauseReport.errorTypes.missing_key} |`);
  md.push(`| Extra Key | ${rootCauseReport.errorTypes.extra_key} |`);
  md.push(`| Type Mismatch | ${rootCauseReport.errorTypes.type_mismatch} |`);
  md.push(`| Unknown | ${rootCauseReport.errorTypes.unknown} |`);
  md.push(``);
  md.push(`## Recommendations`);
  md.push(``);
  for (const rec of rootCauseReport.recommendations) {
    md.push(`- **${rec.type}** (${rec.severity}): ${rec.message}`);
  }
  md.push(``);
  md.push(`## Details`);
  md.push(``);
  if (mismatchCount > 0) {
    md.push(`### Mismatched Files`);
    for (const m of mismatches) {
      md.push(`- \`${m.truthPath}\``);
    }
  } else {
    md.push(`✅ No mismatches detected.`);
  }

  fs.writeFileSync("artifacts/rootcause-report.md", md.join("\n"), "utf-8");

  console.log(`✅ Wrote artifacts/rootcause-report.json and .md`);
  console.log(`Error rate: ${(rootCauseReport.summary.errorRate * 100).toFixed(2)}%`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

