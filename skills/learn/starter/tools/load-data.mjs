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
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, readSync, realpathSync, statSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const SELF = fileURLToPath(import.meta.url);
export const LOAD_TIMEOUT_MS = 3000;   // hard kill of the child (one file)
export const VM_TIMEOUT_MS = 1000;     // each synchronous run inside the child
export const MAX_SOURCE = 2e6;         // characters per data file
export const MAX_OUTPUT = 8e6;         // bytes of JSON the child may return
const MAX_JSON = 5e6;                  // characters of JSON per file

// ---------------------------------------------------------------------------------------------
// Safe reads (NEW-02): every workspace file the tools read goes through this. A FIFO, a device,
// a socket, a symbolic link that leaves the workspace or a hard-linked file is refused BEFORE it is
// opened, so a workspace cannot hang or crash the tool or make it read (and echo) a file outside.
// ---------------------------------------------------------------------------------------------
const kindOf = (st) => (st.isFIFO() ? 'a FIFO' : st.isCharacterDevice() || st.isBlockDevice() ? 'a device' : st.isSocket() ? 'a socket' : st.isDirectory() ? 'a directory' : 'not a regular file');
const inside = (base, p) => p === base || p.startsWith(base.endsWith(sep) ? base : base + sep);

/** Checks a workspace file without reading it → { ok: true, real } or { error }. root: the workspace folder. */
export function checkWorkspaceFile(path, { root = null, maxBytes = MAX_SOURCE * 4 } = {}) {
  let st;
  try { st = lstatSync(path); } catch (e) { return { error: `cannot be read (${e.code || 'error'})` }; }
  let real = resolve(path);
  // A symbolic link anywhere in the path (e.g. lessons/ -> /elsewhere) must not lead outside the workspace (NEW-09):
  // compare real paths, not only when the file itself is a link.
  {
    let rp, base;
    try { rp = realpathSync(path); base = realpathSync(root || dirname(dirname(resolve(path)))); } catch { return { error: 'is a broken symbolic link (refused)' }; }
    if (!inside(base, rp)) return { error: 'resolves outside the workspace through a symbolic link (refused)' };
  }
  if (st.isSymbolicLink()) {
    let base;
    try { real = realpathSync(path); base = realpathSync(root || dirname(dirname(resolve(path)))); } catch { return { error: 'is a broken symbolic link (refused)' }; }
    if (!inside(base, real)) return { error: 'is a symbolic link to a file outside the workspace (refused)' };
    try { st = statSync(real); } catch (e) { return { error: `cannot be read (${e.code || 'error'})` }; }
  }
  if (!st.isFile()) return { error: `is ${kindOf(st)} (refused: only regular files are read)` };
  if (st.nlink > 1) return { error: 'is hard-linked to another file (refused: the other name may be outside the workspace)' };
  if (st.size > maxBytes) return { error: `is larger than ${maxBytes} bytes` };
  return { ok: true, real };
}

/** Reads a workspace file safely → { text } or { error } (see checkWorkspaceFile). */
export function readWorkspaceFile(path, opts = {}) {
  const maxBytes = opts.maxBytes ?? MAX_SOURCE * 4;
  const c = checkWorkspaceFile(path, { ...opts, maxBytes });
  if (c.error) return c;
  let fd;
  try {
    // O_NONBLOCK: if the file was swapped for a FIFO after the check, open() returns at once and fstat refuses it.
    fd = openSync(c.real, constants.O_RDONLY | (constants.O_NONBLOCK || 0) | (constants.O_NOFOLLOW || 0));
    const st = fstatSync(fd);
    if (!st.isFile()) return { error: `is ${kindOf(st)} (refused: only regular files are read)` };
    const buf = Buffer.alloc(Math.min(st.size, maxBytes) + 1);
    let n = 0, r;
    while (n < buf.length && (r = readSync(fd, buf, n, buf.length - n, n)) > 0) n += r;
    if (n > maxBytes) return { error: `is larger than ${maxBytes} bytes` };
    return { text: buf.subarray(0, n).toString('utf8') };
  } catch (e) { return { error: `cannot be read (${e.code || 'error'})` }; }
  finally { if (fd !== undefined) closeSync(fd); }
}

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

/** The one way the child is started (the self-test uses it too, so a weakened spawn is visible to the tests). */
function spawnChild(files, timeout) {
  // --experimental-vm-modules lets the context's own import() hook run, so import() rejects with a context-realm error.
  const vmFlag = process.allowedNodeEnvironmentFlags.has('--experimental-vm-modules') ? ['--experimental-vm-modules'] : [];
  return spawnSync(process.execPath, [...permissionFlags(), ...vmFlag, '--disallow-code-generation-from-strings', '--max-old-space-size=256', '--no-warnings', SELF, '--child'], {
    input: JSON.stringify(files), env: childEnv(), timeout, killSignal: 'SIGKILL', maxBuffer: MAX_OUTPUT,
    encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  });
}

/**
 * Reports what the loader child can do, from the child's own (trusted) code: { env: [names], codegen, fsRead, permission }.
 * Used by the tests to prove the isolation flags are still in place.
 */
