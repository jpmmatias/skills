# 02 — AI Engineering & Agent Architecture audit

Scope: `skills/learn/SKILL.md` (369 lines, 34.3 KB), the formats beside it, `curriculum-planner`, `source-researcher`, `lesson-panel` (+ `agents/*.md`), `challenge-reviewer`, `.claude-plugin/marketplace.json`, `README.md`. `starter/tools/check.mjs` was read only for the implicit contract. Read-only audit.

Already known, not re-reported: (a) "lesson markup contract" undefined; (b) `learn/SKILL.md` loaded whole for explain mode; (c) check paths hardcoded to `~/.claude/skills/learn`.

Token figures are estimates: ~4 bytes/token for prose, ~3.5 for code/CSS.

## Findings

### AI-01 — Lesson panel gives no independent review when one agent plays every role
- **Severity:** P1
- **Evidence:** `lesson-panel/SKILL.md:9` "Read the role, then do that role."; `:15` "run the expert, the novice, and the flow at the same time."; `agents/novice.md:3` "You know only what the previous lesson taught."; `agents/*.md` have no frontmatter (no `name`, `description`, `tools`, `model`), so Claude Code cannot register them as subagents. They also sit under a skill folder, not a plugin-level `agents/` directory.
- **Impact:** In practice the orchestrator that just wrote the lesson reads `novice.md` and "pretends" not to know the subject. The author's context already holds the intended meaning, so gaps stay invisible, and the "novice" approves what it wrote itself. "At the same time" cannot happen in one context. The four-agent claim in the README (`:13`, `:27`) is not what actually runs. The result is a cost of roughly 3×, with an independence that is mostly cosmetic.
- **Fix:** Ship the reviewers as native plugin subagents (`agents/lesson-expert.md` and the others at plugin root), each with frontmatter, a fresh context and restricted tools. The novice gets `Read, Glob, Write` and no `WebFetch`/`WebSearch`, and only the paths it may read. The expert gets `Read, Grep, WebFetch, Write`. The flow reviewer gets `Read, Glob, Bash(node …check.mjs)`, `Write`. Keep the prompt bodies as the single source and generate both forms from them. Where subagents do not exist (other agents installed via skills.sh), run the roles sequentially and stamp `independence: self` in every review file (see the contracts below). Fast/Balanced profiles then avoid paying for fake independence.
- **Complexity:** M
- **Regression risk:** Medium. The subagent prompts must stay identical to the prompt files.

### AI-02 — The REVISE loop has no round cap, no severity threshold and no tie-break
- **Severity:** P1
- **Evidence:** `lesson-panel/SKILL.md:16` "If any verdict is `REVISE` … repeat from step 2 on the same lesson."; `:17` "Stop when all three verdicts are `APPROVE`." The roles' asks can pull against each other: `expert.md:15` "Name scope errors: ideas that belong in a later lesson" versus `novice.md:15` "report words used before they were defined" (the expert says cut X, the novice says define X).
- **Impact:** The loop can run forever or oscillate. Each extra round costs ~80–100k tokens (see Context cost). No path hands a disagreement to the learner.
- **Fix:** Cap rounds per profile (Balanced 2, Deep 3). Only `blocker`/`major` items may produce REVISE. Resolve conflicts by precedence: truth (expert) > comprehension (novice) > sequence (flow). After the cap, or on an unresolved conflict, write `escalation.md` and ask the learner one question (see the contracts below).
- **Complexity:** S
- **Regression risk:** Low.

### AI-03 — Handoff files are unversioned: stale approvals and reviewers racing a half-written draft
- **Severity:** P1
- **Evidence:** `lesson-panel/SKILL.md:19` "three `APPROVE` files exist for this draft"; `:23` "They start after the author note exists."; `author.md:11` "write `.review/<slug>-author-done.md` last". Nothing deletes or versions round-N files.
- **Impact:**
  - In round 2, `author-done.md` from round 1 is still on disk while the author edits, so the "ready" signal is already true.
  - A reviewer that crashes in round 2 leaves its round-1 `APPROVE` behind, and completion passes on a draft nobody reviewed.
  - "this draft" is not checkable.
