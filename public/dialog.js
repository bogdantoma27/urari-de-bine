// Shared code for the Urări de bine pages: utilities, API requests and the "Meaning and source" dialog.

import { t, label, language, onChange } from './i18n.js';

export const $ = (sel, root = document) => root.querySelector(sel);

/** Creates an element: h('div', { class: 'x' }, ...children). */
export function h(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) e.append(c);
  return e;
}

export class ApiError extends Error {
  constructor(kind, status) { super(kind); this.kind = kind; this.status = status; }
}

const MAX_WAIT = 10000; // a request that does not answer within 10 s counts as a network failure

export async function fetchJson(url, { signal } = {}) {
  const ctl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, MAX_WAIT);
  const onCallerAbort = () => ctl.abort();
  if (signal) {
    if (signal.aborted) ctl.abort();
    else signal.addEventListener('abort', onCallerAbort, { once: true });
  }
  const abortedByCaller = (e) => (signal && signal.aborted) || (!timedOut && e && e.name === 'AbortError');
  try {
    let r;
    try {
      r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctl.signal });
    } catch (e) {
      if (abortedByCaller(e)) throw e;
      throw new ApiError('network');
    }
    if (r.status === 429) throw new ApiError('too-many', 429);
    if (r.status === 404) throw new ApiError('nothing', 404);
    if (r.status === 400) throw new ApiError('filters', 400);
    if (!r.ok) throw new ApiError('server', r.status);
    try {
      return await r.json();
    } catch (e) {
      // aborted while the body was being read: not a server error
      if (abortedByCaller(e)) {
        throw (e && e.name === 'AbortError') ? e : new DOMException('Aborted', 'AbortError');
      }
      if (timedOut) throw new ApiError('network');
      throw new ApiError('server', r.status);
    }
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onCallerAbort);
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = h('textarea', { style: 'position:fixed;opacity:0;top:0;left:0', 'aria-hidden': 'true' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

/** The type and level badges, shared by the card, the list and the dialog. */
export function typeBadge(type) {
  return h('span', { class: 'badge' }, type ? label('type', type) : t('uncategorized'));
}
export function levelBadge(level) {
  if (!level) return null;
  return h('span', { class: `badge badge--level${level === 'vulgar' ? ' badge--vulgar' : ''}` },
    ['clean', 'mild', 'vulgar'].includes(level) ? t(`level.badge.${level}`) : label('level', level));
}

/** The explanation (always in Romanian); in English it gets an "in Romanian" label. */
export function explanation(text, cls) {
  if (!text) return null;
  const en = language() === 'en';
  return h('p', { class: cls },
    en ? h('span', { class: 'in-romanian', lang: 'en' }, t('in.romanian')) : null,
    h('span', { lang: 'ro' }, text));
}

/** The English translation; in EN mode it is more prominent and sits right under the wish. */
export function translation(text) {
  if (!text) return null;
  const en = language() === 'en';
  return h('p', { class: `wish__en${en ? ' wish__en--large' : ''}`, lang: 'en' },
    en ? null : h('span', { 'aria-hidden': 'true' }, 'EN'), text);
}

/** Themes and regions from the API: { name (slug), count, ... } -> { id (slug), name (label, if any), count }. */
export function normalizeList(x) {
  if (!Array.isArray(x)) return [];
  return x.map((i) => (i && typeof i === 'object' ? { id: i.name ?? i.id, name: i.label ?? null, count: i.count, levels: i.levels ?? null } : null))
    .filter((i) => i && i.id);
}

/* Theme and region names from the API, requested once per page. */
let catalogPromise;
export function catalog() {
  if (!catalogPromise) {
    catalogPromise = Promise.all([
      fetchJson('/v1/themes').catch(() => []),
      fetchJson('/v1/regions').catch(() => []),
    ]).then(([themes, regions]) => ({ themes: normalizeList(themes), regions: normalizeList(regions) }));
  }
  return catalogPromise;
}

/* ---------- the dialog ---------- */

let dlg;
let body;
let backStack = [];     // for "back" from a piece's entry to the made-up curse
let openedBy = null;
let redraw = null;    // the last view, redrawn when the language changes

function buildDialog() {
  if (dlg) return;
  body = h('div', { class: 'sheet__body' });
  const closeButton = h('button', {
    type: 'button', class: 'sheet__close', 'data-i18n-attr': 'aria-label:dialog.close', 'aria-label': t('dialog.close'),
    onclick: () => close(),
  }, h('span', { 'aria-hidden': 'true' }, '×'));
  dlg = h('dialog', { class: 'dialog sheet', 'aria-labelledby': 'dialog-title' }, closeButton, body);
  // a click outside the sheet (on the backdrop) closes the dialog
  dlg.addEventListener('click', (e) => {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) close();
  });
  // Esc goes through the same exit animation as the button and the backdrop click
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
  dlg.addEventListener('close', () => {
    backStack = [];
    redraw = null;
    if (openedBy && document.contains(openedBy)) openedBy.focus();
    openedBy = null;
  });
  document.body.append(dlg);
  onChange(() => { if (dlg.open && redraw) redraw(false); });
}

/* Animated close: the class starts the exit animation, then we really close. */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let closing = false;
function close() {
  if (!dlg || !dlg.open || closing) return;
  if (reducedMotion.matches) { dlg.close(); return; }
  closing = true;
  dlg.classList.add('closing');
  setTimeout(() => {
    closing = false;
    dlg.classList.remove('closing');
    if (dlg.open) dlg.close();
  }, 200);
}

function open(opener) {
  buildDialog();
  if (closing) return; // it is closing right now
  if (!dlg.open) {
    getSelection()?.removeAllRanges(); // no text left selected by the tap that opened the dialog
    openedBy = opener || document.activeElement;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }
  dlg.scrollTop = 0;
}

function show(focus, ...content) {
  // When the dialog is already open and changes its content ("where it's from", "back"),
  // it moves smoothly from the old height to the new one, instead of jumping.
  const smooth = dlg.open && !closing && body.childElementCount > 0 && !reducedMotion.matches;
  const before = smooth ? dlg.getBoundingClientRect().height : 0;
  // While the height animates, scrolling is off: otherwise the scrollbar flashes and moves the text.
  if (smooth) { dlg.style.willChange = 'height'; dlg.style.overflowY = 'hidden'; }
  body.replaceChildren(...content.flat().filter(Boolean));
  body.classList.remove('sheet__body--waiting');
  dlg.scrollTop = 0;
  if (smooth) {
    const after = dlg.getBoundingClientRect().height;
    if (Math.abs(after - before) > 2) {
      const anim = dlg.animate([{ height: `${before}px` }, { height: `${after}px` }], { duration: 220, easing: 'ease-out' });
      const done = () => { dlg.style.willChange = ''; dlg.style.overflowY = ''; };
      anim.addEventListener('finish', done);
      anim.addEventListener('cancel', done);
    } else {
      dlg.style.willChange = '';
      dlg.style.overflowY = '';
    }
    body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
  }
  if (!focus) return;
  const heading = body.querySelector('h2');
  if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
}

function row(term, value) {
  if (value == null || value === '') return null;
  return [h('dt', {}, term), h('dd', {}, value)];
}

/** The actions row of the sheet: "Copy" puts the wish text on the clipboard. */
function actions(text) {
  const b = h('button', { type: 'button', class: 'action action--small' }, t('home.copy'));
  let timer;
  b.addEventListener('click', async () => {
    const ok = await copyText(text);
    b.textContent = t(ok ? 'dev.copied' : 'dev.error');
    clearTimeout(timer);
    timer = setTimeout(() => { b.textContent = t('home.copy'); }, 1600);
  });
  return h('div', { class: 'sheet__actions' }, b);
}

function backButton() {
  if (!backStack.length) return null;
  return h('button', {
    type: 'button', class: 'sheet__back',
    onclick: () => { const f = backStack.pop(); if (f) f(true); },
  }, t('dialog.back'));
}

function sourceItem(s) {
  const parts = [];
  if (s.author) parts.push(s.author);
  if (s.year) parts.push(String(s.year));
  if (s.page) parts.push(t('dialog.page', { page: s.page }));
  return h('li', { class: 'sheet__source' },
    h('cite', {}, s.title || t('dialog.untitled')),
    parts.length ? h('span', { class: 'sheet__source-meta' }, parts.join(' · ')) : null,
    s.informant ? h('span', { class: 'sheet__source-meta' }, t('dialog.informant', { informant: s.informant })) : null,
    s.url ? (/^https?:\/\//i.test(String(s.url))
      ? h('a', { href: s.url, target: '_blank', rel: 'noopener' }, t('dialog.open'))
      : h('span', { class: 'sheet__source-meta' }, String(s.url))) : null,
  );
}

const ERROR_KEYS = { nothing: 'dialog.error.nothing', network: 'error.network.text', 'too-many': 'error.tooMany.text', filters: 'error.filters.text', server: 'error.server.text' };

function entryView(d) {
  return (focus) => {
    const sources = Array.isArray(d.sources) ? d.sources : [];
    const themes = (d.themes || []).map((x) => label('theme', x));
    const regions = (d.regions || []).map((x) => label('region', x));
    const original = d.original_text && d.original_text.trim() !== String(d.text || '').trim() ? d.original_text : null;
    show(focus,
      backButton(),
      h('p', { class: 'sheet__label' }, t('dialog.label')),
      h('h2', { id: 'dialog-title', class: 'sheet__title', lang: 'ro' }, d.text),
      actions(d.text),
      original ? h('p', { class: 'sheet__original' }, h('span', {}, t('dialog.inSource')), h('span', { lang: 'ro' }, `„${original}”`)) : null,
      language() === 'en' ? translation(d.translation) : null,
      h('p', { class: 'rubric' }, typeBadge(d.type), levelBadge(d.level),
        d.attested === false ? h('span', { class: 'badge badge--level' }, t('dialog.unattested')) : null),
      explanation(d.explanation, 'sheet__explanation'),
      language() === 'en' ? null : translation(d.translation),
      h('dl', { class: 'sheet__data' },
        row(t('dialog.themes'), themes.join(', ')),
        row(t('dialog.region'), regions.length ? regions.join(', ') : t('dialog.region.none')),
        row(t('dialog.period'), d.period)),
      h('h3', { class: 'sheet__subtitle' }, sources.length === 1 ? t('dialog.source') : t('dialog.sources', { n: sources.length })),
      sources.length
        ? h('ol', { class: 'sheet__sources' }, sources.map(sourceItem))
        : h('p', { class: 'sheet__note' }, t('dialog.noSource')),
    );
  };
}

/** Opens the dialog with the entry `id`, read from /v1/entries/{id}. */
export async function openEntry(id, opener) {
  buildDialog();
  const waiting = (focus) => show(focus, backButton(),
    h('h2', { id: 'dialog-title', class: 'sheet__title sheet__title--waiting' }, t('dialog.loading')));
  redraw = waiting;
  body.setAttribute('aria-busy', 'true');
  // We do not show an empty sheet that then grows: if the dialog is open, we keep the old content
  // (dimmed) until the new one arrives; if it is closed, we open it straight with the entry, and
  // "Looking for it…" appears only if the answer is late.
  let timer = null;
  if (dlg.open) body.classList.add('sheet__body--waiting');
  else timer = setTimeout(() => { if (redraw === waiting) { open(opener); waiting(true); } }, 300);
  try {
    const d = await fetchJson(`/v1/entries/${encodeURIComponent(id)}`);
    if (redraw !== waiting) return; // meanwhile it was closed or something else was requested
    redraw = entryView(d);
  } catch (e) {
    if (redraw !== waiting) return;
    const key = (e && Object.hasOwn(ERROR_KEYS, e.kind) && ERROR_KEYS[e.kind]) || ERROR_KEYS.server;
    redraw = (focus) => show(focus, backButton(),
      h('h2', { id: 'dialog-title', class: 'sheet__title' }, t('dialog.notFound')),
      h('p', { class: 'sheet__note' }, t(key)));
  } finally {
    clearTimeout(timer);
    body.setAttribute('aria-busy', 'false');
  }
  if (!dlg.open) open(opener);
  redraw(true);
}

/** Opens the dialog for a curse made up by /v1/generate. */
export function openGenerated(d, opener) {
  open(opener);
  const pieces = d.pieces || {};
  const first = pieces.pattern;
  const second = pieces.fill;
  const view = (focus) => {
    redraw = view;
    const piece = (name, x) => (x ? h('li', { class: 'sheet__part' },
      h('span', { class: 'sheet__part-label' }, name),
      h('span', { class: 'sheet__part-text', lang: 'ro' }, `„${x.text}”`),
      x.entry ? h('button', {
        type: 'button', class: 'action action--small',
        onclick: () => { backStack.push(view); openEntry(x.entry); },
      }, t('dialog.whereFrom')) : null) : null);

    show(focus,
      h('p', { class: 'sheet__label' }, t('dialog.label')),
      h('h2', { id: 'dialog-title', class: 'sheet__title', lang: 'ro' }, d.text),
      h('p', { class: 'rubric' }, h('span', { class: 'badge badge--generated' }, t('generated')), levelBadge(d.level)),
      actions(d.text),
      h('h3', { class: 'sheet__subtitle' }, t('dialog.madeOf')),
      h('ul', { class: 'sheet__parts' }, piece(t('dialog.pattern'), first), piece(t('dialog.fill'), second)),
    );
  };
  view(true);
}
