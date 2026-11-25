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
