// Urări de bine — all interface texts, in Romanian and English, plus the language switch.
// The wishes themselves (the data) stay in Romanian; this file only holds the texts around them.
//
// In HTML:  data-i18n="key"          → textContent
//           data-i18n-html="key"     → innerHTML (own texts only, with <code>/<em>)
//           data-i18n-attr="aria-label:key;placeholder:key"

export const LANGUAGES = ['ro', 'en'];

export const DICT = {
  /* ---------- common ---------- */
  'lang.label': { ro: 'Limba', en: 'Language' },
  'site.name': { ro: 'Urări de bine', en: 'Urări de bine' },
  'site.subtitle': { ro: 'Blesteme, înjurături și insulte românești, cu tot cu sursa', en: 'Romanian curses, oaths and insults, sources included' },
  'footer.colophon': { ro: '✠ Aici se sfârșesc urările ✠', en: '✠ Here endeth the good wishes ✠' },
  'footer.data': { ro: 'Datele:', en: 'Data:' },
  'footer.code': { ro: 'Codul: MIT', en: 'Code: MIT' },
  'footer.coffee': { ro: 'Cumpără-mi o cafea', en: 'Buy me a coffee' },
  'var.total': { ro: 'Peste o mie', en: 'Over a thousand' },
  'in.romanian': { ro: '', en: 'in Romanian' },
  'generated': { ro: 'generat, nu atestat', en: 'made up, not attested' },
  // on the leaf, the list and the dialog the level reads like the menu on the home page
  'level.badge.clean': { ro: 'de spus la masă', en: 'for Sunday lunch' },
  'level.badge.mild': { ro: 'de spus în trafic', en: 'for traffic jams' },
  'level.badge.vulgar': { ro: 'de spus la meci', en: 'for the stands' },
  'uncategorized': { ro: 'Necategorisit', en: 'Uncategorised' },

  'error.network.title': { ro: 'S-a rupt firul cu mănăstirea.', en: 'The line to the monastery is down.' },
  'error.network.text': {
    ro: 'Nu ajungem la server. Verifică internetul, fă-ți o cruce și mai încearcă.',
    en: "Can't reach the server. Check your connection, cross yourself and try again.",
  },
  'error.tooMany.title': { ro: 'Ușurel, că nu ard lumânările așa repede.', en: "Easy now, the candles don't burn that fast." },
  'error.tooMany.text': {
    ro: 'Te-ai blestemat destul pe minutul ăsta. Respiră o dată și revino peste câteva clipe.',
    en: "You've done enough cursing for one minute. Take a breath and come back in a moment.",
  },
  'error.nothing.title': { ro: 'Nimic nu se potrivește.', en: 'Nothing fits.' },
  'error.nothing.text': {
    ro: 'Cu filtrele astea nici bunica n-ar avea ce să-ți zică. Încearcă altă temă sau alt nivel.',
    en: 'With these filters even grandma would be lost for words. Try another theme or level.',
  },
  'error.generated.title': { ro: 'N-am din ce să cos.', en: 'Nothing to stitch with.' },
  'error.generated.text': {
    ro: 'Croitorul de blesteme a rămas fără material și stă cu acul în aer. Mai încearcă o dată.',
    en: 'The curse tailor has run out of material and is standing there, needle in the air. Try once more.',
  },
  'error.filters.title': { ro: 'Filtre cam ciudate.', en: 'Odd-looking filters.' },
  'error.filters.text': {
    ro: 'Linkul ăsta are niște filtre pe care nu le știm. Le-am scos.',
    en: "This link has some filters that don't exist here. They've been removed.",
  },
  'error.unknownId.title': { ro: 'N-am găsit urarea.', en: "Wish not found." },
  'error.unknownId.text': { ro: 'Linkul ăsta nu duce la nicio urare. Poate a fost scoasă.', en: "This link doesn't lead to any wish. It may have been removed." },
  'error.server.title': { ro: 'S-a blestemat singur serverul.', en: 'The server cursed itself.' },
  'error.server.text': {
    ro: 'S-a stricat ceva pe server, nu la tine. Mai încearcă peste puțin.',
    en: "Something broke on the server, not on your end. Try again a bit later.",
  },

  /* ---------- types, levels, themes, regions ---------- */
  'type.curse': { ro: 'Blestem', en: 'Curse' },
  'type.swear': { ro: 'Înjurătură', en: 'Swear' },
  'type.insult': { ro: 'Insultă', en: 'Insult' },
  'type.euphemism': { ro: 'Eufemism', en: 'Euphemism' },
  'type.expression': { ro: 'Expresie', en: 'Expression' },

  'level.clean': { ro: 'curat', en: 'clean' },
  'level.mild': { ro: 'mediu', en: 'mild' },
  'level.vulgar': { ro: 'vulgar', en: 'vulgar' },

  'theme.church': { ro: 'Biserică', en: 'Church' },
  'theme.devil_hell': { ro: 'Drac și iad', en: 'The devil and hell' },
  'theme.sickness_death': { ro: 'Boală și moarte', en: 'Sickness and death' },
  'theme.farm_animals': { ro: 'Gospodărie și animale', en: 'Farmyard and animals' },
  'theme.prison': { ro: 'Pușcărie', en: 'Prison' },
  'theme.birds_of_prey': { ro: 'Păsări de pradă', en: 'Birds of prey' },
  'theme.nature_elements': { ro: 'Natură și stihii', en: 'Nature and the elements' },
  'theme.family': { ro: 'Familie', en: 'Family' },
  'theme.body': { ro: 'Corp', en: 'The body' },
  'theme.sexual': { ro: 'Sexual', en: 'Sexual' },
  'theme.places': { ro: 'Localități', en: 'Places' },
  'theme.modern': { ro: 'Modern', en: 'Modern' },
  'theme.poverty': { ro: 'Sărăcie', en: 'Poverty' },
  'theme.other': { ro: 'Altele', en: 'Other' },

  'region.general': { ro: 'General', en: 'Everywhere' },
  'region.moldavia': { ro: 'Moldova', en: 'Moldavia' },
  'region.bukovina': { ro: 'Bucovina', en: 'Bukovina' },
  'region.maramures': { ro: 'Maramureș', en: 'Maramureș' },
  'region.transylvania': { ro: 'Transilvania', en: 'Transylvania' },
  'region.crisana': { ro: 'Crișana', en: 'Crișana' },
  'region.banat': { ro: 'Banat', en: 'Banat' },
  'region.oltenia': { ro: 'Oltenia', en: 'Oltenia' },
  'region.wallachia': { ro: 'Muntenia', en: 'Wallachia' },
  'region.dobruja': { ro: 'Dobrogea', en: 'Dobruja' },
  'region.republic_of_moldova': { ro: 'Republica Moldova', en: 'Republic of Moldova' },
  'region.serbia': { ro: 'Serbia', en: 'Serbia' },
  'region.ukraine': { ro: 'Ucraina', en: 'Ukraine' },
  'region.hungary': { ro: 'Ungaria', en: 'Hungary' },
  'region.aromanian': { ro: 'Aromână', en: 'Aromanian' },
  'region.megleno_romanian': { ro: 'Meglenoromână', en: 'Megleno-Romanian' },
  'region.istro_romanian': { ro: 'Istroromână', en: 'Istro-Romanian' },

  /* ---------- home page ---------- */
  'home.meta.title': {
    ro: 'Urări de bine · blesteme, înjurături și insulte românești, cu tot cu sursa',
    en: 'Urări de bine · Romanian curses, oaths and insults, sources included',
  },
  'home.meta.desc': {
    ro: 'Peste 1.300 de blesteme, înjurături și insulte românești, cu sursa scrisă la fiecare. Apeși un buton și primești o urare de bine.',
    en: 'Over 1,300 Romanian curses, swears and insults, each with its source. Press a button and get a good wish.',
  },
  'home.skip': { ro: 'Sari la blestem', en: 'Skip to the curse' },
  'home.desc': { ro: '<strong>{total}</strong> de urări din bătrâni, toate cu acte în regulă. Pentru rude, vecini și foști.', en: '<strong>{total}</strong> old-world wishes, all with their papers in order. For relatives, neighbours and exes.' },
  'home.altar': { ro: 'Primește un blestem', en: 'Get a curse' },
  'home.settings': { ro: 'Setări pentru blesteme', en: 'Curse settings' },
  'home.sentence.a': { ro: 'Vreau o urare', en: 'I want a wish' },
  'home.sentence.b': { ro: 'despre', en: 'about' },
  'home.level': { ro: 'Cât de tare să doară?', en: 'How much should it hurt?' },
  'home.option.clean': { ro: 'ușurică, de spus la masă', en: 'gentle, for Sunday lunch' },
  'home.option.mild': { ro: 'zdravănă, de spus în trafic', en: 'proper, for traffic jams' },
  'home.option.vulgar': { ro: 'fără milă, de spus la meci', en: 'merciless, for the stands' },
  'home.theme': { ro: 'Temă', en: 'Theme' },
  'home.theme.any': { ro: 'orice, Doamne-ajută', en: 'anything, God help us' },
  'home.wishButton': { ro: 'Urează-i de bine cuiva!', en: 'Wish someone well!' },
  'home.dayLabel': { ro: 'Urarea zilei · {date}', en: 'Wish of the day · {date}' },
  'home.themes.sub': { ro: 'Alege o temă ca să vezi toate urările din ea.', en: 'Pick a theme to see every wish in it.' },
  'home.themes.title': { ro: 'Pregătește-ți urarea', en: 'Get your wish ready' },
  'home.shortcut.r': { ro: 'Scurtătură de tastatură: R', en: 'Keyboard shortcut: R' },
  'home.shortcut.c': { ro: 'Scurtătură de tastatură: C', en: 'Keyboard shortcut: C' },
  'home.generate': { ro: '…sau inventează una pe loc!', en: '…or make one up on the spot!' },
  'home.card': { ro: 'Urarea', en: 'Wish' },
  'home.card.empty': { ro: 'lipsă', en: 'none' },
  'home.empty': { ro: 'Încă nicio urare. Amicul tău doarme liniștit.', en: 'No wish yet. Your friend is still sleeping soundly.' },
  'home.empty.sub': { ro: 'Deocamdată.', en: 'For now.' },
  'home.explain': { ro: 'Ce înseamnă?', en: 'What\'s it mean?' },
  'home.copy': { ro: 'Copiază', en: 'Copy' },
  'home.share': { ro: 'Trimite-o cuiva', en: 'Send it to someone' },
  'home.source': { ro: 'Sursa: ', en: 'Source: ' },
  'home.browse': { ro: 'Răsfoiește toate intrările', en: 'Browse all the entries' },
  'home.browse.count': { ro: 'Răsfoiește toate cele {total}', en: 'Browse all {total} of them' },
  'toast.copied': { ro: 'Copiat. Folosește-l cu înțelepciune.', en: 'Copied. Use it wisely.' },
  'toast.notCopied': { ro: 'Nu s-a putut copia. Scrie-l de mână, ca-n vechime.', en: "Couldn't copy it. Write it out by hand, like in the old days." },
  'toast.notShared': { ro: 'Nu s-a putut copia. Blestemul rămâne între noi.', en: "Couldn't copy it. The curse stays between us." },
  'share.generated': { ro: '(blestem făcut în casă, fără certificat de proveniență)', en: '(homemade curse, no certificate of origin)' },
  'share.wish.1': { ro: 'Dragă cunoștință, cu ocazia zilei de azi îți urez din toată inima: „{wish}” Cu stimă și considerație.', en: 'Dear acquaintance, on this fine day I wish you with all my heart: “{wish}” Yours respectfully.' },
  'share.wish.2': { ro: 'Mi-a zis bunica să-ți transmit: „{wish}” Și să mănânci ceva cald.', en: 'Grandma asked me to pass this on: “{wish}” And to eat something warm.' },
  'share.wish.3': { ro: 'Am aprins o lumânare pentru tine și m-am rugat așa: „{wish}” Amin.', en: 'I lit a candle for you and prayed: “{wish}” Amen.' },
  'share.wish.4': { ro: 'La mulți ani! Știu că nu e ziua ta, dar țin să-ți urez: „{wish}”', en: "Happy birthday! I know it isn't, but still: “{wish}”" },
  'share.wish.5': { ro: 'Stimate domn, stimată doamnă, în urma unei analize atente, vă comunicăm următoarea urare de bine: „{wish}” Cu deosebită considerație, conducerea.', en: 'Dear Sir or Madam, after careful consideration we are pleased to send you the following warm wishes: “{wish}” Kind regards, the Management.' },
  'share.wish.6': { ro: 'Te-am iertat. Dar înainte de asta: „{wish}”', en: 'I forgive you. But first: “{wish}”' },
  'share.wish.7': { ro: 'Gânduri bune de la mine pentru tine și ai tăi: „{wish}” Pupici!', en: 'Warm thoughts from me to you and yours: “{wish}” Hugs!' },
  'share.wish.8': { ro: 'Cu ocazia sărbătorilor care vin (sau care au trecut), primește din partea mea: „{wish}”', en: 'For the upcoming holidays (or the ones that passed), please accept: “{wish}”' },

  'dev.title': { ro: 'Ai o idee nebună?', en: 'Got a crazy idea?' },
  'dev.text': { ro: 'Un bot de Discord, o aplicație sau o felicitare pentru soacră? Urările sunt și în API.', en: 'A Discord bot that curses its members, an app that wishes you well on every failed build, a card for your mother-in-law? Take the wishes from the API. It\'s free, no account, no key.' },
  'dev.ex1': { ro: 'O urare la nimereală', en: 'One at random' },
  'dev.ex2': { ro: 'Doar cu draci, fără vulgarități', en: 'Devil-themed only, nothing vulgar' },
  'dev.try': { ro: 'Încearcă', en: 'Try it' },
  'dev.try.loading': { ro: 'Se încarcă…', en: 'Loading…' },
  'dev.copy': { ro: 'Copiază', en: 'Copy' },
  'dev.copied': { ro: 'Copiat ✓', en: 'Copied ✓' },
  'dev.error': { ro: 'Eroare', en: 'Error' },
  'dev.docs': { ro: 'Documentația', en: 'Documentation' },
  'dev.docs.sub': { ro: 'toate rutele și parametrii, cu exemple', en: 'every route and parameter, with examples' },
  'dev.github': { ro: 'GitHub', en: 'GitHub' },
  'dev.github.sub': { ro: 'codul, datele și cum trimiți o urare nouă', en: 'the code, the data and how to send a new one' },

  /* ---------- dialog ---------- */
  'dialog.label': { ro: 'Explicație și sursă', en: 'Meaning and source' },
  'dialog.close': { ro: 'Închide', en: 'Close' },
  'dialog.loading': { ro: 'Caut urarea…', en: 'Looking for it…' },
  'dialog.notFound': { ro: 'N-am găsit urarea.', en: "Couldn't find it." },
  'dialog.error.nothing': { ro: 'Intrarea asta nu mai e în carte. Poate a șters-o cineva cu buretele.', en: "This entry isn't in the book any more. Someone may have wiped it off." },
  'dialog.inSource': { ro: 'în sursă scrie: ', en: 'as written in the source: ' },
  'dialog.unattested': { ro: 'neatestat', en: 'unattested' },
  'dialog.themes': { ro: 'Teme', en: 'Themes' },
  'dialog.region': { ro: 'Regiune', en: 'Region' },
  'dialog.region.none': { ro: 'peste tot ori nu se știe', en: 'everywhere, or nobody knows' },
  'dialog.period': { ro: 'Epocă', en: 'Period' },
  'dialog.source': { ro: 'Sursă', en: 'Source' },
  'dialog.sources': { ro: 'Surse ({n})', en: 'Sources ({n})' },
  'dialog.untitled': { ro: 'Sursă fără titlu', en: 'Untitled source' },
  'dialog.page': { ro: 'p. {page}', en: 'p. {page}' },
  'dialog.informant': { ro: 'informator: {informant}', en: 'informant: {informant}' },
  'entry.informant': { ro: 'informator:', en: 'informant:' },
  'entry.sources': { ro: 'Surse', en: 'Sources' },
  'entry.skip': { ro: 'Sari la urare', en: 'Skip to the wish' },
  'dialog.open': { ro: 'deschide sursa ↗', en: 'open the source ↗' },
  'dialog.noSource': { ro: 'Fără sursă notată. Mi-a șoptit-o cineva la ureche.', en: 'No source noted. Someone whispered it in my ear.' },
  'dialog.back': { ro: '← înapoi la blestemul compus', en: '← back to the made-up curse' },
  'dialog.madeOf': { ro: 'Din ce e făcută', en: "What it's made of" },
  'dialog.pattern': { ro: 'tiparul', en: 'the pattern' },
  'dialog.fill': { ro: 'ce s-a pus în gol', en: 'what filled the gap' },
  'share.title': { ro: 'Trimite mai departe', en: 'Pass it on' },
  'share.whatsapp': { ro: 'WhatsApp', en: 'WhatsApp' },
  'share.telegram': { ro: 'Telegram', en: 'Telegram' },
  'share.facebook': { ro: 'Facebook', en: 'Facebook' },
  'share.x': { ro: 'X', en: 'X' },
  'share.link': { ro: 'Copiază linkul', en: 'Copy link' },
  'toast.linkCopied': { ro: 'Link copiat. Dă-l mai departe.', en: 'Link copied. Pass it on.' },
  'dialog.whereFrom': { ro: 'de unde vine', en: "where it's from" },

  /* ---------- 404 page ---------- */
  '404.meta.title': { ro: 'Pagină negăsită · Urări de bine', en: 'Missing page · Urări de bine' },
  '404.meta.desc': {
    ro: 'Pagina căutată nu e în carte. Întoarce-te la pagina principală sau răsfoiește toate intrările.',
    en: "The page you're after isn't in the book. Go back to the home page or browse all the entries.",
  },
  '404.code': { ro: 'Eroarea 404', en: 'Error 404' },
  '404.title': { ro: 'Pagina asta lipsește din carte.', en: 'This page is missing from the book.' },
  '404.text': {
    ro: 'A rupt-o cineva, a mâncat-o șoarecele sau n-a fost scrisă niciodată. Nici bunica nu-și amintește așa ceva.',
    en: 'Someone tore it out, a mouse ate it, or it was never written. Not even grandma remembers it.',
  },
  '404.home': { ro: 'Înapoi la pagina principală', en: 'Back to the home page' },

  /* ---------- all entries ---------- */
  'all.meta.title': { ro: 'Toate intrările · Urări de bine', en: 'All entries · Urări de bine' },
  'all.meta.desc': {
    ro: 'Toate blestemele, înjurăturile și insultele din Urări de bine. Cauți, filtrezi și vezi de unde vine fiecare.',
    en: 'Every Romanian curse, oath and insult in Urări de bine, with search, filters and the source of each one.',
  },
  'all.skip': { ro: 'Sari la rezultate', en: 'Skip to the results' },
  'all.back': { ro: '← Înapoi la pagina principală', en: '← Back to the home page' },
  'all.title': { ro: 'Toate intrările', en: 'All entries' },
  'all.desc': {
    ro: 'Toate urările, într-un singur loc. Caută un cuvânt, pune ce filtre vrei și apasă pe o intrare ca să vezi de unde vine.',
    en: 'The whole register, page by page. Search for a word, narrow it down, and tap any entry to see where it comes from.',
  },
  'all.filters': { ro: 'Caută și filtrează', en: 'Search and filter' },
  'all.search': { ro: 'Caută', en: 'Search' },
  'all.search.placeholder': { ro: 'de ex. gherla, dracu, mă-ta', en: 'e.g. gherla, dracu, mă-ta' },
  'all.search.help': { ro: 'Merge și fără diacritice. Caută și în explicații și în traducerile englezești.', en: 'Diacritics optional. Searches the Romanian text and the English translations.' },
  'all.type': { ro: 'Tip', en: 'Type' },
  'all.type.any': { ro: 'Orice tip', en: 'Any type' },
  'all.theme': { ro: 'Temă', en: 'Theme' },
  'all.theme.any': { ro: 'Orice temă', en: 'Any theme' },
  'all.region': { ro: 'Regiune', en: 'Region' },
  'all.region.any': { ro: 'Orice regiune', en: 'Any region' },
  'all.level': { ro: 'Nivel', en: 'Level' },
  'all.level.all': { ro: 'Toate nivelurile', en: 'Every level' },
  'all.level.clean': { ro: 'Doar curate', en: 'Clean only' },
  'all.level.mild': { ro: 'Fără vulgare', en: 'No vulgar ones' },
  'all.level.vulgar': { ro: 'Doar vulgare', en: 'Vulgar only' },
  'all.funny': { ro: 'Haz', en: 'Humor' },
  'all.funny.all': { ro: 'Toate formulele', en: 'All entries' },
  'all.funny.yes': { ro: 'Doar cele haioase', en: 'Funny ones only' },
  'all.sensitive': { ro: 'Insulte de grup', en: 'Group slurs' },
  'all.sensitive.all': { ro: 'Cu tot cu ele', en: 'Included' },
  'all.sensitive.without': { ro: 'Fără insultele sensibile', en: 'Leave out the sensitive ones' },
  'all.clear': { ro: 'Șterge filtrele', en: 'Clear filters' },
  'all.loading': { ro: 'Răsfoiesc…', en: 'Leafing through…' },
  'all.found': { ro: 'Am găsit {n}', en: '{n} found' },
  'all.foundOne': { ro: 'O singură intrare', en: 'Just one entry' },
  'all.zero.title': { ro: 'Nimic.', en: 'Nothing.' },
  'all.zero.text': { ro: 'Nici bunica nu știe una ca asta. Încearcă alt cuvânt sau scoate un filtru.', en: "Not even grandma knows that one. Try another word or drop a filter." },
  'all.results': { ro: 'Rezultate', en: 'Results' },
  'all.pagination': { ro: 'Paginare', en: 'Pagination' },
  'all.previous': { ro: '← Pagina dinainte', en: '← Previous page' },
  'all.next': { ro: 'Pagina următoare →', en: 'Next page →' },
  'all.filters.button': { ro: 'Filtre', en: 'Filters' },
  'all.remove': { ro: 'Scoate filtrul: {filter}', en: 'Remove filter: {filter}' },
  'all.retry': { ro: 'Mai încearcă', en: 'Try again' },
  'all.page': { ro: 'pagina {page} din {pages}', en: 'page {page} of {pages}' },

  /* ---------- entry page ---------- */
  'entry.more': { ro: 'Alte urări pe aceeași temă →', en: 'More wishes on the same theme →' },
};

