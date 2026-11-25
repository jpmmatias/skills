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
// course.js and *.practice.js are JavaScript, so loading them runs them. load-data.mjs does that in a
// separate, killable Node process with an empty environment and a vm context that reaches no host
// object (security review SR-02). That reduces the risk of a hostile file; it does not remove it:
// run this only on your own workspace or this repository, never on a workspace you do not trust.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCourseJs, loadPracticeJs, loadDataFiles, readWorkspaceFile, checkWorkspaceFile } from './load-data.mjs';

export { loadCourseJs, loadPracticeJs, loadDataFiles, readWorkspaceFile, checkWorkspaceFile };

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
// Loaders: one implementation for every tool (load-data.mjs; scripts/lib/schema.mjs re-exports it).
// ---------------------------------------------------------------------------------------------
/** @deprecated kept for callers of the old fallback: same as loadCourseJs, but throws when COURSE is not set. */
export function fallbackLoadCourseJs(path) {
  const c = loadCourseJs(path);
  if (!c || typeof c !== 'object') throw new Error('course.js did not assign window.COURSE');
  return c;
}
/** @deprecated kept for callers of the old fallback: [{ n, items }]. */
export function fallbackLoadPracticeJs(path) {
  return loadPracticeJs(path).map((c) => ({ n: c.lesson, items: c.items }));
}

// ---------------------------------------------------------------------------------------------
// Tiny HTML helpers (regex based; good enough for agent-written lesson files, not a parser).
// ---------------------------------------------------------------------------------------------
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/**
 * Removes comments and the bodies of HTML <script>/<style>/raw-text elements, keeping their start tags. Comments end
 * as the HTML tokenizer ends them (`<!-->`, `<!--->`, `-->` and `--!>`), and <script>/<style> inside <svg> or <math>
 * are NOT blanked (there they are ordinary elements whose children are parsed as markup). This is only the fast first
 * pass: check.mjs audits the DOM Chromium actually built (NEW-01).
 */
export function stripHtml(html) {
  let out = '', i = 0, foreign = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { out += html.slice(i); break; }
    out += html.slice(i, lt);
    if (html.startsWith('<!--', lt)) {
      let end;
      if (html.startsWith('>', lt + 4)) end = lt + 5;
      else if (html.startsWith('->', lt + 4)) end = lt + 6;
      else {
        const a = html.indexOf('-->', lt + 4), b = html.indexOf('--!>', lt + 4);
        end = a < 0 && b < 0 ? n : b >= 0 && (a < 0 || b < a) ? b + 4 : a + 3;
      }
      out += ' '.repeat(end - lt); i = end; continue;
    }
    const m = /^<(\/?)([a-zA-Z][^\s/>]*)/.exec(html.slice(lt, lt + 64));
    const name = m ? m[2].toLowerCase() : '';
    if (m && (name === 'svg' || name === 'math')) foreign = Math.max(0, foreign + (m[1] ? -1 : 1));
    if (m && !m[1] && !foreign && /^(script|style|xmp|noembed|noframes|iframe|textarea|title|noscript)$/.test(name)) {
      const gt = html.indexOf('>', lt);
      const close = gt < 0 ? -1 : html.slice(gt + 1).search(new RegExp(`</${name}[\\s/>]`, 'i'));
      if (gt >= 0 && close >= 0) {
        const bodyStart = gt + 1, bodyEnd = gt + 1 + close;
        const body = html.slice(bodyStart, bodyEnd);
        // textarea/title/noscript bodies stay visible as text to the later checks (only markup-free text is blanked)
        out += html.slice(lt, bodyStart) + (/^(textarea|title)$/.test(name) ? body.replace(/</g, ' ') : name === 'noscript' ? body : ' '.repeat(body.length));
        i = bodyEnd; continue;
      }
    }
    out += '<'; i = lt + 1;
  }
  return out;
}

