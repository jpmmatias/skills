// Regression tests for NEW-08 and NEW-09 (docs/audit/reviews/security-reliability.md, "Re-verification 2"):
// a CSP the browser ignores must never pass lint or check.mjs, a self-removing payload must still be reported,
// and a directory symlink must not lead the loader outside the workspace.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, symlinkSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { buildWorkspace, missingStarter, browserOrSkip, ROOT } from './lib/workspace.mjs';

const TOOLS = process.env.LC_TOOLS || join(ROOT, 'skills', 'learn', 'starter', 'tools');
const { lintWorkspace } = await import(join(TOOLS, 'lint-workspace.mjs'));
const { checkWorkspaceFile } = await import(join(TOOLS, 'load-data.mjs'));
const LESSON = join('lessons', '0001-first.html');
const META = /<meta http-equiv="Content-Security-Policy"[^>]*>/i;

/** The browser ignores each of these, so each must be a lint error. */
const DISABLED = {
  'leading space in http-equiv': (m) => m.replace('http-equiv="', 'http-equiv=" '),
  'trailing non-breaking space in http-equiv': (m) => m.replace('http-equiv="Content-Security-Policy"', 'http-equiv="Content-Security-Policy "'),
  'wrapped in <noscript>': (m) => `<noscript>${m}</noscript>`,
  'wrapped in <template>': (m) => `<template>${m}</template>`,
  'wrapped in <svg>': (m) => `<svg>${m}</svg>`,
};

function variant(edit, extra = '') {
  const w = buildWorkspace({ lessonExtra: extra });
  const p = join(w.ws, LESSON);
  writeFileSync(p, readFileSync(p, 'utf8').replace(META, edit));
  return w;
}
const cspErrors = async (ws) => (await lintWorkspace(ws)).filter((f) => f.file === LESSON.replace(/\\/g, '/') && f.level === 'error' && /^csp-/.test(f.rule));

test('starter templates exist', { skip: missingStarter() || false }, () => {});

for (const [name, edit] of Object.entries(DISABLED)) {
  test(`lint rejects a CSP the browser ignores: ${name}`, { skip: missingStarter() || false }, async () => {
    const w = variant(edit);
    try { assert.ok((await cspErrors(w.ws)).length > 0, 'expected a csp-* lint error'); }
    finally { w.cleanup(); }
  });
}

test('lint accepts the canonical template CSP', { skip: missingStarter() || false }, async () => {
  const w = variant((m) => m);
  try { assert.deepEqual(await cspErrors(w.ws), []); }
  finally { w.cleanup(); }
});

test('the loader refuses a file reached through a directory symlink that leaves the workspace (NEW-09)', () => {
  const base = mkdtempSync(join(tmpdir(), 'lc-dirlink-'));
  try {
    const ws = join(base, 'ws'), outside = join(base, 'outside');
    mkdirSync(ws); mkdirSync(outside);
    writeFileSync(join(outside, '0001.practice.js'), 'Learncraft.practice(1, []);\n');
    symlinkSync(outside, join(ws, 'lessons'), 'dir');
    const r = checkWorkspaceFile(join(ws, 'lessons', '0001.practice.js'), { root: ws });
    assert.ok(r.error, 'expected the file to be refused');
    assert.match(r.error, /outside the workspace/);
  } finally { rmSync(base, { recursive: true, force: true }); }
});

// check.mjs end to end: the enforcement probe and the mutation recorder (needs Playwright + Chromium).
const probe = await browserOrSkip();
if (probe.browser) await probe.browser.close();
const noBrowser = probe.skip || false;
const SELF_REMOVING = `<p title="<!--"></p><img src="data:," onerror="document.title='PWNED';this.remove()"><p title="-->"></p>`;