/* ---------- engine ---------- */

let currentLanguage = 'ro';
const variables = {};
const listeners = new Set();
let meta = { title: null, desc: null };

export const language = () => currentLanguage;

/** The text for `key` in the current language; {x} is replaced from `vars`, then from the global variables. */
export function t(key, vars = {}) {
  const entry = Object.hasOwn(DICT, key) ? DICT[key] : undefined;
  let s = entry ? (entry[currentLanguage] ?? entry.ro) : key;
  return s.replace(/\{(\w+)\}/g, (_, name) => {
    if (vars[name] != null) return String(vars[name]);
    if (variables[name] != null) return String(variables[name]);
    if (Object.hasOwn(DICT, `var.${name}`)) return t(`var.${name}`);
    return '';
  });
}

/** The label for a data value (type, level, theme, region); if missing, `fallback`. */
export function label(group, id, fallback) {
  const k = `${group}.${id}`;
  return Object.hasOwn(DICT, k) ? t(k) : (fallback || id);
}

/** A number formatted for the current language (1.456 in Romanian, 1,456 in English). */
export function formatNumber(n) {
  return Number(n).toLocaleString(currentLanguage === 'en' ? 'en-US' : 'ro-RO');
}

/* The canonical is the current language's own URL, so each variant is indexed on its own. */
const PUBLIC_ORIGIN = 'https://uraridebine.ro';
function setCanonical() {
  if (document.querySelector('meta[name="robots"][content*="noindex"]')) return;
  let c = document.querySelector('link[rel="canonical"]');
  if (c && c.hasAttribute('data-fixed')) return; // set by the server (entry pages, /all): keep it as is
  if (!c) {
    c = document.createElement('link');
    c.setAttribute('rel', 'canonical');
    document.head.append(c);
  }
  const path = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  c.setAttribute('href', `${PUBLIC_ORIGIN}${path}?lang=${currentLanguage}`);
}

