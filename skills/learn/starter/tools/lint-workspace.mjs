// Learncraft workspace linter: deterministic, zero dependencies, no network, no browser.
//
//   node lint-workspace.mjs [workspace] [--json]
//   import { lintWorkspace, inspectWorkspace } from './lint-workspace.mjs'
//
// Used by check.mjs (before the browser pass), by the repository validator (scripts/validate.mjs,
// for examples/*) and by the evaluation scorer (evaluations/runners/score-workspace.mjs).
// Each finding is { level: 'error' | 'warn', rule, file, message }. Errors fail the check.
//
// JSON-Schema validation uses schemas/*.json and scripts/lib/schema.mjs from the Learncraft
// repository when they can be found above this file (a git checkout or a plugin install). A
// skills.sh install ships only the skill folder: the structural rules below still run and one
// warning says that schema validation was skipped. LEARNCRAFT_ROOT overrides the search.
//
// course.js and *.practice.js are evaluated in a Node `vm` context with stub globals. `vm` is not a
// security boundary (ADR-004): run this only on your own workspace or this repository.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------------------------
// Repository support files (schemas + D's subset validator), found by walking up from here.
// ---------------------------------------------------------------------------------------------
let supportPromise;
export function findRepoRoot(start = HERE) {
  if (process.env.LEARNCRAFT_ROOT) return resolve(process.env.LEARNCRAFT_ROOT);
  let d = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(d, 'schemas', 'course.schema.json')) || existsSync(join(d, 'scripts', 'lib', 'schema.mjs'))) return d;
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  return null;
}

export function loadSupport() {
  supportPromise ??= (async () => {
    const root = findRepoRoot();
    const out = { root, schemaLib: null, schemas: {}, notes: [] };
    if (!root) { out.notes.push('Learncraft schemas not found above the tools folder (skills.sh installs ship only the skill)'); return out; }
    const lib = join(root, 'scripts', 'lib', 'schema.mjs');
    if (existsSync(lib)) {
      try { out.schemaLib = await import(pathToFileURL(lib).href); } catch (e) { out.notes.push(`scripts/lib/schema.mjs failed to load: ${e.message}`); }
    } else out.notes.push('scripts/lib/schema.mjs is missing');
    for (const [key, file] of [['course', 'course.schema.json'], ['practice', 'practice-items.schema.json']]) {
      const p = join(root, 'schemas', file);
      if (!existsSync(p)) { out.notes.push(`schemas/${file} is missing`); continue; }
      try { out.schemas[key] = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { out.notes.push(`schemas/${file} does not parse: ${e.message}`); }
    }
    return out;
  })();
  return supportPromise;
}

// ---------------------------------------------------------------------------------------------
// Loaders. Prefer D's helpers (scripts/lib/schema.mjs); fall back to an equivalent vm evaluation.
// ---------------------------------------------------------------------------------------------
function stubGlobals(extra = {}) {
  const noop = () => {};
  const doc = { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], readyState: 'complete' };
  const win = { addEventListener: noop, document: doc, ...extra };
  win.window = win; win.self = win; win.globalThis = win;
  return win;
}

export function fallbackLoadCourseJs(path) {
  const ctx = stubGlobals();
  vm.createContext(ctx);
  vm.runInContext(readFileSync(path, 'utf8'), ctx, { filename: path, timeout: 1000 });
  if (!ctx.COURSE || typeof ctx.COURSE !== 'object') throw new Error('course.js did not assign window.COURSE');
  return JSON.parse(JSON.stringify(ctx.COURSE));
}

export function fallbackLoadPracticeJs(path) {
  const calls = [];
  const practice = (n, items) => { calls.push({ n, items: JSON.parse(JSON.stringify(items ?? null)) }); };
  const Learncraft = new Proxy({ practice }, { get: (t, k) => (k in t ? t[k] : () => {}) });
  const ctx = stubGlobals({ Learncraft });
  vm.createContext(ctx);
  vm.runInContext(readFileSync(path, 'utf8'), ctx, { filename: path, timeout: 1000 });
  return calls;
}