- **Fix:** Use per-round files `.review/<slug>/r<N>-<role>.md`. Each carries `round` and `content_sha256` (lesson HTML plus scenes file). A review counts only if `reviewed_sha256` equals the author's hash for that round. `state.md` owns the status.
- **Complexity:** S
- **Regression risk:** Low.

### AI-04 — Verdict files are free text, so the author cannot trace or close items
- **Severity:** P1
- **Evidence:** `expert.md:9-11`, `novice.md:9-11` and `flow.md:9-11` define only `Verdict: APPROVE or REVISE`, then prose. `author.md:11` asks the author to "List each review note and the change you made", but notes have no IDs. `author.md:9` "Apply an `APPROVE` note only when this pass was started to fix a `REVISE`" is the only severity rule.
- **Impact:**
  - Items cannot be matched between rounds.
  - Nobody can verify that every REVISE item was addressed.
  - No machine-checkable completion.
  - Polish notes and errors that would mislead the learner carry the same weight.
- **Fix:** Use YAML frontmatter with `items[]` (`id`, `severity`, `location`, `quote`, `problem`, `fix`). The author's file lists `addressed[]` by item id with `fixed|declined` plus a reason. Schemas are below.
- **Complexity:** S
- **Regression risk:** Low.

### AI-05 — Three conflicting rules for "which lesson is next", and the panel breaks on courses built by `learn`
- **Severity:** P1
- **Evidence:**
  - `learn/SKILL.md:228` "Use what the review revealed to pick the next lesson (zone of proximal development)" and `:302-306` (ZPD from records).
  - `lesson-panel/SKILL.md:13` "the first entry in `assets/course.js` whose file is missing".
  - `curriculum-planner/SKILL.md:15` "a missing file is how the author finds the next lesson".
  - `challenge-reviewer/SKILL.md:20` "Then say which lesson comes next." (no rule given).
  - `learn/SKILL.md:212` "Update it whenever a lesson is added", so a course built by `learn` alone lists only written lessons.
- **Impact:**
  - On a `learn`-built course, panel step 1 finds no missing file and its behavior is undefined.
  - The challenge reviewer may announce a lesson that the panel then does not pick.
  - The panel has no precondition check: no plan, no `NOTES.md` motion decision (`author.md:5` "Obey … the motion decision for this lesson in `NOTES.md`"), no `RESOURCES.md` block.
- **Fix:** Make one rule, in `workflows/continue-course.md`: `course.js` order is the plan, and a ZPD reorder happens only through a re-plan (planner rule `:25`) with a NOTES line. Give every workflow a **Preconditions** block that routes to the producing workflow when an input is missing. Do not improvise around it.
- **Complexity:** M
- **Regression risk:** Medium. This changes `learn`'s incremental behavior.

### AI-06 — Challenge review is duplicated, the copies diverge, and both skills trigger on the same input
- **Severity:** P1
- **Evidence:**
  - `learn/SKILL.md:215-228` has its own 4-step review with a binary met/missing outcome.
  - `challenge-reviewer/SKILL.md:15` adds `unverifiable`, recomputation, synthetic-output rejection and the "pasted or generated" check.
  - `:27` "If the challenge asked for their data and they sent the lesson's data, that criterion is `not met`" is absent from `learn`.
  - `:20` adds a NOTES line.
  - Both descriptions match "learner sends work back": `learn` (`:3` "learn a topic over several sessions") and `challenge-reviewer` (`:3`).
- **Impact:** Whichever skill loads decides the milestone gate, so mastery depends on routing. The weaker copy in `learn` can pass work that `challenge-reviewer` rejects. When both load, ~9.4k tokens are spent for one review.
- **Fix:** Keep one source, `learn/workflows/review-challenge.md`, holding the `challenge-reviewer` content. `learn`'s router points to it. `challenge-reviewer/SKILL.md` becomes a thin trigger wrapper that loads the same file (see AI-08 for path resolution).
- **Complexity:** M
- **Regression risk:** Low.

