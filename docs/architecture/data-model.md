# Data model

This document specifies what Learncraft stores, where it is stored and who owns it. It also gives the exact rules that turn stored evidence into levels, review schedules and XP.

The code it describes:
- `skills/learn/starter/assets/store.js`: the browser store, a UMD classic script that also loads in Node.
- `schemas/*.schema.json`: JSON Schema 2020-12, restricted to a documented subset.
- `scripts/lib/schema.mjs`: the zero-dependency validator, the loaders and the semantic lints.

Decisions behind it: ADR-003 (files are the source of truth), ADR-004 (`course.js` stays JavaScript), ADR-005 (mastery is derived, never stored), ADR-006 (Leitner scheduling) and ADR-011 (zero-dependency tooling), all in `docs/audit/DECISIONS.md`.

## 1. Entities and their source of truth

| Entity | Lives in | Written by | Read by | Schema | Source of truth? |
|---|---|---|---|---|---|
| Mission, success criteria | `MISSION.md` | agent | agent | (Markdown) | yes |
| Course manifest: milestones, lessons, objectives | `assets/course.js` (`window.COURSE`) | agent | browser, agent, validator | `course.schema.json` | yes, for structure |
| Milestone status (`mastered` + `evidence: LR-NNNN`) | `assets/course.js` | agent, after a challenge review | browser, agent | `course.schema.json` | **no**: a projection of the learning records |
| Graded evidence, prior knowledge, misconceptions | `learning-records/NNNN-*.md` (optional frontmatter) | agent | agent, validator | `learning-record-frontmatter.schema.json` | yes |
| Sources | `RESOURCES.md` (`- [S3] …` lines) | agent (researcher) | agent, linter | `source-record.schema.json` | yes |
| Practice items | `lessons/NNNN.practice.js` (`Learncraft.practice(n, items)`) | agent | browser, linter | `practice-items.schema.json` | yes |
| Practice evidence (event log) | browser `localStorage["learn:<courseId>:v2"]` | browser (`store.js`) | browser; the agent only through an export | `progress-export.schema.json`, `evidence-event.schema.json` | yes, for practice, until exported |
| Progress exports | `progress/progress-<course>-<YYYY-MM-DD>.json` in the workspace | the learner (Export button) | agent (read-only), browser (Import) | `progress-export.schema.json` | a snapshot; read-only input for the agent |
| Lesson-panel run state | `.review/<slug>/state.md`, `r<N>-author.md`, `r<N>-<role>.md` | orchestrator, author, reviewers | the same agents | `review-handoff.schema.json` | yes, for the run |
| Levels, review schedule, XP, lesson stats | nowhere | (derived on every call) | browser | none | **never stored** |

When sources disagree:
1. `learning-records/` wins over `course.js` milestone status, and the validator reports the mismatch.
2. The browser owns practice events until the learner exports them.
3. An export is a dated snapshot. A newer export of the same course supersedes it, and importing either one is safe because import dedupes by event id.

## 2. Browser storage

| Key | Contents | Written? |
|---|---|---|
| `learn:<courseId>:v2` | The v2 document (below) | Yes. The whole document is rewritten on every append. |
| `learn:<courseId>` | v0 progress `{xp, answers{"L<n>:<id>": {ok, at}}, lessons{n: {stage, last}}}` | **Never.** It is read once to migrate, and never written or deleted. |
| `learn:<courseId>:v2:corrupt` | The raw value of the **newest** unparseable or invalid v2 value, kept before starting over | On load, or when a write finds a corrupt value; best effort |
| `learn:<courseId>:v2:corrupt:<ISO time>` · `…:corrupt:index` | Older corrupt values, moved aside when a newer one arrives; the index lists them. Only the newest 3 are kept (bounded) | Same |

The v2 document has the same shape as an export, minus `exportedAt`:

```json
{ "format": "learncraft-progress", "schemaVersion": 2, "course": "transformers-from-scratch",
  "createdAt": "2026-11-24T08:00:00.000Z", "updatedAt": "2026-11-25T09:15:00.000Z", "events": [ … ] }
```

