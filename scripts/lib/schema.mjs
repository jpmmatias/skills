// Zero-dependency JSON Schema (2020-12) validator for the documented subset used by schemas/*.schema.json
// (ADR-011), plus loaders for course.js / NNNN.practice.js and semantic lints that JSON Schema cannot express.
//
// Supported keywords: type (string or array of types; "integer" included), required, properties,
// additionalProperties (false or a schema), enum, const, pattern, items (single schema), minItems, maxItems,
// minimum, maximum, minLength, maxLength, oneOf, anyOf, $ref (local only: "#", "#/$defs/name" or any local
// JSON pointer). Annotations ($schema, $id, $comment, title, description, examples, default, deprecated) are
// ignored. Any other keyword is reported by checkSchema(), so a schema cannot silently rely on something this
// validator does not enforce. A full validator (e.g. ajv) can replace this one without changing the schemas.
//
// Security: loadCourseJs/loadPracticeJs evaluate files with node:vm. vm is NOT a security boundary; run them only
// on the learner's own workspace and on this repository, never on untrusted files.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const SCHEMA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'schemas');

const ANNOTATIONS = new Set(['$schema', '$id', '$comment', 'title', 'description', 'examples', 'default', 'deprecated']);
const KEYWORDS = new Set(['type', 'required', 'properties', 'additionalProperties', 'enum', 'const', 'pattern', 'items',
  'minItems', 'maxItems', 'minimum', 'maximum', 'minLength', 'maxLength', 'oneOf', 'anyOf', '$ref', '$defs']);
const TYPES = new Set(['string', 'number', 'integer', 'boolean', 'object', 'array', 'null']);

const ptr = (path, key) => `${path}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`;
const show = (v) => { const s = JSON.stringify(v); return s && s.length > 60 ? s.slice(0, 57) + '...' : s; };
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}
function typeMatches(v, t) {
  const actual = typeOf(v);
  if (t === 'number') return actual === 'number' || actual === 'integer';
  return actual === t;
}
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => own(b, k) && deepEqual(a[k], b[k]));
}

/** Resolve a local $ref ("#", "#/$defs/x", "#/properties/a/items") against the root schema. */
export function resolveRef(root, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#')) throw new Error(`unsupported $ref ${ref} (local refs only)`);
  if (ref === '#') return root;
  if (!ref.startsWith('#/')) throw new Error(`unsupported $ref ${ref}`);
  let node = root;
  for (const raw of ref.slice(2).split('/')) {
    const key = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
    if (!isObj(node) && !Array.isArray(node)) throw new Error(`unresolvable $ref ${ref}`);
    if (!own(node, key)) throw new Error(`unresolvable $ref ${ref}`);
    node = node[key];
  }
  return node;
}

