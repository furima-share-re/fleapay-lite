const fs = require("fs");
const path = require("path");

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  // simple stable seed
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function main() {
  const limit = parseInt(process.argv[2] || "10", 10); // default 10 truth files / week
  const seedStr = process.argv[3] || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const seed = hashSeed(seedStr);
  const rand = mulberry32(seed);

  const truthRoot = "truth";
  if (!fs.existsSync(truthRoot)) {
    console.log(JSON.stringify({ seedStr, selected: [] }, null, 2));
    return;
  }

  const all = walk(truthRoot)
    .filter(f => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map(f => f.replace(/\\/g, "/"))
    .filter(f => !f.endsWith("truth/_index.yml") && !f.endsWith("truth/_index.yaml"));

  // shuffle with seeded rng
  const shuffled = all.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected = shuffled.slice(0, Math.min(limit, shuffled.length));
  console.log(JSON.stringify({ seedStr, limit, total: all.length, selected }, null, 2));
}

main();

