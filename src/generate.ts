import { entries, type Entry } from "./data";

const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const GAP = "…";
const RANK: Record<string, number> = { clean: 0, mild: 1, vulgar: 2 };
const maxLevel = (a: string, b: string) => ((RANK[a] ?? 0) >= (RANK[b] ?? 0) ? a : b);

const attestedEntries = entries.filter((e) => e.attested);
const existing = new Set(entries.map((e) => normalizeText(e.text)));

/**
 * The verb = the text before the affliction, only if it is a single word with an accusative clitic: "-te-ar", "-l-ar",
 * "-o-ar" ("Mânca-te-ar gherla"). That way the affliction is what does the harm. A dative clitic ("Seca-ți-ar izvoarele")
 * makes the affliction belong to the victim and the combinations come out nonsensical; "Fi-r-ai" has no real affliction.
 */
export function extractVerb(e: Entry): string | null {
  const affliction = e.affliction!.toLowerCase();
  const idx = e.text.toLowerCase().indexOf(affliction);
  if (idx <= 0) return null;
  const verb = e.text
    .slice(0, idx)
    .trim()
    .replace(/[.,;:!?"'…„”’]+$/u, "");
  if (!verb || /\s/.test(verb)) return null;
  return /-(te|l|o)-ar$/i.test(verb) ? verb : null;
}

type Piece = { text: string; entry: string; level: string; themes: string[]; sensitive: boolean };
type Family = { patterns: Piece[]; fillers: Piece[]; compose: (pattern: string, filler: string) => string };

// ---------- A: optative curse "Verb-te-ar affliction" ----------
const optativeEntries = attestedEntries.filter((e) => e.form === "optative" && e.affliction);
const verbsA: Piece[] = [];
const afflictionsA: Piece[] = [];
for (const e of optativeEntries) {
  const v = extractVerb(e);
  if (!v) continue;
  const verb = (v[0].toUpperCase() + v.slice(1)).replace(/-(l|o)-ar$/i, "-te-ar");
  verbsA.push({ text: `${verb} ${GAP}`, entry: e.id, level: e.level, themes: e.themes, sensitive: e.sensitive });
  afflictionsA.push({ text: e.affliction!, entry: e.id, level: e.level, themes: e.themes, sensitive: e.sensitive });
}

// ---------- B: the "mă-tii" swear ----------
const WORD = String.raw`[\p{L}'’-]+`;
const objectRegexes: [string, RegExp][] = [
  ["Futu-ți", new RegExp(`^Futu-ți (${WORD}) mă-tii$`, "u")],
  ["Tu-ți", new RegExp(`^'?Tu-ți (${WORD}) mă-tii$`, "u")],
  ["", new RegExp(`^(${WORD}) mă-tii$`, "u")],
];
// "Ce umbli cu cazmaua…" is a comparison, not a swear: it does not become a pattern.
const prefixRegex = new RegExp(String.raw`^(?!Ce )(.+\s(?:din|pe|la|în|de la|de pe)) (${WORD}) mă-tii$`, "u");

const cleanText = (t: string) => t.trim().replace(/!+$/, "").replace(/^Ah, /, "");
// "Ceapa mă-tii" -> "ceapa"; "America" keeps its capital letter.
const extractObject = (raw: string, atStart: boolean) => {
  const x = /^'.+'$/.test(raw) ? raw.slice(1, -1) : raw; // "'niezău'" -> "niezău"
  return atStart && /^\p{Lu}\p{Ll}/u.test(x) ? x[0].toLowerCase() + x.slice(1) : x;
};

const patternsB = new Map<string, Piece[]>();
const objectsB: Piece[] = [];
for (const e of attestedEntries) {
  const t = cleanText(e.text);
  const meta = { entry: e.id, level: e.level, themes: e.themes, sensitive: e.sensitive };
  for (const [prefix, re] of objectRegexes) {
    const m = re.exec(t);
    if (!m) continue;
    objectsB.push({ text: extractObject(m[1], t.startsWith(m[1])), ...meta });
    if (prefix) patternsB.set(`${prefix} ${GAP} mă-tii`, [...(patternsB.get(`${prefix} ${GAP} mă-tii`) ?? []), { text: `${prefix} ${GAP} mă-tii`, ...meta }]);
    break;
  }
  const p = prefixRegex.exec(t);
  if (p && p[1].split(/\s+/).length >= 2) {
    objectsB.push({ text: p[2], ...meta });
    const tp = `${p[1]} ${GAP} mă-tii`;
    patternsB.set(tp, [...(patternsB.get(tp) ?? []), { text: tp, ...meta }]);
  }
}

const families: Family[] = [
  { patterns: verbsA, fillers: afflictionsA, compose: (t, c) => t.replace(GAP, c) },
  { patterns: [...patternsB.values()].flat(), fillers: objectsB, compose: (t, c) => t.replace(GAP, c) },
];

const pick = <T>(l: T[]): T => l[Math.floor(Math.random() * l.length)];

/** Keeps the first piece for each text (after normalization). */
function dedupe(l: Piece[]): Piece[] {
  const seen = new Set<string>();
  return l.filter((p) => {
    const n = normalizeText(p.text);
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

export function generate(level: string[] | "all", theme?: string[], sensitive = true) {
  const allowed = (p: Piece) => (sensitive || !p.sensitive) && (level === "all" || level.includes(p.level));
  const order = Math.random() < 0.5 ? [0, 1] : [1, 0];
  for (const idx of order) {
    const f = families[idx];
    const r = compose(
      dedupe(f.patterns.filter(allowed)),
      dedupe(f.fillers.filter(allowed).filter((p) => !theme || p.themes.some((t) => theme.includes(t)))),
      f.compose,
    );
    if (r) return r;
  }
  return null;
}

function compose(patterns: Piece[], fillers: Piece[], write: Family["compose"]) {
  if (!patterns.length || !fillers.length) return null;
  // Only texts that do not already exist in the data, picked uniformly. First rejection sampling (existing
  // texts are rare, so it almost always succeeds); if not, we enumerate the remaining pairs exactly.
  const text = (i: number, j: number) => write(patterns[i].text, fillers[j].text);
  const isFree = (i: number, j: number) => !existing.has(normalizeText(text(i, j)));
  let i = 0;
  let j = 0;
  let found = false;
  for (let attempts = 0; attempts < 50 && !found; attempts++) {
    i = Math.floor(Math.random() * patterns.length);
    j = Math.floor(Math.random() * fillers.length);
    found = isFree(i, j);
  }
  if (!found) {
    const pairs: [number, number][] = [];
    for (let a = 0; a < patterns.length; a++) for (let b = 0; b < fillers.length; b++) if (isFree(a, b)) pairs.push([a, b]);
    if (!pairs.length) return null;
    [i, j] = pick(pairs);
  }
  const t = patterns[i];
  const c = fillers[j];
  return {
    text: text(i, j),
    generated: true as const,
    attested: false as const,
    level: maxLevel(t.level, c.level),
    warning: "A curse composed automatically from attested pieces. As a whole, it appears in no source.",
    pieces: {
      pattern: { text: t.text, entry: t.entry },
      fill: { text: c.text, entry: c.entry },
    },
  };
}
