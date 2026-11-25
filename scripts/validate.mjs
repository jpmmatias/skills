#!/usr/bin/env node
// Repository validator for Learncraft. Zero dependencies (ADR-011); Node >= 20.
//
//   node scripts/validate.mjs [--json] [--strict] [--portable] [--root <dir>]
//
//   --json      machine-readable output: { ok, errors, warnings, findings: [{level, rule, file, message}] }
//   --strict    warnings fail too
//   --portable  frontmatter keys outside the Agent Skills spec are errors (claude.ai uploads, Skills API)
//   --root      validate another tree (the tests use fixture repositories)
//
// Exit code 1 when any error is found (or any warning under --strict). See CONTRIBUTING.md.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, posix, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseFrontmatter, SPEC_SKILL_KEYS, CLAUDE_SKILL_KEYS, AGENT_KEYS, AGENT_IGNORED_KEYS } from './lib/frontmatter.mjs';
import { anchors, links } from './lib/markdown.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['.git', 'node_modules', '.check', '.review']);
const SCHEMA_KEYWORDS = new Set([
  // validation subset (ADR-011)
  'type', 'required', 'properties', 'additionalProperties', 'enum', 'const', 'pattern', 'items', 'minItems', 'maxItems',
  'minimum', 'maximum', 'minLength', 'maxLength', 'oneOf', 'anyOf', '$ref', 'uniqueItems', 'patternProperties',
  // annotations (ignored by validators)
  '$schema', '$id', '$comment', 'title', 'description', 'default', 'examples', '$defs', 'definitions', 'format', 'deprecated', 'readOnly',
]);
export const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SCHEMASTORE = 'https://json.schemastore.org/claude-code-marketplace.json';

const toPosix = (p) => p.split(sep).join('/');

// Fixture trees are deliberately broken; they are validated by the tests, not as part of the repo.
const EXCLUDE = ['tests/fixtures/', 'evaluations/fixtures/'];

function walk(dir, root, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (EXCLUDE.some((x) => toPosix(relative(root, p) + '/').startsWith(x))) continue;
    if (e.isDirectory()) walk(p, root, out);
    else out.push(toPosix(relative(root, p)));
  }
  return out;
}

