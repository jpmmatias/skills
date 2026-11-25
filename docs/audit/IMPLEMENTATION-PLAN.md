# Implementation plan and ledger

This is the single source of truth for implementation status. The orchestrator owns this file; workstream agents report through handoffs, and the orchestrator updates the ledger at the bottom.

Product name: **Learncraft**, chosen by the owner on 2026-11-24. The skill and command stay `learn`, the marketplace stays `jpmmatias`, and the GitHub repository is not renamed.

## Scope

**In:** the P0/P1 findings and the P2 findings listed per workstream; three example courses and a static demo; validation, tests, evaluations and CI; documentation.

**Deferred (roadmap):** cloud sync, accounts, agent evidence compiled into the browser (`assets/evidence.js`), the Repository Learning mode (documented as experimental only), Firefox and Safari verification, and live multi-agent comparative evaluations (harness only; no paid runs).

## File ownership (no two agents edit the same file)

| WS | Owner role | Owns | Must not touch |
|---|---|---|---|
| A | Skill architecture + pedagogy + grounding text (Agents 02/03/04) | `skills/**/*.md` (incl. `*-FORMAT.md`, `lesson-panel/agents/*.md`), new `skills/learn/workflows/`, `skills/learn/references/`, plugin-root `agents/`, `.claude-plugin/marketplace.json` | anything under `skills/learn/starter/` |
| C1 | Frontend + UX + a11y (Agents 05/06/10) | `starter/assets/{core.js, progress.js, practice.js, quiz.js, course.js, style.css, theme.css}`, `starter/templates/**`, `skills/learn/themes/*.css` | `store.js`, `figures.css`, `diagram.js`, `scene.js` |
| C2 | Visualization & motion (Agent 07) | `starter/assets/{scene.js, diagram.js, viz.js, figures.css}`, `starter/examples/**` | `core.js` (uses its API), `style.css` |
| D | Data & local-first (Agent 08) | `starter/assets/store.js`, `schemas/**`, `scripts/lib/schema.mjs`, `tests/store.test.mjs`, `tests/schema.test.mjs`, `docs/architecture/data-model.md` | UI files |
| E | QA, evaluation, release, security tests (Agents 09/10/12) | `scripts/validate.mjs` (+ `scripts/lib/*` except `schema.mjs`), root `package.json`, `.github/**`, `starter/tools/**`, `evaluations/**`, `tests/*` (except D's two files), `CONTRIBUTING.md`, `SECURITY.md` | runtime files |
| F | Brand, docs, demo (Agent 11 + course authors) | `README.md`, `docs/GUIDE.md`, `docs/brand/**`, `docs/guides/**`, `docs/compatibility.md`, `media/**`, `examples/**` | runtime, skills |
| Orchestrator | Principal architect | `docs/audit/**`, `docs/decisions/**`, `CHANGELOG.md`, integration fixes after review | – |

The paths in the table are relative to `skills/learn/` where they start with `starter/` or `themes/`.

## Interface contracts (fixed before parallel work starts)

### 1. Page shell and script order (lesson pages)

```html
<html lang="{course lang}">
<link rel="stylesheet" href="../assets/style.css">   <!-- imports figures.css -->
<link rel="stylesheet" href="../assets/theme.css">
<body data-lesson="3">
<main> … prose … <div id="progress"></div> … <div data-practice-set></div> … <section id="challenge">…</section> </main>
<script src="../assets/core.js"></script>
<script src="../assets/store.js"></script>
<script src="../assets/course.js"></script>
<script src="../lessons/0003.practice.js"></script>   <!-- optional: practice items as data -->
<script src="../assets/progress.js"></script>
<script src="../assets/practice.js"></script>
<script src="../assets/diagram.js"></script>          <!-- optional -->
<script src="../assets/scene.js"></script>            <!-- optional -->
<script src="scenes-0003.js"></script>                <!-- optional -->
```

All runtime scripts are classic scripts (no modules, no build) and are safe to load in any order after `core.js`. Each boots on `DOMContentLoaded` through `Learncraft.ready(fn)`.

### 2. `core.js` → `window.Learncraft` (owner C1, used by C2)

| Member | Contract |
|---|---|
| `esc(s)` | HTML-escapes `& < > " '`. |
| `html` | Tagged template that escapes every interpolation; `html.raw(s)` marks trusted markup. |
| `sanitize(s)` | Allows only `<b> <strong> <em> <i> <code> <br> <sup> <sub> <a href>`, with `href` limited to `http(s):`, relative or `#`. Used for captions and `why` text. |
| `ready(fn)` | Runs after `DOMContentLoaded`. |
| `mount(el, name, fn)` | Runs `fn(el)` in try/catch; on error, renders an inline `.lc-error` box naming `name` and logs it. |
| `register(type, def)` / `mountAll(root)` | Registry for `[data-lc="type"]` components; `def.mount(el, ctx)` returns an optional `{destroy}`. |
| `announce(msg)` | Writes to one shared polite live region. |
| `t(key, vars)` | i18n lookup: `COURSE.strings[key]`, then the built-in table for `COURSE.lang` (`en`, `pt`), then `en`. |
| `rng(seed)` | mulberry32; returns `() => [0,1)`. |
| `reducedMotion()` | Live `matchMedia` value, not cached. |
| `onVisible(el, cb, threshold)` | IntersectionObserver wrapper, firing once; falls back to immediate. |
| `observeVisibility(el, onChange)` | Fires on enter/leave plus `visibilitychange`; used by players to pause. |

### 3. `store.js` → `Learncraft.store` (owner D, used by C1). UMD: also `module.exports` for Node tests.

- **Storage:** v2 lives at `localStorage["learn:<courseId>:v2"]`. The v0 key `learn:<courseId>` is read once to migrate and is **never written or deleted** (rollback and downgrade safety).
- **Document:** `{ format: "learncraft-progress", schemaVersion: 2, course, createdAt, updatedAt, events: [Event] }`.
- **Event:** a subset of the pedagogy spec (raw/03-pedagogy.md §5): `{ v:1, id, at, course, kind, source, context, lesson, objective, item, itemType, itemVersion, session, attemptInSession, firstEver, outcome, score?, assisted, note? }`.
  - `kind` ∈ `exposure | attempt | review_session | migration`
  - `source` ∈ `browser | migration | import`
  - `context` ∈ `lesson | practice | review | diagnostic`
  - `outcome` ∈ `correct | incorrect | n/a`; `review_session` events carry `results: [{item, outcome}]` and `passed`.
- **Factory:** `createStore({ courseId, storage = localStorage, now = Date.now, random = Math.random })`.
- **API:** `load() → {ok, persistent, migrated}`, `recordExposure(lesson)`, `recordAttempt({...}) → event`, `firstAttempt(item, itemVersion) → event|null`, `lessonStats(lesson, itemIds?) → {items, attempted, firstTryCorrect, pct}`, `level(objective, {itemTypes, milestoneMastered}) → {level, name, basis}`, `schedule(objective, {itemIds}) → {box, due, status, explanation}`, `due(now) → [{objective, box, due, overdueRatio}]`, `recordReviewSession({objective, results, session}) → {passed, box, due, explanation}`, `xp()`, `exportJSON()`, `importJSON(text) → {added, skipped, errors}`.
- **Pure exports:** `migrateV0`, `deriveSchedule`, `deriveLevel`, `normalizeAnswer`, `itemVersion(text)` (a short stable hash).
- **Rules:**
  - Append-only; no edit or delete API.
  - First-ever attempts are immutable.
  - Levels and schedules are always derived, never stored.
  - Leitner, 5 boxes: intervals 1/3/7/14/30 days. Only `review_session` events move boxes. A pass on or after the due date moves up one box; an early pass is logged with no change; any fail returns to box 1, due in one day, status `lapsed`.
  - Migrated legacy answers count toward L2 only.
  - XP = 10 × first-ever correct attempts; the displayed value is `max(legacyXp, computed)`.

### 4. Practice items as data (owner C1 renders, owner A documents, owner E lints)

```js
// lessons/0003.practice.js
Learncraft.practice(3, [
  { id: 'l3-attn-weights', type: 'choice', objective: 'l3.o1',
    prompt: 'What do the attention weights of one query sum to?',
    options: [ { text: '1', correct: true, why: 'They come out of a softmax.' },
               { text: 'The sequence length', why: 'That is the number of weights, not their sum.' } ] },
  { id: 'l3-recall-softmax', type: 'recall', objective: 'l3.o1',
    prompt: 'Which function turns scores into weights?',
    accept: ['softmax'], why: '…' },
  { id: 'l3-order-steps', type: 'order', objective: 'l3.o2', prompt: '…', steps: ['…','…','…'] },
  { id: 'l3-fade-qkv', type: 'fade', objective: 'l3.o2', prompt: '…',
    template: 'scores = Q · {{K}}ᵀ / √{{d_k}}', blanks: { K: ['K'], d_k: ['d_k', 'dk'] } },
]);
```

- Placement: `<div data-practice-set></div>` renders all of the lesson's items in order; `<div data-practice-item="id"></div>` renders one.
- `id`: required, unique course-wide, `^[a-z0-9][a-z0-9-]*$`.
- `objective`: defaults to `l<n>`.
- `itemVersion`: computed from prompt + answers, so editing a question starts a new history.
- **Legacy markup** (`.quiz-q` with buttons, `.fade` with inputs) keeps working through `practice.js`, using `data-id` when present, else a positional id marked `legacy` (the check warns).
- `review.html` (template at the workspace root) loads `course.js` and then injects each lesson's `NNNN.practice.js` (a dynamic `<script>` works on `file://`). It runs a cold, interleaved session for due objectives: recall/order/fade preferred, no lesson text shown.

### 5. `course.js` v2 (owner A documents; C1 renders; D schemas; E validates)

```js
window.COURSE = {
  schemaVersion: 2,
  id: 'transformers-from-scratch',          // template id 'topic-slug' is rejected by the validator
  topic: 'How transformers work', lang: 'en', example: false,
  mission: '…',
  milestones: [ { id: 'm1', label: '…', canDo: '…', status: 'in-progress', evidence: null } ],
  lessons: [ { n: 1, file: 'lessons/0001-tokens.html', title: '…', milestones: ['m1'], canDo: '…',
               objectives: [ { id: 'l1.o1', text: 'Explain why text is split into tokens before embedding' } ],
               practice: 'lessons/0001.practice.js' } ],
  strings: {}                                // optional UI string overrides
};
```

`schemaVersion` missing means v1. The runtime accepts v1 unchanged; v1 lessons have no `objectives` (the objective defaults to `l<n>`).

### 6. Source records and claim traceability (owner A specifies; E lints; F uses in examples)

- `RESOURCES.md` entry: `- [S3] [Title](url) — Author/Publisher · type · tier T1–T5 · verified 2026-11-24 | unverified (reason) · version: React 19` followed by an annotation line.
- Lesson HTML: `<sup class="cite"><a href="../RESOURCES.md#s3" data-src="S3">3</a></sup>`. Claims resting on unverified sources are wrapped in `<span class="unverified" title="Not independently verified">…</span>`, which the runtime styles visibly.
- The linter checks: every `data-src` resolves to an entry; ids are unique; every entry has a status.

### 7. Assets path for agents

The skill says `${CLAUDE_SKILL_DIR}` (substituted by Claude Code), with a fallback line for other agents: "the folder that contains this SKILL.md". The Playwright tools install into `~/.cache/learncraft/tools` (stable across updates); `check.mjs` resolves Playwright from there, from local `node_modules` or from the global root.

## Workstreams and acceptance criteria

**A — Skill architecture, pedagogy, grounding**
- `learn/SKILL.md` ≤ ~110 lines, acting as a router.
- Workflows and references per raw/02 Proposal 1.
- One next-lesson rule and one challenge-review procedure. The pipeline skills become wrappers with a `Requires: learn` preflight and marketplace `dependencies`.
- Profiles (Fast / Balanced default / Deep) with budgets.
- Handoff contracts with `content_sha256`, round caps and escalation.
- Failure handling and the offline policy.
- Prompt-injection rules.
- Mastery levels, diagnostic, modes (Quick, Deep, Course, Practice, Review; Repository experimental).
- Source tiers, schema and traceability.
- Learning-record frontmatter (optional, backward compatible).
- Native subagent files.
- Citations corrected (Deci link; claims softened to match their sources).
- Every relative link resolves (checked by E's validator).

**C1 — Runtime UI**
- `core.js` per contract; `progress.js` and `practice.js` on top of the store.
- No unescaped interpolation (E's XSS test passes).
- One milestone renders.
- The dashboard leads with "Next up".
- Mastery levels in words; XP demoted; level removed.
- Export/import buttons; a storage-unavailable notice; `review.html`.
- All feedback announced; inputs labelled; per-option `why`; recall normalisation.
- i18n `en` + `pt`; control-border contrast ≥ 3:1.
- Templates for index, lesson, review and reference.
- The legacy markup still works.

**C2 — Visualization & motion**
- A shared timeline: pause off-screen and on hidden tabs, clamp delta, scrub by 1% plus chapter keys with `aria-valuetext`, narration `lang`, speech guards, a `poster` option, per-scene try/catch.
- Generic primitives in `viz.js`: param slider, seeded RNG use, bars/histogram with final state at first paint and data-derived alt text, number line with zones from data, flow graph from data.
- Jev-specific components and tokens moved to `starter/examples/jev-confidence/`.
- Figure text ≥ 11px rendered at 390px, or a phone layout.
- The example scene's "real data" labels fixed.

**D — Data**
- `store.js` per contract with Node tests: migration, immutability, Leitner transitions, early/late/fail, import dedupe, quota failure, the template id.
- JSON Schemas: course v2, progress export, practice items, source record, learning-record frontmatter, review handoff.
- A zero-dependency subset validator.
- `docs/architecture/data-model.md`.

**E — QA, evaluation, release**
- `scripts/validate.mjs` (frontmatter, names, marketplace, links, JSON, no hardcoded `~/.claude` paths, schemas).
- `check.mjs` hardened: Playwright resolution, settle-wait, dark and reduced-motion passes, data lint, optional axe.
- `node --test` suite, including Playwright smoke and XSS regression tests (skipped with a reason when Playwright is missing).
- `evaluations/`: rubrics, fixtures (6 topics × 3 levels), a deterministic workspace scorer, an instruction-cost meter, and an optional live runner (documented, not executed).
- CI workflows.
- CONTRIBUTING, SECURITY, issue/PR templates.

**F — Brand, docs, demo**
- README rewrite (structure per the brief), GUIDE update.
- Brand guidelines, compatibility matrix, migration/upgrade guide.
- Social preview.
- Three example courses under `examples/` built on the new runtime, explicitly marked as examples with no learner progress, and a static gallery for GitHub Pages.

## Sequencing

1. **Now, in parallel:** A, C1, C2, D, E. C1 writes `core.js` first; C2 codes against the contract.
2. **After C1, C2 and D land:** integration pass by the orchestrator; the browser smoke tests run green.
3. **Then, in parallel:** F's three course authors and F's docs/brand work.
4. **Cross-review (Phase 4):** independent reviewers per the review matrix in the brief.
5. **Validation report and release preparation.**

## Ledger

| WS | Status | Commit | Notes |
|---|---|---|---|
| Orchestrator | done | 4ac10da | Baseline, data audit, findings, plan, ADRs, CSS split (screenshot diff with seeded randomness shows no visual change) |
| D | done | 68c02c9 | store.js + 7 schemas + subset validator; 133/133 tests. Additive API extras accepted (handoffs/D.md). First try = earliest attempt by time (robust to merged logs); legacy stage → box min(stage+1, 2). |
| A | done | 3f087cd | Router 80 lines; 12 workflows, 13 references; native agents in `subagents/` (a root `agents/` folder loaded in all five root-sourced plugins — tested); `claude plugin validate --strict` passes; install of one pipeline plugin pulled in `learn`. |
| Orchestrator | done | 7089b03, a3057d6, 41ae088 | Integration: claim-strength enum aligned with grounding.md; `practice: null` accepted and documented; band tokens removed from style.css (the example defines its own); scene `poster`/`phone` documented. |
| C1 | done | 4e3ab9b | core/practice/progress/review; 58 browser checks pass; axe 0 violations in 32 runs (Chromium). CSP `'self'` matches `file:` in Chromium; inline scripts are blocked, so lessons have none. |
| C2 | done | 04df3c3 | viz.js timeline/slider/explorable/histogram; scene and diagram rebuilt; Jev code moved to an example; axe 0 in 12 runs; text at 390px ≥ 11px (was 5.2–7.3px). |
| E | running | – | |
| F1–F3 | running | – | Three example courses |
| F4 | running | – | README, guide, brand, compatibility, gallery |

### Open integration items

- `observeVisibility` reports "hidden" only when fully off-screen; `viz.js` uses its own 25% check. Harmless duplication (P3).
- A lesson inherits "Applied" from a reviewed milestone before its own practice is done, which is correct per ADR-005 but confusing on the dashboard. To review in Phase 4.
- Legacy pages without `core.js` are bootstrapped with `document.write` (quiz.js shim). Legacy only. To review in Phase 4.
