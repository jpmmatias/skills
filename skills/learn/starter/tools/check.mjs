#!/usr/bin/env node
// Headless check for a teaching workspace: run it before telling the learner a lesson is ready.
//
//   node "<skill folder>/starter/tools/check.mjs" [workspace] [--only=0001] [--no-axe] [--allow-workspace-playwright]
//
// <skill folder> is the folder that holds the learn skill's SKILL.md (Claude Code: ${CLAUDE_SKILL_DIR}).
// The script runs from there and only reads it; everything it writes goes to <workspace>/.check/.
//
// Tools (once per machine, into a folder that survives skill updates; see resolve.mjs):
//   npm install --prefix ~/.cache/learncraft/tools playwright@1.63.0 axe-core@4.10.2
//   npx --prefix ~/.cache/learncraft/tools playwright install chromium
// Playwright is also found next to this script (or above it), in the global npm root or on NODE_PATH.
// The workspace's own node_modules (and its parents) are searched only with --allow-workspace-playwright:
// a course inside a repository must not decide which code the check runs. The resolved path is printed
// before it is loaded. axe-core is optional: without it the accessibility scan is skipped (and said so).
//
// SECURITY: this RUNS the workspace's JavaScript. Step 1 executes assets/course.js and lessons/*.practice.js
// in Node (in a separate, killable process with no environment; see load-data.mjs), and step 2 opens every
// page in Chromium. The isolation reduces the risk of a hostile file; it does not remove it. Run it only on
// your own workspace, never on one you do not trust.
//
// What it does:
//   1. Lints the workspace data (lint-workspace.mjs): course.js, practice files, citations,
//      RESOURCES.md statuses, learning-record evidence, script sources and inline handlers.
//   2. For index.html, review.html, every lessons/*.html and every reference/*.html, in Chromium:
//      · light mode at 900px and 390px, dark mode at 900px, reduced motion at 390px
//      · JS errors, console errors, missing local files, failed remote requests (fonts, CDNs) and
//        any third-party request at all (courses must work offline)
//      · horizontal scroll at 390px, duplicate ids, form fields with no accessible name,
//        components that failed to mount (.lc-error), practice that did not render
//      · lesson pages: header rendered, a #challenge, retrieval practice present
//      · axe-core WCAG 2.2 AA scan (light, 900px) when axe-core can be found
//      · scrolls through the page and waits for animations to settle before screenshots, so figures
//        are captured in their final state; motion scenes at 5 timeline positions
//      · screenshots go to <workspace>/.check/ so you can LOOK at them with your image reader
// Exits 1 if the lint or any page has errors, so it can gate a commit. Warnings (!) never fail.
//
// Browser: Playwright's bundled Chromium; if its version does not match what is installed, any
// chrome-headless-shell / chromium under the Playwright browser cache, or CHROMIUM_PATH.
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPlaywright, resolveTool, workspacePlaywright } from './resolve.mjs';
import { inspectWorkspace, formatFindings, checkWorkspaceFile, findCoursePages, classifyFileLink, walkProtocolDom, domSecurityAudit as securityAudit } from './lint-workspace.mjs';

const args = process.argv.slice(2);
const ws = resolve(args.find((a) => !a.startsWith('--')) ?? '.');
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const useAxe = !args.includes('--no-axe');
const allowWorkspace = args.includes('--allow-workspace-playwright');
if (!existsSync(ws)) { console.error(`No such workspace: ${ws}`); process.exit(1); }

// 1. Data lint ----------------------------------------------------------------------------------
const lint = await inspectWorkspace(ws);
const lintErrors = lint.findings.filter((f) => f.level === 'error').length;
console.log(`Lint: ${lintErrors} error(s), ${lint.findings.length - lintErrors} warning(s)`);
console.log(formatFindings(lint.findings));
console.log('');

// 2. Browser ------------------------------------------------------------------------------------
const planted = !allowWorkspace && workspacePlaywright(ws);
if (planted) console.log(`! the workspace (or a folder above it) has its own playwright at ${planted}: NOT used (pass --allow-workspace-playwright to trust it)`);
const { playwright, reason, from } = loadPlaywright(ws, { allowWorkspace, onResolve: (p, where) => console.log(`(loading playwright from ${where}: ${p})`) });
if (!playwright) {
  console.log(reason);
  console.log('\nThe browser check did NOT run. Do not report the lesson as verified.');
  process.exit(1);
}
const { chromium } = playwright;
const axePath = useAxe ? resolveTool('axe-core/axe.min.js', ws, { allowWorkspace })?.path : null;
const axeSource = axePath ? readFileSync(axePath, 'utf8') : null;
console.log(`(playwright from ${from}; axe-core ${axeSource ? 'from ' + axePath : useAxe ? 'not found: accessibility scan skipped' : 'disabled'})`);