### AI-07 — Paraphrase drift between `learn` and the pipeline skills
- **Severity:** P2
- **Evidence:**
  - **Motion rule:** `learn:77-91` has four build criteria and four skip criteria. `curriculum-planner:14` reduces it to "`scene` when the idea is a process over time or a hidden mechanism". That drops "cause → effect", "then… then…" and the skip rule "can't ground it in real data".
  - **Link count:** `learn:11` "2–3 verified links" (explain) versus `learn:97` "2–5 curated links" (lessons).
  - **Required lesson elements:** spread over `learn:63-71`, `:141-142`, `:217-221` and `:339`, restated differently in `author.md:7`.
  - **Source rules:** in `learn:95-103` and `source-researcher:14-16,25-29`.
- **Impact:** Each copy is a separate prompt the model may follow, so planner and author decisions diverge from `learn`'s, and fixes land in one copy only.
- **Fix:** Keep one reference file per rule (motion, sources, lesson contract). Pipeline skills link to it and do not restate it (split below).
- **Complexity:** S
- **Regression risk:** Low.

### AI-08 — Pipeline skills fail when installed without `learn`, and even with it the paths are unresolvable
- **Severity:** P1
- **Evidence:**
  - `curriculum-planner:11` "run the setup interview from the `learn` skill"; `:15` "from the starter template in the `learn` skill".
  - `source-researcher:16` "following `RESOURCES-FORMAT.md` in the `learn` skill".
  - `challenge-reviewer:18` "following `LEARNING-RECORD-FORMAT.md` in the `learn` skill".
  - `lesson-panel:7` "Follow the `learn` skill for how a lesson is built."
  - `README.md:16-22` advertises installing each one alone (`--skill curriculum-planner`).
  - `marketplace.json:21-63` defines five separate plugins with no dependency.
- **Impact:**
  - With `npx skills add --skill curriculum-planner`, only that folder is copied. The template, formats and setup interview do not exist, and the agent improvises the `course.js` schema.
  - With the plugin, the files exist in the plugin cache, but no skill names `${CLAUDE_PLUGIN_ROOT}`, so the agent searches the filesystem or guesses.
  - The plugin-namespaced name is `learn:learn`, not `learn`.
- **Fix:**
  - Ship one plugin, `learnkit`, with all five skills plus `agents/`.
  - Each pipeline skill gets a **Requires** preflight. It resolves `$CLAUDE_PLUGIN_ROOT/skills/learn`, then `~/.claude/skills/learn`, then `./.claude/skills/learn`. On failure it stops with an install line and does not improvise.
  - The README stops presenting pipeline skills as standalone installs.
- **Complexity:** M
- **Regression risk:** Low. This is a packaging change.

### AI-09 — Nothing says what to do when web fetch is unavailable, which invites fabricated links
- **Severity:** P1
- **Evidence:**
  - `learn:11` "2–3 verified links".
  - `learn:103` "Never link anything you haven't confirmed exists: search for it and fetch the page first."
  - `source-researcher:21` "every link in that block was opened during this session".
  - `author.md:7` "a Go deeper list whose URLs you have fetched".
  - No skill mentions offline mode, denied permission or a 403.
- **Impact:** Offline or with `WebFetch` denied, every path is blocked by a hard rule that has no exit. The model either stalls or quietly breaks the rule (links "from memory"), which is the exact failure `source-researcher:25` names. Explain mode is not usable offline.
- **Fix:** An offline spec in `references/failure-handling.md`:
  - Write no URLs.
  - Name the source (title and author) as "unverified — search for: …".
  - Add a `## Gaps` entry with `reason: offline`.
  - Set `sources: pending` in state, so the next online session runs research first.
- **Complexity:** S
- **Regression risk:** Low.

### AI-10 — Verification is not wired into the panel, the fix loop is uncapped, and the install has no consent step
- **Severity:** P2
- **Evidence:**
  - `learn:264` has the only fallback: "If the check can't run (no browser available), say so".
  - `lesson-panel/SKILL.md` and `author.md` never mention the check.
  - `learn:260` runs `npm install` (Playwright plus its browser) with no consent step.
  - `check.mjs:78-86` screenshots every `figure, .box, .stepper, .quiz-q, .fade`, plus five frames per scene, for every page unless `--only` is passed.
  - `learn:264` "**Look at the screenshots**".
- **Impact:**
  - Panel lessons ship without checks.
  - A fix → re-check loop has no cap.
  - On continue, the default run rescreenshots the whole course, and "look at them" makes the image-token cost grow with the course: ~15–30k per lesson, all lessons each time.
