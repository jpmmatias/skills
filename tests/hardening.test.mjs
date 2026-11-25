// Regression tests for the security and reliability review (docs/audit/reviews/security-reliability.md):
// SR-02 (Node loaders), SR-03 and SR-04 (workspace lint), SR-05/06/09/13 (store), SR-11 (tool resolution).
// Every test here failed against the code the review was written on; see docs/audit/handoffs/security-fixes.md.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { requireClassic } from '../scripts/lib/schema.mjs';
import { lintWorkspace } from '../scripts/lib/lint-workspace.mjs';
import { buildWorkspace } from './lib/workspace.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = requireClassic(join(ROOT, 'skills/learn/starter/assets/store.js'));
const tmp = () => mkdtempSync(join(tmpdir(), 'lc-hard-'));

// ---------- SR-02: data loaders ----------
// Each hostile file is loaded in a separate Node process (so a hang in an unfixed loader fails the test instead of
// freezing the runner). The marker file proves whether code reached the host.
// via 'schema' = scripts/lib/schema.mjs loaders; 'lint' = the linter's own loader (its old fallback had a window stub).
function loadInChild(kind, file, via = 'schema') {
  const lib = pathToFileURL(join(ROOT, via === 'lint' ? 'skills/learn/starter/tools/lint-workspace.mjs' : 'scripts/lib/schema.mjs')).href;
  const fn = via === 'lint' ? (kind === 'course' ? 'fallbackLoadCourseJs' : 'fallbackLoadPracticeJs') : (kind === 'course' ? 'loadCourseJs' : 'loadPracticeJs');
  const code = `const m = await import(${JSON.stringify(lib)}); const t0 = Date.now();
    try { const v = m.${fn}(${JSON.stringify(file)}); console.log(JSON.stringify({ ok: true, v, ms: Date.now() - t0 })); }
    catch (e) { console.log(JSON.stringify({ ok: false, error: e.message, ms: Date.now() - t0 })); }`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', timeout: 9000, env: { ...process.env, LC_SECRET_PROBE: 'leak-me' } });
  if (r.error || r.status !== 0) return { hung: true, stdout: r.stdout };
  const lines = r.stdout.trim().split('\n');
  return { ...JSON.parse(lines[lines.length - 1]), stdout: r.stdout };
}

describe('SR-02: hostile course.js / practice files cannot reach Node or hang the tools', () => {
  const dir = tmp();
  const marker = join(dir, 'marker.txt');
  const w = (name, src) => { writeFileSync(join(dir, name), src); return join(dir, name); };
  const escape = (via) => `try { const p = ${via}.constructor('return process')(); p.getBuiltinModule('fs').writeFileSync(${JSON.stringify(marker)}, 'escaped:' + (p.env.LC_SECRET_PROBE || '')); } catch (e) {}`;

  for (const [name, via, kind, loader] of [['console.log', 'console.log', 'course', 'schema'], ['addEventListener', 'addEventListener', 'course', 'lint'],
    ['document.querySelector', 'document.querySelector', 'course', 'lint'], ['Learncraft.practice', 'Learncraft.practice', 'practice', 'schema'],
    ['the linter\'s Learncraft stub', 'Learncraft.anything', 'practice', 'lint']]) {
    test(`no host realm through ${name} (${loader} loader)`, () => {
      rmSync(marker, { force: true });
      const f = w(`esc-${name.replace(/\W+/g, '-')}.js`, `${escape(via)}\n${kind === 'course' ? "window.COURSE = { id: 'x' };" : 'Learncraft.practice(1, []);'}`);
      const r = loadInChild(kind, f, loader);
      assert.ok(!r.hung, 'loader hung');
      assert.equal(existsSync(marker), false, 'hostile code reached the host realm (wrote a file)');
      assert.ok(!/ESCAPED|leak-me/.test(r.stdout));
    });
  }
  for (const [name, src] of [['a promise job', "window.COURSE = { id: 'x' }; Promise.resolve().then(() => { for (;;) {} });"],
    ['toJSON', 'window.COURSE = { toJSON() { for (;;) {} } };'], ['a getter on the global', "Object.defineProperty(window, 'COURSE', { get() { for (;;) {} } });"],
    ['a getter inside items', 'Learncraft.practice(1, [{ get id() { for (;;) {} } }]);']]) {
    test(`a loop in ${name} fails within the hard timeout and the tool survives`, () => {
      const r = loadInChild(/items/.test(name) ? 'practice' : 'course', w(`hang-${name.replace(/\W+/g, '-')}.js`, src));
      assert.ok(!r.hung, 'the tool process hung');
      assert.equal(r.ok, false);
      assert.match(r.error, /timed out/);
      assert.ok(r.ms < 6000, `took ${r.ms} ms`);
    });
  }
  test('the loader process gets no environment and the data still loads', () => {
    const r = loadInChild('course', w('env.js', 'window.COURSE = { id: typeof process + "/" + typeof require + "/" + typeof window.Learncraft, n: [1, { a: "b" }] };'));
    assert.deepEqual(r.v, { id: 'undefined/undefined/object', n: [1, { a: 'b' }] });
  });
});

