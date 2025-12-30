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
  try {
    if (!fs.existsSync(truthPath)) {
      throw new Error(`File not found: ${truthPath}`);
    }
    const raw = fs.readFileSync(truthPath, "utf-8");
    return yaml.parse(raw);
  } catch (e) {
    throw new Error(`Failed to read/parse ${truthPath}: ${e.message}`);
  }
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
    console.error("This may happen if generative-sample.cjs failed to generate the sample.");
    process.exit(1);
  }

  let sample;
  try {
    const content = fs.readFileSync(sampleJsonPath, "utf-8");
    sample = JSON.parse(content);
  } catch (e) {
    console.error(`❌ Failed to parse ${sampleJsonPath}: ${e.message}`);
    process.exit(1);
  }

  const selected = sample.selected || [];
  const seedStr = sample.seedStr || "unknown";

  const results = [];
  let mismatchCount = 0;

  if (selected.length === 0) {
    console.log("⚠️  No truth files selected. This may happen if truth/ directory is empty or all files are filtered out.");
  }

  for (const truthPath of selected) {
    try {
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
    } catch (e) {
      console.error(`❌ Error processing ${truthPath}: ${e.message}`);
      results.push({
        truthPath,
        ok: false,
        error: e.message,
      });
      mismatchCount++;
    }
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
  
  // Always exit successfully - even with errors, we've generated a report
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Fatal error in generative-runner:");
  console.error(e);
  console.error(e.stack);
  // Try to create a minimal error report
  try {
    ensureDir("artifacts");
    const errorReport = {
      date: new Date().toISOString(),
      error: true,
      message: e.message,
      stack: e.stack,
    };
    fs.writeFileSync("artifacts/generative-report.json", JSON.stringify(errorReport, null, 2), "utf-8");
    console.log("✅ Created error report in artifacts/generative-report.json");
  } catch (reportError) {
    console.error("❌ Failed to create error report:", reportError.message);
  }
  process.exit(1);
});

