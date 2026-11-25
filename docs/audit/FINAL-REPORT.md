# Learncraft transformation: final report

Period: 2026-11-24 → 2026-11-25. Baseline: commit `f8aaf97` on `claude/loving-goldberg-xetg0g`. All work is in local commits on that branch, which **has not been pushed**: a push needs the owner's authorization.

Companion documents:

| File | Contents |
|---|---|
| [BASELINE.md](BASELINE.md) | The starting point |
| [FINDINGS.md](FINDINGS.md) | 40 consolidated findings from seven audits |
| [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) | File ownership, interface contracts, the ledger |
| [DECISIONS.md](DECISIONS.md) | 13 ADRs |
| [VALIDATION-REPORT.md](VALIDATION-REPORT.md) | What passed, what failed, what was not executed |
| [raw/](raw/) | The audits |
| [reviews/](reviews/) | The independent reviews |
| [handoffs/](handoffs/) | Per-workstream handoffs |

## 1. Executive summary

The repository was a well-intentioned set of agent skills (`learn` plus four pipeline skills) and a static-HTML starter kit. It is now **Learncraft**: the same local-first idea, made reliable, evidence-honest and documented.

**What changed and why:**

- **Correctness and data integrity.** On a fresh course, three defects broke the product: the dashboard drew `NaN`, course text was injected as raw HTML, and a reload let a later answer overwrite a missed first try. All three are fixed, and progress now lives in a versioned, append-only store with a one-way migration that never touches the old data.
- **Evidence-based mastery.** Six levels are derived from evidence, never set by hand. Only a reviewed challenge reaches *Applied*, and only for the objectives its criteria name. Review runs on a Leitner schedule driven only by cold review sessions. Export/import lets the agent see practice evidence, which it could not before.
- **Agent architecture.** The 369-line skill became an 80-line router plus 12 workflows and 13 references loaded on demand. Instructions for a quick explanation fell from about 9.1k to about 3.8k tokens (bytes/4). There is one next-lesson rule and one challenge procedure (there had been divergent copies), plus Fast / Balanced / Deep profiles with budgets and real subagents for independent review.
- **Grounding.** Sources have tiers, statuses and per-claim citations; unverified claims are visibly marked; there is an offline policy and prompt-injection rules. The skill's own research citations were corrected or softened.
- **Security and accessibility.** Two independent security reviews and two rounds of fixes:
  - an exact content-security policy, enforced by the linter and by a real-DOM browser check;
  - sandboxed data loaders;
  - 279 tests.
  - axe reports 0 violations on all 19 example pages (Chromium).
- **Product.** A new name chosen by the owner after a naming audit, a rewritten README and guide, compatibility and upgrade docs, and three example courses, each independently reviewed for accuracy and revised.

**Unresolved:**
- The branch is not pushed. The GitHub repository is not renamed and Pages is not enabled. Trademark and domain checks are not done.
- No live `/learn` run was measured, and the comparative live evaluation was not executed.
- Firefox, Safari and Windows are unverified.
- Many primary sources could not be fetched from this environment and stay marked unverified.

## 2. How the work was organised (multi-agent)

Native subagents were available, so the 12 roles were run as real background agents with disjoint file ownership. No two agents edited a file at the same time; overlap was coordinated through the orchestrator. 22 agent instances ran in total; several were resumed for revision rounds. A container restart and an API rate limit each interrupted work once; every interrupted agent was resumed from its saved transcript and no work was lost.

