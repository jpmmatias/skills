// Tests for schemas/*.schema.json and scripts/lib/schema.mjs (workstream D). Run: node --test tests/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  validate, checkSchema, loadSchema, loadCourseJs, loadPracticeJs, requireClassic, resolveRef,
  courseLint, practiceLint, sourceLint, handoffLint, SCHEMA_DIR,
} from '../scripts/lib/schema.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIX = join(ROOT, 'tests/fixtures/data');
const EXPECT = JSON.parse(readFileSync(join(FIX, 'expectations.json'), 'utf8'));
const NAMES = ['course', 'evidence-event', 'progress-export', 'practice-items', 'source-record', 'learning-record-frontmatter', 'review-handoff'];
const LINTS = { course: courseLint, 'practice-items': (d) => practiceLint(d), 'source-record': sourceLint, 'review-handoff': handoffLint };
const fmt = (errs) => errs.map((e) => `${e.path || '(root)'}: ${e.message}`).join('\n');

// ---------- the schemas themselves ----------
describe('schemas', () => {
  test('the schemas directory holds exactly the documented schemas', () => {
    assert.deepEqual(readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.schema.json')).sort(), NAMES.map((n) => n + '.schema.json').sort());
  });
  for (const name of NAMES) {
    test(`${name}: uses only the supported subset, is documented and its examples validate`, () => {
      const s = loadSchema(name);
      assert.equal(s.$schema, 'https://json-schema.org/draft/2020-12/schema');
      assert.match(s.$id, new RegExp(`/schemas/${name}\\.schema\\.json$`));
      assert.ok(s.title && s.description, 'title and description');
      assert.ok(Array.isArray(s.examples) && s.examples.length > 0, 'examples');
      assert.deepEqual(checkSchema(s), []);
      s.examples.forEach((ex, i) => assert.deepEqual(validate(s, ex), [], `example ${i}:\n${fmt(validate(s, ex))}`));
    });
  }
  test('progress-export embeds the evidence-event definitions unchanged', () => {
    const ev = loadSchema('evidence-event'), ex = loadSchema('progress-export');
    assert.deepEqual(ex.$defs.event.oneOf, ev.oneOf);
    for (const k of Object.keys(ev.$defs)) assert.deepEqual(ex.$defs[k], ev.$defs[k], k);
  });
});

// ---------- fixtures ----------
function loadFixture(dir, file) {
  const p = join(FIX, dir, file);
  if (file.endsWith('.practice.js')) return { calls: loadPracticeJs(p) };
  if (file.endsWith('.js')) return { data: loadCourseJs(p) };
  return { data: JSON.parse(readFileSync(p, 'utf8')) };
}
describe('fixtures', () => {
  for (const dir of NAMES) {
    if (!existsSync(join(FIX, dir))) continue;
    const schema = loadSchema(dir), lint = LINTS[dir] || (() => []);
    for (const file of readdirSync(join(FIX, dir)).sort()) {
      test(`${dir}/${file}`, () => {
        const f = loadFixture(dir, file), want = EXPECT[`${dir}/${file}`];
        if (f.calls) { // practice file: every call validates as {lesson, items}
          assert.ok(f.calls.length >= 1, 'Learncraft.practice() was called');
          for (const c of f.calls) {
            assert.deepEqual(validate(schema, c, { ref: '#/$defs/call' }), []);
            assert.deepEqual(practiceLint(c.items, { lesson: c.lesson }), []);
          }
          return;
        }
        const errs = validate(schema, f.data), warns = lint(f.data);
        if (file.startsWith('good-')) {
          assert.deepEqual(errs, [], fmt(errs));
          assert.deepEqual(warns, [], fmt(warns));
        } else if (file.startsWith('bad-')) {
          assert.ok(errs.length > 0, 'must be rejected');
          assert.ok(want, `expectations.json needs an entry for ${dir}/${file}`);
          assert.ok(errs.some((e) => e.path.includes(want) || e.message.includes(want)), `expected "${want}" in:\n${fmt(errs)}`);
        } else if (file.startsWith('lint-')) {
          assert.deepEqual(errs, [], `schema-valid:\n${fmt(errs)}`);
          assert.ok(warns.some((e) => e.path.includes(want) || e.message.includes(want)), `expected lint "${want}" in:\n${fmt(warns)}`);
        } else assert.fail(`fixture names start with good-, bad- or lint-: ${file}`);
      });
    }
  }
  test('every expectation names an existing fixture', () => {
    for (const k of Object.keys(EXPECT)) assert.ok(existsSync(join(FIX, k)), k);
  });
});

// ---------- course.js ----------
describe('course.js loading', () => {
  test('the starter course.js template evaluates to an object', () => {
    const c = loadCourseJs(join(ROOT, 'skills/learn/starter/assets/course.js'));
    assert.equal(typeof c, 'object'); assert.ok(c && typeof c.id === 'string');
    // The template is being rewritten to v2 in parallel (workstream C1); only parsing is asserted here.
  });
  test('the template id is a lint warning, not a schema error', () => {
    const c = loadCourseJs(join(FIX, 'course/lint-template-id.js'));
    assert.deepEqual(validate(loadSchema('course'), c), []);
    assert.match(courseLint(c)[0].message, /template value "topic-slug"/);
  });
  test('v1 and v2 are told apart by schemaVersion', () => {
    const s = loadSchema('course');
    const v1 = loadCourseJs(join(FIX, 'course/good-v1.js'));
    assert.deepEqual(validate(s, v1), []);
    delete v1.lessons[0].canDo; v1.lessons[0].notes = 'v1 tolerates extra fields';
    assert.deepEqual(validate(s, v1), [], 'still v1');
    const errs = validate(s, { ...v1, schemaVersion: 2 });
    assert.ok(errs.length > 0 && /course v2/.test(errs[0].message), fmt(errs));
  });
  test('courseLint: duplicates, dangling references, objective prefix, mastered without evidence', () => {
    const c = loadCourseJs(join(FIX, 'course/good-v2.js'));
    c.lessons[1].n = 1; c.lessons[1].milestones.push('m9'); c.lessons[1].requires = [7];
    c.lessons[1].objectives[0].id = 'l1.o1';
    const w = courseLint(c).map((x) => x.message).join('\n');
    for (const m of ['duplicate lesson number 1', 'unknown milestone "m9"', 'unknown lesson 7', 'duplicate objective id "l1.o1"']) assert.match(w, new RegExp(m.replace(/[()]/g, '\\$&')));
    const v1 = { id: 'x', milestones: [{ id: 'm1', status: 'mastered', evidence: null }], lessons: [{ n: 2, objectives: [{ id: 'l3.o1' }] }] };
    assert.match(courseLint(v1).map((x) => x.message).join('\n'), /needs an evidence learning record[\s\S]*should start with "l2\."/);
  });
  test('loaders: var COURSE, missing COURSE, infinite loop timeout, no Node globals', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lc-schema-'));
    try {
      writeFileSync(join(dir, 'a.js'), 'var COURSE = { id: "a" };');
      assert.deepEqual(loadCourseJs(join(dir, 'a.js')), { id: 'a' });
      writeFileSync(join(dir, 'b.js'), '// nothing');
      assert.equal(loadCourseJs(join(dir, 'b.js')), undefined);
      writeFileSync(join(dir, 'c.js'), 'while (true) {}');
      assert.throws(() => loadCourseJs(join(dir, 'c.js')), /timed out/);
      writeFileSync(join(dir, 'd.js'), 'window.COURSE = { id: typeof process + "/" + typeof require + "/" + typeof window.Learncraft };');
      assert.deepEqual(loadCourseJs(join(dir, 'd.js')), { id: 'undefined/undefined/object' });
      writeFileSync(join(dir, 'e.js'), 'window.COURSE = { id: eval("1+1") };');
      assert.throws(() => loadCourseJs(join(dir, 'e.js')), /Code generation from strings disallowed/);
      writeFileSync(join(dir, 'f.practice.js'), 'Learncraft.practice(1, [{id:"a"}]); Learncraft.practice(2, []);');
      assert.deepEqual(loadPracticeJs(join(dir, 'f.practice.js')), [{ lesson: 1, items: [{ id: 'a' }] }, { lesson: 2, items: [] }]);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

// ---------- store output validates against the schemas ----------
describe('store output conforms to the schemas', () => {
  test('a live export, migrated events and compacted events validate', () => {
    const S = requireClassic(join(ROOT, 'skills/learn/starter/assets/store.js'));
    const mem = new Map(), storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
    mem.set('learn:fixture-attention', readFileSync(join(FIX, 'v0/rich.json'), 'utf8'));
    let t = Date.parse('2026-11-24T08:00:00Z');
    const s = S.createStore({ courseId: 'fixture-attention', storage, now: () => t });
    s.load(); s.recordExposure(1);
    s.recordAttempt({ lesson: 1, objective: 'l1.o1', item: 'l1-dot', itemType: 'recall', itemVersion: S.itemVersion('x'), correct: true, score: 1, note: 'n' });
    t += 864e5; s.recordReviewSession({ objective: 'l1.o1', results: [{ item: 'l1-dot', outcome: 'correct' }] });
    const doc = JSON.parse(s.exportJSON());
    assert.deepEqual(validate(loadSchema('progress-export'), doc), [], fmt(validate(loadSchema('progress-export'), doc)));
    const evSchema = loadSchema('evidence-event');
    for (const e of doc.events) assert.deepEqual(validate(evSchema, e), [], e.id);
    assert.deepEqual(validate(loadSchema('progress-export'), JSON.parse(mem.get('learn:fixture-attention:v2'))), [], 'stored document');
    const fixture = JSON.parse(readFileSync(join(FIX, 'progress-export/good-export.json'), 'utf8'));
    assert.equal(fixture.events.length, S.createStore({ courseId: 'fixture-attention', storage: null }).importJSON(JSON.stringify(fixture)).added);
  });
});

// ---------- validator keywords ----------
describe('validator keywords', () => {
  const v = (schema, data) => validate(schema, data);
  const ok = (schema, data) => assert.deepEqual(v(schema, data), [], JSON.stringify(data));
  const bad = (schema, data, re) => { const e = v(schema, data); assert.ok(e.length > 0, JSON.stringify(data)); if (re) assert.match(fmt(e), re); };
  test('type, including arrays of types and integer vs number', () => {
    ok({ type: 'integer' }, 3); bad({ type: 'integer' }, 3.5, /must be integer, got number/);
    ok({ type: 'number' }, 3); ok({ type: 'number' }, 3.5); bad({ type: 'number' }, '3');
    ok({ type: ['string', 'null'] }, null); bad({ type: ['string', 'null'] }, 1, /string or null/);
    bad({ type: 'object' }, []); bad({ type: 'array' }, {}); ok({ type: 'boolean' }, false); bad({ type: 'null' }, 0);
  });
  test('required, properties, additionalProperties false and schema', () => {
    const s = { type: 'object', required: ['a'], properties: { a: { type: 'string' } }, additionalProperties: false };
    ok(s, { a: 'x' }); bad(s, {}, /missing required property "a"/); bad(s, { a: 'x', b: 1 }, /\/b: unknown property "b"/);
    bad(s, { a: 1 }, /\/a: must be string/);
    const t = { type: 'object', additionalProperties: { type: 'integer' } };
    ok(t, { x: 1, y: 2 }); bad(t, { x: 'no' }, /\/x: must be integer/);
  });
  test('enum, const (deep), pattern (unicode), lengths in code points', () => {
    ok({ enum: ['a', 1, null] }, null); bad({ enum: ['a', 1] }, 'b', /one of "a", 1/);
    ok({ const: { a: [1, 2] } }, { a: [1, 2] }); bad({ const: { a: [1, 2] } }, { a: [2, 1] });
    ok({ pattern: '^S\\d+$' }, 'S12'); bad({ pattern: '^S\\d+$' }, 'S1x', /must match/);
    ok({ pattern: '^\\p{L}+$' }, 'ação');
    ok({ minLength: 1, maxLength: 1 }, '😀'); bad({ minLength: 1 }, ''); bad({ maxLength: 2 }, 'abc');
    ok({ pattern: '^x$' }, 5, 'string keywords ignore non-strings');
  });
  test('items, minItems, maxItems, minimum, maximum', () => {
    const s = { type: 'array', items: { type: 'integer', minimum: 1, maximum: 5 }, minItems: 1, maxItems: 2 };
    ok(s, [1, 5]); bad(s, [], /at least 1/); bad(s, [1, 2, 3], /at most 2/);
    bad(s, [0], /\/0: must be >= 1/); bad(s, [1, 6], /\/1: must be <= 5/);
  });
  test('oneOf (exactly one) and anyOf (at least one), with readable errors', () => {
    const s = { oneOf: [{ type: 'integer' }, { type: 'number', minimum: 10 }] };
    ok(s, 3); ok(s, 10.5); bad(s, 12, /matches 2 alternatives/); bad(s, 'x', /does not match any oneOf/);
    const a = { anyOf: [{ type: 'integer' }, { type: 'number', minimum: 10 }] };
    ok(a, 12); bad(a, 'x', /anyOf/);
    const disc = { oneOf: [
      { title: 'cat', type: 'object', properties: { kind: { const: 'cat' }, lives: { type: 'integer' } }, required: ['kind', 'lives'] },
      { title: 'dog', type: 'object', properties: { kind: { const: 'dog' }, good: { type: 'boolean' } }, required: ['kind', 'good'] }] };
    const e = v(disc, { kind: 'dog', good: 'yes' });
    assert.match(e[0].message, /closest: dog/); assert.equal(e[1].path, '/good');
  });
  test('$ref: local definitions, root and pointer escapes', () => {
    const s = { $defs: { pos: { type: 'integer', minimum: 1 }, 'a/b': { const: 1 } }, type: 'object', properties: { n: { $ref: '#/$defs/pos' }, kids: { type: 'array', items: { $ref: '#' } }, w: { $ref: '#/$defs/a~1b' } } };
    ok(s, { n: 2, kids: [{ n: 1 }], w: 1 }); bad(s, { kids: [{ n: 0 }] }, /\/kids\/0\/n: must be >= 1/);
    bad({ $ref: '#/$defs/missing' }, 1, /unresolvable/);
    assert.equal(resolveRef(s, '#/$defs/pos').minimum, 1);
    assert.deepEqual(validate(s, 5, { ref: '#/$defs/pos' }), []);
    assert.equal(v({ type: 'object', properties: { 'a/b': { type: 'string' } } }, { 'a/b': 1 })[0].path, '/a~1b');
  });
  test('checkSchema rejects keywords outside the subset and external refs', () => {
    const errs = checkSchema({ type: 'object', not: {}, if: {}, properties: { a: { format: 'email', contains: {} }, b: { $ref: 'other.json#/x' } }, minProperties: 1 });
    const kw = errs.map((e) => e.path).join(' ');
    for (const k of ['/not', '/if', '/properties/a/format', '/properties/a/contains', '/minProperties', '/properties/b/$ref']) assert.ok(kw.includes(k), k);
    assert.ok(checkSchema({ type: 'strng' }).length === 1);
    assert.ok(checkSchema({ pattern: '(' }).length === 1);
    assert.deepEqual(checkSchema({ title: 't', description: 'd', examples: [1], $comment: 'c', type: 'integer' }), []);
  });
  test('practiceLint and sourceLint and handoffLint', () => {
    assert.match(practiceLint([{ id: 'a', type: 'choice', options: [{ text: 'x' }, { text: 'y' }] }])[0].message, /found 0/);
    assert.match(practiceLint([{ id: 'a' }, { id: 'a' }])[0].message, /duplicate item id/);
    assert.match(practiceLint([{ id: 'a', objective: 'l4.o1' }], { lesson: 3 })[0].message, /does not belong to lesson 3/);
    assert.match(practiceLint([{ id: 'f', type: 'fade', template: 'x = {{a}} + {{b}}', blanks: { a: ['1'] } }])[0].message, /\{\{b\}\} has no accepted answers/);
    assert.deepEqual(sourceLint({ type: 'paper' }), []);
    assert.equal(handoffLint({ verdict: 'APPROVE', items: [] }).length, 0);
  });
});
