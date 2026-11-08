import { describe, expect, it } from "vitest";
import app, { clock } from "../src/index";
import { bucharestDate, entries, THEMES } from "../src/data";
import { TEXTS } from "../src/texts";
import { esc } from "../src/site";
import { readFileSync } from "node:fs";

const get = (p: string, init?: RequestInit, env?: object) => app.request(`http://localhost${p}`, init, env);
const json = async (p: string, init?: RequestInit) => {
  const r = await get(p, init);
  return { r, b: (await r.json()) as any };
};

describe("/v1/entries", () => {
  it("defaults to all levels, attested, including sensitive", async () => {
    const { b } = await json("/v1/entries?per_page=100");
    expect(b.total).toBe(entries.filter((e) => e.attested).length);
    expect(new Set(b.results.map((e: any) => e.level)).size).toBeGreaterThan(1);
    expect(b.page).toBe(1);
    expect(b.per_page).toBe(100);
    expect(b.pages).toBe(Math.ceil(b.total / 100));
    expect(b.results.every((e: any) => e.attested)).toBe(true);
    const ids = b.results.map((e: any) => e.id);
    expect(ids).toEqual([...ids].sort());
  });
  it("level=clean returns nothing mild or vulgar", async () => {
    const { b } = await json("/v1/entries?level=clean&per_page=100");
    expect(b.total).toBe(entries.filter((e) => e.level === "clean" && e.attested).length);
    expect(b.results.every((e: any) => e.level === "clean")).toBe(true);
    for (let i = 0; i < 100; i++) expect((await json("/v1/random?level=clean")).b.level).toBe("clean");
  });
  it("default pagination values", async () => {
    const { b } = await json("/v1/entries");
    expect(b.per_page).toBe(20);
    expect(b.results).toHaveLength(20);
  });
  it("level=all and level=mild,vulgar", async () => {
    const { b } = await json("/v1/entries?level=all&attested=all");
    expect(b.total).toBe(entries.length);
    const m = await json("/v1/entries?level=mild,vulgar&per_page=100");
    expect(m.b.total).toBeGreaterThan(0);
    expect(m.b.results.every((e: any) => e.level !== "clean")).toBe(true);
    const t = await json("/v1/entries?level=all");
    expect(t.b.total).toBe(entries.filter((e) => e.attested).length);
  });
  it("sensitive entries appear by default and sensitive=false removes them", async () => {
    expect(entries.some((e) => e.sensitive && e.attested)).toBe(true);
    const a = await json("/v1/entries?level=all&sensitive=false");
    expect(a.b.total).toBe(entries.filter((e) => e.attested && !e.sensitive).length);
    const b = await json("/v1/entries?level=all&sensitive=true");
    expect(b.b.total).toBe(entries.filter((e) => e.attested).length);
    const c = await json("/v1/entries?level=all");
    expect(c.b.total).toBe(b.b.total);
    expect(c.b.total).toBeGreaterThan(a.b.total);
  });
  it("combined filters", async () => {
    const { b } = await json("/v1/entries?type=curse&form=optative&theme=prison,church&level=clean,mild&per_page=100");
    expect(b.total).toBeGreaterThan(0);
    for (const e of b.results) {
      expect(e.type).toBe("curse");
      expect(e.form).toBe("optative");
      expect(e.themes.some((t: string) => ["prison", "church"].includes(t))).toBe(true);
    }
    const r = await json("/v1/entries?region=moldavia&per_page=100");
    expect(r.b.results.every((e: any) => e.regions.includes("moldavia"))).toBe(true);
    const n = await json("/v1/entries?attested=false&level=all&per_page=100");
    expect(n.b.results.every((e: any) => !e.attested)).toBe(true);
  });
  it("q without diacritics finds texts with diacritics", async () => {
    const { b } = await json("/v1/entries?q=manca-te-ar&per_page=100");
    expect(b.results.some((e: any) => e.id === "manca-te-ar-gherla")).toBe(true);
    const upper = await json("/v1/entries?q=MANCA-TE-AR&per_page=100");
    expect(upper.b.total).toBe(b.total);
    const circumflex = await json("/v1/entries?q=m%C3%A2nca-te-ar&per_page=100");
    expect(circumflex.b.total).toBe(b.total);
    const withDiacritics = entries.find((e) => e.attested && e.level === "clean" && /[șț]/.test(e.text))!;
    const word = withDiacritics.text.split(/\s+/).find((w) => /[șț]/.test(w))!.replace(/[^\p{L}-]/gu, "");
    const without = word.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const l = await json(`/v1/entries?q=${encodeURIComponent(without)}&level=all&sensitive=true&attested=all&per_page=100`);
    expect(l.b.results.some((e: any) => e.id === withDiacritics.id)).toBe(true);
    const ii = await json("/v1/entries?q=injura&level=all");
    expect(ii.b.total).toBeGreaterThan(0);
  });
  it("pagination and limits", async () => {
    const p1 = await json("/v1/entries?page=1&per_page=5");
    const p2 = await json("/v1/entries?page=2&per_page=5");
    expect(p1.b.results).toHaveLength(5);
    expect(p2.b.results[0].id).not.toBe(p1.b.results[0].id);
    const beyond = await json("/v1/entries?page=9999");
    expect(beyond.r.status).toBe(200);
    expect(beyond.b.results).toEqual([]);
    for (const q of ["per_page=101", "per_page=0", "page=0", "page=abc", "per_page=-1"]) {
      const { r, b } = await json(`/v1/entries?${q}`);
      expect(r.status, q).toBe(400);
      expect(typeof b.error).toBe("string");
    }
    expect((await get("/v1/entries?per_page=100")).status).toBe(200);
  });
  it("invalid filter values -> 400", async () => {
    for (const q of ["level=very", "type=x", "theme=none", "region=Mars", "form=y", "attested=maybe", "sensitive=yes"]) {
      expect((await get(`/v1/entries?${q}`)).status, q).toBe(400);
    }
  });
});