export function loaderSelfTest() {
  const r = spawnChild([{ kind: 'selftest' }], LOAD_TIMEOUT_MS);
  try { return JSON.parse(JSON.parse(r.stdout)[0].json); } catch { return { error: `self-test failed: ${String(r.stderr || r.error || '').slice(0, 200)}` }; }
}

/**
 * Loads many data files in one child process. Never throws for a bad file: each result is { value } or { error }.
 * requests: [{ kind: 'course' | 'practice', path, root? }]; root (the workspace) bounds symbolic links (default: two
 * folders up from the file, i.e. the workspace for assets/course.js and lessons/NNNN.practice.js).
 */
export function loadDataFiles(requests) {
  const files = [];
  const results = requests.map(({ kind, path, root }) => {
    if (kind !== 'course' && kind !== 'practice') return { error: `unknown kind ${kind}` };
    const r = readWorkspaceFile(path, { root, maxBytes: MAX_SOURCE * 4 });
    if (r.error) return { error: `the file ${r.error}` };
    if (r.text.length > MAX_SOURCE) return { error: `file is larger than ${MAX_SOURCE} characters` };
    files.push({ i: files.length, kind, filename: path, root, code: r.text });
    return null;
  });
  if (!files.length) return results;
  const timeout = LOAD_TIMEOUT_MS + 500 * (files.length - 1);
  const r = spawnChild(files, timeout);
  let out = null;
  if (!r.error && r.status === 0) { try { out = JSON.parse(r.stdout); } catch { out = null; } }
  if (!Array.isArray(out) || out.length !== files.length) {
    const why = r.error?.code === 'ETIMEDOUT' || r.signal === 'SIGKILL' ? `timed out after ${timeout} ms (the loader process was killed)`
      : r.error?.code === 'ENOBUFS' ? `returned more than ${MAX_OUTPUT} bytes`
        : r.error ? r.error.message : `loader process failed (exit ${r.status}${r.signal ? ', ' + r.signal : ''}): ${String(r.stderr || '').split('\n').filter(Boolean).slice(0, 2).join(' | ').slice(0, 300)}`;
    if (files.length > 1) { // find which file it was: load each one alone
      const each = files.map((f) => loadDataFiles([{ kind: f.kind, path: f.filename, root: f.root }])[0]);
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
  // Data needs no binary buffers: without these constructors memory stays inside the 256 MB heap cap
  // (typed arrays live outside it; NEW-03). WebAssembly is off as well.
  ['ArrayBuffer', 'SharedArrayBuffer', 'DataView', 'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
    'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array', 'Float16Array', 'Atomics',
    'WebAssembly', 'FinalizationRegistry', 'WeakRef'].forEach(function (k) { try { delete g[k]; } catch (e) { /* not there */ } });
})(this);`;
const SAFE_MESSAGE = /^(Script execution timed out after \d+ms|Code generation from strings disallowed for this context|the data (did not serialise to JSON|is larger than \d+ characters of JSON)|Maximum call stack size exceeded|import\(\) is not available to course data)$/;
// Errors are reported as "<Name> at line N", never with their message: a message can quote the file (NEW-02).
function describeError(e, filename) {
  let msg = '', name = 'Error', stack = '';
  try { msg = String(e && e.message); name = String(e && e.name); stack = String(e && e.stack); } catch { /* hostile getters */ }
  if (SAFE_MESSAGE.test(msg)) return msg;
  if (!/^[A-Za-z]{1,30}$/.test(name)) name = 'Error';
  const i = filename ? stack.indexOf(filename + ':') : -1;
  const line = i >= 0 ? /^:(\d+)/.exec(stack.slice(i + filename.length))?.[1] : null;
  return `${name}${line ? ' at line ' + line : ''} (message withheld: it could quote the file)`;
}

function selfTest() {
  let codegen = 'allowed', fsRead = 'allowed';
  try { new Function('return 1'); } catch { codegen = 'blocked'; }
  try { readFileSync(process.execPath, { length: 1 }); } catch (e) { fsRead = e.code === 'ERR_ACCESS_DENIED' ? 'blocked' : 'error ' + e.code; }
  return JSON.stringify({ env: Object.keys(process.env), codegen, fsRead, permission: !!process.permission });
}

function runChild(file) {
  if (file.kind === 'selftest') return selfTest();
  const ctx = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate' });
  // import() from the data rejects with an error made INSIDE the context: no host-realm object reaches the data (NEW-05).
  const importModuleDynamically = () => Promise.reject(vm.runInContext('new Error("import() is not available to course data")', ctx));
  const opts = { timeout: VM_TIMEOUT_MS, breakOnSigint: false };
  vm.runInContext(PRELUDE, ctx, { ...opts, importModuleDynamically });
  vm.runInContext(file.code, ctx, { ...opts, filename: file.filename, importModuleDynamically });
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
      try { return { json: runChild(f) }; } catch (e) { return { error: describeError(e, f && f.filename) }; }
    });
    process.stdout.write(JSON.stringify(out), () => process.exit(0)); // exit now: nothing queued by the data may run
  });
}
