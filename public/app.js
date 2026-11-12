// Urări de bine — the main page logic. Vanilla, no build.

import { $, h, fetchJson, copyText, normalizeList, ApiError, typeBadge, levelBadge, explanation, translation, openEntry, openGenerated } from './dialog.js';
import { t, label, language, formatNumber, apply, setVariable, onChange, initLanguage } from './i18n.js';

initLanguage({ title: 'home.meta.title', desc: 'home.meta.desc' });
setVariable('year', String(new Date().getFullYear()));

const el = {
  wishButton: $('#wish-button'),
  generateButton: $('#generate'),
  card: $('#card'),
  day: $('#card-day'),
  themesList: $('#themes-list'),
  area: $('#wish-area'),
  number: $('#number'),
  actions: $('#actions'),
  explain: $('#explain'),
  copy: $('#copy'),
  share: $('#share'),
  toast: $('#toast'),
  theme: $('#theme'),
  level: $('#level'),
  settings: $('#settings'),
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// The API's public address; a local run shows its own origin instead.
const API_ORIGIN = location.hostname.endsWith('uraridebine.ro') ? 'https://api.uraridebine.ro' : location.origin;

// the step chosen in the interface -> the API `level` value: exactly that step, so "merciless" gives
// vulgar wishes only (as a ceiling, three wishes in four would have come out clean)
const LEVELS = {
  clean: 'clean',
  mild: 'mild',
  vulgar: 'vulgar',
};
const DEFAULT_LEVEL = 'vulgar';
let siteThemes = []; // [{ id, name, count, levels }] from /v1/themes
const SETTINGS_VERSION = '2'; // 2 = vulgar is the default (6 Nov 2026)

const state = {
  level: DEFAULT_LEVEL,
  count: 0,
  total: null,       // how many entries there are in total (raw number, formatted per language)
  last: null,        // { text, id, generated, data }
  lastMode: 'random',
  busy: false,
  redraw: null,      // function that redraws the card (when the language changes)
};

/* ---------- utilities ---------- */

const readStore = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const writeStore = (key, val) => { try { localStorage.setItem(key, val); } catch { /* private mode */ } };
const removeStore = (key) => { try { localStorage.removeItem(key); } catch { /* private mode */ } };

function roman(n) {
  const table = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of table) while (n >= v) { s += r; n -= v; }
  return s;
}

function graphemes(text) {
  if ('Segmenter' in Intl) {
    return Array.from(new Intl.Segmenter('ro', { granularity: 'grapheme' }).segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

function queryString(extra = {}) {
  const p = new URLSearchParams();
  p.set('level', LEVELS[Object.hasOwn(LEVELS, state.level) ? state.level : DEFAULT_LEVEL]);
  if (el.theme.value) p.set('theme', el.theme.value);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return `?${p}`;
}

/* ---------- toast & clipboard ---------- */

let toastTimer;
function announce(message) {
  el.toast.textContent = message;
  el.toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('visible'), 2200);
}

/* Letter size by text length, so the card does not change its height. */
function sizeStep(n) {
  if (n <= 28) return 1;
  if (n <= 55) return 2;
  if (n <= 95) return 3;
  if (n <= 150) return 4;
  return 5;
}

/* The card has a fixed height and does not scroll: if all the content does not fit, we lower the font
   step (down to the smallest), then we squeeze the explanation, and finally we leave it out. */
const MAX_STEP = 7;
function fitText() {
  const p = el.area.querySelector('.wish__text');
  if (!p) return;
  const block = p.closest('.wish');
  const setStep = (n) => { p.className = p.className.replace(/wish__text--t\d+/, `wish__text--t${n}`); };
  const overflows = () => el.area.scrollHeight > el.area.clientHeight + 1;
  let n = Number(p.dataset.t0) || 1;
  setStep(n);
  block.classList.remove('wish--squeezed', 'wish--tight');
  while (overflows() && n < MAX_STEP) setStep(++n);
  if (overflows()) block.classList.add('wish--squeezed');
  if (overflows()) block.classList.add('wish--tight');
}
let fitTimer;
window.addEventListener('resize', () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(fitText, 150);
});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitText);