describe("/v1/entries/{id}", () => {
  it("returns the entry", async () => {
    const { r, b } = await json("/v1/entries/manca-te-ar-gherla");
    expect(r.status).toBe(200);
    expect(b.id).toBe("manca-te-ar-gherla");
    expect(b.sources.length).toBeGreaterThan(0);
  });
  it("also returns sensitive and unattested entries", async () => {
    for (const e of [entries.find((x) => x.sensitive)!, entries.find((x) => !x.attested)!].filter(Boolean)) {
      expect((await get(`/v1/entries/${e.id}`)).status).toBe(200);
    }
  });
  it("404 for an unknown id", async () => {
    const { r, b } = await json("/v1/entries/does-not-exist");
    expect(r.status).toBe(404);
    expect(b.error).toBeTruthy();
  });
});

describe("/v1/random", () => {
  it("response shape", async () => {
    const { r, b } = await json("/v1/random", { headers: { host: "example.com" } });
    expect(r.status).toBe(200);
    expect(Object.keys(b).sort()).toEqual(
      ["explanation", "id", "level", "regions", "source", "text", "type", "translation", "url"].sort(),
    );
    expect(b.url).toBe(`http://localhost/v1/entries/${b.id}`);
  });
  it("all levels appear by default (300 runs)", async () => {
    const levels = new Set<string>();
    for (let i = 0; i < 300; i++) levels.add((await json("/v1/random")).b.level);
    expect(levels.size).toBeGreaterThan(1);
  });
  it("a sensitive entry can come out when the filters leave nothing else, and sensitive=false removes it", async () => {
    // a sensitive insult, caught alone by `q` with its own text
    const s = entries.find(
      (e) => e.sensitive && e.attested && entries.filter((x) => x.attested && x.text === e.text).length === 1,
    )!;
    expect(s).toBeDefined();
    const q = `q=${encodeURIComponent(s.text)}&level=all`;
    const list = (await json(`/v1/entries?${q}`)).b.results.map((e: any) => e.id);
    expect(list).toContain(s.id);
    const allowed = new Set(list);
    for (let i = 0; i < 10; i++) {
      const { r, b } = await json(`/v1/random?${q}`);
      expect(r.status).toBe(200);
      expect(allowed.has(b.id)).toBe(true);
    }
    const without = await json(`/v1/random?${q}&sensitive=false`);
    if (without.r.status === 200) expect(entries.find((e) => e.id === without.b.id)!.sensitive).toBe(false);
    else expect(without.r.status).toBe(404);
  });
  it("filters", async () => {
    const { b } = await json("/v1/random?type=curse&theme=prison");
    const e = entries.find((x) => x.id === b.id)!;
    expect(e.type).toBe("curse");
    expect(e.themes).toContain("prison");
  });
  it("404 when nothing matches", async () => {
    const { r, b } = await json("/v1/random?q=zzzzzzzzqqqq");
    expect(r.status).toBe(404);
    expect(b.error).toBeTruthy();
  });
  it("format=text and Accept: text/plain", async () => {
    const a = await get("/v1/random?format=text");
    expect(a.headers.get("content-type")).toContain("text/plain");
    const t = await a.text();
    expect(t.endsWith("\n")).toBe(true);
    expect(t.trim().length).toBeGreaterThan(0);
    const b = await get("/v1/random", { headers: { Accept: "text/plain" } });
    expect(b.headers.get("content-type")).toContain("text/plain");
    const c = await get("/v1/random", { headers: { Accept: "application/json, text/plain" } });
    expect(c.headers.get("content-type")).toContain("application/json");
    expect((await get("/v1/random?format=xml")).status).toBe(400);
  });
});

