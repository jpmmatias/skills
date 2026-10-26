---
name: challenge-reviewer
description: Review a learner's milestone challenge in a learn course. Use when the learner sends back challenge work, asks whether a milestone passed, or asks for a learning record. Grades against the lesson's pass criteria, writes the learning record, and marks the milestone mastered only when the work earns it.
argument-hint: "Which lesson's challenge is this, and where is the work?"
---

Review one milestone challenge in the current learn course. The course is the directory with `MISSION.md` and `assets/course.js`. The `learn` skill defines the challenge box and the record format; this skill is the review.

The only thing that unlocks a milestone is this review. Quiz scores and practice mastery are practice. Treat them as context, never as evidence.

## Steps

1. Find the challenge. Open the lesson's `id="challenge"` box and copy its pass criteria verbatim into your notes. The criteria are the whole rubric. Completion: every criterion is listed, and nothing else is on the list.
2. Collect the evidence. Read what the learner sent: files, numbers, text, a photo, a lab results file. When a lab wrote an evidence file, open it and read the configuration it ran under. Completion: each piece of evidence is tied to the criterion it speaks to, or marked as not addressing any.
3. Check the evidence is the learner's. Recompute any arithmetic the criteria depend on. Reject synthetic or `fake`-mode lab output; the lab README says which modes are synthetic. A polished write-up that reads as pasted or generated is reading, not evidence: note it, and plan a cold retrieval in a later session. Completion: each criterion is marked `met`, `not met`, or `unverifiable`, with the quote or number that decided it.
4. Decide. All criteria `met` is a pass. Anything else is not. There is no partial credit and no pass for effort.
5. Write back to the learner, criterion by criterion: what the evidence shows, quoting their words or numbers. On a pass, say what they can now do, in the words of the milestone's `canDo`. On a miss, name the smallest piece of work that closes each gap and invite a resubmission.
6. Record. On a pass, write a learning record with an **Evidence** section, following `LEARNING-RECORD-FORMAT.md` in the `learn` skill. Number it after the highest existing record. On a miss that exposed a misconception, write a record for the misconception; it predicts later stumbles.
7. Update `assets/course.js`. On a pass: the milestone becomes `mastered` with `evidence: 'LR-NNNN'`, the next milestone becomes `in-progress`, and the lesson's `canDo` is sharpened if the review showed something sharper. On a miss: leave the status alone.
8. Write one line in `NOTES.md` about what the review revealed for the next lesson: pace, a term to retrieve cold later, a preference. Then say which lesson comes next.

Completion for the whole review: the learner has a criterion-by-criterion reply, the record exists if one was earned, and `assets/course.js` matches the record.

## Rules

- Grade against the stated criteria only. A criterion the lesson did not state cannot fail the learner.
- Evidence from the learner's own system or material outranks a copy of the lesson's example. If the challenge asked for their data and they sent the lesson's data, that criterion is `not met`.
- A pass is per milestone. A lesson that builds two milestones can pass one and miss the other.
- Keep `MISSION.md` unchanged. A mission shift is a conversation with the learner, then its own record.
- Do not commit unless the learner asks.