- **Fix:**
  - The author runs `check.mjs --only=NNNN` and records `check: pass|fail|skipped` plus a reason in its handoff.
  - Allow at most 2 fix passes.
  - Look only at scene frames 55% and 100% and any element flagged with a problem.
  - Ask once before installing.
  - Fall back to a static contract lint (grep for `data-lesson`, `#progress`, `#challenge`, practice selectors).
- **Complexity:** S
- **Regression risk:** Low.

### AI-11 — Mode routing keys on file presence, not intent
- **Severity:** P2
- **Evidence:**
  - `learn:11` explain mode applies only with "no `MISSION.md` in the current directory".
  - `learn:12` course mode applies when "a `MISSION.md` already exists here".
  - `learn:14` says "Visual Breakdowns" applies to explain mode, but it is an H3 under "Visual Design (Evidence-Based)" (`:131`), and that parent's rules (SVG, retrieval exercise) cannot apply in a terminal.
- **Impact:** A quick question asked inside a course folder triggers the full course path: interview, lessons and files. That is the costliest path for the smallest request.
- **Fix:** Route by intent first (a question gets explain; a learning request or `/learn` gets course), then by workspace state. Explain mode inside a course should read `GLOSSARY.md` only.
- **Complexity:** S
- **Regression risk:** Low.

### AI-12 — Contradictions in the setup interview and the formats
- **Severity:** P2
- **Evidence:**
  - **Question count:** `learn:285` "at most four structured questions" covers Why, Starting point, Environment and Language (`:287-290`). Theme is a fifth topic: `learn:272` "(one question, it can go in the setup interview)".
  - **Evidence section:** `LEARNING-RECORD-FORMAT.md:82` "That is the whole format", with Evidence optional at `:90`. But `learn:213`, `learn:226` and `challenge-reviewer:18` make an **Evidence** section the mastery gate.
  - **Record IDs:** `evidence: 'LR-0003'` (`learn:226`) is never mapped to the filename `0003-slug.md` (`learn:23`).
  - **Mission edits:** `MISSION-FORMAT.md:30` "When the user's goal moves, update this file" omits `learn:296` "Confirm with the user before changing the mission."
- **Impact:** The interview overflows its own cap. Records written to the format do not satisfy the gate. Evidence IDs are ambiguous.
- **Fix:**
  - Infer theme and language and confirm only if ambiguous.
  - In the format, state that Evidence is required when a record unlocks a milestone.
  - Define `LR-NNNN` as the record whose filename starts with `NNNN-`.
  - Add the confirmation step to `MISSION-FORMAT.md`.
- **Complexity:** S
- **Regression risk:** Low.

### AI-13 — The skill tells the agent to write into its own installed directory
- **Severity:** P2
- **Evidence:** `learn:249` "When you improve a component in a workspace, consider copying it back into the starter kit."; `docs/GUIDE.md:206`.
- **Impact:**
  - A plugin install writes into the plugin cache, which the next update overwrites.
  - A global install has one course silently change the assets of every future course.
  - The agent edits its own instructions and assets without review, which is a supply-chain-style self-modification.
- **Fix:** Never write under the skill root. Propose the improvement as a diff in `NOTES.md` or `.learnkit/upstream/` for the maintainer.
- **Complexity:** S
- **Regression risk:** Low.

### AI-14 — `RESOURCES.md` has two writers, a structure not in its format, and triple fetching
- **Severity:** P2
- **Evidence:**
  - `author.md:7` "Record new links in `RESOURCES.md`", while `source-researcher:7` "a link that is not here is a link the author must stop and fetch".
  - `source-researcher:16` requires `### Lesson N — <title>` blocks, a verification date and "**Primary source for LN**". None of these is in `RESOURCES-FORMAT.md:38-58`, which shows a flat list.
  - `expert.md:5` "Confirm each citation supports the sentence" means a third fetch of the same URLs.
- **Impact:** Ownership conflicts. The format the researcher writes is undocumented, so other roles cannot parse it. Fetch cost and latency triple.
- **Fix:**
  - The researcher is the only writer.
  - The author may only cite entries by id (`R12`). A new link goes into a `sources-request` list in its handoff.
  - Add entry ids and `verified: YYYY-MM-DD` to the format.
  - The expert spot-checks citations against the researcher's recorded passage, re-fetching at most 2 by default.
