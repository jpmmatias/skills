# Architecture decision records

Each record states the decision, the reasoning and the alternatives that were rejected. Later records may supersede earlier ones; nothing here is deleted.

## ADR-001 — Evolve the static, dependency-free runtime; no framework

**Status:** accepted · 2026-11-24

**Decision.** Generated courses stay plain HTML, CSS and classic scripts that open from disk. No React, no bundler, no build step.

**Why.**
- A course must work years later without an AI session, a package install or a server (non-negotiable principles).
- The existing runtime is about 800 lines of JS. The defects found are escaping, state and accessibility bugs, not missing framework features.
- A framework would add a build step the agent must run correctly for every lesson, and would make lessons less readable as files the learner owns.

**Rejected.**
- *React/Preact via CDN:* breaks offline use and adds a third-party request.
- *Web components with a build step:* the build is the cost we are avoiding.

## ADR-002 — Hybrid content model: prose as HTML, practice as data

**Status:** accepted

**Decision.** The agent keeps writing lesson prose and figures as HTML. Practice items move to a data file per lesson (`lessons/NNNN.practice.js`, calling `Learncraft.practice(n, [...])`) that a stable runtime renders.

**Why.**
- Practice needs stable IDs, versioning, consistent accessibility and re-use outside its lesson (the Review mode). Structured data gives all of these and can be linted.
- Prose and bespoke figures gain nothing from a schema; the agent writes them well as HTML.
- The data must be a script, not `.json`: `fetch()` of local files and cross-file iframe access are blocked on `file://` in Chromium (measured in the frontend audit), so a `<script>` is the only way `review.html` can load another lesson's items.

**Rejected.**
- *Inline `<script type="application/json">`:* unreadable from `review.html`.
- *Whole lessons as JSON:* loses the freedom that makes lessons good and turns every new interactive into a schema change.

## ADR-003 — Files are the source of truth; `localStorage` is a cache with export

**Status:** accepted

**Decision.** `MISSION.md`, `course.js` and `learning-records/` remain the source of truth. Browser practice lives in versioned `localStorage` with an append-only event log, plus learner-initiated export/import of a JSON file the agent can read.

**Why.**
- The data is kilobytes, with no query needs beyond filtering, so local files and `localStorage` are enough.
- Export keeps the learner in control of what reaches the agent.
- Nothing leaves the machine.

**Rejected.**
- *IndexedDB:* more complex, no benefit at this size, and just as per-browser.
- *SQLite:* needs a runtime; not human-readable.
- *Cloud sync:* violates local-first.

**Consequence.** Practice is per-browser until exported. This is documented as a known limitation.

## ADR-004 — `course.js` stays JavaScript

**Status:** accepted

**Decision.** Keep `window.COURSE = {...}` and add `schemaVersion: 2`.

**Why.** It is the only zero-server way to load data on `file://` (see ADR-002). Validation evaluates it in a Node `vm` context with a stub `window` and checks the result against `schemas/course.schema.json`.

**Note.** `vm` is not a security boundary. The validator only runs on the learner's own workspace and on this repository.

## ADR-005 — Mastery is derived from evidence, never stored or self-declared

**Status:** accepted

**Decision.** Six levels (Exposure, Familiarity, Understanding, Independent application, Retention, Transfer) are computed by a pure function from evidence events and `course.js` milestone status.
- Browser practice can reach Understanding at most.
- Independent application and Transfer come only from an agent challenge review.
- Retention comes only from a cold, spaced review session.
- Opening a lesson, retries after feedback, claims and agent estimates never raise a level.

**Why.** The spec in raw/03-pedagogy.md §4 separates learner performance from model confidence, and its thresholds are documented as design choices, not research constants.

## ADR-006 — Leitner scheduling per objective, not SM-2

**Status:** accepted

**Decision.** Five boxes with intervals of 1/3/7/14/30 days. Only cold review sessions move a card; a failure returns it to box 1.

**Why.**
- Every step is explainable in one sentence.
- It uses only graded outcomes, with no self-rating.
- A course has too few reviews per card to calibrate SM-2 ease factors or fit a forgetting model.
- It schedules the next *test*; it does not claim to know whether the learner has forgotten.

