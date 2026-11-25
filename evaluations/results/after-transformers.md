# Workspace score — transformers

Course `transformers-example` · schemaVersion 2 · 3 milestones · 3 lessons (3 written).

Scored 2026-11-25 by `evaluations/runners/score-workspace.mjs` (deterministic; no model calls). R criteria need a reviewer and are not scored here.

**Lint:** 0 error(s), 0 warning(s). **Rubric (M items):** 20 pass, 2 warn, 1 fail, 1 n/a; pass rate on applicable M items 20/23. 11 R items not scored.

| ID | Rubric | M/R | Criterion | Result | Evidence |
|---|---|---|---|---|---|
| CR1 | curriculum | M | Milestones match MISSION success criteria; every milestone has a lesson | pass | MISSION.md "Success looks like": 3 bullet(s); course.js: 3 milestone(s) |
| CR2 | curriculum | M | Lesson milestone refs exist; numbering 1..N; file pattern | pass | 3 lessons numbered 1..N, files match lessons/NNNN-slug.html, milestone refs resolve |
| CR3 | curriculum | M | 1–3 objectives per lesson; observable canDo (verb denylist) | pass | 1–3 objectives per lesson; no non-observable verbs |
| CR4 | curriculum | M | requires only points to earlier lessons; acyclic | n/a | no lesson declares requires |
| CR5 | curriculum | M | One milestone challenge per milestone, on its last lesson | pass | one milestone challenge per milestone, on its last written lesson |
| CR6 | curriculum | M | Title contains "and" at most once | pass | no lesson title joins more than two ideas with "and" |
| CR7 | curriculum | R | Sequence starts at the diagnostic floor, not claims | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| CR8 | curriculum | M | From lesson 3, ≥1 interleaved item from an earlier objective | pass | every lesson from 3 on interleaves an earlier objective |
| CR9 | curriculum | M | Motion/lab decision line per lesson in NOTES.md | pass | NOTES.md has a decision line per lesson |
| CR10 | curriculum | R | Out-of-scope respected; each lesson traces to the mission | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| CR11 | curriculum | R | One idea per lesson; fits one sitting | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| AS1 | lesson-assessment | M | Practice items have unique ids and known objectives | pass | 19 items, unique ids, known objectives |
| AS2 | lesson-assessment | M | ≥3 items per objective, ≥1 non-MCQ | pass | 6 objective(s), each with ≥3 items and ≥1 non-MCQ |
| AS3 | lesson-assessment | M | MCQ: 3–5 options, exactly one correct, no all/none of the above | pass | 7 MCQ(s): 3–5 options, one correct |
| AS4 | lesson-assessment | M | MCQ option lengths within ±25% of their mean | pass | all MCQ options within ±25% of their mean length |
| AS5 | lesson-assessment | M | MCQ explains the answer; ≥50% of distractors explained | pass | every MCQ explains the answer and ≥50% of distractors |
| AS6 | lesson-assessment | M | Recall/fade answers normalisable, alternatives given | pass | recall/fade answers are non-empty strings (the runtime normalises case and spacing) |
| AS7 | lesson-assessment | M | A worked example precedes each faded example | pass | every faded example follows a worked example |
| AS8 | lesson-assessment | M | Item stems not copied from the prose (heuristic flag) | pass | 19 stem(s) checked; none mostly copied from the prose |
| AS9 | lesson-assessment | R | Distractors encode real misconceptions; items test the objective | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| AS10 | lesson-assessment | R | A novice cannot answer from wording or length cues | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| AS11 | lesson-assessment | M | Challenge has task, send-back, 2–4 criteria in .criteria | pass | every challenge has a task, a send-back and 2–4 criteria |
| AS12 | lesson-assessment | M | No vague or evaluative-only criteria | pass | 12 criteria, none vague |
| AS13 | lesson-assessment | R | Criteria name observable artifacts and cover the canDo | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| AS14 | lesson-assessment | R | Challenge is transfer, on the learner's material | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| AS15 | lesson-assessment | M | Load budget: ≤5 <dfn>, ≤1 scene, ≤~1,500 words | warn | L1: 0 <dfn>, 0 scene(s), ~1692 words (≤5, ≤1, ≤~1,500); L2: 0 <dfn>, 0 scene(s), ~1684 words (≤5, ≤1, ≤~1,500) |
| AS16 | lesson-assessment | R | Each worked example has a self-explanation prompt | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| G1 | grounding | M | Coverage: numeric/factual paragraphs cited or marked (partial M) | warn (1/2) | L1: 1/2 — 20 citation(s); 28 numeric paragraph(s) with no data-src or data-grounding: "Lesson 1 · Read your prompt as the model does", "gpt2 · with token ids The 464 ␣cat 3797 ␣sat 3332 ␣on 319 ␣t"; L2: 1/2 — 18 citation(s); 63 numeric paragraph(s) with no data-src or data-grounding: "Lesson 2 · Compute one attention head", "After lesson 1, every token is a vector that knows only itse"; L3: 1/2 —  |
| G2 | grounding | R | Fidelity: claim matches the quote and locator | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| G3 | grounding | M | Tier: T1/T2 behind numbers and core claims | pass (2/2) | L1: 2/2 — cited tiers: T1, T2, T1, T2, T1, T1, T2, T2, T1; L2: 2/2 — cited tiers: T1, T1, T2, T2; L3: 2/2 — cited tiers: T2, T1, T1, T1, T2, T2, T2, T1 |
| G4 | grounding | M | Verification status shown honestly | fail (0/2) | L1: 1/2 — 6/9 cited sources verified; 1 .unverified marker(s); L2: 0/2 — 3/4 cited sources verified; 0 .unverified marker(s); L3: 1/2 — 5/8 cited sources verified; 1 .unverified marker(s) |
| G5 | grounding | M | Link integrity (syntax only; resolution needs a fetch: R) | pass (2/2) | L1: 2/2 — URL syntax only (no fetch): 0 missing/placeholder, 0 non-canonical; L2: 2/2 — URL syntax only (no fetch): 0 missing/placeholder, 0 non-canonical; L3: 2/2 — URL syntax only (no fetch): 0 missing/placeholder, 0 non-canonical |
| G6 | grounding | M | Currency: version scope and freshness | pass (2/2) | L1: 2/2 — 0 version-sensitive source(s) without a version; 0 stale; L2: 2/2 — 0 version-sensitive source(s) without a version; 0 stale; L3: 2/2 — 0 version-sensitive source(s) without a version; 0 stale |
| G7 | grounding | R | Epistemic status: disputed findings flagged with a counter-source | not-scored | needs a human or model reviewer (see evaluations/README.md) |
| G8 | grounding | R | Injection hygiene: annotations in own words, commands reviewed | not-scored | needs a human or model reviewer (see evaluations/README.md) |
