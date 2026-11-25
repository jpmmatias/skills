#!/usr/bin/env node
// Instruction-cost meter: how many tokens of skill instructions each invocation path loads,
// per profile and per agent context. Deterministic; reads the skill files, makes no model calls.
//
//   node evaluations/runners/instruction-cost.mjs [--ref <git-ref>] [--json] [--out <prefix>]
//
//   --ref   measure the tree at a git ref (e.g. f8aaf973 for the baseline) via `git show`,
//           instead of the working tree; reproducible before/after comparisons
//   --out   write <prefix>.json and <prefix>.md (e.g. evaluations/results/baseline-instruction-cost)
//
// Tokens are estimated as bytes / 4 (the convention in docs/audit/BASELINE.md). This is a rough
// proxy: real tokenizer counts differ by ±15–25% and depend on the model. What each path loads is
// declared in instruction-paths.json (see its $comment); 'follow' adds links on **Load:**/**Read:**
// lines. Workspace files and web fetches are excluded because they depend on the course.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, posix, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../../scripts/lib/frontmatter.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

export function makeTree(ref, root = ROOT) {
  if (!ref) {
    const all = [];
    const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (['.git', 'node_modules'].includes(e.name)) continue; const p = join(d, e.name); e.isDirectory() ? walk(p) : all.push(relative(root, p).split(sep).join('/')); } };
    walk(root);
    return { label: 'working tree', files: all, read: (f) => (existsSync(join(root, f)) && statSync(join(root, f)).isFile() ? readFileSync(join(root, f)) : null) };
  }
  const sha = execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], { cwd: root, encoding: 'utf8' }).trim();
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', sha], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const set = new Set(files);
  return { label: `${ref} (${sha.slice(0, 12)})`, sha, files, read: (f) => (set.has(f) ? execFileSync('git', ['show', `${sha}:${f}`], { cwd: root, maxBuffer: 64 << 20 }) : null) };
}

const globRe = (g) => new RegExp('^' + g.split('/').map((s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')).join('/') + '$');
const expand = (tree, pattern) => (pattern.includes('*') ? tree.files.filter((f) => globRe(pattern).test(f)).sort() : [pattern]);

/** Links on **Load:** / **Read:** lines of a Markdown file, resolved repository-relative. */
export function loadLinks(file, text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!/^\s*(?:[-*]\s*)?\*\*(?:Load|Read)\b[^*]*:?\*\*/i.test(line)) continue;
    for (const m of line.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)) {
      if (/^[a-z]+:/i.test(m[1])) continue;
      out.push(posix.normalize(posix.join(posix.dirname(file), m[1])));
    }
  }
  return out;
}

