# 03 — Pedagogy & Learning Science Audit (LearnKit)

Auditor: Agent 03 (Learning Scientist & Pedagogy). Scope: `skills/learn/SKILL.md`, `skills/learn/*-FORMAT.md`,
`skills/challenge-reviewer/SKILL.md`, `skills/curriculum-planner/SKILL.md`, `skills/lesson-panel/agents/*.md`,
`skills/learn/starter/assets/{progress,quiz,diagram,course}.js`, `starter/tools/check.mjs`. Read-only audit.

Baseline facts taken as given (browser probe, not re-derived): answer overwrite on each page load's first click;
per-lesson Leitner-like stage that never regresses; evidence-gated milestones; no diagnostic beyond claimed knowledge.

Citations are limited to work I am confident exists. No effect sizes are introduced by this report.

---

## 1. What is already good (keep it)

| Principle | Evidence | Why it is right |
|---|---|---|
| Fluency vs storage strength | `SKILL.md:44-55` | Correctly names the illusion of mastery from in-the-moment fluency (Bjork & Bjork, 1992, "new theory of disuse", in Healy, Kosslyn & Shiffrin (Eds.)). Gives the system the vocabulary to fix its own "mastery" label (PED-04). |
| Retrieval over consumption | `SKILL.md:203`, `SKILL.md:234` | "Watching earns no XP"; XP only from first-try correct retrieval. Aligns rewards with the testing effect (Roediger & Karpicke, 2006, *Psychological Science*). |
| Evidence-gated milestones | `SKILL.md:213`, `challenge-reviewer/SKILL.md:9,16`, `progress.js:10-11` | Self-scored quiz never unlocks a milestone; all criteria must be met; no partial credit. This is genuine mastery-learning gating (Bloom, 1968, "Learning for Mastery"). |
| Transfer challenge | `SKILL.md:219`, `flow.md:15`, `challenge-reviewer/SKILL.md:27` | Challenge must be real-world transfer, not a quiz restatement; learner's own material outranks lesson data. |
| Observable pass criteria, stated up front | `SKILL.md:217-221` | 2–4 observable checks the learner can self-check against = transparent rubric. |
| Criterion-referenced informational feedback | `SKILL.md:225`, `challenge-reviewer/SKILL.md:17` | Quote the learner's numbers per criterion; name the smallest gap-closing work. Matches task/process-level feedback (Hattie & Timperley, 2007, *Review of Educational Research*). |
| Authenticity checks on evidence | `challenge-reviewer/SKILL.md:15`, `SKILL.md:333` | Recompute arithmetic, reject synthetic/`fake` lab output, flag pasted work and plan a cold retrieval. Rare and valuable. |
| Worked → faded examples | `SKILL.md:142`, `author.md:7`, `diagram.js:16,240-255` | Present in spec, author role and a component (Sweller & Cooper, 1985, *Cognition and Instruction*; Renkl & Atkinson, 2003, *Educational Psychologist*). |
| Cognitive-load hygiene | `SKILL.md:63,127,136-140,314`, `curriculum-planner/SKILL.md:13,23` | Short lessons, one idea, segmenting, pre-training, spatial contiguity, coherence; "difficulty is the enemy" for acquisition vs "the tool" for skills (`SKILL.md:320`). Consistent with Sweller (1988, *Cognitive Science*). |
| Learning styles debunked | `SKILL.md:133,146` | "Visual learner" recorded as preference only, never a reason to drop retrieval (Pashler et al., 2008, *Psychological Science in the Public Interest*). |
| Answer-cue hygiene | `SKILL.md:339`, `quiz.js:19-23`, `novice.md:15` | Equal-length options, shuffled order, novice reviewer flags give-away wording. |
| Evidence-gated vocabulary | `GLOSSARY-FORMAT.md:29`, `SKILL.md:365` | Terms enter the glossary only after correct use — the glossary is a record of demonstrated knowledge. |
| Coverage ≠ learning | `LEARNING-RECORD-FORMAT.md:40` | "Material that was merely covered. Coverage is not learning." |
| Multi-perspective lesson QA | `lesson-panel/agents/*.md` | Expert (truth), novice (prerequisite leakage, give-aways), flow (sequence, transfer). Novice role is an effective proxy for the expertise gap. |

---

## 2. Findings