function walk(schema, data, path, root, errors, depth) {
  if (depth > 64) { errors.push({ path, message: 'schema nesting too deep (recursive $ref?)' }); return; }
  if (schema === true) return;
  if (schema === false) { errors.push({ path, message: 'no value is allowed here' }); return; }
  if (!isObj(schema)) { errors.push({ path, message: 'invalid schema node' }); return; }

  if (schema.$ref !== undefined) {
    let target;
    try { target = resolveRef(root, schema.$ref); } catch (e) { errors.push({ path, message: e.message }); return; }
    walk(target, data, path, root, errors, depth + 1);
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeMatches(data, t))) {
      errors.push({ path, message: `must be ${types.join(' or ')}, got ${typeOf(data)}` });
      return; // further keywords would only produce noise
    }
  }
  if (schema.const !== undefined && !deepEqual(data, schema.const)) errors.push({ path, message: `must be ${show(schema.const)}` });
  if (schema.enum !== undefined && !schema.enum.some((v) => deepEqual(v, data))) {
    errors.push({ path, message: `must be one of ${schema.enum.map(show).join(', ')}; got ${show(data)}` });
  }
  if (typeof data === 'string') {
    const len = [...data].length;
    if (schema.minLength !== undefined && len < schema.minLength) errors.push({ path, message: `must have at least ${schema.minLength} character(s)` });
    if (schema.maxLength !== undefined && len > schema.maxLength) errors.push({ path, message: `must have at most ${schema.maxLength} characters` });
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(data)) errors.push({ path, message: `must match ${schema.pattern}; got ${show(data)}` });
  }
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) errors.push({ path, message: `must be >= ${schema.minimum}` });
    if (schema.maximum !== undefined && data > schema.maximum) errors.push({ path, message: `must be <= ${schema.maximum}` });
  }
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) errors.push({ path, message: `must have at least ${schema.minItems} item(s)` });
    if (schema.maxItems !== undefined && data.length > schema.maxItems) errors.push({ path, message: `must have at most ${schema.maxItems} items` });
    if (schema.items !== undefined) data.forEach((v, i) => walk(schema.items, v, ptr(path, i), root, errors, depth + 1));
  }
  if (isObj(data)) {
    for (const k of schema.required || []) if (!own(data, k)) errors.push({ path, message: `missing required property "${k}"` });
    const props = schema.properties || {};
    for (const k of Object.keys(data)) {
      if (own(props, k)) walk(props[k], data[k], ptr(path, k), root, errors, depth + 1);
      else if (schema.additionalProperties === false) errors.push({ path: ptr(path, k), message: `unknown property "${k}"` });
      else if (isObj(schema.additionalProperties)) walk(schema.additionalProperties, data[k], ptr(path, k), root, errors, depth + 1);
    }
  }
  if (schema.anyOf !== undefined) {
    const runs = schema.anyOf.map((s) => { const e = []; walk(s, data, path, root, e, depth + 1); return e; });
    if (!runs.some((e) => e.length === 0)) errors.push(...bestBranch(schema.anyOf, runs, data, path, root, 'anyOf'));
  }
  if (schema.oneOf !== undefined) {
    const runs = schema.oneOf.map((s) => { const e = []; walk(s, data, path, root, e, depth + 1); return e; });
    const ok = runs.filter((e) => e.length === 0).length;
    if (ok === 0) errors.push(...bestBranch(schema.oneOf, runs, data, path, root, 'oneOf'));
    else if (ok > 1) errors.push({ path, message: `matches ${ok} alternatives of oneOf; must match exactly one` });
  }
}

// When no alternative matches, report the errors of the most plausible one: among branches whose discriminators
// (properties with `const`) all agree with the data, the one with the fewest errors; else the fewest overall.
function bestBranch(branches, runs, data, path, root, word) {
  const resolved = branches.map((b) => { try { return b && b.$ref ? resolveRef(root, b.$ref) : b; } catch { return b; } });
  const agrees = (b) => {
    if (!isObj(data) || !isObj(b) || !isObj(b.properties)) return false;
    let hits = 0;
    for (const [k, p] of Object.entries(b.properties)) {
      if (!isObj(p) || !own(data, k) || p.const === undefined) continue;
      if (!deepEqual(p.const, data[k])) return false;
      hits++;
    }
    return hits > 0;
  };
  const fewest = (idx) => idx.reduce((best, i) => (best < 0 || runs[i].length < runs[best].length ? i : best), -1);
  const candidates = resolved.map((b, i) => i).filter((i) => agrees(resolved[i]));
  const pick = candidates.length ? fewest(candidates) : fewest(runs.map((r, i) => i));
  const label = resolved[pick] && resolved[pick].title ? ` (closest: ${resolved[pick].title})` : '';
  return [{ path, message: `does not match any ${word} alternative${label}` }, ...runs[pick]];
}

/**
 * Validate `data` against `schema` (or against the sub-schema at `opts.ref`, e.g. "#/$defs/state").
 * @returns {{path: string, message: string}[]} empty when valid. `path` is a JSON Pointer ("" = root).
 */
export function validate(schema, data, opts = {}) {
  const errors = [];
  const start = opts.ref ? resolveRef(schema, opts.ref) : schema;
  walk(start, data, '', schema, errors, 0);
  return errors;
}

