import raw from "./generated/data.json";

export interface Source {
  title: string;
  url?: string | null;
  author?: string | null;
  year?: number | string | null;
  [k: string]: unknown;
}

export interface Entry {
  id: string;
  text: string;
  original_text: string;
  type: string;
  form: string;
  affliction: string | null;
  themes: string[];
  regions: string[];
  level: string;
  period: string | null;
  attested: boolean;
  verification: string;
  sensitive: boolean;
  funny: boolean;
  sources: Source[];
  explanation: string | null;
  translation: string | null;
  notes: string | null;
}

export class HttpError extends Error {
  constructor(
    public status: 400 | 404 | 429,
    message: string,
  ) {
    super(message);
  }
}

export const entries = raw as unknown as Entry[];
export const byId = new Map(entries.map((e) => [e.id, e]));

export const TYPES = ["curse", "swear", "insult", "euphemism", "expression"];
export const LEVELS = ["clean", "mild", "vulgar"];
export const FORMS = ["optative", "subjunctive", "imperative", "nominal", "single_word", "other"];

export const THEMES: Record<string, { label: string; description: string }> = {
  church: { label: "Biserică", description: "Biserica, sfinții, preoții, rugăciunile și sărbătorile." },
  devil_hell: { label: "Drac și iad", description: "Dracul, necuratul, iadul și cine mai stă pe-acolo." },
  sickness_death: { label: "Boală și moarte", description: "Boli, suferință, moarte, mormânt." },
  farm_animals: { label: "Gospodărie și animale", description: "Vite, ogor, casă și recoltă, adică viața la țară." },
  prison: { label: "Pușcărie", description: "Închisoarea, gherla, ocna și osânda." },
  birds_of_prey: { label: "Păsări de pradă", description: "Corbi, vulturi, ulii și alte păsări de pradă." },
  nature_elements: { label: "Natură și stihii", description: "Foc, apă, fulger, vânt, grindină și alte forțe ale naturii." },
  family: { label: "Familie", description: "Mama, tata, rudele și tot neamul." },
  body: { label: "Corp", description: "Părțile corpului și ce fac ele." },
  sexual: { label: "Sexual", description: "Tot ce ține de sex." },
  places: { label: "Localități", description: "Locuri, sate, orașe și regiuni." },
  modern: { label: "Modern", description: "Lumea de azi, cu tehnică, instituții și lucruri pe care bunica nu le avea." },
  poverty: { label: "Sărăcie", description: "Lipsuri, mizerie, pierderea averii." },
  other: { label: "Altele", description: "Ce n-a încăput în celelalte teme." },
};

export const REGIONS: Record<string, { label: string; description: string }> = {
  general: { label: "General", description: "Se zice peste tot pe unde se vorbește românește." },
  moldavia: { label: "Moldova", description: "Regiunea istorică Moldova (România)." },
  bukovina: { label: "Bucovina", description: "Regiunea istorică Bucovina." },
  maramures: { label: "Maramureș", description: "Regiunea istorică Maramureș." },
  transylvania: { label: "Transilvania", description: "Regiunea istorică Transilvania." },
  crisana: { label: "Crișana", description: "Regiunea istorică Crișana." },
  banat: { label: "Banat", description: "Regiunea istorică Banat." },
  oltenia: { label: "Oltenia", description: "Regiunea istorică Oltenia." },
  wallachia: { label: "Muntenia", description: "Regiunea istorică Muntenia." },
  dobruja: { label: "Dobrogea", description: "Regiunea istorică Dobrogea." },
  republic_of_moldova: { label: "Republica Moldova", description: "Atestat în Republica Moldova." },
  serbia: { label: "Serbia", description: "Atestat la românii din Serbia." },
  ukraine: { label: "Ucraina", description: "Atestat la românii din Ucraina." },
  hungary: { label: "Ungaria", description: "Atestat la românii din Ungaria." },
  aromanian: { label: "Aromână", description: "Atestat în aromână (macedoromână)." },
  megleno_romanian: { label: "Meglenoromână", description: "Atestat în meglenoromână." },
  istro_romanian: { label: "Istroromână", description: "Atestat în istroromână." },
};