### PED-01 — First-try evidence is overwritten on reload (inflated mastery, lost history) · **P0**
- Evidence: `progress.js:106-108` (`S.answers[k] = { ok, at }` unconditionally); `quiz.js:28,33` (`first` resets per page load); same pattern `diagram.js:222,252,332`.
- Impact: a missed item becomes "correct on first try" after reload; the original failure is destroyed. `mastery()` (`progress.js:28-31`) and the dashboard bar (`progress.js:149-152`) report 100% for a learner who failed. Breaks the SKILL's own claim "mastery = share of first-try correct" (`SKILL.md:235`). Evidence used for review scheduling (PED-03) is also corrupted.
- Recommendation: append-only event log (§5). Never mutate past attempts; derive all metrics. "First try" = first attempt *ever* on that item version (lesson context) or first attempt *in that review session* (review context) — distinguished by `context`.
- Complexity: M · Regression risk: M (storage migration; must keep old key for rollback).

### PED-02 — Practice item IDs are positional/shared, so evidence attaches to the wrong item · **P1**
- Evidence: `quiz.js:33` (`'q' + (qi + 1)`); `diagram.js:222,252,332` (constant ids `band`, `fade`, `explorer`); count `progress.js:160` vs keys `progress.js:88`.
- Impact: (a) a lesson-panel revision that inserts/reorders a question (`lesson-panel/SKILL.md:16`) silently remaps history onto different questions; (b) two `.fade` (or two `.band-quiz`) on one page share key `L<n>:fade`, so `answered < expected` forever — the completion banner never fires and the second widget's evidence is lost.
- Recommendation: require explicit `data-id` on every practice root (lint error if missing/duplicate), plus `data-objective`; store `itemVersion` (hash of stem+answer) so edited items start fresh history.
- Complexity: S · Regression risk: L (fallback to positional id with a lint warning).

### PED-03 — Review schedule advances on failure and never lapses · **P1**
- Evidence: `progress.js:110-112` (stage++ on *any* recorded answer after due, `ok` ignored); no decrement anywhere.
- Impact: spacing without contingency on success — a learner who fails every review climbs to the 30-day interval. "Reviews due" (`progress.js:137,141`) and "Next review" become noise; the dashboard implies retention that was never shown.
- Recommendation: §6 Leitner rule (pass → box+1 only if on/after due; fail → box 1). Only `context: review | retrieval_check` events move boxes.
- Complexity: S · Regression risk: L.

### PED-04 — "Practice mastery" labels a same-session fluency score as mastery · **P1**
- Evidence: `progress.js:80` ("Practice mastery"), `progress.js:94-95` (toast says "You can now {canDo}" at ≥80%), `SKILL.md:235`.
- Impact: contradicts `SKILL.md:44-51` (fluency is illusory) and `SKILL.md:213` (practice is not mastery). The toast asserts a capability claim from recognition MCQs answered minutes after reading — precisely the illusion the skill warns about.
- Recommendation: rename to "First-try practice" / "Practice accuracy"; toast says "Practice done: X% first try. The challenge shows whether you can {canDo}." Show the §4 level separately.
- Complexity: S · Regression risk: L.

### PED-05 — No diagnostic: course floor is built from claims · **P1**
- Evidence: `SKILL.md:288` ("Record claimed prior knowledge as a learning record"); `LEARNING-RECORD-FORMAT.md:34`; `curriculum-planner/SKILL.md:11` ("learner's current floor" from records).
- Impact: placement relies on self-assessment, which is a weak predictor of performance; over-claimers skip prerequisites, under-claimers are re-taught. Also loses the pretesting benefit: unsuccessful retrieval attempts can enhance later learning (Kornell, Hays & Bjork, 2009, *JEP: Learning, Memory, and Cognition*).
- Recommendation: add step "gaps": after the interview, a 5–10 item diagnostic (chat or `lessons/0000-diagnostic.html`) with ≥1 item per planned early objective, recall/application preferred. Claims become `claim` events (placement prior, never a level). Planner uses diagnostic evidence (≥ L3 on an objective ⇒ that lesson is "test-out eligible").
- Complexity: M · Regression risk: L.

### PED-06 — No review execution; "due" just means "reopen the lesson" · **P1**
- Evidence: `progress.js:137,151` show "review due" and link to the lesson file; no review page/mode exists; `SKILL.md:238`.
- Impact: review re-presents the same items next to the explanation that answers them (open-book, not retrieval), with the same options (recognition of remembered option text). No cold retrieval, no rotation, no mixing.
- Recommendation: a `review.html` (§9 Review mode) that renders due objectives' items without lesson prose, interleaved, first attempt counts, explanation after answer, link back to lesson on a miss.
- Complexity: M · Regression risk: L (additive page).