- **Complexity:** S
- **Regression risk:** Low.

### AI-15 — Every author pass reads all of `assets/` (~18k tokens)
- **Severity:** P2
- **Evidence:** `learn:247` "Before authoring a lesson, read `./assets/`"; `author.md:5` "and `assets/`". The starter assets total 64.4 KB (`style.css` 21.6 KB, `diagram.js` 19.9 KB, `scene.js` 11.5 KB, `progress.js` 8.7 KB). `learn:249` "Each file's header documents its API."
- **Impact:** About 18k tokens of mostly irrelevant CSS/JS on every lesson and every revision round. It crowds out the lesson's own context.
- **Fix:** Use `references/components.md`, an API index of about 1.5k tokens built from the file headers, and read a full file only when extending that component.
- **Complexity:** S
- **Regression risk:** Low.

### AI-16 — No execution profiles or budgets, and research is open-ended
- **Severity:** P2
- **Evidence:**
  - `source-researcher:14` "at least one candidate per claim, and a candidate for each medium", with no upper bound.
  - `lesson-panel` always uses 4 roles.
  - `learn:40` "Before the `RESOURCES.md` is well-populated, your focus should be to find high-quality resources" (undefined threshold).
  - There is no profile, effort or budget concept anywhere.
- **Impact:** Every "continue" pays full cost. Users have no fast path, and research time is unpredictable.
- **Fix:** Add Fast/Balanced/Deep profiles with explicit fetch, round and agent caps (see Execution profiles).
- **Complexity:** M
- **Regression risk:** Low.

### AI-17 — Misplaced or ambiguous instructions in `learn/SKILL.md`
- **Severity:** P3
- **Evidence:**
  - **Misplaced quiz rule:** `:339` "each answer should be exactly the same number of words" sits under `### Labs`, so it is missed when authoring quizzes.
  - **Browser side effect:** `:65` "If possible, open the lesson file for the user by running a CLI command" runs on every panel round or subagent pass.
  - **Flexible vs. required structure:** `:125-128` "Avoid rigid multi-phase templates … required elements … can sit wherever" conflicts with `check.mjs:62-72`, which fails a lesson without `body[data-lesson]`, `#progress.pg-header`, `#challenge` and a practice selector. That list is the de facto contract behind known issue (a).
- **Fix:**
  - Move the quiz rule into the lesson contract.
  - Open the lesson only once, at final delivery, from the orchestrator.
  - State that structure is flexible and these four hooks are required.
- **Complexity:** S
- **Regression risk:** Low.

### AI-18 — The pipeline loses `learn` duties: glossary promotion and the theme
- **Severity:** P3
- **Evidence:**
  - **Glossary:** `learn:365` "Promote a term … typically in challenge work or while you write a learning record." `challenge-reviewer` writes records but never touches `GLOSSARY.md`.
  - **Theme:** no pipeline skill handles the theme, and the author's reading list (`author.md:5`) omits `GLOSSARY.md` despite `learn:365` "every lesson … uses its terms".
- **Impact:** Pipeline-built courses never grow a glossary, and lessons drift in terminology.
- **Fix:** Add glossary promotion as step 6b of `review-challenge`, and `GLOSSARY.md` to the author's and novice's inputs.
- **Complexity:** S
- **Regression risk:** Low.

## Context cost per invocation path

The table shows today's figures and the estimated figures after the split, in Balanced. Always-on skill descriptions add ~0.6k (5 skills).