export async function validateRepo(rootDir, opts = {}) {
  const root = resolve(rootDir);
  const findings = [];
  const add = (level, rule, file, message) => findings.push({ level, rule, file, message });
  const files = walk(root, root);
  const read = (f) => readFileSync(join(root, f), 'utf8');

  // 1. JSON parses ------------------------------------------------------------------------------
  const json = new Map();
  for (const f of files.filter((f) => f.endsWith('.json'))) {
    try { json.set(f, JSON.parse(read(f))); } catch (e) { add('error', 'json-parse', f, e.message); }
  }

  // 2. SKILL.md frontmatter ----------------------------------------------------------------------
  const skillDirs = existsSync(join(root, 'skills')) ? readdirSync(join(root, 'skills'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
  const skills = new Map();
  for (const name of skillDirs) {
    const f = `skills/${name}/SKILL.md`;
    if (!existsSync(join(root, f))) { add('error', 'skill-missing', `skills/${name}`, 'skill folder has no SKILL.md'); continue; }
    const text = read(f);
    const fm = parseFrontmatter(text);
    skills.set(name, { file: f, fm, text });
    if (!fm.data) { add('error', 'frontmatter', f, 'no YAML frontmatter (--- … ---) at the top'); continue; }
    if (fm.error) add('error', 'frontmatter', f, fm.error);
    const d = fm.data;
    if (typeof d.name !== 'string' || !d.name) add('error', 'skill-name', f, 'frontmatter has no name');
    else {
      if (d.name !== name) add('error', 'skill-name', f, `name "${d.name}" does not match its folder "${name}"`);
      if (d.name.length > 64) add('error', 'skill-name', f, `name is ${d.name.length} chars (max 64)`);
      if (!NAME_RE.test(d.name)) add('error', 'skill-name', f, `name "${d.name}" must be lowercase letters, digits and single hyphens`);
    }
    if (typeof d.description !== 'string' || !d.description.trim()) add('error', 'skill-description', f, 'frontmatter has no description');
    else {
      if (d.description.length > 1024) add('error', 'skill-description', f, `description is ${d.description.length} chars (max 1024)`);
      const listing = d.description.length + (typeof d.when_to_use === 'string' ? d.when_to_use.length : 0);
      if (listing > 1536) add('warn', 'skill-description', f, `description + when_to_use is ${listing} chars; Claude Code truncates the listing at 1536`);
    }
    if (typeof d.compatibility === 'string' && d.compatibility.length > 500) add('error', 'skill-frontmatter', f, 'compatibility is longer than 500 chars');
    for (const k of Object.keys(d)) {
      if (SPEC_SKILL_KEYS.includes(k)) continue;
      if (CLAUDE_SKILL_KEYS.includes(k)) {
        if (opts.portable) add('error', 'skill-frontmatter', f, `"${k}" is not an Agent Skills spec field; claude.ai uploads and the Skills API reject it`);
        continue;
      }
      add('warn', 'skill-frontmatter', f, `unknown frontmatter field "${k}"`);
    }
    const nLines = text.split('\n').length;
    if (nLines > 500) add('warn', 'skill-size', f, `${nLines} lines; keep SKILL.md under 500 and move detail into references`);
  }

  // 3. marketplace.json -------------------------------------------------------------------------
  const mpFile = '.claude-plugin/marketplace.json';
  const mp = json.get(mpFile);
  if (!existsSync(join(root, mpFile))) add('warn', 'marketplace', mpFile, 'no marketplace manifest');
  else if (mp) {
    if (mp.$schema && mp.$schema !== SCHEMASTORE) add('warn', 'marketplace-schema-url', mpFile, `$schema should be ${SCHEMASTORE} (the anthropic.com URL returns 404)`);
    if (typeof mp.name !== 'string' || !mp.name) add('error', 'marketplace', mpFile, 'missing name');
    if (!mp.owner?.name) add('error', 'marketplace', mpFile, 'missing owner.name');
    const plugins = Array.isArray(mp.plugins) ? mp.plugins : [];
    if (!plugins.length) add('error', 'marketplace', mpFile, 'plugins[] is empty or missing');
    const names = new Set();
    const listed = new Set();
    for (const p of plugins) {
      const who = `plugin "${p?.name}"`;
      if (typeof p?.name !== 'string' || !NAME_RE.test(p.name)) add('error', 'marketplace-plugin', mpFile, `${who}: name must be a lowercase-hyphen identifier`);
      if (names.has(p?.name)) add('error', 'marketplace-plugin', mpFile, `${who}: duplicate plugin name`);
      names.add(p?.name);
      const src = typeof p?.source === 'string' ? p.source : null;
      if (src !== null && src !== '.' && !src.startsWith('./')) add('error', 'marketplace-plugin', mpFile, `${who}: a relative source must be "." or start with "./"`);
      if (src && src.split('/').includes('..')) add('error', 'marketplace-plugin', mpFile, `${who}: source must not contain ".."`);
      const base = src ? join(root, src) : root;
      if (src && !existsSync(base)) add('error', 'marketplace-plugin', mpFile, `${who}: source ${src} does not exist`);
      for (const s of [].concat(p?.skills ?? [])) {
        const dir = join(base, s);
        if (!existsSync(dir) || !statSync(dir).isDirectory()) add('error', 'marketplace-skill-path', mpFile, `${who}: skills path ${s} does not exist`);
        else if (!existsSync(join(dir, 'SKILL.md'))) add('error', 'marketplace-skill-path', mpFile, `${who}: ${s} has no SKILL.md`);
        else listed.add(toPosix(relative(root, dir)));
      }
      for (const a of [].concat(p?.agents ?? [])) {
        const file = join(base, a);
        if (!existsSync(file) || !statSync(file).isFile()) { add('error', 'marketplace-agent-path', mpFile, `${who}: agents path ${a} is not a file`); continue; }
        if (extname(file) !== '.md') add('error', 'marketplace-agent-path', mpFile, `${who}: agent ${a} must be a .md file`);
        const rel = toPosix(relative(root, file));
        const fm = parseFrontmatter(readFileSync(file, 'utf8'));
        if (!fm.data) { add('error', 'agent-frontmatter', rel, 'agent file has no frontmatter'); continue; }
        if (!fm.data.name) add('error', 'agent-frontmatter', rel, 'agent has no name');
        else if (!NAME_RE.test(String(fm.data.name))) add('error', 'agent-frontmatter', rel, `agent name "${fm.data.name}" must be lowercase-hyphen`);
        if (!fm.data.description) add('error', 'agent-frontmatter', rel, 'agent has no description');
        for (const k of Object.keys(fm.data)) {
          if (AGENT_IGNORED_KEYS.includes(k)) add('warn', 'agent-frontmatter', rel, `"${k}" is ignored for plugin agents`);
          else if (!AGENT_KEYS.includes(k)) add('warn', 'agent-frontmatter', rel, `unknown agent field "${k}"`);
        }
      }
    }
    for (const p of plugins) {
      const deps = [].concat(p?.dependencies ?? []);
      for (const dep of deps) {
        const depName = typeof dep === 'string' ? dep.split('@')[0] : dep?.name;
        if (!names.has(depName)) add('error', 'marketplace-dependency', mpFile, `plugin "${p.name}" depends on "${depName}", which is not in this marketplace`);
        if (depName === p.name) add('error', 'marketplace-dependency', mpFile, `plugin "${p.name}" depends on itself`);
      }
      // a skill that needs the learn skill must say so in the manifest (F-14)
      for (const s of [].concat(p?.skills ?? [])) {
        const name = basename(s);
        const sk = skills.get(name);
        if (!sk || name === 'learn' || !names.has('learn')) continue;
        const body = sk.fm.body ?? sk.text;
        const needsLearn = /the `?learn`? skill|Requires:\s*`?learn\b|\]\(\.\.\/learn\//i.test(body);
        const depNames = deps.map((d) => (typeof d === 'string' ? d.split('@')[0] : d?.name));
        if (needsLearn && !depNames.includes('learn')) add('error', 'marketplace-dependency', mpFile, `plugin "${p.name}": skills/${name} relies on the learn skill but the entry has no "dependencies": ["learn"]`);
      }
    }
    for (const name of skills.keys()) if (!listed.has(`skills/${name}`)) add('warn', 'marketplace-coverage', mpFile, `skills/${name} is not exposed by any plugin entry`);

    // One release version on every entry: a plugin whose version is not bumped stops receiving updates.
    if (plugins.length) {
      const versions = plugins.map((p) => p?.version);
      if (versions.some((v) => typeof v !== 'string' || !v)) add('error', 'marketplace-version', mpFile, `every plugin needs a "version"; missing on ${plugins.filter((p) => !p?.version).map((p) => p?.name).join(', ')}`);
      else if (new Set(versions).size > 1) add('error', 'marketplace-version', mpFile, `plugin versions differ (${[...new Set(versions)].join(', ')}); release all entries with one version`);
      else if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(versions[0])) add('warn', 'marketplace-version', mpFile, `version "${versions[0]}" is not SemVer`);
    }
    // Agent files in subagents/ that no entry lists are never loaded.
    const listedAgents = new Set(plugins.flatMap((p) => [].concat(p?.agents ?? []).map((a) => toPosix(relative(root, join(typeof p?.source === 'string' ? join(root, p.source) : root, a))))));
    for (const f of files.filter((f) => /^subagents\/[^/]+\.md$/.test(f))) if (!listedAgents.has(f)) add('warn', 'marketplace-agent-path', mpFile, `${f} is not listed in any plugin's "agents"`);
  }

  // 3b. Native subagents are generated from the lesson-panel role files (the source of truth):
  //     subagents/lesson-<role>.md = frontmatter + a short preamble + the role file verbatim at the end.
  const roleDir = 'skills/lesson-panel/agents';
  for (const f of files.filter((f) => /^subagents\/lesson-[a-z0-9-]+\.md$/.test(f))) {
    const role = f.replace(/^subagents\/lesson-/, '');
    const roleFile = `${roleDir}/${role}`;
    if (!existsSync(join(root, roleFile))) { add('error', 'subagent-sync', f, `no role file ${roleFile} to generate it from`); continue; }
    const fm = parseFrontmatter(read(f));
    if (fm.data && fm.data.name !== `lesson-${role.replace(/\.md$/, '')}`) add('error', 'agent-frontmatter', f, `name "${fm.data.name}" should be "lesson-${role.replace(/\.md$/, '')}"`);
    const body = (fm.body ?? '').replace(/\r\n/g, '\n').trimEnd();
    const source = read(roleFile).replace(/\r\n/g, '\n').trim();
    if (!body.endsWith(source)) add('error', 'subagent-sync', f, `body does not end with ${roleFile} verbatim: edit the role file, then regenerate this subagent`);
  }
  if (existsSync(join(root, roleDir)) && existsSync(join(root, 'subagents'))) {
    for (const r of readdirSync(join(root, roleDir)).filter((x) => x.endsWith('.md'))) {
      if (!existsSync(join(root, 'subagents', `lesson-${r}`))) add('warn', 'subagent-sync', `${roleDir}/${r}`, `no native subagent subagents/lesson-${r}`);
    }
  }

  // 4. Markdown links -------------------------------------------------------------------------
  const anchorCache = new Map();
  const anchorsOf = (f) => { if (!anchorCache.has(f)) anchorCache.set(f, anchors(read(f))); return anchorCache.get(f); };
  for (const f of files.filter((f) => f.endsWith('.md'))) {
    const text = read(f);
    for (const { target, line } of links(text)) {
      const [rawPath, hash] = target.split('#');
      let path;
      try { path = decodeURIComponent(rawPath.split('?')[0]); } catch { path = rawPath; }
      const abs = path === '' ? join(root, f) : path.startsWith('/') ? join(root, path) : resolve(dirname(join(root, f)), path);
      const rel = toPosix(relative(root, abs));
      if (rel.startsWith('..')) { add('error', 'link-outside', f, `line ${line}: ${target} points outside the repository`); continue; }
      if (!existsSync(abs)) { add('error', 'link-broken', f, `line ${line}: ${target} → ${rel} does not exist`); continue; }
      if (hash && abs.endsWith('.md') && statSync(abs).isFile()) {
        if (!anchorsOf(rel).has(decodeURIComponent(hash))) add('warn', 'link-anchor', f, `line ${line}: #${hash} is not a heading in ${rel}`);
      }
    }
  }

  // 5. Schemas are valid subset schemas --------------------------------------------------------
  const schemaFiles = files.filter((f) => /^schemas\/.*\.json$/.test(f));
  let schemaLib = null;
  if (schemaFiles.length) {
    const libPath = join(root, 'scripts', 'lib', 'schema.mjs');
    const fallback = join(HERE, 'lib', 'schema.mjs');
    const p = existsSync(libPath) ? libPath : existsSync(fallback) ? fallback : null;
    if (p) { try { schemaLib = await import(pathToFileURL(p).href); } catch (e) { add('error', 'schema-lib', 'scripts/lib/schema.mjs', `does not load: ${e.message}`); } }
    else add('warn', 'schema-lib', 'scripts/lib/schema.mjs', 'missing: schemas are checked for keywords only, examples are not validated');
  }
  for (const f of schemaFiles) {
    const s = json.get(f);
    if (!s) continue;
    if (schemaLib?.checkSchema) {
      for (const e of schemaLib.checkSchema(s)) add('error', 'schema-subset', f, `${e.path || '(root)'}: ${e.message}`);
    } else {
      const refs = [];
      (function visit(node, path) {
        if (Array.isArray(node)) return node.forEach((n, i) => visit(n, `${path}/${i}`));
        if (!node || typeof node !== 'object') return;
        for (const [k, v] of Object.entries(node)) {
          const here = `${path}/${k}`;
          const parent = path.split('/').pop();
          const isMap = ['properties', '$defs', 'definitions', 'patternProperties'].includes(parent);
          if (!isMap && !SCHEMA_KEYWORDS.has(k)) add('error', 'schema-keyword', f, `${here}: "${k}" is outside the supported JSON-Schema subset (ADR-011)`);
          if (k === '$ref') refs.push([here, v]);
          if (!isMap && ['examples', 'default', 'const', 'enum'].includes(k)) continue; // data, not schema
          visit(v, here);
        }
      })(s, '#');
      for (const [where, ref] of refs) {
        if (typeof ref !== 'string' || !ref.startsWith('#')) { add('error', 'schema-ref', f, `${where}: only local $ref (#/…) is supported, got ${JSON.stringify(ref)}`); continue; }
        const target = ref.slice(1).split('/').filter(Boolean).reduce((n, k) => (n == null ? n : n[decodeURIComponent(k).replace(/~1/g, '/').replace(/~0/g, '~')]), s);
        if (target === undefined) add('error', 'schema-ref', f, `${where}: $ref ${ref} does not resolve`);
      }
    }
    if (schemaLib?.validate && Array.isArray(s.examples)) {
      s.examples.forEach((ex, i) => {
        let errs;
        try { errs = schemaLib.validate(s, ex); } catch (e) { errs = [{ path: '', message: `validator threw: ${e.message}` }]; }
        for (const e of errs) add('error', 'schema-example', f, `examples[${i}] ${e.path || '(root)'}: ${e.message}`);
      });
    }
  }

  // 6. No hardcoded install paths in skills/** -------------------------------------------------
  const PATH_RULES = [
    [/~\/\.claude\/skills/, '~/.claude/skills'],
    [/\$\{?HOME\}?\/\.claude\/skills/, '$HOME/.claude/skills'],
    [/(?:^|[\s"'`(])\/(?:home|Users)\/[A-Za-z0-9._-]+\//, 'an absolute home-directory path'],
  ];
  for (const f of files.filter((f) => f.startsWith('skills/') && /\.(md|mjs|js|json|css|html|sh)$/.test(f))) {
    read(f).split('\n').forEach((line, i) => {
      for (const [re, what] of PATH_RULES) if (re.test(line)) add('error', 'hardcoded-path', f, `line ${i + 1}: ${what} only exists for one install method; use \${CLAUDE_SKILL_DIR} or "the folder that holds this SKILL.md"`);
    });
  }

  // 7. Starter templates reference starter assets that exist ------------------------------------
  const starter = 'skills/learn/starter';
  const templates = files.filter((f) => f.startsWith(`${starter}/templates/`) && f.endsWith('.html'));
  // Where each template lands in a workspace (new-course copies index/review to the root; lessons and
  // references go one folder down). Templates in sub-folders keep their sub-folder.
  const placeOf = (rel) => (rel.includes('/') ? rel : /^lesson/.test(rel) ? `lessons/${rel}` : /^reference/.test(rel) ? `reference/${rel}` : rel);
  for (const f of templates) {
    const inTpl = placeOf(toPosix(relative(join(root, starter, 'templates'), join(root, f))));
    const html = read(f).replace(/<!--[\s\S]*?-->/g, '');
    for (const m of html.matchAll(/\s(?:src|href)\s*=\s*["']([^"'#?]+)/gi)) {
      const ref = m[1];
      if (/^[a-z][a-z0-9+.-]*:|^\/\/|\{\{|\$\{/i.test(ref) || ref === '') continue;
      const wsPath = posix.normalize(posix.join(posix.dirname(inTpl), ref));
      if (wsPath.startsWith('..')) { add('error', 'template-ref', f, `${ref} points outside the workspace (template placed at ${inTpl})`); continue; }
      if (wsPath.startsWith('assets/') && !existsSync(join(root, starter, wsPath))) add('error', 'template-ref', f, `${ref} → ${starter}/${wsPath} does not exist in the starter kit`);
    }
  }

  // 8. Syntax of shipped and tooling JavaScript ------------------------------------------------
  const jsFiles = files.filter((f) => (/^skills\/.*\.(js|mjs)$/.test(f) || /^(scripts|evaluations|tests)\/.*\.mjs$/.test(f)) && !f.includes('/fixtures/'));
  for (const f of jsFiles) {
    const r = spawnSync(process.execPath, ['--check', join(root, f)], { encoding: 'utf8' });
    if (r.status !== 0) add('error', 'js-syntax', f, (r.stderr || '').split('\n').filter(Boolean).slice(0, 4).join(' | '));
  }

  // 9. Example courses pass the workspace linter -----------------------------------------------
  if (existsSync(join(root, 'examples'))) {
    const { lintWorkspace } = await import('./lib/lint-workspace.mjs');
    for (const d of readdirSync(join(root, 'examples'), { withFileTypes: true })) {
      if (!d.isDirectory() || !existsSync(join(root, 'examples', d.name, 'assets', 'course.js'))) continue;
      for (const x of await lintWorkspace(join(root, 'examples', d.name))) {
        if (x.rule === 'schema-unavailable') continue;
        add(x.level, `example:${x.rule}`, `examples/${d.name}/${x.file}`, x.message);
      }
    }
  }

  const errors = findings.filter((f) => f.level === 'error').length;
  const warnings = findings.length - errors;
  return { ok: errors === 0 && !(opts.strict && warnings), errors, warnings, findings, checked: { files: files.length, skills: skills.size, markdown: files.filter((f) => f.endsWith('.md')).length, json: json.size, schemas: schemaFiles.length, templates: templates.length, js: jsFiles.length } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const ri = args.indexOf('--root');
  const root = ri >= 0 ? args[ri + 1] : join(HERE, '..');
  const res = await validateRepo(root, { strict: args.includes('--strict'), portable: args.includes('--portable') });
  if (args.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else {
    for (const f of res.findings) console.log(`${f.level === 'error' ? '✗ error' : '! warn '} [${f.rule}] ${f.file}: ${f.message}`);
    const c = res.checked;
    console.log(`\nChecked ${c.skills} skills, ${c.markdown} Markdown files, ${c.json} JSON files, ${c.schemas} schemas, ${c.templates} templates, ${c.js} JS files.`);
    console.log(`${res.errors} error(s), ${res.warnings} warning(s). ${res.ok ? 'OK' : 'FAILED'}`);
  }
  process.exit(res.ok ? 0 : 1);
}
