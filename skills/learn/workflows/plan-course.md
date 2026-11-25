# Plan the course

The single procedure for the curriculum. It writes the plan into `assets/course.js` and `NOTES.md`, and no lesson HTML. The `curriculum-planner` skill runs this file.

**Preconditions:**
- `MISSION.md` exists with a concrete **Why** and at least one **Success looks like** line. Otherwise run the [setup interview](new-course.md#setup-interview).
- A `kind: prior` learning record exists, or `NOTES.md` says `diagnostic: declined`. Otherwise run the [diagnostic](new-course.md#diagnostic). `diagnostic: skipped (deep-learn)` counts only for the one-lesson Deep Learn course; growing it into a course runs the diagnostic first.
- `assets/course.js` exists (from the [scaffold](new-course.md#scaffold)).

**Read:** `MISSION.md`, `NOTES.md`, every file in `learning-records/`, `RESOURCES.md` if present, and the [motion decision](../references/motion.md#decide). Do not read `assets/` beyond `course.js`.

## Steps

1. **State the mission and the floor**, one line each. The floor is the first lesson with an objective that has no `met` diagnostic entry (after step 3 maps the `kind: prior` entries to objectives); without a diagnostic, use the claims rule in [new-course → Diagnostic](new-course.md#diagnostic).
2. **Milestones.** One per **Success looks like** line, in the order the learner must earn them: `id` (`m1`, `m2`…), a short `label`, a `canDo` a challenge could demonstrate, `status` (`in-progress` for the first, `locked` for the rest) and `evidence: null`. Leave **Out of scope** out. On a re-plan, never touch a `mastered` milestone ([re-planning](#re-planning)).
3. **Lessons.** Order them so each assumes only what earlier lessons taught. For each lesson write:
   - `n`, `file: 'lessons/NNNN-<slug>.html'`, `title`, `milestones`, `canDo`, `practice: 'lessons/NNNN.practice.js'` (or `practice: null` for a lesson with no practice file, such as an older lesson that keeps inline quiz markup);
   - `objectives`: 1–3 items `{ id: 'l<n>.o<k>', text }`. Each `text` starts with an observable verb (explain, compute, choose, write, predict, debug, compare) and never with understand, know, learn, appreciate, or be aware of / familiar with.
   - Then map each diagnostic entry's topic tag to the objective ids it probed, and add `objectives: [l1.o2]` to that entry in the `kind: prior` record.
4. **Prerequisites and decisions.** Under `## Per-lesson decisions` in `NOTES.md`, write one line per lesson:
   `L3: scene — <why> | lab: labs/03-<name>/ | requires: l1.o1, l2.o2`
   - motion: `scene` or `no scene — <the interactive or static figure instead>`, per [motion → Decide](../references/motion.md#decide);
   - lab: a folder, `shared lab`, or omitted for non-hands-on topics ([labs](../references/labs.md));
   - `requires`: objectives of **lower-numbered** lessons only, or ones the diagnostic showed. This line is the only home of prerequisites; do not write `requires` into `course.js`;
   - `test-out` when every objective of the lesson has at least one diagnostic entry `met` and none `not_met`; the learner then chooses whether to skip to its faded example and challenge.
5. **Challenges.** The last lesson of each milestone carries the milestone challenge (`data-kind="milestone"`); every other lesson has a smaller lesson challenge (`data-kind="lesson"`). Note `challenge: milestone m2` on that lesson's line.
6. **Write `assets/course.js`** in the v2 shape ([components → course.js](../references/components.md#coursejs-v2)). Keep entries for lessons that do not exist yet. Titles and labels are plain text, never HTML.
7. **Report** to the learner: the mission line, then a table of lesson, milestone, objectives and motion/lab decision. Ask only about choices that depend on their time or equipment.

## Completion checks

- Every success line maps to exactly one milestone, and every milestone to a success line.
- Every milestone has at least one lesson and exactly one milestone challenge, on its last lesson.
- Lessons are numbered 1..N without gaps, and each `file` matches `lessons/\d{4}-[a-z0-9-]+\.html`.
- Every lesson has 1–3 objectives with observable verbs; `requires` only points backwards.
- A lesson title needs "and" at most once; otherwise it is two lessons.
- From lesson 3 on, the plan notes at least one practice item drawn from an earlier objective (interleaving).
- `course.js` parses (`node -e "global.window={};require('./assets/course.js');console.log(window.COURSE.lessons.length)"`).
- No lesson HTML was written.
- On a re-plan: every `mastered` milestone and its `evidence` are unchanged from before the run (compare with `git diff` or a copy of `course.js` taken first).

## Re-planning

A re-plan is the only way to change lesson order. Keep the numbers of lessons that already have files; renumber only unwritten ones. Add `replan: <date> — <why>` to `NOTES.md`. Add a milestone only by adding a success line to `MISSION.md`, after the learner agrees.

- Never change a `mastered` milestone: keep its `id`, `label`, `canDo`, `status`, `evidence` and `objectives` exactly. Step 2 sets `in-progress`/`locked` only on milestones that are not mastered.
- New milestones get the next free id (`m<k+1>`), never a reused one. When a Deep Learn grows into a course, its success line stays `m1`.
- A sharper lesson `canDo` proposed by a challenge review (`## Re-plan proposals` in `NOTES.md`) is applied here, never after grading.
