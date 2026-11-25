// Security regression tests (F-02, SEC-01…04, F-34). XSS payloads in every course.js string, a scene
// caption, practice prompts and explanations, and poisoned localStorage must never execute and must
// not create live markup. The browser parts skip with a stated reason when Playwright is missing.
// The XSS checks run with the template CSP removed, so they test the escaping itself, not just the CSP.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { browserOrSkip, buildWorkspace, open, BASE_COURSE, BASE_ITEMS, TEMPLATES } from './lib/workspace.mjs';

let browser, skip;
before(async () => { ({ browser, skip } = await browserOrSkip()); if (skip) console.log(`# security browser tests skipped: ${skip}`); });
after(async () => { await browser?.close(); });
const t = (name, fn) => test(name, async (ctx) => { if (skip) return ctx.skip(skip); await fn(ctx); });

const P = (tag) => `${tag}<img src=x onerror="window.__xss='${tag}'"><svg onload="window.__xss='${tag}'"></svg>"><script>window.__xss='${tag}'</script>x<y & z`;
const LIVE_MARKUP = () => [...document.querySelectorAll('*')].filter((el) => [...el.attributes].some((a) => /^on/i.test(a.name)) || (el.tagName === 'IMG' && el.getAttribute('src') === 'x') || (el.tagName === 'SCRIPT' && /__xss/.test(el.textContent)) || (el.tagName === 'A' && /^\s*javascript:/i.test(el.getAttribute('href') || ''))).map((el) => el.outerHTML.slice(0, 120));
const probe = (page) => page.evaluate((src) => ({ xss: window.__xss, live: new Function(`return (${src})()`)(), text: document.body.innerText }), LIVE_MARKUP.toString());

function poisonedCourse() {
  const c = BASE_COURSE();
  c.topic = P('topic'); c.mission = P('mission');
  c.milestones = [
    { id: 'm1', label: P('m1.label'), canDo: P('m1.canDo'), status: 'mastered', evidence: 'LR-0001' },
    { id: 'm2', label: P('m2.label'), canDo: P('m2.canDo'), status: 'in-progress', evidence: null },
  ];
  c.lessons = [
    { n: 1, file: 'lessons/0001-first.html', title: P('l1.title'), milestones: ['m1'], canDo: P('l1.canDo'), objectives: [{ id: 'l1.o1', text: P('l1.o1') }], practice: 'lessons/0001.practice.js' },
    { n: 2, file: 'javascript:window.__xss="file"//.html', title: P('l2.title'), milestones: ['m2'], canDo: P('l2.canDo'), objectives: [{ id: 'l2.o1', text: P('l2.o1') }] },
  ];
  c.strings = { 'next.title': P('strings') };
  return c;
}

t('XSS in every course.js string field never executes and renders as text (dashboard, lesson, review)', async () => {
  const w = buildWorkspace({ course: poisonedCourse(), csp: false });
  try {
    for (const rel of ['index.html', 'lessons/0001-first.html', 'review.html']) {
      const { page, ctx } = await open(browser, w.url(rel));
      await page.waitForTimeout(300);
      const r = await probe(page);
      assert.equal(r.xss, undefined, `${rel}: payload executed (${r.xss})`);
      assert.deepEqual(r.live, [], `${rel}: injected markup is live`);
      if (rel === 'index.html') assert.ok(r.text.includes('<img src=x onerror='), 'payload is not visible as text on the dashboard');
      assert.ok(!r.text.includes('&lt;'), `${rel}: text was double-escaped`);
      await ctx.close();
    }
  } finally { w.cleanup(); }
});

