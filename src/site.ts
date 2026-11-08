import { Hono } from "hono";
import {
  REGIONS,
  THEMES,
  TYPES,
  byId,
  countBy,
  entries,
  filterEntries,
  vulgarFirst,
  parseFilters,
  type Entry,
} from "./data";

interface Bindings {
  ASSETS?: { fetch(req: Request): Promise<Response> };
}

export const ORIGIN = "https://uraridebine.ro";
export const SITE_NAME = "Urări de bine";
const PER_PAGE = 50;

// ---------- helpers ----------

/** HTML-escapes a value, for both text and double-quoted attributes. */
export const esc = (s: unknown): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const truncate = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

/** The title and description shared by the entry page and the /?id= share preview. */
export function entryMeta(e: Entry): { title: string; description: string | null } {
  const parts = [e.translation, e.sources[0]?.title].filter((x): x is string => Boolean(x));
  return {
    title: `„${e.text}” · ${SITE_NAME}`,
    description: parts.length ? truncate(parts.join(" · "), 200) : null,
  };
}

/** Replaces the content of the `<meta>` tag identified by `attribute` (e.g. `name="description"`). */
export function setMeta(html: string, attribute: string, value: string): string {
  return html.replace(
    new RegExp(`(<meta\\s+${attribute}\\s+content=")[^"]*(")`),
    (_m, a: string, b: string) => `${a}${esc(value)}${b}`,
  );
}

const TYPE_LABELS: Record<string, string> = {
  curse: "Blestem",
  swear: "Înjurătură",
  insult: "Insultă",
  euphemism: "Eufemism",
  expression: "Expresie",
};
const LEVEL_LABELS: Record<string, string> = { clean: "de spus la masă", mild: "de spus în trafic", vulgar: "de spus la meci" };

const typeBadge = (type: string) => `<span class="badge" data-i18n="type.${esc(type)}">${esc(TYPE_LABELS[type] ?? type)}</span>`;
const levelBadge = (level: string) =>
  `<span class="badge badge--level${level === "vulgar" ? " badge--vulgar" : ""}"${LEVEL_LABELS[level] ? ` data-i18n="level.badge.${esc(level)}"` : ""}>${esc(LEVEL_LABELS[level] ?? level)}</span>`;

// ---------- layout ----------

export interface LayoutOptions {
  title: string;
  description: string;
  canonical: string;
  body: string;
  lang: "ro";
  noindex?: boolean;
  script: string;
}

const FONTS = [
  "alegreya-normal-latin-400",
  "alegreya-normal-latin-ext-400",
  "kurale-normal-latin-400",
  "kurale-normal-latin-ext-400",
  "grenze-gotisch-normal-latin-500",
  "grenze-gotisch-normal-latin-ext-500",
];