## 3. The event model

The event log is **append-only**. The API has no edit or delete. Events are frozen objects, and a later write never changes an earlier event. The one exception is quota compaction (§8), which replaces *exposure* events older than 90 days with count events. It never touches attempts, reviews or migration events.

| Field | Type | Meaning |
|---|---|---|
| `v` | `1` | Event format version |
| `id` | string `^[A-Za-z0-9_.:-]{1,100}$` | Dedupe key. Browser events: `e_<time36>_<rand4>`. Migration: `m_<hash>` (deterministic). Compaction: `c_<hash>`. |
| `at` | ISO 8601 UTC | When the event happened |
| `course` | string | `COURSE.id` at write time |
| `kind` | `exposure` · `attempt` · `review_session` · `migration` | |
| `source` | `browser` · `migration` · `import` | `import` is set only on imported events that had no source |
| `context` | `lesson` · `practice` · `review` · `diagnostic` | |
| `lesson`, `objective`, `item`, `itemType`, `itemVersion`, `session` | string, integer or `null` | `objective` defaults to `l<n>`. `itemVersion` is `legacy` for migrated answers. `session` is the page-load id (or a review-session id). |
| `attemptInSession` | integer ≥ 1 or `null` | Counted per session + item at write time |
| `firstEver` | boolean or `null` | First attempt on item + itemVersion, computed at write time. `null` when unknowable (migrated). |
| `outcome` | `correct` · `incorrect` · `n/a` | Attempts need `correct` or `incorrect` |
| `score` | 0–1, optional | Fade: blanks right ÷ blanks. Review sessions: share correct. |
| `assisted` | boolean | A hint, the answer or a worked example was shown before the attempt |
| `note` | string ≤ 2000, optional | |
| `results`, `passed` | `review_session` only | `[{item, outcome}]` (1–50 entries) and the pass verdict |
| `count` | `exposure` only, optional | How many views a compacted event stands for |
| `legacyXp` · `box`, `due` | `migration` only | v0 XP, or the legacy schedule (box 1–2, plus a due date) |

