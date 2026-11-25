# Continue the course

Decide what this session does, then run the profile's pipeline for it. This file holds the **only** rule for what comes next; every other file links here.

**Preconditions:** `MISSION.md` exists. If `assets/course.js` has no lessons, run [plan-course](plan-course.md) first.

## Read the state

Read `NOTES.md`, `assets/course.js`, the five newest `learning-records/`, and any `.review/l*/state.md`. If `progress/*.json` exists, summarise it per objective as in [review → Read exported evidence](review.md#read-exported-evidence). Without an export you cannot see browser practice; say so instead of guessing.

## The next-step rule

Take the **first** row that applies. The learner naming a lesson or a task overrides all of them.

| # | Condition | This session |
|---|---|---|
| 1 | A `.review/l<N>/state.md` has status `drafting`, `in_review`, `paused` or `escalated` | resume that lesson in [review-panel](review-panel.md) (or answer the escalation question) |
| 2 | The learner sent challenge work | [review-challenge](review-challenge.md) |
| 3 | The last milestone challenge was missed | remediation of the missed criteria only: per gap, one new worked example and two practice items in chat, then invite a resubmission. No new lesson |
| 4 | A `cold-check` date in `NOTES.md` has passed | a cold check in chat ([review → Cold check](review.md#cold-check)), then go on |
| 5 | The export shows an objective the next lesson `requires` as `lapsed` or below L3 | a short [review](review.md) of it first, then go on |
| 6 | Otherwise | **the next lesson: the lowest-numbered `course.js` lesson whose `file` does not exist** |
| 7 | Every lesson file exists | if milestones remain, [plan-course](plan-course.md) adds lessons; if `NOTES.md` says `mode: deep-learn`, offer to grow it into a course; if all milestones are mastered, propose a mission update |

`course.js` order is the plan. Never pick a different lesson silently: a reorder is a [re-plan](plan-course.md#re-planning). If the next lesson is marked `test-out` in `NOTES.md`, offer to skip to its faded example and challenge, and let the learner choose.

## Run the pipeline for the next lesson

Profile budgets are in [profiles](../references/profiles.md).

1. **Sources.** If `RESOURCES.md` has no `### Lesson N` block, run [research-sources](research-sources.md): inline in Fast (reusing entries where they fit), as a researcher subagent in Balanced and Deep (give it the absolute path of `research-sources.md` and the lesson number).
2. **Write.** [write-lesson](write-lesson.md). In Fast, write directly. In Balanced and Deep, write inside [review-panel](review-panel.md), which wraps authoring in rounds.
3. **Review.** Fast: the [self-checklist](../references/lesson-contract.md#self-checklist), stamped `review: self` in `NOTES.md`. Balanced/Deep: the panel.
4. **Deliver.** Open the lesson once, at the end (`open`, `xdg-open` or `start`, depending on the OS). Tell the learner in two lines what to do: read, do the practice, then the challenge, and send the work back. Mention `review.html` when reviews are due.
5. **Note.** Append `L<N>: delivered <date> · check <pass|fail|skipped> · review <self|panel>` to `NOTES.md`.