| Role (brief) | How it ran |
|---|---|
| 01 Principal architect / orchestrator | This session: baseline, data audit, consolidation, plan, ADRs, integration fixes, final validation |
| 02 AI architecture | Audit agent → workstream A (implementation) → independent skills review → separate fixer |
| 03 Pedagogy | Audit agent; pedagogy specs adopted in A and D; independent pedagogy review of skills and of each course |
| 04 Research and grounding | Audit agent; grounding specs in A; factual review of each course |
| 05 / 06 / 07 / 10 Frontend, UX, motion, security and a11y | One audit agent with a browser and axe → workstreams C1 (runtime UI) and C2 (visualization) → independent security review, twice |
| 08 Data | Orchestrator audit → workstream D (store, schemas) |
| 09 Evaluation, QA | Workstream E (validator, linter, tests, evaluations, CI) |
| 11 Brand | Naming audit → owner decision → workstream F4 (docs, brand) |
| 12 DX and release | DX audit (real installs) → E and F4 |
| Course authors | F1 Transformers, F2 React, F3 Probability |

Review relationships followed the brief, and no agent reviewed its own work:
- The skills architecture and pedagogy integration were reviewed by an independent reviewer and fixed by a separate agent.
- Each course was reviewed by an independent accuracy-and-pedagogy reviewer; the author revised it and the reviewer re-checked.
- Runtime security was reviewed independently and fixed by a separate engineer, then re-verified twice by the original reviewer.
- The orchestrator re-ran every verification claim before committing.

## 3. Repository audit (original weaknesses)

Full evidence with file:line references: [FINDINGS.md](FINDINGS.md) and [raw/](raw/). In brief:

| Sev | Finding |
|---|---|
| P0 | First-try evidence overwritten on reload; mastery inflated |
| P1 | Unescaped `innerHTML` of course data (XSS on a shared `file://` origin); `NaN` milestone path on the default template; positional or shared practice ids; review schedule that advanced on failure; same-session score shown as mastery; practice evidence invisible to the agent; unversioned state; no diagnostic; a non-independent review panel with an uncapped loop; three conflicting next-lesson rules; duplicated, diverging challenge procedures; pipeline skills broken without `learn`; no offline or no-fetch policy; no prompt-injection rules; no claim traceability; hardcoded `~/.claude/skills` paths; an 8.6k-token skill loaded on every path; a course-specific ("Jev") component in the generic starter; inaccessible practice feedback and 5–7px figure text on phones; gamification above learning signal; a wrong PubMed link |
| P2 | Research claims stated beyond their sources; uncited "real data" in the shipped example; an off-screen animation loop; figures showing wrong data until scrolled into view; no error isolation; English-only UI; admin-style dashboard; colour-only errors and low non-text contrast; a third-party font request; silent storage failure; no CI, tests, changelog or contribution docs |

## 4. Architecture: before and after

**Before.**
- One 369-line `SKILL.md` loaded whole on every path.
- Four pipeline skills that paraphrased it and diverged.
- One agent played author and all three reviewers.
- The browser runtime was 800 lines of tightly coupled JS: global state, `innerHTML` templating, and a single unversioned `localStorage` blob that only the browser could read.
- No validation of anything.

**After.**

```
skills/learn/SKILL.md            router (80 lines): intent → mode → profile → workflow
  workflows/  (12)               step-by-step procedures with preconditions, caps, completion checks
  references/ (13)               principles and binding specs (lesson contract, mastery, grounding, profiles,
                                 handoff contracts, failure handling, components)
  *-FORMAT.md                    file formats (learning-record frontmatter optional; old records valid)
  starter/assets/                runtime: core (escaping, sanitising, i18n, error isolation, live region)
                                 · store (versioned event log, derived levels and schedule, export/import)
                                 · practice (choice/recall/order/fade from data) · progress (views)
                                 · viz (timeline, slider, explorable, histogram) · diagram · scene
  starter/templates/             index, lesson, review, reference pages with the canonical CSP
  starter/tools/                 check.mjs (browser), lint-workspace.mjs, load-data.mjs (sandboxed loader)
skills/{curriculum-planner,source-researcher,lesson-panel,challenge-reviewer}/   thin wrappers that require learn
subagents/lesson-{author,expert,novice,flow}.md                                  native reviewers (from the role files)
schemas/ (7)  scripts/validate.mjs  tests/ (9 files, 279 tests)  evaluations/  examples/ (3 courses)  .github/
```

