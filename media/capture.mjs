#!/usr/bin/env node
// Screenshots for the README, the guide and the social preview, taken from the example courses in examples/.
//
//   node media/capture.mjs [readme|guide|social ...]      (no argument: all three)
//
// Writes media/readme/*.png, media/guide/0N-*.png, media/social-preview.svg and media/social-preview.png,
// all at deviceScaleFactor 2. Playwright is found like the lesson check finds it
// (skills/learn/starter/tools/resolve.mjs: ~/.cache/learncraft/tools, node_modules, the global npm root).
// Each page gets a fixed Learncraft.seed so option order and simulations are the same on every run.
// Practice answers made here live in a throwaway browser profile; nothing is written into examples/.
// LOOK at every image before committing it.
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPlaywright } from '../skills/learn/starter/tools/resolve.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EX = join(ROOT, 'examples');
const MEDIA = join(ROOT, 'media');
const groups = process.argv.slice(2).length ? process.argv.slice(2) : ['readme', 'guide', 'social'];

const { playwright, reason } = loadPlaywright(ROOT);
if (!playwright) { console.error(reason); process.exit(1); }
const browser = await playwright.chromium.launch();
const url = (p) => pathToFileURL(join(EX, p)).href;
const lessons = (course) => readdirSync(join(EX, course, 'lessons')).filter((f) => /^\d{4}-.*\.html$/.test(f)).sort();

async function open(path, { width = 900, height = 1000, dark = false, seed = 'learncraft-media' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'no-preference' });
  await ctx.addInitScript((s) => { window.Learncraft = Object.assign(window.Learncraft || {}, { seed: s }); }, seed);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url(path));
  await page.waitForLoadState('load');
  await page.waitForTimeout(700);
  if (errors.length) console.warn(`  ! ${path}: ${errors.join(' | ')}`);
  return { page, ctx };
}

/** Screenshot from the top of `fromSel` (or the page top) down to the bottom of `toSel`, full content width. */
async function shotRange(page, out, { fromSel = null, toSel, pad = 24, maxH = 1400 } = {}) {
  const box = await page.evaluate(([f, t, p]) => {
    const top = f ? document.querySelector(f).getBoundingClientRect().top + scrollY - p : 0;
    const el = document.querySelector(t);
    const bottom = el.getBoundingClientRect().bottom + scrollY + p;
    return { top: Math.max(0, top), bottom };
  }, [fromSel, toSel, pad]);
  const vw = page.viewportSize().width;
  await page.screenshot({ path: out, fullPage: true, clip: { x: 0, y: box.top, width: vw, height: Math.min(maxH, box.bottom - box.top) } });
}