describe("/v1/themes, /v1/regions, /v1/sources", () => {
  it("themes", async () => {
    const { b } = await json("/v1/themes");
    expect(b).toHaveLength(14);
    expect(b[0]).toEqual({ name: "church", label: expect.any(String), description: expect.any(String), count: expect.any(Number) });
    const churchCount = entries.filter((e) => e.attested && e.themes.includes("church")).length;
    expect(b.find((t: any) => t.name === "church").count).toBe(churchCount);
  });
  it("regions", async () => {
    const { b } = await json("/v1/regions");
    expect(b).toHaveLength(17);
    expect(b.find((t: any) => t.name === "moldavia").count).toBe(
      entries.filter((e) => e.attested && e.regions.includes("moldavia")).length,
    );
  });
  it("count == total of the default list", async () => {
    const themes = (await json("/v1/themes")).b;
    for (const t of themes) {
      expect(t.count, t.id).toBe((await json(`/v1/entries?theme=${t.name}&per_page=1`)).b.total);
    }
    const regions = (await json("/v1/regions")).b;
    for (const r of regions) {
      expect(r.count, r.id).toBe((await json(`/v1/entries?region=${r.name}&per_page=1`)).b.total);
    }
  });
  it("sources", async () => {
    const { b } = await json("/v1/sources");
    expect(b.length).toBeGreaterThan(1);
    expect(Object.keys(b[0]).sort()).toEqual(["author", "count", "title", "url", "year"]);
    for (let i = 1; i < b.length; i++) expect(b[i - 1].count).toBeGreaterThanOrEqual(b[i].count);
    const urls = b.map((s: any) => s.url).filter(Boolean);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("/v1/random: parameters", () => {
  it("accepts `sensitive` (true/false), otherwise 400", async () => {
    expect((await get("/v1/random?sensitive=yes")).status).toBe(400);
    expect((await get("/v1/random?sensitive=true")).status).toBe(200);
    expect((await get("/v1/random?sensitive=false")).status).toBe(200);
  });
  it("sensitive=false never returns a sensitive entry", async () => {
    const sensitiveIds = new Set(entries.filter((e) => e.sensitive).map((e) => e.id));
    for (let i = 0; i < 300; i++) expect(sensitiveIds.has((await json("/v1/random?level=all&sensitive=false")).b.id)).toBe(false);
  });
});

describe("funny", () => {
  const funnyIds = new Set(entries.filter((e) => e.funny).map((e) => e.id));
  it("random without filters always returns a funny entry", async () => {
    expect(funnyIds.size).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) {
      const { r, b } = await json("/v1/random");
      expect(r.status).toBe(200);
      expect(funnyIds.has(b.id)).toBe(true);
    }
  });
  it("random with filters that leave no funny entry falls back to the rest", async () => {
    // a type + theme combination that has attested entries, but none funny
    const base = entries.filter((e) => e.attested);
    let filter = "";
    let allowed = new Set<string>();
    for (const type of new Set(base.map((e) => e.type))) {
      for (const theme of Object.keys(THEMES)) {
        const l = base.filter((e) => e.type === type && e.themes.includes(theme));
        if (l.length && !l.some((e) => e.funny)) {
          filter = `type=${type}&theme=${theme}`;
          allowed = new Set(l.map((e) => e.id));
        }
      }
    }
    expect(filter, "no combination without funny entries in the data").not.toBe("");
    for (let i = 0; i < 10; i++) {
      const { r, b } = await json(`/v1/random?${filter}`);
      expect(r.status).toBe(200);
      expect(allowed.has(b.id)).toBe(true);
      expect(funnyIds.has(b.id)).toBe(false);
    }
  });
  it("/v1/entries?funny=true returns only funny entries", async () => {
    const expected = entries.filter((e) => e.funny && e.attested).length;
    const { b } = await json("/v1/entries?funny=true&per_page=100");
    expect(b.total).toBe(expected);
    expect(b.results.every((e: any) => e.funny === true)).toBe(true);
    const f = await json("/v1/entries?funny=false");
    expect(f.b.total).toBe(entries.filter((e) => !e.funny && e.attested).length);
  });
  it("funny=xyz gives 400", async () => {
    const { r, b } = await json("/v1/entries?funny=xyz");
    expect(r.status).toBe(400);
    expect(b.error ?? b.message ?? JSON.stringify(b)).toContain("funny");
  });
});

describe("/v1/generate: does not repeat existing texts", () => {
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const existing = new Set(entries.map((e) => norm(e.text)));
  it("no existing text in 300 calls", async () => {
    for (const q of ["", "?level=clean", "?theme=prison", "?level=clean,mild&theme=nature_elements", "?theme=sickness_death&level=vulgar"]) {
      for (let i = 0; i < 300; i++) {
        const r = await get(`/v1/generate${q}`);
        if (r.status === 404) break;
        expect(r.status).toBe(200);
        const b: any = await r.json();
        expect(existing.has(norm(b.text)), `${q}: ${b.text}`).toBe(false);
      }
    }
  });
});

describe("/v1/generate", () => {
  const WARNING = "A curse composed automatically from attested pieces. As a whole, it appears in no source.";
  const ids = new Set(entries.map((e) => e.id));
  const rank: Record<string, number> = { clean: 0, mild: 1, vulgar: 2 };
  const levelOf = (id: string) => entries.find((e) => e.id === id)!.level;
  const calls = async (q: string, n: number) => {
    const out: any[] = [];
    for (let i = 0; i < n; i++) out.push((await json(`/v1/generate${q}`)).b);
    return out;
  };
  it("300 calls: both families, varied texts, no existing text", async () => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    const existing = new Set(entries.map((e) => norm(e.text)));
    const results = await calls("", 300);
    for (const b of results) expect(existing.has(norm(b.text)), b.text).toBe(false);
    expect(results.some((b) => b.text.endsWith("mă-tii"))).toBe(true);
    expect(results.some((b) => b.text.includes("-te-ar "))).toBe(true);
    expect(new Set(results.map((b) => b.text)).size).toBeGreaterThanOrEqual(100);
  });
  it("shape and pieces", async () => {
    for (const b of await calls("", 100)) {
      expect(b.generated).toBe(true);
      expect(b.attested).toBe(false);
      expect(b.warning).toBe(WARNING);
      expect(b.pieces.verb).toBeUndefined();
      expect(b.pieces.affliction).toBeUndefined();
      expect(b.pieces.pattern.text).toContain("…");
      expect(b.pieces.pattern.text.replace("…", b.pieces.fill.text)).toBe(b.text);
      expect(ids.has(b.pieces.pattern.entry)).toBe(true);
      expect(ids.has(b.pieces.fill.entry)).toBe(true);
      const level = [b.pieces.pattern.entry, b.pieces.fill.entry].map(levelOf).sort((x, y) => rank[y] - rank[x])[0];
      expect(b.level).toBe(level);
      for (const id of [b.pieces.pattern.entry, b.pieces.fill.entry]) {
        const e = entries.find((x) => x.id === id)!;
        expect(e.attested).toBe(true);
      }
      if (b.text.endsWith("mă-tii")) expect(b.pieces.pattern.text.endsWith("… mă-tii")).toBe(true);
      else expect(b.pieces.pattern.text.endsWith("-te-ar …")).toBe(true);
    }
  });
  it("level=clean: all results are clean", async () => {
    const hasCleanMaTii = entries.some((e) => e.attested && e.level === "clean" && e.text.endsWith("mă-tii"));
    for (const b of await calls("?level=clean", 100)) {
      expect(b.level).toBe("clean");
      expect(levelOf(b.pieces.pattern.entry)).toBe("clean");
      expect(levelOf(b.pieces.fill.entry)).toBe("clean");
      if (!hasCleanMaTii) expect(b.text.endsWith("mă-tii")).toBe(false);
    }
  });
  it("all levels appear by default", async () => {
    const levels = new Set((await calls("", 300)).map((b) => b.level));
    expect(levels.has("vulgar")).toBe(true);
    expect(levels.size).toBeGreaterThan(1);
  });
  it("theme, level and text", async () => {
    const { b } = await json("/v1/generate?theme=nature_elements");
    expect(entries.find((e) => e.id === b.pieces.fill.entry)!.themes).toContain("nature_elements");
    const t = await get("/v1/generate?format=text");
    expect(t.headers.get("content-type")).toContain("text/plain");
    expect((await get("/v1/generate?theme=none")).status).toBe(400);
    expect((await get("/v1/generate?level=very")).status).toBe(400);
  });
  it("404 when the combination has no pieces", async () => {
    // a theme with no attested entry at the requested level (so no filler possible), found from the data
    const themesAtLevel = (level: string) => new Set(entries.filter((e) => e.attested && e.level === level).flatMap((e) => e.themes));
    const cleanThemes = themesAtLevel("clean");
    const theme = [...themesAtLevel("vulgar")].find((t) => !cleanThemes.has(t));
    expect(theme).toBeTruthy();
    const { r, b } = await json(`/v1/generate?level=clean&theme=${theme}`);
    expect(r.status).toBe(404);
    expect(b.error).toBeTruthy();
  });
});

describe("cross-cutting", () => {
  it("CORS", async () => {
    const r = await get("/v1/random");
    expect(r.headers.get("access-control-allow-origin")).toBe("*");
    const o = await get("/v1/random", { method: "OPTIONS", headers: { Origin: "https://x.ro", "Access-Control-Request-Method": "GET" } });
    expect(o.headers.get("access-control-allow-origin")).toBe("*");
  });
  it("rate limit: 429 when the binding refuses, free when it is missing", async () => {
    let keys: string[] = [];
    const env = { RATE_LIMITER: { limit: async ({ key }: { key: string }) => (keys.push(key), { success: false }) } };
    const r = await get("/v1/random", { headers: { "cf-connecting-ip": "1.2.3.4" } }, env);
    expect(r.status).toBe(429);
    expect(((await r.json()) as any).error).toBeTruthy();
    expect(r.headers.get("retry-after")).toBe("60");
    expect(keys).toEqual(["1.2.3.4"]);
    expect((await get("/v1/random")).status).toBe(200);
  });
  it("unknown route -> 404 JSON", async () => {
    const { r, b } = await json("/v1/nonexistent");
    expect(r.status).toBe(404);
    expect(b.error).toBeTruthy();
  });
  it("/v1/export.* no longer exists", async () => {
    expect((await get("/v1/export.json")).status).toBe(404);
    expect((await get("/v1/export.csv")).status).toBe(404);
  });
  it("/docs", async () => {
    const r = await get("/docs");
    const h = await r.text();
    expect(r.headers.get("content-type")).toContain("text/html");
    expect(h).toMatch(/https:\/\/cdn\.jsdelivr\.net\/npm\/@scalar\/api-reference@\d+\.\d+\.\d+"/);
    expect(h).toMatch(/integrity="sha384-[A-Za-z0-9+\/=]+" crossorigin="anonymous"/);
    expect(h).toContain('"url":"/openapi.json"');
    expect(h).toContain('"url":"/openapi.en.json"');
    expect(h).toContain('"slug":"en"');
  });
  it("valid openapi.json with all paths", async () => {
    const { r, b } = await json("/openapi.json");
    expect(r.status).toBe(200);
    expect(b.openapi).toMatch(/^3\.1/);
    expect(b.info.title).toBe(TEXTS["info.title"].ro);
    for (const p of [
      "/v1/entries", "/v1/entries/{id}", "/v1/random", "/v1/today", "/v1/themes", "/v1/regions",
      "/v1/sources", "/v1/generate",
    ]) {
      expect(b.paths[p]?.get, p).toBeTruthy();
    }
    expect(b.paths["/v1/export.json"]).toBeUndefined();
    expect(b.paths["/v1/export.csv"]).toBeUndefined();
    expect(JSON.stringify(b)).not.toContain("agent");
  });
  it("openapi.en.json: same paths, different texts, no untranslated key", async () => {
    const ro = (await json("/openapi.json")).b;
    const { r, b: en } = await json("/openapi.en.json");
    expect(r.status).toBe(200);
    expect(Object.keys(en.paths)).toEqual(Object.keys(ro.paths));
    expect(en.info.title).not.toBe(ro.info.title);
    expect(en.info.title).toBe(TEXTS["info.title"].en);
    const keys = new Set(Object.keys(TEXTS));
    const check = (v: unknown, path: string) => {
      if (typeof v === "string") {
        expect(keys.has(v), `${path}: ${v}`).toBe(false);
        expect(/^[a-z_]+(\.[a-z_0-9]+)+$/.test(v), `${path}: ${v}`).toBe(false);
      } else if (Array.isArray(v)) v.forEach((x, i) => check(x, `${path}[${i}]`));
      else if (v && typeof v === "object") for (const [c, x] of Object.entries(v)) check(x, `${path}.${c}`);
    };
    check(ro, "ro");
    check(en, "en");
    expect(en.paths["/v1/random"].get.summary).not.toBe(ro.paths["/v1/random"].get.summary);
  });
});

describe("home page", () => {
  it("on api.* redirects to /docs", async () => {
    const r = await app.request("https://api.uraridebine.ro/");
    expect(r.status).toBe(302);
    expect(new URL(r.headers.get("location")!, "https://api.uraridebine.ro").pathname).toBe("/docs");
  });

  it("on other hosts serves the site, without rate limit", async () => {
    let requests = 0;
    const env = {
      ASSETS: { fetch: async () => new Response("site") },
      RATE_LIMITER: { limit: async () => (requests++, { success: false }) },
    };
    const r = await app.request("https://uraridebine.ro/", undefined, env);
    expect(await r.text()).toBe("site");
    expect(requests).toBe(0);
  });

  const PAGE = `<!doctype html><html><head><title>Urări de bine</title>
<meta name="description" content="generic">
<meta property="og:title" content="generic">
<meta property="og:description" content="generic">
<meta property="og:url" content="https://uraridebine.ro/">
<meta property="og:image" content="https://uraridebine.ro/og.jpg">
<meta name="twitter:title" content="generic">
<meta name="twitter:description" content="generic">
</head><body></body></html>`;
  const envPage = {
    ASSETS: { fetch: async () => new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } }) },
  };

  it("/?id=<id> puts the entry text in the share preview", async () => {
    const e = entries.find((x) => x.translation && x.sources[0]?.title)!;
    const r = await app.request(`https://uraridebine.ro/?id=${encodeURIComponent(e.id)}`, undefined, envPage);
    const h = await r.text();
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    expect(h).toContain(`<meta property="og:title" content="${esc(`„${e.text}” · Urări de bine`)}">`);
    expect(h).toContain(`<meta name="twitter:title" content="${esc(`„${e.text}” · Urări de bine`)}">`);
    expect(h).toContain(`<meta property="og:url" content="https://uraridebine.ro/?id=${encodeURIComponent(e.id)}">`);
    expect(h).toMatch(/<meta property="og:description" content="[^"]*"/);
    expect(h).toContain(esc(e.translation!.slice(0, 40)));
    expect(h).toContain(esc(e.sources[0].title.slice(0, 40)));
    expect(h).not.toContain('content="generic"');
    expect(h).toContain('<meta property="og:image" content="https://uraridebine.ro/og.jpg">');
  });

  it("/?id= unknown or missing: the page stays unchanged", async () => {
    for (const path of ["/?id=does-not-exist-at-all", "/", "/?id="]) {
      const r = await app.request(`https://uraridebine.ro${path}`, undefined, envPage);
      expect(await r.text()).toBe(PAGE);
    }
  });

  it("the preview escapes quotes and angle brackets", async () => {
    const e = entries[0];
    const original = e.text;
    (e as { text: string }).text = 'Bad "<b>" & with quotes';
    try {
      const r = await app.request(`https://uraridebine.ro/?id=${encodeURIComponent(e.id)}`, undefined, envPage);
      const h = await r.text();
      expect(h).toContain("Bad &quot;&lt;b&gt;&quot; &amp; with quotes");
      expect(h).not.toContain("<b>");
    } finally {
      (e as { text: string }).text = original;
    }
  });
});

