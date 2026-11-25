// Learncraft store: the course's local-first evidence log. Classic script (UMD), ES2017, no dependencies, no DOM.
// Browser: window.Learncraft.store; Node: module.exports. Contract: docs/audit/IMPLEMENTATION-PLAN.md §3.
// Rules and derivations: docs/architecture/data-model.md.
//   var s = Learncraft.store.createStore({ courseId: COURSE.id });  s.load();
//   s.recordAttempt({ lesson: 3, objective: 'l3.o1', item: 'l3-q1', itemType: 'choice', itemVersion: v, correct: false });
//   s.level('l3.o1', { milestoneMastered: false }) → { level: 2, name: 'Familiar', basis }
// The log is append-only: there is no edit or delete API. Levels, schedules and XP are derived on every call and
// never stored. The v0 key `learn:<id>` is read once to migrate and is never written or deleted.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.Learncraft = root.Learncraft || {}; root.Learncraft.store = api; }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var FORMAT = 'learncraft-progress', SCHEMA = 2, DAY = 864e5, COMPACT_AFTER = 90 * DAY;
  // Bounds (SR-06, SR-09): imports are capped so one file cannot freeze the page or fill the shared quota;
  // events this runtime cannot validate are kept verbatim up to a cap; corrupt values keep a few backups.
  var MAX_IMPORT_CHARS = 5e6, MAX_IMPORT_EVENTS = 20000, MAX_QUARANTINE = 500, MAX_QUARANTINE_CHARS = 5e5, MAX_BACKUPS = 3;
  var INTERVALS = [0, 1, 3, 7, 14, 30]; // days, indexed by box 1..5 (a design choice, not a research constant)
  var KINDS = ['exposure', 'attempt', 'review_session', 'migration'], SOURCES = ['browser', 'migration', 'import'];
  var CONTEXTS = ['lesson', 'practice', 'review', 'diagnostic'], OUTCOMES = ['correct', 'incorrect', 'n/a'];
  var RECALL_TYPES = ['recall', 'fade', 'order', 'label', 'explain'];
  var LEVEL_NAMES = ['Not started', 'Seen', 'Familiar', 'Understood', 'Applied', 'Retained', 'Transferred'];
  var BAD_KEYS = ['__proto__', 'constructor', 'prototype'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ---------- small helpers ----------
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function map() { return Object.create(null); }
  function vals(m) { return Object.keys(m).map(function (k) { return m[k]; }); }
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
  function iso(ms) { return new Date(ms).toISOString(); }
  function ms(at) { return Date.parse(at); }
  // Strict ISO 8601 (the progress schema's pattern), a real calendar date and a sane year (SR-13). Date.parse alone
  // accepts "1", "Feb 30" and year 275760.
  var ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-](\d{2}):(\d{2}))$/;
  function isDate(s) {
    var m = typeof s === 'string' && s.length <= 40 ? ISO.exec(s) : null;
    if (!m) return false;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < 2000 || y > 2199 || mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return false;
    if (+m[4] > 23 || +m[5] > 59 || +m[6] > 59 || (m[9] && (+m[9] > 23 || +m[10] > 59))) return false;
    return isFinite(Date.parse(s));
  }
  function safeIso(t) { try { var s = iso(t); return isDate(s) ? s : null; } catch (e) { return null; } }
  function safeParse(text) { // drops __proto__/constructor/prototype keys at every depth
    try { return typeof text === 'string' ? JSON.parse(text, function (k, v) { return BAD_KEYS.indexOf(k) >= 0 ? undefined : v; }) : null; } catch (e) { return null; }
  }
  function fnv(s) { // FNV-1a 32-bit over UTF-16 code units → base36; identical in every JS engine
    for (var h = 0x811c9dc5, i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
    return h.toString(36);
  }
  function stable(v) { // JSON with sorted keys
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (!v || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
  }
  function lessonOf(objective) { var m = /^l(\d+)(?:\.|$)/i.exec(objective || ''); return m ? +m[1] : null; }
  function sortEvents(evts) { // time order, stable on ties (log order)
    return evts.map(function (e, i) { return [ms(e.at), i, e]; })
      .sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).map(function (x) { return x[2]; });
  }
  function fmtDate(t) { var d = new Date(t); return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate(); }

  // ---------- pure exports ----------
  function itemVersion(x) { // short stable hash of what the learner answers; edits to `why` keep the history
    if (typeof x === 'string') return fnv(x.normalize('NFC'));
    if (!x || typeof x !== 'object') return fnv(String(x));
    var pick = { type: x.type, prompt: x.prompt, accept: x.accept, steps: x.steps, template: x.template, blanks: x.blanks,
      options: Array.isArray(x.options) ? x.options.map(function (o) { return { text: o && o.text, correct: !!(o && o.correct) }; }) : undefined };
    return fnv(stable(pick).normalize('NFC'));
  }
  function normalizeAnswer(s) { // lenient recall matching: case, accents, quotes, dashes, spacing, end punctuation
    return String(s == null ? '' : s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[\u2018\u2019\u201a\u201b\u201c\u201d\u201e"'`\u00b4]/g, '').replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/\s+/g, ' ').trim().replace(/^[.,;:!?\s]+|[.,;:!?\s]+$/g, '');
  }
  function matchAnswer(input, accept) {
    var n = normalizeAnswer(input);
    return n !== '' && (accept || []).some(function (a) { return normalizeAnswer(a) === n; });
  }

  // ---------- event validation ----------
  var NULLS = { lesson: null, objective: null, item: null, itemType: null, itemVersion: null, session: null, attemptInSession: null, firstEver: null };
  function str(v, max) { return typeof v === 'string' && v.length > 0 && v.length <= (max || 200); }
  function sanitizeEvent(e) { // → { event } (a fresh frozen object with known fields only) or { error }
    if (!e || typeof e !== 'object' || Array.isArray(e)) return { error: 'event is not an object' };
    var out = {}, k;
    if (e.v !== 1) return { error: 'v must be 1' };
    if (!str(e.id, 100) || !/^[A-Za-z0-9_.:-]+$/.test(e.id)) return { error: 'bad id' };
    if (!isDate(e.at)) return { error: 'bad at' };
    if (!str(e.course)) return { error: 'bad course' };
    if (KINDS.indexOf(e.kind) < 0) return { error: 'unknown kind ' + String(e.kind).slice(0, 40) };
    if (SOURCES.indexOf(e.source) < 0) return { error: 'unknown source' };
    if (CONTEXTS.indexOf(e.context) < 0) return { error: 'unknown context' };
    if (OUTCOMES.indexOf(e.outcome) < 0) return { error: 'unknown outcome' };
    if (typeof e.assisted !== 'boolean') return { error: 'assisted must be boolean' };
    ['v', 'id', 'at', 'course', 'kind', 'source', 'context'].forEach(function (f) { out[f] = e[f]; });
    for (k in NULLS) {
      var v = has(e, k) ? e[k] : null;
      if (v !== null) {
        if (k === 'lesson' && !(isInt(v) && v >= 0)) return { error: 'bad lesson' };
        if (k === 'attemptInSession' && !(isInt(v) && v >= 1)) return { error: 'bad attemptInSession' };
        if (k === 'firstEver' && typeof v !== 'boolean') return { error: 'bad firstEver' };
        if (['lesson', 'attemptInSession', 'firstEver'].indexOf(k) < 0 && !str(v)) return { error: 'bad ' + k };
      }
      out[k] = v;
    }
    out.outcome = e.outcome; out.assisted = e.assisted;
    if (e.score != null) { if (typeof e.score !== 'number' || !(e.score >= 0 && e.score <= 1)) return { error: 'bad score' }; out.score = e.score; }
    if (e.note != null) { if (typeof e.note !== 'string' || e.note.length > 2000) return { error: 'bad note' }; out.note = e.note; }
    if (e.kind === 'attempt' && out.item === null) return { error: 'attempt needs item' };
    if (e.kind === 'attempt' && out.outcome === 'n/a') return { error: 'attempt needs a correct/incorrect outcome' };
    if (e.kind === 'exposure' && out.lesson === null) return { error: 'exposure needs lesson' };
    if (e.kind === 'exposure' && e.count != null) { if (!(isInt(e.count) && e.count >= 1)) return { error: 'bad count' }; out.count = e.count; }
    if (e.kind === 'review_session') {
      if (out.objective === null) return { error: 'review_session needs objective' };
      if (!Array.isArray(e.results) || !e.results.length || e.results.length > 50) return { error: 'bad results' };
      out.results = [];
      for (var i = 0; i < e.results.length; i++) {
        var r = e.results[i];
        if (!r || !str(r.item) || (r.outcome !== 'correct' && r.outcome !== 'incorrect')) return { error: 'bad results[' + i + ']' };
        out.results.push(Object.freeze({ item: r.item, outcome: r.outcome }));
      }
      if (typeof e.passed !== 'boolean') return { error: 'review_session needs passed' };
      Object.freeze(out.results); out.passed = e.passed;
    }
    if (e.kind === 'migration') {
      if (e.legacyXp != null) { if (!(typeof e.legacyXp === 'number' && e.legacyXp >= 0 && isFinite(e.legacyXp))) return { error: 'bad legacyXp' }; out.legacyXp = e.legacyXp; }
      if (e.box != null || e.due != null) {
        if (!(isInt(e.box) && e.box >= 1 && e.box <= 2) || !isDate(e.due) || out.lesson === null) return { error: 'bad migrated schedule' };
        out.box = e.box; out.due = e.due;
      }
      if (out.legacyXp == null && out.box == null) return { error: 'empty migration event' };
    }
    return { event: Object.freeze(out) };
  }

  // ---------- v0 → v2 migration (pure; deterministic ids so a re-run dedupes) ----------
  function migrateV0(v0, opts) {
    opts = opts || {};
    var course = opts.courseId, nowMs = (opts.now || Date.now)(), out = [];
    if (!v0 || typeof v0 !== 'object' || typeof course !== 'string') return out;
    function push(seed, at, extra) {
      var c = sanitizeEvent(Object.assign({ v: 1, id: 'm_' + fnv(course + '|' + seed), at: at, course: course, kind: 'migration',
        source: 'migration', context: 'lesson', session: 'legacy', outcome: 'n/a', assisted: false }, extra));
      if (c.event) out.push(c.event);
    }
    var answers = v0.answers && typeof v0.answers === 'object' ? v0.answers : {};
    Object.keys(answers).forEach(function (k) {
      var m = /^L(\d+):(.+)$/.exec(k), a = answers[k];
      if (!m || !a || typeof a.ok !== 'boolean') return;
      var at = (isInt(a.at) && a.at > 0 && safeIso(a.at)) || iso(nowMs);
      push('a|' + k, at, { kind: 'attempt', lesson: +m[1], objective: 'l' + m[1], item: m[2], itemVersion: 'legacy',
        firstEver: null, attemptInSession: null, outcome: a.ok ? 'correct' : 'incorrect', note: 'v0 answer: last result only; first try unknown' });
    });
    var lessons = v0.lessons && typeof v0.lessons === 'object' ? v0.lessons : {};
    Object.keys(lessons).forEach(function (n) {
      var L = lessons[n];
      if (!/^\d+$/.test(n) || !L || !isInt(L.stage) || L.stage < 0 || !isInt(L.last) || L.last <= 0) return;
      var box = Math.min(L.stage + 1, 2); // v0 stage 0 ≈ box 1 (1 day); capped at 2 because v0 advanced on failures
      push('s|' + n, iso(nowMs), { lesson: +n, objective: 'l' + n, box: box, due: safeIso(L.last + INTERVALS[box] * DAY),
        note: 'legacy stage ' + L.stage + ' capped at box 2: v0 advanced on failures' });
    });
    if (typeof v0.xp === 'number' && v0.xp > 0 && isFinite(v0.xp)) push('xp', iso(nowMs), { legacyXp: v0.xp, note: 'v0 XP' });
    return sortEvents(out);
  }

  // ---------- derivations (pure) ----------
  function isLegacy(e) { return e.itemVersion === 'legacy'; }
  // context 'diagnostic' marks a pretest guess (an item with pretest: true, asked before teaching). It is evidence
  // of prior knowledge only: never a first try, never part of a level, XP or review entry (SK-03).
  function isDiagnostic(e) { return e.context === 'diagnostic'; }
  function correct(e) { return e.outcome === 'correct' && !e.assisted; }
  // First try per item+version (earliest by time), and per item the current version's first try (legacy only if
  // nothing newer exists). Stored firstEver flags are informational; merged logs are re-derived by time.
  function firstTries(sorted, pred) {
    var byKey = map(), byItem = map();
    sorted.forEach(function (e) { var k = e.item + '\u0000' + e.itemVersion; if (e.kind === 'attempt' && !isDiagnostic(e) && pred(e) && !byKey[k]) byKey[k] = e; });
    vals(byKey).forEach(function (e) {
      var cur = byItem[e.item];
      if (!cur || (isLegacy(cur) && !isLegacy(e)) || (isLegacy(cur) === isLegacy(e) && ms(e.at) >= ms(cur.at))) byItem[e.item] = e;
    });
    return { byKey: byKey, byItem: byItem };
  }
  function deriveLevel(events, objective, opts) {
    opts = opts || {};
    var lessonN = opts.lesson != null ? opts.lesson : lessonOf(objective), types = opts.itemTypes || {};
    var sorted = sortEvents(events || []), mine = sorted.filter(function (e) { return e.objective === objective; });
    var ft = firstTries(sorted, function (e) { return e.objective === objective; });
    var items = vals(ft.byItem), fresh = items.filter(function (e) { return !isLegacy(e); });
    var firsts = vals(ft.byKey).filter(function (e) { return !isLegacy(e); });
    var typeOf = function (e) { return e.itemType || (has(types, e.item) ? types[e.item] : null); };
    var nItemsOk = items.filter(correct).length, nFreshOk = fresh.filter(correct).length;
    var recallOk = fresh.filter(function (e) { return correct(e) && RECALL_TYPES.indexOf(typeOf(e)) >= 0; }).length;
    var attempts = mine.filter(function (e) { return e.kind === 'attempt' && !isDiagnostic(e); }), reviews = mine.filter(function (e) { return e.kind === 'review_session'; });
    var lastSuccess = null, retained = false, lastPassed = null;
    mine.forEach(function (e) {
      var t = ms(e.at);
      if (e.kind === 'attempt' && correct(e) && firsts.indexOf(e) >= 0) lastSuccess = t;
      if (e.kind === 'review_session') {
        if (e.passed) { if (lastSuccess !== null && t - lastSuccess >= 7 * DAY) retained = true; lastSuccess = t; }
        lastPassed = e.passed;
      }
    });
    var L1 = attempts.length > 0 || reviews.length > 0 ||
      sorted.some(function (e) { return e.kind === 'exposure' && lessonN !== null && e.lesson === lessonN; });
    var L2 = items.length >= 2 && nItemsOk / items.length >= 0.6;
    var L3 = fresh.length >= 3 && nFreshOk / fresh.length >= 0.8 && recallOk >= 1;
    var L4 = !!opts.milestoneMastered || !!opts.transferDemonstrated;
    var L5 = (L3 || L4) && retained && lastPassed === true; // a failed latest review drops Retained until the next pass
    var level = opts.transferDemonstrated ? 6 : L5 ? 5 : L4 ? 4 : L3 ? 3 : L2 ? 2 : L1 ? 1 : 0;
    return { level: level, name: LEVEL_NAMES[level], basis: { attempts: attempts.length, items: items.length,
      firstTryCorrect: nItemsOk, recallCorrect: recallOk, reviews: reviews.length, legacy: items.length - fresh.length } };
  }

  var SAY = {
    'new': 'Not in review yet: answer every practice item once to schedule the first review.',
    enter: '{date}: every practice item tried → box 1, first review {due}',
    migrated: '{date}: carried over from the old progress format → box {box}, due {due} (capped at box 2: the old schedule advanced on failures)',
    pass: '{date}: {correct}/{total} correct → box {box}, due {due}',
    early: '{date}: {correct}/{total} correct before the due date → stays in box {box}, due {due} (early reviews do not count toward spacing)',
    fail: '{date}: {correct}/{total} correct → back to box 1, due {due}'
  };
  function deriveSchedule(events, objective, opts) {
    opts = opts || {};
    var now = typeof opts.now === 'number' ? opts.now : Date.now(), fmt = opts.formatDate || fmtDate;
    var lessonN = opts.lesson != null ? opts.lesson : lessonOf(objective);
    var need = (opts.itemIds || []).map(function (x) { return typeof x === 'string' ? x : x && x.id; });
    var seen = map(), nSeen = 0, box = 0, due = null, status = 'new', log = [];
    function say(key, v) {
      var tpl = SAY[key], s = typeof opts.t === 'function' ? opts.t('schedule.' + key, v) : null;
      if (typeof s === 'string' && s && s !== 'schedule.' + key) return s;
      return tpl.replace(/\{(\w+)\}/g, function (_, k) { return v && v[k] != null ? v[k] : ''; });
    }
    var explanation = say('new', {});
    function set(b, d, st, key, at, extra) {
      box = b; due = d; status = st;
      log.push(explanation = say(key, Object.assign({ date: fmt(at), box: box, due: fmt(due) }, extra)));
    }
    sortEvents(events || []).forEach(function (e) {
      var at = ms(e.at);
      if (e.kind === 'migration' && e.box && lessonN !== null && e.lesson === lessonN) {
        set(e.box, ms(e.due), 'scheduled', 'migrated', at);
      } else if (e.kind === 'attempt' && !isDiagnostic(e) && e.objective === objective && box === 0) {
        if (need.indexOf(e.item) >= 0 && !seen[e.item]) { seen[e.item] = 1; nSeen++; }
        if (!need.length || nSeen === need.length) set(1, at + DAY, 'scheduled', 'enter', at);
      } else if (e.kind === 'review_session' && e.objective === objective) {
        var c = { correct: e.results.filter(function (r) { return r.outcome === 'correct'; }).length, total: e.results.length };
        if (!e.passed) set(1, at + DAY, 'lapsed', 'fail', at, c);
        else if (box === 0 || at >= due) { var b = Math.min(Math.max(box, 1) + 1, 5); set(b, at + INTERVALS[b] * DAY, 'scheduled', 'pass', at, c); }
        else set(box, due, status, 'early', at, c); // logged, nothing changes
      }
    });
    if (box > 0 && status !== 'lapsed') status = now >= due ? 'due' : 'scheduled';
    return { box: box, due: due, status: status, explanation: explanation, log: log };
  }

  // ---------- store ----------
  function defaultStorage() { try { return typeof window !== 'undefined' ? window.localStorage : null; } catch (e) { return null; } }
  function isQuota(e) { return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014); }

  function createStore(o) {
    o = o || {};
    var courseId = o.courseId;
    if (!str(courseId)) throw new TypeError('createStore: courseId is required');
    var usingDefault = !has(o, 'storage');
    var storage = usingDefault ? defaultStorage() : o.storage;
    var now = o.now || Date.now, random = o.random || Math.random;
    var KEY = 'learn:' + courseId + ':v2', V0 = 'learn:' + courseId;
    var rand4 = function () { return ('000' + Math.floor(random() * 1679616).toString(36)).slice(-4); };
    var session = 's_' + now().toString(36) + rand4();
    var persistent = !!storage, loaded = false, listeners = [], lastLoad = null, lastWrite = null;
    var doc = emptyDoc(), ids = map(), quarantine = [], lastWritten = null, refusedNewer = false;

    function emptyDoc() { var t = iso(now()); return { format: FORMAT, schemaVersion: SCHEMA, course: courseId, createdAt: t, updatedAt: t, events: [] }; }
    function read(key) { try { return { value: storage.getItem(key) }; } catch (e) { return { error: e }; } }
    function put(key, value) { try { storage.setItem(key, value); return true; } catch (e) { return false; } }
    function drop(key) { try { if (typeof storage.removeItem === 'function') storage.removeItem(key); else storage.setItem(key, ''); } catch (e) { /* best effort */ } }
    function qKey(e) { return e && typeof e.id === 'string' ? 'id:' + e.id : 'json:' + JSON.stringify(e); }
    // Events that fail sanitizeEvent but are objects (a newer kind, a longer field) are quarantined: kept verbatim,
    // never rendered or derived from, written back and exported unchanged, re-validated on every load (SR-06).
    function checkDoc(p) {
      if (!p || typeof p !== 'object' || Array.isArray(p) || p.format !== FORMAT) return { error: 'not a progress document' };
      if (typeof p.schemaVersion === 'number' && p.schemaVersion > SCHEMA) return { error: 'newer format', newer: true };
      if (p.schemaVersion !== SCHEMA || p.course !== courseId || !Array.isArray(p.events)) return { error: 'invalid document' };
      var d = emptyDoc(), seen = map(), rejected = 0, q = [], qSeen = map();
      if (isDate(p.createdAt)) d.createdAt = p.createdAt;
      if (isDate(p.updatedAt)) d.updatedAt = p.updatedAt;
      p.events.forEach(function (e) {
        var c = sanitizeEvent(e);
        if (!c.error) { if (!seen[c.event.id]) { seen[c.event.id] = 1; d.events.push(c.event); } return; }
        rejected++;
        if (e && typeof e === 'object' && !Array.isArray(e) && !qSeen[qKey(e)]) { qSeen[qKey(e)] = 1; q.push(e); }
      });
      return { doc: d, rejected: rejected, quarantine: q };
    }
    function reindex() { ids = map(); doc.events.forEach(function (e) { ids[e.id] = 1; }); }
    function addQuarantine(list) { // bounded; the overflow goes to a corrupt backup instead of being lost
      var have = map(), size = 0, over = [];
      quarantine.forEach(function (e) { have[qKey(e)] = 1; size += JSON.stringify(e).length; });
      (list || []).forEach(function (e) {
        var k = qKey(e);
        if (have[k] || (e && typeof e.id === 'string' && ids[e.id])) return;
        var n = JSON.stringify(e).length;
        if (quarantine.length >= MAX_QUARANTINE || size + n > MAX_QUARANTINE_CHARS) { over.push(e); return; }
        have[k] = 1; size += n; quarantine.push(e);
      });
      if (over.length && storage) backupCorrupt(JSON.stringify({ format: FORMAT, quarantineOverflow: true, events: over }));
    }
    // Corrupt values are backed up, never lost: `<key>:corrupt` holds the newest; older ones move to
    // `<key>:corrupt:<ISO time>`; `<key>:corrupt:index` lists them and only the newest MAX_BACKUPS are kept.
    function backupCorrupt(raw) {
      var IDX = KEY + ':corrupt:index', LATEST = KEY + ':corrupt';
      var idx = safeParse(read(IDX).value || '');
      idx = Array.isArray(idx) ? idx.filter(function (x) { return x && typeof x.key === 'string' && x.key.indexOf(KEY + ':corrupt') === 0 && typeof x.at === 'string'; }) : [];
      var prev = read(LATEST).value;
      if (prev != null && prev !== '' && !idx.some(function (x) { return x.key === LATEST; })) idx.push({ key: LATEST, at: 'before-' + iso(now()) });
      var last = idx[idx.length - 1];
      if (last && last.key === LATEST && prev != null) {
        var moved = KEY + ':corrupt:' + last.at.replace(/^before-/, '');
        while (idx.some(function (x) { return x.key === moved; })) moved += '+';
        if (put(moved, prev)) last.key = moved; else idx.pop();
      }
      if (!put(LATEST, raw)) return false;
      idx.push({ key: LATEST, at: iso(now()) });
      while (idx.length > MAX_BACKUPS) drop(idx.shift().key);
      put(IDX, JSON.stringify(idx));
      return true;
    }
    function load() {
      var res = { ok: true, persistent: true, migrated: false, rejected: 0, quarantined: 0, templateId: courseId === 'topic-slug' };
      loaded = true; doc = emptyDoc(); quarantine = []; ids = map(); refusedNewer = false; lastWritten = null;
      if (!storage) { persistent = false; res.persistent = false; res.reason = 'unavailable'; return (lastLoad = res); }
      var raw = read(KEY);
      if (raw.error) { persistent = false; res.persistent = false; res.reason = 'blocked'; return (lastLoad = res); }
      persistent = true;
      if (raw.value != null) {
        var c = checkDoc(safeParse(raw.value));
        if (c.doc) {
          doc = c.doc; reindex(); addQuarantine(c.quarantine); lastWritten = raw.value;
          res.rejected = c.rejected; res.quarantined = quarantine.length; return (lastLoad = res);
        }
        res.ok = false;
        if (c.newer) { persistent = false; refusedNewer = true; res.persistent = false; res.reason = 'newer-format'; return (lastLoad = res); } // never overwrite
        res.reason = 'corrupt';
        backupCorrupt(raw.value);
      }
      var old = read(V0);
      if (old.value != null) {
        var v0 = safeParse(old.value);
        if (v0 && typeof v0 === 'object' && !Array.isArray(v0)) { doc.events = migrateV0(v0, { courseId: courseId, now: now }); reindex(); res.migrated = true; }
        else res.rejected++;
      }
      if (res.migrated || res.reason) write();
      res.persistent = persistent;
      return (lastLoad = res);
    }
    function ensure() { if (!loaded) load(); } // every method loads lazily if load() was not called
    function merge(incoming) { // union by id, then time order; returns how many were new
      var added = incoming.filter(function (e) { return !ids[e.id] && (ids[e.id] = 1); });
      if (added.length) doc.events = sortEvents(doc.events.concat(added));
      return added.length;
    }
    function compact(cutoff) { // exposure events older than 90 days → one count event per lesson; never attempts
      var groups = map(), keep = [], changed = false;
      doc.events.forEach(function (e) { if (e.kind === 'exposure' && ms(e.at) < cutoff) (groups[e.lesson] = groups[e.lesson] || []).push(e); else keep.push(e); });
      Object.keys(groups).forEach(function (n) {
        var g = groups[n], last = g[g.length - 1];
        if (g.length < 2) { keep.push(g[0]); return; }
        var count = g.reduce(function (s, e) { return s + (e.count || 1); }, 0);
        keep.push(sanitizeEvent({ v: 1, id: 'c_' + fnv(g.map(function (e) { return e.id; }).join('|')), at: last.at, course: courseId,
          kind: 'exposure', source: 'browser', context: 'lesson', lesson: +n, outcome: 'n/a', assisted: false, count: count,
          note: count + ' lesson views up to ' + last.at.slice(0, 10) + ' compacted' }).event);
        changed = true;
      });
      if (changed) { doc.events = sortEvents(keep); reindex(); }
      return changed;
    }
    function serialize() {
      return JSON.stringify(quarantine.length ? Object.assign({}, doc, { events: doc.events.concat(quarantine) }) : doc);
    }
    // Writes the document and returns { ok, persisted, reason }. It never clobbers: another tab's events are merged
    // first; a newer-format document is left alone (persistence stops); a corrupt value is backed up first.
    // Listeners hear about every failed write (SR-05), with (api, { type: 'write', persisted: false, reason }).
    function write() {
      var st;
      if (!persistent) st = { ok: false, persisted: false, reason: refusedNewer ? 'newer-format' : storage ? 'not-saving' : 'unavailable' };
      else {
        doc.updatedAt = iso(now());
        var cur = read(KEY);
        if (cur.error) st = { ok: false, persisted: false, reason: 'blocked' };
        else if (cur.value != null && cur.value !== lastWritten) { // another tab or store wrote since: merge, never clobber
          var c = checkDoc(safeParse(cur.value));
          if (c.doc) { merge(c.doc.events); addQuarantine(c.quarantine); }
          else if (c.newer) { refusedNewer = true; st = { ok: false, persisted: false, reason: 'newer-format' }; }
          else backupCorrupt(cur.value);
        }
        if (!st) {
          for (var i = 0; i < 2 && !st; i++) {
            var text = serialize();
            try { storage.setItem(KEY, text); lastWritten = text; st = { ok: true, persisted: true }; }
            catch (e) { if (!(i === 0 && isQuota(e) && compact(now() - COMPACT_AFTER))) st = { ok: false, persisted: false, reason: isQuota(e) ? 'quota' : 'blocked' }; }
          }
        }
      }
      lastWrite = Object.assign({ at: iso(now()) }, st);
      if (!st.persisted) { persistent = false; notify({ type: 'write', persisted: false, reason: st.reason }); }
      return st;
    }
    function notify(info) { listeners.slice().forEach(function (fn) { try { fn(api, info || { type: 'change' }); } catch (e) { /* a listener never breaks the store */ } }); }
    function append(e) { doc.events.push(e); ids[e.id] = 1; write(); notify({ type: 'change', persisted: persistent }); return e; }
    function base(extra) {
      var id;
      do { id = 'e_' + now().toString(36) + '_' + rand4(); } while (ids[id]);
      return Object.assign({ v: 1, id: id, at: iso(now()), course: courseId, source: 'browser', assisted: false }, NULLS, { session: session }, extra);
    }
    function add(e, what) { var c = sanitizeEvent(e); if (c.error) throw new TypeError(what + ': ' + c.error); return append(c.event); }
    // Re-reads storage after another tab wrote (the browser's `storage` event), merges, and tells listeners (SR-13).
    function refresh() {
      if (!loaded) { load(); notify({ type: 'external' }); return { changed: true }; }
      if (!storage) return { changed: false };
      var cur = read(KEY), changed = 0;
      if (cur.error || cur.value == null || cur.value === lastWritten) return { changed: false };
      var c = checkDoc(safeParse(cur.value));
      if (c.doc) { changed = merge(c.doc.events); addQuarantine(c.quarantine); lastWritten = cur.value; } // we now hold all of it
      else if (c.newer) { refusedNewer = true; persistent = false; notify({ type: 'write', persisted: false, reason: 'newer-format' }); return { changed: false }; }
      notify({ type: 'external' });
      return { changed: changed > 0 };
    }
    if (usingDefault && storage && typeof window !== 'undefined' && window.addEventListener && o.listen !== false) {
      window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) { try { refresh(); } catch (err) { /* never break the page */ } } });
    }

    function recordExposure(lesson) { // at most one per page session and lesson
      ensure();
      if (!(isInt(lesson) && lesson >= 0)) throw new TypeError('recordExposure: lesson must be an integer');
      var prev = doc.events.filter(function (e) { return e.kind === 'exposure' && e.session === session && e.lesson === lesson; })[0];
      return prev || add(base({ kind: 'exposure', context: 'lesson', lesson: lesson, outcome: 'n/a' }), 'recordExposure');
    }
    function recordAttempt(a) {
      ensure(); a = a || {};
      if (!str(a.item)) throw new TypeError('recordAttempt: item is required');
      var lesson = a.lesson == null ? null : a.lesson, ver = a.itemVersion || null, sess = a.session || session;
      var ctx = a.context || 'lesson';
      var prior = doc.events.filter(function (e) { return e.kind === 'attempt' && e.item === a.item && !isDiagnostic(e); });
      var e = base({ kind: 'attempt', context: ctx, lesson: lesson, objective: a.objective || (lesson != null ? 'l' + lesson : null),
        item: a.item, itemType: a.itemType || null, itemVersion: ver, session: sess,
        attemptInSession: prior.filter(function (p) { return p.session === sess; }).length + 1,
        firstEver: ctx === 'diagnostic' ? false : !prior.some(function (p) { return p.itemVersion === ver; }),
        outcome: typeof a.correct === 'boolean' ? (a.correct ? 'correct' : 'incorrect') : a.outcome, assisted: !!a.assisted });
      if (a.score != null) e.score = a.score;
      if (a.note != null) e.note = String(a.note);
      return add(e, 'recordAttempt');
    }
    function firstAttempt(item, ver) {
      ensure();
      var ft = firstTries(sortEvents(doc.events), function (e) { return e.item === item; });
      return (ver === undefined ? ft.byItem[item] : ft.byKey[item + '\u0000' + (ver || null)]) || null;
    }
    function lessonStats(lesson, itemIds) {
      ensure();
      var ids = itemIds ? itemIds.map(function (x) { return typeof x === 'string' ? { id: x } : { id: x.id, ver: x.itemVersion }; }) : null;
      var wanted = ids ? ids.map(function (x) { return x.id; }) : null;
      var ft = firstTries(sortEvents(doc.events), function (e) { return wanted ? wanted.indexOf(e.item) >= 0 : e.lesson === lesson; });
      var picked = ids ? ids.map(function (x) { // an edited question (new version) starts a new history
        return x.ver ? ft.byKey[x.id + '\u0000' + x.ver] || ft.byKey[x.id + '\u0000legacy'] : ft.byItem[x.id];
      }).filter(Boolean) : vals(ft.byItem);
      var ok = picked.filter(correct).length;
      return { items: ids ? ids.length : picked.length, attempted: picked.length, firstTryCorrect: ok,
        pct: picked.length ? Math.round(100 * ok / picked.length) : null, legacy: picked.filter(isLegacy).length };
    }
    function level(objective, opts) { ensure(); return deriveLevel(doc.events, objective, opts); }
    function schedule(objective, opts) { ensure(); return deriveSchedule(doc.events, objective, Object.assign({ now: now() }, opts)); }
    function due(at, opts) {
      ensure(); opts = opts || {};
      var t = typeof at === 'number' ? at : now(), objs = map(), byLesson = map();
      doc.events.forEach(function (e) {
        if ((e.kind === 'attempt' || e.kind === 'review_session') && e.objective) objs[e.objective] = 1;
        if (e.kind === 'migration' && e.box) objs['l' + e.lesson] = 1;
      });
      Object.keys(objs).forEach(function (id) { var n = lessonOf(id); if (n !== null && id !== 'l' + n) byLesson[n] = 1; });
      return Object.keys(objs).filter(function (id) { return !(id === 'l' + lessonOf(id) && byLesson[lessonOf(id)]); })
        .map(function (id) {
          var s = deriveSchedule(doc.events, id, { now: t, itemIds: opts.itemIds && opts.itemIds[id] });
          return { objective: id, box: s.box, due: s.due, status: s.status, overdueRatio: s.box ? (t - s.due) / (INTERVALS[s.box] * DAY) : 0 };
        })
        .filter(function (x) { return x.box > 0 && t >= x.due; })
        .sort(function (a, b) { return b.overdueRatio - a.overdueRatio || (a.objective < b.objective ? -1 : 1); });
    }
    function recordReviewSession(r) {
      ensure(); r = r || {};
      if (!str(r.objective) || !Array.isArray(r.results) || !r.results.length) throw new TypeError('recordReviewSession: objective and results are required');
      var ok = r.results.filter(function (x) { return x && x.outcome === 'correct'; }).length, total = r.results.length;
      var passed = ok / total >= 0.8; // with two items: both
      add(base({ kind: 'review_session', context: 'review', session: r.session || session,
        lesson: r.lesson != null ? r.lesson : lessonOf(r.objective), objective: r.objective,
        results: r.results, passed: passed, outcome: passed ? 'correct' : 'incorrect', score: ok / total }), 'recordReviewSession');
      var s = schedule(r.objective, { itemIds: r.itemIds, t: r.t });
      return { passed: passed, box: s.box, due: s.due, status: s.status, explanation: s.explanation };
    }
    function xp() {
      ensure();
      var firsts = vals(firstTries(sortEvents(doc.events), function () { return true; }).byKey);
      return Math.max(doc.events.reduce(function (m, e) { return e.legacyXp > m ? e.legacyXp : m; }, 0), // legacy v0 XP
        10 * firsts.filter(function (e) { return !isLegacy(e) && correct(e); }).length);
    }
    function exportJSON() {
      ensure();
      return JSON.stringify({ format: FORMAT, schemaVersion: SCHEMA, course: courseId, createdAt: doc.createdAt,
        updatedAt: doc.updatedAt, exportedAt: iso(now()), events: doc.events.concat(quarantine) }, null, 2); // quarantined events travel too
    }
    function exportFilename() { return 'progress-' + courseId.replace(/[^A-Za-z0-9_-]+/g, '-') + '-' + iso(now()).slice(0, 10) + '.json'; }
    // → { added, skipped, errors, persisted, reason? }. Capped (MAX_IMPORT_CHARS, MAX_IMPORT_EVENTS) with a clear
    // message; `persisted: false` means the events are in this page only (storage full or blocked): say so (SR-05).
    function importJSON(text, opts) {
      ensure(); opts = opts || {};
      var res = { added: 0, skipped: 0, errors: [], persisted: persistent };
      var raw = typeof text === 'string' ? text : JSON.stringify(text);
      if (typeof raw === 'string' && raw.length > MAX_IMPORT_CHARS) {
        res.errors.push('The file is too large (' + (raw.length / 1e6).toFixed(1) + ' MB; the limit is ' + MAX_IMPORT_CHARS / 1e6 + ' MB). Nothing was imported.');
        return res;
      }
      var p = safeParse(raw);
      if (!p || typeof p !== 'object' || Array.isArray(p)) { res.errors.push('The file is not JSON.'); return res; }
      if (p.format !== FORMAT) { res.errors.push('This is not a Learncraft progress file.'); return res; }
      if (p.schemaVersion !== SCHEMA) { res.errors.push('Unsupported schemaVersion ' + String(p.schemaVersion).slice(0, 20) + '.'); return res; }
      if (p.course !== courseId && !opts.force) { res.errors.push('This file is for course "' + String(p.course).slice(0, 80) + '", not "' + courseId + '".'); return res; }
      if (!Array.isArray(p.events)) { res.errors.push('The file has no events list.'); return res; }
      if (p.events.length > MAX_IMPORT_EVENTS) {
        res.errors.push('The file has ' + p.events.length + ' events; the limit is ' + MAX_IMPORT_EVENTS + '. Nothing was imported.');
        return res;
      }
      var seen = map(), incoming = [], latest = now() + DAY;
      p.events.forEach(function (e, i) {
        if (e && typeof e === 'object' && e.source == null) e = Object.assign({}, e, { source: 'import' });
        var c = sanitizeEvent(e);
        if (!c.error && ms(c.event.at) > latest) c = { error: 'bad at (in the future)' };
        if (c.error) { if (res.errors.length < 50) res.errors.push('events[' + i + ']: ' + c.error); return; }
        if (ids[c.event.id] || seen[c.event.id]) { res.skipped++; return; }
        seen[c.event.id] = 1; incoming.push(c.event); res.added++;
      });
      if (incoming.length) {
        merge(incoming);
        var w = write();
        res.persisted = w.persisted; if (!w.persisted) res.reason = w.reason;
        notify({ type: 'import', persisted: w.persisted });
      }
      return res;
    }
    function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

    var api = {
      courseId: courseId, key: KEY, session: session,
      load: load, recordExposure: recordExposure, recordAttempt: recordAttempt, firstAttempt: firstAttempt,
      lessonStats: lessonStats, level: level, schedule: schedule, due: due, recordReviewSession: recordReviewSession,
      xp: xp, exportJSON: exportJSON, exportFilename: exportFilename, importJSON: importJSON, subscribe: subscribe,
      events: function () { ensure(); return doc.events.slice(); },
      // Additive (security review): refresh() after another tab wrote; quarantined() counts kept-but-unread events.
      refresh: refresh, quarantined: function () { ensure(); return quarantine.length; },
      get persistent() { return persistent; },
      get lastLoad() { return lastLoad; },
      get lastWrite() { return lastWrite; }
    };
    return api;
  }

  return {
    createStore: createStore, migrateV0: migrateV0, deriveSchedule: deriveSchedule, deriveLevel: deriveLevel,
    normalizeAnswer: normalizeAnswer, matchAnswer: matchAnswer, itemVersion: itemVersion, sanitizeEvent: sanitizeEvent,
    lessonOf: lessonOf, isDate: isDate, FORMAT: FORMAT, SCHEMA_VERSION: SCHEMA,
    LIMITS: { importChars: MAX_IMPORT_CHARS, importEvents: MAX_IMPORT_EVENTS, quarantine: MAX_QUARANTINE, backups: MAX_BACKUPS }, INTERVALS: INTERVALS.slice(1), LEVEL_NAMES: LEVEL_NAMES.slice(), RECALL_TYPES: RECALL_TYPES.slice()
  };
});
