// Loads a workspace's data scripts (assets/course.js, lessons/NNNN.practice.js) for the Node tools:
// lint-workspace.mjs, check.mjs, scripts/validate.mjs and the evaluation scorer. The repository's
// scripts/lib/schema.mjs re-exports these functions, so there is one implementation.
//
//   import { loadCourseJs, loadPracticeJs, loadDataFiles } from './load-data.mjs'
//   loadCourseJs(path)    → a plain copy of window.COURSE (undefined when the file does not set it)
//   loadPracticeJs(path)  → [{ lesson, items }] for every Learncraft.practice(n, items) call
//   loadDataFiles(reqs)   → one child process for many files: [{ kind: 'course' | 'practice', path }] → [{ value } | { error }]
//
// These files are JavaScript, so loading them means running them. READ THIS before relying on it:
// this REDUCES the risk of running a hostile file; it does NOT remove it. It is still the learner's
// own machine. Never run check.mjs, the linter or the validator on a workspace you do not trust.
// What is in place (security review SR-02):
//   1. A child process (spawnSync of this same Node binary), never the tool's own process:
//      · a hard kill after LOAD_TIMEOUT_MS (3 s, plus a little per extra file), so getters, toJSON,
//        promise jobs or a loop can only hang the child, never the tool;
//      · --disallow-code-generation-from-strings, --max-old-space-size, an EMPTY environment (no
//        NODE_OPTIONS, tokens or API keys are inherited; SystemRoot only on Windows);
//      · Node's permission model when this Node has it (--permission / --experimental-permission):
//        the child may read only this loader file; no other file reads, no writes, no child
//        processes, no workers. Node's permission model does not cover the network;
//      · the file's text goes in on stdin (the child does not open it); only JSON comes back on
//        stdout, at most MAX_OUTPUT bytes, and nothing else from the child is trusted.
//   2. Inside the child, a node:vm context built from a null-prototype object. Every stub (window,
//      document, console, Learncraft.practice) is created by code running INSIDE the context, so no
//      host-realm function is reachable (`console.log.constructor` is the context's Function, which
//      cannot compile strings); microtaskMode 'afterEvaluate'; serialisation (toJSON, getters)
//      runs inside the context under the same timeout.
// Longer term (ADR-004 follow-up): require course.js to be exactly `window.COURSE = <JSON>;` so the
// tools can JSON.parse it and never execute it.
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const SELF = fileURLToPath(import.meta.url);
export const LOAD_TIMEOUT_MS = 3000;   // hard kill of the child (one file)
export const VM_TIMEOUT_MS = 1000;     // each synchronous run inside the child
export const MAX_SOURCE = 2e6;         // characters per data file
export const MAX_OUTPUT = 8e6;         // bytes of JSON the child may return
const MAX_JSON = 5e6;                  // characters of JSON per file

// ---------------------------------------------------------------------------------------------
// Parent side
// ---------------------------------------------------------------------------------------------
function permissionFlags() {
  const f = process.allowedNodeEnvironmentFlags;
  const flag = f.has('--permission') ? '--permission' : f.has('--experimental-permission') ? '--experimental-permission' : null;
  return flag ? [flag, `--allow-fs-read=${SELF}`] : [];
}

function childEnv() {
  const env = {};
  if (process.platform === 'win32') for (const k of ['SystemRoot', 'SYSTEMROOT']) if (process.env[k]) env[k] = process.env[k];
  return env;
}

