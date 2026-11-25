# Handoff E: QA, evaluation, release engineering, security tests

| | |
|---|---|
| **Agent** | Workstream E (Agents 09 AI Evaluation & QA, 10 security tests, 12 Release Engineering) |
| **Task** | Repository validator, workspace linter, hardened lesson check, unit/browser/security tests, evaluation framework (rubrics, fixtures, deterministic scorer, instruction-cost meter, live-run protocol), CI and Pages workflows, CONTRIBUTING, SECURITY, issue/PR templates |
| **Status** | Done. Final test run against the committed runtime of A, C1, C2 and D (HEAD `41ae088` plus E's uncommitted files): **183/183 tests pass**, `validate.mjs --strict` clean. Nothing committed. |

## Files inspected

`docs/audit/{IMPLEMENTATION-PLAN,DECISIONS,FINDINGS,BASELINE}.md`; `docs/audit/raw/{02,03,04,05,12}-*.md`; `docs/audit/handoffs/{A,C1,C2,D}.md` (A's subagent rule); `.claude-plugin/marketplace.json`; every `skills/*/SKILL.md`, `skills/learn/workflows/*`, `skills/learn/references/*` (for link checks and the cost meter); `skills/learn/starter/{assets,templates,examples,tools}/*`; `scripts/lib/schema.mjs` and `schemas/*.json` (D); `subagents/*.md` (A); the baseline fixture `…/scratchpad/audit-fe/fixture-ws`; C1's `c1tools/verify.js` and C2's `ws-c2/verify.cjs`.

## Files created or modified

| Path | What |
|---|---|
| `scripts/validate.mjs` | Repository validator, zero-dep, `--json --strict --portable --root` |
| `scripts/lib/frontmatter.mjs`, `scripts/lib/markdown.mjs` | Frontmatter reader; GitHub slugs, link extraction (code fences and spans skipped) |
| `scripts/lib/lint-workspace.mjs` | Re-export of the canonical linter below |
| `scripts/check-examples.mjs` | Runs `check.mjs` on every `examples/*` course |
| `skills/learn/starter/tools/lint-workspace.mjs` | **Canonical** workspace linter (lives with the skill so `check.mjs` works from a skills.sh install that copies only the skill folder) |
| `skills/learn/starter/tools/resolve.mjs` | Playwright/axe resolution (workspace → `~/.cache/learncraft/tools` or `$LEARNCRAFT_TOOLS_DIR` → script folder → `npm root -g` → `NODE_PATH`), install message |
| `skills/learn/starter/tools/check.mjs` | Hardened (FE-12), see below |
| `skills/learn/starter/tools/package.json`, `package-lock.json` (new, committed) | `playwright` 1.63.0 exact; `axe-core` 4.10.2 optional |
| `.gitignore` | `!skills/learn/starter/tools/package-lock.json` |
| `package.json` (root, new) | `learncraft`, private, `type: module`; scripts `test`, `validate`, `check:examples`, `eval`; devDependency `playwright` 1.63.0 |
| `tests/validate.test.mjs`, `tests/lint-workspace.test.mjs`, `tests/browser-smoke.test.mjs`, `tests/security.test.mjs`, `tests/lib/workspace.mjs` | Tests and the workspace builder |
| `tests/fixtures/repo-{good,bad-frontmatter,bad-marketplace,bad-links,bad-misc}/` | Validator fixture repositories |
| `evaluations/README.md`, `rubrics/{curriculum,lesson-assessment,grounding}.md`, `fixtures/topics.json` (18 cases), `fixtures/baseline-workspace/` (copy of the audit fixture), `runners/{score-workspace.mjs,instruction-cost.mjs,instruction-paths.json,live-compare.md}`, `results/baseline-{workspace-score,instruction-cost}.{json,md}` | Evaluation framework and baseline results |
| `.github/workflows/{ci,pages}.yml`, `.github/ISSUE_TEMPLATE/{bug,course-quality,feature,config}.yml`, `.github/pull_request_template.md` | CI, Pages, templates |
| `CONTRIBUTING.md`, `SECURITY.md` | New |
| `docs/audit/handoffs/E.md` | This file |

## Findings addressed (E's part)

- **F-02 / SEC-01 / SEC-02:** XSS regression tests. They put payloads in every `course.js` string, a scene title and caption, practice prompt/option/why, `javascript:` hrefs and poisoned v0/v2 localStorage, and they run with the CSP removed so they test the escaping. Mutation check: disabling `esc` fails tests 1 and 3; disabling `sanitize` fails 2 and 3.
- **F-17:** citations are linted: `data-src` must resolve to `[Sn]`, ids are unique, and each entry is `verified YYYY-MM-DD` or `unverified (reason)`.
- **F-18 / DX-01 / DX-02 / FE-12:** `check.mjs` resolves Playwright through createRequire-style lookup. The validator errors on `~/.claude/skills` in `skills/**`, and the tools lockfile is committed.
- **F-28 / FE-05:** the check scrolls the page, waits for animations to settle, then takes screenshots. Scene scrub positions snap to the 1% step.
- **F-33 / SEC-03 / SEC-04:** a test requires a CSP meta on every template and a blocked beacon under it. No asset or theme may make a network request or use eval. `check.mjs` reports every third-party request and every failed remote request.
- **F-34:** lint rejects the template id `topic-slug`. A storage-blocked test checks that the notice shows and practice still works.
- **F-35:** a mastered milestone needs `LR-NNNN` or `learning-records/NNNN-*.md`, and the file must exist.
- **F-36 / DX-08 / DX-10:** CI, validator, tests, CONTRIBUTING, SECURITY and templates. CHANGELOG is the orchestrator's.
- **DX-05:** `--portable` flags non-spec frontmatter keys.
- **DX-09:** a warning on the 404 `$schema` URL.
- **SEC-05:** tools are pinned, never installed into the skill folder, and have a lockfile.

## Decisions

1. **The linter lives in `skills/learn/starter/tools/`; `scripts/lib/lint-workspace.mjs` re-exports it.** A skills.sh install ships only the skill folder, so a linter under `scripts/` would be unreachable from `check.mjs`. It finds `schemas/` and D's `schema.mjs` by walking up from its own folder (or `LEARNCRAFT_ROOT`). When they are absent, it runs every structural rule and emits one `schema-unavailable` warning.
2. **D's interface differs from the brief.** `loadPracticeJs` returns `{lesson, items}` and the loaders are sync. The linter accepts both shapes. The validator uses D's `checkSchema` for the subset check and validates each schema's `examples`.
3. **`node --test tests/` does not work on Node 22**: it treats the folder as a module. Everywhere uses `node --test tests/*.test.mjs` (shell-expanded, so it also works on Node 20).
4. **CI's browser job installs from the tools lockfile** (`npm ci --prefix skills/learn/starter/tools`). The root `package-lock.json` stays ignored, as the brief asked, so there is no root `npm ci`. Tests find Playwright next to `check.mjs` (resolution step c).
5. **`check.mjs` passes:** light 900 (DOM audit, axe, screenshots), light 390, dark 900 (full-page shot), and reduced-motion 390.
   - Output keeps the old ✓/✗ style; `!` lines are warnings and never fail.
   - Exit codes: 1 on any lint error or page problem, 0 when clean. A missing Playwright prints the install command plus "The browser check did NOT run" and exits 1, as the old crash did.
   - axe runs with `preload: false`; its own requests are not reported as page problems.
6. **Lenient challenge-criteria rule:** a `<ul|ol class="criteria">`, a list inside `.criteria`, or a list after a "Pass criteria" label. Anything else is a warning, not an error.
7. **Added at the coordinator's request:**
   - Every `subagents/lesson-*.md` must end with its `skills/lesson-panel/agents/<role>.md` verbatim (`subagent-sync`, error).
   - `subagents/*.md` are validated as agent files; unlisted ones warn.
   - Every marketplace plugin needs the same `version` (`marketplace-version`, error).
   - A skill that relies on "the `learn` skill" needs `dependencies: ["learn"]`.
8. **The instruction-cost meter is declarative** (`instruction-paths.json`). It reads real files at any ref via `git show`, and `follow` adds links on `**Load:**`/`**Read:**` lines. Native reviewer contexts use the first existing of `subagents/lesson-<role>.md` and the role file.

## Validation performed and results

### Passed (run here)

| Command | Result |
|---|---|
| `node scripts/validate.mjs` / `--strict` | `Checked 5 skills, 72 Markdown files, 14 JSON files, 7 schemas, 4 templates, 32 JS files. 0 error(s), 0 warning(s). OK` (both) |
| `node scripts/validate.mjs --portable` | 5 errors, all `argument-hint` (expected, DX-05) |
| `node --test tests/*.test.mjs` (Node 22.23.5, Playwright 1.63.0, Chromium 1243) | **183 tests, 183 pass, 0 fail, 0 skipped**, 7.2 s. Includes browser-smoke 13, security 8, lint-workspace 14 and validate 15, plus D's schema 85 and store 48. |
| Same suite on Node 24.22.3 | 176/176 at the time it ran (before the last 7 tests were added) |
| Validator fixtures | `repo-good` 0 findings; each `repo-bad-*` fires its intended rules (see `tests/validate.test.mjs`) |
| Skip path: Playwright made unresolvable (`NODE_PATH` unset, no npm on PATH, bogus tools dir) | Browser tests report `# SKIP Playwright not found (…looked in…)`; `check.mjs` prints the install command and "did NOT run" |
| `check.mjs` on the baseline fixture (axe 4.10.2) | Reproduces the audit: axe `label` critical × 3 on lesson 2, incomplete 5/49/30, horizontal scroll 481px on the cheat sheet. It also finds the 3 unlabeled fade inputs and the `evidence-record-missing` lint error, which the old check passed. |
| `check.mjs` on a workspace built from the committed templates, with the example scene | All 4 pages clean, axe 0 violations; scene screenshots at 15/35/55/75/100% (55% → 11.8 s of 21.5 s) |
| Ported runtime assertions (C1/C2 scripts) | First try immutable across reload. Export, clear, import restores; a second import adds nothing. A throwing scene shows one `.lc-error` while the other scene and the practice still mount. The scene pauses off-screen and on a hidden tab, then resumes. The seeded explorable, flow figure and `rng` give the same output on every load. |
| `npm ci` from the committed tools lockfile (scratch copy) | Installed playwright 1.63.0 and axe-core 4.10.2 |
| skills-cli CI step, run locally with the same commands | `npx -y skills@1.9.0 add "$PWD" --list` → "Found 5 skills"; all 5 names matched |
| Workflow and issue-template YAML | Parsed with PyYAML 6.0.3, plus a structural check (jobs, runs-on, steps, `uses` XOR `run`, pinned `@vN`; issue-form ids unique) |

### Baseline results (in `evaluations/results/`)

- **Instruction cost, `--ref f8aaf973`** (bytes/4, main context; one context per path at baseline):

  | Path | Total | Instructions | Code to read |
  |---|---:|---:|---:|
  | explain | 9,078 | 9,078 | 0 |
  | new-course | 29,215 | 10,732 | 18,483 |
  | continue | 26,430 | 10,344 | 16,087 |
  | panel | 27,191 | 11,105 | 16,087 |
  | challenge | 2,085 | 2,085 | 0 |

  `learn/SKILL.md` = 8,580, matching BASELINE.md. A test pins it.
- **Baseline workspace score:**
  - Lint: 1 error (m1 mastered with LR-0001, no record) and 7 warnings.
  - Rubric M items: 4 pass, 2 warn, 11 fail, 7 n/a, so **4/17** applicable M items pass. 11 R items are not scored.
  - Failing: CR1, CR5, CR9, AS1, AS2, AS3, AS4, AS5, AS7, AS11, G1.

### Not executed (and why)

- **GitHub Actions** (`ci.yml`, `pages.yml`): no Actions runner here. They are validated for YAML structure only, and the Pages deploy is untested.
- **Node 20**: downloading it (`npx node@20`) was denied by the permission classifier. CI's matrix covers it.
- **`npx playwright install --with-deps chromium`**: not run, because it needs apt and a browser download. Chromium 1243 was already present.
- **Live comparison** (`runners/live-compare.md`): a protocol only, marked NOT EXECUTED.
- **Example courses**: `examples/` does not exist yet (F). `check-examples` reports "nothing to check"; the validator will lint examples once they appear.
- **After instruction cost**: left to the orchestrator. Interim working-tree numbers were explain 3,627; new-course Fast 19,388, Balanced 24,016 across contexts, Deep 26,493; continue Fast 14,770; panel Balanced 15,929; challenge 2,988. Check the v2 lists in `instruction-paths.json` against A's router before quoting them.

## Known limitations

- **C1's lesson template challenge** is `<p><strong>Pass criteria:</strong> …</p>`, not a `<ul class="criteria">` with 2–4 `<li>`. It also lacks `data-kind="milestone"` (A decision 6). The linter therefore warns `challenge-criteria`, and AS-11/CR-5 fail on any course that keeps the template as is. **Recommend C1/orchestrator** change the template to `<ul class="criteria"><li>…</li><li>…</li></ul>` plus `data-kind`/`data-milestone` on `#challenge`.
- The linter and scorers parse HTML with regexes, not a parser. AS-8 and G1 are heuristic flags.
- G-scores are structural upper bounds: there is no fetching, so G2 and link resolution need review.
- Token counts are bytes/4 (±15–25%). They exclude workspace files, fetches and output.
- `vm` evaluation of `course.js` and practice files is not a security boundary. This is documented in SECURITY.md and the linter header.
- CSP behaviour is verified in Chromium only. Firefox and Safari are unverified.
- On Windows, `npm test` relies on Node ≥ 21 expanding the glob itself.

## Dependencies

- **Uses D:** `scripts/lib/schema.mjs` (`validate`, `checkSchema`, `loadCourseJs`, `loadPracticeJs`) and `schemas/{course,practice-items}.schema.json`.
- **Uses C1's runtime:** `Learncraft.courseStore()`, `.lc-item`, `[data-item-id]`, `.lc-opt`, `.lc-prior`, `.lc-notice`, `.lc-export`, `.lc-import`.
- **Uses C2's runtime:** `_lcScene.timeline`, `.sc-play`, `.sc-scrub`, and the gallery `starter/examples/index.html` with `#ex-sampling`.
- **Uses A's files:** `subagents/` and the marketplace `version`/`dependencies`.
- **Supports F:** `examples/<slug>/` must pass `lint-workspace` (run by `validate.mjs`) and `check.mjs` (CI), and `pages.yml` publishes `examples/`.

## Next action

- **Orchestrator:**
  1. Commit E's files.
  2. Ask C1 to fix the lesson template's challenge markup (above).
  3. After F lands, run `node scripts/validate.mjs && npm test && node scripts/check-examples.mjs`.
  4. Take the after instruction-cost measurement with `node evaluations/runners/instruction-cost.mjs --out evaluations/results/after-instruction-cost`, after confirming `instruction-paths.json` matches the final router.
  5. Enable Pages ("GitHub Actions" source), then watch the first CI run.
