# Workspace score — baseline-workspace

Course `audit-fixture` · schemaVersion 1 · 3 milestones · 2 lessons (2 written).

Scored 2026-11-25 by `evaluations/runners/score-workspace.mjs` (deterministic; no model calls). R criteria need a reviewer and are not scored here.

**Lint:** 1 error(s), 11 warning(s). **Rubric (M items):** 4 pass, 2 warn, 11 fail, 7 n/a; pass rate on applicable M items 4/17. 11 R items not scored.

| ID | Rubric | M/R | Criterion | Result | Evidence |
|---|---|---|---|---|---|
| CR1 | curriculum | M | Milestones match MISSION success criteria; every milestone has a lesson | fail | no MISSION.md: bullet count not checked; milestones with no lesson: m3 |
| CR2 | curriculum | M | Lesson milestone refs exist; numbering 1..N; file pattern | pass | 2 lessons numbered 1..N, files match lessons/NNNN-slug.html, milestone refs resolve |
| CR3 | curriculum | M | 1–3 objectives per lesson; observable canDo (verb denylist) | warn | 2 lesson(s) have no objectives (v1 course.js) |
| CR4 | curriculum | M | requires only points to earlier lessons; acyclic | n/a | no lesson declares requires |
| CR5 | curriculum | M | One milestone challenge per milestone, on its last lesson | fail | milestone m1: 0 challenge(s) marked data-kind="milestone" (lessons 1:unmarked); expected exactly one, on lesson 1; milestone m2: 0 challenge(s) marked data-kind="milestone" (lessons 2:unmarked); expected exactly one, on lesson 2 |
| CR6 | curriculum | M | Title contains "and" at most once | pass | no lesson title joins more than two ideas with "and" |
| CR7 | curriculum | R | Sequence starts at the diagnostic floor, not claims | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| CR8 | curriculum | M | From lesson 3, ≥1 interleaved item from an earlier objective | n/a | fewer than 3 written lessons |
| CR9 | curriculum | M | Motion/lab decision line per lesson in NOTES.md | fail | no NOTES.md, so no per-lesson motion/lab decisions |
| CR10 | curriculum | R | Out-of-scope respected; each lesson traces to the mission | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| CR11 | curriculum | R | One idea per lesson; fits one sitting | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| AS1 | lesson-assessment | M | Practice items have unique ids and known objectives | fail | 4 item(s) without a stable id (legacy positional ids); course.js declares no objectives (v1): items default to l<n> |
| AS2 | lesson-assessment | M | ≥3 items per objective, ≥1 non-MCQ | fail | objective l1: 2 item(s), 0 non-MCQ (need ≥3 and ≥1) |
| AS3 | lesson-assessment | M | MCQ: 3–5 options, exactly one correct, no all/none of the above | fail | L1 (no id): 2 options (3–5); L2 (no id): 2 options (3–5) |
| AS4 | lesson-assessment | M | MCQ option lengths within ±25% of their mean | fail | L1 (no id): lengths 20/20/12 chars, mean 17.3; 1 outside ±25% |
| AS5 | lesson-assessment | M | MCQ explains the answer; ≥50% of distractors explained | fail | L1 (no id): 0/2 distractors explain why they are wrong; L1 (no id): 0/1 distractors explain why they are wrong; L2 (no id): 0/1 distractors explain why they are wrong |
| AS6 | lesson-assessment | M | Recall/fade answers normalisable, alternatives given | warn | L2 legacy fade: exact-match data-answer with no alternatives |
| AS7 | lesson-assessment | M | A worked example precedes each faded example | fail | L2 fade: no .worked example before it |
| AS8 | lesson-assessment | M | Item stems not copied from the prose (heuristic flag) | pass | 4 stem(s) checked; none mostly copied from the prose |
| AS9 | lesson-assessment | R | Distractors encode real misconceptions; items test the objective | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| AS10 | lesson-assessment | R | A novice cannot answer from wording or length cues | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| AS11 | lesson-assessment | M | Challenge has task, send-back, 2–4 criteria in .criteria | fail | L1: no .criteria list (need 2–4 <li> in .criteria); L2: no .criteria list (need 2–4 <li> in .criteria) |
| AS12 | lesson-assessment | M | No vague or evaluative-only criteria | n/a | no .criteria items |
| AS13 | lesson-assessment | R | Criteria name observable artifacts and cover the canDo | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| AS14 | lesson-assessment | R | Challenge is transfer, on the learner's material | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| AS15 | lesson-assessment | M | Load budget: ≤5 <dfn>, ≤1 scene, ≤~1,500 words | pass | every lesson within the load budget |
| AS16 | lesson-assessment | R | Each worked example has a self-explanation prompt | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| G1 | grounding | M | Coverage: numeric/factual paragraphs cited or marked (partial M) | fail (0/2) | L1: 0/2 — 0 citation(s); 1 numeric paragraph(s) with no data-src or data-grounding: "A confidence of 0.42 goes to a human."; L2: 2/2 — 0 citation(s); 0 numeric paragraph(s) with no data-src or data-grounding |
| G2 | grounding | R | Fidelity: claim matches the quote and locator | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| G3 | grounding | M | Tier: T1/T2 behind numbers and core claims | n/a | L1: no citations; L2: no citations |
| G4 | grounding | M | Verification status shown honestly | n/a | L1: no citations; L2: no citations |
| G5 | grounding | M | Link integrity (syntax only; resolution needs a fetch: R) | n/a | L1: no citations; L2: no citations |
| G6 | grounding | M | Currency: version scope and freshness | n/a | L1: no citations; L2: no citations |
| G7 | grounding | R | Epistemic status: disputed findings flagged with a counter-source | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| G8 | grounding | R | Injection hygiene: annotations in own words, commands reviewed | not-scored | needs a human or model reviewer (see evaluations/README.md) |

