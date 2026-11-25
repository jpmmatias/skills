// Security regression tests (F-02, SEC-01…04, F-34). XSS payloads in every course.js string, a scene
// caption, practice prompts and explanations, and poisoned localStorage must never execute and must
// not create live markup. The browser parts skip with a stated reason when Playwright is missing.
// The XSS checks run with the template CSP removed, so they test the escaping itself, not just the CSP.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { browserOrSkip, buildWorkspace, open, BASE_COURSE, BASE_ITEMS, TEMPLATES } from './lib/workspace.mjs';

let browser, skip;
before(async () => { ({ browser, skip } = await browserOrSkip()); if (skip) console.log(`# security browser tests skipped: ${skip}`); });
after(async () => { await browser?.close(); });
const t = (name, fn) => test(name, async (ctx) => { if (skip) return ctx.skip(skip); await fn(ctx); });

const P = (tag) => `${tag}<img src=x onerror="window.__xss='${tag}'"><svg onload="window.__xss='${tag}'"></svg>"><script>window.__xss='${tag}'</script>x<y & z`;
// SR-07: links are judged by what the URL parser resolves (a.protocol), not by the raw attribute text, so
// "java\tscript:" and "\u0001javascript:" count; a backslash or // href that resolves to file://host counts too.
const LIVE_MARKUP = () => [...document.querySelectorAll('*')].filter((el) => [...el.attributes].some((a) => /^on/i.test(a.name)) || (el.tagName === 'IMG' && el.getAttribute('src') === 'x') || (el.tagName === 'SCRIPT' && /__xss/.test(el.textContent)) || (/^(A|AREA)$/.test(el.tagName) && el.hasAttribute('href') && (/^(javascript|vbscript|data):$/.test(el.protocol) || (el.protocol === 'file:' && el.host)))).map((el) => el.outerHTML.slice(0, 120));
const probe = (page) => page.evaluate((src) => ({ xss: window.__xss, live: new Function(`return (${src})()`)(), text: document.body.innerText }), LIVE_MARKUP.toString());
/** Clicks every link in `scope` (navigation to other files is cancelled), then reports window.__xss. */
async function clickAllLinks(page, scope = 'main, body') {
  await page.evaluate(() => document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href]'); if (a && a.protocol !== 'javascript:') e.preventDefault(); }, true));
  const links = page.locator(`${scope} a[href]`);
  for (let i = 0; i < await links.count(); i++) await links.nth(i).click({ timeout: 1000, force: true }).catch(() => {});
  await page.waitForTimeout(150);
  return page.evaluate(() => window.__xss);
}
// URL-parser bypasses of the href check (SR-01, SR-12): every one must lose its href in sanitize().
const HREF_BYPASSES = ['java&#9;script:window.__xss=1', 'java&Tab;script:window.__xss=1', 'java&NewLine;script:window.__xss=1', 'java&#13;script:window.__xss=1',
  '&#1;javascript:window.__xss=1', '&#x1f;javascript:window.__xss=1', 'jav&#x09;ascript&#x3a;window.__xss=1', 'javascript&colon;window.__xss=1',
  '\\\\attacker.example\\share', '/\\attacker.example/x', '//attacker.example/x', 'data:text/html,x', 'vbscript:x', 'file:///etc/passwd'];

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
      // Raw JSON text: an object literal's __proto__ is never serialised by JSON.stringify (SR-07), so write the key by hand.
      localStorage.setItem('learn:smoke-course', '{"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted":1}},' + JSON.stringify({ xp: evil, level: evil, answers: { [evil]: { ok: evil } } }).slice(1));
      // A VALID v2 document whose events carry the payloads in every free-text field, so they reach the renderers.
      const e = (id, extra) => Object.assign({ v: 1, id, at: '2026-11-20T10:00:00.000Z', course: 'smoke-course', kind: 'attempt', source: 'browser', context: 'lesson', lesson: 1, objective: evil, item: evil, itemType: evil, itemVersion: evil, session: evil, attemptInSession: 1, firstEver: true, outcome: 'correct', assisted: false, note: evil }, extra);
      localStorage.setItem('learn:smoke-course:v2', '{"__proto__":{"polluted":1},' + JSON.stringify({ format: 'learncraft-progress', schemaVersion: 2, course: 'smoke-course', createdAt: '2026-11-20T10:00:00.000Z', updatedAt: '2026-11-20T10:00:00.000Z',
        events: [e('a1'), e('a2', { objective: 'l1.o1', item: 'l1-choice', itemVersion: null }), e('r1', { kind: 'review_session', context: 'review', objective: 'l1.o1', item: null, results: [{ item: evil, outcome: 'correct' }], passed: true })] }).slice(1));
    } catch (e) { /* storage may be unavailable */ }
  };
  try {
    for (const rel of ['index.html', 'lessons/0001-first.html', 'review.html']) {
      const { page, errors, ctx } = await open(browser, w.url(rel), { init });
      const r = await probe(page);
      assert.equal(r.xss, undefined, `${rel}: stored payload executed`);
      assert.deepEqual(r.live, [], rel);
      assert.equal(await page.evaluate(() => ({}).polluted), undefined, `${rel}: Object.prototype polluted`);
      assert.ok(await page.evaluate(() => Learncraft.courseStore().events().length) >= 2, `${rel}: the valid poisoned events did not load, so nothing was rendered from them`);
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

// ---------- security review regressions (SR-01, SR-04, SR-05, SR-08, SR-10, SR-12, SR-13) ----------
t('SR-01/SR-12: sanitize() drops hrefs that the URL parser turns into javascript:, data:, file://host or a network path', async () => {
  const w = buildWorkspace();
  try {
    const { page, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    const out = await page.evaluate((list) => list.map((h) => {
      const d = document.createElement('div'); d.innerHTML = Learncraft.sanitize(`<a href="${h}">x</a>`);
      const a = d.querySelector('a');
      return { h, kept: a.getAttribute('href'), protocol: a.hasAttribute('href') ? a.protocol : null, host: a.hasAttribute('href') ? a.host : null };
    }), HREF_BYPASSES);
    for (const r of out) assert.equal(r.kept, null, `${r.h} survived as ${JSON.stringify(r.kept)} (${r.protocol}//${r.host})`);
    const good = await page.evaluate(() => ['https://example.com/a?b=1&amp;c=2', 'http://example.com', 'mailto:a@b.example', '#frag', '../reference/x.html']
      .map((h) => { const d = document.createElement('div'); d.innerHTML = Learncraft.sanitize(`<a href="${h}">x</a>`); return d.querySelector('a').getAttribute('href'); }));
    assert.deepEqual(good, ['https://example.com/a?b=1&c=2', 'http://example.com', 'mailto:a@b.example', '#frag', '../reference/x.html']);
    assert.equal(await page.evaluate(() => Learncraft.safeHref && Learncraft.safeHref('java\tscript:x')), null);
    assert.equal(await page.evaluate(() => Learncraft.workspaceHref && Learncraft.workspaceHref('../../etc/passwd')), '#');
    // html`` escapes quotes in attribute context: an interpolated value cannot open a new attribute
    assert.equal(await page.evaluate(() => { const d = document.createElement('div'); d.innerHTML = String(Learncraft.html`<p title="${'x" onmouseover="window.__xss=1'}">t</p>`); return d.firstChild.attributes.length; }), 1);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('SR-01: clicking links in practice prompts, explanations and scene captions never runs script (no CSP)', async () => {
  const items = BASE_ITEMS();
  items[0].prompt = 'Q <a href="&#1;javascript:window.__xss=\'prompt-c0\'">src</a> <a href="\\\\attacker.example\\x">unc</a>';
  items[0].options[0].why = 'Right. <a href="java&#9;script:window.__xss=\'why-tab\'">more</a>';
  items[1].why = '<a href="java&NewLine;script:window.__xss=\'recall-nl\'">x</a>';
  const sceneJs = `Scene.register('t', { title: 'T', total: 1000, setup() { return {}; }, beats: [{ t: 0, d: 10, f() {} }],
    chapters: [{ t: 0, title: 'One', caption: 'see <a href="java&#10;script:window.__xss=\\'scene\\'">this</a>' }] });`;
  const w = buildWorkspace({ items, csp: false, sceneJs, lessonExtra: '<div class="scene" data-scene="t"></div>' });
  try {
    const { page, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    await page.getByRole('button', { name: 'Option one' }).click();
    const input = page.locator('[data-practice-set] input[type=text]').first();
    await input.fill('alpha'); await input.press('Enter');
    await page.waitForTimeout(200);
    assert.deepEqual((await probe(page)).live, []);
    assert.equal(await clickAllLinks(page), undefined, 'a sanitised link ran script on click');
    await ctx.close();
  } finally { w.cleanup(); }
});

t('SR-04: lessons[].practice outside lessons/NNNN.practice.js is never loaded, even with the template CSP', async () => {
  const course = BASE_COURSE();
  const w = buildWorkspace({ course });
  try {
    writeFileSync(join(w.ws, 'evil.js'), "window.__xss = 'outside-script';");
    course.lessons[0].practice = '../' + basename(w.ws) + '/evil.js';
    writeFileSync(join(w.ws, 'assets', 'course.js'), `window.COURSE = ${JSON.stringify(course)};`);
    for (const rel of ['review.html', 'index.html']) {
      const { page, ctx } = await open(browser, w.url(rel));
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => window.__xss), undefined, `${rel}: a data field chose which script ran`);
      await ctx.close();
    }
  } finally { w.cleanup(); }
});

t('SR-05: when storage fills mid-session the learner is told, and an import that cannot be saved says so', async () => {
  const w = buildWorkspace();
  const fill = () => { let n = 0; for (const size of [65536, 4096, 256, 16, 1]) { const c = 'x'.repeat(size); try { for (;;) localStorage.setItem('fill' + n++, c); } catch (e) { /* full */ } } };
  const clear = () => { for (const k of Object.keys(localStorage)) if (/^fill\d+$/.test(k)) localStorage.removeItem(k); };
  try {
    const { page, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
    assert.equal(await page.locator('.lc-notice').count(), 0);
    await page.evaluate(fill);
    await page.getByRole('button', { name: 'Option one' }).click(); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => Learncraft.courseStore().persistent), false);
    assert.ok(await page.locator('.lc-notice').count() >= 1, 'no notice after a failed save');
    assert.match(await page.locator('.lc-notice').first().innerText(), /not saved|not saving/i);
    await page.evaluate(clear);
    const ev = (i) => ({ v: 1, id: 'e_' + i, at: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString(), course: 'smoke-course', kind: 'attempt', item: 'x' + (i % 50), objective: 'l1.o1', source: 'import', context: 'lesson', lesson: 1, outcome: 'correct', assisted: false, note: 'n'.repeat(60) });
    const file = join(w.ws, 'mid.json');
    writeFileSync(file, JSON.stringify({ format: 'learncraft-progress', schemaVersion: 2, course: 'smoke-course', events: Array.from({ length: 6000 }, (_, i) => ev(i)) }));
    const dash = await ctx.newPage(); await dash.goto(w.url('index.html')); await dash.waitForTimeout(300);
    await dash.evaluate(fill);
    await dash.setInputFiles('.lc-import input[type=file]', file); await dash.waitForTimeout(800);
    const msg = await dash.locator('.lc-record-msg').innerText();
    await dash.evaluate(clear);
    assert.match(msg, /not saved/i, `the import claimed success: "${msg}"`);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('SR-08: one malformed practice item shows one error box; the other items still render (lesson and review)', async () => {
  const items = [{ id: 'l1-bad', type: 'choice', objective: 'l1.o1', prompt: 'Bad', options: [null, { text: 'ok', correct: true }] }, ...BASE_ITEMS()];
  const w = buildWorkspace({ items });
  try {
    for (const rel of ['lessons/0001-first.html', 'review.html']) {
      const { page, errors, ctx } = await open(browser, w.url(rel));
      if (rel === 'review.html') { await page.locator('.lc-anyway').click(); await page.waitForTimeout(200); }
      assert.equal(await page.locator('.lc-error').count(), 1, `${rel}: error boxes`);
      assert.ok(await page.locator('.lc-item').count() >= 2, `${rel}: the valid items did not render`);
      assert.deepEqual(errors.filter((e) => /pageerror/.test(e)), [], rel);
      await ctx.close();
    }
  } finally { w.cleanup(); }
});

t('SR-10: a scene terminal line class cannot inject markup', async () => {
  const sceneJs = `Scene.register('t', { title: 'T', total: 1000,
    setup(stage, S) { return { term: S.terminal(stage, { x: 0, y: 0, w: 50, h: 50, title: 'zsh' }) }; },
    beats: [{ t: 0, d: 10, f(r) { r.term.set(0, 'out', [{ t: 'hello', c: 'gold"><img src=x onerror="window.__xss=1">' }], 1); } }],
    chapters: [{ t: 0, title: 'One', caption: 'plain' }] });`;
  const w = buildWorkspace({ sceneJs, lessonExtra: '<div class="scene" data-scene="t"></div>', csp: false });
  try {
    const { page, ctx } = await open(browser, w.url('lessons/0001-first.html'));
    await page.waitForTimeout(300);
    const r = await probe(page);
    assert.equal(r.xss, undefined); assert.deepEqual(r.live, []);
    assert.equal(await page.locator('.sc-term-body img').count(), 0);
    await ctx.close();
  } finally { w.cleanup(); }
});

t('SR-13: a dashboard open in another tab updates when the lesson tab records an answer', async () => {
  const w = buildWorkspace();
  try {
    const { page: dash, ctx } = await open(browser, w.url('index.html'));
    await dash.evaluate(() => localStorage.clear()); await dash.reload(); await dash.waitForTimeout(300);
    assert.match(await dash.locator('.lc-lessons').innerText(), /not started/);
    const lesson = await ctx.newPage(); await lesson.goto(w.url('lessons/0001-first.html')); await lesson.waitForTimeout(300);
    await lesson.getByRole('button', { name: 'Option one' }).click(); await lesson.waitForTimeout(500);
    assert.doesNotMatch(await dash.locator('.lc-lessons').innerText(), /not started/, 'the other tab still shows stale progress');
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