/** Loads many data files in one child process. Never throws for a bad file: each result is { value } or { error }. */
export function loadDataFiles(requests) {
  const files = [];
  const results = requests.map(({ kind, path }) => {
    if (kind !== 'course' && kind !== 'practice') return { error: `unknown kind ${kind}` };
    let code;
    try {
      if (statSync(path).size > MAX_SOURCE * 4) return { error: `file is larger than ${MAX_SOURCE} characters` };
      code = readFileSync(path, 'utf8');
    } catch (e) { return { error: e.message }; }
    if (code.length > MAX_SOURCE) return { error: `file is larger than ${MAX_SOURCE} characters` };
    files.push({ i: files.length, kind, filename: path, code });
    return null;
  });
  if (!files.length) return results;
  const timeout = LOAD_TIMEOUT_MS + 500 * (files.length - 1);
  const r = spawnSync(process.execPath, [...permissionFlags(), '--disallow-code-generation-from-strings', '--max-old-space-size=256', '--no-warnings', SELF, '--child'], {
    input: JSON.stringify(files), env: childEnv(), timeout, killSignal: 'SIGKILL', maxBuffer: MAX_OUTPUT,
    encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  });
  let out = null;
  if (!r.error && r.status === 0) { try { out = JSON.parse(r.stdout); } catch { out = null; } }
  if (!Array.isArray(out) || out.length !== files.length) {
    const why = r.error?.code === 'ETIMEDOUT' || r.signal === 'SIGKILL' ? `timed out after ${timeout} ms (the loader process was killed)`
      : r.error?.code === 'ENOBUFS' ? `returned more than ${MAX_OUTPUT} bytes`
        : r.error ? r.error.message : `loader process failed (exit ${r.status}${r.signal ? ', ' + r.signal : ''}): ${String(r.stderr || '').split('\n').filter(Boolean).slice(0, 2).join(' | ').slice(0, 300)}`;
    if (files.length > 1) { // find which file it was: load each one alone
      const each = files.map((f) => loadDataFiles([{ kind: f.kind, path: f.filename }])[0]);
      let k = 0;
      return results.map((x) => x ?? each[k++]);
    }
    out = [{ error: why }];
  }
  let k = 0;
  return results.map((x) => {
    if (x) return x;
    const o = out[k++];
    if (!o || typeof o !== 'object') return { error: 'loader returned nothing' };
    if (typeof o.error === 'string') return { error: o.error.slice(0, 500) };
    if (o.json === null) return { value: undefined };
    if (typeof o.json !== 'string') return { error: 'loader returned no JSON' };
    try { return { value: JSON.parse(o.json) }; } catch (e) { return { error: `loader returned bad JSON: ${e.message}` }; }
  });
}

function one(kind, path) {
  const [r] = loadDataFiles([{ kind, path }]);
  if (r.error) throw new Error(r.error);
  return r.value;
}

/** Evaluates a course.js and returns a plain copy of window.COURSE (undefined if the file does not set it). */
export function loadCourseJs(path) { return one('course', path); }

/** Evaluates an NNNN.practice.js and returns its Learncraft.practice(n, items) calls as [{ lesson, items }]. */
export function loadPracticeJs(path) { return one('practice', path) ?? []; }

// ---------------------------------------------------------------------------------------------
// Child side: node load-data.mjs --child  (stdin: [{ kind, filename, code }], stdout: [{ json } | { error }])
// ---------------------------------------------------------------------------------------------
const PRELUDE = `(function (g) {
  'use strict';
  var noop = function () {};
  g.window = g; g.self = g; g.globalThis = g;
  g.console = { log: noop, warn: noop, error: noop, info: noop, debug: noop };
  g.addEventListener = noop; g.removeEventListener = noop;
  g.document = { addEventListener: noop, removeEventListener: noop, querySelector: function () { return null; },
    querySelectorAll: function () { return []; }, getElementById: function () { return null; }, readyState: 'complete' };
  var calls = [];
  Object.defineProperty(g, '__lcCalls', { value: calls });
  var base = { practice: function (n, items) { calls.push(JSON.parse(JSON.stringify({ lesson: n, items: items === undefined ? null : items }))); } };
  g.Learncraft = new Proxy(base, { get: function (t, k) { return k in t ? t[k] : noop; } });
})(this);`;

function runChild(file) {
  const ctx = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate' });
  const opts = { timeout: VM_TIMEOUT_MS, breakOnSigint: false };
  vm.runInContext(PRELUDE, ctx, opts);
  vm.runInContext(file.code, ctx, { ...opts, filename: file.filename });
  const json = vm.runInContext(file.kind === 'course'
    ? '(function (c) { return c === undefined ? null : JSON.stringify(c); })(globalThis.COURSE)'
    : 'JSON.stringify(globalThis.__lcCalls)', ctx, opts);
  if (json !== null && typeof json !== 'string') throw new Error('the data did not serialise to JSON');
  if (json !== null && json.length > MAX_JSON) throw new Error(`the data is larger than ${MAX_JSON} characters of JSON`);
  return json;
}

if (process.argv[1] === SELF && process.argv[2] === '--child') {
  const chunks = [];
  process.stdin.on('data', (d) => chunks.push(d));
  process.stdin.on('end', () => {
    let files = [];
    try { files = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { files = []; }
    const out = (Array.isArray(files) ? files : []).map((f) => {
      try { return { json: runChild(f) }; } catch (e) { return { error: String(e && e.message || e) }; }
    });
    process.stdout.write(JSON.stringify(out), () => process.exit(0)); // exit now: nothing queued by the data may run
  });
}
