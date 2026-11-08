import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import type { Context } from "hono";
import {
  HttpError,
  REGIONS,
  THEMES,
  bucharestDate,
  byId,
  filterEntries,
  entryOfTheDay,
  countBy,
  parseFilters,
  secondsUntilMidnight,
  distinctSources,
  type Entry,
} from "./data";
import { generate } from "./generate";
import { textKey, translate, type Lang } from "./texts";
import { entryMeta, esc, setMeta, site } from "./site";

interface Bindings {
  RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  ASSETS?: { fetch(req: Request): Promise<Response> };
}

const app = new OpenAPIHono<{ Bindings: Bindings }>({
  // Any parameter that fails validation also gets a plain { error }, without the validator details.
  defaultHook: (result, c) => {
    if (result.success) return;
    const names = [...new Set(result.error.issues.map((i) => i.path.join(".")).filter(Boolean))];
    return c.json(
      { error: names.length ? `Invalid value for ${names.map((n) => `"${n}"`).join(", ")}. See /docs.` : "Invalid request. See /docs." },
      400,
    );
  },
});

const RATE_LIMIT = 120;

/** IPv4 stays as is; IPv6 is reduced to its /64 prefix, so the limit cannot be bypassed by changing the address. */
export function rateLimitKey(ip: string): string {
  if (!ip.includes(":") || ip.includes(".")) return ip;
  const [head, tail = ""] = ip.split("::");
  const a = head ? head.split(":") : [];
  const b = ip.includes("::") && tail ? tail.split(":") : [];
  const groups = ip.includes("::") ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b] : a;
  return groups.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, "")).join(":") + "::/64";
}

