// Regression tests for NEW-08 and NEW-09 (docs/audit/reviews/security-reliability.md, "Re-verification 2"):
// a CSP the browser ignores must never pass lint or check.mjs, a self-removing payload must still be reported,
// and a directory symlink must not lead the loader outside the workspace.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, symlinkSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
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
