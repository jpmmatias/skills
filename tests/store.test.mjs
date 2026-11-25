// Unit tests for skills/learn/starter/assets/store.js (workstream D). Run: node --test tests/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { requireClassic } from '../scripts/lib/schema.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STORE_PATH = join(ROOT, 'skills/learn/starter/assets/store.js');
const FIX = join(ROOT, 'tests/fixtures/data');
const S = requireClassic(STORE_PATH);
const DAY = 864e5;
const T0 = Date.parse('2026-11-24T10:00:00Z');

// ---------- helpers ----------
function memStorage(opts = {}) {
  const map = new Map();
  return {
    map,
    getItem(k) { if (opts.throwOnGet) throw Object.assign(new Error('blocked'), { name: 'SecurityError' }); return map.has(k) ? map.get(k) : null; },
    setItem(k, v) {
      if (opts.throwOnSet) throw Object.assign(new Error('denied'), { name: 'SecurityError' });
      v = String(v);
      if (opts.quota != null) {
        let size = k.length + v.length;
        for (const [kk, vv] of map) if (kk !== k) size += kk.length + vv.length;
        if (size > opts.quota) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError', code: 22 });
      }
      map.set(k, v);
    },
  };
}
function clock(start = T0) { let t = start; const now = () => t; now.add = (ms) => { t += ms; return t; }; now.set = (v) => { t = v; }; return now; }
function seq() { let i = 0; return () => (((i++ + 1) * 0.6180339887) % 1); }
function make(courseId = 'c1', opts = {}) {
  const storage = 'storage' in opts ? opts.storage : memStorage();
  const now = opts.now || clock();
  const store = S.createStore({ courseId, storage, now, random: opts.random || seq() });
  return { store, storage, now };
}
let n = 0;
function ev(o) { // build a valid event for pure derivation tests
  return S.sanitizeEvent(Object.assign({ v: 1, id: 'x' + (n++), at: new Date(o.t != null ? o.t : T0).toISOString(), course: 'c1', source: 'browser',
    context: 'lesson', outcome: 'n/a', assisted: false }, o, { t: undefined })).event || assert.fail('bad test event ' + JSON.stringify(o));
}
const att = (item, ok, o = {}) => ev(Object.assign({ kind: 'attempt', item, objective: 'l1.o1', lesson: 1, itemVersion: 'v1', outcome: ok ? 'correct' : 'incorrect', itemType: 'choice' }, o));
const review = (passed, t, o = {}) => ev(Object.assign({ kind: 'review_session', objective: 'l1.o1', lesson: 1, context: 'review', t,
  results: passed ? [{ item: 'a', outcome: 'correct' }, { item: 'b', outcome: 'correct' }] : [{ item: 'a', outcome: 'incorrect' }, { item: 'b', outcome: 'correct' }],
  passed, outcome: passed ? 'correct' : 'incorrect' }, o));

// ---------- itemVersion, normalisation, UMD ----------
describe('itemVersion and answers', () => {
  test('FNV-1a 32-bit matches the published test vector and is stable', () => {
    assert.equal(S.itemVersion('hello'), (0x4f9f2cab).toString(36));
    assert.equal(S.itemVersion('What sums to 1?'), S.itemVersion('What sums to 1?'));
    assert.notEqual(S.itemVersion('What sums to 1?'), S.itemVersion('What sums to 2?'));
    assert.equal(S.itemVersion('café'), S.itemVersion('café'), 'NFC-normalised');
    assert.match(S.itemVersion('x'), /^[0-9a-z]{1,7}$/);
  });
  test('object form: prompt and answers count, explanations do not', () => {
    const it = { type: 'choice', prompt: 'P', options: [{ text: 'a', correct: true, why: 'because' }, { text: 'b' }] };
    const v = S.itemVersion(it);
    assert.equal(S.itemVersion({ ...it, why: 'new text', options: [{ ...it.options[0], why: 'other' }, it.options[1]] }), v);
    assert.notEqual(S.itemVersion({ ...it, prompt: 'P2' }), v);
    assert.notEqual(S.itemVersion({ ...it, options: [it.options[1], it.options[0]] }), v);
  });
  test('normalizeAnswer / matchAnswer are lenient about form, not content', () => {
    assert.equal(S.normalizeAnswer('  Soft   Max. '), 'soft max');
    assert.equal(S.normalizeAnswer('Função'), 'funcao');
    assert.equal(S.normalizeAnswer('“d_k”'), 'd_k');
    assert.equal(S.normalizeAnswer('f(x)'), 'f(x)');
    assert.ok(S.matchAnswer('SOFTMAX!', ['softmax']));
    assert.ok(!S.matchAnswer('', ['']));
    assert.ok(!S.matchAnswer('sigmoid', ['softmax']));
  });
  test('UMD: browser load creates or extends window.Learncraft with the same hash', () => {
    const code = readFileSync(STORE_PATH, 'utf8');
    const w1 = {}; w1.window = w1; vm.runInNewContext(code, w1);
    assert.equal(typeof w1.Learncraft.store.createStore, 'function');
    assert.equal(w1.Learncraft.store.itemVersion('hello'), S.itemVersion('hello'));
    const w2 = { Learncraft: { esc: 1 } }; w2.window = w2; vm.runInNewContext(code, w2);
    assert.equal(w2.Learncraft.esc, 1, 'existing core.js members kept');
    assert.equal(typeof w2.Learncraft.store.deriveLevel, 'function');
  });
  test('public API matches the contract', () => {
    for (const k of ['createStore', 'migrateV0', 'deriveSchedule', 'deriveLevel', 'normalizeAnswer', 'itemVersion']) assert.equal(typeof S[k], 'function', k);
    const { store } = make();
    for (const k of ['load', 'recordExposure', 'recordAttempt', 'firstAttempt', 'lessonStats', 'level', 'schedule', 'due', 'recordReviewSession', 'xp', 'exportJSON', 'importJSON']) assert.equal(typeof store[k], 'function', k);
    assert.deepEqual(S.INTERVALS, [1, 3, 7, 14, 30]);
  });
});