t('XSS in practice prompts, options and explanations is sanitised, even after answering', async () => {
  const items = BASE_ITEMS();
  items[0].prompt = P('prompt');
  items[0].options[0].text = P('opt');
  items[0].options[0].why = P('why') + '<a href="javascript:window.__xss=\'href\'">link</a>';
  items[0].options[1].why = P('why2');
  items[1].why = P('recall-why');
  const w = buildWorkspace({ items, csp: false });
  try {
    const { page, errors, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    const opts = page.locator('[data-practice-set] button, [data-practice-set] [role="button"], [data-practice-set] [role="radio"]');
    for (let i = 0; i < Math.min(3, await opts.count()); i++) await opts.nth(i).click({ timeout: 2000 }).catch(() => {});
    const input = page.locator('[data-practice-set] input[type=text]').first();
    for (const v of ['wrong', 'wrong again']) { await input.fill(v); await input.press('Enter'); }
    await page.waitForTimeout(300);
    const r = await probe(page);
    assert.equal(r.xss, undefined, `payload executed (${r.xss})`);
    assert.deepEqual(r.live, []);
    assert.deepEqual(errors.filter((e) => !/requestfailed/.test(e)), []);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('XSS in a scene caption and title is sanitised', async (ctx) => {
  if (!existsSync(join(TEMPLATES, '..', 'assets', 'scene.js'))) return ctx.skip('assets/scene.js missing');
  const sceneJs = `Scene.register('xss', {
    title: ${JSON.stringify(P('scene.title'))},
    total: 2000,
    setup(stage, S, root) { return { dot: S.svg('circle', { cx: 100, cy: 100, r: 10 }, root) }; },
    beats: [{ t: 0, d: 1000, f(r, p) { r.dot.setAttribute('cx', 100 + 200 * p); } }],
    chapters: [{ t: 0, title: ${JSON.stringify(P('ch.title'))}, caption: ${JSON.stringify(P('caption') + '<b>bold ok</b>')} }, { t: 1000, title: 'Two', caption: 'Plain' }],
  });`;
  const w = buildWorkspace({ sceneJs, lessonExtra: '<div class="scene" data-scene="xss"></div>', csp: false });
  try {
    const { page, errors, ctx: c } = await open(browser, w.url('lessons/0001-first.html'));
    await page.waitForTimeout(400);
    const r = await probe(page);
    assert.equal(r.xss, undefined, `payload executed (${r.xss})`);
    assert.deepEqual(r.live, []);
    assert.equal(await page.locator('.lc-error').count(), 0, `scene failed to mount: ${await page.locator('.lc-error').allInnerTexts()}`);
    assert.ok(await page.locator('.scene b, [data-scene] b').count() >= 1 || /bold ok/.test(r.text), 'allowed <b> markup was dropped entirely');
    assert.deepEqual(errors.filter((e) => !/requestfailed/.test(e)), []);
    await c.close();
  } finally { w.cleanup(); }
});

t('poisoned localStorage (v0 and v2 keys) cannot inject markup', async () => {
  const w = buildWorkspace({ csp: false });
  const init = () => {
    const evil = '<img src=x onerror="window.__xss=\'storage\'">';
    try {
      localStorage.setItem('learn:smoke-course', JSON.stringify({ xp: evil, level: evil, answers: { [evil]: { ok: evil } }, __proto__: { polluted: 1 } }));
      localStorage.setItem('learn:smoke-course:v2', JSON.stringify({ format: 'learncraft-progress', schemaVersion: 2, course: evil, events: [{ v: 1, id: evil, kind: 'attempt', item: evil, lesson: evil, objective: evil, outcome: 'correct', note: evil, at: evil }] }));
    } catch (e) { /* storage may be unavailable */ }
  };
  try {
    for (const rel of ['index.html', 'lessons/0001-first.html', 'review.html']) {
      const { page, errors, ctx } = await open(browser, w.url(rel), { init });
      const r = await probe(page);
      assert.equal(r.xss, undefined, `${rel}: stored payload executed`);
      assert.deepEqual(r.live, [], rel);
      assert.deepEqual(errors.filter((e) => /pageerror/.test(e)), [], `${rel}: uncaught error on corrupt storage`);
      await ctx.close();
    }
  } finally { w.cleanup(); }
});

t('blocked storage shows a notice and practice still works', async () => {
  const w = buildWorkspace();
  const init = () => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } }); };
  try {
    for (const rel of ['index.html', 'lessons/0001-first.html']) {
      const { page, errors, ctx } = await open(browser, w.url(rel), { init });
      assert.deepEqual(errors.filter((e) => /pageerror/.test(e)), [], `${rel}: uncaught error with storage blocked`);
      const notice = page.locator('.lc-notice');
      assert.ok(await notice.count() >= 1, `${rel}: no storage notice`);
      assert.match(await notice.first().innerText(), /not saving|storage/i);
      if (rel.startsWith('lessons/')) {
        await page.locator('[data-practice-set]').getByRole('button', { name: 'Option one' }).click();
        await page.waitForTimeout(150);
        assert.match(await page.locator('[data-practice-set]').innerText(), /Because it is\./, 'practice stopped working without storage');
      }
      await ctx.close();
    }
  } finally { w.cleanup(); }
});

t('with the template CSP in place, pages load clean and a network beacon is blocked', async () => {
  const w = buildWorkspace();
  try {
    const { page, errors, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    assert.deepEqual(errors, [], 'the runtime itself violates the CSP or errors');
    const blocked = await page.evaluate(async () => { try { await fetch('https://example.com/beacon'); return false; } catch { return true; } });
    assert.equal(blocked, true, 'connect-src does not block fetch');
    await ctx.close();
  } finally { w.cleanup(); }
});

// Static checks: no browser needed.
test('every page template carries a CSP meta with connect-src none and no inline script or handler', (ctx) => {
  if (!existsSync(TEMPLATES)) return ctx.skip('starter/templates/ missing');
  const pages = readdirSync(TEMPLATES).filter((f) => f.endsWith('.html'));
  assert.ok(pages.includes('lesson.html'), 'no lesson template');
  for (const f of pages) {
    const h = readFileSync(join(TEMPLATES, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const csp = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i.exec(h)?.[1];
    assert.ok(csp, `${f}: no CSP meta`);
    assert.match(csp, /connect-src 'none'/, `${f}: connect-src is not 'none'`);
    assert.doesNotMatch(csp, /'unsafe-eval'/, f);
    assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/, `${f}: inline scripts allowed`);
    assert.doesNotMatch(h, /<script(?![^>]*\bsrc=)[^>]*>/i, `${f}: inline <script>`);
    assert.doesNotMatch(h, /\son[a-z]+\s*=/i, `${f}: inline event handler`);
    assert.doesNotMatch(h, /<script[^>]+src=["']?(https?:)?\/\//i, `${f}: remote script`);
  }
});

test('starter assets and themes make no network requests and use no eval', (ctx) => {
  const dir = join(TEMPLATES, '..', 'assets');
  if (!existsSync(dir)) return ctx.skip('starter/assets missing');
  const themes = join(TEMPLATES, '..', '..', 'themes');
  const files = [...readdirSync(dir).filter((x) => /\.(js|css)$/.test(x)).map((x) => join(dir, x)), ...(existsSync(themes) ? readdirSync(themes).filter((x) => x.endsWith('.css')).map((x) => join(themes, x)) : [])];
  for (const f of files) {
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|\beval\s*\(|new\s+Function\s*\(/, `${f} uses a network or eval API`);
    assert.doesNotMatch(src, /@import\s+url\(\s*["']?https?:/i, `${f} imports remote CSS`);
  }
});
