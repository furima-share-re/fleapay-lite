/**
 * Generative Guard: Select Critical Truth Files
 *
 * For PR changes, extracts only truth files with impact_level: "critical" or "high"
 * that were changed in the PR.
 *
 * Output: JSON array of truth file paths (relative to truth/)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const yaml = require("yaml");

function run(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString("utf8").trim();
}

function getChangedTruthFiles(baseRef) {
  // Use three-dot diff for PR range
  const diff = run(`git diff --name-only origin/${baseRef}...HEAD`);
  return diff
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)
    .filter(f => f.startsWith("truth/") && (f.endsWith(".yml") || f.endsWith(".yaml")))
    .filter(f => !f.endsWith("truth/_index.yml") && !f.endsWith("truth/_index.yaml"))
    .map(f => f.replace(/^truth\//, "")); // store as relative under truth/
}

function loadIndex() {
  const indexPath = path.join("truth", "_index.yml");
  if (!fs.existsSync(indexPath)) {
    console.error("❌ truth/_index.yml not found.");
    process.exit(1);
  }
  const content = fs.readFileSync(indexPath, "utf8");
  const obj = yaml.parse(content);
  if (!obj || !obj.files) {
    console.error("❌ truth/_index.yml must have top-level `files:` mapping.");
    process.exit(1);
  }
  return obj;
}

function main() {
  const baseRef = process.env.BASE_REF || process.env.GITHUB_BASE_REF;
  if (!baseRef) {
    // Not a PR event, return empty
    console.log(JSON.stringify([]));
    process.exit(0);
  }

  // Fetch base ref
  try {
    run(`git fetch origin ${baseRef}:${baseRef} --quiet`);
  } catch (e) {
    console.error(`Failed to fetch ${baseRef}: ${e.message}`);
    process.exit(1);
  }

  const changedTruth = getChangedTruthFiles(baseRef);
  if (changedTruth.length === 0) {
    console.log(JSON.stringify([]));
    process.exit(0);
  }

  const index = loadIndex();
  const files = index.files || {};

  // Filter: only critical or high impact_level
  // Note: "critical" is future-proof, "high" is current highest level
  const critical = changedTruth.filter(tf => {
    const meta = files[tf];
    if (!meta) return false; // Not in index, skip (should be caught by deterministic test)
    const impact = (meta.impact_level || "").toLowerCase();
    return impact === "critical" || impact === "high";
  });

  // Output as JSON array of paths (relative to truth/)
  console.log(JSON.stringify(critical, null, 2));

  // Also output to GitHub Actions output if available
  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    fs.appendFileSync(out, `critical_truth_changed=${critical.length > 0 ? "true" : "false"}\n`);
    fs.appendFileSync(out, `critical_truth_files=${JSON.stringify(critical)}\n`);
  }

  if (critical.length > 0) {
    console.error(`\n⚠️  ${critical.length} critical/high impact truth file(s) changed:`);
    critical.forEach(f => console.error(`  - truth/${f}`));
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}

