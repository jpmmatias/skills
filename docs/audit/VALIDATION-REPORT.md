# Validation report

All results below were measured in this environment on 2026-11-25 against the working tree at the commit that adds this file, unless a row says otherwise.

**Environment:** Linux container, Node 22.23, Claude Code CLI 2.1.331, Playwright with Chromium 1243, axe-core 4.10.2 (installed in `~/.cache/learncraft/tools`, outside the repository). No Firefox, WebKit or Windows.

## Passed

| Check | Command | Result |
|---|---|---|
| Unit, integration, browser and security tests | `node --test tests/*.test.mjs` | **269 / 269 pass**, 0 skipped (≈ 40 s). 183 before the security fixes. |
| Repository validation: skill metadata, marketplace, links, JSON, schemas, subagent ↔ role sync, example courses | `node scripts/validate.mjs --strict` | 0 errors, 0 warnings |
| Plugin marketplace manifest | `claude plugin validate . --strict` | Validation passed |
| Plugin install with dependency resolution | throwaway HOME, `claude plugin install curriculum-planner@…` | `learn` installed as a dependency; a `claude -p` session listed 5 skills and 4 subagents (workstream A, 2026-11-25) |
| Workspace lint: schemas, ids, citations, CSP, unsafe markup | `node skills/learn/starter/tools/lint-workspace.mjs examples/<course>` | clean on all three courses |
| Browser check: JS errors, missing files, overflow at 390px, light, dark and reduced motion, real-DOM script inspection, CSP violations, axe | `node skills/learn/starter/tools/check.mjs examples/<course>` | **19 / 19 pages clean**: Transformers 6, React 7, Probability 6. axe: **0 violations**. "Needs manual review" nodes are mostly SVG text contrast, which axe cannot resolve; those pairs were computed by hand in the frontend audit. |
| Starter templates | scratch workspace from `starter/templates` + `assets`, Chromium | No JS errors; practice renders and records; no horizontal scroll at 1280 or 390 |
| Stricter CSP on `file://` | same scratch workspace | Loads cleanly with `object-src`, `base-uri` and `form-action` set to `'none'` |
| Persistence and migration (store) | in the test suite | v0 → v2 migration, v0 key untouched, first try immutable across reload, Leitner transitions, import dedupe and quarantine round trip, blocked storage, quota |
| Security regressions | `tests/security.test.mjs`, `tests/hardening.test.mjs`, `tests/runtime-fixes.test.mjs` | Pass. Mutation check by the fix engineer: 12 of 12 single-fix reverts make a test fail; every new test fails on the pre-fix code except 4 sanity checks. |
| Instruction cost (deterministic, bytes/4) | `node evaluations/runners/instruction-cost.mjs [--ref f8aaf973]` | See [evaluation](#evaluation-results) |
| Workspace rubric (deterministic) | `node evaluations/runners/score-workspace.mjs <course>` | See [evaluation](#evaluation-results) |
| Skills CLI discovery | `npx skills add . --list` (workstream E) | lists all 5 skills |
| Upgrade path v1 → v2 | the v1 audit fixture with new assets copied in (workstream F4) | Loads with no errors. The old Jev components need the example files, as the upgrade guide says. v0 progress appears in v2 and the v0 key is byte-for-byte unchanged. |

## Failed

None at the time of this report.

Failures found and fixed during validation:
- The Transformers cheat sheet scrolled sideways (980px), caused by a runtime CSS bug with visually hidden labels inside scrolling blocks. Fixed in commit `1443dde`.
- The worked-example rubric (AS7) failed every course because it looked for a class the lesson contract never specified. The rubric and the contract were aligned in `ab0a74b`; the baseline fixture still fails AS7.

## Not executed

| Check | Why |
|---|---|
| GitHub Actions workflows (`ci.yml`, `pages.yml`) | Actions cannot run here. The YAML was parsed and structurally checked only. |
| Tests on Node 20 | Downloading Node 20 was not permitted here. Node 22.23 and 24.22 pass. |
| Firefox, Safari / WebKit | Not installed. `file://` storage and CSP behaviour in those browsers is **unverified**. |
| Windows | Not available. The UNC-path fix (SR-12) is untested on Windows. |
| `npx skills add` real install into agents | Denied by this session's permission check during workstream A. |
| End-to-end `/learn` session generating a new course with a live model | Not run. The three example courses were authored by agents following the skill's contracts, but no full `/learn` invocation was measured. |
| Live comparison: single agent vs the old pipeline vs the new profiles | Protocol only (`evaluations/runners/live-compare.md`); no paid or long model runs were executed. |
| Fetching the cited research papers and several vendor docs | The network proxy blocked journals, arXiv, react.dev, and several vendor documentation sites. Sources are marked `unverified` accordingly, or verified from official source repositories at a pinned commit where that is stated per entry. |
| Domain, trademark and USPTO checks for "Learncraft" | Owner action. |

## Evaluation results

### Instruction cost (bytes/4 ≈ tokens; ±15–25% against a real tokenizer)

| Path | Baseline `f8aaf973` | After (Balanced unless noted) |
|---|---:|---:|
| Quick Learn (explain) | 9,078 | 3,813 |
| New course, main context | 29,215 | 20,665 (Fast 21,054) |
| Continue course, main context | 26,430 | 16,363 (Fast 15,831; Deep 7,432) |
| Lesson panel, main context | 27,191 | 15,769 |
| Challenge review | 2,085 | 3,427 |

- At baseline everything ran in one context, and each panel role re-read the whole skill. After the change, Balanced spreads about 1.5–5.5k more tokens of instructions across separate reviewer contexts.
- Challenge review grew because it now loads the router plus the merged procedure (unverifiable status, synthetic-output rejection, criteria naming objectives).
- These are file sizes, not measured model token usage.

### Workspace rubric (machine-checkable items only; 11 reviewer items not scored)

| Workspace | Lint | Pass / applicable |
|---|---|---|
| Baseline fixture (the starter as it was, with a representative course) | 1 error, 11 warnings | 4 / 17 |
| Transformers example | clean | 20 / 23 |
| React example | clean | 22 / 23 |
| Probability example | clean | 20 / 23 |

The remaining non-passes are listed in `evaluations/results/after-*.md`:
- **AS15 (word budget):** warnings on lessons a little over ~1,500 words.
- **G1 (digit heuristic):** warns on lesson numbers and code.
- **G4 on Transformers lesson 2:** a false positive. The only citation of an unverified source with no verified source beside it is the "Primary source" recommendation, which already says the source could not be opened. The score is reported as measured.

### Independent content reviews (model-reviewed, not human-reviewed)

| Course | First review | After revision and re-check |
|---|---|---|
| Transformers | 1 P0, 10 P1 (wording and attribution; every number and token split correct) | All 23 fixed; 2 new P3s fixed |
| React | 0 P0, 4 P1 (keys checked on react-dom 19.3.1 and 18.3.1) | All P1s fixed; 3 P3 leftovers fixed |
| Probability | 1 P0, 6 P1 (every number recomputed and correct) | All fixed; 1 P2 and 4 P3s from the re-check fixed |

## Known limitations

See [FINAL-REPORT.md](FINAL-REPORT.md#11-known-limitations).
