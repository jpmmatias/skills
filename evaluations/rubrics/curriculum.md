# Curriculum rubric

Source: [raw/03-pedagogy.md §7a](../../docs/audit/raw/03-pedagogy.md#7a-curriculum-generation-rubric-curriculum-planner-output). Applies to the plan a course produces: `MISSION.md`, `assets/course.js` and `NOTES.md`.

- **M** (machine-checkable): scored by [`runners/score-workspace.mjs`](../runners/score-workspace.mjs). The scorer function is named in the last column.
- **R** (reviewer): a person, or a model acting as a blinded reviewer, scores it (see [README](../README.md#human-and-model-judged-criteria)). The scorer lists these as `not-scored`.

Results are `pass`, `warn` (passes with a caveat, such as a v1 course with no objectives), `fail` or `n/a` (nothing to check yet).

| ID | Check | M/R | Scorer |
|---|---|---|---|
| CR-1 | Milestone count equals the number of "Success looks like" bullets in `MISSION.md`; every milestone is referenced by at least one lesson | M | `scorers.CR1` |
| CR-2 | Every `lessons[].milestones[]` id exists; lessons numbered 1..N contiguously; `file` matches `lessons/NNNN-slug.html` | M | `scorers.CR2` (from lint rules `lesson-milestone-ref`, `lesson-numbering`, `lesson-file-pattern`) |
| CR-3 | Each lesson has 1–3 `objectives`; no `canDo` or objective uses the denylist: understand, know, learn, appreciate, be aware, be familiar | M | `scorers.CR3` |
| CR-4 | `requires` points only to earlier lessons (so the graph is acyclic) | M | `scorers.CR4` |
| CR-5 | Exactly one milestone challenge per milestone, on its last lesson (`#challenge[data-kind="milestone"]`) | M | `scorers.CR5` |
| CR-6 | A lesson title contains "and" at most once | M | `scorers.CR6` |
| CR-7 | The sequence starts at the floor from diagnostic evidence, not claims; test-out-eligible lessons are marked | R | — |
| CR-8 | From lesson 3 on, each lesson has at least one practice item on an earlier lesson's objective (interleaving) | M | `scorers.CR8` |
| CR-9 | `NOTES.md` has one decision line per lesson (`L<n>: …` with the motion or lab decision) | M | `scorers.CR9` |
| CR-10 | The mission's out-of-scope list is not represented; each lesson traces to the mission | R | — |
| CR-11 | One idea per lesson; it fits one sitting | R | — |

## Scoring guidance for R items

| ID | 0 | 1 | 2 |
|---|---|---|---|
| CR-7 | Starts from what the learner claimed, or from zero for an experienced learner | Uses the diagnostic but ignores a clear result | Starts one step below the demonstrated floor; skippable lessons marked `test-out` |
| CR-10 | A lesson or milestone covers an out-of-scope topic | A lesson's link to the mission is unclear | Every lesson names the mission outcome it serves |
| CR-11 | Two or more new ideas in a lesson, or more than one sitting of work | One lesson is borderline | One idea each, sized for one sitting |
