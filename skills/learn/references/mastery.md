# Mastery

Mastery is **derived from evidence**, never stored, hand-set or self-declared. The unit is an objective (`l3.o1`), or a milestone (`m2`) for challenges. The browser derives levels with `Learncraft.store.level()`; agents record evidence as learning records. The thresholds are design choices, not research constants.

## Levels

An objective's level is the highest one whose evidence exists. L5 also needs L3 or L4; L6 needs a passed milestone challenge marked `transfer: true`. Names are the ones the dashboard shows (`Learncraft.store` `LEVEL_NAMES`); use them in reports.

| Level | Name | Evidence required | Recorded by |
|---|---|---|---|
| L0 | Not started | none | — |
| L1 | Seen | the lesson was opened (`exposure` event), or any attempt on the objective | browser |
| L2 | Familiar | ≥ 2 items on the objective attempted, first-attempt accuracy ≥ 0.6 (choice items allowed) | browser |
| L3 | Understood | ≥ 3 items, first-attempt accuracy ≥ 0.8, including ≥ 1 recall, fade or order item (or a custom `label`/`explain` widget) correct on its first attempt | browser |
| L4 | Applied | a reviewed **milestone** challenge with all criteria met, on the learner's own material. It applies only to the objectives the challenge's criteria name (`criteria[].objectives` in the learning record, copied to the milestone's `objectives` in `course.js`). Every other objective of the milestone keeps its practice-derived level. A lesson-challenge pass is recorded but sets no level | agent, via [review-challenge](../workflows/review-challenge.md); the browser reads the milestone's `mastered` status and `objectives` |
| L5 | Retained | a review passed at least 7 days after the previous success (a first-try correct answer or a passed review), with no lesson content shown, and the latest review passed (a failed review removes L5 until the next pass) | browser `review.html` (`review_session`), or an agent [cold check](../workflows/review.md#cold-check) |
| L6 | Transferred | a reviewed milestone challenge, all met, whose context differs from every practice item and earlier challenge (`transfer: true`, justified) | agent only; lives in learning records, not in the browser |

Browser practice reaches L3 at most. Answers migrated from the old progress format count toward L2 only, because their first-try status is unknown. A mastered milestone without `objectives` (passed before criteria named objectives) is proven at milestone level only: report "m2 passed", never L4 on its objectives.

## Who records what

| Evidence | Writer | Where |
|---|---|---|
| exposure, attempts, review sessions | browser runtime | `localStorage`, exported by the learner to `progress/*.json` |
| diagnostic results | agent | learning record `kind: prior` (placement only) |
| challenge results, cold checks | agent | learning record `kind: demonstrated` or `misconception`; `course.js` milestone status and `objectives`. The record behind a milestone is the one its `evidence` names, never a cold-check or lesson-challenge record |
| claimed prior knowledge | agent | learning record `kind: claimed` (placement hint only) |
| your own impression of the learner | nobody | not recorded as evidence; mention it in conversation as an impression if at all |

## What never sets a level

- Opening, scrolling, time on page, watching a scene.
- Attempts after feedback (only the first-ever attempt on an item version counts).
- A same-session practice score presented as "mastery".
- Claims ("I already know X"), self-ratings, and agent estimates.
- Synthetic or `fake`-mode lab output.
- Lesson-page re-answers for L5; only cold review counts.
- Pretest answers (`pretest: true` items, recorded with `context: 'diagnostic'`): they count toward no level and never enter the review schedule.

## Learner performance vs model confidence

Report what the learner *did*, with its basis: "L3 Understood on l2.o1: 5 first attempts, 4 correct, 1 recall". Never turn your confidence about the learner into a level. When you have only an impression, say it is one, and offer a quick check instead. A thin basis must be visible, so always state the evidence count next to a level.

## Review schedule

One review card per objective, in 5 Leitner boxes with intervals of **1, 3, 7, 14 and 30 days**:
- A card enters box 1, due the next day, at the first attempt on the objective; `review.html`, the dashboard and the Node recipe in [review](../workflows/review.md#read-exported-evidence) schedule it that way. The lesson page's own strip says "not in review yet" until every item of that lesson was tried.
- Only cold `review_session` results move a card after that. Lesson-page practice never does.
- A review session passes at ≥ 80% correct on first answers (2 of 2, 3 of 3, 4 of 5).
- A pass on or after the due date moves the card up one box. An early pass is logged and changes nothing.
- A fail at any time returns the card to box 1, due in one day, with status `lapsed`.
- Every change has a one-sentence explanation ("Nov 24: 1/3 correct → back to box 1, due Nov 25").

The schedule decides when to **test** next. It does not model memory, so never present it as "you have forgotten X".

## Retention status

`retained` (last review passed), `due`, or `lapsed` (last review failed). A lapse never deletes L4 or L6 history and never relocks a milestone; it schedules practice.