### PED-07 — Interleaving is stated but nowhere implemented · **P1**
- Evidence: `SKILL.md:55` names interleaving; practice is strictly per-lesson (`progress.js:29`, `quiz.js:8`); planner has no cumulative-practice rule (`curriculum-planner/SKILL.md:13`).
- Impact: learners never have to *choose* which concept applies, the discrimination skill interleaving trains (Rohrer & Taylor, 2007, *Instructional Science*; Kornell & Bjork, 2008, *Psychological Science*). Blocked practice also inflates in-lesson accuracy (feeds PED-04).
- Recommendation: (a) from lesson 3 on, ≥1 practice item tagged with an earlier lesson's objective (machine-checkable); (b) review/practice sessions shuffle items across objectives.
- Complexity: S · Regression risk: L.

### PED-08 — Browser practice evidence never reaches the agent · **P1**
- Evidence: `SKILL.md:241` ("Progress lives in `localStorage`"), `docs/GUIDE.md:165`; ZPD reads only learning records (`SKILL.md:302-306`).
- Impact: the agent picks the next lesson without the learner's practice/review performance; adaptive difficulty (§8) is impossible; a lapsed retention can never inform the next lesson.
- Recommendation: dashboard "Export evidence" (copy/download JSONL since last export); agent ingests into `learning-records/evidence.jsonl` + `evidence.md` mirror and regenerates `assets/evidence.js` (agent events, read-only in browser).
- Complexity: M · Regression risk: L.

### PED-09 — Learning records conflate claimed, observed and demonstrated knowledge · **P1**
- Evidence: `LEARNING-RECORD-FORMAT.md:22` (Evidence optional), `:33-34` (demonstrated and disclosed are equal triggers), template `:9-13` has no evidence-type field.
- Impact: "the user knows X" can mean "said so", "answered a chat question", or "passed a graded challenge"; ZPD treats them identically. Agent impressions (model confidence) leak in as learner facts.
- Recommendation: required frontmatter `basis: claim | agent_observation | practice | challenge | retrieval` and `evidence:` (event ids). Only `challenge`/`retrieval` records may raise level ≥ L4 / L5.
- Complexity: S · Regression risk: L.

### PED-10 — Mastered milestones are never re-verified for retention · **P2**
- Evidence: `challenge-reviewer/SKILL.md:19` (mastered once, forever); the reviewer's "plan a cold retrieval in a later session" (`:15`) has no schedule, record or owner.
- Impact: "mastered" conflates "could do it on day N" with "can still do it". No lapse signal.
- Recommendation: on pass, reviewer emits a `retrieval_check` scheduled at +14 days for the milestone objective (Leitner box 3 entry). A failed cold check sets `retention: lapsed` (display flag, milestone *not* relocked — keeps `SKILL.md:239` "no loss mechanics").
- Complexity: S · Regression risk: L.

