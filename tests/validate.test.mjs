// Tests for scripts/validate.mjs against the fixture repositories in tests/fixtures/repo-*.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateRepo } from '../scripts/validate.mjs';
import { anchors, links, slugify } from '../scripts/lib/markdown.mjs';
import { parseFrontmatter } from '../scripts/lib/frontmatter.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIX = join(ROOT, 'tests', 'fixtures');
const rules = (r, level) => r.findings.filter((f) => !level || f.level === level).map((f) => f.rule);

/** Copies repo-good to a temp dir, applies `mutate(dir)`, validates, cleans up. */
async function variant(mutate, opts) {
  const dir = mkdtempSync(join(tmpdir(), 'lc-validate-'));
  try {
    cpSync(join(FIX, 'repo-good'), dir, { recursive: true });
    mutate(dir);
    return await validateRepo(dir, opts);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('repo-good passes with no findings', async () => {
  const r = await validateRepo(join(FIX, 'repo-good'));
  assert.deepEqual(r.findings, []);
  assert.equal(r.ok, true);
  assert.equal(r.checked.skills, 2);
});

test('repo-bad-frontmatter: name format, folder mismatch, missing description, unknown key', async () => {
  const r = await validateRepo(join(FIX, 'repo-bad-frontmatter'));
  assert.equal(r.ok, false);
  const msgs = r.findings.map((f) => f.message).join('\n');
  assert.match(msgs, /does not match its folder "alpha"/);
  assert.match(msgs, /lowercase letters, digits and single hyphens/);
  assert.ok(rules(r, 'error').includes('skill-description'));
  assert.ok(r.findings.some((f) => f.level === 'warn' && /mystery-key/.test(f.message)));
});

test('repo-bad-marketplace: duplicate names, missing skill path, missing agent, unknown dependency, 404 $schema', async () => {
  const r = await validateRepo(join(FIX, 'repo-bad-marketplace'));
  const e = rules(r, 'error');
  for (const rule of ['marketplace-plugin', 'marketplace-skill-path', 'marketplace-agent-path', 'marketplace-dependency']) assert.ok(e.includes(rule), rule);
  assert.ok(rules(r, 'warn').includes('marketplace-schema-url'));
  assert.ok(rules(r, 'warn').includes('marketplace-coverage'));
});

test('repo-bad-links: a missing file is an error, a missing anchor a warning; fenced links are ignored', async () => {
  const r = await validateRepo(join(FIX, 'repo-bad-links'));
  assert.deepEqual(rules(r, 'error'), ['link-broken']);
  assert.deepEqual(rules(r, 'warn'), ['link-anchor']);
  assert.ok(!r.findings.some((f) => /does-not-exist/.test(f.message)), 'link inside a code fence was checked');
});

test('repo-bad-misc: invalid JSON, schema outside the subset, unresolved $ref, failing example, hardcoded path', async () => {
  const r = await validateRepo(join(FIX, 'repo-bad-misc'));
  const e = rules(r, 'error');
  for (const rule of ['json-parse', 'schema-subset', 'schema-example', 'hardcoded-path']) assert.ok(e.includes(rule), rule);
  assert.ok(r.findings.some((f) => /"if"/.test(f.message)));
  assert.ok(r.findings.some((f) => /\$defs\/missing/.test(f.message)));
});

test('description over 1024 chars is an error; --portable rejects Claude-only keys', async () => {
  const long = await variant((d) => {
    const p = join(d, 'skills/beta/SKILL.md');
    writeFileSync(p, `---\nname: beta\ndescription: ${'x'.repeat(1030)}\n---\nBody\n`);
  });
  assert.ok(long.findings.some((f) => f.rule === 'skill-description' && /1030 chars/.test(f.message)));
  const portable = await validateRepo(join(FIX, 'repo-good'), { portable: true });
  assert.ok(portable.findings.some((f) => f.level === 'error' && /argument-hint/.test(f.message)));
});

test('a skill that needs the learn skill must declare the dependency', async () => {
  const r = await variant((d) => {
    mkdirSync(join(d, 'skills/learn'), { recursive: true });
    writeFileSync(join(d, 'skills/learn/SKILL.md'), '---\nname: learn\ndescription: Fixture learn.\n---\n');
    writeFileSync(join(d, 'skills/beta/SKILL.md'), '---\nname: beta\ndescription: Needs learn.\n---\nFollow the `learn` skill for formats.\n');
    const mp = JSON.parse(readFileSync(join(d, '.claude-plugin/marketplace.json'), 'utf8'));
    mp.plugins.push({ name: 'learn', source: '.', skills: ['./skills/learn'] });
    writeFileSync(join(d, '.claude-plugin/marketplace.json'), JSON.stringify(mp));
  });
  assert.ok(r.findings.some((f) => f.rule === 'marketplace-dependency' && /beta/.test(f.message) && /learn/.test(f.message)));
});

test('starter templates must reference assets that exist', async () => {
  const r = await variant((d) => {
    mkdirSync(join(d, 'skills/learn/starter/templates/lessons'), { recursive: true });
    mkdirSync(join(d, 'skills/learn/starter/assets'), { recursive: true });
    writeFileSync(join(d, 'skills/learn/SKILL.md'), '---\nname: learn\ndescription: Fixture learn.\n---\n');
    writeFileSync(join(d, 'skills/learn/starter/assets/core.js'), '');
    writeFileSync(join(d, 'skills/learn/starter/templates/lessons/0001-x.html'), '<script src="../assets/core.js"></script><script src="../assets/nope.js"></script>');
    const mp = JSON.parse(readFileSync(join(d, '.claude-plugin/marketplace.json'), 'utf8'));
    mp.plugins.push({ name: 'learn', source: '.', skills: ['./skills/learn'] });
    writeFileSync(join(d, '.claude-plugin/marketplace.json'), JSON.stringify(mp));
  });
  const t = r.findings.filter((f) => f.rule === 'template-ref');
  assert.equal(t.length, 1);
  assert.match(t[0].message, /nope\.js/);
});

test('native subagents must end with their lesson-panel role file verbatim', async () => {
  const setup = (d, body) => {
    mkdirSync(join(d, 'skills/lesson-panel/agents'), { recursive: true });
    mkdirSync(join(d, 'subagents'), { recursive: true });
    writeFileSync(join(d, 'skills/lesson-panel/agents/expert.md'), '# Lesson expert\n\nCheck the facts.\n');
    writeFileSync(join(d, 'subagents/lesson-expert.md'), `---\nname: lesson-expert\ndescription: Expert reviewer.\n---\n\nPreamble line.\n\n${body}`);
    const mp = JSON.parse(readFileSync(join(d, '.claude-plugin/marketplace.json'), 'utf8'));
    mp.plugins[0].agents = ['./subagents/lesson-expert.md'];
    writeFileSync(join(d, '.claude-plugin/marketplace.json'), JSON.stringify(mp));
  };
  const inSync = await variant((d) => setup(d, '# Lesson expert\n\nCheck the facts.\n'));
  assert.deepEqual(inSync.findings.filter((f) => f.rule === 'subagent-sync'), []);
  const drifted = await variant((d) => setup(d, '# Lesson expert\n\nCheck the facts, and also the vibes.\n'));
  assert.ok(drifted.findings.some((f) => f.rule === 'subagent-sync' && f.level === 'error'));
});

test('marketplace versions: present and identical on every plugin', async () => {
  const setVersions = (vs) => (d) => {
    const mp = JSON.parse(readFileSync(join(d, '.claude-plugin/marketplace.json'), 'utf8'));
    mp.plugins.forEach((p, i) => { if (vs[i] === null) delete p.version; else if (vs[i] !== undefined) p.version = vs[i]; });
    writeFileSync(join(d, '.claude-plugin/marketplace.json'), JSON.stringify(mp));
  };
  const differ = await variant(setVersions(['2.0.0', '2.1.0']));
  assert.ok(differ.findings.some((f) => f.rule === 'marketplace-version' && /differ/.test(f.message)));
  const missing = await variant(setVersions(['2.0.0', null]));
  assert.ok(missing.findings.some((f) => f.rule === 'marketplace-version' && /missing on beta/.test(f.message)));
});

test('CLI: --json output and exit codes', () => {
  const good = spawnSync(process.execPath, [join(ROOT, 'scripts/validate.mjs'), '--root', join(FIX, 'repo-good'), '--json'], { encoding: 'utf8' });
  assert.equal(good.status, 0, good.stderr);
  assert.equal(JSON.parse(good.stdout).ok, true);
  const bad = spawnSync(process.execPath, [join(ROOT, 'scripts/validate.mjs'), '--root', join(FIX, 'repo-bad-links')], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /link-broken/);
  const strict = spawnSync(process.execPath, [join(ROOT, 'scripts/validate.mjs'), '--root', join(FIX, 'repo-bad-marketplace'), '--strict'], { encoding: 'utf8' });
  assert.equal(strict.status, 1);
});

test('GitHub slugs: punctuation, duplicates, code spans and emphasis', () => {
  assert.equal(slugify('Further Learning (Videos, Articles & Resources)'), 'further-learning-videos-articles--resources');
  const a = anchors('# Title\n## `r<N>-author.md`\n## A *b* [c](x)\n## A b c\n```\n# not a heading\n```\n');
  assert.deepEqual([...a], ['title', 'rn-authormd', 'a-b-c', 'a-b-c-1']);
});

test('link extraction skips code, URLs and placeholders', () => {
  const l = links('[a](x.md) `[b](y.md)` [c](https://e.com) [d](${CLAUDE_SKILL_DIR}/z.md)\n```\n[e](w.md)\n```\n[ref]: r.md\n<img src="i.png">');
  assert.deepEqual(l.map((x) => x.target), ['x.md', 'r.md', 'i.png']);
});

test('frontmatter parser: quoted strings, folded scalars, lists and maps', () => {
  const { data } = parseFrontmatter('---\nname: x\ndescription: >\n  one\n  two\nallowed-tools: [Read, Bash]\nmetadata:\n  a: "1"\n---\nbody');
  assert.equal(data.description, 'one two');
  assert.deepEqual(data['allowed-tools'], ['Read', 'Bash']);
  assert.deepEqual(data.metadata, { a: '1' });
});

test('the repository itself validates with no errors', { skip: process.env.LC_SKIP_REPO_VALIDATE ? 'LC_SKIP_REPO_VALIDATE set' : false }, async () => {
  const r = await validateRepo(ROOT);
  const errors = r.findings.filter((f) => f.level === 'error');
  assert.deepEqual(errors, [], errors.map((e) => `${e.rule} ${e.file}: ${e.message}`).join('\n'));
});
