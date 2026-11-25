# Changelog

All notable changes to Learncraft (the `learn` skill and its pipeline skills). The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). The plugin `version` in `.claude-plugin/marketplace.json` must be raised with every release, or plugin users do not receive updates.

## [Unreleased]

## [2.0.0] — not yet released

The first release under the name **Learncraft**. The skill and command keep the name `learn`, so `/learn` and existing installs keep working. Upgrade steps for existing courses: [docs/guides/upgrading.md](docs/guides/upgrading.md).

### Breaking

- **Course format v2.** `assets/course.js` gains `schemaVersion: 2`, `lang`, per-lesson `objectives` and `practice`, and optional milestone `objectives`. v1 courses still open, but new lessons need the v2 runtime. Copy the new `assets/` into the course and keep your `course.js` and `theme.css`.
- **Practice is data.** New lessons declare practice items in `lessons/NNNN.practice.js` (choice, recall, order, fade) instead of inline quiz markup. Old `.quiz-q` and `.fade` markup still works.
- **Course-specific components removed from the starter.** The confidence bands, band quiz and threshold explorer moved to `starter/examples/jev-confidence/`. Lessons that use them need those files copied alongside.
- **Progress storage v2.** Progress moves to `learn:<course>:v2` as an append-only event log. The old `learn:<course>` key is migrated once and never written or deleted, so a downgrade keeps the old data.
- **Lesson pages need a strict Content-Security-Policy** (in the templates). Inline `<script>` and `on…=` attributes no longer run, and the linter rejects them.

### Added

- **Modes:** Deep Learn (one sitting), Practice, Review (cold, interleaved review of due objectives in `review.html`), and an experimental Repository Learning mode, alongside Quick Learn and Course.
- **Execution profiles:** Fast, Balanced (default) and Deep, with budgets for fetches, review rounds and agent calls.
- **Native reviewer subagents** (`learn:lesson-author`, `-expert`, `-novice`, `-flow`) for independent lesson review, with versioned handoff files, round caps and escalation.
- **Mastery levels** derived from evidence: Seen, Familiar, Understood, Applied, Retained, Transferred. Only a reviewed challenge reaches Applied, and only for the objectives its criteria name.
- **Spaced review:** a Leitner schedule per objective, where a miss returns the card to box 1. Every change is explained in one sentence.
- **Progress export and import**, so the learner can hand practice evidence to the agent.
- **Grounding:** source trust tiers, verification statuses, claim-to-source citations (`data-src`), visible "unverified" markers, an offline policy and prompt-injection rules.
- **Visualization primitives:** a shared timeline (pauses off-screen, keyboard scrub, narration in the course language), parameter sliders, seeded explorables, histograms, a number line and flow graphs.
- **English and Brazilian Portuguese interface strings.**
- **Three example courses** (`examples/`): How Transformers Work, React Rendering Internals, Probability & Statistics. Each was independently reviewed for accuracy, and none contains learner data.
- **Tooling:**
  - `scripts/validate.mjs` (repository validation);
  - a workspace linter;
  - a hardened `check.mjs` (dark and reduced-motion passes, axe, settle-before-screenshot);
  - JSON Schemas;
  - `evaluations/` (rubrics, topic fixtures, a deterministic scorer, an instruction-cost meter);
  - CI and Pages workflows;
  - contributing guide, security policy and templates.

### Changed

- `learn/SKILL.md` is an 80-line router. Workflows and references load on demand, which cuts the instructions loaded for a quick explanation from about 9.1k to about 3.8k tokens (bytes/4 estimate).
- The four pipeline skills are thin wrappers that require `learn` and declare it as a plugin dependency.
- The dashboard leads with the next action. Mastery is shown in words, XP is de-emphasised and levels-by-points are removed.
- Research claims in the skill are stated no more strongly than their sources support. The Deci, Koestner & Ryan link now points at the paper rather than a comment on it.
- Check tools install into `~/.cache/learncraft/tools` and the skill locates its files through `${CLAUDE_SKILL_DIR}`, so plugin, project and non-Claude installs work.

### Fixed

- The milestone path drew `NaN` with a single milestone, so a new course's dashboard was broken.
- Course strings, captions and stored progress were inserted as raw HTML (XSS).
- A reload let a later answer overwrite a missed first try, inflating mastery.
- The review schedule advanced even when the learner failed.
- Two practice widgets of the same type on one page never completed, and editing a lesson re-attached old answers to other questions.
- Security findings from an independent review: sanitizer bypasses, data-file loaders that could reach Node's `process`, linter gaps, silent progress loss when storage is full. Details: `docs/audit/reviews/security-reliability.md`.

## [1.x]

Earlier history (the `learn` skill, its starter kit and the four pipeline skills) is in the git log up to commit `f8aaf97`.