// ---------- migration ----------
describe('v0 → v2 migration', () => {
  const v0Bug = readFileSync(join(FIX, 'v0/baseline-bug.json'), 'utf8');
  const v0Rich = readFileSync(join(FIX, 'v0/rich.json'), 'utf8');

  test('baseline bug data migrates; v0 key is never written', () => {
    const storage = memStorage(); storage.map.set('learn:c1', v0Bug);
    const { store } = make('c1', { storage });
    const r = store.load();
    assert.deepEqual([r.ok, r.persistent, r.migrated, r.rejected], [true, true, true, 0]);
    assert.equal(storage.map.get('learn:c1'), v0Bug, 'v0 untouched');
    const doc = JSON.parse(storage.map.get('learn:c1:v2'));
    assert.equal(doc.format, 'learncraft-progress'); assert.equal(doc.schemaVersion, 2);
    const a = doc.events.find((e) => e.kind === 'attempt');
    assert.deepEqual([a.item, a.lesson, a.itemVersion, a.firstEver, a.attemptInSession, a.source, a.outcome], ['q1', 1, 'legacy', null, null, 'migration', 'correct']);
    const sched = doc.events.find((e) => e.kind === 'migration' && e.box);
    assert.deepEqual([sched.lesson, sched.box, sched.due], [1, 1, new Date(Date.parse('2026-11-01T10:00:00Z') + DAY).toISOString()]);
    assert.equal(store.xp(), 10, 'legacy XP kept');
    store.recordAttempt({ lesson: 1, item: 'q2', itemVersion: 'v', correct: true });
    assert.equal(storage.map.get('learn:c1'), v0Bug, 'v0 still untouched after writes');
  });

  test('the exact baseline scenario: wrong → reload → right keeps the first try wrong', () => {
    const storage = memStorage(), now = clock();
    const a = make('c1', { storage, now }).store; a.load();
    const first = a.recordAttempt({ lesson: 1, objective: 'l1', item: 'q1', itemVersion: 'v1', correct: false });
    now.add(60000);
    const b = make('c1', { storage, now }).store; b.load(); // reload = new page session
    const second = b.recordAttempt({ lesson: 1, objective: 'l1', item: 'q1', itemVersion: 'v1', correct: true });
    assert.equal(first.firstEver, true); assert.equal(second.firstEver, false);
    assert.equal(second.attemptInSession, 1, 'first try of the new session');
    assert.equal(b.firstAttempt('q1', 'v1').outcome, 'incorrect');
    assert.deepEqual(b.lessonStats(1, [{ id: 'q1', itemVersion: 'v1' }]), { items: 1, attempted: 1, firstTryCorrect: 0, pct: 0, legacy: 0 });
    assert.equal(b.xp(), 0);
    assert.equal(b.events()[0].outcome, 'incorrect', 'earlier event unchanged');
  });

  test('rich v0: malformed entries skipped, stages capped at box 2, deterministic ids', () => {
    const v0 = JSON.parse(v0Rich), now = () => T0;
    const evs = S.migrateV0(v0, { courseId: 'c1', now });
    assert.deepEqual(S.migrateV0(v0, { courseId: 'c1', now }).map((e) => e.id), evs.map((e) => e.id));
    const attempts = evs.filter((e) => e.kind === 'attempt');
    assert.deepEqual(attempts.map((e) => e.lesson + ':' + e.item).sort(), ['1:q1', '1:q2', '2:mix', '2:q1', '3:q1']);
    const boxes = Object.fromEntries(evs.filter((e) => e.box).map((e) => [e.lesson, e.box]));
    assert.deepEqual(boxes, { 1: 2, 2: 2, 3: 1 });
    const l1 = evs.find((e) => e.box && e.lesson === 1);
    assert.equal(Date.parse(l1.due), v0.lessons[1].last + 3 * DAY);
    assert.equal(evs.find((e) => e.legacyXp).legacyXp, 130);
    assert.ok(evs.every((e) => Object.isFrozen(e)));
  });

  test('legacy answers count toward L2 only', () => {
    const evs = S.migrateV0(JSON.parse(v0Rich), { courseId: 'c1', now: () => T0 });
    assert.equal(S.deriveLevel(evs, 'l2').level, 2);
    const more = evs.concat(S.migrateV0({ answers: { 'L2:r1': { ok: true, at: T0 }, 'L2:r2': { ok: true, at: T0 } } }, { courseId: 'c1', now: () => T0 }));
    const lvl = S.deriveLevel(more, 'l2', { itemTypes: { q1: 'recall', mix: 'recall', r1: 'recall', r2: 'fade' } });
    assert.equal(lvl.level, 2, '4 legacy items, all correct, recall types: still only Familiar');
    assert.equal(lvl.basis.legacy, 4);
    assert.equal(S.deriveLevel(evs, 'l1').level, 1, 'q1 right, q2 wrong = 50%');
  });

  test('v2 present: v0 is not re-migrated', () => {
    const storage = memStorage(); storage.map.set('learn:c1', v0Bug);
    make('c1', { storage }).store.load();
    storage.map.set('learn:c1', JSON.stringify({ xp: 999, answers: { 'L9:z': { ok: true, at: T0 } }, lessons: {} }));
    const { store } = make('c1', { storage }); const r = store.load();
    assert.equal(r.migrated, false); assert.equal(store.xp(), 10);
  });

  test('corrupt v2 is backed up, then v0 is migrated again', () => {
    const storage = memStorage(); storage.map.set('learn:c1', v0Bug); storage.map.set('learn:c1:v2', '{not json');
    const { store } = make('c1', { storage }); const r = store.load();
    assert.equal(r.ok, false); assert.equal(r.reason, 'corrupt'); assert.equal(r.migrated, true);
    assert.equal(storage.map.get('learn:c1:v2:corrupt'), '{not json');
    assert.equal(JSON.parse(storage.map.get('learn:c1:v2')).events.length, 3);
  });

  test('a newer schemaVersion is never overwritten', () => {
    const storage = memStorage(); const newer = JSON.stringify({ format: 'learncraft-progress', schemaVersion: 3, course: 'c1', events: [] });
    storage.map.set('learn:c1:v2', newer);
    const { store } = make('c1', { storage }); const r = store.load();
    assert.deepEqual([r.ok, r.persistent, r.reason], [false, false, 'newer-format']);
    store.recordAttempt({ lesson: 1, item: 'q', itemVersion: 'v', correct: true });
    assert.equal(storage.map.get('learn:c1:v2'), newer);
  });
});

