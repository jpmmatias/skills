#!/usr/bin/env node
// Headless check for a teaching workspace: run it before telling the learner a lesson is ready.
//
//   npm install --prefix ~/.claude/skills/learn/starter/tools      # once (installs playwright)
//   node ~/.claude/skills/learn/starter/tools/check.mjs [workspace] [--only=0001]
//
// For index.html, every lessons/*.html and every reference/*.html it:
//   · loads the page at desktop (900px) and phone (390px) width
//   · reports JS errors, console errors and missing local files (broken asset links)
//   · flags horizontal scroll at phone width (layout must fit a 16px gutter)
//   · checks that lesson headers rendered (course.js lists the lesson) and counts practice items
//   · screenshots every figure, widget, challenge and motion scene into <workspace>/.check/,
//     scenes at 5 timeline positions, so you can LOOK at them with your image reader
// Exits 1 if any page has errors, so it can gate a commit.
//
// Browser: uses Playwright's bundled Chromium. If its version doesn't match what's installed,
// it falls back to any chrome-headless-shell / chromium found under ~/.cache/ms-playwright,
// or to CHROMIUM_PATH.
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const ws = resolve(args.find((a) => !a.startsWith('--')) ?? '.');
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const out = join(ws, '.check');
mkdirSync(out, { recursive: true });

const list = (dir) => (existsSync(join(ws, dir)) ? readdirSync(join(ws, dir)).filter((f) => f.endsWith('.html')).sort().map((f) => join(dir, f)) : []);
const pages = ['index.html', ...list('lessons'), ...list('reference')].filter((p) => existsSync(join(ws, p)) && (!only || p.includes(only)));

async function launch() {
  try { return await chromium.launch(); } catch (e) {
    const cands = [process.env.CHROMIUM_PATH];
    const root = join(homedir(), '.cache', 'ms-playwright');
    if (existsSync(root)) for (const d of readdirSync(root).sort().reverse()) {
      cands.push(join(root, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell'), join(root, d, 'chrome-linux', 'chrome'),
        join(root, d, 'chrome-linux64', 'chrome'), join(root, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
    }
    for (const c of cands.filter(Boolean)) if (existsSync(c)) { console.log(`(using ${c})`); return chromium.launch({ executablePath: c }); }
    throw new Error('No Chromium found. Run `npx playwright install chromium` or set CHROMIUM_PATH.\n' + e.message);
  }
}

const browser = await launch();
let failed = 0;
for (const rel of pages) {
  const problems = [], notes = [];
  for (const width of [900, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', (e) => problems.push(`[${width}px] JS error: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && problems.push(`[${width}px] console: ${m.text()}`));
    page.on('requestfailed', (r) => r.url().startsWith('file:') && problems.push(`[${width}px] missing file: ${r.url().replace(pathToFileURL(ws).href, '')}`));
    await page.goto(pathToFileURL(join(ws, rel)).href, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > width + 1) problems.push(`[${width}px] horizontal scroll: page is ${sw}px wide`);

    if (width === 900) {
      const info = await page.evaluate(() => ({
        lesson: document.body.dataset.lesson || null,
        header: !!document.querySelector('#progress.pg-header'),
        practice: document.querySelectorAll('.quiz-q, .band-quiz, .fade, .threshold-explorer[data-target], [data-practice]').length,
        scenes: document.querySelectorAll('.sc-player').length,
        missingScenes: [...document.querySelectorAll('.scene')].filter((s) => /Missing scene/.test(s.textContent)).length,
        challenge: !!document.querySelector('#challenge'),
      }));
      if (info.lesson) {
        if (!info.header) problems.push('progress header did not render: is the lesson listed in assets/course.js?');
        if (!info.challenge) problems.push('no #challenge box');
        if (!info.practice) problems.push('no retrieval practice found');
        notes.push(`${info.practice} practice item(s), ${info.scenes} scene(s)`);
      }
      if (info.missingScenes) problems.push(`${info.missingScenes} scene(s) not registered (check scenes-NNNN.js is loaded)`);

      const stem = basename(rel, '.html');
      const shots = await page.$$('figure, .box, .stepper, .quiz-q, .fade');
      for (let i = 0; i < shots.length; i++) await shots[i].screenshot({ path: join(out, `${stem}-el${String(i).padStart(2, '0')}.png`) }).catch(() => {});
      const scenes = await page.$$('.sc-player');
      for (let s = 0; s < scenes.length; s++) {
        const max = +(await scenes[s].$eval('.sc-scrub', (x) => x.max));
        for (const f of [0.15, 0.35, 0.55, 0.75, 1]) {
          await scenes[s].$eval('.sc-scrub', (x, v) => { x.value = v; x.dispatchEvent(new Event('input')); }, Math.round(max * f));
          await page.waitForTimeout(120);
          await scenes[s].screenshot({ path: join(out, `${stem}-scene${s}-${Math.round(f * 100)}.png`) });
        }
      }
    }
    await page.close();
  }
  if (problems.length) failed++;
  console.log(`${problems.length ? '✗' : '✓'} ${rel}${notes.length ? '  (' + notes.join('; ') + ')' : ''}`);
  for (const p of problems) console.log('    ' + p);
}
await browser.close();
console.log(`\nScreenshots in ${out}/ (look at them). ${failed ? failed + ' page(s) with problems.' : 'All pages clean.'}`);
process.exit(failed ? 1 : 0);
