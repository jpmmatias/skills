# Practice

Effortful retrieval on objectives the learner has already met, with immediate feedback and no new teaching. Practice builds fluency; it never masters a milestone or moves a review box ([mastery](../references/mastery.md)).

**Preconditions:** a course with at least one written lesson. Outside a course, practise in chat on the topic just explained, with the same rules and no files.

## Choose what to practise

1. If `progress/*.json` exists, summarise it ([review → Read exported evidence](review.md#read-exported-evidence)) and pick objectives weakest first: lowest first-try accuracy, then `lapsed`, then oldest practice.
2. Without an export, use the learner's request, misconception records in `learning-records/`, and the objectives of the last two lessons. Say that you cannot see their browser practice, and how to export it.
3. Interleave: at least 2 objectives per session, and never practise only the newest lesson.

## Run the session (in chat)

- At least **6 items**, one at a time: ask, wait for the answer, then grade it.
- At least half are recall or application (write it, compute it, predict it, debug it). Multiple choice only for discriminating near-neighbours.
- Write **fresh items**: never reuse a lesson's items verbatim (those belong to `review.html`), and vary the surface (new numbers, new context).
- After each answer: correct or not, the *why*, and for a wrong answer the misconception it suggests. No new content beyond what the lessons taught; if a gap needs teaching, say so and offer a short re-teach afterwards.
- If first-try accuracy on an objective is below 60% after 3 items (1 of 3 or worse), stop drilling it: give a second worked example with a different surface, then 2 parallel items ([pedagogy → Adaptive difficulty](../references/pedagogy.md#adaptive-difficulty)).
- End with a 2-line summary per objective: items, first-try correct, what to do next.

## Record

- Append `practice <date>: l2.o1 3/4, l3.o1 1/3` to `NOTES.md`.
- Write a learning record only for a misconception (`kind: misconception`), never for a good score.
- Chat practice does not reach the browser's progress. If the learner wants more browser practice, append **new** items with new ids to the lesson's `lessons/NNNN.practice.js` ([practice items](../references/lesson-contract.md#practice-items)), never items asked in this chat. Run [self-checklist](../references/lesson-contract.md#self-checklist) item 5 on them, and note `practice-items added: l2 (+3) <date>` in `NOTES.md`. Never change an existing item's prompt or answers to make a "new" item.