// ---------- load validation ----------
describe('load() validates stored data', () => {
  test('invalid and prototype-polluting events are rejected; valid ones kept', () => {
    const good = att('q1', true);
    const raw = `{"format":"learncraft-progress","schemaVersion":2,"course":"c1","createdAt":"2026-11-24T10:00:00.000Z",
      "updatedAt":"2026-11-24T10:00:00.000Z","__proto__":{"polluted":true},"events":[${JSON.stringify(good)},${JSON.stringify(good)},
      {"v":1,"id":"p1","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}},
      ${JSON.stringify({ ...good, id: 'k1', kind: 'claim' })}, ${JSON.stringify({ ...good, id: 'k2', item: null })},
      ${JSON.stringify({ ...good, id: 'k3', lesson: '1' })}, ${JSON.stringify({ ...good, id: 'k4', score: 7 })},
      ${JSON.stringify({ ...good, id: 'k5', at: 'tomorrow' })}, ${JSON.stringify({ ...good, id: '<img src=x onerror=alert(1)>' })},
      ${JSON.stringify({ ...good, id: 'k6', itemType: { toString: 1 } })}, "string", null, 42]}`;
    const storage = memStorage(); storage.map.set('learn:c1:v2', raw);
    const { store } = make('c1', { storage }); const r = store.load();
    assert.equal(r.ok, true);
    assert.equal(r.rejected, 11);
    assert.equal(store.events().length, 1, 'duplicate id deduped');
    assert.equal(({}).polluted, undefined); assert.equal(Object.prototype.polluted, undefined);
    assert.ok(store.events().every((e) => !Object.prototype.hasOwnProperty.call(e, '__proto__')));
  });
  test('a document for another course is treated as corrupt', () => {
    const storage = memStorage();
    storage.map.set('learn:c1:v2', JSON.stringify({ format: 'learncraft-progress', schemaVersion: 2, course: 'other', events: [] }));
    const r = make('c1', { storage }).store.load();
    assert.equal(r.reason, 'corrupt');
  });
  test('template id is reported', () => {
    assert.equal(make('topic-slug').store.load().templateId, true);
    assert.equal(make('real-course').store.load().templateId, false);
  });
  test('createStore needs a course id', () => {
    assert.throws(() => S.createStore({ storage: memStorage() }), TypeError);
  });
});