| Path | Today (est.) | Main contributors today | After split (est.) |
|---|---|---|---|
| Explain mode | 12–16k | `SKILL.md` 8.5k + 2–3 search/fetch 3–6k | 4–8k (router 1.2k + `explain.md` 1k + `teaching-core.md` 1.5k + fetches) |
| New course (interview, plan, lesson 1, check) | 60–90k, 1 agent | `SKILL.md` 8.5k, formats 3.2k, `assets/` 18k, scene example 2.7k, 5–10 fetches 5–10k, output 8–12k, screenshots 15–30k | 35–50k |
| Continue course | 50–80k, growing with course size | `SKILL.md` 8.5k, state 8–15k (NOTES, RESOURCES, records, `course.js`, previous lesson), `assets/` 18k, output 8–12k, full-course screenshots | 30–45k, flat |
| Panel, round 1 | 110–140k across 4 contexts | orchestrator ~9k (`learn` + panel); author 45–60k; reviewers 15–25k each (lesson 6–8k, scene 3k, previous lesson 6k, notes; expert re-fetches 3–8k) | Balanced 60–80k (2 reviewers); Deep 110–130k |
| Each extra round | +80–100k, uncapped | author revision 30–40k + 3 reviewers | capped: Balanced ≤ 1 extra, Deep ≤ 2 |
| Panel with one agent playing all roles | 130k+ in one context; compaction risk by round 2 | — | not offered; degrades to Fast + `independence: self` |
| Challenge review | 12–40k (~21–49k if `learn` also loads) | `challenge-reviewer` 0.9k, lesson 6–8k, evidence 2–20k, LR format 0.7k, `course.js`/NOTES 2k | 10–30k |

## Proposal 1 — Progressive-disclosure split of `learn`

Target: a router `SKILL.md` of ≤ 100 lines (~1.2k tokens) that names the workflow to load. Workflows carry steps, preconditions, outputs and caps. References carry principles and specs, loaded on demand. Format files stay where they are, at `skills/learn/*-FORMAT.md`, because pipeline skills, the README (`:158`) and the GUIDE (`:190`) link them there.

| New file | Content moved from `learn/SKILL.md` | Loaded when |
|---|---|---|
| `SKILL.md` (router) | `:7-14` modes, rewritten intent-first (AI-11); `:16-30` workspace map as a one-line-per-file table with owner/writer; 6–8 invariants (fetched links only; milestones are evidence-gated; one idea per lesson; `course.js` is the source of truth; course language; never write under the skill root); profile selection; table of contents | always |
| `workflows/explain.md` | `:11`; the explain-relevant core of `:105-129`; the ASCII diagram `:160-168`; offline fallback | explain |
| `workflows/new-course.md` | `:277-296` mission and setup interview (fixed to 4 questions, AI-12); `:266-275` theme selection; starter copy `:249`; then hands off to plan | new workspace |
| `workflows/plan-course.md` | single source of the current `curriculum-planner` steps, plus a pointer to `references/motion.md#decide` | no plan, or re-plan |
| `workflows/continue-course.md` | `:298-306` ZPD; the one next-lesson rule (AI-05); the per-profile pipeline | `/learn` in an existing course |
| `workflows/research-sources.md` | single source of the current `source-researcher` steps; `:95-103` | lesson without a sources block |
| `workflows/write-lesson.md` | `:57-71` lessons; `:243-253` assets reuse; `:255-264` verify; the current `author.md` body | authoring |
| `workflows/review-panel.md` | the current `lesson-panel` loop, plus the contracts and caps below | Balanced/Deep review |
| `workflows/review-challenge.md` | `:215-228` merged into the current `challenge-reviewer` steps (AI-06); glossary promotion (AI-18) | learner submits work |
| `references/teaching-core.md` | `:105-129` first principles, minimal models, flexible structure | explain + authoring |
| `references/pedagogy.md` | `:32-55` philosophy; `:308-326` knowledge/skills; `:341-365` wisdom, reference docs, glossary | planning/authoring |
| `references/visual-design.md` | `:131-168` | authoring |
| `references/motion.md` | `:73-93` decide on motion; `:170-204` animation and scenes | planning (decide section only); scene authoring |
| `references/gamification.md` | `:230-241`; `:206-213` progress visibility | building/changing components |
| `references/labs.md` | `:328-338` | hands-on lessons |
| `references/lesson-contract.md` (new; closes known issue a) | required hooks from `check.mjs:62-72`; required elements; the quiz rule `:339`; scene file naming `:192` | authoring + flow review |
| `references/components.md` (new) | API index of `starter/assets/*` headers (AI-15) | authoring |
| `references/handoff-contracts.md`, `references/failure-handling.md`, `references/profiles.md` (new) | Proposals 2–4 | orchestrators |
| `agents/` at plugin root | `lesson-expert.md`, `lesson-novice.md`, `lesson-flow.md`, `lesson-author.md`, built from `lesson-panel/agents/*.md` plus frontmatter | Balanced/Deep |