/* Builds the "handwritten" text: each grapheme is a <span> with its own delay.
   The animated version is aria-hidden; screen readers get the whole text. */
function writtenText(text, animated = true) {
  const g = graphemes(text);
  const reduced = reducedMotion.matches || !animated;
  // about 1.2 s for a typical wish, never slower than 36 ms a letter
  const step = Math.max(10, Math.min(36, 1200 / Math.max(g.length, 1)));
  const done = reduced ? 0 : Math.round(g.length * step + 180);

  const visual = h('span', { 'aria-hidden': 'true' });
  g.forEach((c, i) => {
    if (i === 0 && /\p{L}/u.test(c)) {
      visual.append(h('span', { class: 'drop-cap letter', style: `--i:${i}` }, c));
    } else if (/\s/.test(c)) {
      visual.append(' ');
    } else {
      visual.append(h('span', { class: 'letter', style: `--i:${i}` }, c));
    }
  });
  // The quill stays in the DOM and only fades out (its animation has a fixed number of blinks):
  // if we removed it, the last line would get shorter and the text would reflow at the end.
  if (!reduced) visual.append(h('span', { class: 'quill' }));

  const p = h('p', { lang: 'ro', class: `wish__text wish__text--t${sizeStep(g.length)}`, 'data-t0': sizeStep(g.length), style: `--step:${step}ms;--done:${done}ms` },
    visual, h('span', { class: 'visually-hidden' }, text));
  return { p, done };
}

/* ---------- rendering ---------- */

function prepareCard() {
  state.count += 1;
  delete el.number.dataset.i18n;
  el.number.textContent = roman(state.count);
}

function putOnCard(content) {
  el.area.replaceChildren(content);
  el.area.scrollTop = 0;
  fitText();
}

/* The card actions (explanation, copy, share) need a wish on the card; without one, the bar is hidden
   but keeps its place, so the card does not change its height. */
function showActions(show) {
  if (show) delete el.actions.dataset.empty;
  else el.actions.dataset.empty = '';
  for (const b of el.actions.querySelectorAll('button')) b.disabled = !show;
}

function wishClass(animated) {
  return `wish${reducedMotion.matches || !animated ? ' wish--fade' : ''}${animated ? '' : ' wish--static'}`;
}

/* 2026-11-07 -> "7 noiembrie" / "7 November" (the date already comes in the Europe/Bucharest zone, from the API) */
function formatDay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return new Intl.DateTimeFormat(language() === 'en' ? 'en-GB' : 'ro-RO', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d);
}

/* The line above the wish is always there, so the wish starts at the same height every time:
   "Wish of the day · 8 November", or "Wish II" for the ones drawn after it. */
function dayLabel(date) {
  el.day.textContent = date
    ? t('home.dayLabel', { date: formatDay(date) })
    : `${t('home.card')} ${roman(Math.max(1, state.count))}`;
  el.day.hidden = false;
}

/* day: the date (YYYY-MM-DD) if it is the wish of the day, otherwise nothing */
function showWish(d, animated = true, day = null) {
  if (animated) prepareCard();
  const { p, done } = writtenText(d.text, animated);
  // /v1/random gives `source` (the title of the first source); the full entry gives `sources`
  const source = d.source || (Array.isArray(d.sources) && d.sources[0] && d.sources[0].title) || null;

  const details = h('div', { class: 'wish__details', style: `--done:${done}ms` },
    h('p', { class: 'rubric' }, typeBadge(d.type), levelBadge(d.level)),
    translation(d.translation),
    explanation(d.explanation, 'wish__explanation'),
    source ? h('p', { class: 'wish__source' }, h('span', {}, t('home.source')), h('cite', {}, source)) : null,
  );

  dayLabel(day);
  putOnCard(h('div', { class: wishClass(animated) }, p, details));
  state.last = { text: d.text, id: d.id, generated: false, data: d };
  state.redraw = () => showWish(d, false, day);
  showActions(true);
}

