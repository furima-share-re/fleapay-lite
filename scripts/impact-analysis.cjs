/**
 * Impact Analysis for truth changes
 * - Detect changed truth files in PR
 * - Read truth/_index.yml
 * - Print impacted files (code/docs/tests)
 * - Output a recommended test regex for CI
 *
 * Requirements:
 *   - truth/_index.yml exists
 *   - YAML structure:
 *       files:
 *         infra/retry.yml:
 *           used_by:
 *             tests: ["tests/retry.test.ts", ...]
 *             code:  ["lib/api-client.ts", ...]
 *             docs:  ["docs/operations.md", ...]
 *           dependencies: ["infra/timeout.yml"]
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const yaml = require("yaml");

function run(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString("utf8").trim();
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function getChangedTruthFiles(baseRef) {
  // Use three-dot diff for PR range
  const diff = run(`git diff --name-only origin/${baseRef}...HEAD`);
  return diff
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)
    .filter(f => f.startsWith("truth/") && (f.endsWith(".yml") || f.endsWith(".yaml")))
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

function collectWithDependencies(index, changed) {
  const files = index.files || {};
  const impacted = new Set(changed);

  // BFS dependencies (downstream via explicit "dependencies" lists)
  // Here "dependencies" means: this file depends on others.
  // If A changed, we want files that depend on A as well (reverse deps).
  // We compute reverse map.
  const reverse = {};
  for (const [f, meta] of Object.entries(files)) {
    const deps = (meta && meta.dependencies) || [];
    for (const d of deps) {
      reverse[d] = reverse[d] || [];
      reverse[d].push(f);
    }
  }

  const queue = [...changed];
  while (queue.length) {
    const cur = queue.shift();
    const next = reverse[cur] || [];
    for (const n of next) {
      if (!impacted.has(n)) {
        impacted.add(n);
        queue.push(n);
      }
    }
  }

  return Array.from(impacted);
}

function main() {
  const baseRef = process.env.BASE_REF;
  if (!baseRef) {
    console.log("BASE_REF not set. Likely not a PR event. Skipping impact analysis.");
    process.exit(0);
  }

  const changedTruth = getChangedTruthFiles(baseRef);
  if (changedTruth.length === 0) {
    console.log("✅ No truth changes detected. Skipping impact analysis.");
    // Output for GitHub Actions
    const out = process.env.GITHUB_OUTPUT;
    if (out) {
      fs.appendFileSync(out, `has_truth_changes=false\n`);
      fs.appendFileSync(out, `test_pattern=\n`);
    }
    // Still succeed
    process.exit(0);
  }

  const index = loadIndex();
  const impactedTruth = collectWithDependencies(index, changedTruth);

  const files = index.files || {};
  const impacted = {
    truth: impactedTruth.map(f => `truth/${f}`),
    tests: [],
    code: [],
    docs: [],
    missingIndexEntries: [],
  };

  for (const tf of impactedTruth) {
    const meta = files[tf];
    if (!meta) {
      impacted.missingIndexEntries.push(tf);
      continue;
    }
    const usedBy = meta.used_by || {};
    impacted.tests.push(...(usedBy.tests || []));
    impacted.code.push(...(usedBy.code || []));
    impacted.docs.push(...(usedBy.docs || []));
  }

  impacted.tests = uniq(impacted.tests);
  impacted.code = uniq(impacted.code);
  impacted.docs = uniq(impacted.docs);

  console.log("🧭 Impact Analysis (truth changes)\n");

  console.log("Changed truth files:");
  changedTruth.forEach(f => console.log(`  - truth/${f}`));
  console.log("");

  console.log("Impacted truth files (including reverse dependencies):");
  impacted.truth.forEach(f => console.log(`  - ${f}`));
  console.log("");

  if (impacted.missingIndexEntries.length) {
    console.log("⚠ Missing _index.yml entries for impacted truth files:");
    impacted.missingIndexEntries.forEach(f => console.log(`  - ${f}`));
    console.log("→ Add them under truth/_index.yml:files to enable accurate impact analysis.\n");
  }

  console.log("Impacted docs:");
  if (impacted.docs.length) impacted.docs.forEach(f => console.log(`  - ${f}`));
  else console.log("  (none)");
  console.log("");

  console.log("Impacted code:");
  if (impacted.code.length) impacted.code.forEach(f => console.log(`  - ${f}`));
  else console.log("  (none)");
  console.log("");

  console.log("Impacted tests:");
  if (impacted.tests.length) impacted.tests.forEach(f => console.log(`  - ${f}`));
  else console.log("  (none)");
  console.log("");

  // Create a testPathPattern regex if possible
  // Vitest/Jest style: --testPathPattern="(a|b|c)"
  let testPattern = "";
  if (impacted.tests.length) {
    const escaped = impacted.tests
      .map(f => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    testPattern = `(${escaped.join("|")})`;
  }

  // Output for GitHub Actions
  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    fs.appendFileSync(out, `has_truth_changes=true\n`);
    fs.appendFileSync(out, `test_pattern=${testPattern}\n`);
  }

  // Also write a markdown summary for PR logs
  const summary = [];
  summary.push("### 🧭 Impact Analysis (truth changes)");
  summary.push("");
  summary.push("**Changed truth:**");
  summary.push(...changedTruth.map(f => `- \`truth/${f}\``));
  summary.push("");
  summary.push("**Impacted truth (incl. reverse deps):**");
  summary.push(...impacted.truth.map(f => `- \`${f}\``));
  summary.push("");
  summary.push("**Impacted tests:**");
  summary.push(impacted.tests.length ? impacted.tests.map(f => `- \`${f}\``).join("\n") : "- (none)");
  summary.push("");
  summary.push("**Impacted docs:**");
  summary.push(impacted.docs.length ? impacted.docs.map(f => `- \`${f}\``).join("\n") : "- (none)");
  summary.push("");
  summary.push("**Impacted code:**");
  summary.push(impacted.code.length ? impacted.code.map(f => `- \`${f}\``).join("\n") : "- (none)");
  summary.push("");
  if (impacted.missingIndexEntries.length) {
    summary.push("**⚠ Missing _index.yml entries:**");
    summary.push(...impacted.missingIndexEntries.map(f => `- \`${f}\``));
    summary.push("");
  }

  const summaryPath = "impact-summary.md";
  fs.writeFileSync(summaryPath, summary.join("\n"), "utf8");
  console.log(`✅ Wrote ${summaryPath}`);

  // Print recommended test command
  if (testPattern) {
    console.log("\nRecommended selective test run:");
    console.log(`npm test -- --testPathPattern="${testPattern}"`);
  } else {
    console.log("\nNo impacted tests listed in _index.yml. Consider adding used_by.tests.");
  }
}

main();

