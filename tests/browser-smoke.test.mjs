// Browser smoke tests: a workspace built from the real starter (assets + templates) loads in Chromium
// with no JS errors, in light, dark and reduced-motion modes. Skips with a stated reason when Playwright
// or the starter files are missing (ADR-011).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { browserOrSkip, buildWorkspace, open, BASE_COURSE, STARTER } from './lib/workspace.mjs';
import { lintWorkspace } from '../scripts/lib/lint-workspace.mjs';

let browser, skip;
before(async () => { ({ browser, skip } = await browserOrSkip()); if (skip) console.log(`# browser smoke skipped: ${skip}`); });
after(async () => { await browser?.close(); });
const t = (name, fn) => test(name, async (ctx) => { if (skip) return ctx.skip(skip); await fn(ctx); });

const nanAttrs = (page) => page.evaluate(() => [...document.querySelectorAll('*')].flatMap((el) => [...el.attributes].filter((a) => /\bNaN\b|undefined/.test(a.value)).map((a) => `<${el.tagName.toLowerCase()} ${a.name}="${a.value}">`)));

t('dashboard renders a one-milestone course with no errors and no NaN', async () => {
  const w = buildWorkspace();
  try {
    const { page, errors, ctx } = await open(browser, w.url('index.html'));
    assert.deepEqual(errors, []);
    assert.deepEqual(await nanAttrs(page), []);
    const text = await page.locator('#dashboard').innerText();
    assert.ok(text.trim().length > 0, 'dashboard is empty');
    assert.match(text, /First lesson|First/);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('dashboard with three milestones (one mastered) renders without errors', async () => {
  const c = BASE_COURSE();
  c.milestones = [
    { id: 'm1', label: 'First', canDo: 'Do one', status: 'mastered', evidence: 'LR-0001' },
    { id: 'm2', label: 'Second', canDo: 'Do two', status: 'in-progress', evidence: null },
    { id: 'm3', label: 'Third', canDo: 'Do three', status: 'locked', evidence: null },
  ];
  c.lessons.push({ n: 2, file: 'lessons/0002-second.html', title: 'Second lesson', milestones: ['m2'], canDo: 'do two', objectives: [{ id: 'l2.o1', text: 'Do two' }] });
  const w = buildWorkspace({ course: c });
  try {
    const { page, errors, ctx } = await open(browser, w.url('index.html'));
    assert.deepEqual(errors, []);
    assert.deepEqual(await nanAttrs(page), []);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('lesson page renders practice from data and announces feedback', async () => {
  const w = buildWorkspace();
  try {
    const { page, errors, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    assert.deepEqual(errors, []);
    assert.ok((await page.locator('#progress').innerText()).trim().length > 0, 'lesson strip did not render');
    const set = page.locator('[data-practice-set]');
    await set.getByText('Which option is right?').waitFor();
    await set.getByRole('button', { name: 'Option one' }).click();
    await page.waitForTimeout(200);
    const live = await page.evaluate(() => [...document.querySelectorAll('[aria-live]')].map((e) => e.textContent.trim()).join(' | '));
    assert.match(live, /\S/, 'no live-region announcement after answering');
    assert.match(await set.innerText(), /Because it is\./, 'the why text was not shown');
    assert.deepEqual(errors, []);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('recall answers are normalised (case, spacing, trailing punctuation)', async () => {
  const w = buildWorkspace();
  try {
    const { page, errors, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    const input = page.locator('[data-practice-set] input[type=text]').first();
    assert.ok(await input.evaluate((el) => !!(el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'))), 'recall input has no accessible name');
    await input.fill('  ALPHA. ');
    await input.press('Enter');
    await page.waitForTimeout(200);
    assert.match(await page.locator('[data-practice-set]').innerText(), /It was alpha\./);
    assert.deepEqual(errors, []);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('review.html and the reference template load without errors', async () => {
  const w = buildWorkspace();
  try {
    for (const rel of ['review.html', 'reference/cheat-sheet.html']) {
      const { errors, ctx } = await open(browser, w.url(rel));
      assert.deepEqual(errors, [], rel);
      await ctx.close();
    }
  } finally { w.cleanup(); }
});

t('dark mode, reduced motion and a 390px phone: no errors, no horizontal scroll', async () => {
  const w = buildWorkspace();
  try {
    for (const rel of ['index.html', 'lessons/0001-first.html']) {
      for (const opt of [{ colorScheme: 'dark' }, { reducedMotion: 'reduce', width: 390 }]) {
        const { page, errors, ctx } = await open(browser, w.url(rel), opt);
        assert.deepEqual(errors, [], `${rel} ${JSON.stringify(opt)}`);
        const sw = await page.evaluate(() => document.documentElement.scrollWidth);
        assert.ok(sw <= (opt.width ?? 900) + 1, `${rel} is ${sw}px wide at ${opt.width ?? 900}px`);
        await ctx.close();
      }
    }
  } finally { w.cleanup(); }
});

t('the shipped example scene (if any) mounts in a lesson without errors', async (ctx) => {
  const ex = join(STARTER, 'examples', 'scenes-0001-sampling.js');
  let sceneJs;
  try { sceneJs = readFileSync(ex, 'utf8'); } catch { return ctx.skip('no starter/examples/scenes-0001-sampling.js'); }
  const id = /Scene\.register\(\s*['"]([^'"]+)/.exec(sceneJs)?.[1];
  if (!id) return ctx.skip('example scene has no Scene.register call');
  const w = buildWorkspace({ sceneJs, lessonExtra: `<div class="scene" data-scene="${id}"></div>` });
  try {
    const { page, errors, ctx: c } = await open(browser, w.url('lessons/0001-first.html'));
    assert.deepEqual(errors, []);
    assert.equal(await page.locator('.lc-error').count(), 0, 'a component failed to mount');
    await c.close();
  } finally { w.cleanup(); }
});

test('a workspace built from the templates passes the workspace lint', async (ctx) => {
  const { missingStarter } = await import('./lib/workspace.mjs');
  const miss = missingStarter();
  if (miss) return ctx.skip(miss);
  const w = buildWorkspace();
  try {
    const f = await lintWorkspace(w.ws);
    assert.deepEqual(f.filter((x) => x.level === 'error'), []);
  } finally { w.cleanup(); }
});

// ---------------------------------------------------------------------------------------------
// Runtime behaviour, ported from the C1 and C2 verification scripts (highest-value assertions).
// ---------------------------------------------------------------------------------------------
const pick = (page, id, text) => page.evaluate(([id, text]) => {
  const q = document.querySelector(`[data-item-id="${id}"]`);
  [...q.querySelectorAll('.lc-opt, button')].find((b) => b.textContent.includes(text)).click();
}, [id, text]);
const S = (page, fn) => page.evaluate((src) => new Function('s', `return (${src})(s)`)(Learncraft.courseStore()), fn.toString());

t('first-ever attempt is immutable: wrong → reload → right keeps the miss', async () => {
  const w = buildWorkspace();
  try {
    const { page, errors, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    await pick(page, 'l1-choice', 'Option two');
    await page.reload(); await page.waitForTimeout(300);
    const prior = await page.evaluate(() => document.querySelector('[data-item-id="l1-choice"] .lc-prior')?.textContent ?? '');
    await pick(page, 'l1-choice', 'Option one'); await page.waitForTimeout(100);
    const r = await S(page, (s) => ({ first: s.firstAttempt('l1-choice').outcome, stats: s.lessonStats(1, ['l1-choice']), n: s.events().filter((e) => e.item === 'l1-choice').length }));
    assert.equal(r.first, 'incorrect');
    assert.equal(r.stats.firstTryCorrect, 0);
    assert.equal(r.n, 2, 'both attempts are logged');
    assert.match(prior, /not right/i, 'the reloaded page does not show the first result');
    assert.deepEqual(errors, []);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('export → clear storage → import restores progress; a second import adds nothing', async () => {
  const w = buildWorkspace();
  try {
    const { page, errors, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    await pick(page, 'l1-choice', 'Option one');
    await page.goto(w.url('index.html')); await page.waitForTimeout(400);
    const before = await S(page, (s) => s.events().length);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.lc-export')]);
    const file = join(w.ws, 'progress-export.json');
    await dl.saveAs(file);
    assert.match(dl.suggestedFilename(), /^progress-smoke-course-\d{4}-\d{2}-\d{2}\.json$/);
    await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
    const cleared = await S(page, (s) => s.events().length);
    await page.setInputFiles('.lc-import input[type=file]', file); await page.waitForTimeout(500);
    await page.reload(); await page.waitForTimeout(400);
    const after = await S(page, (s) => ({ n: s.events().length, first: s.firstAttempt('l1-choice')?.outcome }));
    assert.ok(cleared < before, 'clearing storage removed nothing');
    assert.equal(after.first, 'correct');
    assert.ok(after.n >= before - 1, `import restored ${after.n} of ${before} events`);
    await page.setInputFiles('.lc-import input[type=file]', file); await page.waitForTimeout(400);
    assert.equal(await S(page, (s) => s.events().length), after.n, 'a second import duplicated events');
    assert.deepEqual(errors.filter((e) => /pageerror/.test(e)), []);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('error isolation: a scene that throws shows an error box and the other scene still mounts', async () => {
  const sceneJs = `Scene.register('good', { total: 1000, setup(stage, S, root) { return { c: S.svg('circle', { cx: 50, cy: 50, r: 5 }, root) }; },
      beats: [{ t: 0, d: 800, f(r, p) { r.c.setAttribute('cx', 50 + 100 * p); } }], chapters: [{ t: 0, title: 'One', caption: 'a' }, { t: 500, title: 'Two', caption: 'b' }] });
    Scene.register('bad', { total: 1000, setup() { throw new Error('boom'); }, beats: [], chapters: [{ t: 0, title: 'x', caption: 'x' }] });`;
  const w = buildWorkspace({ sceneJs, lessonExtra: '<div class="scene" data-scene="bad"></div>\n<div class="scene" data-scene="good"></div>' });
  try {
    const { page, errors, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    assert.equal(await page.locator('.lc-error').count(), 1, 'expected exactly one error box');
    assert.ok(await page.locator('[data-scene="good"].sc-player, [data-scene="good"] .sc-player').count() >= 1, 'the good scene did not mount');
    assert.ok(await page.locator('[data-practice-set] .lc-item').count() >= 1, 'practice stopped rendering after the broken scene');
    assert.deepEqual(errors.filter((e) => /pageerror/.test(e)), [], 'the error escaped as an uncaught exception');
    await ctx.close();
  } finally { w.cleanup(); }
});

const GALLERY = join(STARTER, 'examples', 'index.html');
const sceneTime = (page) => page.evaluate(() => Math.round(document.querySelector('.sc-player')._lcScene.timeline.time()));

t('scene player pauses off-screen and on a hidden tab, and resumes', async (ctx) => {
  if (!existsSync(GALLERY)) return ctx.skip('no starter/examples/index.html gallery');
  const { page, errors, ctx: c } = await open(browser, pathToFileURL(GALLERY).href, { width: 1280 });
  const host = page.locator('.sc-player').first();
  await host.scrollIntoViewIfNeeded();
  await page.locator('.sc-player .sc-play').first().click();
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(150);
  const t1 = await sceneTime(page); await page.waitForTimeout(800); const t2 = await sceneTime(page);
  assert.ok(t2 - t1 <= 50, `advanced ${t2 - t1} ms while off-screen`);
  await host.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  const t3 = await sceneTime(page);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(100); const h1 = await sceneTime(page); await page.waitForTimeout(700); const h2 = await sceneTime(page);
  assert.ok(h2 - h1 <= 50, `advanced ${h2 - h1} ms while the tab was hidden`);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(400);
  const h3 = await sceneTime(page);
  assert.ok(t3 > t2 || h3 > h2, 'playback never resumed');
  assert.deepEqual(errors, []);
  await c.close();
});

t('figures are deterministic: the same seed renders the same markup on every load', async (ctx) => {
  if (!existsSync(GALLERY)) return ctx.skip('no starter/examples/index.html gallery');
  const grab = async () => {
    const { page, ctx: c } = await open(browser, pathToFileURL(GALLERY).href, { width: 1280 });
    const r = await page.evaluate(() => {
      const ex = document.querySelector('#ex-sampling .lc-ex-fig, #ex-sampling svg');
      const rng = Learncraft.rng(42), seq = Array.from({ length: 5 }, () => rng());
      const flow = document.querySelector('[data-lc="flow"] svg');
      return { ex: ex ? ex.innerHTML : null, seq, flow: flow ? flow.outerHTML.replace(/lc-flow-\d+/g, 'ID') : null };
    });
    await c.close();
    return r;
  };
  const a = await grab(), b = await grab();
  assert.ok(a.ex && a.flow, 'the gallery has no #ex-sampling explorable or flow figure to compare');
  assert.deepEqual(a.seq, b.seq, 'Learncraft.rng is not deterministic');
  assert.equal(a.ex, b.ex, 'the seeded explorable differs between loads');
  assert.equal(a.flow, b.flow, 'the flow figure differs between loads');
});
