# Handoff: workstream D (Data architecture and local-first)

## Agent
Agent 08, Data Architecture & Local-First (workstream D).

## Task
- Build `store.js` per plan §3.
- Write the JSON Schemas: course v2, progress export, evidence event, practice items, source record, learning-record frontmatter, review handoff.
- Write a zero-dependency subset validator with `course.js` and practice loaders.
- Write Node tests and `docs/architecture/data-model.md`.

## Status
Done. `node --test tests/store.test.mjs tests/schema.test.mjs` is green: 133 tests, 0 failures. Not committed.

## Files inspected
- `docs/audit/IMPLEMENTATION-PLAN.md` (§3–§6), `docs/audit/DECISIONS.md` (ADR-003/004/005/006/011), `docs/audit/FINDINGS.md`, `docs/audit/BASELINE.md`
- `docs/audit/raw/08-data.md`; `raw/03-pedagogy.md` §4–§6; `raw/02-ai-architecture.md` Proposal 3; `raw/04-grounding.md` C1–C3; `raw/05-frontend-ux-a11y-security.md` (FE-14 file:// origin)
- `skills/learn/starter/assets/{progress.js, course.js, quiz.js}` (v0 format and v0 item ids)
- C1's in-progress `core.js` and `practice.js`, read only to align on how they call the store
- E's `package.json` and `scripts/lib/*`

## Files modified (all new; nothing outside D's ownership was touched)
- `skills/learn/starter/assets/store.js` (453 lines, ES2017, UMD)
- `schemas/course.schema.json`, `evidence-event.schema.json`, `progress-export.schema.json`, `practice-items.schema.json`, `source-record.schema.json`, `learning-record-frontmatter.schema.json`, `review-handoff.schema.json`
- `scripts/lib/schema.mjs`
- `tests/store.test.mjs`, `tests/schema.test.mjs`
- `tests/fixtures/data/**` (63 fixtures, plus `expectations.json`)
- `docs/architecture/data-model.md`

## Findings addressed
| Finding | What was done |
|---|---|
| F-01 / PED-01 / DATA-03 | Append-only frozen event log. The first try is the earliest attempt per item + version. The baseline scenario (wrong → reload → right) is tested. |
| F-04 (data side) | `itemVersion` hash: an edited question starts a new history. Ids are course-wide (schema pattern, plus a `practiceLint` duplicate check). |
| F-05 / PED-03 / DATA-08 | Leitner, 5 boxes. Only review sessions move cards. An early pass changes nothing; any fail goes back to box 1 with status `lapsed`. Each change has an explanation string. |
| F-07 / DATA-01 / PED-08 | `exportJSON`, `exportFilename` and `importJSON`, with dedupe, a course check and per-event validation |
| F-08 / DATA-02 | Versioned v2 key and `migrateV0`. v0 is never written or deleted; a corrupt v2 key is backed up and re-migrated; a newer format is opened read-only. |
| F-34 / DATA-04 / DATA-05 | `load().templateId` and `courseLint` flag the template id. `load().persistent` and `store.persistent` report storage failure; the store keeps working in memory. |
| F-35 / DATA-06 | Learning-record frontmatter schema |
| F-17 / F-26 (schema side) | Source-record schema: tiers, statuses, `reason`, `versionScope` lint |
| F-11 (schema side) | Review-handoff schema (state, author, review) and `handoffLint` |
| DATA-07 / ADR-004 | `loadCourseJs` in `node:vm` (stub window, 1 s timeout, no string code generation); course schema v2 that still accepts v1 |
| F-02 (data side) | Loaded and imported data is validated and rebuilt from known fields. `__proto__`, `constructor` and `prototype` keys are stripped at every depth. |

## Decisions
1. **`due` values are epoch milliseconds** in `schedule()`, `due()` and `recordReviewSession()`. C1's `practice.js` already compares them as numbers.
2. **First try is derived by time, not from the stored `firstEver` flag.** A log merged from two browsers then gets the right answer. `firstEver` is still written, and is informational.
3. **L5 drops while the latest review failed.** History is kept, and the next pass restores it. Showing "Retained" right after a failed review would mislead.
4. **Legacy schedule maps to objectives by prefix.** It is one `migration` event per lesson, applied to every objective of that lesson through the `l<n>.` prefix (or an explicit `lesson` option). `due()` hides the bare `l<n>` card once any `l<n>.*` objective has events.
5. **v0 stage 0 maps to box 1.** The v0 interval index was `stage`, so box = `min(stage + 1, 2)`. raw/03 suggested `min(stage, 2)`, which would give box 0 for stage 0.
6. **Compaction makes one count event per lesson, not one in total**, so L1 ("Seen") survives compaction.
7. **Every write re-reads storage and merges by id**, so two open tabs do not clobber each other.
8. **`recordExposure` dedupes per page session and lesson.**
9. **Schema status names follow the plan:** `verified | unverified | unavailable`, not raw/04's `verified-fetched` / `from-memory-unverified`.
10. **Cross-field rules a subset schema cannot express live in lint helpers:** exactly one correct option, fade template ↔ blanks, the template id, `REVISE` needs a blocker or major item, `versionScope` for docs/api/tool. Mastered ⇒ evidence and declined ⇒ reason are expressed in the schemas with `anyOf`.

## Public API shipped (`window.Learncraft.store` / `requireClassic(...)`)
- **Pure exports:**
  - `createStore`, `migrateV0(v0, {courseId, now})`
  - `deriveSchedule(events, objective, {itemIds, now, t, formatDate, lesson})`
  - `deriveLevel(events, objective, {itemTypes, milestoneMastered, transferDemonstrated, lesson})`
  - `normalizeAnswer`, `itemVersion(textOrItem)`
  - Extras: `matchAnswer(input, accept)`, `sanitizeEvent`, `lessonOf`, `FORMAT`, `SCHEMA_VERSION`, `INTERVALS`, `LEVEL_NAMES`, `RECALL_TYPES`
- **`createStore({courseId, storage, now, random})` returns:**
  - `load() → {ok, persistent, migrated, rejected, templateId, reason?}`
  - `recordExposure(lesson)`
  - `recordAttempt({lesson, objective, item, itemType, itemVersion, outcome | correct, score, assisted, context, session, note}) → event`
  - `firstAttempt(item, itemVersion?)`
  - `lessonStats(lesson, itemIds?) → {items, attempted, firstTryCorrect, pct, legacy}`
  - `level(objective, opts) → {level, name, basis}`
  - `schedule(objective, {itemIds, t}) → {box, due, status, explanation, log}`
  - `due(now, {itemIds}) → [{objective, box, due, status, overdueRatio}]`
  - `recordReviewSession({objective, results, session, lesson, itemIds, t}) → {passed, box, due, status, explanation}`
  - `xp()`, `exportJSON()`, `importJSON(text, {force})`
  - Extras: `exportFilename()`, `subscribe(fn) → unsubscribe`, `events()`, getters `persistent` and `lastLoad`, and properties `courseId`, `key`, `session`

**Deviations from plan §3. All are additive; no contract member is missing or renamed.**
- `load()` adds `rejected`, `templateId` and `reason`.
- `lessonStats` adds `legacy` and accepts `{id, itemVersion}` objects.
- `schedule` adds `log`. `due` adds `status` and takes an optional second argument.
- `importJSON` takes `{force}`. `errors` is an array of strings.
- `basis` adds `items` and `legacy`.
- `recordAttempt` accepts `correct: boolean` as a shorthand for `outcome`, and ignores a caller-supplied `attemptInSession` (the store computes it).
- `due` is epoch milliseconds.

## Validation performed
- `node --test tests/store.test.mjs tests/schema.test.mjs`
- `node --test tests/*.test.mjs`, the full suite including E's tests
- A grep for post-ES2017 syntax in `store.js` (`?.`, `??`, `catch {`, object spread, `fromEntries`, `flat`, `at`, `matchAll`, `replaceAll`)
- A scan for literal invisible or combining characters in `store.js`
- A check that every schema's examples validate and that each schema passes `checkSchema`

## Validation results
- **D's suites:** 133 pass, 0 fail (14 suites, about 1.2 s).
- **Full suite:** `node --test tests/*.test.mjs` passes 168 of 168.
- **Store coverage:**
  - v0 migration, including the exact baseline bug, the untouched v0 key, deterministic ids, legacy answers counting toward L2 only, re-migration of a corrupt v2 key, and a newer format never being overwritten;
  - 11 invalid or prototype-polluting events rejected;
  - `attemptInSession` and `firstEver`; `lessonStats`; L0–L6 boundaries, including exactly 60%, exactly 80% and 7 days minus 1 ms;
  - Leitner entry, early pass, on-time pass, overdue pass, fail to lapsed, the box-5 cap, order-independent replay and the i18n hook;
  - `due()` ordering; export → import round trip, dedupe, wrong-course refusal and the force option;
  - storage throwing, quota compaction and compaction failing, two-tab merge, `xp` as max(legacy, computed), and the published FNV-1a test vector;
  - UMD browser load in a `vm` window.
- **Schema coverage:**
  - all 7 schemas stay within the subset and are documented; good, bad and lint fixtures for each, where every bad fixture must fail with its expected path or message;
  - the progress-export `$defs` mirror the evidence-event schema;
  - a live store export validates;
  - one test per validator keyword;
  - loader tests: timeout, no `process`/`require`, `eval` blocked, `var COURSE`;
  - the starter `course.js` parses.

## Known limitations
- **`node --test tests/` fails on Node 22.23** with "Cannot find module '/home/user/skills/tests'". That is the form in the brief and in E's `package.json` `test` script; a directory is not expanded there. `node --test tests/*.test.mjs` or plain `node --test` works. **E owns the script and should change it.**
- **Inside this repository, `store.js` is not `require()`-able**, because the root `package.json` sets `"type": "module"`. Use `requireClassic()` from `scripts/lib/schema.mjs`. In learner workspaces, which have no `package.json`, plain `require` works.
- **The course v2 and practice-item schemas use `additionalProperties: false`.** The practice-item fields were aligned with C1's `practice.js`: `code`, `tolerance`, `labels`, per-option `why`. C1's `answer` alias for `accept` is **not** in the schema. If A or C1 add fields to `course.js` lessons or milestones, the schema must be extended.
- **Browser behaviour is unverified:** no browser run was possible for this workstream. Firefox and Safari `file://` storage behaviour is unverified (documented).
- **Schema gaps for the future:** there are no `challenge_review`, `retrieval_check`, `claim` or `agent_estimate` event kinds yet (roadmap: `evidence.js`). L4 and L6 come from caller flags.

## Dependencies
- **C1:**
  - Calls `createStore({courseId})` and `load()`.
  - Should pass `milestoneMastered` and `transferDemonstrated` to `level()`, and `itemIds` per objective to `schedule()` and `due()`. Without them, the first attempt enters the card.
  - Should show the `persistent: false` and `templateId` notices.
  - May use `matchAnswer()`.
  - `practice.js` records typed recall input in `note`; the privacy section of data-model.md documents this.
- **E:**
  - Use `validate`, `checkSchema`, `loadSchema`, `loadCourseJs`, `loadPracticeJs` and the lints from `scripts/lib/schema.mjs` in `validate.mjs`.
  - Fix the `test` script, which runs `node --test tests/` and fails on Node 22.23 as noted above.
- **A:**
  - Document the learning-record frontmatter fields; `transfer_reason` was added for L6 justification.
  - Document the source-record statuses `verified | unverified | unavailable`.
  - Document the objective id convention `l<n>.<x>`.

## Next action
- **Orchestrator:**
  - Integration pass with C1, then a browser smoke test of export → import and of review sessions on `file://`.
  - Confirm the additive API deviations listed above.
  - Decide whether `course.schema.json` should allow extra lesson fields.