function showGenerated(d, animated = true) {
  if (animated) prepareCard();
  const { p, done } = writtenText(d.text, animated);
  const details = h('div', { class: 'wish__details', style: `--done:${done}ms` },
    h('p', { class: 'rubric' },
      h('span', { class: 'badge badge--generated' }, t('generated')), levelBadge(d.level)),
  );

  dayLabel(null);
  putOnCard(h('div', { class: wishClass(animated) }, p, details));
  state.last = { text: d.text, id: null, generated: true, data: d };
  state.redraw = () => showGenerated(d, false);
  showActions(true);
}

const MESSAGES = {
  filters: { sign: '?', key: 'error.filters' },
  network: { sign: '☁', key: 'error.network' },
  'too-many': { sign: '⌛', key: 'error.tooMany' },
  nothing: { sign: '∅', key: 'error.nothing' },
  'unknown-id': { sign: '∅', key: 'error.unknownId' },
  'nothing-generated': { sign: '✂', key: 'error.generated' },
  server: { sign: '✝', key: 'error.server' },
};

/* focus: after an action, the focus goes to the red button (under the card), from where one can try again */
function showError(kind, { focus = true } = {}) {
  dayLabel(null);
  const m = (Object.hasOwn(MESSAGES, kind) && MESSAGES[kind]) || MESSAGES.server;
  putOnCard(h('div', { class: 'error wish--fade' },
    h('p', { class: 'error__sign', 'aria-hidden': 'true' }, m.sign),
    h('p', { class: 'error__title' }, t(`${m.key}.title`)),
    h('p', { class: 'error__text' }, t(`${m.key}.text`))));
  state.last = null;
  state.redraw = () => showError(kind, { focus: false });
  showActions(false);
  if (focus) el.wishButton.focus({ preventScroll: true });
}

/* ---------- actions ---------- */

/* The visual "busy" sign appears only after 250 ms: quick requests do not make the buttons flicker. */
let busyTimer;
function setBusy(on) {
  state.busy = on;
  clearTimeout(busyTimer);
  el.area.setAttribute('aria-busy', String(on));
  const mark = () => { for (const b of [el.wishButton, el.generateButton]) b.setAttribute('aria-busy', String(on)); };
  if (on) busyTimer = setTimeout(mark, 250);
  else mark();
}

/* No repeats: for each filter (and for the generator) the browser keeps a seed and a position n.
   The API gives the n-th item of the seed's fixed order, so every wish shows up once before any
   comes back. At the end of the list we pick a new seed and start over. Kept in localStorage,
   so a reload does not start the list again. */
const SEQ_PREFIX = 'urari-seq:';
const newSeed = () => Math.floor(Math.random() * 2147483647);
function readSequence(key) {
  try {
    const v = JSON.parse(readStore(SEQ_PREFIX + key) || 'null');
    if (v && Number.isInteger(v.seed) && Number.isInteger(v.n) && v.seed >= 0 && v.n >= 0) return v;
  } catch { /* broken value: start over */ }
  return { seed: newSeed(), n: 0 };
}
const sameWish = (a, b) => Boolean(a && b) && (a.id ? a.id === b.id : a.text === b.text);

async function fetchNext(path, key) {
  const seq = readSequence(key);
  const url = (s) => `${path}${path.includes('?') ? '&' : '?'}seed=${s.seed}&n=${s.n}`;
  let d = await fetchJson(url(seq));
  // A new list may open with the wish on the card now: take the next one.
  if (sameWish(d, state.last?.data) && d.sequence && d.sequence.total > 1) {
    try { d = await fetchJson(url({ seed: d.sequence.seed, n: d.sequence.n + 1 })); } catch { /* keep d */ }
  }
  const s = d.sequence;
  if (s) {
    const next = s.n + 1;
    writeStore(SEQ_PREFIX + key, JSON.stringify(next >= s.total ? { seed: newSeed(), n: 0 } : { seed: s.seed, n: next }));
  }
  return d;
}

