/**
 * All human-readable texts of the OpenAPI specification, in Romanian (`ro`) and English (`en`).
 * The routes in index.ts use only the keys; when serving, the keys are replaced with the text in the requested language.
 * Routes, parameters, fields and JSON values are in English; the content (text, explanation, source titles)
 * stays in Romanian. Error messages are in English in both languages.
 */
export type Lang = "ro" | "en";

const T = {
  // ---------- info ----------
  "info.title": {
    ro: "Urări de bine: API",
    en: "Urări de bine: the Romanian curses API",
  },
  "info.description": {
    ro: "Blesteme, înjurături și insulte românești, fiecare cu sursa de unde a fost luată: culegeri de folclor, dicționare, cărți, presă. API-ul e gratuit, fără cont și fără cheie. Rutele, parametrii și câmpurile sunt în engleză, iar formulele, explicațiile și titlurile surselor sunt în română. Primești din toate nivelurile (`clean`, `mild`, `vulgar`). Dacă vrei doar chestii pe care le poți zice și de față cu copiii, pune `level=clean`. Insultele la adresa unor etnii sau grupuri le-am păstrat doar dacă apar în surse vechi, și vin implicit. Le scoți cu `sensitive=false` la `/v1/entries`, `/v1/random` și `/v1/generate`. Limita e de 120 de cereri pe minut per IP.",
    en: "A free, public API of Romanian curses, swears and insults, each with the published source it comes from. No account or key needed. Routes, parameters and fields are in English. The entries themselves, their explanations and the source titles are in Romanian. You get all levels by default (`clean`, `mild`, `vulgar`). Add `level=clean` if you want only the clean ones. Sensitive entries (historically attested ethnic or group slurs) are included by default. Add `sensitive=false` to leave them out of `/v1/entries`, `/v1/random` and `/v1/generate`. The limit is 120 requests per minute per IP.",
  },

  // ---------- tags ----------
  "tag.entries": { ro: "Formule", en: "Entries" },
  "tag.entries.description": {
    ro: "Caută, listează, ia una la întâmplare sau vezi urarea zilei.",
    en: "Search, list, pick a random entry or get the wish of the day.",
  },
  "tag.metadata": { ro: "Teme, regiuni, surse", en: "Metadata" },
  "tag.metadata.description": {
    ro: "Valorile pe care le poți folosi la filtre și sursele formulelor.",
    en: "Themes, regions and sources.",
  },
  "tag.generator": { ro: "Generator", en: "Generator" },
  "tag.generator.description": {
    ro: "Blesteme noi, făcute din bucăți de blesteme reale.",
    en: "Automatically composed curses (`curse` = a curse wishing harm on someone).",
  },

  // ---------- common parameters ----------
  "param.type": {
    ro: "Tipul formulei: curse (blestem), swear (înjurătură), insult (insultă), euphemism (eufemism), expression (expresie). Poți pune mai multe, separate prin virgulă.",
    en: "Comma-separated list of entry types: curse, swear, insult, euphemism, expression.",
  },
  "param.theme": {
    ro: "Tema formulei, de exemplu church sau devil_hell. Lista completă e la /v1/themes. Poți pune mai multe, separate prin virgulă.",
    en: "One or more themes from /v1/themes (comma-separated). An entry matches if it has at least one of them.",
  },
  "param.region": {
    ro: "Regiunea formulei, de exemplu moldavia sau banat. Lista completă e la /v1/regions. Multe formule nu au regiune, pentru că sursa nu o spune.",
    en: "One or more regions from /v1/regions (comma-separated). Many entries have no region, because their source doesn't say.",
  },
  "param.level": {
    ro: "Nivelul: clean (curat), mild (mediu), vulgar. Poți pune mai multe, separate prin virgulă, sau all. Implicit e all.",
    en: "Level of coarseness: clean, mild, vulgar, as a comma-separated list, or all. Default: all.",
  },
  "param.level.generate": {
    ro: "Nivelul: clean, mild, vulgar, sau all (implicit). Poți pune mai multe, separate prin virgulă. Ambele bucăți ale blestemului vin din formule cu nivelul ales.",
    en: "clean, mild, vulgar, comma-separated, or all. Default: all. Both parts of the curse come from entries of the requested levels.",
  },
  "param.attested": {
    ro: "true (implicit) pentru formulele găsite într-o sursă, false pentru cele neconfirmate, all pentru amândouă.",
    en: "Whether the entry is attested in a source: true, false or all. Default: true.",
  },
  "param.form": {
    ro: "Forma gramaticală: optative („Mânca-te-ar…”), subjunctive („Să te…”), imperative („Bată-te…”), nominal („Grijania mă-tii”), single_word (un singur cuvânt), other (alta). Poți pune mai multe, separate prin virgulă.",
    en: "Grammatical form, comma-separated: optative (\"may X happen to you\"), subjunctive, imperative, nominal, single_word, other.",
  },
  "param.q": {
    ro: "Caută în text, în forma din sursă, în explicație și în traducere. Merge și fără diacritice.",
    en: "Text search, ignoring case and diacritics, in text, original_text, explanation and translation.",
  },
  "param.sensitive": {
    ro: "Cu false se scot insultele la adresa unor etnii sau grupuri. Implicit e true, adică apar.",
    en: "false leaves out sensitive entries (historically attested ethnic or group slurs). Default: true.",
  },
  "param.sensitive.generate": {
    ro: "Cu false, bucățile blestemului nu vin din insulte la adresa unor etnii sau grupuri. Implicit e true, adică pot veni.",
    en: "false keeps sensitive entries (historically attested ethnic or group slurs) out of the pieces. Default: true.",
  },
  "param.funny": {
    ro: "true întoarce doar formulele haioase, false doar pe celelalte. Dacă lipsește, nu se filtrează după asta.",
    en: "true returns only the funny ones, false only the rest. Leave it out for no filtering on this.",
  },
  "param.page": { ro: "Pagina, de la 1, cel mult 100000. Implicit 1.", en: "Page number (1 to 100000). Default: 1." },
  "param.per_page": {
    ro: "Câte rezultate pe pagină, între 1 și 100. Implicit 20.",
    en: "Results per page (1–100). Default: 20.",
  },
  "param.sort": {
    ro: "id (implicit, în ordine alfabetică) sau vulgar, ca să vină întâi cele vulgare, apoi cele medii, apoi cele curate.",
    en: "id (default, alphabetical) or vulgar, for the vulgar ones first, then the mild, then the clean.",
  },
  "param.format": {
    ro: "json (implicit) sau text, dacă vrei doar formula, ca text simplu.",
    en: "json (default) or text for a plain-text response.",
  },
  "param.date": {
    ro: "Ziua, în formatul YYYY-MM-DD (după ora din București). Implicit e azi. O zi din viitor dă 400.",
    en: "The day, as YYYY-MM-DD (Europe/Bucharest). Default: today. A future date gives 400.",
  },
  "param.id": {
    ro: "Id-ul formulei, de exemplu manca-te-ar-gherla.",
    en: "Entry identifier.",
  },

  // ---------- common responses ----------
  "response.invalid_parameters": { ro: "Un parametru are o valoare invalidă", en: "Invalid parameters" },
  "response.rate_limit": {
    ro: "Prea multe cereri: cel mult 120 pe minut per IP. Vezi headerul Retry-After.",
    en: "Too many requests: at most 120 per minute per IP. See the Retry-After header.",
  },

  // ---------- example messages (the API error messages are in English in both languages) ----------
  "example.error": { ro: "No entry with id \"manca-te-ar-zmeul\".", en: "No entry with id \"manca-te-ar-zmeul\"." },
  "example.warning": {
    ro: "A curse composed automatically from attested pieces. As a whole, it appears in no source.",
    en: "A curse composed automatically from attested pieces. As a whole, it appears in no source.",
  },

  // ---------- /v1/entries ----------
  "list.summary": {
    ro: "Lista formulelor, cu filtre și paginare",
    en: "List entries, with filters and pagination",
  },
  "list.description": {
    ro: "Întoarce formulele paginat, în ordine alfabetică după `id`, sau cu cele vulgare întâi dacă pui `sort=vulgar`. Implicit vin doar cele găsite într-o sursă.",
    en: "Returns attested entries, a page at a time, sorted alphabetically by `id`, or vulgar first with `sort=vulgar`.",
  },
  "list.200": { ro: "O pagină de rezultate", en: "A page of results" },

  // ---------- /v1/entries/{id} ----------
  "entry.summary": { ro: "O formulă după id", en: "Get one entry by id" },
  "entry.description": {
    ro: "Întoarce formula completă, cu surse, explicație și traducere. Merge și pentru formulele sensibile sau neconfirmate.",
    en: "Returns the full entry, even if it is sensitive or unattested.",
  },
  "entry.200": { ro: "Formula", en: "The full entry" },
  "entry.404": { ro: "Nu există o formulă cu id-ul ăsta", en: "No entry with this id" },

  // ---------- /v1/random ----------
  "random.summary": {
    ro: "O formulă la întâmplare",
    en: "A random entry",
  },
  "random.description": {
    ro: "Are aceleași filtre ca lista. Alege mai întâi dintre formulele haioase. Dacă filtrele nu lasă niciuna, alege dintre toate cele care se potrivesc. Pentru doar text, adaugă `?format=text` sau trimite `Accept: text/plain`.",
    en: "Same filters as the list. It picks from the funny entries first. If the filters leave none, it picks from everything that matches. For just the text, add `?format=text` or send `Accept: text/plain`.",
  },
  "random.200": {
    ro: "O formulă (JSON) sau doar textul ei",
    en: "One entry (JSON), or just its text (text/plain)",
  },
  "random.404": {
    ro: "Nicio formulă nu se potrivește cu filtrele",
    en: "No entry matches the filters",
  },

  // ---------- /v1/today ----------
  "today.summary": {
    ro: "Urarea zilei",
    en: "Wish of the day",
  },
  "today.description": {
    ro: "O formulă haioasă pe zi, aceeași pentru toată lumea, după ziua calendaristică din București (Europe/Bucharest). Se alege dintre formulele cu `funny: true` și nu se repetă până nu au trecut toate. Răspunsul e formula întreagă, plus `date`. Cu `date=YYYY-MM-DD` primești urarea unei alte zile (nu din viitor). Pentru doar text, adaugă `?format=text` sau trimite `Accept: text/plain`.",
    en: "One funny entry per calendar day (Europe/Bucharest), the same for everyone. It is picked from the entries with `funny: true` and does not repeat until all of them have had their day. The response is the full entry plus `date`. Use `date=YYYY-MM-DD` for another day (not in the future). For just the text, add `?format=text` or send `Accept: text/plain`.",
  },
  "today.200": {
    ro: "Formula zilei (JSON, cu `date`) sau doar textul ei",
    en: "The entry of the day (JSON, with `date`), or just its text (text/plain)",
  },

  // ---------- /v1/themes, /v1/regions ----------
  "themes.summary": { ro: "Temele", en: "Available themes" },
  "themes.description": {
    ro: "Fiecare temă are `name` (valoarea pentru filtru), `label` (numele ei), `description`, `count`, numărul de formule confirmate din toate nivelurile, și `levels`, același număr împărțit pe niveluri.",
    en: "Each theme has `name` (the filter value), `label` (its Romanian display name), `description`, `count`, the number of attested entries at all levels, and `levels`, the same count split by level.",
  },
  "themes.200": { ro: "Temele", en: "List of themes" },
  "regions.summary": { ro: "Regiunile", en: "Available regions" },
  "regions.description": {
    ro: "Fiecare regiune are `name` (valoarea pentru filtru), `label` (numele ei), `description`, `count`, numărul de formule confirmate din toate nivelurile, și `levels`, același număr împărțit pe niveluri.",
    en: "Each region has `name` (the filter value), `label` (its Romanian display name), `description`, `count`, the number of attested entries at all levels, and `levels`, the same count split by level.",
  },
  "regions.200": { ro: "Regiunile", en: "List of regions" },

  // ---------- /v1/sources ----------
  "sources.summary": {
    ro: "Sursele",
    en: "Distinct sources and their entry counts",
  },
  "sources.description": {
    ro: "Cărțile, articolele, dicționarele și discuțiile din care vin formulele, fiecare cu numărul de formule (`count`) luate de acolo. Sunt sortate descrescător după acest număr.",
    en: "Sources are distinguished by `url`, or by `title` when there is no url. Sorted by `count` of entries, descending.",
  },
  "sources.200": { ro: "Sursele", en: "List of sources" },

  // ---------- /v1/generate ----------
  "generate.summary": {
    ro: "Un blestem nou, generat la cerere",
    en: "A new curse, generated on request",
  },
  "generate.description": {
    ro: "Alege la întâmplare unul dintre două tipare. Primul e un blestem („Mânca-te-ar gherla”), cu verbul dintr-o formulă și pacostea (`affliction`) din alta. Al doilea e o înjurătură cu „mă-tii” („Uscă-mi-aș chiloții pe mămăliga mă-tii”), cu locul liber completat cu un obiect dintr-o altă formulă. Toate bucățile sunt atestate, dar rezultatul nu apare în nicio sursă. Cu `level` și `theme` alegi formulele din care se iau bucățile, iar cu `sensitive=false` le scoți pe cele sensibile. `level` din răspuns e cel mai puternic dintre nivelurile celor două bucăți.",
    en: "Picks at random between two kinds of curses. First: an optative curse (\"Mânca-te-ar gherla\"), the verb from one entry and the `affliction` from another, with the clitic normalised to \"-te-ar\". Second: a \"... mă-tii\" insult with a gap filled by an object taken from another entry. All parts come from attested entries, but the result is NOT an attested formula. `level` and `theme` limit the entries the parts come from (`theme` applies to the filling part), and `sensitive=false` leaves out sensitive entries; the returned `level` is the stronger of the two parts. `pieces.pattern` is the pattern with a gap (\"…\"), `pieces.fill` what fills it.",
  },
  "generate.200": {
    ro: "Blestemul generat (JSON) sau doar textul lui",
    en: "The generated curse (JSON), or just its text (text/plain)",
  },
  "generate.404": {
    ro: "Cu filtrele astea nu există destule formule ca să generăm un blestem",
    en: "No parts available for the given filters",
  },
} as const satisfies Record<string, Record<Lang, string>>;

export type TextKey = keyof typeof T;

/** The texts, by key. */
export const TEXTS: Record<TextKey, Record<Lang, string>> = T;

/** Used in route definitions: returns the key, which is replaced with the text in the requested language when serving. */
export const textKey = <C extends TextKey>(key: C): C => key;

/** Recursively replaces any string equal to a key in TEXTS with the text in the requested language. */
export function translate<V>(value: V, lang: Lang): V {
  if (typeof value === "string") {
    return (Object.hasOwn(TEXTS, value) ? TEXTS[value as TextKey][lang] : value) as V;
  }
  if (Array.isArray(value)) return value.map((v) => translate(v, lang)) as V;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([c, v]) => [c, translate(v, lang)])) as V;
  }
  return value;
}