### PED-11 — Challenge per lesson vs per milestone is inconsistent · **P2**
- Evidence: `SKILL.md:236` ("Each lesson ends with a challenge tied to a mission milestone"), `check.mjs:72` (every lesson must have `#challenge`), vs `curriculum-planner/SKILL.md:13` ("the final lesson of each milestone ends in a transfer challenge"); reviewer masters the milestone on any pass (`challenge-reviewer/SKILL.md:19`).
- Impact: passing an early lesson's small challenge can master a milestone before its later lessons are taught.
- Recommendation: two kinds: `#challenge[data-kind=lesson]` (graded, sets L4 on the lesson objective) and `[data-kind=milestone]` (only on the milestone's final lesson; only it can master the milestone).
- Complexity: S · Regression risk: L.

### PED-12 — Recognition-dominant practice; wrong-answer feedback is non-informative · **P2**
- Evidence: built-ins are MCQ/choice (`quiz.js:2-4`, `diagram.js:14,212-216`); wrong feedback is "Not quite — try again." (`quiz.js:35`); only correct answers show `data-why`.
- Impact: recognition is weaker retrieval than recall; "try again" invites elimination clicking. No misconception diagnosis per distractor.
- Recommendation: `data-why-<n>` per distractor (shown on that choice); new `recall` item type (typed/short answer with `data-accept` list, or self-check reveal recorded as `self_scored`); rubric requires ≥1 recall item per objective.
- Complexity: M · Regression risk: L.

### PED-13 — Faded example grading is exact and case-sensitive · **P2**
- Evidence: `diagram.js:247` (`i.value.trim() === i.dataset.answer`).
- Impact: "Choice" vs "choice" recorded as failure → false-negative evidence that will (after PED-03 fix) drop review boxes.
- Recommendation: normalise (case, whitespace, punctuation) and support `data-accept="a|b"`; lint that answers are normalisable.
- Complexity: S · Regression risk: L.

### PED-14 — No explicit objectives/prerequisite graph · **P2**
- Evidence: lesson has a single `canDo` string (`course.js:12`); prerequisites are implicit ordering (`curriculum-planner/SKILL.md:13`); items untagged.
- Impact: cannot compute per-objective levels, cannot check item–objective alignment (Biggs, 1996, *Higher Education*, constructive alignment), cannot remediate a specific prerequisite.
- Recommendation: `lessons[].objectives: [{id, canDo, type}]`, `lessons[].requires: [objectiveId]`; items carry `data-objective`.
- Complexity: M · Regression risk: M (course.js schema change; keep `canDo` as fallback).

### PED-15 — Agent beliefs are not separated from learner performance · **P2**
- Evidence: `LEARNING-RECORD-FORMAT.md:33` lets the agent record "genuine understanding" from conversation; no confidence field anywhere; `SKILL.md:302-306` ZPD from records.
- Impact: model confidence masquerades as learner evidence.
- Recommendation: `agent_estimate` events with `confidence` (0–1) and rationale; displayed separately ("Teacher's estimate"), never used by the level function or scheduler.
- Complexity: S · Regression risk: L.

### PED-16 — Explain (Quick) mode has no retrieval · **P2**
- Evidence: `SKILL.md:11` (explanation, diagram, example, links; no question).
- Impact: one-off explanations end in consumption only — contradicts `SKILL.md:51-53`.
- Recommendation: end with 2–3 retrieval questions in chat (answer hidden until learner replies). §9.
- Complexity: S · Regression risk: L.

### PED-17 — No remediation loop below threshold in the browser · **P2**
- Evidence: `progress.js:95` ("Look again at the ones you missed").
- Impact: mastery learning needs corrective instruction then a *parallel* re-assessment (Bloom, 1968); here the learner re-sees the same items.
- Recommendation: §8 rules: <60% first-try on an objective ⇒ offer second worked example + a fresh parallel item set (from `data-variant` pool).
- Complexity: M · Regression risk: L.

### PED-18 — Fading is single-step; no self-explanation; no expertise-reversal handling · **P3**
- Evidence: one `.fade` per pattern (`diagram.js:16`), `SKILL.md:142`.
- Impact: missed benefit of gradual fading and self-explanation prompts (Chi et al., 1989, *Cognitive Science*); experienced learners still forced through full worked examples (Kalyuga, Ayres, Chandler & Sweller, 2003, *Educational Psychologist*).
- Recommendation: `.fade[data-step=1..3]` sequence; one "why does this line exist?" prompt per worked example; skip-to-fade when objective ≥ L3 (§8).
- Complexity: S · Regression risk: L.

### PED-19 — Generic practice components are domain-locked to the example course · **P3**
- Evidence: `diagram.js:212` (band quiz prompt hard-codes "Jev returned … confidence"), `diagram.js:18-22` (synthetic confidence explorer).
- Impact: authors of other topics have only MCQ + fade as reusable retrieval; pushes toward recognition (PED-12).
- Recommendation: generic `order-steps`, `label-diagram`, `recall` components (`SKILL.md:141` already asks for them).
- Complexity: M · Regression risk: L.

### PED-20 — Interval list inconsistent across docs · **P3**
- Evidence: `SKILL.md:238` and `progress.js:11` say 1,3,7,14; `progress.js:17` uses 1,3,7,14,30.
- Recommendation: single constant documented once (§6).
- Complexity: S · Regression risk: L.

### PED-21 — No cognitive-load budget that a linter can check · **P3**
- Evidence: `SKILL.md:63` ("short", "working memory is very small") is qualitative.
- Recommendation: heuristic budget: ≤5 new terms (`<dfn>`), ≤1 scene, ≤ ~1,500 words prose, ≤1 objective of type `apply`; flags, not errors.
- Complexity: S · Regression risk: L.

---

## 3. Learning lifecycle mapped to files

| # | Step | Where it lives now | Status |
|---|---|---|---|
| 1 | Objective | `MISSION.md` "Success looks like" (`MISSION-FORMAT.md:13-16`) → milestone `canDo` (`curriculum-planner/SKILL.md:12`) → lesson `canDo` (`course.js:12`) | Present, coarse (PED-14) |
| 2 | Prerequisites | Implicit lesson order (`curriculum-planner/SKILL.md:13`); novice reviewer catches leaks (`novice.md:5`) | **Implicit only** — add `requires` |
| 3 | Gaps | Setup interview, *claimed* knowledge (`SKILL.md:285-292`) | **Missing** — add diagnostic (PED-05) |
| 4 | Curriculum | `curriculum-planner` → `course.js`, `NOTES.md` | Present |
| 5 | Explain | `SKILL.md:105-112,131-204` (first principles, dual coding, scenes) | Present, strong |
| 6 | Demonstrate | Worked examples, minimal reference models (`SKILL.md:114-121,142`), scenes | Present |
| 7 | Practice | `quiz.js`, `diagram.js`, labs (`SKILL.md:328-337`) | Present; recognition-heavy, blocked, one-shot (PED-07/12) |
| 8 | Assess | Formative: self-scored practice. Summative: challenge + `challenge-reviewer` | Present; lesson vs milestone ambiguity (PED-11) |
| 9 | Feedback | `quiz.js:35` (thin on errors); `challenge-reviewer/SKILL.md:17` (strong) | Partial |
| 10 | Schedule review | `progress.js:110-112` | **Mis-specified** (PED-03) and **no review execution** (PED-06) |
| 11 | *(loop)* Evidence → next lesson | ZPD from learning records only | **Broken link** — browser evidence never reaches agent (PED-08) |

Ownership after fix: 1–4 `curriculum-planner` (+ new diagnostic step), 5–7 `lesson-panel`/`learn`, 8–9 `challenge-reviewer` + browser components, 10 `progress.js` (scheduler) + `review.html`, 11 agent ingest of `evidence.jsonl`.

---

## 4. Mastery model

Unit: an **objective** (`lessons[].objectives[].id`, e.g. `l3.o1`; milestone objective `m2`). Levels are **derived** from
the evidence log by a pure function; they are never stored or hand-set. Highest satisfied level wins; L5 and L6 also
require L4 (or L3 for knowledge-only objectives with no challenge).

| Level | Name | Required observable evidence | Who/what may record it | Can NEVER set it |
|---|---|---|---|---|
| L0 | Unknown | — (default) | — | — |
| L1 | Exposure | Lesson rendered (`exposure` event) | Browser | — (exposure is all it means) |
| L2 | Familiarity | ≥2 items on the objective attempted in `lesson`/`practice` context AND first-attempt accuracy ≥ 0.6 (recognition allowed) | Browser (self-scored practice, `grader: auto`) | Opening/scrolling, time on page, watching a scene, attempts after feedback, `claim` |
| L3 | Understanding | ≥1 **recall/generation** item (fade, recall, ordering, label) first-attempt correct AND overall first-attempt accuracy ≥ 0.8 on ≥3 items; OR an agent-graded explain-in-own-words check (`retrieval_check`, `grader: agent`, `outcome: correct`) | Browser (recall items) or agent | MCQ-only performance, toast completion, `claim`, `agent_estimate` |
| L4 | Independent application | `challenge_review` with **all** criteria `met`, learner's own material, not synthetic | Agent via `challenge-reviewer` only | Any browser event, self-assessment, quiz %, `fake`-mode lab output |
| L5 | Retention | After L3/L4: a `review`/`retrieval_check` pass where the gap since the previous successful evidence on that objective is ≥ 7 days, taken cold (no lesson content shown) | Browser `review.html` (recall items only) or agent cold check | Lesson-page re-answers (`context: lesson`), early reviews, MCQ-only review sets |
| L6 | Transfer | `challenge_review` all `met` on a task whose context differs from every practice item/earlier challenge (reviewer asserts `transfer: true` with a one-line justification of the new context, e.g. different data, domain or tool) | Agent only | Anything automatic |

Retention status (separate flag, can go down): `retained` (last scheduled review passed) | `due` | `lapsed` (last
scheduled review failed). A lapse never deletes L4/L6 history and never relocks a milestone; the dashboard shows
"Lapsed — review due".

**Learner performance vs model confidence.** Levels use only `attempt`, `review`, `retrieval_check`,
`challenge_review` events. `agent_estimate {confidence, rationale}` and `claim {depth}` are shown in a separate
"Teacher's notes / You said" column and used only as *placement priors* (which diagnostic items to ask first), never
in the level function, the scheduler or XP. Show evidence counts next to every level ("L3 · 5 attempts, 1 recall")
so a thin basis is visible.

---

## 5. LearningEvidence event (append-only)

```jsonc
{
  "v": 1,
  "id": "e_lq3x9k_7f2a",          // `e_${Date.now().toString(36)}_${rand4}`; globally unique, dedupe key
  "at": "2026-11-24T10:02:11.512Z",
  "course": "topic-slug",
  "kind": "exposure|attempt|review_session|retrieval_check|challenge_review|claim|agent_estimate|schedule|migration",
  "source": "browser|agent|learner|migration",
  "context": "diagnostic|lesson|practice|review|challenge|chat",
  "lesson": 3, "objective": "l3.o1", "milestone": "m2",   // nullable
  "item": "l3-q-threshold", "itemType": "mcq|recall|fade|order|label|band|explorer|custom|explain|challenge",
  "itemVersion": "a1b2c3",        // short hash of stem+answer; new version = new history
  "session": "s_lq3x8z",          // page-load or review-session id
  "attemptInSession": 1,          // only attemptInSession==1 counts as first try
  "firstEver": true,              // first attempt on this item+version in any session (derived at write time)
  "outcome": "correct|incorrect|met|not_met|unverifiable|n/a",
  "score": 1,                     // 0..1 optional (fade: blanks correct / blanks)
  "grader": "auto|self|agent",    // self = learner self-check reveal
  "assisted": false,              // hint, answer shown, or worked example visible (review mode: false required)
  "criteria": [{ "id": "c1", "result": "met", "quote": "..." }],   // challenge_review only
  "transfer": false,              // challenge_review only (L6)
  "confidence": null,             // agent_estimate only, 0..1
  "ref": "LR-0004",               // learning record / lab results file
  "note": ""
}
```

Storage: `localStorage["learn:<course>:events:v1"]` = JSON array, append-only (writes only `push`; no edit/delete API).
Agent-authored events live in `learning-records/evidence.jsonl` and are compiled to `assets/evidence.js`
(`window.EVIDENCE = [...]`); browser merges both, dedupes by `id`. Derived state (levels, boxes, XP) is recomputed on
load. Quota guard: if >2,000 events, collapse `exposure` events older than 90 days into one count event; never compact
attempts.

Human-readable mirror `learning-records/evidence.md` (agent regenerates on ingest/review):
```
| when (UTC)       | objective | kind            | context | result        | basis       | ref     |
| 2026-11-24 10:02 | l3.o1     | attempt (mcq)   | lesson  | ✗ first try   | auto        |         |
| 2026-12-01 09:15 | l3.o1     | review session  | review  | 3/3 → box 2   | auto        |         |
| 2026-12-03 18:40 | m2        | challenge       | chat    | 3/3 met       | agent       | LR-0004 |
```

**Migration from `learn:<id>` v0** (`{xp, answers{"L<n>:<id>":{ok,at}}, lessons{n:{stage,last}}}`):
1. Copy v0 to `learn:<id>:legacy-v0` untouched (rollback).
2. Each `answers` entry → `attempt`, `source:"migration"`, `context:"lesson"`, `lesson:n`, `item:"<id>"`,
   `outcome: ok?correct:incorrect`, `at`, `firstEver: null` (unknowable — overwritten), `itemVersion: "legacy"`.
   Legacy attempts may count toward L2 only (not L3+), because their first-try status is unknown.
3. Each `lessons[n]` → `schedule` event `{lesson:n, box: min(stage,2), due: last + I[min(stage,2)], note:"legacy stage capped: v0 advanced on failures"}`.
4. `xp` → `migration` event `{legacyXp}`; displayed XP = max(legacyXp, recomputed) so no visible loss.
5. `course.js` milestones with `status:'mastered'` + `evidence:'LR-NNNN'` → agent writes `challenge_review` events
   (`source:"migration"`, all criteria `met`, `ref`). Learning records about prior knowledge → `claim` events.
6. Write `learn:<id>:migrated = 1`; v0 key is no longer written.

---

## 6. Review scheduling rule (Leitner, 5 boxes)

Card = objective. Intervals `I = [—, 1, 3, 7, 14, 30]` days for boxes 1–5. State = `{box, due}`, recomputed by replaying
events in time order.

1. **Entry**: when every practice item on the objective has ≥1 first attempt, card enters box 1, `due = completion + 1d`.
   A `challenge_review` pass enters/raises it to box 3 (`due = +7d`); the cold check at +14d (PED-10) is scheduled
   by setting `due` explicitly via a `schedule` event.
2. **What counts**: only `review_session` (browser `review.html`, unassisted) and `retrieval_check` (agent cold check).
   Lesson-page attempts never move boxes.
3. **A session on a card**: ≥2 items from that objective (prefer recall types and items not used last time); only
   `attemptInSession==1` counts. **Pass** iff first-attempt correct ≥ 80% (with 2 items: both).
4. **Pass on/after due**: `box = min(box+1, 5)`, `due = now + I[box]`.
5. **Pass before due**: logged; box and due unchanged ("early reviews don't count toward spacing").
6. **Fail (any time)**: `box = 1`, `due = now + 1d`, retention flag `lapsed` until next pass.
7. Overdue gives no bonus or penalty: the box only changes on a graded outcome.
8. Each change produces an explanation string: `"Nov 24: 1/3 correct → back to box 1, due Nov 25"`.
9. Dashboard shows at most 10 due cards per day, ordered by days overdue ÷ interval; a review session mixes all
   selected cards' items, shuffled (interleaving).

**Why Leitner over SM-2**: SM-2 (Woźniak, SuperMemo, ~1990) updates a per-item ease factor from a 0–5 self-rated recall
quality. That (a) reintroduces self-assessment the system is trying not to trust, (b) compounds ease changes so an
interval is hard to explain to the learner, and (c) is designed for large flashcard decks with many reviews per card,
while a course has tens of objectives and a handful of reviews each, too little data to calibrate an ease factor
or to fit a forgetting model (FSRS, half-life regression). Leitner's state is one integer driven by binary graded
outcomes, every interval is explainable in one sentence, and it makes no claim to model forgetting — it only
schedules the next *test*, whose result is the evidence. The spacing benefit itself is well established
(Cepeda, Pashler, Vul, Wixted & Rohrer, 2006, *Psychological Bulletin*); the exact intervals are a design choice,
not a research constant, and should be documented as such.

---

## 7. Rubrics (M = machine-checkable from HTML/`course.js`; R = reviewer/LLM)

### 7a. Curriculum-generation rubric (curriculum-planner output)
| ID | Check | M/R |
|---|---|---|
| CR-1 | Milestone count == "Success looks like" bullet count in `MISSION.md`; every milestone id referenced by ≥1 lesson | M |
| CR-2 | Every `lessons[].milestones[]` id exists; lessons numbered 1..N contiguously; `file` matches `lessons/\d{4}-[a-z0-9-]+\.html` | M |
| CR-3 | Every lesson has 1–3 `objectives`; each `canDo` starts with an observable verb and contains none of: understand, know, learn, appreciate, be aware, be familiar | M |
| CR-4 | `requires` references only objectives of lower-numbered lessons (or diagnostic-verified ones); graph is acyclic | M |
| CR-5 | Exactly one milestone challenge per milestone, on its last lesson (`data-kind="milestone"`) | M |
| CR-6 | Title heuristic: lesson title contains "and" at most once | M |
| CR-7 | Sequence starts at the floor established by **diagnostic evidence**, not claims; test-out-eligible lessons marked | R |
| CR-8 | From lesson 3 on, each lesson plans ≥1 interleaved item from an earlier objective | M (after authoring, via `data-objective`) |
| CR-9 | Each lesson has a motion decision and (hands-on) a lab decision in `NOTES.md` | M (line per lesson) |
| CR-10 | Out-of-scope list not represented in any milestone/lesson; each lesson traces to the mission | R |
| CR-11 | One idea per lesson; scope fits one sitting | R |

### 7b. Lesson & assessment rubric (lesson-panel / linter)
| ID | Check | M/R |
|---|---|---|
| AS-1 | Every practice root has unique `data-id` and a `data-objective` that exists in `course.js` | M |
| AS-2 | Each objective has ≥3 practice items in lesson+pool, ≥1 non-MCQ (recall/fade/order/label) | M |
| AS-3 | MCQ: 3–5 options; `data-answer` equals exactly one option's trimmed text; no "all/none of the above" | M |
| AS-4 | MCQ option lengths within ±25% characters of their mean (`SKILL.md:339`) | M |
| AS-5 | Every MCQ has `data-why`; ≥50% of distractors have `data-why-<n>` | M |
| AS-6 | Fade/recall answers normalisable; alternatives in `data-accept` | M |
| AS-7 | Worked example (`.worked[data-objective]`) precedes a `.fade` on the same objective in DOM order | M |
| AS-8 | Item stem n-gram overlap with lesson prose < threshold (not answerable by string matching the page) | M (heuristic flag) |
| AS-9 | Distractors encode real misconceptions; each item tests its objective, not page trivia | R |
| AS-10 | Novice cannot answer from wording/length cues (`novice.md:15`) | R |
| AS-11 | `#challenge` has task, send-back, 2–4 criteria as `<li>` in `.criteria` | M |
| AS-12 | No criterion uses the CR-3 verb denylist or evaluative-only words ("good", "clean", "well") | M |
| AS-13 | Each criterion names an observable artifact/number/behaviour; criteria jointly cover the `canDo` | R |
| AS-14 | Challenge context differs from practice context (transfer) and uses the learner's material | R |
| AS-15 | Load budget: ≤5 `<dfn>`, ≤1 scene, prose ≤ ~1,500 words (flags) | M |
| AS-16 | Every worked example has one self-explanation prompt ("why this line?") | R |

---

## 8. Adaptive difficulty (deterministic, evidence-only)

Inputs: per-objective level, first-attempt accuracy (last 5 first attempts, `lesson|practice|review` context), retention
flag, last challenge result. Never adapt on time-on-page, scroll, or self-rated confidence.

| Signal | Action |
|---|---|
| Diagnostic ≥ L3 on all objectives of lesson k | Offer test-out: skip to faded example + challenge (learner chooses) |
| In-lesson first-attempt accuracy on an objective < 0.6 after ≥3 items | Show second worked example (different surface), then a parallel item set (`data-variant`); do not unlock the faded-only path |
| 0.6–0.85 | Proceed as designed |
| > 0.85 with ≥1 recall item correct | Show "challenge-ready"; offer one harder application item; fade more steps next time (expertise reversal) |
| Prerequisite objective `lapsed` or < L3 when next lesson starts | Agent inserts a short review session on it before teaching |
| Challenge criteria `not_met` | Next session targets only those criteria: one worked example + 2 practice items per gap, then resubmission (no new content) |
| Two consecutive review fails on a card | Flag for agent: re-teach (new explanation/model), not just re-test |
| Fade steps | Blanks per worked pattern = 1 at L1–L2, ~half at L3, full problem at ≥L3 with accuracy > 0.85 |

The 0.6/0.85 band is a design choice (keep practice effortful but mostly successful), not a cited constant.

---

## 9. Mode definitions (minimum contents)

| Mode | Trigger | Must contain | Evidence written |
|---|---|---|---|
| **Quick Learn** (current Explain, `SKILL.md:11`) | One-off "how does X work?", no `MISSION.md` | Problem/why; one mental model + where it breaks; ASCII diagram; minimal annotated example; **2–3 retrieval questions, answers withheld until the learner replies**; 2–3 verified links; offer to deepen | None (no files) |
| **Deep Learn** (new) | "Teach me X properly" without a long-term mission | One lesson HTML + `course.js` with a single objective set: 2-item pretest, explanation with diagram, worked → faded example, ≥4 practice items (≥1 recall), one self-checked transfer task with criteria, Go deeper; offer upgrade to Course | Browser events (lesson context) |
| **Course** (current) | `/learn`, `MISSION.md` exists | Interview → **diagnostic** → plan (objectives, requires) → lessons per rubric → challenges → reviewer → review schedule | Full log + learning records |
| **Practice** (new) | "Give me practice", or §8 remediation | ≥6 items, ≥2 objectives interleaved (weakest first), ≥50% recall/application, immediate per-item explanation; no new teaching content; may generate fresh variants | `attempt` events, `context: practice` (L2/L3 only; never moves review boxes) |
| **Review** (new `review.html`) | Cards due | Only due cards (≤10); ≥2 items per card, rotated, recall preferred; lesson prose hidden until after answer; interleaved; first attempt counts; explanation after; on miss link back to lesson section | `review_session` events → Leitner boxes, L5 |

---

## 10. Suggested implementation order

1. PED-01/02/03 (event log, stable ids, Leitner rule) — fixes correctness of every number on the dashboard.
2. PED-04/20 (labels, constants) — cheap, removes false capability claims.
3. PED-06/07/12 (review page, interleaving, recall items + distractor feedback).
4. PED-14/09/15/11 (objectives schema, record basis, agent estimates, challenge kinds).
5. PED-05/08/10 (diagnostic, evidence export/ingest, milestone cold checks).
6. PED-16–19/21 (Quick Learn retrieval, remediation, fading steps, generic components, load budget).