describe("parameters: repeated keys, empty lists, page", () => {
  it("repeated key = comma list", async () => {
    const a = (await json("/v1/entries?type=curse&type=insult&per_page=1")).b;
    const b = (await json("/v1/entries?type=curse,insult&per_page=1")).b;
    expect(a.total).toBeGreaterThan(0);
    expect(a.total).toBe(b.total);
    const r = await get("/v1/random?type=curse&type=insult");
    expect(r.status).toBe(200);
    expect((await get("/v1/generate?level=clean&level=mild")).status).toBe(200);
    const bad = await json("/v1/entries?type=curse&type=none");
    expect(bad.r.status).toBe(400);
    expect(Object.keys(bad.b)).toEqual(["error"]);
  });
  it("any other failed validation gives { error }, without ZodError", async () => {
    const { r, b } = await json("/v1/entries?page=abc");
    expect(r.status).toBe(400);
    expect(Object.keys(b)).toEqual(["error"]);
    expect(JSON.stringify(b)).not.toMatch(/zod|success|expected/i);
  });
  it("empty lists = no filter", async () => {
    const allTotal = (await json("/v1/entries")).b.total;
    for (const q of ["type=,", "level=,", "theme=%20", "region=,,", "form=%20,%20"]) {
      const { r, b } = await json(`/v1/entries?${q}`);
      expect(r.status, q).toBe(200);
      expect(b.total, q).toBe(allTotal);
    }
    expect((await get("/v1/random?type=,")).status).toBe(200);
    expect((await get("/v1/generate?level=,")).status).toBe(200);
    expect((await get("/v1/generate?theme=%20")).status).toBe(200);
  });
  it("page has a ceiling", async () => {
    expect((await get("/v1/entries?page=100000")).status).toBe(200);
    expect((await get("/v1/entries?page=100001")).status).toBe(400);
    expect((await get("/v1/entries?page=99999999999999999999999")).status).toBe(400);
  });
});

