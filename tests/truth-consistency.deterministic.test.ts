import fs from "fs";
import path from "path";
import yaml from "yaml";
import { describe, it, expect } from "vitest"; // Jestの場合はこの行だけ置換可

type IndexEntry = {
  purpose?: string;
  used_by?: { code?: string[]; docs?: string[]; tests?: string[] };
  dependencies?: string[];
  impact_level?: string;
  adr?: string | null;
};

type TruthIndex = {
  meta?: Record<string, unknown>;
  files?: Record<string, IndexEntry>;
};

function readYaml(filePath: string) {
  const text = fs.readFileSync(filePath, "utf-8");
  return yaml.parse(text);
}

function listTruthFiles(): string[] {
  // scripts/truth-scan.js と同じロジックをTSで（CI簡素化）
  const root = "truth";
  const out: string[] = [];
  function walk(dir: string) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (p.endsWith(".yml") || p.endsWith(".yaml")) out.push(p.replace(/\\/g, "/"));
    }
  }
  if (fs.existsSync(root)) walk(root);
  return out;
}

describe("Truth Consistency Test (Deterministic)", () => {
  it("truth/_index.yml must exist and have top-level `files:`", () => {
    const idxPath = "truth/_index.yml";
    expect(fs.existsSync(idxPath)).toBe(true);

    const idx = readYaml(idxPath) as TruthIndex;
    expect(idx).toBeTruthy();
    expect(idx.files).toBeTruthy();
  });

  it("every truth YAML file (except _index) must be registered in truth/_index.yml:files", () => {
    const idx = readYaml("truth/_index.yml") as TruthIndex;
    const registered = new Set(Object.keys(idx.files || {}));

    const truthFiles = listTruthFiles()
      .filter(f => !f.endsWith("truth/_index.yml") && !f.endsWith("truth/_index.yaml"))
      .map(f => f.replace(/^truth\//, "")); // index uses paths under truth/

    const missing = truthFiles.filter(f => !registered.has(f));
    expect(missing, `Missing index entries:\n${missing.map(m => `- ${m}`).join("\n")}`).toEqual([]);
  });

  it("index entries must not contain absolute paths and must look sane", () => {
    const idx = readYaml("truth/_index.yml") as TruthIndex;
    const bad: string[] = [];

    for (const [k, v] of Object.entries(idx.files || {})) {
      if (k.startsWith("/") || k.includes(":\\") || k.includes("..")) bad.push(`bad key path: ${k}`);
      const used = v.used_by || {};
      const all = [...(used.code || []), ...(used.docs || []), ...(used.tests || [])];

      for (const p of all) {
        if (p.startsWith("/") || p.includes(":\\") || p.includes("..")) bad.push(`bad used_by path for ${k}: ${p}`);
      }
    }

    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("dependencies must reference existing truth files", () => {
    const idx = readYaml("truth/_index.yml") as TruthIndex;
    const files = idx.files || {};
    const truthSet = new Set(Object.keys(files));

    const errs: string[] = [];
    for (const [k, v] of Object.entries(files)) {
      for (const dep of v.dependencies || []) {
        if (!truthSet.has(dep)) {
          errs.push(`${k} depends on missing truth entry: ${dep}`);
        }
      }
    }
    expect(errs, errs.join("\n")).toEqual([]);
  });

  it("OpenAPI (spec/openapi.yml) must be valid YAML when present", () => {
    const yml = "spec/openapi.yml";
    const yaml2 = "spec/openapi.yaml";
    if (fs.existsSync(yml)) expect(() => readYaml(yml)).not.toThrow();
    else if (fs.existsSync(yaml2)) expect(() => readYaml(yaml2)).not.toThrow();
    else expect(true).toBe(true);
  });
});