## Lint findings

| Level | Rule | File | Message |
|---|---|---|---|
| error | evidence-record-missing | assets/course.js | milestone "m1" cites LR-0001, but learning-records/0001-*.md does not exist |
| warn | csp-missing | index.html | no Content-Security-Policy <meta>: copy the one from the page template (templates/*.html) into <head> (an error from schemaVersion 2) |
| warn | csp-missing | lessons/0001-one-prompt-many-answers.html | no Content-Security-Policy <meta>: copy the one from the page template (templates/*.html) into <head> (an error from schemaVersion 2) |
| warn | legacy-item-id | lessons/0001-one-prompt-many-answers.html | legacy .quiz-q without data-id: its progress is keyed by position and moves if the lesson is edited |
| warn | choice-option-parity | lessons/0001-one-prompt-many-answers.html | quiz "An exact-match test fails 40% of the time, but eve…": option lengths vary 1.67× |
| warn | legacy-item-id | lessons/0001-one-prompt-many-answers.html | legacy .quiz-q without data-id: its progress is keyed by position and moves if the lesson is edited |
| warn | challenge-criteria | lessons/0001-one-prompt-many-answers.html | #challenge has no pass-criteria list (<ul class="criteria"> or a list after a "Pass criteria" heading) |
| warn | csp-missing | lessons/0002-pick-the-threshold.html | no Content-Security-Policy <meta>: copy the one from the page template (templates/*.html) into <head> (an error from schemaVersion 2) |
| warn | legacy-item-id | lessons/0002-pick-the-threshold.html | legacy .fade without data-id: its progress is keyed by position and moves if the lesson is edited |
| warn | legacy-item-id | lessons/0002-pick-the-threshold.html | legacy .quiz-q without data-id: its progress is keyed by position and moves if the lesson is edited |
| warn | challenge-criteria | lessons/0002-pick-the-threshold.html | #challenge has no pass-criteria list (<ul class="criteria"> or a list after a "Pass criteria" heading) |
| warn | csp-missing | reference/cheat-sheet.html | no Content-Security-Policy <meta>: copy the one from the page template (templates/*.html) into <head> (an error from schemaVersion 2) |
