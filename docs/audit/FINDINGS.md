# Consolidated findings

Seven audits ran in parallel against baseline `f8aaf97`. Full evidence, file:line references and reasoning are in [`raw/`](raw/). This file deduplicates them, resolves conflicts and assigns each finding to a workstream ([IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)).

| Raw report | Roles | Findings |
|---|---|---|
| [02-ai-architecture.md](raw/02-ai-architecture.md) | AI engineering & agent architecture | AI-01…18 |
| [03-pedagogy.md](raw/03-pedagogy.md) | Learning science | PED-01…21 |
| [04-grounding.md](raw/04-grounding.md) | Research & grounding | GR-01…15 |
| [05-frontend-ux-a11y-security.md](raw/05-frontend-ux-a11y-security.md) | Frontend, UX, visualization, security, accessibility | FE-01…15, UX-01…08, A11Y-01…08, SEC-01…05 |
| [08-data.md](raw/08-data.md) | Data & local-first | DATA-01…08 |
| [11-brand-naming.md](raw/11-brand-naming.md) | Brand & naming | (report) |
| [12-dx-compat.md](raw/12-dx-compat.md) | DX & release | DX-01…14 |

Severity: **P0** critical security, data loss or blocking · **P1** major reliability or quality · **P2** meaningful · **P3** optional.

## How the evidence was gathered

- **Measured:** browser probes in Chromium 1243 (the only browser available), axe-core 4.10.2, `claude plugin validate` (Claude Code 2.1.331), a real install with the `skills` CLI 1.9.0, a plugin install from GitHub, computed contrast ratios and rendered font sizes.
- **Read:** every file in the repository.
- **Not verified:** the network blocked the journal hosts the skill cites and several vendor documentation sites. Citation verdicts therefore rest on search-index snippets and are marked "index-only" in [raw/04-grounding.md](raw/04-grounding.md). Firefox and Safari behaviour is unverified.

## Consolidated findings

Duplicates are merged; the merged IDs are listed.

### P0

| ID | Finding | Merged | Workstream |
|---|---|---|---|
| F-01 | Practice evidence is overwritten: one wrong answer, a reload and a right answer stores `ok: true` and shows 100% "first-try" mastery. The history of misses, the most useful signal for review, is destroyed. | PED-01, DATA-03, FE-03, C3 | D, C1 |

### P1

| ID | Finding | Merged | Workstream |
|---|---|---|---|
| F-02 | Course strings, scene captions and `localStorage` values reach `innerHTML` unescaped. A source title such as `x<y & z`, or an injected `<img onerror>`, runs on `file://`, where Chromium gives every local HTML file one storage origin. | C2, SEC-01, SEC-02, FE-14 | C1, C2, E |
| F-03 | The default template breaks: one milestone gives `NaN` SVG coordinates. | C1 | C1 |
| F-04 | Practice item IDs are positional or shared. Two faded examples on one page never complete, and editing a lesson moves old answers onto different questions. | PED-02, FE-01, FE-02 | C1, A |
| F-05 | The review schedule advances on failure and never lapses. "Due" means only "reopen the lesson", which re-answers and corrupts the record. There is no review experience. | PED-03, PED-06, UX-02, DATA-08 | D, C1 |
| F-06 | A same-session score is presented as "mastery"; the toast says "You can now {canDo}". | PED-04, UX-01 | C1, A |
| F-07 | The agent never sees practice evidence: it lives only in `localStorage`, with no export. | PED-08, DATA-01 | D, C1, A |
| F-08 | The browser state has no version and no migration. | DATA-02 | D |
| F-09 | There is no diagnostic: the course floor comes from what the learner claims to know. Learning records do not separate claimed, observed and demonstrated knowledge. | PED-05, PED-09, PED-15 | A |
| F-10 | The lesson panel is not independent. One context plays author and all three reviewers, including the "novice who knows only the previous lesson". | AI-01 | A |
| F-11 | The panel loop has no round cap, tie-break, versioned handoff or structured verdicts. A stale `APPROVE` can complete an unreviewed draft. | AI-02, AI-03, AI-04 | A |
| F-12 | Four skills give three different "next lesson" rules, and the panel breaks on courses built by `learn` alone. | AI-05 | A |
| F-13 | Challenge review exists in two diverging copies. | AI-06, AI-07, PED-11 | A |
| F-14 | Pipeline skills fail when installed without `learn`; nothing declares the dependency. | AI-08, DX-03 | A |
| F-15 | There is no offline or no-fetch policy, which invites links from memory presented as verified. | AI-09, GR-07 | A |
| F-16 | There are no prompt-injection rules for fetched pages, whose text can flow into `RESOURCES.md` and lessons. | GR-08 | A |
| F-17 | No claim-to-source traceability: a reviewer cannot tell which sentence a source backs. | GR-06 | A, C1, E |
| F-18 | The hardcoded `~/.claude/skills/learn/...` path breaks plugin, project and non-Claude installs. Playwright installs into a folder that is replaced on update, and `check.mjs` cannot find a global Playwright. | DX-01, DX-02, FE-12 | A, E |
| F-19 | The 8.6k-token `learn/SKILL.md` loads whole on every path, including one-off explanations. There are no execution profiles or budgets. | AI-15, AI-16 | A |
| F-20 | The "generic" starter ships one prior course's components and copy ("Jev returned…", act/confirm/triage bands and tokens). | FE-06, PED-19 | C2 |
| F-21 | Practice feedback is not announced to screen readers, fade inputs have no accessible name (axe critical), and figure and scene text is 5–7px on phones. | A11Y-01, A11Y-02, A11Y-03, UX-06 | C1, C2 |
| F-22 | Gamification chrome outranks the learning signal, against the skill's own rule (XP and level top-right, mastery in muted meta text). | UX-01 | C1 |
| F-23 | Wrong `Deci, Koestner & Ryan 1999` link: PubMed 10589298 is a comment on the paper, not the paper itself. | GR-01 | A |

