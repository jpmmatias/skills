// Regression tests for the runtime items from the skills review (SK-01, SK-03, SK-18, SK-23, SK-24) and the
// course authors' runtime findings (feedback, stepper, bars, overflowing code, explorable reseed, ctx.record).
// Every test here failed against the runtime before these fixes; see docs/audit/handoffs/security-fixes.md.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireClassic } from '../scripts/lib/schema.mjs';
import { browserOrSkip, buildWorkspace, open, BASE_COURSE, BASE_ITEMS } from './lib/workspace.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = requireClassic(join(ROOT, 'skills/learn/starter/assets/store.js'));
const T0 = Date.parse('2026-11-24T10:00:00Z'), DAY = 864e5;
let n = 0;
const att = (item, ok, o = {}) => S.sanitizeEvent({ v: 1, id: 'x' + (n++), at: new Date(o.t != null ? o.t : T0).toISOString(), course: 'c1', kind: 'attempt',
  source: 'browser', context: o.context || 'lesson', lesson: 1, objective: 'l1.o1', item, itemType: o.type || 'recall', itemVersion: 'v', session: 's',
  attemptInSession: 1, firstEver: true, outcome: ok ? 'correct' : 'incorrect', assisted: false }).event;

// ---------- store (Node) ----------
describe('SK-03: pretest guesses (context diagnostic) never count', () => {
  test('two wrong pretest guesses do not cap the objective below Understood', () => {
    const evs = [att('p1', false, { context: 'diagnostic', type: 'choice' }), att('p2', false, { context: 'diagnostic', type: 'choice' }),
      att('a', true, { t: T0 + 1 }), att('b', true, { t: T0 + 2 }), att('c', true, { t: T0 + 3 }), att('d', true, { t: T0 + 4, type: 'choice' })];
    const lv = S.deriveLevel(evs, 'l1.o1');
    assert.equal(lv.level, 3, JSON.stringify(lv));
    assert.equal(lv.basis.items, 4);
  });
  test('a diagnostic attempt is not a first try, earns no XP and does not enter review', () => {
    const s = S.createStore({ courseId: 'c1', storage: null, now: () => T0 });
    const e = s.recordAttempt({ lesson: 1, objective: 'l1.o1', item: 'p1', itemVersion: 'v', correct: true, context: 'diagnostic' });
    assert.equal(e.firstEver, false);
    assert.equal(s.firstAttempt('p1', 'v'), null);
    assert.equal(s.xp(), 0);
    assert.equal(s.schedule('l1.o1').box, 0);
    assert.equal(s.lessonStats(1).attempted, 0);
    const later = s.recordAttempt({ lesson: 1, objective: 'l1.o1', item: 'p1', itemVersion: 'v', correct: false });
    assert.equal(later.firstEver, true, 'the first real attempt after a pretest is the first try');
  });
});

test('SK-18: one box-1 entry rule: the first answer on the objective (no item list needed)', () => {
  const s = S.deriveSchedule([att('a', true)], 'l1.o1', { now: T0 + 1000 });
  assert.deepEqual([s.box, s.due, s.status], [1, T0 + DAY, 'scheduled']);
  assert.match(s.explanation, /first practice answer → box 1/);
  assert.match(S.deriveSchedule([], 'l1.o1', { now: T0 }).explanation, /first practice answer on it schedules/);
});

// ---------- browser ----------
let browser, skip;
before(async () => { ({ browser, skip } = await browserOrSkip()); if (skip) console.log(`# runtime browser tests skipped: ${skip}`); });
after(async () => { await browser?.close(); });
const t = (name, fn) => test(name, async (ctx) => { if (skip) return ctx.skip(skip); await fn(ctx); });
const withFigures = (w, extra = '') => {
  const p = join(w.ws, 'lessons/0001-first.html');
  let h = readFileSync(p, 'utf8').replace(/<!-- Optional, only when[\s\S]*?-->/, '');
  h = h.replace('<section class="practice"', `${extra}\n<section class="practice"`).replace('</body>', '<script src="../assets/viz.js"></script>\n<script src="../assets/diagram.js"></script>\n</body>');
  writeFileSync(p, h);
};

