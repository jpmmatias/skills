// Learncraft core: the small shared runtime every other script builds on. Load it first.
// Classic script, no dependencies, ES2017. Exposes window.Learncraft:
//
//   esc(s)                 HTML-escape & < > " '
//   html`<p>${x}</p>`      tagged template: escapes every interpolation; html.raw(s) marks trusted markup.
//                          Returns a value whose toString() is the markup, so el.innerHTML = html`…` works.
//   sanitize(s)            keeps only <b> <strong> <em> <i> <code> <br> <sup> <sub> <a href> (href: http(s),
//                          relative or #). Use for author text that may carry light markup (prompts, why, captions).
//   ready(fn)              run after DOMContentLoaded (in registration order)
//   mount(el, name, fn)    run fn(el) in try/catch; on error show an inline .lc-error box and log it
//   register(type, def)    component for [data-lc="type"]; def.mount(el, ctx) may return {destroy}
//   mountAll(root)         mount every registered component under root (runs once after all ready() callbacks)
//   announce(msg)          speak through the one shared polite live region
//   t(key, vars)           UI string: COURSE.strings[key] → built-in table for COURSE.lang → English
//   rng(seed)              mulberry32 → () => [0,1). A string seed is hashed.
//   reducedMotion()        live prefers-reduced-motion value (re-read on every call)
//   onVisible(el, cb, th)  cb once when el is on screen (immediately without IntersectionObserver)
//   observeVisibility(el, onChange)  onChange(visible) on scroll in/out and tab hide/show; returns {disconnect}
// Additions beyond the contract: session (page-load id), lang(), rootURL (workspace folder URL),
// courseStore() (the course's store instance, created once from window.COURSE via Learncraft.store),
// practice(n, items) (queues practice data until practice.js loads and replaces it).
(function (root) {
  'use strict';
  var LC = root.Learncraft = root.Learncraft || {};
  var doc = root.document;

  // ---------- escaping ----------
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return s == null ? '' : String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function Raw(s) { this.s = s; }
  Raw.prototype.toString = function () { return this.s; };
  function part(v) {
    if (v == null || v === false) return '';
    if (v instanceof Raw) return v.s;
    if (Array.isArray(v)) return v.map(part).join('');
    return esc(v);
  }
  function html(strings) {
    var out = strings[0];
    for (var i = 1; i < strings.length; i++) out += part(arguments[i]) + strings[i];
    return new Raw(out);
  }
  html.raw = function (s) { return new Raw(s == null ? '' : String(s)); };

  var ALLOWED = { B: 1, STRONG: 1, EM: 1, I: 1, CODE: 1, BR: 1, SUP: 1, SUB: 1, A: 1 };
  var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, TEMPLATE: 1, NOSCRIPT: 1, SVG: 1, MATH: 1 };
  function safeHref(h) {
    h = String(h || '').trim();
    if (/^https?:\/\//i.test(h) || h.charAt(0) === '#') return h;
    return /^[a-z][a-z0-9+.-]*:/i.test(h) || h.indexOf('//') === 0 ? null : h; // relative only
  }
  function clean(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) return;
      if (n.nodeType !== 1) { n.remove(); return; }
      var tag = n.tagName.toUpperCase();
      if (DROP[tag]) { n.remove(); return; }
      clean(n);
      if (!ALLOWED[tag]) { while (n.firstChild) node.insertBefore(n.firstChild, n); n.remove(); return; }
      var href = tag === 'A' ? safeHref(n.getAttribute('href')) : null;
      while (n.attributes.length) n.removeAttribute(n.attributes[0].name);
      if (href) n.setAttribute('href', href);
    });
  }
  function sanitize(s) {
    if (s == null) return '';
    var tpl = doc.createElement('template'); // inert: nothing in it loads or runs
    tpl.innerHTML = String(s);
    clean(tpl.content);
    var box = doc.createElement('div');
    box.appendChild(tpl.content);
    return box.innerHTML;
  }

  // ---------- boot, error isolation, components ----------
  var queue = [], booted = false, registry = {};
  function ready(fn) {
    if (booted) { mount(null, 'ready', fn); return; }
    queue.push(fn);
  }
  function boot() {
    if (booted) return;
    booted = true;
    while (queue.length) mount(null, 'ready', queue.shift());
    mountAll(doc);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);

  function errorBox(el, name, e) {
    if (root.console) console.error('[learncraft] ' + name + ' failed:', e);
    if (!el || !el.appendChild) return;
    var box = doc.createElement('div');
    box.className = 'lc-error';
    box.setAttribute('role', 'note');
    box.textContent = t('error.component', { name: name });
    el.appendChild(box);
  }
  function mount(el, name, fn) {
    try { return fn(el); } catch (e) { errorBox(el, name, e); return null; }
  }
  function ctxFor(el) {
    return { id: el.getAttribute('data-id') || el.id || null, t: t, announce: announce, rng: rng, esc: esc, html: html,
      sanitize: sanitize, reducedMotion: reducedMotion, onVisible: onVisible, observeVisibility: observeVisibility };
  }
  function mountType(rootEl, type) {
    var def = registry[type];
    Array.prototype.forEach.call(rootEl.querySelectorAll('[data-lc="' + type + '"]'), function (el) {
      if (el.__lcMounted) return;
      el.__lcMounted = true;
      el.__lc = mount(el, type + (el.id ? '#' + el.id : ''), function () { return def.mount(el, ctxFor(el)); });
    });
  }
  function register(type, def) {
    registry[type] = def;
    if (booted) mountType(doc, type);
  }
  function mountAll(rootEl) { Object.keys(registry).forEach(function (type) { mountType(rootEl || doc, type); }); }

  // ---------- live region ----------
  var region = null, timer = null;
  function announce(msg) {
    if (!doc.body) return;
    if (!region) {
      region = doc.createElement('div');
      region.className = 'lc-sr';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      doc.body.appendChild(region);
    }
    region.textContent = '';
    clearTimeout(timer); // clear-then-set so the same message twice is still spoken
    timer = setTimeout(function () { region.textContent = String(msg); }, 60);
  }

  // ---------- i18n ----------
  var EN = {
    'error.component': 'This part of the page could not load ({name}). The rest of the page still works.',
    'storage.off': 'This browser is not saving your progress here (storage is blocked or full). Practice still works; use Export before you close the page to keep a record.',
    'example.banner': 'Example course — no learner progress is included.'
  };
  var PT = {
    'error.component': 'Esta parte da página não carregou ({name}). O resto da página continua funcionando.',
    'storage.off': 'Este navegador não está salvando seu progresso aqui (armazenamento bloqueado ou cheio). A prática continua funcionando; use Exportar antes de fechar a página para guardar um registro.',
    'example.banner': 'Curso de exemplo — nenhum progresso de aluno está incluído.'
  };
  LC.i18n = LC.i18n || {};
  LC.i18n.en = Object.assign(LC.i18n.en || {}, EN);
  LC.i18n.pt = Object.assign(LC.i18n.pt || {}, PT);
  function lang() {
    var c = root.COURSE, l = (c && c.lang) || (doc.documentElement.getAttribute('lang')) || 'en';
    return String(l).toLowerCase().split('-')[0];
  }
  function t(key, vars) {
    var c = root.COURSE, s = c && c.strings && c.strings[key];
    if (s == null) s = (LC.i18n[lang()] || {})[key];
    if (s == null) s = LC.i18n.en[key];
    if (s == null) return key;
    if (typeof s === 'object') s = vars && vars.n === 1 ? s.one : s.other; // { one, other } plurals
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; });
  }

  // ---------- randomness, motion, visibility ----------
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = typeof seed === 'number' ? seed >>> 0 : hash(String(seed));
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function reducedMotion() { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function onVisible(el, cb, threshold) {
    if (!('IntersectionObserver' in root)) { cb(); return; }
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); cb(); }
    }, { threshold: threshold == null ? 0.25 : threshold });
    io.observe(el);
  }
  function observeVisibility(el, onChange) {
    var inView = true, last = null;
    function emit() { var v = inView && !doc.hidden; if (v !== last) { last = v; onChange(v); } }
    var io = 'IntersectionObserver' in root ? new IntersectionObserver(function (es) {
      inView = es[es.length - 1].isIntersecting; emit();
    }, { threshold: 0.25 }) : null;
    if (io) io.observe(el);
    doc.addEventListener('visibilitychange', emit);
    return { disconnect: function () { if (io) io.disconnect(); doc.removeEventListener('visibilitychange', emit); } };
  }

  // ---------- workspace helpers ----------
  var me = doc.currentScript && doc.currentScript.src;
  var rootURL = me ? new URL('..', me).href : new URL('.', root.location.href).href;
  var storeInstance = null;
  function courseStore() {
    if (storeInstance) return storeInstance;
    var S = LC.store, C = root.COURSE;
    if (!S || !C) return null;
    storeInstance = typeof S.createStore === 'function' ? S.createStore({ courseId: C.id }) : S;
    if (typeof storeInstance.load === 'function') storeInstance.loadResult = storeInstance.load();
    return storeInstance;
  }

  // Practice data files (lessons/NNNN.practice.js) may load before practice.js: queue their calls until it arrives.
  var pending = LC._pendingPractice = LC._pendingPractice || [];
  if (!LC.practice) LC.practice = function (n, items) { pending.push([n, items]); };

  Object.assign(LC, {
    version: '2.0.0', session: 's_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    esc: esc, html: html, sanitize: sanitize, ready: ready, mount: mount, register: register, mountAll: mountAll,
    announce: announce, t: t, lang: lang, rng: rng, reducedMotion: reducedMotion, onVisible: onVisible,
    observeVisibility: observeVisibility, rootURL: rootURL, courseStore: courseStore
  });
})(window);