### P2

| ID | Finding | Merged | Workstream |
|---|---|---|---|
| F-24 | The skill's research claims go beyond their sources (Pashler "no support" vs "no adequate evidence base"; Höffler & Leutner overall d=0.37 vs the representational subset 0.40; Sailer & Homner call g=.49 "small"). Mayer rests on secondary sources. | GR-02…05 | A |
| F-25 | The shipped example labels uncited figures as "real data". | GR-12 | C2 |
| F-26 | No version or staleness tracking for sources, and no "disputed" status. RESOURCES-FORMAT and source-researcher disagree on the structure. | GR-09, GR-10, GR-11, AI-14 | A |
| F-27 | The scene player runs requestAnimationFrame off-screen, jumps ahead after the tab is backgrounded, and narration keeps going while the visuals are frozen. | FE-04 | C2 |
| F-28 | Figures show wrong data until scrolled into view (also in print), so check screenshots capture mid-tween frames. | FE-05 | C2, E |
| F-29 | No error isolation: one bad attribute disables every later component. | FE-08 | C1, C2 |
| F-30 | UI strings are English-only, against the course-language rule; narration has no language. | FE-07 | C1, C2 |
| F-31 | The dashboard reads as an admin panel with no next action. There are too many cards. Wrong answers get no explanation, and faded-example grading is case-sensitive. | UX-03, UX-04, UX-05, PED-12, PED-13 | C1 |
| F-32 | Colour-only error states, non-text contrast of 1.26–1.40:1 on control borders, and focus loss after "Another →". | A11Y-05…07 | C1, C2 |
| F-33 | Google Fonts `@import` in the example theme adds a third-party request on every page, and there is no CSP. | SEC-03, SEC-04 | C1, E |
| F-34 | Storage failures are silent, and the template course id collides across courses. | DATA-04, DATA-05 | D, E |
| F-35 | Learning records are not machine-checkable: nothing verifies that a `mastered` milestone has a record. | DATA-06 | A, E |
| F-36 | There is no CI, validator, tests, CHANGELOG, CONTRIBUTING, SECURITY file, templates or versioning. Updates are undocumented. | DX-07…11 | E, F |
| F-37 | `./` means two different folders in `learn/SKILL.md`. Manual installs fail without `mkdir -p`. | DX-04, DX-06 | A, F |
| F-38 | Quick (explain) mode has no retrieval questions. Interleaving is stated but not built. Mastered milestones are never re-checked for retention. | PED-07, PED-10, PED-16 | A, C1 |
| F-39 | Mode routing depends on which files exist, not on what the learner intends. The setup interview's "≤4 questions" covers 5 topics. The skill tells the agent to write into its own installed folder. | AI-11, AI-12, AI-13 | A |
| F-40 | `.ba` overflows on phones; `overflow-wrap: anywhere` breaks words mid-word. | FE-10, FE-11 | C1 |

### P3 (folded into the workstreams when cheap, otherwise roadmap)

FE-09 (globals and script order), FE-13 (speech and fullscreen guards), FE-15 (label collisions and the poster frame), UX-07 (emoji in the UI), UX-08 (single-accent signal lost in the example theme), A11Y-08 (structure), SEC-05 (pinning), PED-18, PED-20, PED-21, GR-13…15, DX-05 (`argument-hint` rejected by claude.ai uploads and the Skills API), DX-12…14.

## What is already good (keep it)

From the audits, with evidence in the raw reports:
- Milestones are evidence-gated: practice never unlocks them.
- Challenges are transfer tasks, the reviewer rejects synthetic lab output, and it recomputes the learner's arithmetic.
- The skill separates fluency from storage strength.
- Worked examples are faded, and glossary terms are earned before they are used.
- Scenes are pure functions of time, honour reduced motion and are learner-controlled.
- Everything is dependency-free static HTML that opens from disk.
- The plugin manifest is valid (`claude plugin validate --strict` passes).

## Conflicts between recommendations, and how they were resolved

| Conflict | Resolution |
|---|---|
| Pedagogy wants one review card per *objective*; frontend proposed *item*-level scheduling. | Objective-level cards (Leitner, PED §6). Items carry `objective`, and the review session draws items from due objectives. Item-level schedules give a course with tens of items too little data per card. |
| Pedagogy proposed agent-authored evidence compiled into `assets/evidence.js` for the browser. | Deferred. The browser derives L4 (challenge passed) from `course.js` milestone status, which the challenge reviewer already writes. The agent reads browser evidence through export files. This avoids a build step the agent must remember. |
| Frontend proposed lesson data embedded as `<script type="application/json">`. | Practice items go in a sibling `lessons/NNNN.practice.js` (`Learncraft.practice(n, [...])`). Only that form can be loaded by `review.html`: `fetch()` and cross-file iframe access are both blocked on `file://` in Chromium. Prose stays hand-written HTML. |
| AI architecture proposed native subagents for the panel; DX found plugin entries can ship agents. | Native subagent definitions are added, and the role prompt files stay as their source of truth. When subagents are unavailable, Balanced degrades to Fast with `independence: self` stated to the learner. |
| Brand audit recommended "Hornbook"; the owner chose **Learncraft**. | Learncraft is used. Its conflict check is recorded in the brand report (moderate: 105 GitHub repositories, two with a similar idea, npm and PyPI names free). The remote repository is not renamed. |