**Pipeline skills.** Each becomes a ≤ 15-line trigger wrapper: a description, a **Requires** preflight (AI-08), then "load `<learn root>/workflows/X.md`". `lesson-panel/agents/*.md` keep their path as one-line pointers, or are removed in the same change as the README `:27` update.

**Links to update.**
- Internal anchors in `SKILL.md` become cross-file links:
  - `#further-learning-videos-articles--resources` → `workflows/research-sources.md`
  - `#first-principles--clarity`, `#minimal-reference-models`, `#flexible-structure` → `references/teaching-core.md`
  - `#visual-breakdowns` → `references/visual-design.md#visual-breakdowns`
  - `#decide-on-motion-while-planning-the-lesson`, `#motion-scenes-explainer-video-style` → `references/motion.md`
  - `#labs` → `references/labs.md`
  - `#assets`, `#verify-before-shipping` → `workflows/write-lesson.md`
  - `#theme` → `workflows/new-course.md#theme`
  - `#goal--progress-visibility` → `references/gamification.md`
- In other files:
  - `RESOURCES-FORMAT.md:64` `[SKILL.md](./SKILL.md)` → `references/pedagogy.md#philosophy`
  - `curriculum-planner:11` → `new-course.md#setup-interview`
  - `curriculum-planner:14` → `motion.md#decide`
  - `curriculum-planner:15` → `starter/assets/course.js`
  - `lesson-panel:7` → `write-lesson.md`
  - `docs/GUIDE.md:205` (description of what `SKILL.md` holds)
- No external link targets an anchor inside `SKILL.md`, so nothing else breaks.

## Proposal 2 — Execution profiles

Select the profile from the argument (`/learn --fast|--deep`), else from `NOTES.md` `profile:`, else **Balanced**. Never auto-upgrade to Deep. Downgrade automatically on a missing capability or an exhausted budget (Proposal 4).

| | Fast | **Balanced (default)** | Deep |
|---|---|---|---|
| Plan | inline mini-plan: next 3 lessons in `course.js` | `plan-course` inline in the main agent, once per course | planner subagent |
| Research | reuse `RESOURCES.md`; 1 primary source; ≤ 4 fetches | researcher subagent; ≤ 8 fetches per lesson | researcher subagent; ≤ 15 fetches; every claim backed or in Gaps |
| Author | main agent | main agent, using `components.md` | author subagent |
| Verify | contract lint; `check --only` if installed; scene poster frame only | `check --only`; look at flagged elements plus scene frames 55%/100%; ≤ 2 fix passes | full check of the lesson; flow reviewer looks at all screenshots |
| Review | self-checklist against `lesson-contract.md`, stamped `independence: self` | 2 subagents: expert (truth + citations) and novice (fresh context, no web). Flow checks are mechanical and covered by the contract lint and `check` | expert, novice and flow in parallel |
| Round cap | 0 | 2 (1 revision) | 3 |
| Agent calls per lesson | 1 | 1 main + 1 researcher + 2–4 reviewer calls = 4–6 | 1 + planner (once) + researcher + (author + 3 reviewers) × ≤ 3 = 6–14 |
| Tokens per lesson (est.) | 30–45k | 70–100k | 200–350k |

Without subagent support, Balanced runs as Fast and tells the user once that the review was not independent.

## Proposal 3 — Handoff contracts

All run state lives under `.review/<slug>/`. `slug` = `l<N>`. Files are never overwritten across rounds.

**`state.md`** (orchestrator-owned):
```yaml
lesson: l3
file: lessons/0003-batching.html
profile: balanced
round: 2
round_cap: 2
status: drafting | in_review | approved | escalated | paused
budget: {fetches_used: 5, fetches_max: 8, agent_calls_used: 4}
history: [{round: 1, verdicts: {expert: REVISE, novice: APPROVE}}]
```