describe("/v1/generate: sensitive", () => {
  it("sensitive=false does not use pieces from sensitive entries", async () => {
    const sensitiveIds = new Set(entries.filter((e) => e.sensitive).map((e) => e.id));
    expect(sensitiveIds.size).toBeGreaterThan(0);
    for (let i = 0; i < 600; i++) {
      const { r, b } = await json("/v1/generate?sensitive=false");
      expect(r.status).toBe(200);
      expect(sensitiveIds.has(b.pieces.pattern.entry)).toBe(false);
      expect(sensitiveIds.has(b.pieces.fill.entry)).toBe(false);
    }

  });
  it("wrong value -> 400", async () => {
    expect((await get("/v1/generate?sensitive=maybe")).status).toBe(400);
  });
});

describe("rate limit: robustness and key", () => {
  it("if the limiter throws, the request goes through", async () => {
    const env = { RATE_LIMITER: { limit: async () => { throw new Error("unavailable"); } } };
    const err = console.error;
    console.error = () => {};
    try {
      expect((await get("/v1/random", undefined, env)).status).toBe(200);
      expect((await get("/openapi.json", undefined, env)).status).toBe(200);
    } finally {
      console.error = err;
    }
  });
  it("IPv6 is limited per /64, IPv4 per address", async () => {
    const keys: string[] = [];
    const env = { RATE_LIMITER: { limit: async ({ key }: { key: string }) => (keys.push(key), { success: true }) } };
    for (const ip of ["2001:db8:1:2:aaaa:bbbb:cccc:dddd", "2001:DB8:1:2::1", "2001:db8:1:2:0:0:0:9", "1.2.3.4"]) {
      await get("/v1/random", { headers: { "cf-connecting-ip": ip } }, env);
    }
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).toBe(keys[2]);
    expect(keys[3]).toBe("1.2.3.4");
    await get("/v1/random", { headers: { "cf-connecting-ip": "2001:db8:1:3::1" } }, env);
    expect(keys[4]).not.toBe(keys[0]);
  });
  it("429 documented in the spec", async () => {
    const { b } = await json("/openapi.json");
    for (const [path, op] of Object.entries<any>(b.paths)) expect(op.get.responses["429"], path).toBeTruthy();
    expect(b.info.description).toContain("120");
  });
});

