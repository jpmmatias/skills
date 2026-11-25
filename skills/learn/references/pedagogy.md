# Pedagogy

The learning model behind every workflow. Thresholds below are design choices, chosen to keep practice effortful but mostly successful; they are not research constants. The empirical claims in this file (retrieval practice, spacing, interleaving, worked → faded examples, pretesting, the zone of proximal development) are mainstream findings stated from general knowledge; none was fetched or verified for this skill.

## Philosophy

To learn at depth the learner needs three things:
- **Knowledge**, from high-trust sources ([grounding](grounding.md)). Never trust your parametric memory for facts you put in a lesson.
- **Skills**, from practice with tight feedback loops: in-browser items, real-world steps, and [labs](labs.md).
- **Wisdom**, from contact with other practitioners. When a question needs wisdom, answer as well as you can, then point to a well-moderated community; respect an opt-out.

Some topics lean on knowledge (theoretical physics), others on skills (yoga). While a learner first meets new material, keep extraneous load low (clear explanations, worked examples, one idea at a time). Once it has been taught, make retrieval effortful for both knowledge and skills: recall from memory, spaced over days, mixed with neighbours.

## Fluency vs storage strength

- **Fluency**: retrieving something right now, minutes after reading it. It feels like mastery and often is not.
- **Storage strength**: what is still there next week.

Build storage strength with retrieval practice (recall from memory), spacing (practice spread over days) and interleaving (mixing related objectives so the learner must choose which idea applies). This is why a same-session practice score is reported as practice, never as mastery ([mastery](mastery.md)).

## Lifecycle

| Step | What happens | Where |
|---|---|---|
| 1. Objective | mission → milestones → lesson objectives with observable verbs | [new-course](../workflows/new-course.md), [plan-course](../workflows/plan-course.md) |
| 2. Prerequisites | `requires` per lesson, backwards only | plan-course (`NOTES.md`) |
| 3. Gaps | a 3–6 item diagnostic, not claims | [new-course → Diagnostic](../workflows/new-course.md#diagnostic) |
| 4. Curriculum | ordered lessons, motion and lab decisions | plan-course |
| 5. Explain | first principles, mental model, figure | [teaching-core](teaching-core.md), [write-lesson](../workflows/write-lesson.md) |
| 6. Demonstrate | worked example, then a faded one; scenes | write-lesson, [motion](motion.md) |
| 7. Practice | practice items as data; [practice mode](../workflows/practice.md) | [lesson-contract](lesson-contract.md#practice-items) |
| 8. Assess | lesson and milestone challenges | [review-challenge](../workflows/review-challenge.md) |
| 9. Feedback | per-option `why`; criterion-by-criterion review | lesson-contract, review-challenge |
| 10. Schedule review | Leitner boxes per objective; `review.html`; cold checks | [mastery](mastery.md#review-schedule), [review](../workflows/review.md) |
| 11. Next step | evidence → the next-step rule | [continue-course](../workflows/continue-course.md#the-next-step-rule) |

## Zone of proximal development

Each lesson should feel challenging "just enough": one step past what the learner showed, never past what they claimed. Evidence (diagnostic, challenges, exports) sets the floor; claims only break ties.

## Adaptive difficulty

Adapt only on assessment evidence, never on time on page, scrolling or self-rated confidence.

| Signal | Action |
|---|---|
| The diagnostic meets the lesson's `test-out` rule ([plan-course](../workflows/plan-course.md#steps)) | offer test-out: skip to the faded example and the challenge (the learner chooses) |
| First-try accuracy on an objective < 0.6 after 3 items (1 of 3 or worse) | a second worked example with a different surface, then a parallel item set |
| 0.6 to < 0.8 | proceed as planned |
| ≥ 0.8 with a recall, fade or order item correct (the L3 bar) | say the learner looks challenge-ready; next time fade more steps. The browser's "You look ready for the challenge" line uses ≥ 0.8 of the lesson's set without the recall condition; practice is still not proof |
| A required objective is lapsed or below L3 when the next lesson starts | a short review first ([next-step rule](../workflows/continue-course.md#the-next-step-rule)) |
| Challenge criteria `not_met` | remediation of those criteria only, then resubmission |
| Two failed reviews in a row on an objective | re-teach with a new explanation or model |

## Load budget

Per lesson, flag (not forbid): more than 5 new terms (`<dfn>`), more than 1 scene, or more than about 1,500 words of prose. One worked example gets one self-explanation prompt ("why does this line exist?").

## Reference documents

Lessons are rarely reopened; reference documents are. Each is the compressed essence of one or more lessons, built for quick lookup and good print: syntax and snippets, algorithms and flowcharts, poses and sequences, routines, the reference models. `reference/glossary.html` may mirror `GLOSSARY.md`, which stays the source of truth.

## Glossary

`GLOSSARY.md` holds only terms the learner has used correctly ([format](../GLOSSARY-FORMAT.md)); promotion happens during [challenge review](../workflows/review-challenge.md). Once a term is in it, every lesson, item and record uses it, and its aliases-to-avoid stay out of new lessons.