/* A /?id=... link was replaced by a new wish: we remove the id from the address. */
function clearIdFromUrl() {
  const u = new URL(location.href);
  if (!u.searchParams.has('id')) return;
  u.searchParams.delete('id');
  history.replaceState(history.state, '', u);
}

/* The card's height changes from one wish to the next, which moves the red button under it.
   Scroll as little as possible so the card and the button both stay on screen; if they don't
   both fit, the top of the card wins. Does nothing when they're already visible. */
function scrollToCard() {
  requestAnimationFrame(() => {
    const card = el.card.getBoundingClientRect();
    const button = el.wishButton.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const top = card.top - 8;
    const bottom = button.bottom - (vh - 12);
    let delta = 0;
    if (top < 0) delta = top;
    else if (bottom > 0) delta = Math.min(bottom, top);
    if (Math.abs(delta) < 2) return;
    window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
}

async function requestWish(mode) {
  if (state.busy) return;
  state.lastMode = mode;
  setBusy(true);
  clearIdFromUrl();
  try {
    if (mode === 'generate') {
      const d = await fetchNext('/v1/generate', 'generate'); // ignores the level and the theme
      showGenerated(d);
    } else {
      const q = queryString();
      const d = await fetchNext(`/v1/random${q}`, `random${q}`);
      showWish(d);
    }
    scrollToCard();
  } catch (e) {
    let kind = e instanceof ApiError ? e.kind : 'server';
    if (kind === 'nothing' && mode === 'generate') kind = 'nothing-generated';
    showError(kind);
  } finally {
    setBusy(false);
  }
}

el.wishButton.addEventListener('click', () => requestWish('random'));
el.generateButton.addEventListener('click', () => requestWish('generate'));

el.explain.addEventListener('click', () => {
  const last = state.last;
  if (!last) return;
  if (last.generated) openGenerated(last.data, el.explain);
  else if (last.id) openEntry(last.id, el.explain);
});

async function copyLast() {
  if (!state.last) return;
  const ok = await copyText(state.last.text);
  announce(t(ok ? 'toast.copied' : 'toast.notCopied'));
}
el.copy.addEventListener('click', copyLast);

/* A tap on the card while the text is being written shows it at once, in full. */
el.card.addEventListener('click', (e) => {
  if (e.target.closest('a, button')) return;
  const b = el.area.querySelector('.wish:not(.wish--static)');
  if (!b) return;
  b.classList.add('wish--static');
  b.querySelector('.quill')?.remove();
});

/* Shortcuts: R = another wish, C = copy. They do not fire in form fields, with modifiers or with a dialog open. */
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.defaultPrevented) return;
  const a = document.activeElement;
  if (a && (a.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))) return;
  if (document.querySelector('dialog[open]')) return;
  const k = e.key.toLowerCase();
  if (k === 'r') { e.preventDefault(); requestWish(state.last ? state.lastMode : 'random'); }
  else if (k === 'c') { e.preventDefault(); copyLast(); }
});

/* The share message: the wish wrapped like a greeting card, with a random courtesy formula. */
const WISH_FORMULAS = 8;
function greeting(text, generated) {
  const wish = text.replace(/[.!]+$/u, '') + '!';
  const message = t(`share.wish.${1 + Math.floor(Math.random() * WISH_FORMULAS)}`, { wish });
  return generated ? `${message} ${t('share.generated')}` : message;
}

el.share.addEventListener('click', async () => {
  if (!state.last) return;
  const { text, id, generated } = state.last;
  const url = id ? `${location.origin}/?id=${encodeURIComponent(id)}` : `${location.origin}/`;
  const data = {
    title: t('site.name'),
    text: greeting(text, generated),
    url,
  };
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  shareMenu(data, el.share);
});