// ---------- attempts ----------
describe('attempts are append-only', () => {
  test('attemptInSession per session+item; firstEver per item+version; events frozen', () => {
    const { store, storage, now } = make(); store.load();
    const a1 = store.recordAttempt({ lesson: 2, item: 'a', itemVersion: 'v1', correct: false });
    const a2 = store.recordAttempt({ lesson: 2, item: 'a', itemVersion: 'v1', correct: true });
    const b1 = store.recordAttempt({ lesson: 2, item: 'b', itemVersion: 'v1', correct: true });
    assert.deepEqual([a1.attemptInSession, a2.attemptInSession, b1.attemptInSession], [1, 2, 1]);
    assert.deepEqual([a1.firstEver, a2.firstEver, b1.firstEver], [true, false, true]);
    assert.equal(a1.objective, 'l2', 'objective defaults to l<n>');
    const snapshot = JSON.stringify(store.events());
    now.add(1000);
    const other = make('c1', { storage, now }).store; other.load();
    const a3 = other.recordAttempt({ lesson: 2, item: 'a', itemVersion: 'v2', correct: true, session: 'review-1', context: 'review' });
    assert.deepEqual([a3.attemptInSession, a3.firstEver], [1, true], 'edited question = new history');
    assert.equal(JSON.stringify(other.events().slice(0, 3)), snapshot, 'earlier events never mutated');
    assert.ok(Object.isFrozen(a1));
    assert.throws(() => { 'use strict'; a1.outcome = 'correct'; }, TypeError);
  });
  test('bad input throws instead of writing junk', () => {
    const { store } = make(); store.load();
    assert.throws(() => store.recordAttempt({ lesson: 1 }), /item is required/);
    assert.throws(() => store.recordAttempt({ lesson: 1, item: 'q' }), /outcome/);
    assert.throws(() => store.recordAttempt({ lesson: 1, item: 'q', correct: true, score: 3 }), /score/);
    assert.equal(store.events().length, 0);
  });
  test('recordExposure: once per session and lesson', () => {
    const { store } = make(); store.load();
    const e1 = store.recordExposure(3), e2 = store.recordExposure(3);
    assert.equal(e1, e2); store.recordExposure(4);
    assert.equal(store.events().filter((e) => e.kind === 'exposure').length, 2);
    assert.throws(() => store.recordExposure('3'), TypeError);
  });
  test('lessonStats counts first tries of the current version', () => {
    const { store } = make(); store.load();
    store.recordAttempt({ lesson: 1, item: 'a', itemVersion: 'v1', correct: false });
    store.recordAttempt({ lesson: 1, item: 'a', itemVersion: 'v1', correct: true });
    store.recordAttempt({ lesson: 1, item: 'b', itemVersion: 'v1', correct: true });
    store.recordAttempt({ lesson: 2, item: 'z', itemVersion: 'v1', correct: true });
    assert.deepEqual(store.lessonStats(1), { items: 2, attempted: 2, firstTryCorrect: 1, pct: 50, legacy: 0 });
    assert.deepEqual(store.lessonStats(1, ['a', 'b', 'c']), { items: 3, attempted: 2, firstTryCorrect: 1, pct: 50, legacy: 0 });
    assert.deepEqual(store.lessonStats(1, [{ id: 'a', itemVersion: 'v2' }, { id: 'b', itemVersion: 'v1' }]),
      { items: 2, attempted: 1, firstTryCorrect: 1, pct: 100, legacy: 0 });
    assert.deepEqual(store.lessonStats(9), { items: 0, attempted: 0, firstTryCorrect: 0, pct: null, legacy: 0 });
    assert.equal(store.firstAttempt('a', 'v1').outcome, 'incorrect');
    assert.equal(store.firstAttempt('nope'), null);
  });
});