**Load-time validation.** Every stored or imported event goes through `sanitizeEvent`:
- **Shape:** it must have the right types and a known kind, source, context and outcome. Numbers must be finite numbers, and the kind-specific requirements must hold.
- **Rebuilt, not trusted:** the event is rebuilt from known fields only, so unknown fields are dropped.
- **Parsing:** JSON is parsed with a reviver that deletes `__proto__`, `constructor` and `prototype` keys at every depth.
- **Dates:** `at`, `due`, `createdAt` and `updatedAt` must be strict ISO 8601 (the schema's pattern), a real calendar date and time, with a year from 2000 to 2199. Imported events dated more than one day in the future are rejected.
- **Rejected events** are counted in `load().rejected` and never derived from. Stored events that are objects but fail validation (a newer `kind`, a longer field) are **quarantined**: kept verbatim (up to 500 events / 500 000 characters; any overflow goes to a corrupt backup), written back on every save, included in exports, re-validated on every load. `load().quarantined` and `store.quarantined()` count them. A document with a newer `schemaVersion` is opened read-only and never overwritten (`reason: 'newer-format'`), at load and at every later write.

## 4. Derivations: exact rules

All derivations replay the log in time order (stable on ties), are deterministic, and take `now` as a parameter (`createStore({now})`, `deriveSchedule(events, objective, {now})`).

### First try
For each item + itemVersion, the **first try** is the earliest attempt by `at`. The stored `firstEver` flag is informational; derivations recompute the first try. This makes a log merged from two browsers correct: an earlier wrong answer imported from another browser becomes the first try. For a whole item, the derivations use the first try of its most recent version. A migrated `legacy` answer is used only when the item has no newer attempt. Retries after feedback (`attemptInSession > 1`, `firstEver: false`) never count as first tries.

### Lesson stats (`lessonStats(lesson, itemIds?)`)
`{items, attempted, firstTryCorrect, pct, legacy}`:
- `items` is the number of ids passed in, or else the number of distinct items attempted in the lesson.
- When an id is passed as `{id, itemVersion}`, only that version's first try counts, so an edited question starts a new history. A legacy answer is the fallback.
- A correct answer counts only if it was unassisted.
- `pct` is `null` when nothing has been attempted.

### Mastery levels (`deriveLevel(events, objective, {itemTypes, milestoneMastered, transferDemonstrated, lesson})`)
Highest satisfied level wins. Thresholds follow raw/03-pedagogy.md §4 with the ADR-005 adaptations. They are design choices, not research constants.

| Level | Name | Rule |
|---|---|---|
| L0 | Not started | default |
| L1 | Seen | any `exposure` for the objective's lesson (`lesson` option, or the `l<n>` / `l<n>.` prefix of the objective id), or any attempt or review on the objective |
| L2 | Familiar | ≥ 2 items with a first try, and first-try accuracy ≥ 0.6. Migrated legacy answers count here. |
| L3 | Understood | Over **non-legacy** first tries only: ≥ 3 items, accuracy ≥ 0.8, and ≥ 1 unassisted correct first try of a recall type (`recall`, `fade`, `order`, `label`, `explain`; the type comes from `itemType` or the `itemTypes` map) |
| L4 | Applied | `milestoneMastered: true` from the caller. `course.js` milestone status is the source of truth, set only after an agent challenge review. The browser passes it **per objective**, only for objectives listed in a mastered milestone's `objectives` (from the record's `criteria[].objectives`); a mastered milestone without that list gives no objective L4. |
| L5 | Retained | (L3 or L4) **and** a passed `review_session` taken ≥ 7 days after the previous success on the objective (an unassisted correct first try or a passed review) **and** the latest review passed. A failed latest review drops L5 until the next pass; it never deletes history. |
| L6 | Transferred | `transferDemonstrated: true` from the caller (a challenge review with `transfer: true`) |

`basis` returns `{attempts, items, firstTryCorrect, recallCorrect, reviews, legacy}`, so the UI can show how thin the evidence is. Attempts with `context: 'diagnostic'` (pretest guesses, items with `pretest: true`) are ignored by every derivation: never a first try, never in a level, XP, `lessonStats` or review entry. Never raises a level: opening a lesson twice, time on the page, retries after feedback, assisted answers, claims and agent estimates.

### Review schedule (`deriveSchedule(events, objective, {itemIds, now, t, formatDate, lesson})`)
Leitner, five boxes, intervals **1 / 3 / 7 / 14 / 30 days**. Each card is one objective.

1. **Entry.**
   - **The runtime's one rule:** the first (non-diagnostic) attempt on the objective enters box 1, due at entry + 1 day. The browser never passes `itemIds`.
   - The pure function still accepts `itemIds` ("every listed id has an attempt") for callers that want the stricter rule.
   - A `migration` event for the objective's lesson sets the legacy box (1 or 2) and its due date.
2. **What moves a card.** Only `review_session` events. Attempts on lesson pages never move boxes.
3. **Pass on or after the due date:** `box = min(box + 1, 5)`, `due = review time + interval[box]`. Being overdue gives no bonus and no penalty.
4. **Pass before the due date:** the pass is logged, and box, due date and status stay the same ("early reviews do not count toward spacing").
5. **Any fail:** box 1, due in 1 day, status `lapsed` until the next pass.
6. **A review on a card that never entered:** treated as on time, so a pass goes to box 2.
7. **Status:**
   - `new`: not entered.
   - `scheduled`: due date in the future.
   - `due`: now ≥ due date.
   - `lapsed`: the last review failed. This takes precedence over `due`.