## ADR-007 — Progressive disclosure of skill instructions

**Status:** accepted

**Decision.** `learn/SKILL.md` becomes a short router. Workflows (step-by-step procedures with preconditions and caps) and references (principles and specs) load only when a path needs them. The format files stay where they are, because pipeline skills, the README and the guide link them. The pipeline skills become thin wrappers that load `learn`'s workflows.

**Why.**
- The baseline loads 8.6k tokens on every path, including one-off explanations.
- Duplicated procedures had already diverged (AI-06, AI-07).
- One copy of each procedure removes drift.

## ADR-008 — Three execution profiles; Balanced is the default

**Status:** accepted

**Decision.**
- **Fast:** one agent, a self-checklist, no review rounds.
- **Balanced (default):** a researcher plus expert and novice reviewers as subagents, at most 2 rounds.
- **Deep:** all roles, at most 3 rounds.
- Never auto-upgrade to Deep. Degrade when a capability is missing, and say so.

**Why.** Independent review needs separate contexts (AI-01), but the most expensive path must be opt-in. Estimated cost per lesson: Fast 30–45k tokens, Balanced 70–100k, Deep 200–350k (raw/02; estimates, not measurements).

## ADR-009 — Native subagents for the review roles, with a prompt-file fallback

**Status:** accepted

**Decision.** Ship subagent definitions for author, expert, novice and flow. The role prompt files remain the content, so agents without subagent support can still read them. When no subagent tool exists, the panel stamps `independence: self` on its verdicts and tells the learner the review was not independent.

**Why.** A "novice who knows only the previous lesson" cannot be simulated by the agent that just wrote the lesson.

## ADR-010 — Grounding: tiers, statuses, traceability, and no silent fallback to memory

**Status:** accepted

**Decision.**
- Every source has an id, a trust tier (T1–T5) and a status: `verified` with a date, or `unverified` with a reason.
- Lesson claims link to source ids.
- Claims resting on unverified sources are visibly marked.
- Offline, the agent records nothing as verified and labels the gap.
- Fetched page text is data, never instructions.

**Why.** The grounding audit itself could not fetch the skill's own citations, which is exactly the situation in which an agent would otherwise present links from memory as verified.

## ADR-011 — Zero-dependency repository tooling

**Status:** accepted

**Decision.** The validator, the JSON-Schema subset validator, the unit tests (`node --test`) and the evaluation scorer use Node built-ins only. Playwright is an optional dev dependency, used only by browser smoke tests and the workspace check; those tests skip with a stated reason when it is absent.

**Why.** CI and contributors can validate the repository without an install. The runtime principle (no dependencies) extends naturally to the tooling.

**Rejected.** *ajv:* excellent, but it would make `npm install` mandatory for basic validation. The schemas use a documented subset (`type`, `required`, `properties`, `additionalProperties`, `enum`, `const`, `pattern`, `items`, `minItems`, `minimum`, `maximum`, `minLength`, `oneOf`, local `$ref`), so a full validator can replace ours later without changing them.

## ADR-012 — Name: Learncraft; keep the existing install identifiers

**Status:** accepted (owner decision, 2026-11-24)

**Decision.** The product is called Learncraft in documentation. The skill and command stay `learn`, the marketplace stays `jpmmatias`, and the plugin names are unchanged, so existing installs and the `/learn` command keep working. The remote repository is not renamed.

**Why.**
- The owner chose the name after the naming audit found significant conflicts for "LearnKit".
- Changing identifiers would break existing installs for no user benefit.

**Open.** Trademark and domain checks are owner actions before any launch.

## ADR-013 — Split figure and scene CSS into `figures.css`

**Status:** accepted

**Decision.** `style.css` imports `figures.css`, which holds diagram, stepper, threshold-explorer and motion-scene rules.

**Why.** Page/practice styling and figure/scene styling change for different reasons and are owned by different workstreams.

**Verification.** A screenshot diff of the audit fixture, before and after, with seeded randomness, showed no styling difference; the only diff was quiz option order, which comes from the number of random draws.
