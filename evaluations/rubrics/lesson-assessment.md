# Lesson and assessment rubric

Source: [raw/03-pedagogy.md §7b](../../docs/audit/raw/03-pedagogy.md#7b-lesson--assessment-rubric-lesson-panel--linter). Applies to each lesson's HTML, its `NNNN.practice.js` and the legacy practice markup.

M items are scored by [`runners/score-workspace.mjs`](../runners/score-workspace.mjs); R items need a reviewer (see [README](../README.md#human-and-model-judged-criteria)).

| ID | Check | M/R | Scorer |
|---|---|---|---|
| AS-1 | Every practice item has a stable, course-wide unique id and an `objective` that exists in `course.js` | M | `scorers.AS1` (with lint rules `item-id-dup`, `item-objective-unknown`, `legacy-item-id`) |
| AS-2 | Each objective has ≥3 practice items, ≥1 of them not multiple choice (recall, order, fade) | M | `scorers.AS2` |
| AS-3 | Multiple choice: 3–5 options, exactly one correct, no "all/none of the above" | M | `scorers.AS3` (the linter's `choice-correct` makes "exactly one correct" an error) |
| AS-4 | Option lengths within ±25% of their mean (the linter warns at a max/min ratio above 1.6) | M | `scorers.AS4`; lint rule `choice-option-parity` |
| AS-5 | The correct answer has a `why`; ≥50% of distractors have a `why` | M | `scorers.AS5` |
| AS-6 | Recall and fade answers are non-empty strings the runtime can normalise; alternatives listed | M | `scorers.AS6` (legacy `.fade` inputs are flagged as exact-match) |
| AS-7 | A worked example (`.worked`, matching `data-objective` if present) precedes each faded example | M | `scorers.AS7` |
| AS-8 | Item stems are not copied from the prose (flag when >50% of a stem's word 4-grams appear in the lesson text) | M (heuristic) | `scorers.AS8` |
| AS-9 | Distractors encode real misconceptions; each item tests its objective, not page trivia | R | — |
| AS-10 | A novice cannot answer from wording or length cues | R | — |
| AS-11 | `#challenge` has a task, says what to send back, and lists 2–4 criteria as `<li>` in `.criteria` | M | `scorers.AS11`; lint rule `challenge-criteria` (lenient: also accepts a list after a "Pass criteria" label) |
| AS-12 | No criterion uses the CR-3 denylist or evaluative-only words (good, clean, well, nice, properly, correctly) | M | `scorers.AS12` |
| AS-13 | Each criterion names an observable artifact, number or behaviour; together they cover the `canDo` | R | — |
| AS-14 | The challenge is a transfer task on the learner's own material, not the practice context | R | — |
| AS-15 | Load budget: ≤5 `<dfn>`, ≤1 scene, prose ≤ ~1,500 words | M (flag) | `scorers.AS15` |
| AS-16 | Every worked example has one self-explanation prompt ("why this line?") | R | — |

## Scoring guidance for R items

| ID | 0 | 1 | 2 |
|---|---|---|---|
| AS-9 | Distractors are obviously wrong or test trivia | Some distractors are plausible | Each distractor is a named misconception, and its `why` says so |
| AS-10 | The longest or most specific option is right | One item is guessable | A reader without the lesson is at chance |
| AS-13 | "Explains well", "understands X" | Observable, but misses part of the `canDo` | Each criterion is checkable from what is sent back, and together they cover the `canDo` |
| AS-14 | Repeats a practice item | New numbers, same context | The learner's own data, system or material |
| AS-16 | None | Present but generic | One specific "why this step?" per worked example |