function runCheck(ws) {
  const r = spawnSync(process.execPath, [join(TOOLS, 'check.mjs'), ws, '--only=0001', '--no-axe'], { encoding: 'utf8', timeout: 180000 });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

test('check.mjs fails a page whose CSP is not enforced, even with a self-removing payload', { skip: missingStarter() || noBrowser }, () => {
  const w = variant(DISABLED['wrapped in <noscript>'], SELF_REMOVING);
  try {
    const { code, out } = runCheck(w.ws);
    assert.equal(code, 1, out);
    assert.match(out, /NOT enforced/);
    assert.match(out, /<img onerror> inserted/);
  } finally { w.cleanup(); }
});

test('check.mjs reports a self-removing handler even under the canonical CSP', { skip: missingStarter() || noBrowser }, () => {
  const w = variant((m) => m, SELF_REMOVING);
  try {
    const { code, out } = runCheck(w.ws);
    assert.equal(code, 1, out);
    assert.match(out, /<img onerror> inserted/);
    assert.doesNotMatch(out, /NOT enforced/);
  } finally { w.cleanup(); }
});

// NEW-12: an inline script placed before the CSP meta, hidden from the tokenizer by a comment that opens and closes
// inside attribute values, runs before any policy applies, removes itself and forges the page globals the
// previous check read. The raw head-order lint and the protocol-level evidence must both catch it.
const PRE_CSP = (forge) => (m) => `<meta name="a" content="<!--"><script>${forge
  ? "var D=Object.defineProperty,n=function(){},z=function(){return []};D(window,'__lcMut',{get:z,set:n});D(window,'__lcCsp',{get:z,set:n});"
  : ''}document.currentScript.remove();document.title='PWNED';</script><meta name="b" content="-->">${m}`;

test('lint rejects anything but the charset and viewport metas before the CSP meta (NEW-12)', { skip: missingStarter() || false }, async () => {
  for (const edit of [PRE_CSP(false), (m) => `​${m}`, (m) => `<span></span>${m}`, (m) => `<img src="data:,">${m}`]) {
    const w = variant(edit);
    try { assert.ok((await cspErrors(w.ws)).some((f) => f.rule === 'csp-late'), `expected csp-late for ${edit('META').slice(0, 40)}`); }
    finally { w.cleanup(); }
  }
});

test('check.mjs catches a pre-CSP inline script that removes itself and forges the page globals (NEW-12)', { skip: missingStarter() || noBrowser }, () => {
  const w = variant(PRE_CSP(true));
  try {
    const { code, out } = runCheck(w.ws);
    assert.equal(code, 1, out);
    assert.match(out, /inline script\(s\) or handler\(s\) compiled in the page/);
  } finally { w.cleanup(); }
});

test('the enforcement probe covers inline handlers, not only inline scripts', { skip: missingStarter() || noBrowser }, () => {
  // script-src-attr 'unsafe-inline' lets handlers run while inline <script> stays blocked. The page has no handler of
  // its own, so only the probe's handler can reveal the gap: a probe that tests scripts alone would miss it.
  const w = variant((m) => m.replace("connect-src 'none'", "connect-src 'none'; script-src-attr 'unsafe-inline'"));
  try {
    const { code, out } = runCheck(w.ws);
    assert.equal(code, 1, out);
    assert.match(out, /NOT enforced/);
  } finally { w.cleanup(); }
});

// NEW-13: a lesson that is also valid JavaScript loads itself as a script ('self' on file:// allows any local file).
test('lint and check reject a page that loads itself (or any non-.js file) as a script (NEW-13)', { skip: missingStarter() || noBrowser }, async () => {
  for (const src of ['0001-first.html?v=2', '0001-first.html']) {
    const w = buildWorkspace();
    const p = join(w.ws, LESSON);
    let h = readFileSync(p, 'utf8');
    h = '<!--\nvoid document.title;/*\n-->\n' + h.trimEnd().replace('</body>', `<script src="${src}"></script>\n</body>`) + '\n<!-- */ -->\n';
    writeFileSync(p, h);
    try {
      const lint = (await lintWorkspace(w.ws)).filter((f) => f.rule === 'script-path' && f.level === 'error');
      assert.ok(lint.length > 0, `expected a script-path lint error for ${src}`);
      const { code, out } = runCheck(w.ws);
      assert.equal(code, 1, out);
      assert.match(out, /script compiled from|compiled in the page/);
    } finally { w.cleanup(); }
  }
});

// NEW-14: pages outside index/review/lessons/reference were never linted or checked.
test('lint covers pages in subfolders and .htm files, and rejects links into labs/ (NEW-14)', { skip: missingStarter() || false }, async () => {
  const w = buildWorkspace();
  const page = '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><script>void 0</script></body></html>';
  try {
    mkdirSync(join(w.ws, 'lessons', 'extra'), { recursive: true });
    mkdirSync(join(w.ws, 'labs', '01-demo'), { recursive: true });
    writeFileSync(join(w.ws, 'lessons', 'extra', 'notes.html'), page);
    writeFileSync(join(w.ws, 'lessons', '0002-bonus.htm'), page);
    writeFileSync(join(w.ws, 'labs', '01-demo', 'index.html'), page);
    const p = join(w.ws, LESSON);
    writeFileSync(p, readFileSync(p, 'utf8').replace('</main>', '<a href="../labs/01-demo/index.html">lab</a></main>'));
    const errs = (await lintWorkspace(w.ws)).filter((f) => f.level === 'error');
    for (const f of ['lessons/extra/notes.html', 'lessons/0002-bonus.htm']) assert.ok(errs.some((e) => e.file === f && /^csp-/.test(e.rule)), `expected ${f} to be linted`);
    assert.ok(errs.some((e) => e.rule === 'link-unchecked-page'), 'expected the link into labs/ to be rejected');
    assert.ok(!errs.some((e) => e.file.startsWith('labs/')), 'labs/ pages themselves are not linted');
  } finally { w.cleanup(); }
});

// NEW-15: pages the check does not open must not be reachable by any link, however it is written; other document
// types a browser runs script in are not allowed; SVG must be static. NEW-16: script files must not be links.
test('links into unchecked pages, folders or other document types are rejected, however written (NEW-15)', { skip: missingStarter() || false }, async () => {
  const cases = {
    'svg xlink:href into labs/': '<svg><a xlink:href="../labs/01-demo/index.html"><text>lab</text></a></svg>',
    'absolute file: URL': (ws) => `<a href="${pathToFileURL(join(ws, 'labs', '01-demo', 'index.html')).href}">lab</a>`,
    'folder link': '<a href="../labs/01-demo/">lab</a>',
    'encoded path into labs/': '<a href="..%2Flabs%2F01-demo%2Findex.html">lab</a>',
    '.xhtml page': '<a href="extra.xhtml">x</a>',
  };
  for (const [name, link] of Object.entries(cases)) {
    const w = buildWorkspace();
    try {
      mkdirSync(join(w.ws, 'labs', '01-demo'), { recursive: true });
      writeFileSync(join(w.ws, 'labs', '01-demo', 'index.html'), '<!doctype html><title>x</title><script>void 0</script>');
      writeFileSync(join(w.ws, 'lessons', 'extra.xhtml'), '<html xmlns="http://www.w3.org/1999/xhtml"><body><script>void 0</script></body></html>');
      const p = join(w.ws, LESSON);
      writeFileSync(p, readFileSync(p, 'utf8').replace('</main>', `${typeof link === 'function' ? link(w.ws) : link}</main>`));
      const errs = (await lintWorkspace(w.ws)).filter((f) => f.level === 'error');
      assert.ok(errs.some((e) => e.rule === 'link-unchecked-page' && e.file === 'lessons/0001-first.html'), `${name}: expected link-unchecked-page, got ${JSON.stringify(errs.map((e) => e.rule))}`);
    } finally { w.cleanup(); }
  }
});

test('scripted SVG and other scripted document types are rejected anywhere in the course (NEW-15)', { skip: missingStarter() || false }, async () => {
  const w = buildWorkspace();
  try {
    mkdirSync(join(w.ws, 'labs', '01-demo'), { recursive: true });
    writeFileSync(join(w.ws, 'lessons', 'figure.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><script>void 0</script></svg>');
    writeFileSync(join(w.ws, 'labs', '01-demo', 'run.xhtml'), '<html xmlns="http://www.w3.org/1999/xhtml"/>');
    writeFileSync(join(w.ws, 'lessons', 'static.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
    const errs = (await lintWorkspace(w.ws)).filter((f) => f.level === 'error');
    assert.ok(errs.some((e) => e.rule === 'svg-script' && e.file === 'lessons/figure.svg'));
    assert.ok(errs.some((e) => e.rule === 'page-type' && e.file === 'labs/01-demo/run.xhtml'));
    assert.ok(!errs.some((e) => e.file === 'lessons/static.svg'), 'a static SVG is fine');
  } finally { w.cleanup(); }
});

test('check.mjs fails a link to an unchecked page, as the browser resolves it (NEW-15)', { skip: missingStarter() || noBrowser }, () => {
  const w = buildWorkspace();
  try {
    mkdirSync(join(w.ws, 'labs', '01-demo'), { recursive: true });
    writeFileSync(join(w.ws, 'labs', '01-demo', 'index.html'), '<!doctype html><title>x</title>');
    const p = join(w.ws, LESSON);
    writeFileSync(p, readFileSync(p, 'utf8').replace('</main>', '<svg><a xlink:href="../labs/01-demo/index.html"><text>lab</text></a></svg></main>'));
    const { code, out } = runCheck(w.ws);
    assert.equal(code, 1, out);
    assert.match(out, /security: <a xlink:href> leads to a page the check does not cover/);
  } finally { w.cleanup(); }
});

test('a script file that is a symbolic link is rejected (NEW-16)', { skip: missingStarter() || false }, async () => {
  const w = buildWorkspace();
  try {
    symlinkSync('0001-first.html', join(w.ws, 'lessons', 'evil.js'));
    const p = join(w.ws, LESSON);
    writeFileSync(p, readFileSync(p, 'utf8').replace('</body>', '<script src="evil.js"></script>\n</body>'));
    const errs = (await lintWorkspace(w.ws)).filter((f) => f.level === 'error' && f.rule === 'script-path');
    assert.ok(errs.some((e) => /symbolic link/.test(e.message)), JSON.stringify(errs));
  } finally { w.cleanup(); }
});

// NEW-17: namespace-prefixed SVG script; SVG must never be a link target (it runs as a document), only an image.
test('SVG is accepted only as an image, and prefixed SVG script is rejected (NEW-17)', { skip: missingStarter() || false }, async () => {
  const w = buildWorkspace();
  try {
    writeFileSync(join(w.ws, 'lessons', 'fig.svg'), '<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/2000/svg"><x:script>void 0</x:script></svg>');
    writeFileSync(join(w.ws, 'lessons', 'ok.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
    const p = join(w.ws, LESSON);
    writeFileSync(p, readFileSync(p, 'utf8').replace('</main>', '<img src="ok.svg" alt=""><a href="ok.svg">open</a></main>'));
    const errs = (await lintWorkspace(w.ws)).filter((f) => f.level === 'error');
    assert.ok(errs.some((e) => e.rule === 'svg-script' && e.file === 'lessons/fig.svg'), 'prefixed <x:script> must be caught');
    const links = errs.filter((e) => e.rule === 'link-unchecked-page');
    assert.equal(links.length, 1, JSON.stringify(links));
    assert.match(links[0].message, /href="ok\.svg".*SVG opened as a document/);
  } finally { w.cleanup(); }
});

// NEW-18: a comment opened inside an attribute value must not hide later markup from lint; shadow DOM is refused.
test('markup after an attribute containing "<!--" is still linted, and declarative shadow DOM is rejected (NEW-18)', { skip: missingStarter() || false }, async () => {
  const w = buildWorkspace();
  try {
    const p = join(w.ws, LESSON);
    writeFileSync(p, readFileSync(p, 'utf8').replace('</main>', '<p title="<!--"></p><img src="data:," onerror="void 0"><p title="-->"></p><div><template shadowrootmode="open"><a href="../index.html">x</a></template></div></main>'));
    const errs = (await lintWorkspace(w.ws)).filter((f) => f.level === 'error').map((e) => e.rule);
    assert.ok(errs.includes('inline-handler'), `the handler hidden by "<!--" in an attribute must be found: ${errs}`);
    assert.ok(errs.includes('shadow-dom'), `declarative shadow DOM must be rejected: ${errs}`);
  } finally { w.cleanup(); }
});

test('check.mjs reads links inside shadow roots and refuses author shadow DOM (NEW-18)', { skip: missingStarter() || noBrowser }, () => {
  const w = buildWorkspace();
  try {
    mkdirSync(join(w.ws, 'labs', '01-demo'), { recursive: true });
    writeFileSync(join(w.ws, 'labs', '01-demo', 'index.html'), '<!doctype html><title>x</title>');
    const p = join(w.ws, LESSON);
    writeFileSync(p, readFileSync(p, 'utf8').replace('</main>', '<div><template shadowrootmode="closed"><a href="../labs/01-demo/index.html">lab</a></template></div></main>'));
    const { code, out } = runCheck(w.ws);
    assert.equal(code, 1, out);
    assert.match(out, /shadow root\(s\) in the page/);
    assert.match(out, /leads to a page the check does not cover/);
  } finally { w.cleanup(); }
});
