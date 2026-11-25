# Contributing to Learncraft

Learncraft is a set of agent skills that turn a coding agent into a teacher. The courses it generates are plain HTML, CSS and classic scripts that open from disk, with no install and no server. Contributions keep it that way.

## Ground rules

- **No new runtime dependencies.** Nothing a generated course loads may come from a package, a CDN or a build step (ADR-001 in [docs/audit/DECISIONS.md](docs/audit/DECISIONS.md)). Course pages carry a Content-Security-Policy that blocks remote scripts and every network request.
- **Zero-dependency tooling.** The validator, schema validator, unit tests and evaluation scorer use Node built-ins only (ADR-011). Playwright and axe-core are optional and only power the browser tests and the lesson check; those skip with a stated reason when absent.
- **No unverified claims.** Don't write "verified", "tested" or "works with X" for anything you didn't run. Cite research the way [references/grounding.md](skills/learn/references/grounding.md) asks lessons to.
- **Never write into an installed skill folder** from skill instructions or tools. Skills read their own folder; everything they write goes into the learner's workspace.

## Set up

Requirements: Node 20 or later (22 recommended; the `skills` CLI needs 22.20+), git.

```bash
git clone https://github.com/jpmmatias/skills.git && cd skills
node scripts/validate.mjs           # repository checks, no install needed
node --test tests/*.test.mjs        # unit tests; browser tests skip without Playwright
```

For the browser tests and the lesson check, install the tools once. Either use the stable tools folder that the skill itself uses:

```bash
npm install --prefix ~/.cache/learncraft/tools playwright@1.63.0 axe-core@4.10.2
npx --prefix ~/.cache/learncraft/tools playwright install chromium
```

or install from the committed lockfile next to the check script (what CI does):

```bash
npm ci --prefix skills/learn/starter/tools
npx --prefix skills/learn/starter/tools playwright install chromium
```

`check.mjs` and the tests find Playwright in the workspace's `node_modules`, then `~/.cache/learncraft/tools` (or `$LEARNCRAFT_TOOLS_DIR`), then next to `check.mjs`, then the global npm root and `NODE_PATH`.

To try your working copy in Claude Code, add this checkout as a local marketplace (`claude plugin marketplace add /path/to/skills`, then `claude plugin install learn@jpmmatias`), or symlink a skill folder into `~/.claude/skills/` (`mkdir -p ~/.claude/skills && ln -s "$PWD/skills/learn" ~/.claude/skills/learn`).

## Checks to run

| Command | What it checks |
|---|---|
| `node scripts/validate.mjs` (`npm run validate`) | SKILL.md frontmatter, marketplace manifest (paths, dependencies, agents, one version), native subagents in sync with their role files, relative links and anchors in every `.md`, JSON parses, schemas stay in the supported subset and their examples validate, no hardcoded install paths in `skills/`, templates reference existing assets, JS syntax, example courses pass the workspace lint. `--strict` fails on warnings, `--portable` rejects frontmatter keys outside the Agent Skills spec, `--json` for machines. |
| `node --test tests/*.test.mjs` (`npm test`) | Validator, linter, schemas, store, evaluation runners; browser smoke and security (XSS, CSP, blocked storage) when Playwright is available. |
| `node skills/learn/starter/tools/check.mjs <course>` | One course workspace: data lint, then Chromium in light, dark, phone and reduced-motion passes; JS errors, missing files, remote requests, duplicate ids, unlabeled inputs, horizontal scroll, axe-core; screenshots in `<course>/.check/`. Look at them. |
| `node scripts/check-examples.mjs` (`npm run check:examples`) | `check.mjs` on every course under `examples/`. |
| `node evaluations/runners/score-workspace.mjs <course>` | Rubric scores for a course (see [evaluations/README.md](evaluations/README.md)). |
| `node evaluations/runners/instruction-cost.mjs [--ref <git-ref>]` | Tokens of instructions each invocation path loads; run before and after a change to `skills/**/*.md`. |

CI runs the validator and unit tests on Node 20 and 22, the browser tests and example checks on Node 22, and a `skills` CLI listing smoke test ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Where things live (who owns what)

