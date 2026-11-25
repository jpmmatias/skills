// Minimal YAML-frontmatter reader for SKILL.md and agent files. Zero dependencies.
// Supports: `key: value`, quoted strings, `[a, b]` flow lists, `- item` block lists,
// `>` / `|` block scalars and one level of nested maps. Anything else is kept as raw text.

/** @returns {{ data: object|null, body: string, error?: string, lines: number }} */
export function parseFrontmatter(text) {
  const src = text.replace(/^﻿/, '');
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(src);
  if (!m) return { data: null, body: src, lines: 0 };
  const lines = m[1].split(/\r?\n/);
  const data = {};
  let error;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const kv = /^([A-Za-z0-9_-]+):(?:\s+(.*)|\s*)$/.exec(line);
    if (!kv) { error ??= `line ${i + 2}: cannot parse "${line.trim()}"`; continue; }
    const key = kv[1];
    let val = (kv[2] ?? '').trim();
    if (/^[>|][+-]?$/.test(val)) {
      const block = [];
      while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || !lines[i + 1].trim())) block.push(lines[++i].trim());
      data[key] = val[0] === '>' ? block.join(' ').replace(/\s+/g, ' ').trim() : block.join('\n').trim();
      continue;
    }
    if (val === '') {
      // nested map or block list
      const nested = {}; const list = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
        const l = lines[++i].trim();
        if (l.startsWith('- ')) list.push(scalar(l.slice(2)));
        else { const n = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(l); if (n) nested[n[1]] = scalar(n[2]); }
      }
      data[key] = list.length ? list : Object.keys(nested).length ? nested : '';
      continue;
    }
    data[key] = scalar(val);
  }
  return { data, body: src.slice(m[0].length), error, lines: lines.length + 2 };
}

function scalar(v) {
  v = v.trim();
  if (/^".*"$/.test(v)) { try { return JSON.parse(v); } catch { return v.slice(1, -1); } }
  if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((s) => scalar(s)).filter((s) => s !== '');
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v.replace(/\s+#.*$/, '');
}

// Agent Skills specification fields, and the extra fields Claude Code reads (raw/12-dx-compat.md).
export const SPEC_SKILL_KEYS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];
export const CLAUDE_SKILL_KEYS = ['when_to_use', 'argument-hint', 'arguments', 'disable-model-invocation', 'user-invocable', 'model', 'effort', 'context', 'agent', 'hooks', 'paths', 'shell', 'version'];
export const AGENT_KEYS = ['name', 'description', 'model', 'effort', 'maxTurns', 'tools', 'disallowedTools', 'skills', 'memory', 'background', 'isolation', 'color'];
export const AGENT_IGNORED_KEYS = ['permissionMode', 'hooks', 'mcpServers', 'initialPrompt'];
