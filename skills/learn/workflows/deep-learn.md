# Deep Learn (one lesson, one sitting)

The learner wants one idea taught properly, without a long-term goal. The output is a one-lesson course they can open from disk, and it can grow into a full course later.

**Preconditions:** no `MISSION.md` in the target folder. If one exists, this is [continue-course](continue-course.md).

## Steps

1. **Pick the folder.** If the current directory is empty, use it. If it holds other work (a code repository, documents), propose `learn-<topic-slug>/` next to it and wait for a yes.
2. **One question at most.** Infer the course language from the learner's messages and the goal from their request. Ask one question only when the goal is unclear ("what will you do with this?") or the language is ambiguous.
3. **Scaffold** exactly as in [new-course → Scaffold](new-course.md#scaffold), then write:
   - `MISSION.md` with **Why** (one sentence) and one **Success looks like** line;
   - `NOTES.md` with `mode: deep-learn`, `lang:`, `profile:` and the theme;
   - `assets/course.js` with one milestone `m1` and one lesson with 1–2 objectives ([plan-course step 3](plan-course.md#steps) defines objectives);
   - under `## Per-lesson decisions` in `NOTES.md`, the line `L1: <scene — why | no scene — what instead> | requires: — | challenge: milestone m1`, deciding motion per [motion → Decide](../references/motion.md#decide), and the line `diagnostic: skipped (deep-learn)`. These meet the preconditions of research-sources and write-lesson: do not run plan-course or the diagnostic.
4. **Sources:** run [research-sources](research-sources.md) for lesson 1 within the profile budget.
5. **Write the lesson** with [write-lesson](write-lesson.md), adding these Deep Learn elements:
   - a **2-item pretest** before the explanation, introduced with "Guess before you read; a wrong guess is fine". Mark both items `pretest: true`: the browser records them as diagnostic, never toward a level or the review schedule. Because items are spread through the page, place every item with `data-practice-item` ([placement](../references/lesson-contract.md#practice-items));
   - an explanation with a diagram, then a worked example followed by a faded one;
   - **≥ 3 practice items per objective** (the contract), at least one of type `recall`; the pretest does not count toward them;
   - a `#challenge` with `data-kind="milestone"` and `data-milestone="m1"`: a transfer task with 2–4 pass criteria the learner can self-check;
   - Go deeper links.
6. **Review** per profile (Fast: the self-checklist; Balanced/Deep: [review-panel](review-panel.md)).
7. **Deliver:** open the lesson once, tell the learner what to do in it, and offer two next steps: send the challenge back for review ([review-challenge](review-challenge.md)), or turn this into a course: run the remaining questions of the [setup interview](new-course.md#setup-interview) and the [diagnostic](new-course.md#diagnostic), then [plan-course](plan-course.md) under its [re-planning](plan-course.md#re-planning) rules (lesson 1 keeps its number, the Deep Learn success line stays `m1`).