// ---------- levels ----------
describe('deriveLevel (L0–L6)', () => {
  const L = (events, opts) => S.deriveLevel(events, 'l1.o1', opts);
  test('L0 and L1', () => {
    assert.deepEqual(L([]), { level: 0, name: 'Not started', basis: { attempts: 0, items: 0, firstTryCorrect: 0, recallCorrect: 0, reviews: 0, legacy: 0 } });
    assert.equal(L([ev({ kind: 'exposure', lesson: 1 })]).name, 'Seen', 'exposure maps to objectives by the l<n>. prefix');
    assert.equal(L([ev({ kind: 'exposure', lesson: 2 })]).level, 0);
    assert.equal(S.deriveLevel([ev({ kind: 'exposure', lesson: 7 })], 'intro', { lesson: 7 }).level, 1, 'explicit lesson option');
    assert.equal(L([att('a', true)]).level, 1, 'one item is not enough for L2');
  });
  test('L2 boundary at 2 items and 60% first-try accuracy', () => {
    assert.equal(L([att('a', true), att('b', false)]).level, 1, '50%');
    assert.equal(L([att('a', true), att('b', true)]).level, 2);
    assert.equal(L([att('a', true), att('b', true), att('c', true), att('d', false), att('e', false)]).level, 2, 'exactly 60%');
    assert.equal(L([att('a', true), att('b', true), att('c', true), att('d', false), att('e', false), att('f', false)]).level, 1, '50%');
  });
  test('retries after feedback never raise a level', () => {
    const evs = [att('a', false), att('a', true, { attemptInSession: 2, firstEver: false, t: T0 + 1 }), att('b', true)];
    assert.equal(L(evs).level, 1);
    assert.equal(L(evs).basis.firstTryCorrect, 1);
  });
  test('L3 needs ≥3 items, ≥80% and a correct recall-type item', () => {
    const three = [att('a', true), att('b', true), att('c', true)];
    assert.equal(L(three).level, 2, 'recognition only');
    assert.equal(L([...three.slice(0, 2), att('c', true, { itemType: 'recall' })]).level, 3);
    assert.equal(L([...three.slice(0, 2), att('c', true, { itemType: null })], { itemTypes: { c: 'fade' } }).level, 3, 'itemTypes fills in a missing type');
    assert.equal(L(three, { itemTypes: { c: 'fade' } }).level, 2, 'a recorded itemType wins over itemTypes');
    assert.equal(L([att('a', true), att('b', true), att('c', true, { itemType: 'order' }), att('d', true), att('e', false)]).level, 3, 'exactly 80%');
    assert.equal(L([att('a', true), att('b', true), att('c', true, { itemType: 'order' }), att('d', false), att('e', false)]).level, 2, '60%');
    assert.equal(L([...three.slice(0, 2), att('c', true, { itemType: 'recall', assisted: true })]).level, 2, 'assisted recall does not count');
  });
  test('L4 and L6 come only from caller flags; L5 from a spaced review', () => {
    assert.equal(L([], { milestoneMastered: true }).name, 'Applied');
    assert.equal(L([], { transferDemonstrated: true }).name, 'Transferred');
    const l3 = [att('a', true), att('b', true), att('c', true, { itemType: 'recall', t: T0 + 10 })];
    assert.equal(L([...l3, review(true, T0 + 10 + 7 * DAY)]).name, 'Retained');
    assert.equal(L([...l3, review(true, T0 + 10 + 7 * DAY - 1)]).level, 3, '1 ms short of 7 days');
    assert.equal(L([...l3, review(true, T0 + 3 * DAY), review(true, T0 + 9 * DAY)]).level, 3, 'gap counts from the previous success');
    assert.equal(L([...l3, review(true, T0 + 3 * DAY), review(true, T0 + 10 * DAY + 10)]).level, 5);
    assert.equal(L([...l3, review(true, T0 + 8 * DAY), review(false, T0 + 20 * DAY)]).level, 3, 'latest review failed');
    assert.equal(L([att('a', true), att('b', true), review(true, T0 + 8 * DAY)]).level, 2, 'L5 needs L3 or L4');
    assert.equal(L([att('a', true), att('b', false), review(true, T0 + 8 * DAY)], { milestoneMastered: true }).level, 5);
    assert.equal(L([...l3, review(true, T0 + 8 * DAY)], { transferDemonstrated: true }).level, 6);
  });
  test('level names', () => assert.deepEqual(S.LEVEL_NAMES, ['Not started', 'Seen', 'Familiar', 'Understood', 'Applied', 'Retained', 'Transferred']));
});

