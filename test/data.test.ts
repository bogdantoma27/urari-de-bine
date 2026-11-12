import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bucharestDate, byId, entries, filterEntries, parseFilters, redirects } from "../src/data";
import schedule from "../data/today-schedule.json";
import { addDays, buildSchedule, daysBetween, extendIds, HORIZON_DAYS } from "../scripts/today-schedule.mjs";

const count = (q: string) => filterEntries(parseFilters({ q }), true).length;

describe("search ignores punctuation", () => {
  it.each([
    ["manca te ar", "manca-te-ar"],
    ["ma tii", "ma-tii"],
    ["lanu'", "lanu’"],
  ])("%s == %s", (a, b) => {
    expect(count(a)).toBeGreaterThan(0);
    expect(count(a)).toBe(count(b));
  });
  it("a query with only punctuation filters nothing", () => {
    const all = filterEntries(parseFilters({}), true).length;
    expect(count("?!")).toBe(all);
    expect(count(" - ")).toBe(all);
  });
});

describe("wish of the day schedule", () => {
  const today = bucharestDate(new Date());
  const funnyIds = entries.filter((e) => e.funny).map((e) => e.id);

  it("only has ids that exist, directly or through a redirect", () => {
    const missing = schedule.ids.filter((id) => !byId.has(id) && !byId.has(redirects.get(id) ?? ""));
    expect(missing).toEqual([]);
  });
  it("covers at least today + 365 days", () => {
    const end = addDays(schedule.start, schedule.ids.length - 1);
    expect(daysBetween(today, end), "run `npm run schedule` and commit data/today-schedule.json").toBeGreaterThanOrEqual(365);
  });
  it("is what regenerating from today gives with the current data", () => {
    const fresh = buildSchedule(entries, today, schedule);
    const stale = fresh.ids.slice(0, schedule.ids.length).some((id, i) => id !== schedule.ids[i]);
    expect(
      stale,
      "data/today-schedule.json is out of date with the funny entries: run `npm run schedule` and commit the file",
    ).toBe(false);
  });
  it("never repeats before every funny entry was used, nor on two days in a row (new part)", () => {
    const ids = extendIds(funnyIds, [], funnyIds.length * 3);
    for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
    for (let c = 0; c < 3; c++) {
      const cycle = ids.slice(c * funnyIds.length, (c + 1) * funnyIds.length);
      expect(new Set(cycle).size).toBe(funnyIds.length);
    }
  });
  it("is prefix-consistent: regenerating on a later day keeps the same output", () => {
    const d = "2027-03-01";
    const a = buildSchedule(entries, d, schedule);
    const b = buildSchedule(entries, addDays(d, 10), a);
    expect(b.ids.slice(0, a.ids.length)).toEqual(a.ids);
    expect(b.ids.length).toBe(Math.max(a.ids.length, daysBetween(a.start, addDays(d, 10)) + 1 + HORIZON_DAYS));
  });
  it("keeps the past when the funny set changes, and schedules new entries in the future only", () => {
    const d = "2027-03-01";
    const base = buildSchedule(entries, d, schedule);
    const changed = entries.map((e, i) => (i < 5 ? { ...e, funny: !e.funny } : e));
    const next = buildSchedule(changed, d, base);
    const through = daysBetween(base.start, d) + 1;
    expect(next.ids.slice(0, through)).toEqual(base.ids.slice(0, through));
  });
});

describe("README stats match the data", () => {
  const count = (f: (e: (typeof entries)[number]) => boolean) => entries.filter(f).length;
  const ro = (n: number) => n.toLocaleString("de-DE");
  const en = (n: number) => n.toLocaleString("en-US");
  const rows = (fmt: (n: number) => string, t: Record<string, string>) => [
    `${fmt(count((e) => e.type === "curse"))} ${t.curse} · ${fmt(count((e) => e.type === "swear"))} ${t.swear} · ${fmt(count((e) => e.type === "insult"))} ${t.insult} · ${fmt(count((e) => e.type === "expression"))} ${t.expression} · ${fmt(count((e) => e.type === "euphemism"))} ${t.euphemism}`,
    `${fmt(count((e) => e.level === "clean"))} ${t.clean} · ${fmt(count((e) => e.level === "mild"))} ${t.mild} · ${fmt(count((e) => e.level === "vulgar"))} ${t.vulgar}`,
    `${fmt(count((e) => e.verification === "verified"))} ${t.verified} · ${fmt(count((e) => e.verification === "transcribed"))} ${t.transcribed} · ${fmt(count((e) => e.verification === "unverified"))} ${t.unverified}`,
    `| ${fmt(count((e) => e.funny))}, `,
  ];
  const cases = [
    ["README.md", ro, { curse: "blesteme", swear: "înjurături", insult: "insulte", expression: "expresii", euphemism: "eufemisme", clean: "curate (de spus la masă)", mild: "medii (în trafic)", vulgar: "vulgare (la meci)", verified: "găsite cuvânt cu cuvânt în sursă", transcribed: "copiate de mână", unverified: "negăsite" }, "intr%C4%83ri"],
    ["README.en.md", en, { curse: "curses", swear: "swears", insult: "insults", expression: "expressions", euphemism: "euphemisms", clean: "clean (fine at Sunday lunch)", mild: "mild (traffic jams)", vulgar: "vulgar (football stands)", verified: "found word for word in the source", transcribed: "copied by hand", unverified: "not found" }, "entries"],
  ] as const;
  it.each(cases)("%s", (file, fmt, t, badge) => {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    for (const row of rows(fmt, t as Record<string, string>)) {
      expect(text, `${file} is missing "${row}": update the stats table`).toContain(row);
    }
    expect(text).toContain(`badge/${badge}-${fmt(entries.length).replace(",", "%2C")}-`);
  });
});