async function loadCourse(path, support) {
  if (support.schemaLib?.loadCourseJs) return await support.schemaLib.loadCourseJs(path);
  return fallbackLoadCourseJs(path);
}
async function loadPractice(path, support) {
  const calls = support.schemaLib?.loadPracticeJs ? await support.schemaLib.loadPracticeJs(path) : fallbackLoadPracticeJs(path);
  // D's loader returns { lesson, items }; the documented interface said { n, items }. Accept both.
  return calls.map((c) => ({ n: c.n ?? c.lesson, items: c.items }));
}

// ---------------------------------------------------------------------------------------------
// Tiny HTML helpers (regex based; good enough for agent-written lesson files, not a parser).
// ---------------------------------------------------------------------------------------------
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** Removes comments and the bodies of <script>/<style>, keeping their start tags. */
export function stripHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length))
    .replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi, (m, open, _t, body, close) => open + ' '.repeat(body.length) + close);
}

export function parseAttrs(src = '') {
  const attrs = {};
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(src))) attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
}

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k[0] === '#') return String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[k];
  });
}

/** Every start tag: { name, attrs, start, end } (end = index after '>'). */
export function tags(html) {
  const out = [];
  const re = /<([a-zA-Z][\w:-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
  let m;
  while ((m = re.exec(html))) out.push({ name: m[1].toLowerCase(), attrs: parseAttrs(m[2]), start: m.index, end: re.lastIndex, raw: m[0] });
  return out;
}

/** Inner HTML of the element whose start tag is at `tag` (matching depth of same-name tags). */
export function innerOf(html, tag) {
  if (VOID.has(tag.name) || tag.raw.endsWith('/>')) return '';
  const re = new RegExp(`<(/?)${tag.name}\\b[^>]*>`, 'gi');
  re.lastIndex = tag.end;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    if (m[1]) { if (--depth === 0) return html.slice(tag.end, m.index); } else if (!m[0].endsWith('/>')) depth++;
  }
  return html.slice(tag.end);
}

export const textOf = (h) => decodeEntities(h.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
export const hasClass = (t, c) => (t.attrs.class || '').split(/\s+/).includes(c);

// ---------------------------------------------------------------------------------------------
// RESOURCES.md
// ---------------------------------------------------------------------------------------------
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function validDate(s) {
  const m = DATE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Parses `- [S3] …` entries (contract §6). Returns { entries, legacyLinks }. */
export function parseResources(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let legacyLinks = 0, cur = null;
  lines.forEach((line, i) => {
    const m = /^\s*[-*]\s+\[(S\d+)\]\s*(.*)$/i.exec(line);
    if (m) {
      cur = { id: m[1].toUpperCase(), line: i + 1, text: m[2] };
      entries.push(cur);
      return;
    }
    if (/^\s*[-*]\s+/.test(line) || /^#/.test(line) || !line.trim()) {
      if (/^\s*[-*]\s+\[[^\]]+\]\(/.test(line)) legacyLinks++;
      cur = null;
      return;
    }
    if (cur) cur.text += '\n' + line;
  });
  for (const e of entries) {
    const v = /\bverified(?:-fetched)?\s+(\d{4}-\d{2}-\d{2})\b/i.exec(e.text);
    const u = /\b(?:unverified|from-memory-unverified|unavailable)\s*\(([^)]*)\)/i.exec(e.text);
    e.status = v && !/\bunverified\b[^\n(]*$/.test(e.text.slice(0, v.index)) ? 'verified' : u ? 'unverified' : null;
    e.date = v?.[1] ?? null;
    e.reason = u?.[1]?.trim() ?? null;
    e.url = /\]\((https?:[^)\s]+)\)/.exec(e.text)?.[1] ?? null;
    e.tier = /\b(?:tier\s*)?(T[1-5])\b/.exec(e.text)?.[1] ?? null;
  }
  return { entries, legacyLinks };
}

// ---------------------------------------------------------------------------------------------
// Practice items (contract §4)
// ---------------------------------------------------------------------------------------------
const ITEM_ID = /^[a-z0-9][a-z0-9-]*$/;
const ITEM_TYPES = new Set(['choice', 'recall', 'order', 'fade']);
export const OPTION_RATIO_MAX = 1.6;

function structuralItemProblems(item) {
  const p = [];
  if (!item || typeof item !== 'object') return ['item is not an object'];
  if (typeof item.id !== 'string') p.push('missing string id');
  if (!ITEM_TYPES.has(item.type)) p.push(`type must be one of ${[...ITEM_TYPES].join(', ')}`);
  if (typeof item.prompt !== 'string' || !item.prompt.trim()) p.push('missing prompt');
  if (item.type === 'choice' && !Array.isArray(item.options)) p.push('choice item needs options[]');
  if (item.type === 'recall' && !(Array.isArray(item.accept) && item.accept.length)) p.push('recall item needs accept[] with at least one answer');
  if (item.type === 'order' && !(Array.isArray(item.steps) && item.steps.length >= 2)) p.push('order item needs steps[] with at least two steps');
  if (item.type === 'fade') {
    if (typeof item.template !== 'string') p.push('fade item needs a template');
    else {
      const names = [...item.template.matchAll(/\{\{\s*([^}\s]+)\s*\}\}/g)].map((m) => m[1]);
      if (!names.length) p.push('fade template has no {{blank}}');
      for (const n of names) if (!item.blanks || !Array.isArray(item.blanks[n]) || !item.blanks[n].length) p.push(`fade blank {{${n}}} has no accepted answers`);
    }
  }
  return p;
}

