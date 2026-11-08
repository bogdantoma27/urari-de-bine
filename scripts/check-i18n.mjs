// Checks that the Romanian text in the HTML (for people without JavaScript) is identical to the `ro` value in public/i18n.js.
// Covers data-i18n, data-i18n-html, data-i18n-attr, <title>, meta description, Open Graph and Twitter.
import { readFileSync } from "node:fs";
import { DICT } from "../public/i18n.js";

// HTML file -> prefix of its meta keys in the dictionary (`<prefix>.meta.*`).
const PAGES = { "index.html": "home", "all.html": "all", "404.html": "404" };

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

const escapeRegex = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The `ro` value as a regex: {year} = any 4-digit year, {x} = var.x from the dictionary. */
function matches(key, html) {
  const source = DICT[key]?.ro;
  if (source === undefined) return { ok: false, expected: `(missing key: ${key})` };
  const chunks = source.split(/(\{\w+\})/);
  const resolved = chunks.map((c) => (/^\{\w+\}$/.test(c) && c !== "{year}" ? (DICT[`var.${c.slice(1, -1)}`]?.ro ?? "") : c));
  const re = new RegExp("^" + resolved.map((c) => (c === "{year}" ? "\\d{4}" : escapeRegex(c))).join("") + "$");
  return { ok: re.test(html), expected: resolved.join("") };
}

const errors = [];
let checked = 0;
const check = (file, label, key, found) => {
  checked++;
  const { ok, expected } = matches(key, found);
  if (!ok) errors.push(`${file}: ${label} (${key})\n    in HTML: ${JSON.stringify(found)}\n    in i18n: ${JSON.stringify(expected)}`);
};

// Meta keys of a page: the one among `<page>.meta.*` whose ro value matches the HTML; if none does, report the first.
const checkMeta = (file, label, prefix, found) => {
  const candidates = Object.keys(DICT).filter((k) => k.startsWith(`${prefix}.meta.`));
  const hit = candidates.find((k) => matches(k, found).ok);
  if (hit) {
    checked++;
    return;
  }
  check(file, label, candidates[0] ?? `${prefix}.meta.*`, found);
};

for (const [file, prefix] of Object.entries(PAGES)) {
  const h = readFileSync(new URL(`../public/${file}`, import.meta.url), "utf8");

  for (const m of h.matchAll(/<(\w+)([^>]*?\sdata-i18n(-html)?="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g)) {
    const [, tag, , html, key, inner] = m;
    check(file, `<${tag}> data-i18n${html ? "-html" : ""}`, key, html ? inner : decode(inner));
  }

  for (const m of h.matchAll(/<(\w+)([^>]*?\sdata-i18n-attr="([^"]+)"[^>]*)>/g)) {
    for (const pair of m[3].split(";")) {
      const [attr, key] = pair.split(":").map((x) => x.trim());
      const v = m[2].match(new RegExp(`\\s${attr}="([^"]*)"`));
      check(file, `<${m[1]}> ${attr}`, key, v ? decode(v[1]) : "(missing)");
    }
  }

  const title = h.match(/<title>([^<]*)<\/title>/)?.[1];
  checkMeta(file, "<title>", prefix, title === undefined ? "(missing)" : decode(title));
  const meta = (sel) => {
    const m = h.match(new RegExp(`<meta ${sel}\\s+content="([^"]*)">`));
    return m ? decode(m[1]) : "(missing)";
  };
  for (const sel of [
    'name="description"',
    'property="og:description"',
    'name="twitter:description"',
    'property="og:title"',
    'name="twitter:title"',
  ]) {
    checkMeta(file, sel, prefix, meta(sel));
  }
  for (const [sel, val] of [
    ['property="og:type"', "website"],
    ['property="og:locale"', "ro_RO"],
    ['property="og:locale:alternate"', "en_US"],
    ['name="twitter:card"', "summary_large_image"],
  ]) {
    checked++;
    if (meta(sel) !== val) errors.push(`${file}: <meta ${sel}> should be ${val}, is ${meta(sel)}`);
  }
}

if (errors.length) {
  console.error(`check-i18n: ${errors.length} mismatches out of ${checked} checks\n\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`check-i18n: ${checked} checks, HTML and i18n.js are in sync.`);