/** Screenshot of one element with some page around it, optionally starting at the nearest heading above it. */
async function shotElement(page, sel, out, { pad = 20, withHeading = true } = {}) {
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const box = await page.evaluate(([s, p, h]) => {
    const el = document.querySelector(s);
    let top = el.getBoundingClientRect().top;
    if (h) {
      let n = el.previousElementSibling, hops = 0;
      while (n && hops < 3 && !/^H[23]$/.test(n.tagName)) { n = n.previousElementSibling; hops++; }
      if (n && /^H[23]$/.test(n.tagName)) top = n.getBoundingClientRect().top;
    }
    const r = el.getBoundingClientRect();
    const main = (el.closest('main') || document.body).getBoundingClientRect();
    return { x: Math.max(0, main.left - p), y: top + scrollY - p, w: Math.min(innerWidth, main.width + 2 * p), h: r.bottom - top + 2 * p };
  }, [sel, pad, withHeading]);
  await page.screenshot({ path: out, fullPage: true, clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
}

/** Answers the first choice item on the page correctly (so the screenshot shows the "why" feedback). */
async function answerFirstChoice(page) {
  return page.evaluate(() => {
    const host = document.querySelector('.lc-item.lc-choice');
    if (!host) return null;
    const it = window.Learncraft.practiceItems().find((x) => x.id === host.getAttribute('data-item-id'));
    const i = it.options.findIndex((o) => o.correct);
    host.querySelector(`button.lc-opt[data-i="${i}"]`).click();
    host.scrollIntoView({ block: 'center' });
    return '.lc-item.lc-choice';
  });
}

const firstExisting = async (page, sels) => {
  for (const s of sels) if (await page.locator(s).count()) return s;
  return null;
};

async function readme() {
  mkdirSync(join(MEDIA, 'readme'), { recursive: true });
  let { page, ctx } = await open('transformers/index.html', { width: 820, height: 1000 });
  await shotRange(page, join(MEDIA, 'readme', 'dashboard.png'), { toSel: '#dashboard', maxH: 640 });
  await ctx.close();
  const lesson = lessons('transformers').find((f) => f.startsWith('0002')) || lessons('transformers')[0];
  ({ page, ctx } = await open(`transformers/lessons/${lesson}`, { width: 820, height: 1000 }));
  const fig = await firstExisting(page, ['[data-lc="attention-explorer"]', '.lc-explorable', '[data-lc]:not([data-lc="scene"])', 'figure']);
  await shotElement(page, fig, join(MEDIA, 'readme', 'lesson.png'));
  await ctx.close();
  console.log('readme: media/readme/{dashboard,lesson}.png', `(figure: ${fig} in ${lesson})`);
}

async function guide() {
  const G = (n) => join(MEDIA, 'guide', n);
  let { page, ctx } = await open('transformers/index.html', { width: 900 });
  await shotRange(page, G('01-dashboard.png'), { toSel: '#dashboard', maxH: 1300 });
  await ctx.close();

  const l1 = `probability/lessons/${lessons('probability')[0]}`;
  ({ page, ctx } = await open(l1, { width: 900 }));
  await shotRange(page, G('02-lesson.png'), { toSel: '#progress', maxH: 1000 });
  await ctx.close();

  // a motion scene, wherever one exists
  let sceneDone = false;
  for (const c of ['transformers', 'react-rendering', 'probability']) {
    for (const f of lessons(c)) {
      if (sceneDone) break;
      ({ page, ctx } = await open(`${c}/lessons/${f}`, { width: 900 }));
      const sel = await firstExisting(page, ['.sc-player']);
      if (sel) {
        await page.locator(sel).first().scrollIntoViewIfNeeded();
        await page.evaluate((s) => { const p = document.querySelector(s); const r = p.querySelector('.sc-scrub'); if (r) { r.value = Math.round(+r.max * 0.55); r.dispatchEvent(new Event('input', { bubbles: true })); } }, sel);
        await page.waitForTimeout(500);
        await shotElement(page, sel, G('03-motion-scene.png'), { withHeading: false });
        console.log(`guide: scene from ${c}/${f}`);
        sceneDone = true;
      }
      await ctx.close();
    }
  }
  if (!sceneDone) console.warn('  ! no motion scene in the examples: 03-motion-scene.png left as it was');

  ({ page, ctx } = await open(l1, { width: 900 }));
  const lab = await firstExisting(page, ['[data-lc="pmf-sampler"]', '.lc-explorable', '[data-lc]:not([data-lc="scene"])']);
  const btn = page.locator(`${lab} button`).first();
  if (await btn.count()) { await btn.click(); await page.waitForTimeout(800); }
  await shotElement(page, lab, G('04-interactive-lab.png'));
  const q = await answerFirstChoice(page);
  await page.waitForTimeout(400);
  if (q) await shotElement(page, q, G('05-quiz.png'), { withHeading: false, pad: 8 });
  await shotElement(page, '#challenge', G('06-challenge.png'), { withHeading: false });
  await ctx.close();

  const ref = readdirSync(join(EX, 'probability', 'reference')).filter((f) => f.endsWith('.html')).sort()[0];
  ({ page, ctx } = await open(`probability/reference/${ref}`, { width: 900, height: 1100 }));
  await page.screenshot({ path: G('07-reference.png') });
  await ctx.close();

  ({ page, ctx } = await open(`transformers/lessons/${lessons('transformers')[0]}`, { width: 390, height: 844 }));
  await page.screenshot({ path: G('08-phone.png') });
  await ctx.close();
  console.log('guide: media/guide/01..08');
}

async function social() {
  // A real fragment: a lesson figure from the transformers example, rendered in dark mode.
  const lesson = lessons('transformers').find((f) => f.startsWith('0002')) || lessons('transformers')[0];
  const { page, ctx } = await open(`transformers/lessons/${lesson}`, { width: 820, height: 900, dark: true });
  const fig = await firstExisting(page, ['[data-lc="attention-explorer"]', '.lc-explorable', '[data-lc]:not([data-lc="scene"])', 'figure']);
  await page.locator(fig).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  // The attention explorer's left half (keys, scores, weights) reads best at this size; other figures are used whole.
  const b = await page.locator(fig).first().boundingBox();
  const size = { x: b.x, y: b.y, width: fig.includes('attention') ? Math.round(b.width * 0.6) : b.width, height: fig.includes('attention') ? Math.min(b.height, 330) : b.height };
  const png = await page.screenshot({ clip: size });
  await ctx.close();
  const files = ['MISSION.md', 'RESOURCES.md', 'index.html', 'review.html', ...lessons('transformers').map((f) => `lessons/${f}`)];
  writeFileSync(join(MEDIA, 'social-preview.svg'), socialSvg(png.toString('base64'), size, files));
  const p2 = await (await browser.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 })).newPage();
  await p2.goto(pathToFileURL(join(MEDIA, 'social-preview.svg')).href);
  await p2.waitForTimeout(300);
  await p2.screenshot({ path: join(MEDIA, 'social-preview.png') });
  const p3 = await (await browser.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 2 })).newPage();
  await p3.goto(pathToFileURL(join(MEDIA, 'social-preview.svg')).href);
  await p3.waitForTimeout(300);
  await p3.screenshot({ path: join(MEDIA, 'social-preview@2x.png') });
  console.log(`social: media/social-preview.{svg,png} (+@2x) (figure: ${fig} in ${lesson})`);
}