/** Search normalization: lowercase, no diacritics; î and â become a. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[âî]/g, "a")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
/** Variant: î becomes i (how someone without diacritics would type "injura"). */
function normalizeSimple(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const searchText = new Map<string, [string, string]>();
for (const e of entries) {
  const t = [e.text, e.original_text, e.explanation, e.translation].filter(Boolean).join("\n");
  searchText.set(e.id, [normalize(t), normalizeSimple(t)]);
}

export interface Filters {
  type?: string[];
  theme?: string[];
  region?: string[];
  level: string[] | "all";
  attested: "true" | "false" | "all";
  form?: string[];
  q?: string;
  sensitive: boolean;
  funny?: boolean;
}

type Param = string | undefined;
// A list with no values ("," or " ") means "no filter", not "nothing matches".
const toList = (v: Param) => {
  if (v === undefined || v === "") return undefined;
  const l = v.split(",").map((x) => x.trim()).filter(Boolean);
  return l.length ? l : undefined;
};

function validateList(name: string, v: Param, allowed: string[]): string[] | undefined {
  const l = toList(v);
  if (!l) return undefined;
  const invalid = l.filter((x) => !allowed.includes(x));
  if (invalid.length) {
    throw new HttpError(400, `"${name}" does not accept ${invalid.join(", ")}. Allowed: ${allowed.join(", ")}.`);
  }
  return l;
}

export function parseFilters(p: Record<string, Param>): Filters {
  const level: Filters["level"] =
    p.level?.trim() === "all" ? "all" : (validateList("level", p.level, LEVELS) ?? "all");
  const attested = p.attested === undefined || p.attested === "" ? "true" : p.attested;
  if (!["true", "false", "all"].includes(attested)) {
    throw new HttpError(400, '"attested" must be true, false or all.');
  }
  const sensitiveParam = p.sensitive === undefined || p.sensitive === "" ? "true" : p.sensitive;
  if (!["true", "false"].includes(sensitiveParam)) {
    throw new HttpError(400, '"sensitive" must be true or false.');
  }
  if (p.funny !== undefined && p.funny !== "" && !["true", "false"].includes(p.funny)) {
    throw new HttpError(400, '"funny" must be true or false.');
  }
  return {
    type: validateList("type", p.type, TYPES),
    theme: validateList("theme", p.theme, Object.keys(THEMES)),
    region: validateList("region", p.region, Object.keys(REGIONS)),
    level,
    attested: attested as Filters["attested"],
    form: validateList("form", p.form, FORMS),
    q: p.q && p.q.trim() ? p.q.trim() : undefined,
    sensitive: sensitiveParam === "true",
    funny: p.funny === undefined || p.funny === "" ? undefined : p.funny === "true",
  };
}

export function filterEntries(f: Filters, includeSensitive: boolean): Entry[] {
  const q1 = f.q ? normalize(f.q) : null;
  const q2 = f.q ? normalizeSimple(f.q) : null;
  return entries.filter((e) => {
    if (e.sensitive && !includeSensitive) return false;
    if (f.level !== "all" && !f.level.includes(e.level)) return false;
    if (f.attested !== "all" && e.attested !== (f.attested === "true")) return false;
    if (f.funny !== undefined && e.funny !== f.funny) return false;
    if (f.type && !f.type.includes(e.type)) return false;
    if (f.form && !f.form.includes(e.form)) return false;
    if (f.theme && !e.themes.some((t) => f.theme!.includes(t))) return false;
    if (f.region && !e.regions.some((r) => f.region!.includes(r))) return false;
    if (q1 !== null) {
      const [a, b] = searchText.get(e.id)!;
      if (!a.includes(q1) && !b.includes(q2!)) return false;
    }
    return true;
  });
}

export function countBy(field: "themes" | "regions"): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) {
    if (!e.attested) continue; // same as the default list in /v1/entries
    for (const v of new Set(e[field])) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

export function distinctSources() {
  const m = new Map<
    string,
    { title: string; author: string | null; year: number | string | null; url: string | null; count: number }
  >();
  for (const e of entries) {
    const seen = new Set<string>();
    for (const s of e.sources) {
      const key = s.url ? `u:${s.url}` : `t:${s.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const ex = m.get(key);
      if (ex) ex.count++;
      else m.set(key, { title: s.title, author: s.author ?? null, year: s.year ?? null, url: s.url ?? null, count: 1 });
    }
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}

// ---------- Wish of the day ----------

const bucharestFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Bucharest",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
function bucharestParts(d: Date) {
  const p = Object.fromEntries(bucharestFormat.formatToParts(d).map((x) => [x.type, x.value]));
  return { year: p.year, month: p.month, day: p.day, hours: Number(p.hour), minutes: Number(p.minute), seconds: Number(p.second) };
}
/** Calendar date (YYYY-MM-DD) in Europe/Bucharest. */
export function bucharestDate(d: Date): string {
  const p = bucharestParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}
/** Seconds until the next midnight in Europe/Bucharest (at least 1). */
export function secondsUntilMidnight(d: Date): number {
  const p = bucharestParts(d);
  return Math.max(1, 86400 - (p.hours * 3600 + p.minutes * 60 + p.seconds));
}

// The funny entries, in id order, shuffled deterministically (constant seed) in cycles of n days,
// so no entry repeats until all of them have been used.
const funnyEntries = entries.filter((e) => e.funny).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const permutations = new Map<number, number[]>();
function shuffle(cycle: number): number[] {
  let state = (0x9e3779b9 ^ Math.imul(cycle, 0x85ebca6b)) >>> 0;
  const rnd = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const p = funnyEntries.map((_, i) => i);
  for (let i = p.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}
// Two cycles are shuffled independently, so a new cycle could open with the entry that closed
// the previous one. Swapping its first two days prevents the same wish on two days in a row.
function permutation(cycle: number): number[] {
  let p = permutations.get(cycle);
  if (p) return p;
  p = shuffle(cycle);
  if (p.length > 2 && p[0] === shuffle(cycle - 1)[p.length - 1]) [p[0], p[1]] = [p[1], p[0]];
  permutations.set(cycle, p);
  return p;
}
/** The entry of the day for a "YYYY-MM-DD" date (already validated). */
export function entryOfTheDay(date: string): Entry | null {
  const n = funnyEntries.length;
  if (!n) return null;
  const [a, l, z] = date.split("-").map(Number);
  const days = Math.floor(Date.UTC(a, l - 1, z) / 86400000);
  const cycle = Math.floor(days / n);
  return funnyEntries[permutation(cycle)[days - cycle * n]];
}
