// Maintains data/today-schedule.json: the entry id of the wish of the day for every date from
// `start` on (Europe/Bucharest calendar dates). The file is append-only: dates up to and including
// today never change; only the future is regenerated from the current set of funny entries.
// Run `npm run schedule` after changing which entries are funny, and commit the file.
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
export const SCHEDULE_FILE = join(root, "data", "today-schedule.json");
export const FIRST_DAY = "2026-11-08";
export const HORIZON_DAYS = 730;

export function loadEntries() {
  const dir = join(root, "data", "entries");
  const list = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
  return list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

const dayNumber = (date) => {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};
export const daysBetween = (from, to) => dayNumber(to) - dayNumber(from);
export const addDays = (date, n) => new Date((dayNumber(date) + n) * 86400000).toISOString().slice(0, 10);

export function bucharestToday(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

// ---- The first algorithm (days-since-epoch over shuffled cycles), kept only to bootstrap the file ----
function seededOrder(length, seed) {
  let state = (0x9e3779b9 ^ Math.imul(seed, 0x85ebca6b)) >>> 0;
  const rnd = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const p = Array.from({ length }, (_, i) => i);
  for (let i = p.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}
export function legacyIds(entries, from, to) {
  const funny = entries.filter((e) => e.funny).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const n = funny.length;
  const perms = new Map();
  const shuffle = (c) => seededOrder(n, c);
  const permutation = (c) => {
    let p = perms.get(c);
    if (p) return p;
    p = shuffle(c);
    if (p.length > 2 && p[0] === shuffle(c - 1)[p.length - 1]) [p[0], p[1]] = [p[1], p[0]];
    perms.set(c, p);
    return p;
  };
  const ids = [];
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1)) {
    const days = dayNumber(d);
    const cycle = Math.floor(days / n);
    ids.push(funny[permutation(cycle)[days - cycle * n]].id);
  }
  return ids;
}

// ---- The append-only algorithm ----
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** `history` replayed against the current funny ids, then `count` new ids appended. Returns only the new ones. */
export function extendIds(funnyIds, history, count) {
  const all = [...new Set(funnyIds)];
  if (!all.length) return [];
  let remaining = new Set(all);
  let cycle = 0;
  const take = (id) => {
    remaining.delete(id);
    if (!remaining.size) {
      remaining = new Set(all);
      cycle++;
    }
  };
  for (const id of history) if (remaining.has(id)) take(id);
  let prev = history.length ? history[history.length - 1] : null;
  const out = [];
  for (let i = 0; i < count; i++) {
    const candidates = [...remaining]
      .map((id) => [fnv1a(`${id}:${cycle}`), id])
      .sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1))
      .map((x) => x[1]);
    const pick = candidates[0] === prev && candidates.length > 1 ? candidates[1] : candidates[0];
    out.push(pick);
    prev = pick;
    take(pick);
  }
  return out;
}

/** The schedule for `today`: history up to today kept (or bootstrapped), the future regenerated. */
export function buildSchedule(entries, today, existing) {
  const funnyIds = entries.filter((e) => e.funny).map((e) => e.id);
  const start = existing ? existing.start : FIRST_DAY;
  const through = daysBetween(start, today) + 1; // days up to and including today
  let kept;
  if (existing) kept = existing.ids.slice(0, Math.max(0, through));
  else kept = legacyIds(entries, start, today);
  const length = Math.max(through + HORIZON_DAYS, existing ? existing.ids.length : 0);
  return { start, ids: [...kept, ...extendIds(funnyIds, kept, length - kept.length)] };
}

export const serialize = (s) => JSON.stringify(s, null, 2) + "\n";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const entries = loadEntries();
  const existing = existsSync(SCHEDULE_FILE) ? JSON.parse(readFileSync(SCHEDULE_FILE, "utf8")) : null;
  const today = bucharestToday();
  const s = buildSchedule(entries, today, existing);
  writeFileSync(SCHEDULE_FILE, serialize(s));
  console.log(`today-schedule.json: ${s.ids.length} days from ${s.start} to ${addDays(s.start, s.ids.length - 1)}${existing ? "" : " (bootstrapped)"}`);
}
