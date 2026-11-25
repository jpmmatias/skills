// Markdown helpers for the link checker: GitHub-style heading slugs and relative link extraction.

/** Blanks fenced code blocks (``` or ~~~), keeping line structure. */
export function stripFences(md) {
  const lines = md.split('\n');
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(lines[i]);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && !lines[i].slice(m[0].length).trim()) fence = null;
      lines[i] = '';
    } else if (m) { fence = m[1]; lines[i] = ''; }
  }
  return lines.join('\n');
}

/** Blanks fenced code and inline code spans (keeps line numbers). */
export function stripCode(md) {
  return stripFences(md).replace(/(`+)(?!`)((?:(?!\n[ \t]*\n)[\s\S])*?[^`])\1(?!`)/g, (m) => m.replace(/[^\n]/g, ' '));
}

/** github-slugger: lowercase, drop everything but letters, marks, numbers, `_`, `-` and spaces. */
export function slugify(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
}

/** Heading text as GitHub renders it (formatting removed), for slugging. */
function headingText(raw) {
  // Code spans keep their text verbatim (`r<N>.md` → "r<N>.md"); HTML tags outside code are dropped.
  return raw
    .replace(/\s+#+\s*$/, '')
    .split(/(`+[^`]*`+)/)
    .map((part, i) => (i % 2 ? part.replace(/^`+|`+$/g, '') : part
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/(\*\*|__|\*|_|~~)(.+?)\1/g, '$2')
      .replace(/&[a-z]+;/gi, '')))
    .join('')
    .trim();
}

/** All anchors a Markdown file exposes on GitHub. */
export function anchors(md) {
  const set = new Set();
  const counts = new Map();
  const noCode = stripFences(md);
  const lines = noCode.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let text = null;
    const atx = /^ {0,3}#{1,6}\s+(.*)$/.exec(lines[i]);
    if (atx) text = atx[1];
    else if (i + 1 < lines.length && lines[i].trim() && /^ {0,3}(=+|-+)\s*$/.test(lines[i + 1]) && !/^\s*[-*]\s/.test(lines[i]) && !/^\s*\|/.test(lines[i])) text = lines[i];
    if (text == null) continue;
    const base = slugify(headingText(text));
    const n = counts.get(base) ?? 0;
    counts.set(base, n + 1);
    set.add(n ? `${base}-${n}` : base);
  }
  for (const m of md.matchAll(/<a\s+[^>]*(?:id|name)\s*=\s*["']([^"']+)["']/gi)) set.add(m[1]);
  return set;
}

/** Relative link targets in a Markdown file: [{ target, line }] (http, mailto and the like excluded). */
export function links(md) {
  const text = stripCode(md);
  const out = [];
  const push = (target, index) => {
    target = target.trim().replace(/^<|>$/g, '');
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) return;
    if (/\$\{|\{\{|%7B%7B/.test(target)) return; // placeholders
    out.push({ target, line: text.slice(0, index).split('\n').length });
  };
  // inline links and images: [text](target "title")
  for (const m of text.matchAll(/!?\[(?:[^\[\]]|\[[^\]]*\])*\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g)) push(m[1], m.index);
  // reference definitions: [id]: target
  for (const m of text.matchAll(/^ {0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/gm)) push(m[1], m.index);
  // raw HTML src/href
  for (const m of text.matchAll(/<(?:a|img|source|script|link)\b[^>]*?\s(?:src|href)\s*=\s*["']([^"']+)["']/gi)) push(m[1], m.index);
  return out;
}