// ---------- schedule ----------
describe('deriveSchedule (Leitner)', () => {
  const sched = (events, o = {}) => S.deriveSchedule(events, 'l1.o1', Object.assign({ now: T0 + 100 * DAY }, o));
  const entered = [att('a', true, { t: T0 }), att('b', false, { t: T0 + 1000 })];
  test('entry when every item has a first attempt', () => {
    assert.equal(sched([att('a', true)], { itemIds: ['a', 'b'] }).box, 0);
    assert.equal(sched([att('a', true)], { itemIds: ['a', 'b'] }).status, 'new');
    const s = sched(entered, { itemIds: ['a', 'b'], now: T0 + 2000 });
    assert.deepEqual([s.box, s.due, s.status], [1, T0 + 1000 + DAY, 'scheduled']);
    assert.match(s.explanation, /^Nov 24: every practice item tried → box 1, first review Nov 25$/);
    assert.equal(sched([att('a', true)]).box, 1, 'no itemIds: first attempt enters');
    assert.equal(sched(entered, { itemIds: [{ id: 'a' }, { id: 'b' }] }).box, 1, 'item objects accepted');
  });
  test('lesson attempts never move boxes', () => {
    const s = sched([...entered, att('a', true, { t: T0 + 5 * DAY }), att('c', true, { t: T0 + 6 * DAY })], { itemIds: ['a', 'b'] });
    assert.deepEqual([s.box, s.due], [1, T0 + 1000 + DAY]);
  });
  test('early pass: logged, no change', () => {
    const s = sched([...entered, review(true, T0 + 1000 + DAY - 1)], { itemIds: ['a', 'b'] });
    assert.deepEqual([s.box, s.due], [1, T0 + 1000 + DAY]);
    assert.match(s.explanation, /before the due date → stays in box 1/);
    assert.equal(s.log.length, 2);
  });
  test('on-time pass: next box; overdue pass: same rule, no bonus', () => {
    const due = T0 + 1000 + DAY;
    let s = sched([...entered, review(true, due)], { itemIds: ['a', 'b'] });
    assert.deepEqual([s.box, s.due], [2, due + 3 * DAY]);
    assert.equal(s.explanation, 'Nov 25: 2/2 correct → box 2, due Nov 28');
    s = sched([...entered, review(true, due + 10 * DAY)], { itemIds: ['a', 'b'] });
    assert.deepEqual([s.box, s.due], [2, due + 10 * DAY + 3 * DAY]);
  });
  test('fail → box 1, due +1 day, lapsed until the next pass', () => {
    const due = T0 + 1000 + DAY;
    const failed = [...entered, review(true, due), review(false, due + 3 * DAY)];
    let s = sched(failed, { now: due + 3 * DAY + 10 });
    assert.deepEqual([s.box, s.due, s.status], [1, due + 4 * DAY, 'lapsed']);
    assert.equal(s.explanation, 'Nov 28: 1/2 correct → back to box 1, due Nov 29');
    s = sched(failed, { now: due + 30 * DAY });
    assert.equal(s.status, 'lapsed', 'lapsed wins over due');
    s = sched([...failed, review(true, due + 4 * DAY)], { now: due + 4 * DAY + 1 });
    assert.deepEqual([s.box, s.status], [2, 'scheduled']);
  });
  test('cap at box 5 with 1/3/7/14/30-day intervals', () => {
    const evs = [att('a', true, { t: T0 })];
    let t = T0 + DAY; const boxes = [];
    for (const gap of [3, 7, 14, 30, 30]) { evs.push(review(true, t)); boxes.push(sched(evs).box); t += gap * DAY; }
    assert.deepEqual(boxes, [2, 3, 4, 5, 5]);
    assert.equal(sched(evs).due, t - 30 * DAY + 30 * DAY);
  });
  test('status due; deterministic replay regardless of array order; i18n hook', () => {
    const evs = [...entered, review(true, T0 + 2 * DAY), review(false, T0 + 6 * DAY), review(true, T0 + 8 * DAY)];
    const a = sched(evs), b = sched(evs.slice().reverse());
    assert.deepEqual(a, b);
    assert.equal(sched(entered, { now: T0 + 1000 + DAY }).status, 'due');
    const t = (key, v) => (key === 'schedule.pass' ? `${v.date}: ${v.correct}/${v.total} certas → caixa ${v.box}` : key);
    assert.equal(sched([...entered, review(true, T0 + 2 * DAY)], { t }).explanation, 'Nov 26: 2/2 certas → caixa 2');
    assert.match(sched(entered, { t }).explanation, /box 1/, 'falls back to English when t has no string');
  });
  test('migrated legacy schedule applies to the lesson\'s objectives', () => {
    const evs = S.migrateV0({ lessons: { 1: { stage: 3, last: T0 } } }, { courseId: 'c1', now: () => T0 });
    const s = sched(evs);
    assert.deepEqual([s.box, s.due], [2, T0 + 3 * DAY]);
    assert.match(s.explanation, /capped at box 2/);
  });
});

