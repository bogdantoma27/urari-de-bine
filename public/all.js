// Urări de bine — the page with all the entries: search, filters, pagination, state in the URL.

import { $, h, fetchJson, ApiError, catalog, typeBadge, levelBadge, openEntry } from './dialog.js';
import { t, label, language, formatNumber, onChange, initLanguage } from './i18n.js';

initLanguage({ title: 'all.meta.title', desc: 'all.meta.desc' });

const PER_PAGE = 50;
const ALL_LEVELS = 'all';
// the filter names are the same in the URL, in the form and in the API
const FILTERS = ['type', 'theme', 'region', 'level', 'funny', 'sensitive'];

const el = {
  form: $('#search'),
  q: $('#q'),
  type: $('#f-type'),
  theme: $('#f-theme'),
  region: $('#f-region'),
  level: $('#f-level'),
  funny: $('#f-funny'),
  sensitive: $('#f-sensitive'),
  total: $('#total'),
  clear: $('#clear'),
  results: $('#results'),
  list: $('#list'),
  empty: $('#empty'),
  pagination: $('#pagination'),
  prev: $('#prev'),
  next: $('#next'),
  where: $('#where'),
  filtersButton: $('#filters-button'),
  chips: $('#chips'),
};

let last = null;        // the last response, to redraw when the language changes
let lastError = null;
let controller = null;
let dimTimer;           // the list dimming appears only if the request takes long
let lastQ = null;       // the searched text in the last request sent
let lastState = null;   // the state of the last request, for "Try again"
let openId = null;      // the entry shown in the dialog; stays in the URL while it is open
const listFailed = { theme: false, region: false }; // /v1/themes or /v1/regions did not answer
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const VALUE_OK = /^[\w.-]{1,64}$/;

/* ---------- state in the URL ---------- */

function stateFromUrl() {
  const p = new URLSearchParams(location.search);
  const s = { q: p.get('q') || '', page: Math.max(1, parseInt(p.get('page'), 10) || 1) };
  for (const f of FILTERS) {
    const v = p.get(f) || '';
    // only the values the select offers; we drop the rest, so the form and the request match.
    // If the list (themes, regions) could not be loaded, we do not know what is valid: keep the URL value.
    const known = [...el[f].options].some((o) => o.value === v) || (listFailed[f] && VALUE_OK.test(v));
    s[f] = known ? v : '';
  }
  return s;
}

function stateFromForm(page = 1) {
  const s = { q: el.q.value.trim(), page };
  for (const f of FILTERS) s[f] = el[f].value;
  return s;
}

function writeUrl(s, { push = false } = {}) {
  const p = new URLSearchParams(location.search);
  if (openId) p.set('id', openId); else p.delete('id');
  for (const k of ['q', ...FILTERS]) { if (s[k]) p.set(k, s[k]); else p.delete(k); }
  if (s.page > 1) p.set('page', String(s.page)); else p.delete('page');
  const url = `${location.pathname}${p.toString() ? `?${p}` : ''}`;
  if (url === `${location.pathname}${location.search}`) return;
  if (push) history.pushState(null, '', url); else history.replaceState(null, '', url);
}

function fillForm(s) {
  el.q.value = s.q;
  for (const f of FILTERS) {
    const sel = el[f];
    if (listFailed[f] && s[f] && ![...sel.options].some((o) => o.value === s[f])) {
      sel.append(h('option', { value: s[f], 'data-name': s[f] }, label(f, s[f], s[f])));
    }
    sel.value = [...sel.options].some((o) => o.value === s[f]) ? s[f] : '';
  }
}

/* ---------- the request ---------- */

function apiUrl(s) {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  for (const f of ['type', 'theme', 'region', 'funny', 'sensitive']) if (s[f]) p.set(f, s[f]);
  p.set('level', s.level || ALL_LEVELS);
  p.set('page', String(s.page));
  p.set('per_page', String(PER_PAGE));
  return `/v1/entries?${p}`;
}