// Start-tag tokenizer following the HTML spec's attribute rules closely enough for security checks
// (SR-03): "/" separates attributes (<svg/onload=…>), unquoted values run to whitespace or ">", the first
// of two same-name attributes wins (as in the browser). `list` keeps every attribute, duplicates too.
function scanAttrs(html, i, attrs, list) {
  const n = html.length;
  while (i < n) {
    while (i < n && /[\s/]/.test(html[i])) i++;
    if (i >= n || html[i] === '>') break;
    let j = i + 1; // the first character may be "=" (spec: part of the name)
    while (j < n && !/[\s/>=]/.test(html[j])) j++;
    const name = html.slice(i, j).toLowerCase();
    i = j;
    while (i < n && /\s/.test(html[i])) i++;
    let value = '';
    if (html[i] === '=') {
      i++;
      while (i < n && /\s/.test(html[i])) i++;
      const q = html[i];
      if (q === '"' || q === "'") { const e = html.indexOf(q, i + 1); const end = e < 0 ? n : e; value = html.slice(i + 1, end); i = end + 1; }
      else { let e = i; while (e < n && !/[\s>]/.test(html[e])) e++; value = html.slice(i, e); i = e; }
    }
    value = decodeEntities(value);
    list.push([name, value]);
    if (!(name in attrs)) attrs[name] = value;
  }
  return i;
}

export function parseAttrs(src = '') {
  const attrs = {};
  scanAttrs(src, 0, attrs, []);
  return attrs;
}

// Every named reference that decodes to ASCII (what a scheme check needs), plus the old short list.
const NAMED = { tab: '\t', newline: '\n', excl: '!', quot: '"', num: '#', dollar: '$', percnt: '%', amp: '&', apos: "'",
  lpar: '(', rpar: ')', ast: '*', midast: '*', plus: '+', comma: ',', period: '.', sol: '/', colon: ':', semi: ';',
  lt: '<', equals: '=', gt: '>', quest: '?', commat: '@', lsqb: '[', lbrack: '[', bsol: '\\', rsqb: ']', rbrack: ']',
  hat: '^', lowbar: '_', underbar: '_', grave: '`', diacriticalgrave: '`', lcub: '{', lbrace: '{', verbar: '|', vert: '|',
  verticalline: '|', rcub: '}', rbrace: '}', nbsp: ' ', fjlig: 'fj' };
export function decodeEntities(s) {
  return String(s).replace(/&(?:#[xX]([0-9a-fA-F]{1,8})|#(\d{1,10})|([A-Za-z][A-Za-z0-9]{1,31}));?/g, (m, hx, dec, name) => {
    if (name) { const v = NAMED[name.toLowerCase()]; return v === undefined || (m.slice(-1) !== ';' && !/^(amp|lt|gt|quot|nbsp)$/i.test(name)) ? m : v; }
    const cp = hx ? parseInt(hx, 16) : parseInt(dec, 10);
    return cp > 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : '�';
  });
}

/** Every start tag: { name, attrs, all, start, end, raw } (end = index after '>'; all = every [name, value]). */
export function tags(html) {
  const out = [];
  const re = /<([a-zA-Z][^\s/>]*)/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = {}, all = [];
    let i = scanAttrs(html, re.lastIndex, attrs, all);
    const end = Math.min(html.length, i + 1);
    out.push({ name: m[1].toLowerCase(), attrs, all, start: m.index, end, raw: html.slice(m.index, end) });
    re.lastIndex = end;
  }
  return out;
}