export function setVariable(name, value) {
  variables[name] = value;
  apply();
}

export function apply(root = document) {
  for (const e of root.querySelectorAll('[data-i18n]')) e.textContent = t(e.dataset.i18n);
  for (const e of root.querySelectorAll('[data-i18n-html]')) e.innerHTML = t(e.dataset.i18nHtml);
  for (const e of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of e.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':').map((x) => x.trim());
      if (attr && key) e.setAttribute(attr, t(key));
    }
  }
  if (meta.title) document.title = t(meta.title);
  const d = document.querySelector('meta[name="description"]');
  if (d && meta.desc) d.setAttribute('content', t(meta.desc));
  const put = (sel, key) => {
    const m = document.querySelector(sel);
    if (m && key) m.setAttribute('content', t(key));
  };
  put('meta[property="og:title"]', meta.title);
  put('meta[property="og:description"]', meta.desc);
  put('meta[name="twitter:title"]', meta.title);
  put('meta[name="twitter:description"]', meta.desc);
  const loc = document.querySelector('meta[property="og:locale"]');
  const alt = document.querySelector('meta[property="og:locale:alternate"]');
  if (loc && alt) {
    loc.setAttribute('content', currentLanguage === 'en' ? 'en_US' : 'ro_RO');
    alt.setAttribute('content', currentLanguage === 'en' ? 'ro_RO' : 'en_US');
  }
  setCanonical();
  // one switch: only the button of the other language is shown
  for (const b of document.querySelectorAll('[data-lang]')) {
    b.hidden = b.dataset.lang === currentLanguage;
    b.removeAttribute('aria-pressed');
  }
}