/* Fallback without navigator.share: a small dialog with the networks and "Copy link". */
let shareDialog;
let closeShare;
function shareMenu({ text, url }, opener) {
  if (!shareDialog) {
    shareDialog = h('dialog', { class: 'dialog dialog--share', 'aria-labelledby': 'share-title' });
    let closing = false;
    closeShare = () => {
      if (!shareDialog.open || closing) return;
      if (reducedMotion.matches) { shareDialog.close(); return; }
      closing = true;
      shareDialog.classList.add('closing');
      setTimeout(() => {
        closing = false;
        shareDialog.classList.remove('closing');
        if (shareDialog.open) shareDialog.close();
      }, 200);
    };
    shareDialog.addEventListener('click', (e) => {
      if (e.target !== shareDialog) return;
      const r = shareDialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeShare();
    });
    shareDialog.addEventListener('cancel', (e) => { e.preventDefault(); closeShare(); });
    shareDialog.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeShare(); } });
    shareDialog.addEventListener('close', () => { if (document.contains(el.share)) el.share.focus(); });
    document.body.append(shareDialog);
  }
  const q = encodeURIComponent;
  const links = [
    ['share.whatsapp', `https://wa.me/?text=${q(`${text} ${url}`)}`],
    ['share.telegram', `https://t.me/share/url?url=${q(url)}&text=${q(text)}`],
    ['share.facebook', `https://www.facebook.com/sharer/sharer.php?u=${q(url)}`],
    ['share.x', `https://twitter.com/intent/tweet?text=${q(text)}&url=${q(url)}`],
  ];
  shareDialog.replaceChildren(
    h('h2', { id: 'share-title', class: 'sheet__title' }, t('share.title')),
    h('ul', { class: 'share__list' },
      links.map(([key, href]) => h('li', {},
        h('a', { class: 'action', href, target: '_blank', rel: 'noopener', onclick: () => closeShare() }, t(key)))),
      h('li', {}, h('button', {
        type: 'button', class: 'action action--filled',
        onclick: async () => {
          const ok = await copyText(url);
          closeShare();
          announce(t(ok ? 'toast.linkCopied' : 'toast.notShared'));
        },
      }, t('share.link')))));
  if (!shareDialog.open) {
    if (typeof shareDialog.showModal === 'function') shareDialog.showModal();
    else shareDialog.setAttribute('open', '');
  }
}

/* ---------- level ---------- */

function setLevel(n) {
  state.level = n;
  el.level.value = n;
  writeStore('level', n);
  markEmptyThemes();
}

/* A theme with no wish at the chosen level cannot be picked; if it was the chosen one, we go back
   to "anything", so the red button never lands on an empty search. */
function markEmptyThemes() {
  for (const o of el.theme.options) {
    const x = o.value && siteThemes.find((s) => s.id === o.value);
    o.disabled = Boolean(x && x.levels && !x.levels[state.level]);
  }
  if (el.theme.selectedOptions[0]?.disabled) {
    el.theme.value = '';
    writeStore('theme', '');
  }
}

el.level.addEventListener('change', () => setLevel(Object.hasOwn(LEVELS, el.level.value) ? el.level.value : DEFAULT_LEVEL));

// Migration: before, the default was "clean" and Mild/Vulgar asked for confirmation.
// On the first visit after the change, we move once to the new default.
if (readStore('settings-version') !== SETTINGS_VERSION) {
  removeStore('confirmed-mild');
  removeStore('confirmed-vulgar');
  setLevel(DEFAULT_LEVEL);
  writeStore('settings-version', SETTINGS_VERSION);
} else {
  const saved = readStore('level');
  setLevel(saved && Object.hasOwn(LEVELS, saved) ? saved : DEFAULT_LEVEL);
}

/* ---------- themes: the select and the table of contents ---------- */


function themeLink(id) {
  const p = new URLSearchParams({ theme: id });
  if (new URLSearchParams(location.search).has('lang')) p.set('lang', language());
  return `/all?${p}`;
}