function socialSvg(b64, size, files) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const serif = `'Iowan Old Style','Palatino Linotype',Palatino,'Bitstream Charter',Charter,Georgia,serif`;
  const mono = `ui-monospace,'SF Mono',Menlo,'JetBrains Mono',Consolas,monospace`;
  const sans = `system-ui,-apple-system,'Segoe UI',Roboto,Inter,sans-serif`;
  // right panel: x 704..1280; the figure is scaled to fit 520 wide
  const fw = 480, fh = Math.round(size.height * fw / size.width);
  const figH = Math.min(fh, 300);
  const listY = 120 + figH + 40;
  const lines = files.slice(0, 6).map((f, i) => `<text x="752" y="${listY + 22 + i * 24}" font-family="${mono}" font-size="16" fill="#e8eaed">${esc(f)}</text>`).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1280" height="640" viewBox="0 0 1280 640">
  <title>Learncraft — Turn your AI coding agent into a personal learning environment</title>
  <!-- Generated by media/capture.mjs. Right panel: a real figure from examples/transformers (dark mode) and that course's real file list. -->
  <rect width="1280" height="640" fill="#fbfaf7"/>
  <!-- motif: a ruled page with one rust mark in the margin -->
  <g transform="translate(96 104)" fill="none" stroke="#1d1c1a" stroke-width="2">
    <rect x="0" y="0" width="44" height="56" rx="4"/>
    <line x1="10" y1="16" x2="34" y2="16" stroke-width="1.5"/>
    <line x1="10" y1="26" x2="34" y2="26" stroke-width="1.5"/>
    <line x1="10" y1="36" x2="28" y2="36" stroke-width="1.5"/>
    <circle cx="-12" cy="16" r="4" fill="#9a3b1b" stroke="none"/>
  </g>
  <text x="92" y="250" font-family="${serif}" font-size="92" font-weight="600" fill="#1d1c1a">Learncraft</text>
  <text x="96" y="312" font-family="${serif}" font-size="30" fill="#6b6760">Turn your AI coding agent into a</text>
  <text x="96" y="352" font-family="${serif}" font-size="30" fill="#6b6760">personal learning environment.</text>
  <line x1="96" y1="404" x2="608" y2="404" stroke="#e4e0d8" stroke-width="1"/>
  <text x="96" y="444" font-family="${sans}" font-size="15" font-weight="600" letter-spacing="1.5" fill="#6b6760">A COURSE IN YOUR FOLDER · PRACTICE · SPACED REVIEW</text>
  <text x="96" y="470" font-family="${sans}" font-size="15" font-weight="600" letter-spacing="1.5" fill="#6b6760">MILESTONES ONLY ON REVIEWED EVIDENCE</text>
  <text x="96" y="536" font-family="${mono}" font-size="19" fill="#9a3b1b">/plugin install learn@jpmmatias</text>
  <text x="96" y="566" font-family="${mono}" font-size="15" fill="#6b6760">github.com/jpmmatias/skills · MIT</text>
  <rect x="704" y="0" width="576" height="640" fill="#0e1116"/>
  <text x="752" y="96" font-family="${sans}" font-size="13" font-weight="600" letter-spacing="1.5" fill="#8b93a1">FROM THE EXAMPLE COURSE · HOW TRANSFORMERS WORK</text>
  <rect x="744" y="108" width="${fw + 16}" height="${figH + 16}" rx="8" fill="none" stroke="#2a313d"/>
  <svg x="752" y="116" width="${fw}" height="${figH}" viewBox="0 0 ${size.width} ${Math.round(figH * size.width / fw)}" preserveAspectRatio="xMidYMin slice">
    <image width="${size.width}" height="${size.height}" href="data:image/png;base64,${b64}"/>
  </svg>
  <text x="752" y="${listY}" font-family="${mono}" font-size="14" fill="#8b93a1">examples/transformers/</text>
  ${lines}
</svg>
`;
}

for (const g of groups) {
  if (g === 'readme') await readme();
  else if (g === 'guide') await guide();
  else if (g === 'social') await social();
  else console.error(`unknown group "${g}" (readme | guide | social)`);
}
await browser.close();