// ---------- store-level schedule, review, due, xp ----------
describe('review sessions, due() and xp()', () => {
  test('recordReviewSession: 80% rule and box movement', () => {
    const { store, now } = make(); store.load();
    store.recordAttempt({ lesson: 1, objective: 'l1.o1', item: 'a', itemVersion: 'v', correct: true });
    now.add(DAY);
    let r = store.recordReviewSession({ objective: 'l1.o1', results: [{ item: 'a', outcome: 'correct' }, { item: 'b', outcome: 'incorrect' }] });
    assert.deepEqual([r.passed, r.box, r.status], [false, 1, 'lapsed'], '1/2 fails');
    now.add(DAY);
    r = store.recordReviewSession({ objective: 'l1.o1', results: ['correct', 'correct', 'correct', 'correct', 'incorrect'].map((o, i) => ({ item: 'i' + i, outcome: o })) });
    assert.deepEqual([r.passed, r.box, r.due], [true, 2, now() + 3 * DAY], '4/5 passes');
    assert.throws(() => store.recordReviewSession({ objective: 'l1.o1', results: [] }), TypeError);
    const evt = store.events().at(-1);
    assert.deepEqual([evt.kind, evt.context, evt.lesson, evt.score], ['review_session', 'review', 1, 0.8]);
  });
  test('due(): only due cards, most overdue relative to interval first', () => {
    const { store, now } = make(); store.load();
    store.recordAttempt({ lesson: 1, objective: 'l1.o1', item: 'a', itemVersion: 'v', correct: true });   // due T0+1d (box 1)
    store.recordAttempt({ lesson: 2, objective: 'l2.o1', item: 'b', itemVersion: 'v', correct: true });
    now.add(DAY); store.recordReviewSession({ objective: 'l2.o1', results: [{ item: 'b', outcome: 'correct' }] }); // box 2, due T0+4d
    now.add(DAY); store.recordAttempt({ lesson: 3, objective: 'l3.o1', item: 'c', itemVersion: 'v', correct: true }); // due T0+3d
    assert.deepEqual(store.due(T0 + DAY / 2), []);
    const list = store.due(T0 + 10 * DAY);
    assert.deepEqual(list.map((x) => x.objective), ['l1.o1', 'l3.o1', 'l2.o1']);
    assert.equal(list[0].overdueRatio, 9);
    assert.equal(list[2].overdueRatio, 2);
    assert.deepEqual(store.due(T0 + 10 * DAY, { itemIds: { 'l1.o1': ['a', 'zz'] } }).map((x) => x.objective), ['l3.o1', 'l2.o1'], 'itemIds delay entry');
  });
  test('xp = 10 × first-ever correct, never from retries or assisted answers; max with legacy', () => {
    const { store } = make(); store.load();
    store.recordAttempt({ lesson: 1, item: 'a', itemVersion: 'v', correct: false });
    store.recordAttempt({ lesson: 1, item: 'a', itemVersion: 'v', correct: true });
    store.recordAttempt({ lesson: 1, item: 'b', itemVersion: 'v', correct: true });
    store.recordAttempt({ lesson: 1, item: 'c', itemVersion: 'v', correct: true, assisted: true });
    assert.equal(store.xp(), 10);
    const storage = memStorage(); storage.map.set('learn:c2', JSON.stringify({ xp: 30, answers: {}, lessons: {} }));
    const m = make('c2', { storage }).store; m.load();
    m.recordAttempt({ lesson: 1, item: 'a', itemVersion: 'v', correct: true });
    assert.equal(m.xp(), 30, 'legacy wins');
    for (const id of ['b', 'c', 'd']) m.recordAttempt({ lesson: 1, item: id, itemVersion: 'v', correct: true });
    assert.equal(m.xp(), 40, 'computed wins');
  });
  test('subscribe() notifies after each write', () => {
    const { store } = make(); store.load(); let calls = 0;
    const off = store.subscribe(() => calls++);
    store.recordExposure(1); off(); store.recordExposure(2);
    assert.equal(calls, 1);
  });
});

// ---------- export / import ----------
describe('export and import', () => {
  function seeded() {
    const { store, now } = make('course-a'); store.load();
    store.recordExposure(1);
    store.recordAttempt({ lesson: 1, objective: 'l1.o1', item: 'a', itemVersion: 'v', correct: false });
    now.add(DAY); store.recordReviewSession({ objective: 'l1.o1', results: [{ item: 'a', outcome: 'correct' }] });
    return store;
  }
  test('round trip, then dedupe', () => {
    const a = seeded(), text = a.exportJSON(), doc = JSON.parse(text);
    assert.deepEqual([doc.format, doc.schemaVersion, doc.course], ['learncraft-progress', 2, 'course-a']);
    assert.ok(doc.exportedAt);
    const b = make('course-a').store; b.load();
    assert.deepEqual(b.importJSON(text), { added: 3, skipped: 0, errors: [] });
    assert.deepEqual(b.events(), a.events());
    assert.deepEqual(b.importJSON(text), { added: 0, skipped: 3, errors: [] });
    assert.equal(b.schedule('l1.o1').box, a.schedule('l1.o1').box);
    assert.match(a.exportFilename(), /^progress-course-a-2026-11-2\d\.json$/);
  });
  test('refuses another course unless forced', () => {
    const text = seeded().exportJSON();
    const b = make('course-b').store; b.load();
    const r = b.importJSON(text);
    assert.equal(r.added, 0); assert.match(r.errors[0], /course "course-a", not "course-b"/);
    assert.equal(b.importJSON(text, { force: true }).added, 3);
  });
  test('source defaults to import; invalid events reported, valid ones kept', () => {
    const doc = JSON.parse(seeded().exportJSON());
    delete doc.events[0].source;
    doc.events.push({ ...doc.events[1], id: 'bad1', kind: 'agent_estimate' }, { ...doc.events[1], id: 'ok2' });
    doc.events[1] = { ...doc.events[1], source: 'migration' };
    const b = make('course-a').store; b.load();
    const r = b.importJSON(JSON.stringify(doc));
    assert.equal(r.added, 4); assert.equal(r.errors.length, 1); assert.match(r.errors[0], /^events\[3\]: unknown kind/);
    assert.equal(b.events().find((e) => e.id === doc.events[0].id).source, 'import');
    assert.equal(b.events().find((e) => e.id === doc.events[1].id).source, 'migration');
  });
  test('rejects non-progress files', () => {
    const b = make('course-a').store; b.load();
    assert.match(b.importJSON('nope').errors[0], /not JSON/);
    assert.match(b.importJSON('{"format":"x"}').errors[0], /not a Learncraft progress file/);
    assert.match(b.importJSON('{"format":"learncraft-progress","schemaVersion":1}').errors[0], /schemaVersion 1/);
    assert.equal(b.importJSON('{"format":"learncraft-progress","schemaVersion":2,"course":"course-a","__proto__":{"x":1},"events":[]}').added, 0);
    assert.equal(({}).x, undefined);
  });
  test('merging an earlier attempt from another browser re-derives the first try by time', () => {
    const a = make('course-a').store; a.load();
    a.recordAttempt({ lesson: 1, item: 'q', itemVersion: 'v', correct: false });          // T0, browser A
    const later = clock(T0 + DAY); const b = make('course-a', { now: later }).store; b.load();
    b.recordAttempt({ lesson: 1, item: 'q', itemVersion: 'v', correct: true });           // T0+1d, browser B
    assert.equal(b.xp(), 10);
    b.importJSON(a.exportJSON());
    assert.equal(b.firstAttempt('q', 'v').outcome, 'incorrect');
    assert.equal(b.xp(), 0);
  });
});