// ---------- SR-03 / SR-04: workspace lint ----------
describe('SR-03: lint catches script-bearing markup the browser would run, and a missing CSP is an error', () => {
  const HOSTILE = {
    'svg/onload': '<svg/onload="window.__x=1">', '&Tab;': '<a href="java&Tab;script:void(0)">t</a>', '&#9;': '<a href="java&#9;script:void(0)">t</a>',
    '&NewLine;': '<a href="java&NewLine;script:void(0)">n</a>', '&colon;': '<a href="javascript&colon;void(0)">c</a>', '&#1;': '<a href="&#1;javascript:void(0)">c</a>',
    'a/href': '<a/href=javascript:void(0)>u</a>', srcdoc: '<iframe srcdoc="&lt;img src=x onerror=parent.__x=1&gt;"></iframe>', object: '<object data="x.swf"></object>',
    embed: '<embed src="x.swf">', base: '<base href="https://attacker.example/">', refresh: '<meta http-equiv="refresh" content="0;url=https://attacker.example/">',
    'data: href': '<a href="data:text/html,x">d</a>', 'UNC href': '<a href="\\\\attacker.example\\share">u</a>',
  };
  for (const [name, snippet] of Object.entries(HOSTILE)) {
    test(`flags ${name}`, async () => {
      const w = buildWorkspace({ lessonExtra: snippet });
      try {
        const f = (await lintWorkspace(w.ws)).filter((x) => x.file.startsWith('lessons/') && x.level === 'error');
        assert.ok(f.length > 0, `${snippet} passed lint`);
      } finally { w.cleanup(); }
    });
  }
  test('benign links and images are not flagged', async () => {
    const w = buildWorkspace({ lessonExtra: '<a href="https://example.com/a?b=1&amp;c=2">a</a> <a href="mailto:a@b.example">m</a> <a href="../reference/cheat-sheet.html#x">r</a> <img src="data:image/png;base64,iVBORw0KGgo=" alt="">' });
    try { assert.deepEqual((await lintWorkspace(w.ws)).filter((x) => x.file.startsWith('lessons/') && x.level === 'error'), []); } finally { w.cleanup(); }
  });
  test('a v2 page without the CSP meta is an error (lesson, reference, index)', async () => {
    const w = buildWorkspace({ csp: false });
    try {
      const f = (await lintWorkspace(w.ws)).filter((x) => x.rule === 'csp-missing');
      for (const page of ['lessons/0001-first.html', 'reference/cheat-sheet.html', 'index.html']) assert.equal(f.find((x) => x.file === page)?.level, 'error', page);
    } finally { w.cleanup(); }
  });
  test('a CSP that allows inline script is an error', async () => {
    const w = buildWorkspace();
    try {
      const p = join(w.ws, 'lessons/0001-first.html');
      writeFileSync(p, (await import('node:fs')).readFileSync(p, 'utf8').replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"));
      assert.ok((await lintWorkspace(w.ws)).some((x) => x.rule === 'csp-weak' && x.level === 'error'));
    } finally { w.cleanup(); }
  });
});

test('SR-04: lessons[].practice outside lessons/NNNN.practice.js is a lint error even without the schemas (skills.sh install)', () => {
  const w = buildWorkspace();
  try {
    writeFileSync(join(w.ws, 'assets', 'course.js'), (() => {
      const c = { schemaVersion: 2, id: 'smoke-course', topic: 'T', lang: 'en', mission: 'M', milestones: [{ id: 'm1', label: 'L', canDo: 'C', status: 'in-progress', evidence: null }],
        lessons: [{ n: 1, file: 'lessons/0001-first.html', title: 'T', milestones: ['m1'], canDo: 'c', objectives: [{ id: 'l1.o1', text: 'x' }], practice: 'evil.js' }] };
      return `window.COURSE = ${JSON.stringify(c)};`;
    })());
    writeFileSync(join(w.ws, 'evil.js'), "window.__x = 'ran';"); // it exists: only the path rule can catch it
    const r = spawnSync(process.execPath, [join(ROOT, 'skills/learn/starter/tools/lint-workspace.mjs'), w.ws, '--json'], { encoding: 'utf8', env: { ...process.env, LEARNCRAFT_ROOT: join(w.ws, 'no-such-root') } });
    const f = JSON.parse(r.stdout);
    assert.ok(f.some((x) => x.level === 'error' && /practice/.test(x.rule) && /evil/.test(x.message)), JSON.stringify(f));
  } finally { w.cleanup(); }
});

// ---------- store (SR-05, SR-06, SR-09, SR-13) ----------
const T0 = Date.parse('2026-11-24T10:00:00Z');
function mem({ quota = Infinity } = {}) {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), removeItem: (k) => m.delete(k),
    setItem(k, v) { v = String(v); let used = k.length + v.length; for (const [kk, vv] of m) if (kk !== k) used += kk.length + vv.length; if (used > quota) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError', code: 22 }); m.set(k, v); } };
}
const KEY = 'learn:c1:v2';
const ev = (i, extra = {}) => ({ v: 1, id: 'e_' + i, at: new Date(T0 - 864e5 + i * 1000).toISOString(), course: 'c1', kind: 'attempt', source: 'browser', context: 'lesson', lesson: 1, objective: 'l1.o1', item: 'q' + (i % 7), itemType: 'choice', itemVersion: 'v', session: 's', attemptInSession: 1, firstEver: true, outcome: 'correct', assisted: false, ...extra });
const doc = (events, extra = {}) => JSON.stringify({ format: 'learncraft-progress', schemaVersion: 2, course: 'c1', createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', events, ...extra });
const mk = (storage, now = () => T0) => S.createStore({ courseId: 'c1', storage, now, random: Math.random });

describe('SR-06: the store never destroys data it cannot read', () => {
  test('events this runtime cannot validate survive the next write (quarantine) and are exported', () => {
    const st = mem(); st.setItem(KEY, doc([ev(1), ev(2, { kind: 'hint' }), ev(3, { itemType: 'x'.repeat(201) })]));
    const s = mk(st); const r = s.load();
    assert.equal(r.rejected, 2);
    s.recordAttempt({ lesson: 1, item: 'q9', correct: true });
    const ids = JSON.parse(st.getItem(KEY)).events.map((e) => e.id);
    for (const id of ['e_1', 'e_2', 'e_3']) assert.ok(ids.includes(id), `${id} was deleted`);
    assert.equal(s.events().length, 2, 'quarantined events are never derived from');
    assert.ok(JSON.parse(s.exportJSON()).events.some((e) => e.id === 'e_2'));
  });
  test('a tab opened earlier never overwrites a newer-format document, and says so', () => {
    const st = mem(); const old = mk(st); old.load();
    const heard = []; old.subscribe((_, info) => heard.push(info));
    const newer = doc([ev(1), ev(2)], { schemaVersion: 3 });
    st.setItem(KEY, newer);
    old.recordAttempt({ lesson: 1, item: 'q9', correct: true });
    assert.equal(st.getItem(KEY), newer);
    assert.equal(old.persistent, false);
    assert.ok(heard.some((i) => i && i.persisted === false && i.reason === 'newer-format'));
  });
  test('corrupt values keep timestamped, bounded backups', () => {
    const st = mem();
    for (let i = 0; i < 6; i++) { st.setItem(KEY, '{corrupt-' + i); mk(st, () => T0 + i * 1000).load(); }
    const backups = [...st.m].filter(([k]) => k.startsWith(KEY + ':corrupt') && !k.endsWith(':index'));
    assert.equal(backups.length, S.LIMITS.backups);
    assert.deepEqual(backups.map(([, v]) => v).sort(), ['{corrupt-3', '{corrupt-4', '{corrupt-5']);
    assert.equal(st.getItem(KEY + ':corrupt'), '{corrupt-5', 'the newest stays at the old key');
    assert.ok(backups.some(([k]) => /:corrupt:\d{4}-\d\d-\d\dT/.test(k)));
  });
});

describe('SR-05 / SR-09: failed saves are reported; imports are capped and truthful', () => {
  test('a failed write notifies subscribers with persisted: false', () => {
    const st = mem({ quota: 400 }); const s = mk(st); s.load();
    const heard = []; s.subscribe((_, info) => heard.push(info));
    s.recordAttempt({ lesson: 1, item: 'a', itemVersion: 'v', correct: true, note: 'x'.repeat(500) });
    assert.equal(s.persistent, false);
    assert.equal(s.lastWrite.persisted, false); assert.equal(s.lastWrite.reason, 'quota');
    assert.ok(heard.some((i) => i && i.type === 'write' && i.persisted === false));
  });
  test('an import that cannot be saved reports persisted: false (and nothing is claimed saved)', () => {
    const st = mem({ quota: 3000 }); const s = mk(st); s.load();
    const r = s.importJSON(doc(Array.from({ length: 30 }, (_, i) => ev(i, { note: 'n'.repeat(80) }))));
    assert.equal(r.added, 30);
    assert.equal(r.persisted, false);
  });
  test('imports over the size or count cap are refused with a clear message', () => {
    const s = mk(mem()); s.load();
    const tooMany = s.importJSON(doc(Array.from({ length: S.LIMITS.importEvents + 1 }, (_, i) => ({ id: 'x' + i }))));
    assert.equal(tooMany.added, 0); assert.match(tooMany.errors[0], /limit is/);
    const tooBig = s.importJSON(doc([ev(1, { note: 'n'.repeat(1900) })]).padEnd(S.LIMITS.importChars + 10, ' '));
    assert.equal(tooBig.added, 0); assert.match(tooBig.errors[0], /too large/);
  });
  test('writes do not re-parse an unchanged stored document (10 000 events, mean under 40 ms)', () => {
    const st = mem(); st.setItem(KEY, doc(Array.from({ length: 10000 }, (_, i) => ev(i))));
    const s = mk(st); s.load();
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) s.recordAttempt({ lesson: 1, item: 'z' + i, correct: true });
    const mean = (performance.now() - t0) / 5;
    assert.ok(mean < 40, `${mean.toFixed(1)} ms per recordAttempt`);
  });
});

describe('SR-13: strict dates and other tabs', () => {
  test('only real ISO-8601 dates in a sane range are accepted; imports cannot come from the future', () => {
    for (const bad of ['1', '+275760-09-13T00:00:00.000Z', '2026-02-30T00:00:00Z', '2026-01-01T24:00:00Z', '1970-01-01T00:00:00Z', 'Tue, 24 Nov 2026 10:00:00 GMT']) assert.equal(S.isDate(bad), false, bad);
    for (const good of ['2026-11-24T10:00:00Z', '2026-11-24T10:00:00.123Z', '2026-11-24T10:00:00.123456789+02:00']) assert.equal(S.isDate(good), true, good);
    const s = mk(mem()); s.load();
    const r = s.importJSON(doc([ev(1, { at: '2099-01-01T00:00:00Z' }), ev(2)]));
    assert.equal(r.added, 1); assert.match(r.errors[0], /future/);
  });
  test('refresh() picks up another tab\'s events and tells subscribers', () => {
    const st = mem(); const a = mk(st), b = mk(st); a.load(); b.load();
    let heard = 0; a.subscribe((_, info) => { if (info && info.type === 'external') heard++; });
    b.recordAttempt({ lesson: 1, item: 'b1', correct: true });
    a.refresh();
    assert.equal(a.events().length, 1); assert.equal(heard, 1);
  });
});

// ---------- SR-11: tool resolution ----------
test('SR-11: a playwright package planted in the workspace (or its parents) is not loaded by default', async () => {
  const { loadPlaywright, searchBases } = await import('../skills/learn/starter/tools/resolve.mjs');
  const repo = tmp();
  try {
    const pkg = join(repo, 'node_modules', 'playwright');
    mkdirSync(pkg, { recursive: true }); mkdirSync(join(repo, '.learncraft'));
    writeFileSync(join(pkg, 'package.json'), '{"name":"playwright","main":"index.js"}');
    writeFileSync(join(pkg, 'index.js'), 'globalThis.__lcPlanted = true; module.exports = {};');
    const r = loadPlaywright(join(repo, '.learncraft'));
    assert.notEqual(globalThis.__lcPlanted, true, `planted package ran (from ${r.from})`);
    assert.ok(!searchBases(join(repo, '.learncraft')).some(([label]) => /workspace/.test(label)));
    const opted = searchBases(join(repo, '.learncraft'), { allowWorkspace: true });
    assert.match(opted[opted.length - 1][0], /workspace/, 'with the flag the workspace is searched, last');
  } finally { rmSync(repo, { recursive: true, force: true }); delete globalThis.__lcPlanted; }
});