// What the browser's URL parser sees (SR-01 normalisation): references decoded, ASCII tab/LF/CR removed,
// C0 controls and spaces trimmed. Returns { scheme, value } with scheme lower-cased ('' when relative).
export function urlScheme(v) {
  const probe = (x) => String(x).replace(/[\t\n\r]/g, '').replace(/^[\u0000- ]+|[\u0000- ]+$/g, '');
  const once = probe(v), twice = probe(decodeEntities(v));
  for (const p of [once, twice]) {
    const m = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(p);
    if (m && !/^(https?|mailto|tel)$/i.test(m[1])) return { scheme: m[1].toLowerCase(), value: p };
  }
  const m = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(once);
  return { scheme: m ? m[1].toLowerCase() : '', value: once };
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
export const PRACTICE_FILE = /^lessons\/\d{4}\.practice\.js$/;
const SAFE_REL_RAW = /^(?!\/)(?![a-z][a-z0-9+.-]*:)(?!.*(?:^|\/)\.\.(?:\/|$))[^\\\u0000-\u001f]+$/i;
/** Percent-decodes until stable (so %2e%2e and %252e%252e are seen as ..), at most 5 rounds. */
export function percentDecodeAll(s) {
  let cur = String(s);
  for (let i = 0; i < 5; i++) { let next; try { next = decodeURIComponent(cur); } catch { next = cur.replace(/%2e/gi, '.').replace(/%2f/gi, '/').replace(/%5c/gi, '\\'); } if (next === cur) break; cur = next; }
  return cur;
}
const SAFE_REL = { test: (p) => SAFE_REL_RAW.test(p) && SAFE_REL_RAW.test(percentDecodeAll(p)) };
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
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'data', 'poster', 'background', 'ping', 'cite', 'codebase', 'manifest', 'lowsrc', 'dynsrc']);
const NAV_ATTRS = new Set(['href', 'xlink:href', 'action', 'formaction']);
const EMBEDS = new Set(['object', 'embed', 'applet', 'frame', 'frameset']);