**`r<N>-author.md`**:
```yaml
lesson: l3
round: 2
content_sha256: <sha256 of lesson html + lessons/scenes-0003.js>
check: pass | fail | skipped
check_reason: "no-playwright"
motion: scene            # must equal NOTES.md per-lesson decision
sources_cited: [R12, R14]
sources_request: []      # new links for the researcher; the author never writes RESOURCES.md
addressed:
  - {id: E-2, action: fixed, note: "recomputed 0.83 → 0.81"}
  - {id: N-1, action: declined, reason: "conflicts with E-1 (scope); precedence: expert"}
```

**`r<N>-<role>.md`** (role = `expert` | `novice` | `flow`):
```yaml
lesson: l3
role: expert
round: 2
reviewed_sha256: <must equal r2-author content_sha256, else ignored>
independence: subagent | self
verdict: APPROVE | REVISE | BLOCKED     # REVISE requires ≥1 blocker|major item; BLOCKED = could not review
items:
  - {id: E-1, severity: blocker | major | minor, location: "#worked-example",
     quote: "…", problem: "…", fix: "…"}
```

**Upstream contracts:**
- **Researcher:** each `RESOURCES.md` entry gets `id: R<n>`, `verified: YYYY-MM-DD`, `lesson: LN`, `passage:`. Alongside it, `.review/<slug>/sources.md` holds `claims[] {text, status: backed|gap, refs}` and `fetch_mode: online|offline`.
- **Planner:** a fixed `course.js` schema and one NOTES line per lesson: `L3: scene — <why> | lab: labs/03-x/`.
- **Challenge reviewer:** learning-record frontmatter `id: LR-NNNN, milestone, result: pass|miss, criteria[] {text, status: met|not_met|unverifiable, evidence}`.

**Rules:**
- Reviewers start only when the `state.md` status is `in_review`, for `round` = N.
- Completion = every required role has `APPROVE` with a matching `reviewed_sha256` in the current round.
- `minor` items never trigger a round.
- Conflicts resolve by precedence: expert > novice > flow.

**Escalation.** After `round_cap`, on a `BLOCKED` reviewer after one retry, or when the author declines a `blocker`:
1. Write `escalation.md`, listing the open items with each position and the proposed resolution.
2. Set status to `escalated`.
3. Ask the learner one question.
4. While unresolved, the lesson may be delivered only if no expert `blocker` is open. Otherwise the disputed section is cut or labelled illustrative, and the open majors are listed in `NOTES.md`.

## Proposal 4 — Failure-handling spec (`references/failure-handling.md`)

| Condition | Detect | Behaviour | Recorded |
|---|---|---|---|
| Offline, or `WebFetch`/`WebSearch` denied | first fetch errors or the tool is absent | No URLs. Name sources as "unverified — search for: …". Explain mode says links could not be verified. Research step goes to Gaps (`reason: offline`). | `sources.md` `fetch_mode: offline`; state `sources: pending`, so the next online session researches first |
| A single URL fails (404, paywall, marketing) | fetch result | drop it; try the next candidate within budget | Gaps entry if the claim stays unbacked |
| No browser / Playwright | `check.mjs` fails to launch | ask once to install (one-time download); else run the contract lint; never say "verified" | author `check: skipped`, `check_reason` |
| Check keeps failing | exit 1 after fix pass 2 | stop fixing; deliver with the problems listed, or escalate in Deep | author `check: fail` + problems |
| No subagent support | no Task/agent tool | Balanced and Deep degrade to Fast; tell the user once | `independence: self` |
| Reviewer crashes, times out or writes a malformed file | file missing or bad frontmatter after the call | retry once, then `BLOCKED`. Never fall back to a previous round's file. | `r<N>-<role>.md` `verdict: BLOCKED` |
| Reviewers disagree | contradictory fixes at the same location | precedence expert > novice > flow; declined items carry a reason; escalate if a blocker remains | author `addressed[]`, `escalation.md` |
| Budget exhausted (fetches, rounds, agent calls) | `state.md` counters | finish the current step; `status: paused`; tell the user what remains and how to resume (`/learn` continues from `state.md`) | `state.md` |
| Missing prerequisite (no `MISSION.md`, plan, NOTES decision or sources block) | workflow Preconditions | route to the producing workflow; never improvise the artifact | NOTES line |
| Pipeline skill without `learn` | Requires preflight | stop with the install command | — |
| Context pressure in a long run | orchestrator | state lives in files, so resume from `state.md` and the round files rather than conversation memory | `state.md` |