export function measure({ ref, spec = JSON.parse(readFileSync(join(HERE, 'instruction-paths.json'), 'utf8')), root = ROOT } = {}) {
  const tree = makeTree(ref, root);
  const has = new Set(tree.files);
  const layout = spec.layouts.find((l) => has.has(l.detect));
  if (!layout) throw new Error('no layout in instruction-paths.json matches this tree');
  const tpb = spec.tokensPerByte;
  const size = (f) => tree.read(f)?.length ?? null;

  // Always-on skill listing: name + description of every skill (what the agent sees before invoking).
  const listingFiles = expand(tree, spec.listing);
  let listingBytes = 0;
  for (const f of listingFiles) {
    const fm = parseFrontmatter(tree.read(f).toString('utf8'));
    listingBytes += `${fm.data?.name ?? ''}: ${fm.data?.description ?? ''}`.length;
  }

  const rows = [];
  for (const [path, profiles] of Object.entries(layout.paths)) {
    for (const [profile, contexts] of Object.entries(profiles)) {
      const ctxRows = [];
      for (const [ctxName, ctx] of Object.entries(contexts)) {
        const seen = new Map(); // file -> {bytes, kind, via}
        const missing = [];
        const addFile = (f, kind, via) => {
          if (seen.has(f)) return;
          const b = size(f);
          if (b == null) { if (!missing.includes(f)) missing.push(f); return; }
          seen.set(f, { bytes: b, kind, via });
        };
        const listed = [];
        for (const entry of ctx.files ?? []) {
          const alts = Array.isArray(entry) ? entry : [entry];
          const pick = alts.flatMap((a) => expand(tree, a)).find((f) => has.has(f));
          if (pick) { addFile(pick, 'instructions', 'declared'); listed.push(pick); } else missing.push(alts.join(' | '));
        }
        if (ctx.follow) {
          for (const f of listed) {
            if (!f.endsWith('.md')) continue;
            for (const l of loadLinks(f, tree.read(f).toString('utf8'))) addFile(l, 'instructions', `Load/Read in ${f}`);
          }
        }
        for (const pat of ctx.code ?? []) for (const f of expand(tree, pat)) addFile(f, 'code', 'declared');
        const files = [...seen].map(([file, v]) => ({ file, ...v, tokens: Math.round(v.bytes * tpb) }));
        const instr = files.filter((f) => f.kind === 'instructions').reduce((s, f) => s + f.bytes, 0);
        const code = files.filter((f) => f.kind === 'code').reduce((s, f) => s + f.bytes, 0);
        const listing = ctxName === 'main' ? listingBytes : 0;
        ctxRows.push({ context: ctxName, files, missing, bytes: { listing, instructions: instr, code }, tokens: { listing: Math.round(listing * tpb), instructions: Math.round(instr * tpb), code: Math.round(code * tpb), total: Math.round((listing + instr + code) * tpb) } });
      }
      const sum = (k) => Math.round(ctxRows.reduce((s, c) => s + c.bytes[k], 0) * tpb);
      const listingT = sum('listing'), instrT = sum('instructions'), codeT = sum('code');
      const totalT = Math.round(ctxRows.reduce((s, c) => s + c.bytes.listing + c.bytes.instructions + c.bytes.code, 0) * tpb);
      rows.push({ path, profile, contexts: ctxRows, tokens: { mainContext: ctxRows.find((c) => c.context === 'main')?.tokens.total ?? 0, listing: listingT, instructions: instrT, code: codeT, total: totalT } });
    }
  }
  return { measuredAt: new Date().toISOString(), tree: tree.label, sha: tree.sha ?? null, layout: layout.id, layoutDescription: layout.description, tokensPerByte: tpb, listing: { files: listingFiles.length, tokens: Math.round(listingBytes * tpb) }, rows };
}

export function toMarkdown(r) {
  const L = [];
  L.push(`# Instruction cost — ${r.tree}`, '');
  L.push(`Layout \`${r.layout}\`: ${r.layoutDescription}`, '');
  L.push(`Estimated tokens = bytes × ${r.tokensPerByte} (rough; ±15–25% against a real tokenizer). Always-on skill listing (${r.listing.files} skills): ${r.listing.tokens} tokens, counted in the main context. Excludes workspace files, web fetches, screenshots and output.`, '');
  L.push('| Path | Profile | Main context | All contexts: instructions | All contexts: code to read | All contexts: total | Contexts |', '|---|---|---:|---:|---:|---:|---|');
  for (const row of r.rows) L.push(`| ${row.path} | ${row.profile} | ${row.tokens.mainContext} | ${Math.round(row.contexts.reduce((s, c) => s + c.bytes.listing + c.bytes.instructions, 0) * r.tokensPerByte)} | ${row.tokens.code} | ${row.tokens.total} | ${row.contexts.map((c) => `${c.context} ${c.tokens.total}`).join(', ')} |`);
  L.push('', '## Files per context', '');
  for (const row of r.rows) {
    for (const c of row.contexts) {
      L.push(`- **${row.path} / ${row.profile} / ${c.context}** (${c.tokens.total} tokens): ${c.files.map((f) => `\`${f.file}\` ${f.tokens}${f.kind === 'code' ? ' (code)' : ''}`).join(', ')}${c.missing.length ? ` — missing at this ref: ${c.missing.map((m) => `\`${m}\``).join(', ')}` : ''}`);
    }
  }
  return L.join('\n') + '\n';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const r = measure({ ref: opt('--ref') });
  const out = opt('--out');
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(`${out}.json`, JSON.stringify(r, null, 2) + '\n');
    writeFileSync(`${out}.md`, toMarkdown(r));
    console.log(`wrote ${out}.json and ${out}.md`);
  }
  if (args.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else if (!out) process.stdout.write(toMarkdown(r));
  else for (const row of r.rows) console.log(`${row.path.padEnd(11)} ${row.profile.padEnd(9)} main ${String(row.tokens.mainContext).padStart(6)}  total ${String(row.tokens.total).padStart(6)}`);
}
