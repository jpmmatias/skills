# Data architecture & local-first audit (Agent 08)

Scope: learner state, progress tracking, record formats, portability. Evidence from reading the files and from the baseline browser probe (`docs/audit/BASELINE.md`).

## Where learner state lives today

| State | Location | Written by | Read by | Format |
|---|---|---|---|---|
| Why / success criteria | `MISSION.md` | agent | agent | Markdown, loose template |
| Milestone status + evidence pointer | `assets/course.js` | agent | browser + agent | JS (`window.COURSE = {…}`) |
| Practice answers, XP, review schedule | `localStorage["learn:<course.id>"]` | browser | browser only | JSON, unversioned |
| Graded evidence, prior knowledge, misconceptions | `learning-records/NNNN-*.md` | agent | agent | Markdown, free-form |
| Vocabulary | `GLOSSARY.md` | agent | agent | Markdown |
| Sources | `RESOURCES.md` | agent | agent | Markdown |
| Preferences, per-lesson decisions | `NOTES.md` | agent | agent | Markdown, free-form |

## Findings

### DATA-01 — Practice evidence is invisible to the agent (P1)
Evidence: `progress.js:20-21` stores everything in `localStorage`; nothing writes it to disk. `SKILL.md:241` "Progress lives in `localStorage` … It is a convenience".
Impact: the agent that picks the next lesson ("zone of proximal development", `SKILL.md:298-306`) and the review prompts cannot see what the learner got wrong. A Review or Practice mode that is "based on evidence" is impossible without it.
Recommendation: a learner-initiated **export** (dashboard button → `progress-<course>-<date>.json` download, works on `file://`) and **import** (merge by event id). The agent reads exported files from `progress/` in the workspace. No server, no sync.
Complexity: M. Risk: low (additive).

### DATA-02 — Unversioned browser state, no migration (P1)
Evidence: `progress.js:22` `Object.assign({ xp: 0, answers: {}, lessons: {} }, load())`.
Impact: any change to the shape silently corrupts or drops existing progress.
Recommendation: `schemaVersion` field; on load, migrate v1 → v2 after writing a one-time backup key (`learn:<id>:backup-v1`). Never delete the v1 data until the v2 write succeeds.
Complexity: S. Risk: medium (touches real learner data) → needs tests.

### DATA-03 — First-try results are overwritten (P1, data integrity)
Evidence: `progress.js:108` `S.answers[k] = { ok, at: Date.now() }` runs on every page load's first click (`quiz.js:33`). Probe: wrong → reload → right stores `ok: true`.
Impact: "practice mastery" (defined as first-try correct share, `SKILL.md:235`) is inflated; the history of misses, which is the most useful signal for review, is destroyed.
Recommendation: append-only event log; derive mastery from the first-ever attempt per item and review outcomes from the first attempt per session.
Complexity: M. Risk: medium.

### DATA-04 — Key collisions between courses (P2)
Evidence: `course.js:5` template `id: 'topic-slug'`; `progress.js:16` `KEY = 'learn:' + C.id`. In Chromium, `file://` pages share one storage origin.
Impact: two courses whose agent forgot to change the id share XP and answers.
Recommendation: the validator rejects the placeholder id; the runtime warns visibly when `id === 'topic-slug'`.
Complexity: S. Risk: low.

### DATA-05 — Storage failures are silent (P2)
Evidence: `progress.js:21` `catch {}`.
Impact: in private windows or with storage blocked, the learner believes progress is saved.
Recommendation: detect once, show a one-line notice ("Progress can't be saved in this browser window; export works"), keep working in memory.
Complexity: S. Risk: low.

### DATA-06 — Learning records aren't machine-checkable (P2)
Evidence: `LEARNING-RECORD-FORMAT.md:9-15` (title + paragraph only); `course.js` milestone `evidence: 'LR-0003'` (`SKILL.md:226`) points at a record by convention only.
Impact: nothing verifies that a `mastered` milestone has a real record with an Evidence section.
Recommendation: optional frontmatter (`id`, `kind`, `milestone`, `result`, `date`, `evidence-level`), still human-readable. Old records without frontmatter stay valid; the validator checks the mastered → record link either way (file name number).
Complexity: S. Risk: low.

### DATA-07 — `course.js` is JavaScript, not data (P3, keep with guardrails)
Evidence: `course.js:4` `window.COURSE = {…}` with comments and single quotes.
Reason it exists: lessons open from `file://`, where `fetch()` of a local JSON file is blocked in Chromium. A `<script>` is the only zero-server way to load data. **Keep it.**
Recommendation: document the decision (ADR); validate by evaluating it in a Node `vm` context with a fake `window`, then checking the object against `schemas/course.schema.json`. Add `schemaVersion`.
Complexity: S. Risk: low.

### DATA-08 — Review schedule never regresses (P2, pedagogy-linked)
Evidence: `progress.js:110-112` stage only increments; a wrong answer at review time has no effect.
Impact: a learner who fails every review is still pushed to 14- and 30-day intervals.
Recommendation: see the pedagogy spec (Leitner-style: correct session → next box; any miss → back one box).
Complexity: S. Risk: low.

## Storage technology decision

Markdown + JSON files in the learner's folder stay the source of truth; `localStorage` stays a per-browser cache of practice events with export/import. IndexedDB and SQLite are **not** justified: the data is a few hundred small events per course (kilobytes), there is no query need beyond filtering by lesson, and both would make the state less human-readable and less portable.

## Source-of-truth rules (proposed)

1. `MISSION.md` owns the why and the success criteria.
2. `learning-records/` owns graded evidence. `course.js` milestone status is a **projection** of it and must agree.
3. The browser owns practice events until exported; exported files in `progress/` are read-only inputs for the agent.
4. If `course.js` and the records disagree, the records win and the validator reports it.