export function onChange(fn) { listeners.add(fn); }

const readSaved = () => { try { return localStorage.getItem('language'); } catch { return null; } };
const save = (v) => { try { localStorage.setItem('language', v); } catch { /* private mode */ } };

function initialLanguage() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (LANGUAGES.includes(fromUrl)) return fromUrl;
  const saved = readSaved();
  if (LANGUAGES.includes(saved)) return saved;
  return 'ro'; // Romanian by default; English only when the visitor picks it
}

export function setLanguage(l, { persist = true } = {}) {
  if (!LANGUAGES.includes(l)) return;
  const changed = l !== currentLanguage;
  currentLanguage = l;
  document.documentElement.lang = l;
  if (persist) save(l);
  // if the URL already has ?lang=, keep it up to date, so a copied link shows what you see
  const u = new URL(location.href);
  if (u.searchParams.has('lang') && u.searchParams.get('lang') !== l) {
    u.searchParams.set('lang', l);
    history.replaceState(history.state, '', u);
  }
  apply();
  if (changed) for (const fn of listeners) fn(l);
}

/** Starts the translation on a page: picks the language, wires the RO/EN buttons, applies the texts. */
export function initLanguage({ title, desc }) {
  meta = { title, desc };
  for (const b of document.querySelectorAll('[data-lang]')) {
    if (b.title) b.setAttribute('aria-label', b.title); // "English" / "Română", not "EN" / "RO"
    b.addEventListener('click', () => setLanguage(b.dataset.lang));
  }
  const l = initialLanguage();
  currentLanguage = l;
  document.documentElement.lang = l;
  apply();
  document.documentElement.classList.remove('i18n-pending');
}