const out = join(ws, '.check');
mkdirSync(out, { recursive: true });
// Only regular files inside the workspace are opened (the lint already reported anything else: NEW-02).
// Every page the learner can open (NEW-14), not only index/review/lessons/reference.
const allPages = findCoursePages(ws); // the set links may lead to (NEW-15), even when --only narrows what is opened
const pages = allPages.filter((p) => (!only || p.includes(only)) && checkWorkspaceFile(join(ws, p), { root: ws }).ok);
const practiceCount = new Map([...lint.practice].map(([n, items]) => [n, items.length]));

async function launch() {
  try { return await chromium.launch(); } catch (e) {
    const cands = [process.env.CHROMIUM_PATH];
    for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), '.cache', 'ms-playwright'), join(homedir(), 'Library', 'Caches', 'ms-playwright'), process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'ms-playwright')].filter(Boolean)) {
      if (!existsSync(root)) continue;
      for (const d of readdirSync(root).sort().reverse()) {
        cands.push(join(root, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell'), join(root, d, 'chrome-linux', 'chrome'),
          join(root, d, 'chrome-linux64', 'chrome'), join(root, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
          join(root, d, 'chrome-win', 'chrome.exe'), join(root, d, 'chrome-win64', 'chrome.exe'));
      }
    }
    for (const c of cands.filter(Boolean)) if (existsSync(c)) { console.log(`(using ${c})`); return chromium.launch({ executablePath: c }); }
    throw new Error('No Chromium found. Run `npx playwright install chromium` (with the --prefix you installed into) or set CHROMIUM_PATH.\n' + e.message);
  }
}

/** Scrolls through the page so observers fire, then waits for animations to finish (max `ms`). */
async function settle(page, ms = 3000) {
  await page.evaluate(async () => {
    const step = Math.max(200, innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    scrollTo(0, 0);
  });
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming?.().iterations !== Infinity).length);
    if (!running) return true;
    await page.waitForTimeout(100);
  }
  return false;
}

/** DOM checks that need the rendered page. */
const domAudit = () => {
  const ids = new Map();
  for (const el of document.querySelectorAll('[id]')) ids.set(el.id, (ids.get(el.id) || 0) + 1);
  const dupIds = [...ids].filter(([, n]) => n > 1).map(([id, n]) => `${id}×${n}`);
  const name = (el) => (el.getAttribute('aria-label') || '').trim() || (el.getAttribute('aria-labelledby') || '').split(/\s+/).map((i) => document.getElementById(i)?.textContent.trim()).join('') || [...(el.labels || [])].map((l) => l.textContent.trim()).join('') || (el.getAttribute('title') || '').trim() || (el.getAttribute('placeholder') || '').trim();
  const unlabeled = [...document.querySelectorAll('input, select, textarea')]
    .filter((el) => !['hidden', 'button', 'submit', 'reset', 'image'].includes(el.type) && el.offsetParent !== null && !name(el))
    .map((el) => el.outerHTML.slice(0, 80));
  const errors = [...document.querySelectorAll('.lc-error')].map((e) => e.textContent.trim().slice(0, 120));
  const progress = document.getElementById('progress');
  return {
    lesson: document.body.dataset.lesson || null,
    header: !!progress && (progress.children.length > 0 || progress.textContent.trim().length > 0),
    practice: document.querySelectorAll('.lc-item, [data-item-id], .quiz-q, .band-quiz, [data-lc="band-quiz"], .fade, .threshold-explorer[data-target], [data-lc="threshold-explorer"][data-target], .lc-explorable[data-practice], [data-practice]').length,
    practiceSet: !!document.querySelector('[data-practice-set]'),
    scenes: document.querySelectorAll('.sc-player').length,
    missingScenes: [...document.querySelectorAll('.scene')].filter((s) => /Missing scene/.test(s.textContent)).length,
    challenge: !!document.querySelector('#challenge'),
    dupIds, unlabeled, errors,
    scrollWidth: document.documentElement.scrollWidth,
  };
};

