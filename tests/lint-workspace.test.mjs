// Tests for the workspace linter (skills/learn/starter/tools/lint-workspace.mjs) and the evaluation runners.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lintWorkspace, parseResources } from '../scripts/lib/lint-workspace.mjs';
import { scoreWorkspace } from '../evaluations/runners/score-workspace.mjs';
import { measure } from '../evaluations/runners/instruction-cost.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const COURSE = {
  schemaVersion: 2, id: 'fixture-course', topic: 'Fixture', lang: 'en', mission: 'Test the linter',
  milestones: [{ id: 'm1', label: 'One', canDo: 'Do one thing', status: 'in-progress', evidence: null }],
  lessons: [{ n: 1, file: 'lessons/0001-one.html', title: 'One', milestones: ['m1'], canDo: 'Pick the right thing',
    objectives: [{ id: 'l1.o1', text: 'Pick the right thing' }], practice: 'lessons/0001.practice.js' }],
};
const ITEMS = [
  { id: 'l1-pick', type: 'choice', objective: 'l1.o1', prompt: 'Which?', options: [{ text: 'Alpha', correct: true, why: 'Because.' }, { text: 'Bravo', why: 'No.' }, { text: 'Delta', why: 'No.' }] },
  { id: 'l1-recall', type: 'recall', objective: 'l1.o1', prompt: 'Name it.', accept: ['alpha'], why: 'It is alpha.' },
];
const LESSON = (extra = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'">
<title>One</title></head><body data-lesson="1"><main>
<p>Alpha beats bravo in 3 of 4 cases.<sup class="cite"><a href="../RESOURCES.md#s1" data-src="S1">1</a></sup></p>
<div data-practice-set></div>
${extra}
<section id="challenge" data-kind="milestone"><h2>Challenge</h2><p>Pick for your own data and send back the result.</p>
<ul class="criteria"><li>names the pick</li><li>shows the count</li></ul></section>
</main><script src="../assets/core.js"></script><script src="0001.practice.js"></script></body></html>`;
const RESOURCES = `# Resources\n\n## Knowledge\n\n- [S1] [Spec](https://www.rfc-editor.org/rfc/rfc9110) — IETF · spec · tier T1 · verified 2026-11-20\n  Annotation line.\n`;

function ws({ course = COURSE, items = ITEMS, lesson = LESSON(), resources = RESOURCES, files = {} } = {}) {
  const d = mkdtempSync(join(tmpdir(), 'lc-lint-'));
  mkdirSync(join(d, 'assets'), { recursive: true });
  mkdirSync(join(d, 'lessons'), { recursive: true });
  writeFileSync(join(d, 'assets/course.js'), `window.COURSE = ${JSON.stringify(course)};`);
  writeFileSync(join(d, 'assets/core.js'), '');
  if (items) writeFileSync(join(d, 'lessons/0001.practice.js'), `Learncraft.practice(1, ${JSON.stringify(items)});`);
  if (lesson) writeFileSync(join(d, 'lessons/0001-one.html'), lesson);
  if (resources) writeFileSync(join(d, 'RESOURCES.md'), resources);
  for (const [f, c] of Object.entries(files)) { mkdirSync(dirname(join(d, f)), { recursive: true }); writeFileSync(join(d, f), c); }
  return d;
}
async function lint(opts) {
  const d = ws(opts);
  try { return await lintWorkspace(d); } finally { rmSync(d, { recursive: true, force: true }); }
}
const errorRules = (f) => f.filter((x) => x.level === 'error').map((x) => x.rule);
const clone = (o) => JSON.parse(JSON.stringify(o));

test('a clean v2 workspace has no errors', async () => {
  const f = await lint();
  assert.deepEqual(errorRules(f), [], JSON.stringify(f, null, 1));
});

test('template id, duplicate milestone, unknown milestone ref, bad numbering', async () => {
  const c = clone(COURSE);
  c.id = 'topic-slug';
  c.milestones.push({ ...c.milestones[0] });
  c.lessons[0].milestones = ['m1', 'm9'];
  c.lessons[0].n = 2;
  const e = errorRules(await lint({ course: c, lesson: LESSON().replace('data-lesson="1"', 'data-lesson="2"') }));
  for (const r of ['course-template-id', 'milestone-id-dup', 'lesson-milestone-ref', 'lesson-numbering']) assert.ok(e.includes(r), r);
});

test('a mastered milestone needs an LR-NNNN whose learning record exists', async () => {
  const c = clone(COURSE);
  c.milestones[0].status = 'mastered';
  c.milestones[0].evidence = 'LR-0003';
  assert.ok(errorRules(await lint({ course: c })).includes('evidence-record-missing'));
  const ok = await lint({ course: c, files: { 'learning-records/0003-picked.md': '# Picked\n' } });
  assert.ok(!errorRules(ok).includes('evidence-record-missing'));
  c.milestones[0].evidence = null;
  assert.ok(errorRules(await lint({ course: c })).includes('evidence-missing'));
});

test('practice items: exactly one correct option, course-wide unique ids, known objectives, parity warning', async () => {
  const items = clone(ITEMS);
  items[0].options[1].correct = true;
  items[1].id = 'l1-pick';
  items[1].objective = 'l9.o1';
  items.push({ id: 'l1-long', type: 'choice', objective: 'l1.o1', prompt: 'Which one?', options: [{ text: 'A', correct: true }, { text: 'A much much longer option' }] });
  const f = await lint({ items });
  const e = errorRules(f);
  for (const r of ['choice-correct', 'item-id-dup', 'item-objective-unknown']) assert.ok(e.includes(r), r);
  assert.ok(f.some((x) => x.rule === 'choice-option-parity' && x.level === 'warn'));
});

test('practice file must call Learncraft.practice for its own lesson', async () => {
  const d = ws();
  writeFileSync(join(d, 'lessons/0001.practice.js'), `Learncraft.practice(2, ${JSON.stringify(ITEMS)});`);
  try { assert.ok(errorRules(await lintWorkspace(d)).includes('practice-lesson-mismatch')); } finally { rmSync(d, { recursive: true, force: true }); }
});

test('citations must resolve to RESOURCES.md entries, each with a status', async () => {
  const bad = await lint({ lesson: LESSON('<p>Also<sup><a data-src="S7">7</a></sup></p>') });
  assert.ok(errorRules(bad).includes('cite-unresolved'));
  const noStatus = await lint({ resources: '- [S1] [Spec](https://example.org) — no status here\n- [S2] [X](https://x.org) · unverified ()\n' });
  assert.equal(errorRules(noStatus).filter((r) => r === 'resource-status').length, 2);
  const dup = await lint({ resources: RESOURCES + '- [S1] [Again](https://a.org) · verified 2026-01-01\n' });
  assert.ok(errorRules(dup).includes('resource-id-dup'));
  const none = await lint({ resources: null });
  assert.ok(errorRules(none).includes('cite-no-resources'));
});

test('parseResources reads ids, status, dates, tiers and urls', () => {
  const { entries } = parseResources('- [S1] [T](https://a.org) — x · tier T2 · verified 2026-11-24\n  note\n- [s2] [U](https://b.org) · T4 · unverified (offline session)\n');
  assert.deepEqual(entries.map((e) => [e.id, e.status, e.date, e.tier, e.reason]), [['S1', 'verified', '2026-11-24', 'T2', null], ['S2', 'unverified', null, 'T4', 'offline session']]);
});

test('security: inline handlers, javascript: URLs, remote and out-of-place scripts', async () => {
  const lesson = LESSON('<img src="x.png" onerror="alert(1)"><a href="javascript:alert(1)">x</a><script src="https://cdn.example.com/x.js"></script><script src="../reference/x.js"></script><script>window.y=1</script>');
  const f = await lint({ lesson });
  const e = errorRules(f);
  for (const r of ['inline-handler', 'javascript-url', 'script-external', 'script-path']) assert.ok(e.includes(r), r);
  assert.ok(f.some((x) => x.rule === 'inline-script' && x.level === 'warn'));
});

test('lesson page: lang, data-lesson, #challenge with 2–4 criteria', async () => {
  const lesson = LESSON().replace('<html lang="en">', '<html>').replace('data-lesson="1"', 'data-lesson="4"').replace('<li>shows the count</li>', '');
  const f = await lint({ lesson });
  assert.ok(errorRules(f).includes('html-lang'));
  assert.ok(errorRules(f).includes('lesson-data-lesson'));
  assert.ok(f.some((x) => x.rule === 'challenge-criteria' && /1 item/.test(x.message)));
  const noCh = await lint({ lesson: LESSON().replace(/<section id="challenge"[\s\S]*?<\/section>/, '') });
  assert.ok(errorRules(noCh).includes('challenge-missing'));
});

test('legacy markup: data-answer must match exactly one option; missing data-id warns', async () => {
  const quiz = '<div class="quiz-q" data-answer="Lower"><p>Q?</p><div class="quiz-opts"><button>Higher</button><button>Middle</button></div></div>';
  const f = await lint({ lesson: LESSON(quiz) });
  assert.ok(errorRules(f).includes('choice-correct'));
  assert.ok(f.some((x) => x.rule === 'legacy-item-id'));
});

test('CLI exits 1 on errors and prints JSON with --json', () => {
  const c = clone(COURSE); c.id = 'topic-slug';
  const d = ws({ course: c });
  try {
    const r = spawnSync(process.execPath, [join(ROOT, 'skills/learn/starter/tools/lint-workspace.mjs'), d, '--json'], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.ok(JSON.parse(r.stdout).some((x) => x.rule === 'course-template-id'));
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('score-workspace on the baseline fixture is stable', async () => {
  const s = await scoreWorkspace(join(ROOT, 'evaluations/fixtures/baseline-workspace'));
  const by = Object.fromEntries(s.results.map((r) => [r.id, r.status]));
  assert.equal(s.lint.errors, 1); // m1 mastered with LR-0001 but no learning-records/
  assert.equal(by.CR2, 'pass');
  assert.equal(by.AS3, 'fail'); // two-option MCQs
  assert.equal(by.AS11, 'fail'); // no .criteria lists
  assert.equal(by.CR7, 'not-scored');
  assert.equal(s.results.filter((r) => r.kind === 'R').every((r) => r.status === 'not-scored'), true);
});

test('score-workspace scores a clean v2 workspace', async () => {
  const d = ws({ files: { 'NOTES.md': 'L1: no scene (static choice)\n', 'MISSION.md': '# M\n\n## Success looks like\n\n- one\n' } });
  try {
    const s = await scoreWorkspace(d);
    const by = Object.fromEntries(s.results.map((r) => [r.id, r.status]));
    for (const id of ['CR1', 'CR2', 'CR3', 'CR5', 'CR9', 'AS1', 'AS3', 'AS11', 'G1', 'G3', 'G4', 'G5']) assert.equal(by[id], 'pass', `${id}: ${JSON.stringify(s.results.find((r) => r.id === id).evidence)}`);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

const hasBaseline = (() => { try { execFileSync('git', ['cat-file', '-e', 'f8aaf973^{commit}'], { cwd: ROOT, stdio: 'ignore' }); return true; } catch { return false; } })();
test('instruction-cost at the baseline ref matches docs/audit/BASELINE.md', { skip: hasBaseline ? false : 'commit f8aaf973 is not in this clone (CI needs fetch-depth: 0)' }, () => {
  const r = measure({ ref: 'f8aaf973' });
  assert.equal(r.layout, 'v1-monolith');
  const explain = r.rows.find((x) => x.path === 'explain');
  const skill = explain.contexts[0].files.find((f) => f.file === 'skills/learn/SKILL.md');
  assert.equal(skill.tokens, 8580); // BASELINE.md: learn/SKILL.md ≈ 8,580 tokens
  assert.equal(explain.tokens.total, 9078);
});