/** Report keywords outside the supported subset, bad types and unresolvable refs. */
export function checkSchema(schema) {
  const errors = [];
  const visit = (node, path) => {
    if (typeof node === 'boolean') return;
    if (!isObj(node)) { errors.push({ path, message: 'schema must be an object or boolean' }); return; }
    for (const [k, v] of Object.entries(node)) {
      const p = ptr(path, k);
      if (ANNOTATIONS.has(k)) continue;
      if (!KEYWORDS.has(k)) { errors.push({ path: p, message: `keyword "${k}" is outside the supported subset` }); continue; }
      if (k === 'type') {
        const ts = Array.isArray(v) ? v : [v];
        for (const t of ts) if (!TYPES.has(t)) errors.push({ path: p, message: `unknown type "${t}"` });
      } else if (k === 'properties' || k === '$defs') {
        if (!isObj(v)) errors.push({ path: p, message: `${k} must be an object` });
        else for (const [name, sub] of Object.entries(v)) visit(sub, ptr(p, name));
      } else if (k === 'items' || k === 'additionalProperties') {
        if (typeof v !== 'boolean' && !isObj(v)) errors.push({ path: p, message: `${k} must be a schema` });
        else visit(v, p);
      } else if (k === 'oneOf' || k === 'anyOf') {
        if (!Array.isArray(v) || !v.length) errors.push({ path: p, message: `${k} must be a non-empty array` });
        else v.forEach((sub, i) => visit(sub, ptr(p, i)));
      } else if (k === '$ref') {
        try { resolveRef(schema, v); } catch (e) { errors.push({ path: p, message: e.message }); }
      } else if (k === 'pattern') {
        try { new RegExp(v, 'u'); } catch (e) { errors.push({ path: p, message: `invalid pattern: ${e.message}` }); }
      } else if (k === 'required' && !(Array.isArray(v) && v.every((x) => typeof x === 'string'))) {
        errors.push({ path: p, message: 'required must be an array of strings' });
      } else if (k === 'enum' && !Array.isArray(v)) {
        errors.push({ path: p, message: 'enum must be an array' });
      } else if (/^(min|max)/.test(k) && typeof v !== 'number') {
        errors.push({ path: p, message: `${k} must be a number` });
      }
    }
  };
  visit(schema, '');
  return errors;
}

/** Read schemas/<name>.schema.json (name without suffix, e.g. "course"). */
export function loadSchema(name) {
  return JSON.parse(readFileSync(join(SCHEMA_DIR, `${name}.schema.json`), 'utf8'));
}

// ---------- loaders (node:vm; not a security boundary) ----------

function runScript(path, extra) {
  const code = readFileSync(path, 'utf8');
  const sandbox = { console: { log() {}, warn() {}, error() {}, info() {} }, ...extra };
  sandbox.window = sandbox; // `window.COURSE = …` and a top-level `var COURSE` both land on the sandbox
  const ctx = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(code, ctx, { filename: path, timeout: 1000 });
  return sandbox;
}
const plain = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v))); // leave the vm realm; drop functions

/**
 * Load a UMD classic script (e.g. skills/learn/starter/assets/store.js) as CommonJS in this realm and return its
 * module.exports. Needed because the repository's package.json sets "type": "module", which makes Node treat
 * every .js file here as ESM, so require() would not run the UMD's module.exports branch.
 */
export function requireClassic(path) {
  const module = { exports: {} };
  new Function('module', 'exports', readFileSync(path, 'utf8'))(module, module.exports); // trusted repo file only
  return module.exports;
}

/** Evaluate a course.js and return a plain copy of window.COURSE (undefined if the file does not set it). */
export function loadCourseJs(path) {
  const sb = runScript(path, { Learncraft: {} });
  return plain(sb.COURSE);
}

/** Evaluate an NNNN.practice.js and return its Learncraft.practice(n, items) calls as [{lesson, items}]. */
export function loadPracticeJs(path) {
  const calls = [];
  runScript(path, { Learncraft: { practice(lesson, items) { calls.push(plain({ lesson, items })); } } });
  return calls;
}

// ---------- semantic lints (rules a JSON Schema subset cannot express) ----------

const TEMPLATE_ID = 'topic-slug';

