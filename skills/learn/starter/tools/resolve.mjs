// Finds optional tooling packages (playwright, axe-core) without a bare ESM import, which ignores
// NODE_PATH and global installs (FE-12). Search order, first hit wins:
//   (a) the stable tools folder: $LEARNCRAFT_TOOLS_DIR, else ${XDG_CACHE_HOME:-~/.cache}/learncraft/tools
//   (b) this script's own folder (a node_modules next to check.mjs or above it, e.g. a repository checkout)
//   (c) the global npm root (`npm root -g`), then any NODE_PATH entries
//   (d) ONLY with { allowWorkspace: true } (check.mjs --allow-workspace-playwright): the workspace's
//       node_modules and its parents. Off by default: a course can live inside a repository
//       (.learncraft/), and that repository's node_modules must not decide what code the check runs (SR-11).
// Whatever is found, callers print the resolved path before loading it. Nothing here installs or writes.
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export function toolsDir() {
  if (process.env.LEARNCRAFT_TOOLS_DIR) return process.env.LEARNCRAFT_TOOLS_DIR;
  const cache = process.env.XDG_CACHE_HOME || join(homedir(), '.cache');
  return join(cache, 'learncraft', 'tools');
}

let globalRoot;
function npmRootGlobal() {
  if (globalRoot !== undefined) return globalRoot;
  try {
    const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root', '-g'], { encoding: 'utf8', timeout: 15000, shell: process.platform === 'win32' });
    globalRoot = r.status === 0 ? r.stdout.trim() || null : null;
  } catch { globalRoot = null; }
  return globalRoot;
}

/** Where to look, in order: [label, dir, kind]. kind 'base' = Node lookup from dir; 'modules' = dir is a node_modules folder. */
export function searchBases(workspace, { allowWorkspace = false } = {}) {
  const bases = [];
  bases.push(['tools folder', toolsDir(), 'base']);
  bases.push(['check.mjs folder', HERE, 'base']);
  const g = npmRootGlobal();
  if (g) bases.push(['global npm root', g, 'modules']);
  for (const p of (process.env.NODE_PATH || '').split(delimiter).filter(Boolean)) bases.push(['NODE_PATH', p, 'modules']);
  if (workspace && allowWorkspace) bases.push(['workspace (--allow-workspace-playwright)', workspace, 'base']);
  return bases;
}

function resolveInModulesDir(dir, request) {
  const parts = request.split('/');
  const n = request.startsWith('@') ? 2 : 1;
  const pkgDir = join(dir, ...parts.slice(0, n));
  const pj = join(pkgDir, 'package.json');
  if (!existsSync(pj)) return null;
  const sub = parts.slice(n).join('/');
  if (sub) return existsSync(join(pkgDir, sub)) ? join(pkgDir, sub) : null;
  const meta = JSON.parse(readFileSync(pj, 'utf8'));
  const main = join(pkgDir, meta.main || 'index.js');
  return existsSync(main) ? main : null;
}

/**
 * Resolves `request` (e.g. 'playwright' or 'axe-core/axe.min.js').
 * @returns {{ path: string, from: string, require: NodeRequire } | null}
 */
export function resolveTool(request, workspace, opts = {}) {
  for (const [label, dir, kind] of searchBases(workspace, opts)) {
    if (!existsSync(dir)) continue;
    try {
      let path = null;
      if (kind === 'modules') path = resolveInModulesDir(dir, request);
      else for (let d = dir; !path; d = dirname(d)) {
        path = resolveInModulesDir(join(d, 'node_modules'), request);
        if (dirname(d) === d) break;
      }
      if (path) return { path, from: label, require: createRequire(path) };
    } catch { /* try the next place */ }
  }
  return null;
}

/** Loads Playwright, or returns null with the reason and the install command. */
/**
 * Loads Playwright, or returns null with the reason and the install command.
 * opts.allowWorkspace: also look in the workspace's node_modules (and its parents), last. opts.onResolve(path, from)
 * is called with the resolved file BEFORE it is loaded, so the caller can print what is about to run.
 */
export function loadPlaywright(workspace, opts = {}) {
  const hit = resolveTool('playwright', workspace, opts);
  if (!hit) return { playwright: null, reason: missingMessage('playwright', opts) };
  if (typeof opts.onResolve === 'function') opts.onResolve(hit.path, hit.from);
  try { return { playwright: hit.require(hit.path), from: hit.from, path: hit.path }; } catch (e) { return { playwright: null, reason: `playwright found at ${hit.path} but failed to load: ${e.message}` }; }
}

export function missingMessage(pkg, { allowWorkspace = false } = {}) {
  const dir = toolsDir();
  return [
    `Cannot find the "${pkg}" package. Looked in: ${dir}, ${HERE} (and its parents), the global npm root and NODE_PATH${allowWorkspace ? ', then the workspace node_modules' : ' (not the workspace: pass --allow-workspace-playwright to also look there)'}.`,
    'Install the lesson-check tools once into the stable tools folder (it survives skill updates):',
    `  npm install --prefix "${dir}" playwright@1.63.0 axe-core@4.10.2 && npx --prefix "${dir}" playwright install chromium`,
    'Or set LEARNCRAFT_TOOLS_DIR to a folder that already has them.',
  ].join('\n');
}