/** The template policy, exactly (NEW-01). Every v2 page must carry this and nothing else. */
export const CANONICAL_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
export function parseCsp(text) {
  const dir = new Map(), dup = [];
  for (const part of String(text || '').split(';')) {
    const [k, ...v] = part.trim().split(/\s+/).filter(Boolean);
    if (!k) continue;
    const name = k.toLowerCase();
    if (dir.has(name)) { dup.push(name); continue; } // the browser ignores a repeated directive
    dir.set(name, v.map((x) => (/^'/.test(x) ? x.toLowerCase() : x)));
  }
  return { dir, dup };
}
const CANON = parseCsp(CANONICAL_CSP).dir;
const SCRIPTISH = /^(script-src|script-src-attr|script-src-elem|default-src|worker-src|child-src|frame-src|object-src|base-uri|form-action|navigate-to|trusted-types|require-trusted-types-for)$/;

/**
 * The CSP <meta> every page must carry (the templates have it): exactly one, in <head>, before any script or
 * stylesheet, and exactly the template policy (CANONICAL_CSP). Even markup the regex lint misses cannot run under it.
 */
export function cspProblems(all, raw = null) {
  // Browsers match http-equiv exactly (ASCII case-insensitive, no trimming): a value with surrounding spaces or a
  // non-breaking space is IGNORED by the browser, so it must not satisfy this check (NEW-08). Near-misses are errors.
  const looksLike = (t) => t.name === 'meta' && /content-security-policy/i.test(t.attrs['http-equiv'] || '');
  const exact = (t) => /^content-security-policy$/i.test(t.attrs['http-equiv'] || '');
  const nearMiss = all.filter((t) => looksLike(t) && !exact(t));
  const metas = all.filter((t) => t.name === 'meta' && exact(t));
  if (!metas.length) return [{ rule: 'csp-missing', message: 'no Content-Security-Policy <meta>: copy the one from the page template (templates/*.html) into <head>' }];
  const out = [];
  if (nearMiss.length) out.push({ rule: 'csp-not-canonical', message: `http-equiv must be exactly "Content-Security-Policy" (no spaces or other characters around it); the browser ignores "${nearMiss[0].attrs['http-equiv']}"` });
  if (metas.length > 1) out.push({ rule: 'csp-duplicate', message: `${metas.length} Content-Security-Policy <meta> tags: keep exactly one, the template's` });
  const meta = metas[0];
  const early = all.find((t) => t.start < meta.start && (t.name === 'script' || t.name === 'body' || (t.name === 'link' && /stylesheet/i.test(t.attrs.rel || '')) || t.name === 'style'));
  const head = all.find((t) => t.name === 'head');
  // The meta must sit directly in <head>: inside <noscript>, <template>, <svg> or <math> the browser does not apply it (NEW-08).
  const wrapper = all.find((t) => /^(noscript|template|svg|math|object|iframe)$/.test(t.name) && t.start < meta.start && (!head || t.start > head.start));
  if (wrapper) out.push({ rule: 'csp-late', message: `the Content-Security-Policy <meta> must be a direct child of <head>; inside <${wrapper.name}> the browser ignores it` });
  if (early || (head && meta.start < head.start)) out.push({ rule: 'csp-late', message: `the Content-Security-Policy <meta> must be in <head>, before any script or stylesheet${early ? ` (found after <${early.name}>)` : ''}` });
  // Raw-text check, independent of the tag tokenizer (NEW-12): between <head> and the CSP <meta> only the template's
  // charset and viewport metas and whitespace may appear. Anything else (a script hidden from the tokenizer, an
  // element or a stray character that moves the meta out of <head>) could run, or void the CSP, before it applies.
  if (typeof raw === 'string') {
    const h = /<head(?:\s[^>]*)?>/i.exec(raw);
    const m = /<meta\s+http-equiv="Content-Security-Policy"/i.exec(raw);
    if (!h || !m || m.index < h.index) out.push({ rule: 'csp-late', message: 'the Content-Security-Policy <meta> must come right after <head> (after the charset and viewport metas only)' });
    else {
      const between = raw.slice(h.index + h[0].length, m.index)
        .replace(/<meta\s+charset="[^"<>]*"\s*\/?>/i, '')
        .replace(/<meta\s+name="viewport"\s+content="[^"<>]*"\s*\/?>/i, '');
      if (/[^ \t\r\n\f]/.test(between)) out.push({ rule: 'csp-late', message: `only <meta charset> and <meta name="viewport"> may come before the Content-Security-Policy <meta> in <head>; found ${JSON.stringify(between.trim().slice(0, 60))}` });
    }
  }
  const { dir, dup } = parseCsp(meta.attrs.content);
  const diffs = [];
  for (const [k, v] of CANON) {
    const got = dir.get(k);
    if (!got) diffs.push(`missing ${k}`);
    else if (got.slice().sort().join(' ') !== v.slice().sort().join(' ')) diffs.push(`${k} is "${got.join(' ')}" (must be "${v.join(' ')}")`);
  }
  for (const k of dir.keys()) if (!CANON.has(k)) diffs.push(`extra directive ${k}${SCRIPTISH.test(k) ? ' (relaxes or changes script rules)' : ''}`);
  for (const k of dup) diffs.push(`repeated directive ${k}`);
  if (diffs.length) out.push({ rule: 'csp-not-canonical', message: `the CSP must be exactly the template policy: ${diffs.join('; ')}. Expected: ${CANONICAL_CSP}` });
  return out;
}

/**
 * Security audit of the DOM Chromium actually built (NEW-01): the authority behind the regex lint. Runs IN THE PAGE (page.evaluate(domSecurityAudit, workspaceUrl + '/')): keep it self-contained.
 * Reports inline handlers anywhere (SVG and MathML included), scripts that are inline or not from the workspace's
 * assets/, the page's own folder or lessons/NNNN.practice.js, SVG animation of link targets, dangerous resolved URLs,
 * nested documents and navigation elements.
 */
export const domSecurityAudit = (rootUrl) => {
  const out = [];
  const short = (el) => el.outerHTML.slice(0, 100).replace(/\s+/g, ' ');
  const pageDir = new URL('.', location.href).href;
  const URLA = ['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'poster', 'background', 'ping', 'cite'];
  for (const el of document.querySelectorAll('*')) {
    const tag = el.localName.toLowerCase();
    for (const a of el.attributes) {
      const name = a.name.toLowerCase();
      if (/^on/.test(name)) out.push(`inline handler ${name} on <${tag}>: ${short(el)}`);
      if (name === 'srcdoc') out.push(`srcdoc on <${tag}>`);
      if (URLA.includes(name)) {
        let u; try { u = new URL(a.value, document.baseURI); } catch { continue; }
        const html = /^data:(text\/html|application\/xhtml)/i.test(u.href) || (/^data:image\/svg/i.test(u.href) && tag !== 'img');
        if (/^(javascript|vbscript):$/.test(u.protocol) || (u.protocol === 'data:' && (html || ['href', 'xlink:href', 'action', 'formaction'].includes(name) || /^(iframe|object|embed|frame)$/.test(tag))))
          out.push(`${u.protocol} URL in ${name} on <${tag}>: ${short(el)}`);
        if (u.protocol === 'file:' && u.host) out.push(`network path file://${u.host} in ${name} on <${tag}>`);
      }
    }
    if (/^(iframe|object|embed|frame|frameset|applet|base)$/.test(tag)) out.push(`<${tag}> element: ${short(el)}`);
    if (tag === 'meta' && /refresh/i.test(el.getAttribute('http-equiv') || '')) out.push(`<meta http-equiv="refresh">`);
    if (/^(animate|set|animatetransform|animatemotion)$/.test(tag) && /^(xlink:)?href$/i.test((el.getAttribute('attributeName') || '').trim())) out.push(`SVG <${tag}> animates ${el.getAttribute('attributeName')}`);
    if (tag === 'script') {
      const src = el.getAttribute('src');
      if (src == null) { if (el.textContent.trim()) out.push(`inline <script>${el.namespaceURI !== 'http://www.w3.org/1999/xhtml' ? ' (in ' + el.namespaceURI.split('/').pop() + ')' : ''}: ${short(el)}`); continue; }
      let u; try { u = new URL(src, document.baseURI); } catch { out.push(`script with a bad src: ${src}`); continue; }
      if (u.search || u.hash || !/\.js$/i.test(u.pathname)) { out.push(`script source is not a plain .js file: ${src}`); continue; }
      u = u.href;
      const ok = u.startsWith(rootUrl + 'assets/') || (u.startsWith(pageDir) && !u.slice(pageDir.length).includes('/')) || /^lessons\/\d{4}\.practice\.js$/.test(u.slice(rootUrl.length));
      if (!u.startsWith(rootUrl) || !ok) out.push(`script from outside assets/, the page's folder or lessons/NNNN.practice.js: ${src}`);
    }
  }
  return [...new Set(out)];
};

const listHtml = (ws, d) => (existsSync(join(ws, d)) ? readdirSync(join(ws, d)).filter((f) => f.endsWith('.html')).sort().map((f) => `${d}/${f}`) : []);

/**
 * Every page of a course workspace that the learner can open (NEW-14): all .html and .htm files, in any folder,
 * except labs/ (the learner's own runnable projects, usually served by their own tooling), node_modules and
 * dot-folders. Symbolic links are not followed. Paths are workspace-relative, POSIX style, sorted.
 */
export function findCoursePages(ws) {
  const out = [];
  const walk = (rel) => {
    let entries; try { entries = readdirSync(join(ws, rel), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { if (!e.name.startsWith('.') && e.name !== 'node_modules' && r !== 'labs') walk(r); }
      // Any non-directory entry with a page name is listed, including FIFOs and links: the safe-read layer then
      // refuses it with a reason instead of skipping it silently. Linked directories are never followed.
      else if (/\.html?$/i.test(e.name)) out.push(r);
    }
  };
  walk('');
  const first = ['index.html', 'review.html'];
  return out.sort((a, b) => (first.indexOf(a) + 1 || 9) - (first.indexOf(b) + 1 || 9) || a.localeCompare(b));
}
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
  const lessonsDir = join(ws, 'lessons');
  const practiceFiles = existsSync(lessonsDir) ? readdirSync(lessonsDir).filter((f) => /\.practice\.js$/.test(f)).sort() : [];
  // One loader process for course.js and every practice file (load-data.mjs).
  const hasCourse = existsSync(coursePath);
  const loaded = loadDataFiles([...(hasCourse ? [{ kind: 'course', path: coursePath, root: ws }] : []), ...practiceFiles.map((f) => ({ kind: 'practice', path: join(lessonsDir, f), root: ws }))]);
  const courseResult = hasCourse ? loaded.shift() : null;
  let course = null;
  if (!hasCourse) add('error', 'course-missing', 'assets/course.js', 'No assets/course.js: this is not a course workspace, or the manifest was deleted');
  else if (courseResult.error) add('error', 'course-load', 'assets/course.js', `course.js did not evaluate: ${courseResult.error}`);
  else if (!courseResult.value || typeof courseResult.value !== 'object' || Array.isArray(courseResult.value)) add('error', 'course-load', 'assets/course.js', 'course.js did not assign window.COURSE = { … }');
  else course = courseResult.value;
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
      // lessons[].practice becomes a <script src> on review.html and the dashboard: a structural rule, not only
      // the schema (skills.sh installs have no schemas), and the runtime refuses anything else (SR-04).
      if (l?.practice != null && l.practice !== false && (typeof l.practice !== 'string' || !PRACTICE_FILE.test(l.practice))) add('error', 'practice-path', 'assets/course.js', `lesson ${l?.n}: practice ${JSON.stringify(l.practice)} must match lessons/NNNN.practice.js (the runtime ignores anything else)`);
      else if (typeof l?.practice === 'string' && !existsSync(join(ws, l.practice))) add('error', 'practice-file-missing', 'assets/course.js', `lesson ${l.n} lists practice ${l.practice}, which does not exist`);
      if (typeof l?.file === 'string' && !SAFE_REL.test(l.file)) add('error', 'lesson-file-path', 'assets/course.js', `lesson ${l.n}: file ${JSON.stringify(l.file)} must be a plain relative path inside the workspace (lessons/NNNN-slug.html)`);
    });
    // a planned lesson that is missing while a later one exists is a gap
    const lastWritten = Math.max(0, ...ls.filter((l) => typeof l?.file === 'string' && existsSync(join(ws, l.file))).map((l) => l.n));
    for (const l of ls) if (typeof l?.file === 'string' && l.n < lastWritten && !existsSync(join(ws, l.file))) add('warn', 'lesson-file-missing', 'assets/course.js', `lesson ${l.n} (${l.file}) is listed but missing, while later lessons exist`);
  }

  // RESOURCES.md --------------------------------------------------------------------------------
  let resources = null;
  const resPath = join(ws, 'RESOURCES.md');
  if (existsSync(resPath)) {
    const rr = readWorkspaceFile(resPath, { root: ws });
    if (rr.error) add('error', 'unsafe-file', 'RESOURCES.md', `RESOURCES.md ${rr.error}`);
    resources = parseResources(rr.text ?? '');
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
  for (const [k, f] of practiceFiles.entries()) {
    const rel = `lessons/${f}`;
    const r = loaded[k];
    if (r.error) { add('error', 'practice-load', rel, `did not evaluate: ${r.error}`); continue; }
    const calls = (Array.isArray(r.value) ? r.value : []).map((c) => ({ n: c?.lesson, items: c?.items }));
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
  const htmlFiles = findCoursePages(ws);
  const listedFiles = new Set(lessonsByFile.keys());
  const legacyIds = new Map();
  for (const rel of htmlFiles) {
    const rd = readWorkspaceFile(join(ws, rel), { root: ws });
    if (rd.error) { add('error', 'unsafe-file', rel, `${rel} ${rd.error}`); continue; }
    const raw = rd.text;
    const html = stripHtml(raw);
    const all = tags(html);
    const isLesson = /^lessons\/[^/]+\.html$/.test(rel);
    const page = { file: rel, raw, html, tags: all, isLesson };
    pages.push(page);

    const htmlTag = all.find((t) => t.name === 'html');
    if (!htmlTag?.attrs.lang) add('error', 'html-lang', rel, '<html> has no lang attribute (screen readers and narration need the course language)');
    // v2 pages come from templates that carry the CSP: missing or weak is an error. A v1 (pre-template) course gets
    // the same findings as warnings, so an old course still opens but the gap is reported.
    const cspLevel = course && course.schemaVersion >= 2 ? 'error' : 'warn';
    for (const p of cspProblems(all, raw)) add(cspLevel, p.rule, rel, p.message + (cspLevel === 'warn' ? ' (an error from schemaVersion 2)' : ''));

    // scripts, handlers, URLs and navigation (security; SR-03) -----------------------------------
    for (const t of all) {
      for (const [a, v] of t.all) {
        if (/^on/.test(a)) add('error', 'inline-handler', rel, `<${t.name} ${a}=…> inline event handler: use a component in assets/ (inline handlers run with page privileges and break the CSP)`);
        else if (a === 'srcdoc') add('error', 'srcdoc', rel, `<${t.name} srcdoc=…> embeds a whole document (its markup can run script): link to a file instead`);
        else if (/<\/?(noscript|script|style|title|textarea|xmp|iframe|noembed|noframes|template|svg|math)[\s/>]/i.test(v)) add('error', 'markup-in-attribute', rel, `<${t.name} ${a}="…"> holds tag markup (${JSON.stringify(v.slice(0, 40))}): inside a raw-text element it becomes live markup`);
        else if (URL_ATTRS.has(a)) {
          const { scheme, value } = urlScheme(v);
          if (scheme === 'javascript' || scheme === 'vbscript') add('error', 'javascript-url', rel, `<${t.name} ${a}="${scheme}:…"> (after the browser's normalisation: ${JSON.stringify(value.slice(0, 40))})`);
          else if (scheme === 'data' && (NAV_ATTRS.has(a) || EMBEDS.has(t.name))) add('error', 'javascript-url', rel, `<${t.name} ${a}="data:…"> a data: URL here is a document that can run script`);
          else if (/\\/.test(value) || (/^\/\//.test(value) && NAV_ATTRS.has(a))) add('error', 'network-path-url', rel, `<${t.name} ${a}="${value.slice(0, 40)}">: on file:// a leading // or a backslash becomes a network path (file://host/…, SMB on Windows)`);
        }
      }
      if (EMBEDS.has(t.name)) add('error', 'embed-element', rel, `<${t.name}> is not allowed in a course page (plugins and nested documents); use <img>, <video> or a link`);
      if (t.name === 'base') add('error', 'base-element', rel, '<base> redirects every relative link and citation on the page');
      // Pages in labs/ are the learner's own projects and are not checked; opened from a lesson over file:// they would
      // share the course's storage origin (NEW-14). Link to the lab folder or its README instead.
      for (const a of ['href', 'src', 'action', 'formaction', 'data']) {
        const v = t.attrs[a];
        if (!v || /^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith('//') || v.startsWith('#')) continue;
        const target = toPosix(relative(ws, resolve(dirname(join(ws, rel)), percentDecodeAll(v.split(/[?#]/)[0]))));
        if (/^labs\/.+\.html?$/i.test(target)) add('error', 'link-unchecked-page', rel, `${a}="${v}" opens a page in labs/, which the check does not cover; link to the lab's README.md or folder instead`);
      }
      if (/^(animate|set|animatetransform|animatemotion)$/.test(t.name) && /^(xlink:)?href$/i.test((t.attrs.attributename || '').trim())) add('error', 'svg-animate-href', rel, `<${t.name} attributeName="${t.attrs.attributename}"> rewrites a link target at run time (it can become javascript:)`);
      if (t.name === 'meta' && /^refresh$/i.test(t.attrs['http-equiv'] || '')) add('error', 'meta-refresh', rel, '<meta http-equiv="refresh"> navigates the learner away without a click');
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
      const target = toPosix(relative(ws, resolve(dirname(join(ws, rel)), percentDecodeAll(src.split(/[?#]/)[0]))));
      const pageDir = toPosix(dirname(rel));
      const ok = target.startsWith('assets/') || posix.dirname(target) === pageDir;
      // Only real .js files, with no query or fragment (NEW-13): an HTML page can be valid JavaScript and load itself
      // as a script, and 'self' on file:// allows any local file.
      if (/[?#]/.test(src)) add('error', 'script-path', rel, `<script src="${src}">: no query string or fragment in script sources`);
      else if (!/\.js$/i.test(target)) add('error', 'script-path', rel, `<script src="${src}">: scripts must be .js files`);
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