/** course.js warnings: template id, duplicates, dangling references, objective naming. Returns [{path, message}]. */
export function courseLint(course) {
  const w = [];
  if (!isObj(course)) return [{ path: '', message: 'COURSE is not an object' }];
  if (course.id === TEMPLATE_ID) w.push({ path: '/id', message: `id is still the template value "${TEMPLATE_ID}": progress would collide with every other course left at the template id (file:// shares one storage origin in Chromium)` });
  const ms = Array.isArray(course.milestones) ? course.milestones : [];
  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  const msIds = new Set();
  ms.forEach((m, i) => {
    if (!isObj(m)) return;
    if (msIds.has(m.id)) w.push({ path: `/milestones/${i}/id`, message: `duplicate milestone id "${m.id}"` });
    msIds.add(m.id);
    if (m.status === 'mastered' && !m.evidence) w.push({ path: `/milestones/${i}/evidence`, message: 'a mastered milestone needs an evidence learning record (LR-NNNN)' });
  });
  const ns = new Set(), files = new Set(), objIds = new Set();
  lessons.forEach((l, i) => {
    if (!isObj(l)) return;
    if (ns.has(l.n)) w.push({ path: `/lessons/${i}/n`, message: `duplicate lesson number ${l.n}` });
    ns.add(l.n);
    if (files.has(l.file)) w.push({ path: `/lessons/${i}/file`, message: `duplicate lesson file "${l.file}"` });
    files.add(l.file);
    (Array.isArray(l.milestones) ? l.milestones : []).forEach((id, j) => {
      if (!msIds.has(id)) w.push({ path: `/lessons/${i}/milestones/${j}`, message: `unknown milestone "${id}"` });
    });
    (Array.isArray(l.requires) ? l.requires : []).forEach((n, j) => {
      if (!lessons.some((x) => x && x.n === n)) w.push({ path: `/lessons/${i}/requires/${j}`, message: `unknown lesson ${n}` });
    });
    (Array.isArray(l.objectives) ? l.objectives : []).forEach((o, j) => {
      if (!isObj(o)) return;
      if (objIds.has(o.id)) w.push({ path: `/lessons/${i}/objectives/${j}/id`, message: `duplicate objective id "${o.id}"` });
      objIds.add(o.id);
      if (typeof o.id === 'string' && !o.id.startsWith(`l${l.n}.`)) {
        w.push({ path: `/lessons/${i}/objectives/${j}/id`, message: `objective "${o.id}" should start with "l${l.n}." (the store maps objectives to lessons by this prefix)` });
      }
    });
  });
  return w;
}

/** Practice-item rules beyond the schema: exactly one correct option, template ↔ blanks, unique ids. */
export function practiceLint(items, { lesson, seen = new Set() } = {}) {
  const w = [];
  if (!Array.isArray(items)) return [{ path: '', message: 'items must be an array' }];
  items.forEach((it, i) => {
    if (!isObj(it)) return;
    const p = `/${i}`;
    if (typeof it.id === 'string') {
      if (seen.has(it.id)) w.push({ path: `${p}/id`, message: `duplicate item id "${it.id}" (ids are course-wide)` });
      seen.add(it.id);
    }
    if (lesson != null && typeof it.objective === 'string' && !it.objective.startsWith(`l${lesson}`)) {
      w.push({ path: `${p}/objective`, message: `objective "${it.objective}" does not belong to lesson ${lesson}` });
    }
    if (it.type === 'choice' && Array.isArray(it.options)) {
      const n = it.options.filter((o) => isObj(o) && o.correct === true).length;
      if (n !== 1) w.push({ path: `${p}/options`, message: `a choice item needs exactly one correct option; found ${n}` });
    }
    if (it.type === 'fade' && typeof it.template === 'string' && isObj(it.blanks)) {
      const inTemplate = new Set([...it.template.matchAll(/\{\{\s*([^}\s]+)\s*\}\}/g)].map((m) => m[1]));
      for (const k of Object.keys(it.blanks)) if (!inTemplate.has(k)) w.push({ path: `${p}/blanks/${k}`, message: `blank "${k}" does not appear in the template as {{${k}}}` });
      for (const k of inTemplate) if (!own(it.blanks, k)) w.push({ path: `${p}/template`, message: `template blank {{${k}}} has no accepted answers` });
      if (!Object.keys(it.blanks).length) w.push({ path: `${p}/blanks`, message: 'a fade item needs at least one blank' });
    }
  });
  return w;
}

/** Source-record rules beyond the schema: version scope for docs/api/tool sources. */
export function sourceLint(rec) {
  const w = [];
  if (isObj(rec) && ['docs', 'api', 'tool'].includes(rec.type) && !rec.versionScope) {
    w.push({ path: '/versionScope', message: `a ${rec.type} source needs versionScope (e.g. "react@19.x")` });
  }
  return w;
}

/** Review-handoff rules beyond the schema: REVISE needs a blocker or major item. */
export function handoffLint(doc) {
  const w = [];
  if (isObj(doc) && doc.verdict === 'REVISE' && !(doc.items || []).some((x) => x && (x.severity === 'blocker' || x.severity === 'major'))) {
    w.push({ path: '/verdict', message: 'REVISE requires at least one blocker or major item' });
  }
  return w;
}
