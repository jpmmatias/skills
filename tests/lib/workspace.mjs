// Test helpers: build a throwaway course workspace from the real starter (assets + templates), and
// load Playwright the same way check.mjs does. Not a test file (node --test only runs *.test.mjs).
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPlaywright } from '../../skills/learn/starter/tools/resolve.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// LC_STARTER points the tests at another starter copy (used to mutation-test the tests themselves).
export const STARTER = process.env.LC_STARTER || join(ROOT, 'skills', 'learn', 'starter');
export const TEMPLATES = join(STARTER, 'templates');

/** Returns null when everything the browser tests need exists, else a skip reason naming what is missing. */
export function missingStarter() {
  const need = ['assets/core.js', 'assets/store.js', 'assets/course.js', 'assets/progress.js', 'assets/practice.js', 'templates/index.html', 'templates/lesson.html', 'templates/review.html'];
  const miss = need.filter((f) => !existsSync(join(STARTER, f)));
  return miss.length ? `starter files missing: ${miss.join(', ')}` : null;
}

let pw;
/** { chromium } or { skip: reason } */
export async function browserOrSkip() {
  const miss = missingStarter();
  if (miss) return { skip: miss };
  pw ??= loadPlaywright();
  if (!pw.playwright) return { skip: `Playwright not found (${pw.reason.split('\n')[0]})` };
  try {
    const browser = await pw.playwright.chromium.launch();
    return { browser };
  } catch (e) {
    return { skip: `Chromium did not launch: ${e.message.split('\n')[0]}` };
  }
}

export const BASE_COURSE = () => ({
  schemaVersion: 2, id: 'smoke-course', topic: 'Smoke topic', lang: 'en', example: false,
  mission: 'Check that the runtime renders',
  milestones: [{ id: 'm1', label: 'First', canDo: 'Pick the right option', status: 'in-progress', evidence: null }],
  lessons: [{ n: 1, file: 'lessons/0001-first.html', title: 'First lesson', milestones: ['m1'], canDo: 'pick the right option',
    objectives: [{ id: 'l1.o1', text: 'Pick the right option' }], practice: 'lessons/0001.practice.js' }],
  strings: {},
});

export const BASE_ITEMS = () => [
  { id: 'l1-choice', type: 'choice', objective: 'l1.o1', prompt: 'Which option is right?',
    options: [{ text: 'Option one', correct: true, why: 'Because it is.' }, { text: 'Option two', why: 'It is not.' }, { text: 'Option six', why: 'Nope.' }] },
  { id: 'l1-recall', type: 'recall', objective: 'l1.o1', prompt: 'Type alpha.', accept: ['alpha'], why: 'It was alpha.' },
];

/**
 * Builds a workspace. Options:
 *   course, items (lesson 1), csp (keep the template CSP; default true), sceneJs (contents of lessons/scenes-0001.js),
 *   lessonExtra (HTML inserted before the practice section).
 */
export function buildWorkspace({ course = BASE_COURSE(), items = BASE_ITEMS(), csp = true, sceneJs = null, lessonExtra = '' } = {}) {
  const ws = mkdtempSync(join(tmpdir(), 'lc-ws-'));
  cpSync(join(STARTER, 'assets'), join(ws, 'assets'), { recursive: true });
  writeFileSync(join(ws, 'assets', 'course.js'), `window.COURSE = ${JSON.stringify(course, null, 2)};\n`);
  const strip = (h) => (csp ? h : h.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, ''));
  for (const f of ['index.html', 'review.html']) writeFileSync(join(ws, f), strip(readFileSync(join(TEMPLATES, f), 'utf8')));
  mkdirSync(join(ws, 'lessons'), { recursive: true });
  const tpl = readFileSync(join(TEMPLATES, 'lesson.html'), 'utf8');
  for (const l of course.lessons) {
    if (!/^lessons\/[^/]+\.html$/.test(l.file)) continue;
    const nn = String(l.n).padStart(4, '0');
    let h = strip(tpl).replace(/data-lesson="\d+"/, `data-lesson="${l.n}"`).replace(/0001\.practice\.js/g, `${nn}.practice.js`);
    if (lessonExtra) h = h.replace('<section class="practice"', `${lessonExtra}\n<section class="practice"`);
    if (sceneJs) {
      // add only the scripts the template does not already load (outside comments)
      const live = h.replace(/<!--[\s\S]*?-->/g, '');
      const add = ['../assets/viz.js', '../assets/scene.js', 'scenes-0001.js'].filter((src) => !live.includes(`src="${src}"`));
      h = h.replace('</body>', add.map((src) => `<script src="${src}"></script>\n`).join('') + '</body>');
      writeFileSync(join(ws, 'lessons', 'scenes-0001.js'), sceneJs);
    }
    writeFileSync(join(ws, l.file), h);
    writeFileSync(join(ws, 'lessons', `${nn}.practice.js`), `Learncraft.practice(${l.n}, ${JSON.stringify(l.n === 1 ? items : [])});\n`);
  }
  if (existsSync(join(TEMPLATES, 'reference.html'))) {
    mkdirSync(join(ws, 'reference'), { recursive: true });
    writeFileSync(join(ws, 'reference', 'cheat-sheet.html'), strip(readFileSync(join(TEMPLATES, 'reference.html'), 'utf8')));
  }
  return { ws, url: (rel) => pathToFileURL(join(ws, rel)).href, cleanup: () => rmSync(ws, { recursive: true, force: true }) };
}

/** Opens a page and records errors. Returns { page, errors, ctx }. */
export async function open(browser, url, { colorScheme = 'light', reducedMotion = 'no-preference', width = 900, init } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, reducedMotion });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
  if (init) await page.addInitScript(init);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  return { page, errors, ctx };
}
