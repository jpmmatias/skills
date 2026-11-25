#!/usr/bin/env node
// Deterministic course-workspace scorer. No model calls, no network, no browser.
//
//   node evaluations/runners/score-workspace.mjs <workspace> [--json] [--out <prefix>]
//
// Runs the workspace linter (skills/learn/starter/tools/lint-workspace.mjs), then every
// machine-checkable (M) criterion of the rubrics in evaluations/rubrics/. Criteria marked R need a
// human or model reviewer: they are listed as "not scored" so a report never looks more complete
// than it is. Each result: { id, rubric, kind, title, status: pass|fail|warn|n/a|not-scored, score?, evidence[] }.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectWorkspace, tags, innerOf, textOf, hasClass, stripHtml } from '../../scripts/lib/lint-workspace.mjs';

export const DENY_VERBS = ['understand', 'know', 'learn', 'appreciate', 'be aware', 'be familiar'];
export const EVALUATIVE = ['good', 'clean', 'well', 'nice', 'properly', 'correctly'];
const ALL_NONE = /\b(all|none) of the above\b/i;

// ------------------------------------------------------------------------------------------------
// Normalised view of a workspace
// ------------------------------------------------------------------------------------------------
function legacyItems(page, lessonN) {
  const items = [];
  for (const t of page.tags) {
    if (hasClass(t, 'quiz-q')) {
      const inner = innerOf(page.html, t);
      const opts = tags(inner).filter((b) => b.name === 'button').map((b) => textOf(innerOf(inner, b)));
      const ans = (t.attrs['data-answer'] ?? '').trim();
      items.push({ source: 'legacy', id: t.attrs['data-id'] ?? null, objective: t.attrs['data-objective'] ?? `l${lessonN}`, type: 'choice', prompt: textOf(inner.replace(/<div[^>]*quiz-opts[\s\S]*$/i, '')),
        options: opts.map((o) => ({ text: o, correct: o === ans, why: o === ans ? t.attrs['data-why'] : undefined })), pos: t.start });
    } else if (hasClass(t, 'fade')) {
      const inner = innerOf(page.html, t);
      const blanks = tags(inner).filter((i) => i.name === 'input' && 'data-answer' in i.attrs).map((i) => i.attrs['data-answer']);
      items.push({ source: 'legacy', id: t.attrs['data-id'] ?? null, objective: t.attrs['data-objective'] ?? `l${lessonN}`, type: 'fade', prompt: textOf(inner), blanks, pos: t.start });
    } else if (hasClass(t, 'band-quiz') || (hasClass(t, 'threshold-explorer') && t.attrs['data-target'])) {
      items.push({ source: 'legacy', id: t.attrs['data-id'] ?? null, objective: t.attrs['data-objective'] ?? `l${lessonN}`, type: 'interactive', prompt: '', pos: t.start });
    }
  }
  return items;
}

export async function collect(wsDir) {
  const ins = await inspectWorkspace(wsDir);
  const ws = ins.ws;
  const read = (f) => (existsSync(join(ws, f)) ? readFileSync(join(ws, f), 'utf8') : null);
  const course = ins.course;
  const lessons = (course?.lessons ?? []).map((l) => {
    const page = ins.pages.find((p) => p.file === l.file) ?? null;
    const items = [...(ins.practice.get(l.n) ?? []).map((it) => ({ source: 'data', ...it })), ...(page ? legacyItems(page, l.n) : [])];
    return { ...l, page, items };
  });
  return { ...ins, ws, lessons, mission: read('MISSION.md'), notes: read('NOTES.md') };
}

// ------------------------------------------------------------------------------------------------
// Scorers. Every M criterion of rubrics/*.md names its function here.
// ------------------------------------------------------------------------------------------------
const res = (status, evidence = [], extra = {}) => ({ status, evidence: [].concat(evidence), ...extra });
const NA = (why) => res('n/a', why);
const written = (w) => w.lessons.filter((l) => l.page);