// ---------- storage failures ----------
describe('storage failures', () => {
  test('blocked storage: persistent false, everything still works in memory', () => {
    for (const storage of [memStorage({ throwOnGet: true }), null]) {
      const { store } = make('c1', { storage }); const r = store.load();
      assert.deepEqual([r.ok, r.persistent], [true, false]);
      store.recordAttempt({ lesson: 1, item: 'a', itemVersion: 'v', correct: true });
      assert.equal(store.xp(), 10); assert.equal(store.persistent, false);
      assert.equal(JSON.parse(store.exportJSON()).events.length, 1);
    }
  });
  test('setItem throwing (not quota) switches to memory', () => {
    const { store } = make('c1', { storage: memStorage({ throwOnSet: true }) });
    assert.equal(store.load().persistent, true);
    store.recordAttempt({ lesson: 1, item: 'a', itemVersion: 'v', correct: true });
    assert.equal(store.persistent, false);
    assert.equal(store.events().length, 1);
  });
  test('quota: compacts exposures older than 90 days per lesson, never attempts, then retries', () => {
    const now = clock(T0), events = [];
    for (let i = 0; i < 120; i++) events.push(ev({ kind: 'exposure', lesson: 1 + (i % 2), session: 's' + i, t: T0 - 200 * DAY + i * 1000 }));
    events.push(ev({ kind: 'exposure', lesson: 1, session: 'recent', t: T0 - DAY }));
    for (let i = 0; i < 3; i++) events.push(att('old' + i, true, { t: T0 - 150 * DAY }));
    const doc = JSON.stringify({ format: 'learncraft-progress', schemaVersion: 2, course: 'c1', createdAt: new Date(T0).toISOString(), updatedAt: new Date(T0).toISOString(), events });
    const storage = memStorage({ quota: doc.length + 100 }); storage.map.set('learn:c1:v2', doc);
    const { store } = make('c1', { storage, now }); store.load();
    store.recordAttempt({ lesson: 1, item: 'new', itemVersion: 'v', correct: true });
    assert.equal(store.persistent, true);
    const saved = JSON.parse(storage.map.get('learn:c1:v2')).events;
    const counts = saved.filter((e) => e.count).map((e) => [e.lesson, e.count]).sort();
    assert.deepEqual(counts, [[1, 60], [2, 60]]);
    assert.equal(saved.filter((e) => e.kind === 'attempt').length, 4, 'attempts never compacted');
    assert.ok(saved.some((e) => e.session === 'recent'), 'recent exposure kept');
    assert.equal(S.deriveLevel(saved, 'l2.o1').level, 1, 'compacted exposure still counts as Seen');
  });
  test('quota still exceeded after compaction → persistent false', () => {
    const storage = memStorage({ quota: 50 });
    const { store } = make('c1', { storage }); store.load();
    store.recordAttempt({ lesson: 1, item: 'a', itemVersion: 'v', correct: true });
    assert.equal(store.persistent, false); assert.equal(store.xp(), 10);
  });
  test('two tabs: writes merge instead of clobbering', () => {
    const storage = memStorage();
    const a = make('c1', { storage }).store, b = make('c1', { storage, random: () => 0.5 }).store;
    a.load(); b.load();
    a.recordAttempt({ lesson: 1, item: 'a', itemVersion: 'v', correct: true });
    b.recordAttempt({ lesson: 1, item: 'b', itemVersion: 'v', correct: true });
    assert.deepEqual(JSON.parse(storage.map.get('learn:c1:v2')).events.map((e) => e.item).sort(), ['a', 'b']);
  });
});