async function load(s, { scrollUp = false } = {}) {
  if (controller) controller.abort();
  controller = new AbortController();
  const signal = controller.signal;
  lastQ = s.q;
  lastState = s;
  el.list.setAttribute('aria-busy', 'true');
  clearTimeout(dimTimer);
  dimTimer = setTimeout(() => el.results.classList.add('loading'), 200);
  if (!last) el.total.textContent = t('all.loading');
  el.clear.hidden = !(s.q || FILTERS.some((f) => s[f]));
  updateFilters();
  try {
    const r = await fetchJson(apiUrl(s), { signal });
    // a page past the end (e.g. an old link): go to the last existing one
    if (r.pages > 0 && s.page > r.pages) {
      s.page = r.pages;
      writeUrl(s);
      return load(s, { scrollUp });
    }
    last = { r, s };
    lastError = null;
    draw();
    if (scrollUp) el.results.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  } catch (e) {
    if (signal.aborted || (e && e.name === 'AbortError')) return undefined;
    last = null;
    lastError = e instanceof ApiError ? e.kind : 'server';
    drawError();
  } finally {
    if (!signal.aborted) {
      el.list.setAttribute('aria-busy', 'false');
      clearTimeout(dimTimer);
      el.results.classList.remove('loading');
    }
  }
  return undefined;
}

/* ---------- drawing ---------- */

function firstWords(text, words = 14) {
  if (!text) return '';
  const parts = text.split(/\s+/);
  return parts.length <= words ? text : `${parts.slice(0, words).join(' ')}…`;
}

function entryItem(d) {
  const en = language() === 'en';
  const expl = firstWords(d.explanation);
  const tr = d.translation;
  return h('li', {},
    h('button', { type: 'button', class: 'entry', 'data-id': d.id },
      h('span', { class: 'entry__head' },
        h('span', { class: 'entry__text', lang: 'ro' }, d.text),
        h('span', { class: 'entry__badges' }, typeBadge(d.type), levelBadge(d.level))),
      en && tr ? h('span', { class: 'entry__en', lang: 'en' }, tr) : null,
      expl ? h('span', { class: 'entry__explanation' },
        en ? h('span', { class: 'in-romanian', lang: 'en' }, t('in.romanian')) : null,
        h('span', { lang: 'ro' }, expl)) : null,
      !en && !expl && tr ? h('span', { class: 'entry__explanation', lang: 'en' }, tr) : null,
    ));
}

function draw() {
  const { r, s } = last;
  const total = Number(r.total) || 0;
  el.total.textContent = total === 1 ? t('all.foundOne') : t('all.found', { n: formatNumber(total) });

  const results = Array.isArray(r.results) ? r.results : [];
  el.list.replaceChildren(...results.map(entryItem));
  el.list.start = (s.page - 1) * PER_PAGE + 1;

  el.empty.hidden = results.length > 0;
  if (!results.length) {
    el.empty.replaceChildren(
      h('p', { class: 'error__title' }, t('all.zero.title')),
      h('p', { class: 'error__text' }, t('all.zero.text')));
  }

  const pages = Number(r.pages) || 0;
  el.pagination.hidden = pages <= 1;
  el.prev.disabled = s.page <= 1;
  el.next.disabled = s.page >= pages;
  el.where.textContent = t('all.page', { page: s.page, pages });
}

const ERROR_KEYS = { network: 'error.network', 'too-many': 'error.tooMany', nothing: 'error.nothing', filters: 'error.filters', server: 'error.server' };

function drawError() {
  const k = (Object.hasOwn(ERROR_KEYS, lastError) && ERROR_KEYS[lastError]) || ERROR_KEYS.server;
  el.total.textContent = '';
  el.list.replaceChildren();
  el.pagination.hidden = true;
  el.empty.hidden = false;
  el.empty.replaceChildren(
    h('p', { class: 'error__title' }, t(`${k}.title`)),
    h('p', { class: 'error__text' }, t(`${k}.text`)),
    h('button', {
      type: 'button', class: 'action action--small', id: 'retry',
      onclick: () => { if (lastState) load({ ...lastState }); },
    }, t('all.retry')));
}

/* ---------- filters on a small screen: the "Filters (n)" button and chips ---------- */