// ---------------------------------------------------------------------------------------------
// The linter
// ---------------------------------------------------------------------------------------------
const listHtml = (ws, d) => (existsSync(join(ws, d)) ? readdirSync(join(ws, d)).filter((f) => f.endsWith('.html')).sort().map((f) => `${d}/${f}`) : []);
const toPosix = (p) => p.split(sep).join('/');

/**
 * Inspects a course workspace. Returns the findings plus everything parsed, for scorers.
 * @returns {Promise<{findings, course, lessons, pages, practice, resources, support}>}
 */
export async function inspectWorkspace(wsDir) {
  const ws = resolve(wsDir);
  const findings = [];
  const add = (level, rule, file, message) => findings.push({ level, rule, file, message });
  const support = await loadSupport();
  const validate = support.schemaLib?.validate;
  const schemaNote = () => support.notes.join('; ') || 'validator unavailable';

  // course.js -------------------------------------------------------------------------------
  const coursePath = join(ws, 'assets', 'course.js');
  let course = null;
  if (!existsSync(coursePath)) add('error', 'course-missing', 'assets/course.js', 'No assets/course.js: this is not a course workspace, or the manifest was deleted');
  else {
    try { course = await loadCourse(coursePath, support); } catch (e) { add('error', 'course-load', 'assets/course.js', `course.js did not evaluate: ${e.message}`); }
  }
  const lessonsByFile = new Map();
  const objectives = new Set();
  if (course) {
    const v2 = course.schemaVersion === 2;
    if (validate && support.schemas.course) {
      for (const e of validate(support.schemas.course, course)) add('error', 'course-schema', 'assets/course.js', `${e.path || '(root)'}: ${e.message}`);
    } else add('warn', 'schema-unavailable', 'assets/course.js', `JSON-Schema validation skipped (${schemaNote()}); structural rules still ran`);

    if (course.id === 'topic-slug') add('error', 'course-template-id', 'assets/course.js', "course id is still the template value 'topic-slug': progress would collide with every other course that kept it");
    else if (typeof course.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(course.id)) add('warn', 'course-id-format', 'assets/course.js', `course id ${JSON.stringify(course.id)} is not a lowercase slug`);

    const ms = Array.isArray(course.milestones) ? course.milestones : [];
    if (!ms.length) add('error', 'milestone-none', 'assets/course.js', 'course has no milestones');
    const mIds = new Set();
    for (const m of ms) {
      if (mIds.has(m?.id)) add('error', 'milestone-id-dup', 'assets/course.js', `milestone id "${m.id}" appears more than once`);
      mIds.add(m?.id);
      if (!['mastered', 'in-progress', 'locked'].includes(m?.status)) add('error', 'milestone-status', 'assets/course.js', `milestone "${m?.id}": status must be mastered | in-progress | locked, got ${JSON.stringify(m?.status)}`);
      if (m?.status === 'mastered') {
        const ev = [].concat(m.evidence ?? []).filter(Boolean);
        if (!ev.length) add('error', 'evidence-missing', 'assets/course.js', `milestone "${m.id}" is mastered but has no evidence learning record`);
        for (const e of ev) {
          // 'LR-0003' or a path 'learning-records/0003-slug.md' (both forms are documented in course.js)
          const mm = /^LR-(\d{4})$/.exec(e);
          if (!mm && /^learning-records\/\d{4}-[^/]+\.md$/.test(e)) {
            if (!existsSync(join(ws, e))) add('error', 'evidence-record-missing', 'assets/course.js', `milestone "${m.id}" cites ${e}, which does not exist`);
            continue;
          }
          if (!mm) { add('error', 'evidence-format', 'assets/course.js', `milestone "${m.id}": evidence ${JSON.stringify(e)} is not LR-NNNN or learning-records/NNNN-slug.md`); continue; }
          const dir = join(ws, 'learning-records');
          const hit = existsSync(dir) && readdirSync(dir).some((f) => f.startsWith(`${mm[1]}-`) && f.endsWith('.md'));
          if (!hit) add('error', 'evidence-record-missing', 'assets/course.js', `milestone "${m.id}" cites ${e}, but learning-records/${mm[1]}-*.md does not exist`);
        }
      }
    }

    const ls = Array.isArray(course.lessons) ? course.lessons : [];
    const seenN = new Set();
    ls.forEach((l, i) => {
      if (seenN.has(l?.n)) add('error', 'lesson-numbering', 'assets/course.js', `lesson number ${l?.n} appears more than once`);
      seenN.add(l?.n);
      if (l?.n !== i + 1) add('error', 'lesson-numbering', 'assets/course.js', `lessons must be numbered 1..N in order; position ${i + 1} has n=${JSON.stringify(l?.n)}`);
      for (const mid of l?.milestones ?? []) if (!mIds.has(mid)) add('error', 'lesson-milestone-ref', 'assets/course.js', `lesson ${l.n} references milestone "${mid}", which does not exist`);
      if (!(l?.milestones ?? []).length) add('warn', 'lesson-milestone-ref', 'assets/course.js', `lesson ${l?.n} builds no milestone`);
      const fm = /^lessons\/(\d{4})-[a-z0-9-]+\.html$/.exec(l?.file ?? '');
      if (!fm) add('warn', 'lesson-file-pattern', 'assets/course.js', `lesson ${l?.n}: file ${JSON.stringify(l?.file)} should look like lessons/NNNN-slug.html`);
      else if (+fm[1] !== l.n) add('warn', 'lesson-file-pattern', 'assets/course.js', `lesson ${l.n}: file number ${fm[1]} does not match n`);
      if (typeof l?.file === 'string') lessonsByFile.set(l.file, l);
      if (v2 || l?.objectives) {
        const obs = Array.isArray(l?.objectives) ? l.objectives : [];
        if (v2 && (obs.length < 1 || obs.length > 3)) add('warn', 'objective-count', 'assets/course.js', `lesson ${l?.n} has ${obs.length} objectives (plan for 1–3)`);
        for (const o of obs) {
          if (objectives.has(o?.id)) add('error', 'objective-id-dup', 'assets/course.js', `objective id "${o?.id}" appears more than once`);
          objectives.add(o?.id);
          if (typeof o?.id === 'string' && !o.id.startsWith(`l${l.n}.`)) add('warn', 'objective-id-prefix', 'assets/course.js', `objective "${o.id}" should start with "l${l.n}." (the store maps objectives to lessons by this prefix)`);
        }
      }
      if (l?.practice && !existsSync(join(ws, l.practice))) add('error', 'practice-file-missing', 'assets/course.js', `lesson ${l.n} lists practice ${l.practice}, which does not exist`);
    });
    // a planned lesson that is missing while a later one exists is a gap
    const lastWritten = Math.max(0, ...ls.filter((l) => typeof l?.file === 'string' && existsSync(join(ws, l.file))).map((l) => l.n));
    for (const l of ls) if (typeof l?.file === 'string' && l.n < lastWritten && !existsSync(join(ws, l.file))) add('warn', 'lesson-file-missing', 'assets/course.js', `lesson ${l.n} (${l.file}) is listed but missing, while later lessons exist`);
  }

  // RESOURCES.md --------------------------------------------------------------------------------
  let resources = null;
  const resPath = join(ws, 'RESOURCES.md');
  if (existsSync(resPath)) {
    resources = parseResources(readFileSync(resPath, 'utf8'));
    const ids = new Map();
    for (const e of resources.entries) {
      if (ids.has(e.id)) add('error', 'resource-id-dup', 'RESOURCES.md', `${e.id} is defined twice (lines ${ids.get(e.id)} and ${e.line})`);
      ids.set(e.id, e.line);
      if (!e.status) add('error', 'resource-status', 'RESOURCES.md', `line ${e.line}: ${e.id} has no status: write "verified YYYY-MM-DD" or "unverified (reason)"`);
      else if (e.status === 'verified' && !validDate(e.date)) add('error', 'resource-status', 'RESOURCES.md', `line ${e.line}: ${e.id} has an invalid verification date ${e.date}`);
      else if (e.status === 'verified' && e.date > new Date().toISOString().slice(0, 10)) add('warn', 'resource-status', 'RESOURCES.md', `line ${e.line}: ${e.id} is verified on a future date ${e.date}`);
      else if (e.status === 'unverified' && !e.reason) add('error', 'resource-status', 'RESOURCES.md', `line ${e.line}: ${e.id} is unverified without a reason`);
    }
    if (!resources.entries.length && resources.legacyLinks) add('warn', 'resource-legacy', 'RESOURCES.md', `${resources.legacyLinks} source(s) without [Sn] ids or status (pre-v2 format); claims cannot be traced to them`);
  }

  // practice files ------------------------------------------------------------------------------
  const practice = new Map(); // lesson n -> items
  const itemIds = new Map();
  const lessonsDir = join(ws, 'lessons');
  const practiceFiles = existsSync(lessonsDir) ? readdirSync(lessonsDir).filter((f) => /\.practice\.js$/.test(f)).sort() : [];
  for (const f of practiceFiles) {
    const rel = `lessons/${f}`;
    let calls;
    try { calls = await loadPractice(join(lessonsDir, f), support); } catch (e) { add('error', 'practice-load', rel, `did not evaluate: ${e.message}`); continue; }
    if (!calls.length) add('error', 'practice-load', rel, 'never calls Learncraft.practice(n, [...])');
    const fileN = /^(\d{4})\.practice\.js$/.exec(f)?.[1];
    for (const { n, items } of calls) {
      if (fileN && n !== +fileN) add('error', 'practice-lesson-mismatch', rel, `calls Learncraft.practice(${n}, …) but the file is for lesson ${+fileN}`);
      if (!Array.isArray(items)) { add('error', 'practice-schema', rel, 'second argument must be an array of items'); continue; }
      if (validate && support.schemas.practice) for (const e of validate(support.schemas.practice, items)) add('error', 'practice-schema', rel, `${e.path || '(root)'}: ${e.message}`);
      items.forEach((it, i) => {
        const where = `item ${it?.id ?? '#' + (i + 1)}`;
        for (const p of structuralItemProblems(it)) add('error', 'practice-item', rel, `${where}: ${p}`);
        if (typeof it?.id === 'string') {
          if (!ITEM_ID.test(it.id)) add('error', 'item-id-format', rel, `${where}: id must match ${ITEM_ID}`);
          if (itemIds.has(it.id)) add('error', 'item-id-dup', rel, `${where}: id also used in ${itemIds.get(it.id)} (ids are course-wide)`);
          else itemIds.set(it.id, rel);
        }
        if (objectives.size && it?.objective && !objectives.has(it.objective)) add('error', 'item-objective-unknown', rel, `${where}: objective "${it.objective}" is not declared in course.js`);
        if (it?.type === 'choice' && Array.isArray(it.options)) {
          const correct = it.options.filter((o) => o && o.correct === true).length;
          if (correct !== 1) add('error', 'choice-correct', rel, `${where}: exactly one option must be correct, found ${correct}`);
          if (it.options.length < 2) add('error', 'choice-correct', rel, `${where}: a choice needs at least two options`);
          const lens = it.options.map((o) => String(o?.text ?? '').trim().length).filter((x) => x > 0);
          if (lens.length >= 2) {
            const ratio = Math.max(...lens) / Math.min(...lens);
            if (ratio > OPTION_RATIO_MAX) add('warn', 'choice-option-parity', rel, `${where}: option lengths vary ${ratio.toFixed(2)}× (max/min chars > ${OPTION_RATIO_MAX}); length can give the answer away`);
          }
        }
      });
      practice.set(n, (practice.get(n) ?? []).concat(items));
    }
  }

  // pages ---------------------------------------------------------------------------------------
  const resourceIds = new Set(resources?.entries.map((e) => e.id));
  const pages = [];
  const htmlFiles = ['index.html', 'review.html', ...listHtml(ws, 'lessons'), ...listHtml(ws, 'reference')].filter((p) => existsSync(join(ws, p)));
  const listedFiles = new Set(lessonsByFile.keys());
  const legacyIds = new Map();
  for (const rel of htmlFiles) {
    const raw = readFileSync(join(ws, rel), 'utf8');
    const html = stripHtml(raw);
    const all = tags(html);
    const isLesson = rel.startsWith('lessons/');
    const page = { file: rel, raw, html, tags: all, isLesson };
    pages.push(page);

    const htmlTag = all.find((t) => t.name === 'html');
    if (!htmlTag?.attrs.lang) add('error', 'html-lang', rel, '<html> has no lang attribute (screen readers and narration need the course language)');
    if (!all.some((t) => t.name === 'meta' && /^content-security-policy$/i.test(t.attrs['http-equiv'] || ''))) {
      if (course?.schemaVersion === 2) add('warn', 'csp-missing', rel, 'no Content-Security-Policy <meta>; the page shell in templates/ has one');
    }

    // scripts and handlers (security) ----------------------------------------------------------
    for (const t of all) {
      for (const a of Object.keys(t.attrs)) {
        if (/^on[a-z]+$/.test(a)) add('error', 'inline-handler', rel, `<${t.name} ${a}=…> inline event handler: use a component in assets/ (inline handlers run with page privileges and break the CSP)`);
      }
      for (const a of ['href', 'src', 'xlink:href', 'action', 'formaction']) {
        if (t.attrs[a] && /^\s*javascript:/i.test(t.attrs[a])) add('error', 'javascript-url', rel, `<${t.name} ${a}="javascript:…">`);
      }
      if (t.name !== 'script') continue;
      const src = t.attrs.src;
      if (src === undefined) {
        const type = (t.attrs.type || '').toLowerCase();
        if (!type || /javascript|module/.test(type)) add('warn', 'inline-script', rel, 'inline <script>: move it into a file next to the lesson or into assets/ (a CSP with script-src \'self\' blocks it)');
        continue;
      }
      if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(src) || /^[a-z][a-z0-9+.-]*:/i.test(src)) {
        add('error', 'script-external', rel, `<script src="${src}">: courses load no remote scripts (they must work offline and must not run third-party code)`);
        continue;
      }
      const target = toPosix(relative(ws, resolve(dirname(join(ws, rel)), src.split(/[?#]/)[0])));
      const pageDir = toPosix(dirname(rel));
      const ok = target.startsWith('assets/') || posix.dirname(target) === pageDir;
      if (target.startsWith('..')) add('error', 'script-path', rel, `<script src="${src}"> points outside the workspace`);
      else if (!ok) add('error', 'script-path', rel, `<script src="${src}">: scripts load only from assets/ or the page's own folder`);
      else if (!existsSync(join(ws, target))) add('error', 'script-missing', rel, `<script src="${src}"> does not exist`);
    }

    // citations ------------------------------------------------------------------------------
    for (const t of all) {
      if (!('data-src' in t.attrs)) continue;
      const ids = t.attrs['data-src'].split(/[\s,]+/).filter(Boolean);
      if (!resources) { add('error', 'cite-no-resources', rel, `cites ${ids.join(' ')} but the workspace has no RESOURCES.md`); continue; }
      for (const id of ids) if (!resourceIds.has(id.toUpperCase())) add('error', 'cite-unresolved', rel, `data-src="${id}" has no [${id.toUpperCase()}] entry in RESOURCES.md`);
    }

    // legacy practice markup --------------------------------------------------------------------
    for (const t of all.filter((t) => hasClass(t, 'quiz-q') || hasClass(t, 'fade'))) {
      const id = t.attrs['data-id'];
      if (!id) add('warn', 'legacy-item-id', rel, `legacy .${hasClass(t, 'quiz-q') ? 'quiz-q' : 'fade'} without data-id: its progress is keyed by position and moves if the lesson is edited`);
      else {
        if (legacyIds.has(id) || itemIds.has(id)) add('error', 'item-id-dup', rel, `practice id "${id}" is used more than once in the course`);
        legacyIds.set(id, rel);
      }
      if (hasClass(t, 'quiz-q')) {
        const inner = innerOf(html, t);
        const opts = tags(inner).filter((b) => b.name === 'button').map((b) => textOf(innerOf(inner, b)));
        const ans = (t.attrs['data-answer'] ?? '').trim();
        const hits = opts.filter((o) => o === ans).length;
        if (hits !== 1) add('error', 'choice-correct', rel, `quiz "${textOf(inner).slice(0, 50)}…": data-answer "${ans}" matches ${hits} option(s); it must match exactly one`);
        const lens = opts.map((o) => o.length).filter(Boolean);
        if (lens.length >= 2 && Math.max(...lens) / Math.min(...lens) > OPTION_RATIO_MAX) add('warn', 'choice-option-parity', rel, `quiz "${textOf(inner).slice(0, 50)}…": option lengths vary ${(Math.max(...lens) / Math.min(...lens)).toFixed(2)}×`);
      }
    }

    if (!isLesson) continue;
    // lesson-only rules --------------------------------------------------------------------------
    const lesson = lessonsByFile.get(rel);
    if (course && !listedFiles.has(rel)) add('warn', 'lesson-unlisted', rel, 'this lesson is not listed in assets/course.js, so its header and dashboard entry will not render');
    const body = all.find((t) => t.name === 'body');
    const dl = body?.attrs['data-lesson'];
    if (dl === undefined) add('error', 'lesson-data-lesson', rel, '<body> has no data-lesson attribute');
    else if (lesson && +dl !== lesson.n) add('error', 'lesson-data-lesson', rel, `<body data-lesson="${dl}"> but course.js lists this file as lesson ${lesson.n}`);

    const ch = all.find((t) => t.attrs.id === 'challenge');
    if (!ch) add('error', 'challenge-missing', rel, 'no #challenge element: every lesson ends with a challenge');
    else {
      const inner = innerOf(html, ch);
      const ct = tags(inner);
      const isList = (t) => /^(ul|ol)$/.test(t.name);
      let critInner = null, how = '.criteria list';
      const critList = ct.find((t) => hasClass(t, 'criteria') && isList(t));
      if (critList) critInner = innerOf(inner, critList);
      else {
        const box = ct.find((t) => hasClass(t, 'criteria'));
        const boxInner = box ? innerOf(inner, box) : '';
        const l = tags(boxInner).find(isList);
        if (l) critInner = innerOf(boxInner, l);
      }
      if (critInner == null) {
        const at = inner.search(/pass criteria/i);
        if (at >= 0) {
          const after = tags(inner).find((t) => /^(ul|ol)$/.test(t.name) && t.start > at);
          if (after) { critInner = innerOf(inner, after); how = 'list after "Pass criteria"'; }
        }
      }
      if (critInner == null) add('warn', 'challenge-criteria', rel, '#challenge has no pass-criteria list (<ul class="criteria"> or a list after a "Pass criteria" heading)');
      else {
        const n = tags(critInner).filter((t) => t.name === 'li').length;
        if (n < 2 || n > 4) add('warn', 'challenge-criteria', rel, `#challenge ${how} has ${n} item(s); write 2–4 observable pass criteria`);
      }
    }
  }
  if (course) {
    for (const [file, l] of lessonsByFile) if (existsSync(join(ws, file)) && !htmlFiles.includes(file)) add('warn', 'lesson-file-pattern', 'assets/course.js', `lesson ${l.n} file ${file} is outside lessons/`);
  }

  return { findings, course, pages, practice, resources, objectives, itemIds, legacyIds, support, ws };
}

export async function lintWorkspace(wsDir) {
  return (await inspectWorkspace(wsDir)).findings;
}

export function formatFindings(findings) {
  if (!findings.length) return '  lint: clean';
  return findings.map((f) => `  ${f.level === 'error' ? '✗' : '!'} [${f.rule}] ${f.file}: ${f.message}`).join('\n');
}

// CLI ------------------------------------------------------------------------------------------
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const ws = args.find((a) => !a.startsWith('--')) ?? '.';
  if (!existsSync(ws) || !statSync(ws).isDirectory()) { console.error(`Not a directory: ${ws}`); process.exit(2); }
  const findings = await lintWorkspace(ws);
  if (args.includes('--json')) console.log(JSON.stringify(findings, null, 2));
  else console.log(formatFindings(findings));
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0);
}