const PASSES = [
  { key: 'light-900', width: 900, colorScheme: 'light', shots: true, axe: true },
  { key: 'light-390', width: 390, colorScheme: 'light' },
  { key: 'dark-900', width: 900, colorScheme: 'dark', fullShot: true },
  { key: 'reduced-390', width: 390, colorScheme: 'light', reducedMotion: 'reduce' },
];

const browser = await launch();
const wsUrl = pathToFileURL(ws).href;
const wsPrefixOf = (u) => (u.endsWith('/') ? u : u + '/');
let failed = lintErrors ? 1 : 0, pagesFailed = 0;
for (const rel of pages) {
  const problems = [], warnings = [], notes = [];
  const stem = basename(rel, '.html');
  for (const pass of PASSES) {
    const tag = `[${pass.key}]`;
    const ctx = await browser.newContext({ viewport: { width: pass.width, height: 900 }, colorScheme: pass.colorScheme, reducedMotion: pass.reducedMotion || 'no-preference' });
    const page = await ctx.newPage();
    // Evidence the page cannot reach or forge (NEW-12): the DevTools protocol reports every script the browser
    // compiles. Under the template CSP no inline code may compile in the page's own world, so an inline <script>
    // or handler shows up here (with the page's URL) however the page hides itself or rewrites its globals.
    const pageUrl = pathToFileURL(join(ws, rel)).href;
    const cdp = await ctx.newCDPSession(page);
    const compiled = [];
    cdp.on('Debugger.scriptParsed', (e) => { if (e.executionContextAuxData?.isDefault) compiled.push({ id: e.scriptId, url: e.url, len: e.length, line: e.startLine }); });
    await cdp.send('Debugger.enable');
    let quiet = false; // axe's own requests are not the page's problems
    page.on('pageerror', (e) => problems.push(`${tag} JS error: ${e.message}`));
    // Every CSP violation is an error: under the template policy a clean page has none (NEW-01).
    await page.addInitScript(() => { window.__lcCsp = []; document.addEventListener('securitypolicyviolation', (e) => window.__lcCsp.push(`${e.effectiveDirective} blocked ${e.blockedURI || 'inline'}${e.sample ? ' (' + e.sample.slice(0, 40) + ')' : ''}`)); });
    // Record script-bearing elements as the parser and scripts insert them, so markup that removes itself after
    // running is still seen (NEW-08). The runtime never uses inline handlers or inline scripts.
    await page.addInitScript(() => {
      window.__lcMut = [];
      const flag = (el) => {
        if (!el || el.nodeType !== 1) return;
        for (const a of el.attributes || []) if (/^on/i.test(a.name)) window.__lcMut.push(`<${el.localName} ${a.name}> inserted`);
        if (el.localName === 'script' && !el.getAttribute('src')) window.__lcMut.push('inline <script> inserted');
      };
      new MutationObserver((recs) => {
        for (const r of recs) {
          if (r.type === 'attributes') { if (/^on/i.test(r.attributeName || '')) window.__lcMut.push(`${r.attributeName} attribute set on <${r.target.localName}>`); continue; }
          for (const n of r.addedNodes) { flag(n); if (n.querySelectorAll) n.querySelectorAll('*').forEach(flag); }
        }
      }).observe(document, { childList: true, subtree: true, attributes: true });
    });
    page.on('console', (m) => !quiet && m.type() === 'error' && problems.push(`${tag} console: ${m.text()}`));
    page.on('requestfailed', (r) => {
      const u = r.url();
      if (quiet) return;
      if (u.startsWith('file:')) problems.push(`${tag} missing file: ${u.replace(wsUrl, '')}`);
      else if (!u.startsWith('data:') && !u.startsWith('blob:')) problems.push(`${tag} request failed: ${u} (${r.failure()?.errorText ?? 'failed'}); courses must work offline`);
    });
    page.on('request', (r) => {
      const u = r.url();
      if (/^https?:/.test(u) && pass.key === 'light-900') warnings.push(`third-party request: ${new URL(u).host} (${u.slice(0, 80)}); the learner's IP reaches that host on every open`);
    });
    await page.goto(pathToFileURL(join(ws, rel)).href, { waitUntil: 'load' });
    await page.waitForTimeout(150);
    const settled = await settle(page, pass.reducedMotion ? 1500 : 3000);
    if (!settled) warnings.push(`${tag} animations still running after the settle timeout; screenshots may show mid-tween frames`);
    const info = await page.evaluate(domAudit);
    for (const v of await page.evaluate(() => window.__lcCsp || []).catch(() => [])) problems.push(`${tag} CSP violation: ${v}`);
    for (const v of await page.evaluate(() => window.__lcMut || []).catch(() => [])) problems.push(`${tag} security: ${v}`);
    // Prove the CSP is enforced, rather than trusting how the <meta> looks (NEW-08, NEW-12). The probe runs in an
    // isolated world, where page code cannot patch the DOM methods it uses, and its outcome is read from the
    // protocol, not from page globals: an inline script it inserts compiles only if the CSP allows inline code.
    if (pass.key === 'light-900') {
      quiet = true; // the browser logs the blocked probe as a console error: that is the expected outcome
      const token = `__lcProbe_${Math.random().toString(36).slice(2)}`;
      const before = compiled.length;
      let probeError = null;
      try {
        const { frameTree } = await cdp.send('Page.getFrameTree');
        const { executionContextId } = await cdp.send('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'learncraft-check' });
        await cdp.send('Runtime.evaluate', { contextId: executionContextId, expression:
          `(() => { const s = document.createElement('script'); s.textContent = 'void "${token}"'; document.head.append(s); s.remove();
                    const d = document.createElement('div'); d.setAttribute('onclick', 'void "${token}"'); document.body.append(d); d.click(); d.remove(); })()` });
      } catch (e) { probeError = e.message.split('\n')[0]; }
      await page.waitForTimeout(50);
      quiet = false;
      let probeRan = false;
      for (const c of compiled.slice(before)) {
        if (c.url === pageUrl) { probeRan = true; break; } // the probe's handler compiles with the page's URL
        if (c.url === '') {
          const src = await cdp.send('Debugger.getScriptSource', { scriptId: c.id }).then((r) => r.scriptSource).catch(() => '');
          if (src.includes(token)) { probeRan = true; break; }
        }
      }
      if (probeError) problems.push(`security: CSP enforcement probe failed to run (${probeError})`);
      else if (probeRan) problems.push('security: the Content-Security-Policy is NOT enforced on this page (inline code inserted by the check ran); use the exact <meta> from the page template, directly in <head>');
      compiled.splice(before); // the probe's own scripts are not the page's
    }
    // Any inline code the page itself compiled (an inline <script> anywhere, even one that ran before the CSP <meta>,
    // removed itself or forged the page's globals; or an inline handler that fired) is an error.
    const inline = compiled.filter((c) => c.url === pageUrl);
    if (inline.length) problems.push(`${tag} security: ${inline.length} inline script(s) or handler(s) compiled in the page (first at line ${inline[0].line + 1}); courses may only run script files`);
    // Every script the page compiled from a URL must be a plain .js file inside the workspace (NEW-13): no query or
    // fragment, nothing outside the course, no page loading itself (or any other non-.js file) as a script.
    const wsPrefix = wsUrl.endsWith('/') ? wsUrl : wsUrl + '/';
    for (const c of compiled) {
      if (!c.url || c.url === pageUrl) continue;
      let u; try { u = new URL(c.url); } catch { u = null; }
      let fine = u && u.protocol === 'file:' && c.url.startsWith(wsPrefix) && !u.search && !u.hash && /\.js$/i.test(u.pathname);
      // A .js name that is a link to another file (say, a lesson page) is refused too (NEW-16).
      if (fine) { try { fine = !lstatSync(fileURLToPath(u)).isSymbolicLink(); } catch { fine = false; } }
      if (!fine) problems.push(`${tag} security: script compiled from ${c.url.replace(wsPrefix, '')}; only .js files in the course folder (not links) may run`);
    }
    // Every file: URL on the page, as the browser resolved it, must lead to a checked page or a non-page asset
    // inside the course; never to a folder or an unchecked document (NEW-15).
    if (pass.key === 'light-900') {
      const seen = new Set();
      // Read through the protocol, piercing shadow roots (even closed ones) and template contents (NEW-18).
      const dom = await cdp.send('DOM.getDocument', { depth: -1, pierce: true }).then((r) => walkProtocolDom(r.root, pageUrl)).catch((e) => ({ error: e.message.split('\n')[0] }));
      if (dom.error) problems.push(`security: could not read the page's DOM through the protocol (${dom.error})`);
      else if (dom.shadowRoots) problems.push(`security: ${dom.shadowRoots} shadow root(s) in the page; course pages do not use shadow DOM, which hides markup from the checks`);
      for (const l of dom.links || []) {
        const why = classifyFileLink(ws, allPages, l.url, { tag: l.tag, attr: l.attr });
        const key = `${l.url}|${why}`;
        if (why && !seen.has(key)) { seen.add(key); problems.push(`security: <${l.tag} ${l.attr}> leads to ${why}: ${l.url.replace(wsPrefixOf(wsUrl), '')}`); }
      }
    }
    if (pass.key === 'light-900') for (const f of await page.evaluate(securityAudit, wsUrl + '/').catch((e) => [`security audit failed: ${e.message.split('\n')[0]}`])) problems.push(`security: ${f}`);
    if (info.scrollWidth > pass.width + 1) problems.push(`${tag} horizontal scroll: page is ${info.scrollWidth}px wide`);
    for (const e of info.errors) problems.push(`${tag} component failed to mount: ${e}`);
    if (pass.key === 'light-900') {
      if (info.dupIds.length) problems.push(`duplicate ids: ${info.dupIds.join(', ')}`);
      for (const u of info.unlabeled) problems.push(`form field with no accessible name: ${u}`);
      if (info.lesson) {
        if (!info.header) problems.push('progress header did not render: is the lesson listed in assets/course.js?');
        if (!info.challenge) problems.push('no #challenge box');
        if (!info.practice) problems.push('no retrieval practice found');
        const expected = practiceCount.get(+info.lesson) || 0;
        if (expected && info.practiceSet && info.practice === 0) problems.push(`${expected} practice item(s) in the practice file but none rendered`);
        notes.push(`${info.practice} practice item(s), ${info.scenes} scene(s)`);
      }
      if (info.missingScenes) problems.push(`${info.missingScenes} scene(s) not registered (check scenes-NNNN.js is loaded)`);
    }
    if (pass.reducedMotion) {
      const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
      if (running) warnings.push(`${tag} ${running} animation(s) still running with reduced motion requested`);
    }
    if (pass.axe && axeSource) {
      quiet = true;
      try {
        await page.evaluate(axeSource);
        const res = await page.evaluate(() => window.axe.run(document, { preload: false, runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
        for (const v of res.violations) problems.push(`axe ${v.impact ?? ''} ${v.id}: ${v.help} (${v.nodes.length} node(s): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')})`);
        if (res.incomplete.length) notes.push(`axe: ${res.incomplete.reduce((s, r) => s + r.nodes.length, 0)} node(s) need manual review`);
      } catch (e) { warnings.push(`axe-core could not run: ${e.message.split('\n')[0]}`); }
      await page.waitForTimeout(50);
      quiet = false;
    }
    if (pass.shots) {
      const shots = await page.$$('figure, .box, .stepper, .lc-item, .quiz-q, .fade, [data-lc], #challenge');
      for (let i = 0; i < shots.length; i++) {
        await shots[i].scrollIntoViewIfNeeded().catch(() => {});
        await settle(page, 1500);
        await shots[i].screenshot({ path: join(out, `${stem}-el${String(i).padStart(2, '0')}.png`) }).catch(() => {});
      }
      const scenes = await page.$$('.sc-player');
      for (let s = 0; s < scenes.length; s++) {
        const scrub = await scenes[s].$('.sc-scrub');
        if (!scrub) continue;
        for (const f of [0.15, 0.35, 0.55, 0.75, 1]) {
          // the scrub snaps to 1% steps of the timeline: set an exact step multiple
          await scrub.evaluate((x, f) => { const st = +x.step || 1; x.value = Math.min(+x.max, Math.round((+x.max * f) / st) * st); x.dispatchEvent(new Event('input')); }, f);
          await page.waitForTimeout(120);
          await scenes[s].screenshot({ path: join(out, `${stem}-scene${s}-${Math.round(f * 100)}.png`) });
        }
      }
    }
    if (pass.fullShot) await page.screenshot({ path: join(out, `${stem}-dark.png`), fullPage: true }).catch(() => {});
    await ctx.close();
  }
  if (problems.length) pagesFailed++;
  console.log(`${problems.length ? '✗' : '✓'} ${rel}${notes.length ? '  (' + notes.join('; ') + ')' : ''}`);
  for (const p of [...new Set(problems)]) console.log('    ' + p);
  for (const w of [...new Set(warnings)]) console.log('    ! ' + w);
}
await browser.close();
failed += pagesFailed;
console.log(`\nScreenshots in ${out}/ (look at them). ${pagesFailed ? pagesFailed + ' page(s) with problems.' : 'All pages clean.'}${lintErrors ? ` Lint: ${lintErrors} error(s).` : ''}`);
process.exit(failed ? 1 : 0);