export function layout(o: LayoutOptions): string {
  const title = esc(o.title);
  const description = esc(o.description);
  const canonical = esc(o.canonical);
  return `<!doctype html>
<html lang="${o.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>
    (function (d) {
      try {
        var q = new URLSearchParams(location.search).get('lang'), s = null;
        try { s = localStorage.getItem('language'); } catch (e) {}
        var l = (q === 'ro' || q === 'en') ? q : (s === 'ro' || s === 'en') ? s : 'ro';
        d.lang = l;
        if (l === 'en') d.classList.add('i18n-pending');
      } catch (e) {}
    })(document.documentElement);
  </script>
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ro_RO">
  <meta property="og:locale:alternate" content="en_US">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ORIGIN}/og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Urări de bine: blesteme, înjurături și insulte românești, cu sursa la fiecare">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${ORIGIN}/og.jpg">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="theme-color" content="#2a1d14">
${o.noindex ? '  <meta name="robots" content="noindex">\n' : ""}  <link rel="canonical" href="${canonical}" data-fixed>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
${FONTS.map((f) => `  <link rel="preload" href="/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`).join("\n")}
  <link rel="stylesheet" href="/fonts/fonts.css">
  <link rel="stylesheet" href="/styles.css">
  <link rel="modulepreload" href="/dialog.js">
  <link rel="modulepreload" href="/i18n.js">
</head>
${o.body}
  <script type="module" src="${esc(o.script)}"></script>
</body>
</html>
`;
}

const FOOTER = `  <footer class="footer">
    <p class="footer__colophon" data-i18n="footer.colophon">✠ Aici se sfârșesc urările ✠</p>
    <ul class="footer__licenses">
      <li><span data-i18n="footer.data">Datele:</span> <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license">CC BY-SA 4.0</a></li>
      <li data-i18n="footer.code">Codul: MIT</li>
    </ul>
  </footer>`;

// ---------- entry page ----------

function sourceItem(s: Entry["sources"][number]): string {
  const parts: string[] = [];
  if (s.author) parts.push(String(s.author));
  if (s.year) parts.push(String(s.year));
  if (s.page) parts.push(`p. ${s.page}`);
  const url = s.url ? String(s.url) : "";
  return `<li class="sheet__source"><cite>${esc(s.title || "Sursă fără titlu")}</cite>${
    parts.length ? `<span class="sheet__source-meta">${esc(parts.join(" · "))}</span>` : ""
  }${s.informant ? `<span class="sheet__source-meta">informator: ${esc(s.informant)}</span>` : ""}${
    /^https?:\/\//i.test(url)
      ? `<a href="${esc(url)}" target="_blank" rel="noopener" data-i18n="dialog.open">deschide sursa ↗</a>`
      : ""
  }</li>`;
}

function entryBody(e: Entry): string {
  const original = e.original_text && e.original_text.trim() !== e.text.trim() ? e.original_text : null;
  const themes = e.themes
    .map((id) => `<a href="/all?theme=${esc(encodeURIComponent(id))}" data-i18n="theme.${esc(id)}">${esc(THEMES[id]?.label ?? id)}</a>`)
    .join(", ");
  const regions = e.regions.length
    ? e.regions.map((id) => `<span data-i18n="region.${esc(id)}">${esc(REGIONS[id]?.label ?? id)}</span>`).join(", ")
    : `<span data-i18n="dialog.region.none">peste tot ori nu se știe</span>`;
  const sources = e.sources.length
    ? `<ol class="sheet__sources">${e.sources.map(sourceItem).join("")}</ol>`
    : `<p class="sheet__note" data-i18n="dialog.noSource">Fără sursă notată. Mi-a șoptit-o cineva la ureche.</p>`;
  const firstTheme = e.themes[0];
  return `<body class="page-entry">
  <a class="skip-link" href="#entry" data-i18n="all.skip">Sari la rezultate</a>
  <nav class="language" data-i18n-attr="aria-label:lang.label" aria-label="Limba">
    <button type="button" data-lang="ro" lang="ro" title="Română">RO</button>
    <button type="button" data-lang="en" lang="en" title="English">EN</button>
  </nav>
  <header class="header header--small">
    <p class="header__back"><a href="/" data-i18n="all.back">← Înapoi la blesteme</a></p>
    <p class="header__eyebrow" data-i18n="site.name" lang="ro">${SITE_NAME}</p>
    <h1 class="header__title header__title--entry" lang="ro">${esc(e.text)}</h1>
  </header>
  <main class="register">
    <article class="register__leaf entry-page" id="entry" tabindex="-1">
      <p class="sheet__label" data-i18n="dialog.label">Explicație și sursă</p>
      ${original ? `<p class="sheet__original"><span data-i18n="dialog.inSource">în sursă scrie: </span><span lang="ro">„${esc(original)}”</span></p>\n      ` : ""}<p class="rubric">${typeBadge(e.type)}${levelBadge(e.level)}${
        e.attested ? "" : `<span class="badge badge--level" data-i18n="dialog.unattested">neatestat</span>`
      }</p>
      ${e.explanation ? `<p class="sheet__explanation" lang="ro">${esc(e.explanation)}</p>\n      ` : ""}${
        e.translation ? `<p class="wish__en" lang="en"><span aria-hidden="true">EN</span>${esc(e.translation)}</p>\n      ` : ""
      }<dl class="sheet__data">
        <dt data-i18n="dialog.themes">Teme</dt><dd>${themes}</dd>
        <dt data-i18n="dialog.region">Regiune</dt><dd>${regions}</dd>
        ${e.period ? `<dt data-i18n="dialog.period">Epocă</dt><dd>${esc(e.period)}</dd>` : ""}
      </dl>
      <h2 class="sheet__subtitle">${e.sources.length === 1 ? "Sursă" : `Surse (${e.sources.length})`}</h2>
      ${sources}
      ${firstTheme ? `<p class="entry-page__links"><a href="/all?theme=${esc(encodeURIComponent(firstTheme))}" data-i18n="entry.more">Alte urări pe aceeași temă →</a></p>` : ""}
    </article>
  </main>
${FOOTER}`;
}

export function renderEntryPage(e: Entry): string {
  const { title, description } = entryMeta(e);
  return layout({
    title,
    description: description ?? `${e.text} · ${SITE_NAME}`,
    canonical: `${ORIGIN}/e/${encodeURIComponent(e.id)}`,
    body: entryBody(e),
    lang: "ro",
    noindex: e.sensitive,
    script: "/entry.js",
  });
}

// ---------- the list ----------

const FILTERS = ["type", "theme", "region", "level", "funny", "sensitive"] as const;
type Filter = (typeof FILTERS)[number];
interface ListState extends Record<Filter, string> {
  q: string;
  page: number;
}

/** The values each select offers; the rest of the URL values are dropped, like all.js does. */
function allowedValues(): Record<Filter, Set<string>> {
  const regionCounts = countBy("regions");
  return {
    type: new Set(TYPES),
    theme: new Set(Object.keys(THEMES)),
    region: new Set(Object.keys(REGIONS).filter((id) => (regionCounts.get(id) ?? 0) > 0)),
    level: new Set(["clean", "clean,mild", "vulgar"]),
    funny: new Set(["true"]),
    sensitive: new Set(["false"]),
  };
}

const NUMBER = new Intl.NumberFormat("ro-RO");

const href = (s: ListState, page: number) => {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  for (const f of FILTERS) if (s[f]) p.set(f, s[f]);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return `/all${qs ? `?${qs}` : ""}`;
};

function entryItem(e: Entry): string {
  const words = e.explanation ? e.explanation.split(/\s+/) : [];
  const explanation = words.length > 14 ? `${words.slice(0, 14).join(" ")}…` : (e.explanation ?? "");
  const tail = explanation
    ? `<span class="entry__explanation"><span lang="ro">${esc(explanation)}</span></span>`
    : e.translation
      ? `<span class="entry__explanation" lang="en">${esc(e.translation)}</span>`
      : "";
  const id = esc(e.id);
  return `<li><a class="entry" href="/e/${esc(encodeURIComponent(e.id))}" data-id="${id}"><span class="entry__head"><span class="entry__text" lang="ro">${esc(e.text)}</span><span class="entry__badges">${typeBadge(e.type)}${levelBadge(e.level)}</span></span>${tail}</a></li>`;
}

/** Fills the `public/all.html` template with the list that matches the query. */
export function renderList(templateHtml: string, url: URL): string {
  const allowed = allowedValues();
  const s = { q: (url.searchParams.get("q") ?? "").trim(), page: 1 } as ListState;
  for (const f of FILTERS) {
    const v = url.searchParams.get(f) ?? "";
    s[f] = allowed[f].has(v) ? v : "";
  }
  const requestedPage = Math.max(1, parseInt(url.searchParams.get("page") ?? "", 10) || 1);

  const filters = parseFilters({
    type: s.type, theme: s.theme, region: s.region, level: s.level || "all",
    q: s.q || undefined, funny: s.funny || undefined, sensitive: s.sensitive || undefined,
  });
  // the list shows the vulgar wishes first (all.js asks the API for the same order)
  const all = vulgarFirst(filterEntries(filters, filters.sensitive));
  const total = all.length;
  const pages = Math.ceil(total / PER_PAGE);
  s.page = Math.min(requestedPage, Math.max(1, pages));
  const results = all.slice((s.page - 1) * PER_PAGE, s.page * PER_PAGE);

  let h = templateHtml;

  // title, description and indexing
  const others = s.q !== "" || s.page > 1 || FILTERS.some((f) => f !== "theme" && s[f] !== "");
  const theme = s.theme ? THEMES[s.theme] : undefined;
  const canonical = `${ORIGIN}/all${theme ? `?theme=${encodeURIComponent(s.theme)}` : ""}`;
  if (theme) {
    const title = `${theme.label} · ${SITE_NAME}`;
    h = h.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`);
    for (const a of ['property="og:title"', 'name="twitter:title"']) h = setMeta(h, a, title);
    for (const a of ['name="description"', 'property="og:description"', 'name="twitter:description"']) h = setMeta(h, a, theme.description);
  }
  h = setMeta(h, 'property="og:url"', canonical);
  const robots = others ? '  <meta name="robots" content="noindex">\n' : `  <link rel="canonical" href="${esc(canonical)}" data-fixed>\n`;
  h = h.replace("</head>", () => `${robots}</head>`);
  h = h.replace(/(<link rel="stylesheet" href=")styles\.css(">)/, "$1/styles.css$2").replace(/(<script type="module" src=")all\.js(">)/, "$1/all.js$2");

  // the form
  if (s.q) h = h.replace('<input type="search" id="q" name="q"', () => `<input type="search" id="q" name="q" value="${esc(s.q)}"`);
  const themeOptions = Object.entries(THEMES).map(([id, v]) => `<option value="${esc(id)}" data-name="${esc(v.label)}">${esc(v.label)}</option>`);
  const regionCounts = countBy("regions");
  const regionOptions = Object.entries(REGIONS)
    .filter(([id]) => (regionCounts.get(id) ?? 0) > 0)
    .map(([id, v]) => `<option value="${esc(id)}" data-name="${esc(v.label)}">${esc(v.label)}</option>`);
  const inSelect = (id: string, extra: string[], value: string) => {
    h = h.replace(new RegExp(`(<select id="${id}"[^>]*>)([\\s\\S]*?)(</select>)`), (_m, a: string, body: string, z: string) => {
      let b = body.replace(/\s*$/, "") + (extra.length ? `\n            ${extra.join("\n            ")}\n          ` : "\n          ");
      if (value) b = b.replace(`<option value="${esc(value)}"`, `<option value="${esc(value)}" selected`);
      return `${a}${b}${z}`;
    });
  };
  inSelect("f-type", [], s.type);
  inSelect("f-theme", themeOptions, s.theme);
  inSelect("f-region", regionOptions, s.region);
  inSelect("f-level", [], s.level);
  inSelect("f-funny", [], s.funny);
  inSelect("f-sensitive", [], s.sensitive);

  // status and list
  const totalText = total === 1 ? "O singură intrare" : `Am găsit ${NUMBER.format(total)}`;
  h = h.replace('<output id="total" aria-live="polite"></output>', () => `<output id="total" aria-live="polite">${esc(totalText)}</output>`);
  if (s.q || FILTERS.some((f) => s[f])) h = h.replace(' data-i18n="all.clear" hidden>', ' data-i18n="all.clear">');
  h = h.replace(
    '<ol class="list" id="list" aria-busy="true"></ol>',
    () => `<ol class="list" id="list" start="${(s.page - 1) * PER_PAGE + 1}" data-rendered>${results.map(entryItem).join("\n")}</ol>`,
  );
  if (!results.length) {
    h = h.replace(
      '<div class="list__empty" id="empty" hidden></div>',
      '<div class="list__empty" id="empty"><p class="error__title">Nimic.</p><p class="error__text">Nici bunica nu știe una ca asta. Încearcă alt cuvânt sau scoate un filtru.</p></div>',
    );
  }

  // pagination
  if (pages > 1) {
    h = h.replace(' hidden aria-label="Paginare"', ' aria-label="Paginare"');
    const link = (id: string, page: number, ok: boolean, key: string, text: string) =>
      `<a class="action action--open" id="${id}"${ok ? ` href="${esc(href(s, page))}"` : ' aria-disabled="true"'} data-i18n="${key}">${text}</a>`;
    h = h.replace(/<button type="button" class="action action--open" id="prev"[^>]*>[^<]*<\/button>/, () =>
      link("prev", s.page - 1, s.page > 1, "all.previous", "← Pagina dinainte"));
    h = h.replace(/<button type="button" class="action action--open" id="next"[^>]*>[^<]*<\/button>/, () =>
      link("next", s.page + 1, s.page < pages, "all.next", "Pagina următoare →"));
    h = h.replace('<span class="pagination__where" id="where"></span>', () => `<span class="pagination__where" id="where">pagina ${s.page} din ${pages}</span>`);
  }

  // the data, so the client does not ask for it again
  const data = JSON.stringify({ total, page: s.page, per_page: PER_PAGE, pages, results }).replace(/<\//g, "<\\/");
  h = h.replace("</main>", () => `  <script type="application/json" id="initial-data">${data}</script>\n  </main>`);
  return h;
}