| Area | Paths | Notes |
|---|---|---|
| Skill instructions | `skills/*/SKILL.md`, `skills/learn/workflows/`, `skills/learn/references/`, `skills/learn/*-FORMAT.md`, `skills/lesson-panel/agents/` | `learn/SKILL.md` is a router; detail goes into a workflow (steps) or a reference (principles). |
| Native subagents | `subagents/lesson-*.md` | Generated: frontmatter + a short preamble + the role file from `skills/lesson-panel/agents/` verbatim. Edit the role file, then regenerate; the validator fails when they drift. |
| Course runtime | `skills/learn/starter/assets/` | Classic scripts, loaded after `core.js`; every interpolation goes through `Learncraft.html`/`esc`/`sanitize`. |
| Page templates | `skills/learn/starter/templates/` | Each page carries the CSP; no inline scripts or handlers. |
| Themes | `skills/learn/themes/*.css` | Tokens only; self-host fonts (no remote `@import`). |
| Lesson-check tools | `skills/learn/starter/tools/` | `check.mjs`, `lint-workspace.mjs`, `resolve.mjs`, `package.json` + committed `package-lock.json`. Never copied into courses. |
| Data contracts | `schemas/`, `scripts/lib/schema.mjs`, [docs/architecture/data-model.md](docs/architecture/data-model.md) | Schemas use the subset documented in `schema.mjs`. |
| Repository tooling | `scripts/`, `tests/`, `evaluations/`, `.github/` | Node built-ins only. |
| Plugin manifest | `.claude-plugin/marketplace.json` | All entries share one `version`; bump it on every release or users stop receiving updates. |
| Docs and examples | `README.md`, `docs/`, `examples/`, `media/` | Example courses are marked `example: true` and ship with no learner progress. |

## Common changes

**Add a runtime component.** Put it in `starter/assets/` (or `viz.js` for figure primitives), register it with `Learncraft.register(type, def)` so it mounts through `Learncraft.mount` and a failure stays contained, escape every value, read theme tokens instead of colours, honour `Learncraft.reducedMotion()`, and pause off-screen work through `observeVisibility`. Document its markup in the file header and in [references/components.md](skills/learn/references/components.md). Add a smoke assertion in `tests/browser-smoke.test.mjs`.

**Add a theme.** Copy an existing file in `skills/learn/themes/`, change tokens only, keep body text ≥ 4.5:1 and control borders ≥ 3:1 against their backgrounds, and self-host any font under `assets/fonts/` per [THEME-FORMAT.md](skills/learn/THEME-FORMAT.md). Check a course in light and dark with `check.mjs`.

**Add an example course.** Create `examples/<slug>/` from the starter (assets + templates), set `example: true` and a unique `id`, cite real sources in `RESOURCES.md` with honest statuses, include no learner progress, and make `node skills/learn/starter/tools/check.mjs examples/<slug>` pass. The validator lints every example.

**Change a schema.** Keep to the supported subset, add or update its `examples` (the validator checks them), update `docs/architecture/data-model.md`, and keep old data readable: a `schemaVersion` bump needs a migration and a test.

**Change skill instructions.** Measure with `instruction-cost.mjs` before and after, keep every relative link valid, and use `${CLAUDE_SKILL_DIR}` for skill files in commands (never `~/.claude/skills/...`).

## Commits and pull requests

- One logical change per commit, imperative subject under ~72 characters ("Escape milestone labels in the dashboard"), a body that says why.
- Fill in the pull request template. UI changes need before/after screenshots at 390px and 900px, light and dark.
- Add a `CHANGELOG.md` entry under "Unreleased" for anything a user or a course would notice, with upgrade notes when courses need a refreshed `assets/` copy.
- Versioning: SemVer for the whole repository, tags `vX.Y.Z`. Major: a renamed or removed skill or plugin, or a workspace format old courses cannot read. Minor: a new skill, component or optional field. Patch: fixes and wording.

## Review expectations

Reviewers check, in this order: the course still opens from disk with no network; no unescaped interpolation and no new inline script; data stays backward compatible (old `course.js` and old progress still load); accessibility (labels, announcements, focus, contrast, reduced motion); instruction cost did not grow without a reason; claims in docs match what was run. Expect questions about anything that adds a request, a dependency or a stored field.