Decisions and their reasons are in [DECISIONS.md](DECISIONS.md):
- no framework (ADR-001);
- prose as HTML, practice as data (ADR-002);
- files as the source of truth, `localStorage` as a cache with export (ADR-003);
- `course.js` stays JavaScript (ADR-004);
- derived mastery (ADR-005);
- Leitner scheduling (ADR-006);
- progressive disclosure (ADR-007);
- profiles (ADR-008);
- native reviewers with a fallback (ADR-009);
- grounding rules (ADR-010);
- zero-dependency tooling (ADR-011);
- naming (ADR-012);
- the figure CSS split (ADR-013).

## 5. Implementation report

- 47+ commits since baseline; 417 files changed (+45k / −1.7k lines, mostly new example courses, tests, fixtures and docs).
- Per-workstream file lists: [handoffs/](handoffs/).
- Ledger: [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md#ledger).

**Completed**
- All P0 and P1 findings; all P2 findings except those listed under remaining tasks.
- 27 skills-review findings: 19 applied fully, 5 partially, 3 not applied, with reasons in `handoffs/skills-fixes.md`.
- 13 + 7 + 4 security findings over three review rounds: all fixed or reduced, with residuals documented in `SECURITY.md`. The third round's fixes (NEW-08…NEW-10) were made by the orchestrator and verified against the reviewer's own PoCs, but have **not yet been re-verified by the independent reviewer**.
- Three courses × one independent review plus one re-check each.

**Remaining tasks (not done)**
- Move `requires` into `course.js` (SK-14; kept in `NOTES.md` as its single home; the schema field is deprecated).
- An `assessment` field in learning records (SK-10; schema field added; workflows still tell records apart by title).
- A separate researcher role file (SK-16).
- Structural moves in the router (SK-26).
- Write batching in the store (SR-09; replaced by an id set and skipped re-reads).
- Per-chapter phone crops for scenes; re-layout of hand-drawn steppers on phones.
- The shared histogram tweak (CP-25).
- Course word budgets slightly over ~1,500 on some lessons (AS15 warnings).

## 6. AI evaluation report

Details: [VALIDATION-REPORT.md](VALIDATION-REPORT.md#evaluation-results).

| Evidence type | Result |
|---|---|
| **Measured (deterministic)** | Instruction cost per path (table in the validation report). Workspace rubric on machine-checkable items: baseline fixture 4/17, examples 20–22/23. 279 tests. 19/19 pages clean with 0 axe violations. |
| **Model-reviewed** | Five independent reviews (skills, security ×3 passes, three courses) with findings and re-checks. These are model judgments, not ground truth. |
| **Human-reviewed** | None. No human has reviewed the courses or the instructions yet. |
| **Not measured** | Learner outcomes; live generation quality, cost, latency or failure rate per profile. The harness and protocol exist (`evaluations/`); runs were not executed. No claim of improved learning is made. |

## 7. UX report

**Before / after screenshots** (same names, Chromium, deviceScaleFactor 2):
- before: `screenshots/before/`
- after: `screenshots/after/{dashboard,lesson1}-{1280,390}-{light,dark}.png`
- visualizations: `screenshots/after/viz-*.png`
- example courses: `media/readme/`, `media/guide/`

What changed:
- **Dashboard:** leads with a "Next up" action instead of stat tiles. Milestones are a readable list with evidence links. XP is a footnote and points-based levels are gone. Mastery is shown in words with its basis.
- **Lessons:** the goal comes first, practice is grouped under "Check yourself", and the challenge is the only card. Emoji in the interface chrome were replaced with text.
- **Figures:** final state at first paint (and in print). Text at least 11px on a 390px phone (was 5.2–7.3px). A phone layout for scenes. Readable alt text generated from the data.
- **Review page:** cold, interleaved review of due objectives, with one-sentence explanations of each schedule change.
- **Theme customisation:** kept (tokens; new `--signal` and `--control-border`); the example theme no longer calls Google Fonts.

## 8. Security and accessibility report

**Verified improvements (Chromium; details in [reviews/security-reliability.md](reviews/security-reliability.md) and [handoffs/security-fixes.md](handoffs/security-fixes.md)):**

| Area | Before | After |
|---|---|---|
| Sanitizer | 11 of 32 dangerous links got through | 0 of 68 |
| Data-file loaders | 5 of 5 escapes reached Node's `process`; hangs | Run in a child process with an empty environment, a hard kill and bounded reads; escapes blocked |
| Lint bypasses | 17 of 21 missed; later 13 parser-differential forms; then 5 ways to make the browser ignore the CSP (NEW-08) | Exact canonical CSP required (no wrapping, exact `http-equiv`). `check.mjs` proves the CSP is enforced with an inline-script and inline-handler probe, records every inserted element with a handler (so self-removing payloads are seen) and inspects the real DOM. All reviewer PoCs, including the full example-course PoC, now fail the check. |
| Store | Silently lost data on full storage; deleted unknown events | Failures surfaced, unknown events quarantined, newer documents never overwritten |

**Accessibility:**
- 0 axe violations (wcag2a/aa, 2.1, 2.2 AA tags) on 19 pages.
- All practice types are operable by keyboard and announced through a live region.
- Labelled inputs; non-colour error states; control borders at least 3:1.
- Reduced motion respected live.

**Remaining limitations:**
- Not verified in Firefox, Safari, or with real screen readers.
- `'self'` on `file://` matches any local file in Chromium.
- The agent writes `scenes-NNNN.js`, which runs with page privileges.
- A data file still gets about 1 s of CPU and 256 MB of heap in the loader, and the network is not covered by Node's permission model (documented in `SECURITY.md`).
- NEW-11 (P3, open): no test catches removal of the loader's `import()` hook; the hook itself is in place.

No claim of full WCAG or security compliance is made.

## 9. Brand report

- **Selected name:** **Learncraft**, chosen by the owner on 2026-11-24 after the naming audit found significant conflicts for "LearnKit": an Obsidian spaced-repetition plugin, learnkit.io, LearnKit AI, learnkit.com, and a LEARNKIT trademark whose status sources disagree on.
- **Conflict check for Learncraft:**
  - 105 GitHub repositories named learncraft, including two small, active ones with a similar idea;
  - npm `learncraft` and PyPI `learncraft` unregistered as of 2026-11-24;
  - trademark and domains not checked (owner action).
- **Positioning:** a coding agent that writes a course you keep, in your own folder, with evidence-gated mastery. Guidelines: `docs/brand/brand-guidelines.md`. Launch copy: `docs/brand/launch.md`. Social preview: `media/social-preview.png`.
- **Identifiers unchanged:** the skill `learn`, the `/learn` command, the marketplace `jpmmatias` and the repository `jpmmatias/skills`. Renaming the repository needs owner approval.

## 10. Release readiness

| Item | Status |
|---|---|
| Tests passed | 279 / 279; validate strict; plugin validate strict; 19 / 19 example pages; 0 axe violations |
| Tests failed | none |
| Not executed | GitHub Actions, Node 20, Firefox/WebKit, Windows, `npx skills add` real install, live `/learn` runs, live comparative evaluation |
| Breaking changes | course format v2; practice as data files; the Jev components moved to an example; progress storage v2 (v0 kept); strict CSP (no inline scripts). See [CHANGELOG.md](../../CHANGELOG.md). |
| Migration | Automatic for progress. For courses: copy the new `assets/` and keep `course.js` and `theme.css` ([docs/guides/upgrading.md](../guides/upgrading.md), tested on a v1 fixture) |
| Recommended version | **2.0.0** (already set in `marketplace.json`; the plugin `version` must change for plugin users to get the update) |
| Remaining blockers before publishing | 1. Owner authorization to push the branch and open a PR. 2. CI run on GitHub (never executed). 3. Enable Pages (Source: GitHub Actions) for the demo. 4. Optional: a human read of the three example courses. 5. Trademark and domain checks, if the name will be marketed. |

## 11. Known limitations

- Practice progress is per-browser until exported (by design, ADR-003).
- Chromium is the only verified browser.
- Many primary sources (journals, arXiv, react.dev, vendor docs) could not be fetched here. Courses mark them unverified, or cite the official source repository at a pinned commit where that is stated per entry.
- The example courses were authored by agents and reviewed by agents, with no human review yet.
- Some lessons exceed the ~1,500-word budget.
- claude.ai uploads and the Skills API reject `argument-hint` (vendor-documented). Compatibility beyond Claude Code is vendor-documented, not tested ([docs/compatibility.md](../compatibility.md)).
- Repository Learning mode is experimental and untested.

## 12. Weighted scorecard

Scores out of 10. **Basis:** M = measured, R = model-reviewed judgment (this orchestrator and the independent reviewers), U = unverified expectation. No human review and no learner study back any score. The point is the evidence, not the number.

| Category | Weight | Before | After | Basis and evidence |
|---|---|---|---|---|
| AI architecture | 15% | 4 | 8 | R + M: router plus on-demand files (instruction cost measured); one rule per decision; profiles with caps; real subagents (install test). Not run end to end (U). |
| Educational effectiveness proxies | 15% | 5 | 8 | R + M: derived mastery, Leitner, diagnostic, practice types, the rubric (4/17 → 20–22/23). Learner outcomes not measured. |
| Factual accuracy and grounding | 15% | 4 | 7 | R: three independent course reviews (P0s found and fixed, re-checked); citations corrected; statuses honest. Many sources unfetchable here, so unverified. |
| Frontend and interaction | 10% | 5 | 8 | M + R: 19/19 pages clean, 390px layouts, before/after screenshots. Only Chromium. |
| Software architecture | 10% | 4 | 8 | R: separated core/store/views, contracts, schemas, ADRs. |
| Reliability and testing | 10% | 1 | 8 | M: 0 → 279 tests, mutation-checked security tests, validator. CI not yet run on GitHub. |
| Developer experience | 10% | 5 | 8 | M + R: validated manifest, dependency install, fixed paths, contributing guide, templates, changelog, upgrade guide. `npx skills` install not run. |
| Security and accessibility | 5% | 2 | 7 | M: two review rounds, PoCs re-run, 0 axe violations. Residuals documented; other browsers unverified. |
| Documentation | 5% | 5 | 8 | R: README, guide, compatibility, install and upgrade guides, audit trail. |
| Product identity | 5% | 2 | 7 | R: name chosen with a conflict check, positioning, preview. Trademark and domains not checked; Pages not live. |
| **Weighted** | | **≈ 3.8** | **≈ 7.8** | |

## 13. Next roadmap (three milestones)

1. **2.0.0 release** (blocking items above).
   - Push and open a PR with the owner's approval, then fix whatever CI reports on GitHub.
   - Enable Pages.
   - Run a human read-through of the three courses.
   - Run three live `/learn` sessions (one per profile) on fixtures from `evaluations/fixtures/topics.json` and record cost, latency and failures with the existing protocol.
2. **2.1: evidence loop and portability.**
   - An `assessment` field in learning records and `requires` in `course.js` (SK-10, SK-14).
   - Agent-written evidence visible in the browser (`assets/evidence.js`, deferred in ADR-003).
   - Firefox and WebKit in CI.
   - A real install test of `npx skills add` for Codex, Cursor and Gemini CLI, so compatibility claims can move from "documented" to "verified".
3. **2.2: content quality at scale.**
   - Run the live comparison (single agent vs Balanced vs Deep) with blind human review on the six fixture topics.
   - Calibrate the rubric weights on those results.
   - Promote Repository Learning from experimental once it passes the same evaluation.
   - A per-chapter phone layout for scenes.