t('SK-01: a mastered milestone gives L4 only to the objectives it lists', async () => {
  for (const [objectives, want] of [[undefined, /Seen|Not started/], [['l1.o1'], /Applied/]]) {
    const course = BASE_COURSE();
    course.milestones[0] = { ...course.milestones[0], status: 'mastered', evidence: 'LR-0001', ...(objectives ? { objectives } : {}) };
    const w = buildWorkspace({ course });
    try {
      const { page, ctx } = await open(browser, w.url('lessons/0001-first.html'));
      await page.waitForTimeout(200);
      const level = await page.locator('.lc-level').innerText();
      assert.match(level, want, `objectives=${JSON.stringify(objectives)}: strip shows ${level}`);
      if (!objectives) assert.match(await page.locator('#progress').innerText(), /Proven by your challenge/);
      await ctx.close();
    } finally { w.cleanup(); }
  }
});

t('SK-03: a pretest item is recorded as diagnostic and is not counted as practice', async () => {
  const items = [{ id: 'l1-pre', type: 'choice', objective: 'l1.o1', pretest: true, prompt: 'Guess first', options: [{ text: 'Guess A', correct: true }, { text: 'Guess B' }] }, ...BASE_ITEMS()];
  const w = buildWorkspace({ items });
  try {
    const { page, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    await page.getByRole('button', { name: 'Guess B' }).click(); await page.waitForTimeout(150);
    const ev = await page.evaluate(() => Learncraft.courseStore().events().filter((e) => e.item === 'l1-pre').map((e) => e.context));
    assert.deepEqual(ev, ['diagnostic']);
    assert.match(await page.locator('.lc-count').innerText(), /0 of 2 answered/);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('SK-18: "ready for the challenge" also needs one recall, fade or order item right on the first try', async () => {
  const choice = (i) => ({ id: 'l1-c' + i, type: 'choice', objective: 'l1.o1', prompt: 'Q' + i, options: [{ text: 'Yes ' + i, correct: true }, { text: 'No ' + i }] });
  const items = [choice(1), choice(2), choice(3), choice(4), choice(5), { id: 'l1-r', type: 'recall', objective: 'l1.o1', prompt: 'Type alpha.', accept: ['alpha'] }];
  const w = buildWorkspace({ items });
  try {
    const { page, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    for (let i = 1; i <= 5; i++) await page.getByRole('button', { name: 'Yes ' + i }).click();
    const input = page.locator('[data-practice-set] input[type=text]').first();
    await input.fill('beta'); await input.press('Enter');
    await page.waitForTimeout(200);
    const msg = await page.locator('.lc-status').innerText();
    assert.doesNotMatch(msg, /ready for the challenge/i, msg);
    assert.match(msg, /from memory/);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('SK-23 and authors: recall uses the store\'s matching, per-answer tolerance; feedback never says "Right." twice', async () => {
  const items = [{ id: 'l1-r1', type: 'recall', objective: 'l1.o1', prompt: 'Name it.', accept: ['state-machine'] },
    { id: 'l1-r2', type: 'recall', objective: 'l1.o1', prompt: 'Pi?', accept: [{ answer: 3.14, tolerance: 0.01 }] },
    { id: 'l1-o', type: 'order', objective: 'l1.o1', prompt: 'Order', steps: ['one', 'two'] }];
  const w = buildWorkspace({ items });
  try {
    const { page, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    const inputs = page.locator('[data-practice-set] input[type=text]');
    await inputs.nth(0).fill('State—Machine'); await inputs.nth(0).press('Enter');
    await inputs.nth(1).fill('3.145'); await inputs.nth(1).press('Enter');
    const order = page.locator('[data-item-id="l1-o"]');
    await order.locator('.lc-down').first().click(); await order.locator('.lc-check').click();
    if (!/order/i.test(await order.locator('.lc-fb').innerText())) { await order.locator('.lc-down').first().click(); await order.locator('.lc-check').click(); }
    await page.waitForTimeout(150);
    const ok = await page.evaluate(() => Learncraft.courseStore().events().filter((e) => e.kind === 'attempt').map((e) => e.item + ':' + e.outcome));
    assert.ok(ok.includes('l1-r1:correct'), `dash variant rejected: ${ok}`);
    assert.ok(ok.includes('l1-r2:correct'), `per-answer tolerance ignored: ${ok}`);
    for (const fb of await page.locator('.lc-fb.ok').allInnerTexts()) assert.doesNotMatch(fb, /Right\.?\s+Right/, fb);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('SK-24: the export file is named by the store (UTC date), not the local date', async () => {
  const w = buildWorkspace();
  try {
    // A zone whose local date differs from the UTC date right now: UTC−11 before 11:00 UTC, UTC+14 from 10:00 UTC.
    const timezoneId = new Date().getUTCHours() < 11 ? 'Pacific/Pago_Pago' : 'Pacific/Kiritimati';
    const ctx = await browser.newContext({ timezoneId, acceptDownloads: true });
    const page = await ctx.newPage();
    await page.goto(w.url('index.html')); await page.waitForTimeout(300);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.lc-export').click()]);
    assert.equal(dl.suggestedFilename(), await page.evaluate(() => Learncraft.courseStore().exportFilename()));
    await ctx.close();
  } finally { w.cleanup(); }
});

t('authors: a stepper paints its final state first; Play starts again from step 1', async () => {
  const stepper = `<div class="stepper" id="st"><svg viewBox="0 0 300 100"><g data-step="1"><path class="arrow" d="M10 10 L 100 10"/></g><g data-step="2"><path class="arrow" d="M10 50 L 100 50"/></g><g data-step="3"><path class="arrow" d="M10 90 L 100 90"/></g></svg>
    <div class="captions"><p data-step="1">One</p><p data-step="2">Two</p><p data-step="3">Three</p></div></div>`;
  const w = buildWorkspace();
  withFigures(w, stepper);
  try {
    const { page, errors, ctx } = await open(browser, w.url('lessons/0001-first.html'), { reducedMotion: 'reduce' });
    const state = () => page.evaluate(() => ({ hidden: document.querySelectorAll('#st .st-hidden').length, cap: [...document.querySelectorAll('#st .captions p')].filter((p) => !p.hidden).map((p) => p.textContent) }));
    assert.deepEqual(await state(), { hidden: 0, cap: ['Three'] });
    await page.locator('#st .stepper-play, #st [class*="play"]').first().click(); await page.waitForTimeout(100);
    assert.deepEqual((await state()).cap, ['One']);
    const max = await page.evaluate(() => getComputedStyle(document.querySelector('#st svg')).maxWidth);
    assert.notEqual(max, 'none', 'stepper SVG width is not capped');
    assert.deepEqual(errors.filter((e) => /pageerror/.test(e)), []);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('authors: bars keep the order of an array (integer-like labels); a wide <pre> is keyboard-focusable', async () => {
  const w = buildWorkspace();
  withFigures(w, `<div data-lc="bars" id="b" data-bars='[["1",0.2],["10",0.3],["2",0.5]]' data-label="Counts"></div><pre id="wide">${'x'.repeat(400)}</pre>`);
  try {
    const { page, errors, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    assert.match(await page.locator('#b svg').getAttribute('aria-label'), /Counts: 1 0\.20, 10 0\.30, 2 0\.50/);
    assert.equal(await page.locator('#wide').getAttribute('tabindex'), '0');
    assert.deepEqual(errors.filter((e) => /pageerror/.test(e)), []);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('authors: explorable.reseed() and ctx.record for registered components', async () => {
  const w = buildWorkspace();
  withFigures(w, '<div id="ex"></div><div data-lc="probe-rec" data-id="l1-widget"></div>');
  try {
    const { page, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    const r = await page.evaluate(() => {
      const ex = Learncraft.explorable(document.getElementById('ex'), { seed: 1, params: [{ id: 'k', label: 'k', min: 0, max: 10, step: 1, value: 3 }],
        render: (v, rng) => `<svg viewBox="0 0 10 10"><text>${Math.floor(rng() * 1e6)}</text></svg>` });
      let rec = 'none';
      Learncraft.register('probe-rec', { mount(el, c) { rec = typeof c.record; c.record(true); } });
      return { reseed: typeof ex.reseed, seed: ex.reseed && ex.reseed(42), rec };
    });
    assert.deepEqual([r.reseed, r.seed, r.rec], ['function', 42, 'function']);
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(() => Learncraft.courseStore().events().some((e) => e.item === 'l1-widget' && e.outcome === 'correct')));
    await ctx.close();
  } finally { w.cleanup(); }
});