function drawThemes() {
  el.themesList.replaceChildren(...siteThemes
    .filter((x) => x.count !== 0)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .map((x) => h('li', {},
      h('a', { class: 'toc__item', href: themeLink(x.id) },
        h('span', { class: 'toc__name' }, label('theme', x.id, x.name)),
        x.count != null ? h('span', { class: 'toc__leader', 'aria-hidden': 'true' }) : null,
        x.count != null ? h('span', { class: 'toc__n' }, formatNumber(x.count)) : null))));
  el.themesList.closest('.themes').hidden = !el.themesList.children.length;
}

(async () => {
  try {
    siteThemes = normalizeList(await fetchJson('/v1/themes'));
    const frag = document.createDocumentFragment();
    for (const x of siteThemes) {
      frag.append(h('option', { value: x.id, 'data-name': x.name || x.id }, label('theme', x.id, x.name)));
    }
    el.theme.append(frag);
    const savedTheme = readStore('theme');
    if (savedTheme && [...el.theme.options].some((o) => o.value === savedTheme)) el.theme.value = savedTheme;
    markEmptyThemes();
    drawThemes();
  } catch {
    // no themes: the select keeps "Any theme", and the theme list is not shown
    el.themesList.closest('.themes').hidden = true;
  }
})();
el.theme.addEventListener('change', () => writeStore('theme', el.theme.value));
el.settings.addEventListener('submit', (e) => e.preventDefault());

/* ---------- how many entries there are ---------- */

(async () => {
  try {
    const r = await fetchJson('/v1/entries?level=all&per_page=1');
    if (typeof r.total !== 'number') return;
    $('#text-all').dataset.i18n = 'home.browse.count';
    state.total = r.total;
    setVariable('total', formatNumber(r.total));
  } catch {
    // the generic text stays
  }
})();

/* ---------- the developers section ---------- */

for (const c of document.querySelectorAll('[data-code]')) {
  c.textContent = c.textContent.replaceAll('{ORIGIN}', API_ORIGIN);
}
for (const b of document.querySelectorAll('.copy-code:not(#try)')) {
  b.addEventListener('click', async () => {
    const code = b.parentElement.querySelector('code').textContent;
    const ok = await copyText(code);
    b.textContent = t(ok ? 'dev.copied' : 'dev.error');
    setTimeout(() => { b.textContent = t('dev.copy'); }, 1600);
  });
}

/* ---------- "Try it": the call from the first example, straight from the page ---------- */

const tryButton = $('#try');
const apiResult = $('#random-result');
if (tryButton && apiResult) {
  const code = apiResult.querySelector('code');
  tryButton.addEventListener('click', async () => {
    if (tryButton.disabled) return;
    tryButton.disabled = true;
    apiResult.hidden = false;
    apiResult.classList.remove('example__result--error');
    code.textContent = t('dev.try.loading');
    try {
      code.textContent = JSON.stringify(await fetchJson('/v1/random'), null, 2);
    } catch (e) {
      const m = (e instanceof ApiError && Object.hasOwn(MESSAGES, e.kind) && MESSAGES[e.kind]) || MESSAGES.server;
      apiResult.classList.add('example__result--error');
      code.textContent = t(`${m.key}.text`);
    } finally {
      tryButton.disabled = false;
    }
  });
}

/* ---------- language change ---------- */

onChange(() => {
  for (const o of el.theme.options) if (o.value) o.textContent = label('theme', o.value, o.dataset.name);
  drawThemes();
  if (state.total != null) setVariable('total', formatNumber(state.total));
  if (state.redraw) state.redraw();
});

/* ---------- on load: direct link /?id=... or the wish of the day ---------- */

(async () => {
  const id = new URLSearchParams(location.search).get('id');
  setBusy(true);
  try {
    if (id) {
      const d = await fetchJson(`/v1/entries/${encodeURIComponent(id)}`);
      showWish(d);
    } else {
      const d = await fetchJson('/v1/today');
      showWish(d, true, d.date);
    }
  } catch (e) {
    const kind = e instanceof ApiError ? e.kind : 'server';
    if (id) showError(kind === 'nothing' ? 'unknown-id' : kind, { focus: false });
    // otherwise the card stays empty
  } finally {
    setBusy(false);
  }
})();

showActions(false);
apply();