function updateFilters() {
  const active = FILTERS.filter((f) => el[f].value);
  el.filtersButton.textContent = active.length ? `${t('all.filters.button')} (${active.length})` : t('all.filters.button');
  el.chips.replaceChildren(...active.map((f) => {
    const text = el[f].selectedOptions[0]?.textContent || el[f].value;
    return h('button', { type: 'button', class: 'chip', 'data-filter': f, 'aria-label': t('all.remove', { filter: text }) },
      text, h('span', { 'aria-hidden': 'true' }, '×'));
  }));
}

el.filtersButton.addEventListener('click', () => {
  const isOpen = el.form.toggleAttribute('data-open');
  el.filtersButton.setAttribute('aria-expanded', String(isOpen));
});

el.chips.addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (!c) return;
  const sel = el[c.dataset.filter];
  sel.value = '';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});

/* ---------- filters from the API ---------- */

async function fillFilters() {
  const { themes, regions } = await catalog();
  listFailed.theme = themes.length === 0;
  listFailed.region = regions.length === 0;
  const options = (sel, list, group) => {
    sel.append(...list.map((x) => h('option', { value: x.id, 'data-name': x.name || x.id }, label(group, x.id, x.name))));
  };
  options(el.theme, themes, 'theme');
  options(el.region, regions.filter((x) => x.count !== 0), 'region');
}

/* ---------- events ---------- */

let typingTimer;
el.q.addEventListener('input', () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    const s = stateFromForm(1);
    if (s.q === lastQ) return; // the text has not changed since the last request
    writeUrl(s);
    load(s);
  }, 500);
});

for (const f of FILTERS) {
  el[f].addEventListener('change', () => {
    const s = stateFromForm(1);
    writeUrl(s, { push: true });
    load(s);
  });
}

el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  clearTimeout(typingTimer);
  const s = stateFromForm(1);
  writeUrl(s);
  load(s);
});

el.clear.addEventListener('click', () => {
  el.q.value = '';
  for (const f of FILTERS) el[f].value = '';
  const s = stateFromForm(1);
  writeUrl(s, { push: true });
  load(s);
  el.q.focus();
});

function goToPage(page) {
  const s = { ...stateFromUrl(), page };
  writeUrl(s, { push: true });
  load(s, { scrollUp: true });
}
el.prev.addEventListener('click', () => { if (last) goToPage(last.s.page - 1); });
el.next.addEventListener('click', () => { if (last) goToPage(last.s.page + 1); });

el.list.addEventListener('click', (e) => {
  const b = e.target.closest('.entry');
  if (b) openDialog(b.dataset.id, b);
});

/* While the dialog is open, the URL keeps ?id=..., so the link copied from the bar leads to the same entry. */
function openDialog(id, opener) {
  openId = id;
  writeUrl(stateFromUrl());
  openEntry(id, opener);
}
document.addEventListener('close', (e) => {
  if (!openId || !(e.target instanceof HTMLDialogElement) || !e.target.classList.contains('sheet')) return;
  openId = null;
  writeUrl(stateFromUrl());
}, true);

window.addEventListener('popstate', () => {
  const s = stateFromUrl();
  fillForm(s);
  load(s);
});

onChange(() => {
  for (const sel of [el.theme, el.region]) {
    const group = sel === el.theme ? 'theme' : 'region';
    for (const o of sel.options) if (o.value) o.textContent = label(group, o.value, o.dataset.name);
  }
  updateFilters();
  if (last) draw();
  else if (lastError) drawError();
});

/* ---------- start ---------- */

(async () => {
  // The API lists first: without them we do not know which filter values in the URL are known.
  try { await fillFilters(); } catch { /* no lists: the "Any ..." options stay */ }
  const s = stateFromUrl(); // with the unknown values dropped
  fillForm(s);
  // a link shared from the first page: /all?id=...
  const id = new URLSearchParams(location.search).get('id');
  if (id) { openId = id; openEntry(id); }
  writeUrl(s); // the URL stays up to date (without the dropped filters; ?id= stays while the dialog is open)
  load(s);
})();
