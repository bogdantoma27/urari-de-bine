// Bundles data/entries/*.json into a single module: src/generated/data.json (array sorted by id).
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dir = join(root, "data", "entries");
const entries = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const outDir = join(root, "src", "generated");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "data.json"), JSON.stringify(entries));
console.log(`data.json: ${entries.length} entries`);