// On api.* the front page redirects to the documentation; on other hosts we serve the site.
// It sits before the middlewares, so the front page is not rate limited.
/** Share preview for /?id=<id>: the Open Graph/Twitter title and description come from the entry. */
function withSharePreview(html: string, e: Entry): string {
  const { title, description } = entryMeta(e);
  const url = `https://uraridebine.ro/?id=${encodeURIComponent(e.id)}`;
  let h = html;
  h = setMeta(h, 'property="og:title"', title);
  h = setMeta(h, 'name="twitter:title"', title);
  h = setMeta(h, 'property="og:url"', url);
  if (description) {
    h = setMeta(h, 'property="og:description"', description);
    h = setMeta(h, 'name="twitter:description"', description);
    h = setMeta(h, 'name="description"', description);
  }
  // the entry's own page is the canonical one, so /?id= is not indexed as a duplicate
  h = h.replace("</head>", () => `<link rel="canonical" href="https://uraridebine.ro/e/${esc(encodeURIComponent(e.id))}" data-fixed>
</head>`);
  return h.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`);
}

app.get("/", async (c) => {
  if (new URL(c.req.url).hostname.startsWith("api.")) {
    c.header("X-Content-Type-Options", "nosniff");
    return c.redirect("/docs", 302);
  }
  if (!c.env?.ASSETS) return c.notFound();
  const response = await c.env.ASSETS.fetch(c.req.raw);
  const id = new URL(c.req.url).searchParams.get("id");
  const entry = id ? byId.get(id) : undefined;
  if (!entry || !response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) return response;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  return new Response(withSharePreview(await response.text(), entry), { status: response.status, headers });
});

// The docs and the spec live on the API host; on the site's domain they redirect there.
app.on(["GET", "HEAD"], ["/docs", "/openapi.json", "/openapi.en.json"], async (c, next) => {
  const u = new URL(c.req.url);
  if (u.hostname === "uraridebine.ro") return c.redirect(`${API_ORIGIN}${u.pathname}${u.search}`, 301);
  await next();
});

const CACHE_ONE_HOUR = [/^\/e\/[^/]+$/, /^\/all$/, /^\/sitemap\.xml$/, /^\/v1\/(themes|regions|sources)$/, /^\/openapi(\.en)?\.json$/, /^\/v1\/entries(\/[^/]+)?$/];
const NO_CACHE = /^\/v1\/(random|generate)$/;

// The data only changes on deploy, so stable responses can be cached for an hour; random ones cannot.
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  const path = new URL(c.req.url).pathname;
  if (NO_CACHE.test(path)) c.header("Cache-Control", "no-store");
  else if (c.res.status === 200 && CACHE_ONE_HOUR.some((re) => re.test(path))) c.header("Cache-Control", "public, max-age=3600");
});

app.use("*", cors({ origin: "*", allowMethods: ["GET", "HEAD", "OPTIONS"] }));

app.use("*", async (c, next) => {
  const limiter = c.env?.RATE_LIMITER;
  if (limiter && c.req.method !== "OPTIONS") {
    let success = true;
    try {
      const ip = c.req.header("cf-connecting-ip") ?? "unknown";
      ({ success } = await limiter.limit({ key: rateLimitKey(ip) }));
    } catch (err) {
      console.error("rate limiter unavailable, letting the request through", err); // fail open
    }
    if (!success) {
      c.header("Retry-After", "60");
      return c.json({ error: `Easy there: at most ${RATE_LIMIT} requests per minute. Try again in a few seconds.` }, 429);
    }
  }
  await next();
});

// Server-rendered pages for search engines: /e/:id, /all and /sitemap.xml.
app.route("/", site);

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "Something broke on the server. Please try again a bit later." }, 500 as never);
});
app.notFound((c) => c.json({ error: "That route does not exist. See /docs." }, 404));

// ---------- schemas for the documentation ----------

const ErrorSchema = z.object({ error: z.string() }).openapi("Error", { example: { error: textKey("example.error") } });

const exampleEntry = {
  id: "manca-te-ar-gherla",
  text: "Mânca-te-ar gherla!",
  original_text: "Mînca-te-ar gherla!",
  type: "curse",
  form: "optative",
  affliction: "gherla",
  themes: ["prison"],
  regions: [],
  level: "clean",
  period: null,
  attested: true,
  verification: "verified",
  sensitive: false,
  funny: true,
  sources: [
    {
      title: "Imaginarul blestemului. Imaginea culturală a blestemului (Journal of Romanian Literary Studies 20/2020)",
      url: "https://asociatia-alpha.ro/Jrls/020-2020/Jrls-020-182.pdf",
      author: "Lavinia Nasta",
      year: 2020,
    },
  ],
  explanation: "Gherla = închisoare.",
  translation: "May the prison eat you!",
  notes: null,
};

const verificationSchema = z.enum(["verified", "transcribed", "unverified"]);

const SourceSchema = z
  .object({
    title: z.string(),
    url: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    year: z.union([z.number().int(), z.string()]).nullable().optional(),
    page: z.union([z.number().int(), z.string()]).nullable().optional(),
    informant: z.string().nullable().optional(),
    regions: z.array(z.string()).optional(),
    original_text: z.string().optional(),
    verification: verificationSchema.optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough();

const EntrySchema = z
  .object({
    id: z.string(),
    text: z.string(),
    original_text: z.string(),
    type: z.enum(["curse", "swear", "insult", "euphemism", "expression"]),
    form: z.enum(["optative", "subjunctive", "imperative", "nominal", "single_word", "other"]),
    affliction: z.string().nullable(),
    themes: z.array(z.string()),
    regions: z.array(z.string()),
    level: z.enum(["clean", "mild", "vulgar"]),
    period: z.string().nullable(),
    attested: z.boolean(),
    verification: verificationSchema,
    sensitive: z.boolean(),
    funny: z.boolean(),
    sources: z.array(SourceSchema),
    explanation: z.string().nullable(),
    translation: z.string().nullable(),
    notes: z.string().nullable(),
  })
  .openapi("Entry", { example: exampleEntry });

// Repeated keys (?type=a&type=b) arrive as a list; we accept them and join them with a comma (see `queryParams`).
// In the specification the parameter stays a plain string.
const param = (o: { description: string; example: string }) =>
  z.union([z.string(), z.array(z.string())]).optional().openapi({ type: "string", ...o });

const filterQuery = {
  type: param({ description: textKey("param.type"), example: "curse" }),
  theme: param({ description: textKey("param.theme"), example: "prison" }),
  region: param({ description: textKey("param.region"), example: "moldavia" }),
  level: param({ description: textKey("param.level"), example: "clean,mild" }),
  attested: param({ description: textKey("param.attested"), example: "true" }),
  form: param({ description: textKey("param.form"), example: "optative" }),
  q: param({ description: textKey("param.q"), example: "gherla" }),
};

const TAG = [textKey("tag.entries")];
const response429 = { description: textKey("response.rate_limit"), content: { "application/json": { schema: ErrorSchema } } };
const errorContent = { content: { "application/json": { schema: ErrorSchema } } };

// ---------- utilities ----------

/** The request parameters; a repeated key becomes a single value, with the elements joined by a comma. */
function queryParams(c: Context): Record<string, string> {
  return Object.fromEntries(Object.entries(c.req.queries()).map(([n, v]) => [n, v.join(",")]));
}

const API_ORIGIN = "https://api.uraridebine.ro";
// Links in responses and in the docs always point at the API host. The site calls /v1 on its own
// domain, but the address people should see and keep is api.uraridebine.ro. Local runs keep their own origin.
const origin = (c: Context) => {
  const u = new URL(c.req.url);
  return u.hostname.endsWith("uraridebine.ro") ? API_ORIGIN : u.origin;
};

function wantsText(c: Context): boolean {
  const format = queryParams(c).format;
  if (format === "text") return true;
  if (format !== undefined && format !== "" && format !== "json") {
    throw new HttpError(400, '"format" can only be json or text.');
  }
  if (format === "json") return false;
  // Honors q values; on a tie the type written first wins. Anything not mentioned has q=0.
  const q: Record<string, number> = { "text/plain": -1, "application/json": -1 };
  const order: string[] = [];
  for (const part of (c.req.header("accept") ?? "").toLowerCase().split(",")) {
    const [mediaType, ...qualifiers] = part.split(";").map((x) => x.trim());
    if (!(mediaType in q) || q[mediaType] >= 0) continue;
    const m = qualifiers.map((p) => /^q=(\d*\.?\d+)$/.exec(p)).find(Boolean);
    q[mediaType] = m ? Number(m[1]) : 1;
    order.push(mediaType);
  }
  if (q["text/plain"] <= 0) return false;
  if (q["application/json"] <= 0) return true;
  return q["text/plain"] > q["application/json"] || (q["text/plain"] === q["application/json"] && order[0] === "text/plain");
}

const text = (c: Context, s: string) =>
  c.body(s + "\n", 200, { "Content-Type": "text/plain; charset=utf-8" });

function parseBoundedInt(name: string, v: string | undefined, defaultValue: number, min: number, max: number): number {
  if (v === undefined || v === "") return defaultValue;
  const n = Number(v);
  if (!/^\d+$/.test(v.trim()) || n < min || n > max) {
    throw new HttpError(400, `"${name}" must be an integer between ${min} and ${max}.`);
  }
  return n;
}

const pick = <T>(l: T[]): T => l[Math.floor(Math.random() * l.length)];

/** The application clock; tests can replace it. */
export const clock = { now: () => new Date() };

// ---------- routes ----------

app.openapi(
  createRoute({
    method: "get",
    path: "/v1/entries",
    tags: TAG,
    summary: textKey("list.summary"),
    description: textKey("list.description"),
    request: {
      query: z.object({
        ...filterQuery,
        sensitive: param({ description: textKey("param.sensitive"), example: "false" }),
        funny: param({ description: textKey("param.funny"), example: "true" }),
        page: param({ description: textKey("param.page"), example: "1" }),
        per_page: param({ description: textKey("param.per_page"), example: "20" }),
      }),
    },
    responses: {
      200: {
        description: textKey("list.200"),
        content: {
          "application/json": {
            schema: z.object({
              total: z.number().int(),
              page: z.number().int(),
              per_page: z.number().int(),
              pages: z.number().int(),
              results: z.array(EntrySchema),
            }).openapi({ example: { total: 812, page: 1, per_page: 20, pages: 41, results: [exampleEntry] } }),
          },
        },
      },
      400: { description: textKey("response.invalid_parameters"), ...errorContent },
      429: response429,
    },
  }),
  ((c: Context) => {
    const q = queryParams(c);
    const filters = parseFilters(q);
    const page = parseBoundedInt("page", q.page, 1, 1, 100000);
    const perPage = parseBoundedInt("per_page", q.per_page, 20, 1, 100);
    const all = filterEntries(filters, filters.sensitive);
    const total = all.length;
    const start = (page - 1) * perPage;
    return c.json({
      total,
      page: page,
      per_page: perPage,
      pages: Math.ceil(total / perPage),
      results: all.slice(start, start + perPage),
    });
  }) as never,
);

app.openapi(
  createRoute({
    method: "get",
    path: "/v1/entries/{id}",
    tags: TAG,
    summary: textKey("entry.summary"),
    description: textKey("entry.description"),
    request: { params: z.object({ id: z.string().openapi({ description: textKey("param.id"), example: "manca-te-ar-gherla" }) }) },
    responses: {
      200: { description: textKey("entry.200"), content: { "application/json": { schema: EntrySchema } } },
      404: { description: textKey("entry.404"), ...errorContent },
      429: response429,
    },
  }),
  ((c: Context) => {
    const id = c.req.param("id") ?? "";
    const e = byId.get(id);
    if (!e) throw new HttpError(404, `No entry with id "${id}".`);
    return c.json(e);
  }) as never,
);

app.openapi(
  createRoute({
    method: "get",
    path: "/v1/random",
    tags: TAG,
    summary: textKey("random.summary"),
    description: textKey("random.description"),
    request: {
      query: z.object({
        ...filterQuery,
        sensitive: param({ description: textKey("param.sensitive"), example: "false" }),
        format: param({ description: textKey("param.format"), example: "json" }),
      }),
    },
    responses: {
      200: {
        description: textKey("random.200"),
        content: {
          "application/json": {
            schema: z.object({
              id: z.string(), text: z.string(), type: z.string(), level: z.string(),
              regions: z.array(z.string()), explanation: z.string().nullable(),
              translation: z.string().nullable(), source: z.string().nullable(), url: z.string(),
            }).openapi({
              example: {
                id: "manca-te-ar-gherla", text: "Mânca-te-ar gherla!", type: "curse", level: "clean", regions: [],
                explanation: "Gherla = închisoare.", translation: "May the prison eat you!",
                source: "Imaginarul blestemului. Imaginea culturală a blestemului (Journal of Romanian Literary Studies 20/2020)",
                url: "https://api.uraridebine.ro/v1/entries/manca-te-ar-gherla",
              },
            }),
          },
          "text/plain": { schema: z.string().openapi({ example: "Mânca-te-ar gherla!\n" }) },
        },
      },
      400: { description: textKey("response.invalid_parameters"), ...errorContent },
      429: response429,
      404: { description: textKey("random.404"), ...errorContent },
    },
  }),
  ((c: Context) => {
    const { funny: _funny, ...q } = queryParams(c); // /random picks the funny entries by itself
    const filters = parseFilters(q);
    const textRequested = wantsText(c);
    const matching = filterEntries(filters, filters.sensitive);
    // Funny entries first; if the filters leave none, fall back to everything that matches.
    const funnyEntries = matching.filter((x) => x.funny);
    const e = funnyEntries.length ? funnyEntries : matching;
    if (!e.length) throw new HttpError(404, "No entry matches those filters.");
    const r: Entry = pick(e);
    if (textRequested) return text(c, r.text);
    return c.json({
      id: r.id,
      text: r.text,
      type: r.type,
      level: r.level,
      regions: r.regions,
      explanation: r.explanation,
      translation: r.translation,
      source: r.sources[0]?.title ?? null,
      url: `${origin(c)}/v1/entries/${r.id}`,
    });
  }) as never,
);

app.openapi(
  createRoute({
    method: "get",
    path: "/v1/today",
    tags: TAG,
    summary: textKey("today.summary"),
    description: textKey("today.description"),
    request: {
      query: z.object({
        date: param({ description: textKey("param.date"), example: "2026-11-07" }),
        format: param({ description: textKey("param.format"), example: "json" }),
      }),
    },
    responses: {
      200: {
        description: textKey("today.200"),
        content: {
          "application/json": {
            schema: EntrySchema.extend({ date: z.string() }).openapi({ example: { ...exampleEntry, date: "2026-11-07" } }),
          },
          "text/plain": { schema: z.string().openapi({ example: "Mânca-te-ar gherla!\n" }) },
        },
      },
      400: { description: textKey("response.invalid_parameters"), ...errorContent },
      429: response429,
    },
  }),
  ((c: Context) => {
    const p = queryParams(c);
    const now = clock.now();
    const today = bucharestDate(now);
    let date = today;
    if (p.date !== undefined && p.date !== "") {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.date);
      const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      if (!m || !d || d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
        throw new HttpError(400, '"date" must be a real date in YYYY-MM-DD format.');
      }
      if (p.date > today) throw new HttpError(400, `"date" cannot be in the future (today in Europe/Bucharest is ${today}).`);
      date = p.date;
    }
    const textRequested = wantsText(c);
    const e = entryOfTheDay(date);
    if (!e) throw new HttpError(404, "No funny entries to pick from.");
    // Until midnight in Bucharest; a past day never changes.
    const ttl = date === today ? Math.min(3600, secondsUntilMidnight(now)) : 3600;
    c.header("Cache-Control", `public, max-age=${ttl}`);
    c.header("Vary", "Accept");
    return textRequested ? text(c, e.text) : c.json({ ...e, date: date });
  }) as never,
);

const DescribedList = z
  .array(z.object({ name: z.string(), label: z.string(), description: z.string(), count: z.number().int() }));

function describedList(reference: Record<string, { label: string; description: string }>, camp: "themes" | "regions") {
  const n = countBy(camp);
  return Object.entries(reference).map(([name, v]) => ({ name, label: v.label, description: v.description, count: n.get(name) ?? 0 }));
}

app.openapi(
  createRoute({
    method: "get",
    path: "/v1/themes",
    tags: [textKey("tag.metadata")],
    summary: textKey("themes.summary"),
    description: textKey("themes.description"),
    responses: {
      200: {
        description: textKey("themes.200"),
        content: {
          "application/json": {
            schema: DescribedList.openapi({
              example: [{ name: "church", label: "Biserică", description: "Biserica, sfinții, preoții, rugăciunile și sărbătorile.", count: 239 }],
            }),
          },
        },
      },
      429: response429,
    },
  }),
  ((c: Context) => c.json(describedList(THEMES, "themes"))) as never,
);

app.openapi(
  createRoute({
    method: "get",
    path: "/v1/regions",
    tags: [textKey("tag.metadata")],
    summary: textKey("regions.summary"),
    description: textKey("regions.description"),
    responses: {
      200: {
        description: textKey("regions.200"),
        content: {
          "application/json": {
            schema: DescribedList.openapi({
              example: [{ name: "moldavia", label: "Moldova", description: "Regiunea istorică Moldova (România).", count: 120 }],
            }),
          },
        },
      },
      429: response429,
    },
  }),
  ((c: Context) => c.json(describedList(REGIONS, "regions"))) as never,
);

app.openapi(
  createRoute({
    method: "get",
    path: "/v1/sources",
    tags: [textKey("tag.metadata")],
    summary: textKey("sources.summary"),
    description: textKey("sources.description"),
    responses: {
      200: {
        description: textKey("sources.200"),
        content: {
          "application/json": {
            schema: z.array(z.object({
              title: z.string(), author: z.string().nullable(), year: z.union([z.number().int(), z.string()]).nullable(),
              url: z.string().nullable(), count: z.number().int(),
            })).openapi({
              example: [{
                title: "Imaginarul blestemului. Imaginea culturală a blestemului (Journal of Romanian Literary Studies 20/2020)",
                author: "Lavinia Nasta", year: 2020, url: "https://asociatia-alpha.ro/Jrls/020-2020/Jrls-020-182.pdf", count: 40,
              }],
            }),
          },
        },
      },
      429: response429,
    },
  }),
  ((c: Context) => c.json(distinctSources())) as never,
);

app.openapi(
  createRoute({
    method: "get",
    path: "/v1/generate",
    tags: [textKey("tag.generator")],
    summary: textKey("generate.summary"),
    description: textKey("generate.description"),
    request: {
      query: z.object({
        level: param({ description: textKey("param.level.generate"), example: "clean" }),
        theme: param({ description: textKey("param.theme"), example: "nature_elements" }),
        sensitive: param({ description: textKey("param.sensitive.generate"), example: "false" }),
        format: param({ description: textKey("param.format"), example: "json" }),
      }),
    },
    responses: {
      200: {
        description: textKey("generate.200"),
        content: {
          "application/json": {
            schema: z.object({
              text: z.string(), generated: z.literal(true), attested: z.literal(false), level: z.string(), warning: z.string(),
              pieces: z.object({
                pattern: z.object({ text: z.string(), entry: z.string() }),
                fill: z.object({ text: z.string(), entry: z.string() }),
              }),
            }).openapi({
              example: {
                text: "Uscă-mi-aș chiloții pe mămăliga mă-tii", generated: true, attested: false, level: "vulgar",
                warning: textKey("example.warning"),
                pieces: {
                  pattern: { text: "Uscă-mi-aș chiloții pe … mă-tii", entry: "usca-mi-as-chilotii-pe-televizorul-ma-tii" },
                  fill: { text: "mămăliga", entry: "futu-ti-mamaliga-ma-tii" },
                },
              },
            }),
          },
          "text/plain": { schema: z.string().openapi({ example: "Uscă-mi-aș chiloții pe mămăliga mă-tii\n" }) },
        },
      },
      400: { description: textKey("response.invalid_parameters"), ...errorContent },
      429: response429,
      404: { description: textKey("generate.404"), ...errorContent },
    },
  }),
  ((c: Context) => {
    const p = queryParams(c);
    const f = parseFilters({ theme: p.theme, level: p.level, sensitive: p.sensitive });
    const textRequested = wantsText(c);
    const r = generate(f.level, f.theme, f.sensitive);
    if (!r) throw new HttpError(404, "Not enough pieces to compose a curse with those filters.");
    return textRequested ? text(c, r.text) : c.json(r);
  }) as never,
);

const docConfig = (c: Context) => ({
  openapi: "3.1.0",
  info: { title: textKey("info.title"), version: "1.0.0", description: textKey("info.description"), license: { name: "MIT" } },
  servers: [{ url: origin(c) }],
  tags: [
    { name: textKey("tag.entries"), description: textKey("tag.entries.description") },
    { name: textKey("tag.metadata"), description: textKey("tag.metadata.description") },
    { name: textKey("tag.generator"), description: textKey("tag.generator.description") },
  ],
});

// The same document generated from the same routes; the texts (keys from texts.ts) are replaced with the requested language.
const documentFor = (lang: Lang) => (c: Context) =>
  c.json(translate(app.getOpenAPI31Document(docConfig(c) as never), lang));
app.get("/openapi.json", documentFor("ro"));
app.get("/openapi.en.json", documentFor("en"));

const scalarConfig = {
  sources: [
    { title: "Română", slug: "ro", url: "/openapi.json", default: true },
    { title: "English", slug: "en", url: "/openapi.en.json" },
  ],
  showDeveloperTools: "never",
  agent: { disabled: true },
  hideClientButton: true,
  defaultHttpClient: { targetKey: "shell", clientKey: "curl" },
  theme: "default",
};

app.get("/docs", (c) =>
  c.html(`<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Urări de bine · documentația API / API docs</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.77.0" integrity="sha384-+7ESN8b9Ljg46TCYKedZUlhF/wfZbOt78aV/DtoU3anEElh8Q2eXsyhQ9W5lAZD4" crossorigin="anonymous"></script>
    <script>
      Scalar.createApiReference("#app", ${JSON.stringify(scalarConfig)});
    </script>
  </body>
</html>`),
);

export default app;