8. **Explanation strings.** Every change produces one, in English by default, e.g. `Nov 28: 1/2 correct → back to box 1, due Nov 29`, with UTC dates. An optional `t(key, vars)` translates the keys `schedule.new|first|enter|migrated|pass|early|fail`, using vars `date, correct, total, box, due`. If `t` returns the key itself or an empty value, the English string is used. `formatDate(ms)` overrides the date format.
9. **Return value:** `{box, due, status, explanation, log}`. `due` is epoch milliseconds or `null`; `log` lists every explanation in order.

A **review session passes** when the first-attempt correct share is ≥ 0.8; with two items, both must be right (`recordReviewSession`). `due(now, {itemIds})` lists due cards sorted by `(now − due) / interval[box]`, descending. A migrated lesson card `l<n>` is hidden once any `l<n>.*` objective has its own events; the migrated schedule still applies to those objectives through rule 1. The UI caps the list at 10.

### XP
`xp() = max(legacyXp, 10 × number of item+version first tries that are correct, unassisted and not legacy)`. Migrated learners never see their XP drop, and XP never comes from retries.

## 5. Migration v0 → v2

`migrateV0(v0, {courseId, now})` is a pure function. Its ids are deterministic, so running it twice produces the same events.

| v0 | v2 event |
|---|---|
| `answers["L<n>:<id>"] = {ok, at}` | `attempt`, `source: migration`, `lesson: n`, `objective: "l<n>"`, `item: <id>`, `itemVersion: "legacy"`, `firstEver: null`, `attemptInSession: null`, `outcome` from `ok`, `at` from `at` |
| `lessons[n] = {stage, last}` | `migration` with `{lesson: n, objective: "l<n>", box: min(stage + 1, 2), due: last + interval[box]}` |
| `xp` | `migration` with `{legacyXp}` |
| Malformed keys or values | skipped |

Why the stored values cannot be trusted:
- **`firstEver: null`:** v0 overwrote the answer on every page load's first click (baseline probe: wrong → reload → right stored `ok: true`). The stored value is the *last* result, so the first try is unknowable.
- **L2 only:** legacy answers count toward L2 (Familiar) and never toward L3+.
- **Box capped at 2:** v0 advanced the stage even after failures (finding DATA-08), so a high stage proves nothing.

**Why v0 is never deleted or written.** Leaving it untouched makes migration reversible:
- Rolling back to an older runtime finds its data intact.
- A corrupt v2 key can be re-migrated. Load backs up the bad value to `:v2:corrupt` (older backups move to timestamped keys) and migrates v0 again.
- The v0 key needs no separate backup copy, because it is never modified.

Once `learn:<id>:v2` exists, v0 is ignored.

## 6. Export and import

- **Export** (`exportJSON()`, `exportFilename()`) returns the v2 document plus `exportedAt`, pretty-printed, as `progress-<course>-<YYYY-MM-DD>.json` (UTC date; the dashboard uses this name). Quarantined events are included. The page saves it through a download link, which works on `file://`. The agent reads exports from the workspace's `progress/` folder.
- **Import** (`importJSON(text, {force})`):
  0. Refuses files over 5 000 000 characters or with more than 20 000 events, with a message saying so (`LIMITS`).
  1. Parses with the safe reviver.
  2. Requires `format: "learncraft-progress"` and `schemaVersion: 2`.
  3. **Refuses a different `course`** unless `{force: true}`.
  4. Validates each event; invalid events become `errors` (`events[i]: reason`, at most 50) and the valid ones are still added.
  5. Dedupes by `id`. Events without a `source` get `source: "import"`; existing sources are kept.
  6. Merges in time order and returns `{added, skipped, errors}`. Two non-enumerable extras: `persisted` (false when the merged log could not be saved: storage full or blocked; the dashboard then says "imported into this page only, NOT saved") and `reason`.
- Import is idempotent: re-importing the same file adds nothing.

## 7. Privacy and data ownership

