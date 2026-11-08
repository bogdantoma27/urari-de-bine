// Validates every file in data/entries against schema/entry.schema.json,
// plus rules the schema cannot express. Exits with code 1 on any error.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const dir = join(root, "data", "entries");
const schema = JSON.parse(readFileSync(join(root, "schema", "entry.schema.json"), "utf8"));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

const errors = [];
const ids = new Set();
const texts = new Map();
const normalize = (t) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

for (const f of files) {
  let e;
  try {
    e = JSON.parse(readFileSync(join(dir, f), "utf8"));
  } catch (err) {
    errors.push(`${f}: invalid JSON (${err.message})`);
    continue;
  }
  if (!validate(e)) {
    for (const error of validate.errors) errors.push(`${f}: ${error.instancePath || "/"} ${error.message}`);
    continue;
  }
  if (`${e.id}.json` !== f) errors.push(`${f}: id "${e.id}" does not match the file name`);
  if (ids.has(e.id)) errors.push(`${f}: duplicate id`);
  ids.add(e.id);
  const key = normalize(e.text);
  if (texts.has(key)) errors.push(`${f}: text identical (normalized) to ${texts.get(key)}.json`);
  else texts.set(key, e.id);
  for (const s of e.sources)
    if (s.url != null && !/^https?:\/\//.test(s.url)) errors.push(`${f}: invalid source url "${s.url}" (http/https only)`);
  if (e.attested !== (e.verification !== "unverified")) errors.push(`${f}: attested and verification do not match`);
  if (e.attested && !e.sources.some((s) => s.verification !== "unverified"))
    errors.push(`${f}: attested, but no source is verified or transcribed`);
  if (e.funny && !(e.attested && !e.sensitive)) errors.push(`${f}: funny requires attested true and sensitive false`);
  if (e.text.trim() !== e.text || e.text.endsWith(".")) errors.push(`${f}: text has surrounding spaces or a trailing period`);
}

// redirects: old id -> an id that exists, and the old id must not be an entry again
const redirects = JSON.parse(readFileSync(join(root, "data", "redirects.json"), "utf8"));
for (const [from, to] of Object.entries(redirects)) {
  if (ids.has(from)) errors.push(`redirects.json: "${from}" is still an entry`);
  if (!ids.has(to)) errors.push(`redirects.json: "${from}" points to "${to}", which does not exist`);
}

if (errors.length) {
  console.error(`${errors.length} errors in ${files.length} files:`);
  for (const error of errors.slice(0, 200)) console.error("  " + error);
  process.exit(1);
}
console.log(`OK: ${files.length} valid entries.`);
