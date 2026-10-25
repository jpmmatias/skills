---
name: lesson-panel
description: Run a four-agent lesson review on a learn course. Use when the user asks to continue a course with a review panel, create a lesson and have it judged, or names an author plus an expert, a novice, and a course-flow reviewer. The author writes one lesson; the other three review it; their notes go back to the author until all three approve.
argument-hint: "Which course or lesson should the panel take next?"
---

Run the lesson panel on the current learn course. The course is the directory that contains `MISSION.md` and `assets/course.js`. Follow the `learn` skill for how a lesson is built. This skill only adds the four roles and the review loop.

Read the role, then do that role. The prompts are [author](agents/author.md), [expert](agents/expert.md), [novice](agents/novice.md), and [flow](agents/flow.md).

## Loop

1. Pick the next lesson: the first entry in `assets/course.js` whose file is missing, unless the user named one. Slug it `lN` from the lesson number.
2. Run the author on that lesson. The author is the only role that edits the course. The author finishes by writing `.review/<slug>-author-done.md`.
3. When that note exists, run the expert, the novice, and the flow at the same time. Each writes `.review/<slug>-<role>.md` and does not edit the lesson.
4. If any verdict is `REVISE`, send all three notes to the author and repeat from step 2 on the same lesson. The author applies the notes in place.
5. Stop when all three verdicts are `APPROVE`. A note inside an `APPROVE` does not start another round.

Completion: three `APPROVE` files exist for this draft, and the lesson file matches the last author note.

## Handoff

Reviewers read the lesson that is on disk. They start after the author note exists. A missing note means the draft is not ready; it is not a review of the page.

Send the author the three review files in one pass. A second pass starts only after that revision is saved and the author note is rewritten.

Leave `MISSION.md` and milestone status unchanged. Do not commit unless the user asks.
