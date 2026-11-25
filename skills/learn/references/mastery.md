# Mastery

Mastery is **derived from evidence**, never stored, hand-set or self-declared. The unit is an objective (`l3.o1`), or a milestone (`m2`) for challenges. The browser derives levels with `Learncraft.store.level()`; agents record evidence as learning records. The thresholds are design choices, not research constants.

## Levels

The highest level whose evidence exists wins. L5 and L6 also require L4 (or L3 for an objective with no challenge).

| Level | Name | Evidence required | Recorded by |
|---|---|---|---|
| L0 | Unknown | none | — |
| L1 | Exposure | the lesson was opened (`exposure` event) | browser |
| L2 | Familiarity | ≥ 2 items on the objective attempted, first-attempt accuracy ≥ 0.6 (choice items allowed) | browser |
| L3 | Understanding | ≥ 3 items, first-attempt accuracy ≥ 0.8, including ≥ 1 recall, order or fade item correct on its first attempt | browser |
| L4 | Independent application | a reviewed challenge with **all** criteria met, on the learner's own material | agent, via [review-challenge](../workflows/review-challenge.md); the browser reads it from the milestone's `mastered` status |
| L5 | Retention | a cold review passed at least 7 days after the previous success, with no lesson content shown | browser `review.html` (`review_session`), or an agent [cold check](../workflows/review.md#cold-check) |
| L6 | Transfer | a reviewed challenge, all met, whose context differs from every practice item and earlier challenge (`transfer: true`, justified) | agent only; lives in learning records, not in the browser |

Browser practice reaches L3 at most. Answers migrated from the old progress format count toward L2 only, because their first-try status is unknown.

## Who records what

| Evidence | Writer | Where |
|---|---|---|
| exposure, attempts, review sessions | browser runtime | `localStorage`, exported by the learner to `progress/*.json` |
| diagnostic results | agent | learning record `kind: prior` (placement only) |
| challenge results, cold checks | agent | learning record `kind: demonstrated` or `misconception`; `course.js` milestone status |
| claimed prior knowledge | agent | learning record `kind: claimed` (placement hint only) |
| your own impression of the learner | nobody | not recorded as evidence; mention it in conversation as an impression if at all |

## What never sets a level

- Opening, scrolling, time on page, watching a scene.
- Attempts after feedback (only the first-ever attempt on an item version counts).
- A same-session practice score presented as "mastery".
- Claims ("I already know X"), self-ratings, and agent estimates.
- Synthetic or `fake`-mode lab output.
- Lesson-page re-answers for L5; only cold review counts.

## Learner performance vs model confidence

Report what the learner *did*, with its basis: "L3 on l2.o1: 5 first attempts, 4 correct, 1 recall". Never turn your confidence about the learner into a level. When you have only an impression, say it is one, and offer a quick check instead. A thin basis must be visible, so always state the evidence count next to a level.

## Review schedule

One review card per objective, in 5 Leitner boxes with intervals of **1, 3, 7, 14 and 30 days**:
- Only cold `review_session` results move a card. Lesson-page practice never does.
- A pass on or after the due date moves the card up one box. An early pass is logged and changes nothing.
- A fail at any time returns the card to box 1, due in one day, with status `lapsed`.
- Every change has a one-sentence explanation ("Nov 24: 1/3 correct → back to box 1, due Nov 25").

The schedule decides when to **test** next. It does not model memory, so never present it as "you have forgotten X".

## Retention status

`retained` (last review passed), `due`, or `lapsed` (last review failed). A lapse never deletes L4 or L6 history and never relocks a milestone; it schedules practice.