describe("headers: cache, nosniff, Accept with q", () => {
  it("Cache-Control on stable and random routes", async () => {
    const id = entries[0].id;
    for (const p of ["/v1/themes", "/v1/regions", "/v1/sources", "/openapi.json", "/openapi.en.json", "/v1/entries", `/v1/entries/${id}`]) {
      const r = await get(p);
      expect(r.status, p).toBe(200);
      expect(r.headers.get("cache-control"), p).toBe("public, max-age=3600");
      expect(r.headers.get("x-content-type-options"), p).toBe("nosniff");
    }
    for (const p of ["/v1/random", "/v1/generate"]) {
      const r = await get(p);
      expect(r.headers.get("cache-control"), p).toBe("no-store");
      expect(r.headers.get("x-content-type-options"), p).toBe("nosniff");
    }
    expect((await get("/v1/entries/does-not-exist")).headers.get("cache-control")).toBeNull();
    expect((await get("/v1/entries?type=none")).headers.get("cache-control")).toBeNull();
  });
  it("429 has nosniff", async () => {
    const env = { RATE_LIMITER: { limit: async () => ({ success: false }) } };
    const r = await get("/v1/random", undefined, env);
    expect(r.status).toBe(429);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it("Accept honors q values", async () => {
    const contentType = async (accept: string, p = "/v1/random") =>
      (await get(p, { headers: { accept } })).headers.get("content-type") ?? "";
    expect(await contentType("text/plain;q=0.1, application/json")).toContain("application/json");
    expect(await contentType("text/plain, application/json;q=0.5")).toContain("text/plain");
    expect(await contentType("application/json, text/plain")).toContain("application/json");
    expect(await contentType("text/plain, application/json")).toContain("text/plain");
    expect(await contentType("text/plain;q=0")).toContain("application/json");
    expect(await contentType("text/plain")).toContain("text/plain");
    expect(await contentType("*/*")).toContain("application/json");
    expect(await contentType("text/plain;q=0.1, application/json", "/v1/generate")).toContain("application/json");
  });
});

describe("/v1/today: wish of the day", () => {
  const originalNow = clock.now;
  const atTime = async (iso: string, path = "/v1/today") => {
    clock.now = () => new Date(iso);
    try {
      return await get(path);
    } finally {
      clock.now = originalNow;
    }
  };
  const funnyIds = new Set(entries.filter((e) => e.funny).map((e) => e.id));

  it("a funny entry, whole, with `date`", async () => {
    const r = await get("/v1/today");
    expect(r.status).toBe(200);
    const b: any = await r.json();
    expect(funnyIds.has(b.id)).toBe(true);
    expect(b.date).toBe(bucharestDate(new Date()));
    const { date, ...rest } = b;
    expect(rest).toEqual(entries.find((e) => e.id === b.id));
  });
  it("same entry for the same date", async () => {
    const a: any = await (await get("/v1/today?date=2026-03-14")).json();
    const b: any = await (await get("/v1/today?date=2026-03-14")).json();
    expect(a.id).toBe(b.id);
    expect(a.date).toBe("2026-03-14");
  });
  it("consecutive days differ and nothing repeats within a cycle", async () => {
    const n = funnyIds.size;
    const day = (d: number) => new Date(d * 86400000).toISOString().slice(0, 10);
    const idOn = async (d: number) => ((await (await get(`/v1/today?date=${day(d)}`)).json()) as any).id as string;
    // a cycle is n days long and starts on a multiple of n (days since 1970-01-01)
    const first = Math.ceil(Date.UTC(2020, 0, 1) / 86400000 / n) * n;
    const seen = new Set<string>();
    for (let d = first; d < first + n; d++) seen.add(await idOn(d));
    expect(seen.size).toBe(n);
    // across several cycle boundaries the same wish never shows up two days in a row
    for (let c = 1; c <= 8; c++) {
      const boundary = first + c * n;
      expect(await idOn(boundary)).not.toBe(await idOn(boundary - 1));
    }
  });
  it("the day boundary is midnight in Bucharest (summer UTC+3, winter UTC+2)", async () => {
    const dateAt = async (iso: string) => ((await (await atTime(iso)).json()) as any).date;
    expect(await dateAt("2026-07-01T20:59:59Z")).toBe("2026-07-01");
    expect(await dateAt("2026-07-01T21:00:00Z")).toBe("2026-07-02");
    expect(await dateAt("2026-01-10T21:59:59Z")).toBe("2026-01-10");
    expect(await dateAt("2026-01-10T22:00:00Z")).toBe("2026-01-11");
    const a: any = await (await atTime("2026-07-01T20:59:59Z")).json();
    const b: any = await (await atTime("2026-07-01T21:00:00Z")).json();
    const c: any = await (await get("/v1/today?date=2026-07-02")).json();
    expect(b.id).toBe(c.id);
    expect(a.id).not.toBe(b.id);
  });
  it("Cache-Control until midnight, at most one hour", async () => {
    expect((await atTime("2026-07-01T12:00:00Z")).headers.get("cache-control")).toBe("public, max-age=3600");
    expect((await atTime("2026-07-01T20:59:30Z")).headers.get("cache-control")).toBe("public, max-age=30");
    expect((await get("/v1/today?date=2026-03-14")).headers.get("cache-control")).toBe("public, max-age=3600");
  });
  it("wrong or future date -> 400", async () => {
    for (const d of ["abc", "2026-13-01", "2026-02-30", "26-01-01", "2026-1-1"]) {
      const { r, b } = await json(`/v1/today?date=${d}`);
      expect(r.status, d).toBe(400);
      expect(typeof b.error).toBe("string");
    }
    const r = await atTime("2026-07-01T12:00:00Z", "/v1/today?date=2026-07-02");
    expect(r.status).toBe(400);
    expect(((await r.json()) as any).error).toContain("future");
    expect((await atTime("2026-07-01T12:00:00Z", "/v1/today?date=2026-07-01")).status).toBe(200);
    // at 23:30 UTC in July it is already the next day in Bucharest
    expect((await atTime("2026-07-01T21:30:00Z", "/v1/today?date=2026-07-02")).status).toBe(200);
  });
  it("format=text and 429", async () => {
    const t = await get("/v1/today?format=text");
    expect(t.headers.get("content-type")).toContain("text/plain");
    const b: any = await (await get("/v1/today")).json();
    expect(await t.text()).toBe(b.text + "\n");
    const env = { RATE_LIMITER: { limit: async () => ({ success: false }) } };
    expect((await get("/v1/today", undefined, env)).status).toBe(429);
  });
});

describe("API host", () => {
  it("links in responses use the API host on the real domains", async () => {
    for (const host of ["https://uraridebine.ro", "https://api.uraridebine.ro"]) {
      const b: any = await (await app.request(`${host}/v1/entries/manca-te-ar-gherla`)).json();
      const r: any = await (await app.request(`${host}/v1/random`)).json();
      expect(r.url).toBe(`https://api.uraridebine.ro/v1/entries/${r.id}`);
      expect(b.id).toBe("manca-te-ar-gherla");
      const spec: any = await (await app.request("https://api.uraridebine.ro/openapi.json")).json();
      expect(spec.servers[0].url).toBe("https://api.uraridebine.ro");
    }
  });
  it("docs and spec on the site domain redirect to the API host", async () => {
    for (const path of ["/docs", "/openapi.json", "/openapi.en.json?x=1"]) {
      const r = await app.request(`https://uraridebine.ro${path}`);
      expect(r.status).toBe(301);
      expect(r.headers.get("location")).toBe(`https://api.uraridebine.ro${path}`);
    }
    expect((await app.request("https://api.uraridebine.ro/docs")).status).toBe(200);
  });
});

describe("server-rendered pages", () => {
  const ALL_HTML = readFileSync(new URL("../public/all.html", import.meta.url), "utf8");
  const NOT_FOUND = "<!doctype html><title>404</title><p>Pagină negăsită</p>";
  const env = {
    ASSETS: {
      fetch: async (req: Request) => {
        const path = new URL(req.url).pathname;
        const body = path === "/all.html" ? ALL_HTML : NOT_FOUND;
        return new Response(body, { status: path === "/all.html" ? 200 : 404, headers: { "content-type": "text/html; charset=utf-8" } });
      },
    },
  };
  const page = (p: string, e: object | undefined = env) => get(p, undefined, e);
  const attested = entries.filter((e) => e.attested);
  const countLinks = (h: string) => (h.match(/<a class="entry" href="\/e\//g) ?? []).length;

  it("esc escapes HTML special characters", () => {
    expect(esc('<a href="x">&')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
  });

  it("/e/:id renders the entry", async () => {
    const e = entries.find((x) => x.id === "manca-te-ar-gherla")!;
    const r = await page("/e/manca-te-ar-gherla");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/html");
    expect(r.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    const h = await r.text();
    expect(h).toContain(esc(e.text));
    expect(h).toContain(esc(e.sources[0].title));
    expect(h).toContain('rel="canonical" href="https://uraridebine.ro/e/manca-te-ar-gherla"');
    expect(h).toContain(`<title>${esc(`„${e.text}” · Urări de bine`)}</title>`);
    expect(h).not.toContain('name="robots"');
  });

  it("/e/:id marks sensitive entries noindex", async () => {
    const e = entries.find((x) => x.sensitive)!;
    const h = await (await page(`/e/${encodeURIComponent(e.id)}`)).text();
    expect(h).toContain('name="robots" content="noindex"');
  });

  it("/e/:id escapes the entry text", async () => {
    const e = entries[0];
    const original = e.text;
    (e as { text: string }).text = 'Bad <b>"x"</b> & co';
    try {
      const h = await (await page(`/e/${encodeURIComponent(e.id)}`)).text();
      expect(h).toContain("Bad &lt;b&gt;&quot;x&quot;&lt;/b&gt; &amp; co");
      expect(h).not.toContain("<b>");
    } finally {
      (e as { text: string }).text = original;
    }
  });

  it("/e/:id unknown gives 404", async () => {
    const r = await page("/e/nope");
    expect(r.status).toBe(404);
    expect(r.headers.get("content-type")).toContain("text/html");
    expect(await r.text()).toContain("Pagină negăsită");
    const plain = await page("/e/nope", {});
    expect(plain.status).toBe(404);
  });

  it("/all?theme=prison renders the theme list", async () => {
    const count = attested.filter((e) => e.themes.includes("prison")).length;
    const r = await page("/all?theme=prison");
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("public, max-age=3600");
    const h = await r.text();
    expect(countLinks(h)).toBe(Math.min(50, count));
    expect(h).toMatch(/<option value="prison"[^>]*selected/);
    expect(h).toContain(`<meta name="description" content="${esc(THEMES.prison.description)}">`);
    expect(h).toContain('rel="canonical" href="https://uraridebine.ro/all?theme=prison"');
    expect(h).toContain("<title>Pușcărie · Urări de bine</title>");
    expect(h).not.toContain("noindex");
    expect(h).toContain('id="initial-data"');
    expect(h).not.toContain("aria-busy");
  });

  it("/all without filters is indexable and lists the first page", async () => {
    const h = await (await page("/all")).text();
    expect(h).toContain('rel="canonical" href="https://uraridebine.ro/all"');
    expect(h).not.toContain("noindex");
    expect(countLinks(h)).toBe(50);
    expect(h).toContain(`pagina 1 din ${Math.ceil(attested.length / 50)}`);
    expect(h).toContain(`Am găsit ${new Intl.NumberFormat("ro-RO").format(attested.length)}`);
  });

  it("/all?q=gherla is noindex and fills the search box", async () => {
    const h = await (await page("/all?q=gherla")).text();
    expect(h).toContain('name="robots" content="noindex"');
    expect(h).toContain('value="gherla"');
    expect(h).not.toContain('rel="canonical"');
  });

  it("/all clamps a page past the end and ignores invalid filters", async () => {
    const pages = Math.ceil(attested.length / 50);
    const h = await (await page("/all?page=999999")).text();
    expect(h).toContain(`pagina ${pages} din ${pages}`);
    expect(h).toContain('id="next" aria-disabled="true"');
    const bogus = await page("/all?type=bogus");
    expect(bogus.status).toBe(200);
    const b = await bogus.text();
    expect(b).toContain(`Am găsit ${new Intl.NumberFormat("ro-RO").format(attested.length)}`);
    expect(b).not.toContain("noindex");
  });

  it("/all with no match shows the empty message", async () => {
    const h = await (await page("/all?q=zzzzqqqxxxyyy")).text();
    expect(h).toContain('<div class="list__empty" id="empty"><p class="error__title">Nimic.</p>');
    expect(h).toContain("</ol>");
    expect(countLinks(h)).toBe(0);
  });

  it("/sitemap.xml lists the indexable pages", async () => {
    const r = await page("/sitemap.xml");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("application/xml");
    const x = await r.text();
    expect(x).toContain("<loc>https://uraridebine.ro/e/manca-te-ar-gherla</loc>");
    for (const e of entries.filter((e) => e.sensitive)) expect(x).not.toContain(`/e/${encodeURIComponent(e.id)}<`);
    const themes = Object.keys(THEMES).filter((t) => attested.some((e) => e.themes.includes(t))).length;
    const expected = 2 + themes + entries.filter((e) => e.attested && !e.sensitive).length;
    expect((x.match(/<loc>/g) ?? []).length).toBe(expected);
  });

  it("/?id= adds a canonical link to the entry page", async () => {
    const e = entries[0];
    const PAGE = '<html><head><title>x</title><meta property="og:url" content="u"></head></html>';
    const r = await app.request(`https://uraridebine.ro/?id=${encodeURIComponent(e.id)}`, undefined, {
      ASSETS: { fetch: async () => new Response(PAGE, { headers: { "content-type": "text/html" } }) },
    });
    expect(await r.text()).toContain(`<link rel="canonical" href="https://uraridebine.ro/e/${encodeURIComponent(e.id)}" data-fixed>`);
  });
});
