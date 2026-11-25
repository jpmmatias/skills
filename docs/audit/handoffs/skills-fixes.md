# Handoff — skills instruction fixes (review SK-01…SK-27)

**Agent:** skill-instructions fixer · **Input:** `docs/audit/reviews/skills-architecture-pedagogy.md`, `docs/audit/DECISIONS.md`, `docs/audit/handoffs/A.md` · **Status:** done, not committed.

Scope kept: Markdown instruction files only. Not touched: `references/components.md`, `references/lesson-contract.md` (runtime agent), runtime JS, schemas, tests, README, `examples/`. Texts needed in those files are under [For the runtime agent](#for-the-runtime-agent).

## Findings

| ID | Sev | Status | Where / note |
|---|---|---|---|
| SK-01 | P0 | applied (instruction side) | `mastery.md` L4 row + note on milestones without `objectives`; `review-challenge.md` step 7 (criteria name `objectives`) and step 8 (milestone `objectives` = union of criteria objectives); `LEARNING-RECORD-FORMAT.md` example + `criteria` row. Matches the runtime contract (`progress.js` already reads `milestone.objectives`). |
| SK-02 | P0 | applied | `plan-course.md` step 2, Re-planning (mastered milestones frozen, next free id, Deep Learn line stays `m1`), Completion check; `deep-learn.md` step 7. |
| SK-03 | P1 | applied (instruction side) | `deep-learn.md` (`pretest: true`, not counted toward practice items); `mastery.md` "What never sets a level". Field row for `lesson-contract.md` handed to the runtime agent. |
| SK-04 | P1 | applied | `explain.md` step 1 (authority order, no single spec → textbook), step 3 (only opened pages; length only from the page; snippets as "search for:"), two new Rules (injection/tiers inline, any failed fetch = offline). Grounding is linked, not loaded, to keep Quick Learn cheap. |
| SK-05 | P1 | applied | `deep-learn.md` step 3 (NOTES decision line, motion decision, `diagnostic: skipped (deep-learn)`); `plan-course.md` precondition. |
| SK-06 | P1 | applied | `review-panel.md` step 4 (re-review once, then `draft_moved`), Escalation rule 4, Budget resume/extension; `continue-course.md`: rows 1/2 **swapped** (challenge work first) instead of adding a sentence; `handoff-contracts.md` (`budget_extension`, `resolution`, `draft_moved`); `failure-handling.md`, `profiles.md`. |
| SK-07 | P1 | applied | `review-panel.md` Escalation rule 3; `handoff-contracts.md` example proposal no longer says "label the rest illustrative". |
| SK-08 | P2 | applied, adjusted | `review-panel.md` step 2: requests served before reviewers start. Adjusted for Deep: a subagent author cites them next round (round files are never overwritten, so "same round" only works when you are the author). |
| SK-09 | P2 | applied, adjusted | `new-course.md` (`partial` rubric; topic tag as `text` prefix `<topic-slug>: <item>` because the schema has no tag field), `plan-course.md` (floor rule, test-out rule, tag → `objectives` mapping), `pedagogy.md` row links the rule. "One step below": the reviewer's wording ("the lesson before the first one whose objectives the learner claimed") is ambiguous when lesson 1 is claimed; used "the last lesson whose objectives they claimed to know, or lesson 1". |
| SK-10 | P2 | partially | Applied: cold check = 2 questions, both right on first answer (`review.md`); lesson-challenge pass sets no level (`mastery.md`, `review-challenge.md`); records told apart by title (`Milestone m<k> challenge: pass`, `Lesson N challenge: pass`, `Cold check m<k>: pass`) and "the milestone's record is the one `course.js` `evidence` names" (`LEARNING-RECORD-FORMAT.md`, `mastery.md`). Not applied: `assessment`/`lesson` frontmatter fields, because the schema is `additionalProperties: false` (runtime agent). |
| SK-11 | P2 | applied | `review-challenge.md` steps 3, 7, 8; `plan-course.md` Re-planning applies `## Re-plan proposals`. |
| SK-12 | P2 | applied | `practice.md` Record. |
| SK-13 | P2 | applied | `review.md` (export is a snapshot; state `exportedAt`; fresh export if older than the last session line; recipe prints `exportedAt`, `due` and levels; note that L4/L6 are omitted); `continue-course.md` Read the state and rule 5. Recipe executed on a synthetic workspace (scratchpad): `{"exportedAt":"2026-11-20T…","due":[l1.o1,l1.o2],"levels":{"l1.o1":2,"l1.o2":1}}`. |
| SK-14 | P2 | partially | Made the `NOTES.md` line the single, stated home (`plan-course.md` step 4: "do not write `requires` into `course.js`"; `continue-course.md` rule 5 says where to read it). Did not move `requires` into `course.js`: that needs a schema + lint change (out of scope) and reverses A's decision 5. Schema drift listed for the runtime agent. |
| SK-15 | P2 | applied | `review-challenge.md` step 7 (every miss writes `challenge: m<k> miss <date> (<criteria>)`), step 10 (pass line); `continue-course.md` rule 3 keys on the newest such line; two misses → re-teach + split re-plan, and a `re-taught` line ends the row (the reviewer's version still looped). |
| SK-16 | P2 | partially | Applied: subagents never ask or install (`write-lesson.md` Verify, `author.md`, `research-sources.md` step 8); researcher task message and tools defined in `continue-course.md` step 1; reviewer fetches count (`profiles.md`, `review-panel.md` Budget, `expert.md`). Not applied: a new `skills/source-researcher/agents/researcher.md` role file (outside the files I may edit; a native agent would also need a marketplace listing). |
| SK-17 | P2 | applied | `expert.md` reads grounding sections Trust tiers, Statuses, Prompt injection, Rubric; its task message now names `<learn>` and the previous lesson. Subagent regenerated. |
| SK-18 | P2 | applied (docs → code) | `mastery.md` (L5/L6 per code; box-1 entry; review pass ≥ 80%; recall types incl. custom `label`/`explain`), `practice.md` (< 60% = 1 of 3 or worse), `pedagogy.md` table (bands now < 0.6 / 0.6–< 0.8 / ≥ 0.8 + recall, i.e. the L3 bar). Disagreements listed below. |
| SK-19 | P2 | applied (softened) | `motion.md` (dropped uncited "learners notice…" sentence; K3 figure marked unverified; overall d ≈ 0.37 removed; conceptual-topic use = design choice; "No presenter" = design choice, not a K2 principle); `gamification.md` (K4 figure unverified); `grounding.md` (K1 DOI plain text "unconfirmed", no link; K3 row); `pedagogy.md` (one sentence: claims stated from general knowledge, none fetched). Did not adopt the reviewer's "effects were largest for procedural skills": it is from the reviewer's unverified memory and would add a claim. |
| SK-20 | P2 | applied | `pedagogy.md:12` replaced with the reviewer's text. |
| SK-21 | P3 | applied | `GLOSSARY-FORMAT.md` lines 3, 29, 35. |
| SK-22 | P3 | applied | `mastery.md` Name column = runtime `LEVEL_NAMES`; `gamification.md` "Understood". (`DECISIONS.md` ADR-005 still uses the old names; docs/ not mine.) |
| SK-23 | P3 | not applied | All in `lesson-contract.md` / `practice.js` (runtime agent); text below. |
| SK-24 | P3 | partially | `r<N>` → `r<R>` in `write-lesson.md`, `failure-handling.md`; `gamification.md` export wording; `review.md` lists all export fields. Schema descriptions, `components.md` export shape, `progress.js` filename: runtime agent. |
| SK-25 | P3 | applied | "previous lesson, if any; lesson 1 → `MISSION.md`" in `review-panel.md`, `expert.md`, `novice.md`, `flow.md`, `write-lesson.md`; `review.md` Preconditions; `explain.md` fetch counting; Deep Learn ≥ 3 items per objective, pretest excluded; rule 7 order. |
| SK-26 | P3 | not applied | Structural, not wording. Moving the workspace table out of the router changes what the four wrappers' "read `learn/SKILL.md` for the workspace map" points to and adds its cost to every course path; moving Platform limits needs a new file under `docs/` (not mine). The SK-04/SK-17 "missing" parts are applied. |
| SK-27 | P3 | applied | All five: `SKILL.md:11`, `new-course.md:16`, `continue-course.md` rule 7, `mastery.md:7`, `review-panel.md` Escalation 3. |

### Docs vs code (SK-18): code documented, disagreements

1. **Challenge-ready banner** (`practice.js:491`): `right/total ≥ 0.8` of the lesson's set, no recall condition. `pedagogy.md` previously said "> 0.85 with a recall item correct". Docs now use ≥ 0.8 + a recall/fade/order item for what the *agent* says and state that the browser line omits the recall condition. Intent and code still differ on that condition; suggest `practice.js` require a correct recall/fade/order item.
2. **Review-card entry**: `deriveSchedule` enters box 1 at the first attempt when no `itemIds` are passed (`due()`, `review.html`, dashboard, Node recipe) but only after every item when they are (lesson strip). Docs state the first-attempt rule and the strip's "not in review yet" text. One rule in code would be cleaner.
3. **Review pass from box 0**: a passed `review_session` on a card in box 0 goes to box 2 (`Math.max(box,1)+1`), not "up one box". Edge case; not documented.
4. **L6**: `transferDemonstrated` alone gives 6 and the browser never passes it, so L6 is agent-only, as documented. No conflict.
5. **L3 recall types** include `label` and `explain` (custom widgets) besides recall/fade/order; now documented.

## Files changed

- `skills/learn/SKILL.md` (80 lines, unchanged count)
- `skills/learn/workflows/`: `explain`, `deep-learn`, `new-course`, `plan-course`, `continue-course`, `practice`, `review`, `review-challenge`, `review-panel`, `research-sources`, `write-lesson`
- `skills/learn/references/`: `mastery`, `pedagogy`, `grounding`, `motion`, `gamification`, `profiles`, `failure-handling`, `handoff-contracts`
- `skills/learn/GLOSSARY-FORMAT.md`, `skills/learn/LEARNING-RECORD-FORMAT.md`
- `skills/lesson-panel/agents/{author,expert,novice,flow}.md` and regenerated `subagents/lesson-{author,expert,novice,flow}.md` (first 10 lines kept; body = role file verbatim; all 4 in sync)
- `docs/audit/handoffs/skills-fixes.md` (this file)

## Verification

| Check | Result |
|---|---|
| `node scripts/validate.mjs --strict` (includes relative-link + anchor check and role ↔ subagent sync) | `0 error(s), 0 warning(s). OK` (the 8 pre-existing errors in README, the review doc and `examples/` I saw at start were gone by the end, fixed by others) |
| `claude plugin validate . --strict` | `√ Validation passed`, exit 0 |
| `node --test tests/*.test.mjs` | 183 pass, 0 fail (one earlier run showed 1 transient failure while another agent was editing the runtime; three reruns clean) |
| `review.md` Node recipe | ran on a synthetic workspace; prints `exportedAt`, `due`, levels |

## Re-traced scenarios

### (a) No course folder; "how does a hash map work?"

| Step | Loaded | Written | Ambiguity now |
|---|---|---|---|
| 1. Router → Quick Learn; profile Balanced (≤ 3 page opens; searches are free, explain step 1) | `SKILL.md`, `explain.md`, `teaching-core.md` | — | — |
| 2. Step 1: search, then open the most authoritative source there is (no single spec for "hash map" → official language docs or a textbook chapter) and one explainer/video | (on total failure) `grounding.md` § Offline policy | — | Tier choice rests on the inline rule, not the full table (accepted to keep the path cheap). A 403, cookie wall or script-only page counts as offline for that link (Rules). Page text addressed to agents: drop the page (Rules) |
| 3. Step 2: problem → model → where it breaks → ASCII diagram → minimal example | — | — | Example language inferred from the learner (fine) |
| 4. Step 3: Go deeper lists only pages opened and read; length only from the page, else omitted; snippet-only URLs become "search for: <title>"; nothing fetched → "Links not verified this session", no URLs | — | — | none |
| 5. Steps 4–6: retrieval questions, grading, next-step offer | — | none | — |
| 6. If Deep Learn is chosen: step 3 writes the `L1:` decision line (motion decided) and `diagnostic: skipped (deep-learn)`, so research-sources and write-lesson preconditions hold without plan-course; pretest items carry `pretest: true` and do not count toward the ≥ 3 items per objective | (Deep Learn files) | workspace | none of SK-05's cascade |

Cost: 3,813 instruction tokens (+186). Files written in Quick Learn: none. Residual risk: an agent judging tier without the table.

### (b) Existing course; challenge work for m2 while a review is due

| Step | Loaded | Written | Ambiguity now |
|---|---|---|---|
| 1. Router → Challenge review. Via `/learn` → continue-course rule 1 is now "challenge work", so a paused panel (rule 2) no longer blocks grading | `SKILL.md`, `review-challenge.md` | — | none |
| 2. Preconditions: the lesson is the one whose `NOTES.md` line says `challenge: milestone m2` | `course.js`, `NOTES.md` | — | none |
| 3. Steps 1–5: rubric, evidence, own material, synthetic check. Suspected generated work → cold questions confirm authorship only; a doubtful artifact stays `unverifiable` | lesson HTML, learner files | — | none |
| 4. Step 6: criterion-by-criterion reply | — | — | — |
| 5. Step 7: record. Each criterion names `objectives`; pass titled `Milestone m2 challenge: pass`; `transfer: true` only with the compared files named by path, else `false`. Any miss → `challenge: m2 miss <date> (2,3)` in `NOTES.md` | `LEARNING-RECORD-FORMAT.md` | `learning-records/NNNN-*.md` (pass or misconception) | none |
| 6. Step 8 (pass): m2 `mastered`, `evidence: LR-NNNN`, `objectives` = union of criteria objectives; m3 `in-progress`; a sharper canDo goes to `## Re-plan proposals`, not into `course.js` | — | `assets/course.js` | **Dashboard: L4 only on the named objectives; the rest keep their practice-derived level** (runtime already reads `milestone.objectives`) |
| 7. Step 9: glossary promotion from reviewed challenge work (an entry is not evidence of mastery) | `GLOSSARY-FORMAT.md` | `GLOSSARY.md` | none |
| 8. Step 10: `challenge: m2 pass <date> LR-NNNN`, `cold-check: m2 after <+14d>`; name the next step in one line and start it only on the learner's go | `continue-course.md` | `NOTES.md` | When run: rule 5 reads `requires` from the next lesson's `NOTES.md` line; the export's `exportedAt` is stated, and an export older than the last session line triggers a request for a fresh one; the recipe prints levels (L4/L6 omitted, stated). **Still open by design:** a browser review that is merely due triggers no rule; it is mentioned at delivery and run by `review.html` |
| (miss path) next session: rule 3 matches the newest `challenge: m2 miss` line → remediation; after two misses, re-teach + offer a split re-plan + `challenge: m2 re-taught` line, which ends the row | `continue-course.md` | `NOTES.md` | none |

Files written: one learning record (pass, or misconception on a miss), `course.js` (milestone pass only), `GLOSSARY.md`, `NOTES.md`. Untouched: `progress/`, `RESOURCES.md`, `.review/`, `MISSION.md`. Challenge path cost: 3,427 tokens (+439).

## For the runtime agent

1. **`references/lesson-contract.md`, practice field table (SK-03)** — add a row:
   > | `pretest` | optional `true`: asked before teaching (a guess). Recorded with `context: 'diagnostic'`; never counts toward levels, XP or review entry, and not toward the ≥ 3 items per objective |
2. **`references/lesson-contract.md` (SK-23)** — after the field table:
   > This contract is stricter than `practice-items.schema.json` on purpose (3–5 options, 3–7 steps); the schema accepts more so older lessons still load.

   Change `recall` matching to "ignores case, accents, quotes, spacing and leading/trailing punctuation" (once `practice.js` uses `Learncraft.store.matchAnswer`); change `fade` `labels` to "recommended: `{ name: 'accessible name' }` for each blank"; change the optional row to "`recall` and `fade` may set `tolerance` to accept numeric answers within ± that value".
3. **`references/components.md`, course.js v2 (SK-01)** — milestone shape: `{ id, label, canDo, status, evidence, objectives? }` with "`objectives`: set by review-challenge on a milestone pass (the union of the record's `criteria[].objectives`). Only listed objectives show L4; a mastered milestone without it shows no per-objective L4." Store paragraph (SK-24): export shape `{ format, schemaVersion: 2, course, createdAt, updatedAt, exportedAt, events }`, "downloaded by the browser; the learner moves it into `progress/`".
4. **Schemas.**
   - `learning-record-frontmatter`: `criteria.items.properties.objectives` (array of `^l\d+\.o\d+$`) (SK-01, SK-09). Optional (SK-10): `assessment` enum `milestone-challenge | lesson-challenge | cold-check | diagnostic` and `lesson`; if added, I will replace the title convention in `review-challenge.md`, `review.md`, `LEARNING-RECORD-FORMAT.md` with the field.
   - `course.schema.json`: milestone `objectives`; `lessons[].requires` is lesson numbers but the workflows write objective ids in `NOTES.md` only (SK-14): drop the field or change it to objective ids.
   - `review-handoff.schema.json` `$defs.state`: add `budget_extension` (string) (SK-06); `round` max 3 blocks the one extra revision after escalation in Deep (round 4): raise to 4. Description: `.review/<slug>/` → `.review/l<N>/`, `r<N>` → `r<R>` (SK-24).
   - `source-record.schema.json`: `url` optional, `unavailable` dropped or documented "Gaps only" (SK-24).
5. **Code.** `practice.js:491` "ready" banner lacks the recall condition (SK-18 #1); one box-1 entry rule (SK-18 #2); `progress.js` export filename local date vs `store.exportFilename` UTC (SK-24); `practice.js` `norm()` vs `store.matchAnswer` (SK-23).

## Router and instruction cost

`skills/learn/SKILL.md`: 80 lines before and after (1,826 → 1,829 tokens).

`node evaluations/runners/instruction-cost.mjs` (tokens = bytes/4):

| Path | Profile | Main before → after | All contexts before → after |
|---|---|---|---|
| explain | all | 3,627 → 3,813 (+186) | 3,627 → 3,813 |
| continue | fast | 14,770 → 15,105 (+335) | 14,770 → 15,105 |
| continue | balanced | 14,889 → 15,638 (+749) | 19,398 → 20,260 (+862) |
| continue | deep | 6,740 → 7,432 (+692) | 20,787 → 21,700 (+913) |
| challenge | all | 2,988 → 3,427 (+439) | 2,988 → 3,427 |

The meter under-counts the expert: it follows only Markdown links on **Read:** lines, and the expert now reads four `grounding.md` sections by path (≈ 850 tokens), so the real expert context is ≈ 1,670, not 820. Biggest growth: `review-challenge.md` (+288), `continue-course.md` (+211), `explain.md` (+184), `review.md`, `review-panel.md`, `mastery.md`.
