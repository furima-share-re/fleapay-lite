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

function main() {
  const root = "truth";
  if (!fs.existsSync(root)) {
    console.log(JSON.stringify([]));
    return;
  }
  const files = walk(root)
    .filter(f => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map(f => f.replace(/\\/g, "/"));
  console.log(JSON.stringify(files, null, 2));
}

main();

