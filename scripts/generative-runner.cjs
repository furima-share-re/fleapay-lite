/**
 * Generative Truth Consistency Runner (pluggable)
 *
 * Output:
 *  - artifacts/generative-report.json
 *  - artifacts/generative-report.md
 *
 * This runner is designed so that you can later replace `generateFromTruthStub()`
 * with real LLM calls (Cursor/OpenAI/other).
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

function deepEqual(a, b) {
  // strict deep compare via JSON stringify (OK for YAML scalars/objects)
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * ✅ Replace this with a real generator later.
 * For now: returns EXACT truth (0% error) so the pipeline is proven.
 */
async function generateFromTruthStub(truthObject) {
  return truthObject;
}

/**
 * If you later generate "code" or "config text", you need extraction here.
 * For now: we assume generator returns an object directly.
 */
function extractGeneratedObject(generated) {
  return generated;
}

async function main() {
  const sampleJsonPath = process.argv[2] || "generative-sample.json";
  if (!fs.existsSync(sampleJsonPath)) {
    console.error(`❌ sample file not found: ${sampleJsonPath}`);
    process.exit(1);
  }

  const sample = JSON.parse(fs.readFileSync(sampleJsonPath, "utf-8"));
  const selected = sample.selected || [];
  const seedStr = sample.seedStr || "unknown";

  const results = [];
  let mismatchCount = 0;

  for (const truthPath of selected) {
    const truthObj = readTruth(truthPath);
    const generated = await generateFromTruthStub(truthObj);
    const extracted = extractGeneratedObject(generated);

    const ok = deepEqual(truthObj, extracted);
    if (!ok) mismatchCount++;

    results.push({
      truthPath,
      ok,
      // For safety, store only small diffs later. For now we omit.
    });
  }

  const total = results.length;
  const errorRate = total === 0 ? 0 : mismatchCount / total;

  const report = {
    date: new Date().toISOString(),
    seedStr,
    total,
    mismatchCount,
    errorRate,
    results,
  };

  ensureDir("artifacts");
  fs.writeFileSync("artifacts/generative-report.json", JSON.stringify(report, null, 2), "utf-8");

  const md = [];
  md.push(`# Generative Truth Consistency Report`);
  md.push(`- Date: ${report.date}`);
  md.push(`- Seed: ${seedStr}`);
  md.push(`- Total: ${total}`);
  md.push(`- Mismatches: ${mismatchCount}`);
  md.push(`- Error Rate: ${(errorRate * 100).toFixed(2)}%`);
  md.push("");
  md.push("## Results");
  for (const r of results) {
    md.push(`- ${r.ok ? "✅" : "❌"} \`${r.truthPath}\``);
  }
  fs.writeFileSync("artifacts/generative-report.md", md.join("\n"), "utf-8");

  console.log(`✅ Wrote artifacts/generative-report.json and .md`);
  console.log(`Error rate: ${(errorRate * 100).toFixed(2)}%`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