export const scorers = {
  // ---------- Curriculum (rubrics/curriculum.md, from raw/03 §7a) ----------
  CR1(w) {
    if (!w.course) return NA('no course.js');
    const ms = w.course.milestones ?? [];
    const ev = [];
    let ok = true;
    if (w.mission) {
      const sec = /#+\s*Success looks like[^\n]*\n([\s\S]*?)(?=\n#+\s|$)/i.exec(w.mission)?.[1] ?? '';
      const bullets = sec.split('\n').filter((l) => /^\s*[-*]\s+\S/.test(l)).length;
      ev.push(`MISSION.md "Success looks like": ${bullets} bullet(s); course.js: ${ms.length} milestone(s)`);
      if (bullets !== ms.length) ok = false;
    } else ev.push('no MISSION.md: bullet count not checked');
    const used = new Set(w.course.lessons?.flatMap((l) => l.milestones ?? []));
    const orphan = ms.filter((m) => !used.has(m.id)).map((m) => m.id);
    if (orphan.length) { ok = false; ev.push(`milestones with no lesson: ${orphan.join(', ')}`); }
    return res(ok ? (w.mission ? 'pass' : 'warn') : 'fail', ev);
  },
  CR2(w) {
    if (!w.course) return NA('no course.js');
    const rules = ['lesson-milestone-ref', 'lesson-numbering', 'lesson-file-pattern'];
    const hits = w.findings.filter((f) => rules.includes(f.rule) && f.file === 'assets/course.js');
    return res(hits.some((h) => h.level === 'error') ? 'fail' : hits.length ? 'warn' : 'pass', hits.length ? hits.map((h) => h.message) : [`${w.course.lessons?.length ?? 0} lessons numbered 1..N, files match lessons/NNNN-slug.html, milestone refs resolve`]);
  },
  CR3(w) {
    if (!w.course) return NA('no course.js');
    const ev = [];
    let fail = false, noObj = 0;
    for (const l of w.course.lessons ?? []) {
      const obs = l.objectives;
      if (!Array.isArray(obs)) noObj++;
      else if (obs.length < 1 || obs.length > 3) { fail = true; ev.push(`lesson ${l.n}: ${obs.length} objectives`); }
      const cd = String(l.canDo ?? '').toLowerCase();
      const bad = DENY_VERBS.find((v) => new RegExp(`\\b${v}\\b`).test(cd));
      if (bad) { fail = true; ev.push(`lesson ${l.n} canDo uses "${bad}": ${l.canDo}`); }
      for (const o of obs ?? []) { const b = DENY_VERBS.find((v) => new RegExp(`\\b${v}\\b`).test(String(o.text ?? '').toLowerCase())); if (b) { fail = true; ev.push(`objective ${o.id} uses "${b}"`); } }
    }
    if (noObj) ev.push(`${noObj} lesson(s) have no objectives (v1 course.js)`);
    return res(fail ? 'fail' : noObj ? 'warn' : 'pass', ev.length ? ev : ['1–3 objectives per lesson; no non-observable verbs']);
  },
  CR4(w) {
    if (!w.course) return NA('no course.js');
    const ls = w.course.lessons ?? [];
    if (!ls.some((l) => Array.isArray(l.requires))) return NA('no lesson declares requires');
    const objLesson = new Map(ls.flatMap((l) => (l.objectives ?? []).map((o) => [o.id, l.n])));
    const ev = [];
    for (const l of ls) for (const r of l.requires ?? []) {
      const from = typeof r === 'number' ? r : objLesson.get(r);
      if (from == null) ev.push(`lesson ${l.n} requires unknown ${JSON.stringify(r)}`);
      else if (from >= l.n) ev.push(`lesson ${l.n} requires ${JSON.stringify(r)} from lesson ${from} (not earlier)`);
    }
    return res(ev.length ? 'fail' : 'pass', ev.length ? ev : ['requires point only to earlier lessons (so the graph is acyclic)']);
  },
  CR5(w) {
    if (!w.course) return NA('no course.js');
    const ev = [];
    let fail = false, checked = 0;
    for (const m of w.course.milestones ?? []) {
      const ls = written(w).filter((l) => (l.milestones ?? []).includes(m.id));
      if (!ls.length) continue;
      checked++;
      const kinds = ls.map((l) => ({ n: l.n, kind: l.page.tags.find((t) => t.attrs.id === 'challenge')?.attrs['data-kind'] ?? null }));
      const ms = kinds.filter((k) => k.kind === 'milestone');
      const last = Math.max(...ls.map((l) => l.n));
      if (ms.length !== 1 || ms[0].n !== last) { fail = true; ev.push(`milestone ${m.id}: ${ms.length} challenge(s) marked data-kind="milestone" (lessons ${kinds.map((k) => `${k.n}:${k.kind ?? 'unmarked'}`).join(', ')}); expected exactly one, on lesson ${last}`); }
    }
    return checked ? res(fail ? 'fail' : 'pass', ev.length ? ev : ['one milestone challenge per milestone, on its last written lesson']) : NA('no written lessons');
  },
  CR6(w) {
    if (!w.course) return NA('no course.js');
    const bad = (w.course.lessons ?? []).filter((l) => (String(l.title).match(/\band\b/gi) ?? []).length > 1);
    return res(bad.length ? 'fail' : 'pass', bad.length ? bad.map((l) => `lesson ${l.n} title: ${l.title}`) : ['no lesson title joins more than two ideas with "and"']);
  },
  CR8(w) {
    const ls = written(w).filter((l) => l.n >= 3);
    if (!ls.length) return NA('fewer than 3 written lessons');
    const bad = ls.filter((l) => !l.items.some((it) => { const m = /^l(\d+)/.exec(it.objective ?? ''); return m && +m[1] < l.n; }));
    return res(bad.length ? 'fail' : 'pass', bad.length ? bad.map((l) => `lesson ${l.n} has no item on an earlier lesson's objective`) : ['every lesson from 3 on interleaves an earlier objective']);
  },
  CR9(w) {
    if (!w.course) return NA('no course.js');
    if (!w.notes) return res('fail', 'no NOTES.md, so no per-lesson motion/lab decisions');
    const miss = (w.course.lessons ?? []).filter((l) => !new RegExp(`^\\s*[-*]?\\s*L${l.n}\\s*:`, 'm').test(w.notes)).map((l) => l.n);
    return res(miss.length ? 'fail' : 'pass', miss.length ? `no "L<n>:" decision line in NOTES.md for lesson(s) ${miss.join(', ')}` : 'NOTES.md has a decision line per lesson');
  },

  // ---------- Lesson & assessment (rubrics/lesson-assessment.md, from raw/03 §7b) ----------
  AS1(w) {
    const items = written(w).flatMap((l) => l.items.filter((i) => i.type !== 'interactive').map((i) => ({ ...i, n: l.n })));
    if (!items.length) return NA('no practice items');
    const ev = [];
    const noId = items.filter((i) => !i.id).length;
    if (noId) ev.push(`${noId} item(s) without a stable id (legacy positional ids)`);
    const dup = w.findings.filter((f) => f.rule === 'item-id-dup');
    for (const d of dup) ev.push(d.message);
    if (w.objectives.size) { const unk = items.filter((i) => !w.objectives.has(i.objective)); if (unk.length) ev.push(`${unk.length} item(s) with an objective not in course.js`); }
    else ev.push('course.js declares no objectives (v1): items default to l<n>');
    const fail = noId || dup.length || ev.some((e) => e.includes('not in course.js'));
    return res(fail ? 'fail' : w.objectives.size ? 'pass' : 'warn', ev.length ? ev : [`${items.length} items, unique ids, known objectives`]);
  },
  AS2(w) {
    const items = written(w).flatMap((l) => l.items);
    if (!items.length) return NA('no practice items');
    const by = new Map();
    for (const i of items) { const o = i.objective ?? '?'; by.set(o, [...(by.get(o) ?? []), i]); }
    const ev = [];
    for (const [o, its] of by) {
      const nonMcq = its.filter((i) => i.type !== 'choice').length;
      if (its.length < 3 || nonMcq < 1) ev.push(`objective ${o}: ${its.length} item(s), ${nonMcq} non-MCQ (need ≥3 and ≥1)`);
    }
    return res(ev.length ? 'fail' : 'pass', ev.length ? ev : [`${by.size} objective(s), each with ≥3 items and ≥1 non-MCQ`]);
  },
  AS3(w) {
    const cs = written(w).flatMap((l) => l.items.filter((i) => i.type === 'choice').map((i) => ({ ...i, n: l.n })));
    if (!cs.length) return NA('no multiple-choice items');
    const ev = [];
    for (const c of cs) {
      const n = c.options?.length ?? 0, correct = (c.options ?? []).filter((o) => o.correct === true).length;
      if (n < 3 || n > 5) ev.push(`L${c.n} ${c.id ?? '(no id)'}: ${n} options (3–5)`);
      if (correct !== 1) ev.push(`L${c.n} ${c.id ?? '(no id)'}: ${correct} correct options`);
      if ((c.options ?? []).some((o) => ALL_NONE.test(o.text ?? ''))) ev.push(`L${c.n} ${c.id ?? '(no id)'}: "all/none of the above"`);
    }
    return res(ev.length ? 'fail' : 'pass', ev.length ? ev : [`${cs.length} MCQ(s): 3–5 options, one correct`]);
  },
  AS4(w) {
    const cs = written(w).flatMap((l) => l.items.filter((i) => i.type === 'choice').map((i) => ({ ...i, n: l.n })));
    if (!cs.length) return NA('no multiple-choice items');
    const ev = [];
    for (const c of cs) {
      const lens = (c.options ?? []).map((o) => String(o.text ?? '').trim().length);
      if (lens.length < 2) continue;
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      const off = lens.filter((x) => Math.abs(x - mean) > 0.25 * mean);
      if (off.length) ev.push(`L${c.n} ${c.id ?? '(no id)'}: lengths ${lens.join('/')} chars, mean ${mean.toFixed(1)}; ${off.length} outside ±25%`);
    }
    return res(ev.length ? 'fail' : 'pass', ev.length ? ev : ['all MCQ options within ±25% of their mean length']);
  },
  AS5(w) {
    const cs = written(w).flatMap((l) => l.items.filter((i) => i.type === 'choice').map((i) => ({ ...i, n: l.n })));
    if (!cs.length) return NA('no multiple-choice items');
    const ev = [];
    for (const c of cs) {
      const right = (c.options ?? []).find((o) => o.correct);
      if (!(right?.why || c.why)) ev.push(`L${c.n} ${c.id ?? '(no id)'}: no explanation for the correct answer`);
      const wrong = (c.options ?? []).filter((o) => !o.correct);
      const explained = wrong.filter((o) => o.why).length;
      if (wrong.length && explained / wrong.length < 0.5) ev.push(`L${c.n} ${c.id ?? '(no id)'}: ${explained}/${wrong.length} distractors explain why they are wrong`);
    }
    return res(ev.length ? 'fail' : 'pass', ev.length ? ev : ['every MCQ explains the answer and ≥50% of distractors']);
  },
  AS6(w) {
    const its = written(w).flatMap((l) => l.items.filter((i) => i.type === 'recall' || i.type === 'fade').map((i) => ({ ...i, n: l.n })));
    if (!its.length) return NA('no recall or fade items');
    const ev = [];
    for (const i of its) {
      const answers = i.type === 'recall' ? i.accept ?? [] : Array.isArray(i.blanks) ? i.blanks.map((b) => [b]) : Object.values(i.blanks ?? {});
      const flat = answers.flat();
      if (!flat.length || flat.some((a) => typeof a !== 'string' || !a.trim())) ev.push(`L${i.n} ${i.id ?? '(no id)'}: empty or non-string accepted answer`);
      if (i.source === 'legacy') ev.push(`L${i.n} legacy fade: exact-match data-answer with no alternatives`);
    }
    return res(ev.some((e) => !e.includes('legacy')) ? 'fail' : ev.length ? 'warn' : 'pass', ev.length ? ev : ['recall/fade answers are non-empty strings (the runtime normalises case and spacing)']);
  },
  AS7(w) {
    const fades = written(w).flatMap((l) => l.items.filter((i) => i.type === 'fade').map((i) => ({ ...i, l })));
    if (!fades.length) return NA('no faded examples');
    const ev = [];
    for (const f of fades) {
      // A worked example is marked with class="worked" (lesson contract), or introduced by a heading
      // that starts "Worked example" (how lessons written before the class was specified mark it).
      const isWorkedHeading = (t) => /^h[2-4]$/.test(t.name) && /^\s*worked example/i.test(textOf(innerOf(f.l.page.html, t)));
      const worked = f.l.page.tags.filter((t) => (hasClass(t, 'worked') || isWorkedHeading(t)) && (!t.attrs['data-objective'] || t.attrs['data-objective'] === f.objective));
      const place = f.source === 'legacy' ? f.pos : (f.l.page.tags.find((t) => t.attrs['data-practice-item'] === f.id || 'data-practice-set' in t.attrs)?.start ?? Infinity);
      if (!worked.some((t) => t.start < place)) ev.push(`L${f.l.n} ${f.id ?? 'fade'}: no .worked example before it`);
    }
    return res(ev.length ? 'fail' : 'pass', ev.length ? ev : ['every faded example follows a worked example']);
  },
  AS8(w) {
    const ev = [];
    let checked = 0;
    for (const l of written(w)) {
      const prose = textOf(stripHtml(l.page.raw).replace(/<(div|section)[^>]*(quiz-q|fade|data-practice|id="challenge")[\s\S]*?<\/\1>/gi, ' ')).toLowerCase().split(/\W+/).filter(Boolean);
      const grams = new Set(prose.map((_, i) => prose.slice(i, i + 4).join(' ')));
      for (const it of l.items.filter((i) => i.prompt)) {
        const p = it.prompt.toLowerCase().split(/\W+/).filter(Boolean);
        if (p.length < 6) continue;
        checked++;
        const g = p.slice(0, -3).map((_, i) => p.slice(i, i + 4).join(' '));
        const share = g.filter((x) => grams.has(x)).length / g.length;
        if (share > 0.5) ev.push(`L${l.n} ${it.id ?? '(no id)'}: ${(share * 100).toFixed(0)}% of the stem's 4-grams appear verbatim in the lesson prose`);
      }
    }
    if (!checked) return NA('no item stems of 6+ words');
    return res(ev.length ? 'warn' : 'pass', ev.length ? ev : [`${checked} stem(s) checked; none mostly copied from the prose`]);
  },
  AS11(w) {
    const ls = written(w);
    if (!ls.length) return NA('no written lessons');
    const ev = [];
    for (const l of ls) {
      const ch = l.page.tags.find((t) => t.attrs.id === 'challenge');
      if (!ch) { ev.push(`L${l.n}: no #challenge`); continue; }
      const inner = innerOf(l.page.html, ch);
      const crit = tags(inner).find((t) => hasClass(t, 'criteria'));
      const n = crit ? tags(innerOf(inner, crit)).filter((t) => t.name === 'li').length : 0;
      if (!crit || n < 2 || n > 4) ev.push(`L${l.n}: ${crit ? n + ' criteria' : 'no .criteria list'} (need 2–4 <li> in .criteria)`);
      if (!/\bsend\b|\benvie\b|\bmande\b|\bsubmit\b/i.test(textOf(inner))) ev.push(`L${l.n}: the challenge never says what to send back`);
    }
    return res(ev.length ? 'fail' : 'pass', ev.length ? ev : ['every challenge has a task, a send-back and 2–4 criteria']);
  },
  AS12(w) {
    const crits = written(w).flatMap((l) => {
      const ch = l.page.tags.find((t) => t.attrs.id === 'challenge');
      if (!ch) return [];
      const inner = innerOf(l.page.html, ch);
      const crit = tags(inner).find((t) => hasClass(t, 'criteria'));
      if (!crit) return [];
      const ci = innerOf(inner, crit);
      return tags(ci).filter((t) => t.name === 'li').map((t) => ({ n: l.n, text: textOf(innerOf(ci, t)) }));
    });
    if (!crits.length) return NA('no .criteria items');
    const bad = crits.filter((c) => [...DENY_VERBS, ...EVALUATIVE].some((v) => new RegExp(`\\b${v}\\b`, 'i').test(c.text)));
    return res(bad.length ? 'fail' : 'pass', bad.length ? bad.map((c) => `L${c.n}: "${c.text.slice(0, 80)}"`) : [`${crits.length} criteria, none vague`]);
  },
  AS15(w) {
    const ls = written(w);
    if (!ls.length) return NA('no written lessons');
    const ev = [];
    for (const l of ls) {
      const dfn = l.page.tags.filter((t) => t.name === 'dfn').length;
      const scenes = l.page.tags.filter((t) => hasClass(t, 'scene') || 'data-scene' in t.attrs).length;
      const words = textOf(stripHtml(l.page.raw).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')).split(/\s+/).filter(Boolean).length;
      if (dfn > 5 || scenes > 1 || words > 1500) ev.push(`L${l.n}: ${dfn} <dfn>, ${scenes} scene(s), ~${words} words (≤5, ≤1, ≤~1,500)`);
    }
    return res(ev.length ? 'warn' : 'pass', ev.length ? ev : ['every lesson within the load budget']);
  },

  // ---------- Grounding (rubrics/grounding.md, from raw/04 C7; deterministic parts only) ----------
  G1(w) { return perLesson(w, (l) => {
    const uncited = [];
    let numeric = 0;
    for (const t of l.page.tags.filter((t) => ['p', 'li', 'td', 'figcaption'].includes(t.name))) {
      const inner = innerOf(l.page.html, t);
      const txt = textOf(inner);
      if (!/\d/.test(txt.replace(/\b(19|20)\d\d\b/g, '')) || /data-src=|data-grounding=|class="[^"]*\billustrative\b/.test(inner) || 'data-grounding' in t.attrs) continue;
      if (excluded(l.page).some(([a, b]) => a < t.start && t.start < b)) continue;
      numeric++;
      uncited.push(txt.slice(0, 60));
    }
    const cited = l.page.tags.filter((t) => 'data-src' in t.attrs).length;
    const score = !uncited.length ? 2 : cited ? 1 : 0;
    return { score, evidence: `${cited} citation(s); ${uncited.length} numeric paragraph(s) with no data-src or data-grounding${uncited.length ? ': "' + uncited.slice(0, 2).join('", "') + '"' : ''}` };
  }); },
  G3(w) { return perLesson(w, (l) => {
    const cited = citedEntries(w, l);
    if (!cited.length) return { score: null, evidence: 'no citations' };
    const tiers = cited.map((e) => e.tier ?? 'T?');
    const best = tiers.filter((t) => t === 'T1' || t === 'T2').length;
    const score = tiers.every((t) => t === 'T1' || t === 'T2') ? 2 : tiers.some((t) => t === 'T4' || t === 'T5' || t === 'T?') && !best ? 0 : 1;
    return { score, evidence: `cited tiers: ${tiers.join(', ')}` };
  }); },
  G4(w) { return perLesson(w, (l) => {
    const cited = citedEntries(w, l);
    if (!cited.length) return { score: null, evidence: 'no citations' };
    const unv = cited.filter((e) => e.status !== 'verified');
    const marked = l.page.tags.filter((t) => hasClass(t, 'unverified')).length;
    const score = !unv.length ? 2 : marked >= 1 ? 1 : 0;
    return { score, evidence: `${cited.length - unv.length}/${cited.length} cited sources verified; ${marked} .unverified marker(s)` };
  }); },
  G5(w) { return perLesson(w, (l) => {
    const cited = citedEntries(w, l);
    if (!cited.length) return { score: null, evidence: 'no citations' };
    const bad = cited.filter((e) => !e.url || /example\.(com|org)/.test(e.url));
    const weak = cited.filter((e) => e.url && (/^http:/.test(e.url) || /[?&](utm_|fbclid|gclid)/.test(e.url) || (/doi\.org\//.test(e.url) && !/doi\.org\/10\.\d{4,9}\/\S+$/.test(e.url))));
    return { score: bad.length ? 0 : weak.length ? 1 : 2, evidence: `URL syntax only (no fetch): ${bad.length} missing/placeholder, ${weak.length} non-canonical` };
  }); },
  G6(w) { return perLesson(w, (l) => {
    const cited = citedEntries(w, l);
    if (!cited.length) return { score: null, evidence: 'no citations' };
    const today = Date.now();
    const stale = cited.filter((e) => e.date && (today - Date.parse(e.date)) / 864e5 > (/\b(docs|api|tool)\b/i.test(e.text) ? 90 : 180));
    const unscoped = cited.filter((e) => /\b(docs|api|tool)\b/i.test(e.text) && !/\bversion\b/i.test(e.text));
    return { score: unscoped.length ? 0 : stale.length ? 1 : 2, evidence: `${unscoped.length} version-sensitive source(s) without a version; ${stale.length} stale` };
  }); },
};

// Practice and the challenge are questions and tasks, not claims: G1 skips them.
function excluded(page) {
  return page.tags.filter((x) => x.attrs.id === 'challenge' || ['quiz-q', 'fade', 'band-quiz', 'threshold-explorer'].some((c) => hasClass(x, c)) || 'data-practice-set' in x.attrs || 'data-practice-item' in x.attrs)
    .map((x) => [x.start, x.end + innerOf(page.html, x).length]);
}

function citedEntries(w, l) {
  const ids = new Set(l.page.tags.filter((t) => 'data-src' in t.attrs).flatMap((t) => t.attrs['data-src'].split(/[\s,]+/).map((x) => x.toUpperCase())));
  return (w.resources?.entries ?? []).filter((e) => ids.has(e.id));
}
function perLesson(w, fn) {
  const ls = written(w);
  if (!ls.length) return NA('no written lessons');
  const per = ls.map((l) => ({ n: l.n, ...fn(l) }));
  const scored = per.filter((p) => p.score != null);
  if (!scored.length) return res('n/a', per.map((p) => `L${p.n}: ${p.evidence}`), { perLesson: per });
  const min = Math.min(...scored.map((p) => p.score));
  return res(min === 2 ? 'pass' : min === 1 ? 'warn' : 'fail', per.map((p) => `L${p.n}: ${p.score ?? 'n/a'}/2 — ${p.evidence}`), { perLesson: per, score: min });
}

// Rubric index: id → [rubric, kind, title]. R items are listed so reports show what is not covered.
export const RUBRIC = [
  ['CR1', 'curriculum', 'M', 'Milestones match MISSION success criteria; every milestone has a lesson'],
  ['CR2', 'curriculum', 'M', 'Lesson milestone refs exist; numbering 1..N; file pattern'],
  ['CR3', 'curriculum', 'M', '1–3 objectives per lesson; observable canDo (verb denylist)'],
  ['CR4', 'curriculum', 'M', 'requires only points to earlier lessons; acyclic'],
  ['CR5', 'curriculum', 'M', 'One milestone challenge per milestone, on its last lesson'],
  ['CR6', 'curriculum', 'M', 'Title contains "and" at most once'],
  ['CR7', 'curriculum', 'R', 'Sequence starts at the diagnostic floor, not claims'],
  ['CR8', 'curriculum', 'M', 'From lesson 3, ≥1 interleaved item from an earlier objective'],
  ['CR9', 'curriculum', 'M', 'Motion/lab decision line per lesson in NOTES.md'],
  ['CR10', 'curriculum', 'R', 'Out-of-scope respected; each lesson traces to the mission'],
  ['CR11', 'curriculum', 'R', 'One idea per lesson; fits one sitting'],
  ['AS1', 'lesson-assessment', 'M', 'Practice items have unique ids and known objectives'],
  ['AS2', 'lesson-assessment', 'M', '≥3 items per objective, ≥1 non-MCQ'],
  ['AS3', 'lesson-assessment', 'M', 'MCQ: 3–5 options, exactly one correct, no all/none of the above'],
  ['AS4', 'lesson-assessment', 'M', 'MCQ option lengths within ±25% of their mean'],
  ['AS5', 'lesson-assessment', 'M', 'MCQ explains the answer; ≥50% of distractors explained'],
  ['AS6', 'lesson-assessment', 'M', 'Recall/fade answers normalisable, alternatives given'],
  ['AS7', 'lesson-assessment', 'M', 'A worked example precedes each faded example'],
  ['AS8', 'lesson-assessment', 'M', 'Item stems not copied from the prose (heuristic flag)'],
  ['AS9', 'lesson-assessment', 'R', 'Distractors encode real misconceptions; items test the objective'],
  ['AS10', 'lesson-assessment', 'R', 'A novice cannot answer from wording or length cues'],
  ['AS11', 'lesson-assessment', 'M', 'Challenge has task, send-back, 2–4 criteria in .criteria'],
  ['AS12', 'lesson-assessment', 'M', 'No vague or evaluative-only criteria'],
  ['AS13', 'lesson-assessment', 'R', 'Criteria name observable artifacts and cover the canDo'],
  ['AS14', 'lesson-assessment', 'R', "Challenge is transfer, on the learner's material"],
  ['AS15', 'lesson-assessment', 'M', 'Load budget: ≤5 <dfn>, ≤1 scene, ≤~1,500 words'],
  ['AS16', 'lesson-assessment', 'R', 'Each worked example has a self-explanation prompt'],
  ['G1', 'grounding', 'M', 'Coverage: numeric/factual paragraphs cited or marked (partial M)'],
  ['G2', 'grounding', 'R', 'Fidelity: claim matches the quote and locator'],
  ['G3', 'grounding', 'M', 'Tier: T1/T2 behind numbers and core claims'],
  ['G4', 'grounding', 'M', 'Verification status shown honestly'],
  ['G5', 'grounding', 'M', 'Link integrity (syntax only; resolution needs a fetch: R)'],
  ['G6', 'grounding', 'M', 'Currency: version scope and freshness'],
  ['G7', 'grounding', 'R', 'Epistemic status: disputed findings flagged with a counter-source'],
  ['G8', 'grounding', 'R', 'Injection hygiene: annotations in own words, commands reviewed'],
];

export async function scoreWorkspace(wsDir) {
  const w = await collect(wsDir);
  const results = RUBRIC.map(([id, rubric, kind, title]) => {
    if (kind === 'R') return { id, rubric, kind, title, status: 'not-scored', evidence: ['needs a human or model reviewer (see evaluations/README.md)'] };
    try { return { id, rubric, kind, title, ...scorers[id](w) }; } catch (e) { return { id, rubric, kind, title, status: 'error', evidence: [e.message] }; }
  });
  const errors = w.findings.filter((f) => f.level === 'error').length;
  const count = (s) => results.filter((r) => r.status === s).length;
  return {
    workspace: basename(w.ws), scoredAt: new Date().toISOString(),
    course: w.course ? { id: w.course.id, schemaVersion: w.course.schemaVersion ?? 1, milestones: w.course.milestones?.length ?? 0, lessons: w.course.lessons?.length ?? 0, written: written(w).length } : null,
    lint: { errors, warnings: w.findings.length - errors, findings: w.findings },
    summary: { pass: count('pass'), warn: count('warn'), fail: count('fail'), na: count('n/a'), notScored: count('not-scored'), machineCheckable: results.filter((r) => r.kind === 'M').length, machinePassRate: `${count('pass')}/${results.filter((r) => r.kind === 'M' && r.status !== 'n/a').length}` },
    results,
  };
}

export function toMarkdown(s) {
  const L = [`# Workspace score — ${s.workspace}`, ''];
  if (s.course) L.push(`Course \`${s.course.id}\` · schemaVersion ${s.course.schemaVersion} · ${s.course.milestones} milestones · ${s.course.lessons} lessons (${s.course.written} written).`, '');
  L.push(`Scored ${s.scoredAt.slice(0, 10)} by \`evaluations/runners/score-workspace.mjs\` (deterministic; no model calls). R criteria need a reviewer and are not scored here.`, '');
  L.push(`**Lint:** ${s.lint.errors} error(s), ${s.lint.warnings} warning(s). **Rubric (M items):** ${s.summary.pass} pass, ${s.summary.warn} warn, ${s.summary.fail} fail, ${s.summary.na} n/a; pass rate on applicable M items ${s.summary.machinePassRate}. ${s.summary.notScored} R items not scored.`, '');
  L.push('| ID | Rubric | M/R | Criterion | Result | Evidence |', '|---|---|---|---|---|---|');
  const cell = (x) => String(x).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  for (const r of s.results) L.push(`| ${r.id} | ${r.rubric} | ${r.kind} | ${cell(r.title)} | ${r.status}${r.score != null ? ` (${r.score}/2)` : ''} | ${cell(r.evidence.join('; ').slice(0, 400))} |`);
  if (s.lint.findings.length) {
    L.push('', '## Lint findings', '', '| Level | Rule | File | Message |', '|---|---|---|---|');
    for (const f of s.lint.findings) L.push(`| ${f.level} | ${f.rule} | ${f.file} | ${cell(f.message)} |`);
  }
  return L.join('\n') + '\n';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const ws = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
  if (!ws) { console.error('usage: score-workspace.mjs <workspace> [--json] [--out <prefix>]'); process.exit(2); }
  const s = await scoreWorkspace(ws);
  const oi = args.indexOf('--out');
  if (oi >= 0) {
    const out = args[oi + 1];
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(`${out}.json`, JSON.stringify(s, null, 2) + '\n');
    writeFileSync(`${out}.md`, toMarkdown(s));
    console.log(`wrote ${out}.json and ${out}.md`);
  }
  if (args.includes('--json')) console.log(JSON.stringify(s, null, 2));
  else process.stdout.write(toMarkdown(s));
}