// ---------- sitemap ----------

export function renderSitemap(): string {
  const themeCounts = countBy("themes");
  const urls = [`${ORIGIN}/`, `${ORIGIN}/all`];
  for (const id of Object.keys(THEMES)) if ((themeCounts.get(id) ?? 0) > 0) urls.push(`${ORIGIN}/all?theme=${encodeURIComponent(id)}`);
  for (const e of entries) if (e.attested && !e.sensitive) urls.push(`${ORIGIN}/e/${encodeURIComponent(e.id)}`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u.replace(/&/g, "&amp;")}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
}

// ---------- routes ----------

export const site = new Hono<{ Bindings: Bindings }>();

const html = (body: string, status: 200 | 404 = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

site.get("/e/:id", async (c) => {
  const e = byId.get(c.req.param("id"));
  if (!e) {
    if (c.env?.ASSETS) {
      const r = await c.env.ASSETS.fetch(new Request(new URL("/404.html", c.req.url)));
      return html(await r.text(), 404);
    }
    return c.text("Not found", 404);
  }
  return html(renderEntryPage(e));
});

site.get("/all", async (c) => {
  if (!c.env?.ASSETS) return c.text("Not found", 404);
  const r = await c.env.ASSETS.fetch(new Request(new URL("/all.html", c.req.url)));
  if (!r.ok) return r;
  return html(renderList(await r.text(), new URL(c.req.url)));
});

site.get("/sitemap.xml", (c) =>
  c.body(renderSitemap(), 200, { "Content-Type": "application/xml; charset=utf-8" }),
);