- **Nothing leaves the machine.** The runtime makes no network requests for progress. There is no sync, account, telemetry or analytics.
- **Export is learner-initiated**, and the learner decides whether the agent sees it.
- **What an export contains:** the course id, timestamps and the event log. That is:
  - which lessons were opened;
  - which item ids were answered, right or wrong, when, and whether help was shown;
  - review results;
  - in `note`, whatever the UI records there. The practice runtime (`practice.js`) stores the first 200 characters of a typed recall answer, which lets the agent see misconceptions.
- **What an export does not contain:** names, browser details, or any other course's data. The store adds no identity fields.
- The learner owns the files. Deleting `progress/` or clearing site data removes them; the runtime never deletes anything itself.

## 8. Write path and failure modes

| Situation | Behaviour |
|---|---|
| Normal append | If the stored value is not the one this store last wrote, re-read it and merge by id (so a second tab's events are not clobbered); then write the whole document. Ids are kept in an in-memory set (no O(n) scans per event). |
| Every write | Returns `{ ok, persisted, reason }`, kept in `store.lastWrite`. A failed write calls every subscriber with `(store, { type: 'write', persisted: false, reason })`; `progress.js` then shows the storage notice and announces it once. |
| Another tab wrote (`storage` event on the key) | `refresh()` merges the stored document and calls subscribers with `{ type: 'external' }`; the dashboard and lesson strip redraw. |
| A write finds a newer `schemaVersion` | Nothing is written; `persistent = false`, `reason: 'newer-format'`, subscribers are told. |
| A write finds a corrupt value | It is backed up (as at load), then replaced. |
| `QuotaExceededError` (`name`, or `code` 22 or 1014) | Compact `exposure` events older than 90 days into one count event **per lesson**, so L1 still holds; never compact attempts. Retry once. If it still fails, `persistent = false` and the store keeps working in memory. |
| `localStorage` access or `getItem` throws (private mode, blocked site data, sandbox) | `load()` returns `persistent: false`. Everything works in memory, and export still works. The UI shows a one-line notice (C1). |
| `setItem` throws for any other reason | `persistent = false` from then on |
| Stored v2 unparseable, or for another course | Backup to `:v2:corrupt` (bounded, timestamped history), migrate v0 if present, otherwise start empty. `ok: false`, `reason: 'corrupt'`. |
| Stored `schemaVersion` > 2 | Read-only: `persistent: false`, `reason: 'newer-format'`. It is never overwritten. |
| Template course id `topic-slug` | `load().templateId === true` (C1 warns), and `courseLint` reports it |

## 9. `file://` storage caveats

- **Chromium** (measured in the frontend audit, FE-14): `location.origin === "file://"`, and a key written from one folder is readable from another. **Every local HTML file shares one `localStorage`.** Consequences:
  - The course id is the only isolation, so two courses with the same id share progress. The validator rejects the template id.
  - Any other local HTML file the learner opens can read or alter progress. The store therefore validates everything it loads, and the UI escapes everything it renders.
  - All courses on the machine share one storage quota.
- **Firefox and Safari: unverified.** Their `file://` origin and storage behaviour may scope storage per file or per folder, or drop it. If storage is per file, progress would not carry from one lesson page to the next. This must be tested before support is claimed.
- Clearing browser site data deletes progress. The defence is export.

## 10. Why `localStorage`, not IndexedDB or SQLite

- **Size.** A serialised event is about 0.35–0.47 KB, measured on `tests/fixtures/data/progress-export/good-export.json`. A heavy course (20 lessons × 10 items × 3 attempts, plus views and reviews) is roughly 1,000 events, or about 0.4 MB. Browsers allow a few MB of `localStorage` per origin. The exact quota is browser-dependent and was not measured here. On Chromium's shared `file://` origin, that quota is shared by every course, which is why compaction exists.
- **Query needs.** None beyond filtering by item or objective and replaying in time order, which costs milliseconds at this size.
- **IndexedDB** would add asynchronous APIs, versioned object stores and more failure modes for no gain at this size. It is equally per-browser, and no more portable.
- **SQLite** (WASM or native) needs a runtime and a binary file the learner cannot read. It breaks "opens from disk with no dependencies".
- **A JSON document in `localStorage`** is synchronous and human-readable. Its export file is byte-for-byte the same format.

## 11. Validation tooling

- **Schemas.** `schemas/*.schema.json` use the JSON Schema 2020-12 subset from ADR-011, plus `maxItems`, `maxLength`, `anyOf`, type arrays and local `$ref` into `$defs`. Each schema has a `$id`, `title`, `description` and `examples`.
- **Validator.** `scripts/lib/schema.mjs`:
  - `validate(schema, data, {ref})` returns `[{path, message}]`, with JSON-Pointer paths.
  - `checkSchema(schema)` rejects keywords outside the subset, so a schema can never rely on a keyword the validator ignores.
  - `bestBranch` error reporting: when no `oneOf` branch matches, the validator reports the errors of the branch whose `const` discriminators match.
- **Semantic lints** (rules a JSON Schema subset cannot express):

  | Lint | Checks |
  |---|---|
  | `courseLint` | template id, duplicate lesson numbers, objective ids and files, unknown milestone or `requires` references, objective ids not prefixed `l<n>.`, `mastered` without evidence |
  | `practiceLint` | exactly one correct choice option, template blanks match `blanks` keys both ways, unique ids course-wide, objective belongs to the lesson |
  | `sourceLint` | `versionScope` present for docs, api and tool sources |
  | `handoffLint` | `REVISE` needs a blocker or major item |

- **Loaders.**
  - One implementation, shipped inside the skill: `skills/learn/starter/tools/load-data.mjs` (`schema.mjs` and `lint-workspace.mjs` re-export it, so a skills.sh install has it too).
  - `loadCourseJs(path)` returns a plain copy of `COURSE` (undefined when unset); `loadPracticeJs(path)` returns the `Learncraft.practice(n, items)` calls as `[{lesson, items}]`; `loadDataFiles([{kind, path}])` loads many files in one process (the linter uses it).
  - They run each file in a **separate Node process** (`spawnSync` of the same Node binary): hard kill after 3 s (+0.5 s per extra file), `--disallow-code-generation-from-strings`, a 256 MB heap cap, an **empty environment**, Node's permission model when available (the child may read only the loader file: no other file reads, no writes, no child processes, no workers; the network is not covered), the file text on stdin, at most 8 MB of JSON back on stdout. Inside the child the file runs in a `node:vm` context created from a null-prototype object whose stubs are built inside the context (no host function is reachable), with `microtaskMode: 'afterEvaluate'` and serialisation under the 1000 ms timeout. Linting the starter template workspace takes about 40 ms more than the old in-process loader.
  - **This reduces the risk of a hostile file; it does not remove it.** It is still the learner's own machine: run the loaders (and `check.mjs`, the linter, the validator) only on the learner's own workspace and on this repository, never on a workspace you do not trust.
- **`requireClassic(path)`** loads `store.js` in Node. The repository's `package.json` sets `"type": "module"`, which makes Node treat every `.js` file as ESM, so a plain `require()` would not run the UMD's `module.exports` branch.
- **Tests.** `tests/store.test.mjs` and `tests/schema.test.mjs`. The fixtures in `tests/fixtures/data/<schema>/` are named `good-*`, `bad-*` (with the expected error in `expectations.json`) and `lint-*`.

## 12. Known limitations

- Practice evidence is per browser until exported (ADR-003). Agent-authored evidence compiled into the browser (`assets/evidence.js`) is on the roadmap.
- L4 and L6 rely on caller flags taken from `course.js` and learning records. The store has no `challenge_review` event kind yet.
- L5 needs a dated previous success in the browser log. A milestone mastered only through the agent, with no browser attempts, cannot reach L5 from browser reviews alone.
- Objective-to-lesson mapping for exposures and migrated schedules uses the `l<n>.` id prefix, or an explicit `lesson` option. `courseLint` warns on ids that break the convention.
- Explanation dates are UTC unless the caller passes `formatDate`.
