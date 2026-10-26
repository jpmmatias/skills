---
name: curriculum-planner
description: Plan a learn course before any lesson is written. Use when a course has a MISSION.md but no lesson list, when the user asks for a curriculum, a syllabus, a roadmap or a milestone map, or when the mission changed and the plan must be redrawn. Produces the milestone map and the ordered lesson list in assets/course.js, with a scene or lab decision per lesson.
argument-hint: "Which course folder should be planned?"
---

Plan the current learn course. The course is the directory with `MISSION.md`. Write the plan into `assets/course.js` and `NOTES.md`. Write no lesson HTML; that is the author's work, and the course-flow reviewer judges each lesson against this plan.

## Steps

1. Read `MISSION.md`, every file in `learning-records/`, `NOTES.md`, and `RESOURCES.md` if it exists. If `MISSION.md` is missing or its **Why** is vague, stop and run the setup interview from the `learn` skill first. Completion: you can state the mission in one line and the learner's current floor in one line.
2. Draw the milestone map. One milestone per **Success looks like** line in `MISSION.md`, in the order the learner must earn them. Each has an `id`, a short `label`, and a `canDo` the learner could demonstrate in a challenge. The first is `in-progress`; the rest are `locked`. Keep the mission's **Out of scope** list out of the map. Completion: every success criterion maps to exactly one milestone, and every milestone traces back to a criterion.
3. Order the lessons. Each lesson teaches one idea, fits one sitting, and builds exactly the milestones it names. The sequence starts at the floor from the learning records, and each lesson assumes only what earlier lessons taught. Give every lesson `n`, a `file` of the form `lessons/NNNN-<slug>.html`, a `title`, its `milestones`, and a `canDo` that practice would prove. Completion: every milestone has at least one lesson, no lesson needs an idea taught later, and the final lesson of each milestone ends in a transfer challenge.
4. Decide motion per lesson using the **Decide on motion** rules in the `learn` skill: `scene` when the idea is a process over time or a hidden mechanism, `no scene` with the stated interactive otherwise. Decide labs per lesson for hands-on topics: name the lab directory `labs/NN-<name>/`, or write `shared lab` when one project grows across lessons. Record one line per lesson under `## Per-lesson decisions` in `NOTES.md`. Completion: each lesson has a motion line and, for hands-on courses, a lab line.
5. Write `assets/course.js` from the starter template in the `learn` skill, with `id`, `topic`, `mission`, the milestones, and the lessons. Keep the file entries even though the files do not exist yet; a missing file is how the author finds the next lesson. If the course has `index.html`, keep it rendering from `course.js` rather than a hand-typed roadmap.
6. Report the plan to the learner as a table of lesson, milestone, and motion or lab decision, with the mission line above it. Ask only about ordering choices that depend on their time or equipment.

Completion for the plan: `assets/course.js` parses, every milestone and lesson is in it, `NOTES.md` has the per-lesson decisions, and no lesson HTML was written.

## Rules

- Milestones come from the mission. Add one only by adding a success criterion to `MISSION.md`, with the learner's agreement.
- Lessons stay small. A lesson whose title needs "and" twice is two lessons.
- A capstone lesson that composes the course belongs to the last milestone, not to a milestone of its own.
- When the plan is redrawn after lessons exist, keep the numbers of written lessons fixed. Renumber only lessons that have no file.
- Do not commit unless the learner asks.
