# Evaluations

How Learncraft measures whether a change makes courses better or cheaper to produce. Everything in this folder runs offline with Node built-ins (ADR-011). Nothing here calls a model.

## What is measured

| Question | Measure | How | Where |
|---|---|---|---|
| Is a generated course well formed and safe? | Workspace lint: course.js against `schemas/course.schema.json`, practice files against `schemas/practice-items.schema.json`, ids, citations, source statuses, learning-record evidence, script sources, inline handlers | deterministic | `skills/learn/starter/tools/lint-workspace.mjs` (also run by `check.mjs` and, for `examples/*`, by `scripts/validate.mjs`) |
| Does it follow the teaching rules? | Curriculum and lesson/assessment rubrics, M items | deterministic | [`runners/score-workspace.mjs`](runners/score-workspace.mjs), [`rubrics/curriculum.md`](rubrics/curriculum.md), [`rubrics/lesson-assessment.md`](rubrics/lesson-assessment.md) |
| Are its claims grounded? | Grounding rubric G1–G8; structural parts only | deterministic, upper bound | [`rubrics/grounding.md`](rubrics/grounding.md) |
| Is it good teaching? | R items: misconception-based distractors, transfer challenges, one idea per lesson, fidelity of claims to sources | human or model-judged | the rubric files; [`runners/live-compare.md`](runners/live-compare.md) |
| What does each path cost in instructions? | Tokens of skill instructions loaded per invocation path, profile and agent context | deterministic (bytes / 4) | [`runners/instruction-cost.mjs`](runners/instruction-cost.mjs), [`runners/instruction-paths.json`](runners/instruction-paths.json) |
| Does it render and stay safe in a browser? | JS errors, NaN, XSS payloads, CSP, blocked storage, axe | deterministic, needs Playwright | `tests/browser-smoke.test.mjs`, `tests/security.test.mjs`, `check.mjs` |
| Does the full pipeline produce better courses than before? | Single agent vs the baseline pipeline vs the Fast/Balanced/Deep profiles, on fixed prompts | live runs with blinded review | [`runners/live-compare.md`](runners/live-compare.md) — **protocol only, not executed** |

## Deterministic vs human vs model-judged

- **Deterministic (M):** a script decides from files alone. Same input, same output. These are the only numbers in `results/` today.
- **Human-judged (R):** a reviewer reads the lesson and scores the R rows of the rubrics 0–2 using the guidance tables. Use two reviewers per lesson; when their scores differ by 2, a third decides.
- **Model-judged (R, optional):** a model may pre-score R items, but only blinded (it does not know which condition produced the lesson), with the rubric text as its whole instruction, and its scores are reported separately from human scores. A model score never replaces a human score in a ship decision.

### Human and model-judged criteria

The R items are CR-7, CR-10, CR-11, AS-9, AS-10, AS-13, AS-14, AS-16, G2, the resolution half of G5, G7 and G8. `score-workspace.mjs` lists them as `not-scored`, so a report never looks more complete than it is.

## Running

```bash
# score a course workspace (lint + every M criterion) → JSON and a Markdown table
node evaluations/runners/score-workspace.mjs path/to/course --out evaluations/results/<name>

# instruction cost of the working tree, or of any git ref (reproducible before/after)
node evaluations/runners/instruction-cost.mjs --out evaluations/results/after-instruction-cost
node evaluations/runners/instruction-cost.mjs --ref f8aaf973 --out evaluations/results/baseline-instruction-cost
```

`npm run eval` runs both on the baseline fixture and the working tree.

## Results in this repository

| File | What it is |
|---|---|
| `results/baseline-workspace-score.{json,md}` | `score-workspace` on `fixtures/baseline-workspace/`: the frontend audit's fixture course, built from the untouched baseline starter (3 milestones, 2 lessons, no learner progress). Copied here so the score is reproducible. |
| `results/baseline-instruction-cost.{json,md}` | `instruction-cost --ref f8aaf973` (the baseline commit in `docs/audit/BASELINE.md`). |

The "after" instruction-cost measurement is taken by the orchestrator once every workstream has landed. The v2 path spec in `instruction-paths.json` was drafted from the workflow files while they were being written; check its file lists against `skills/learn/SKILL.md` before quoting after-numbers.

## Limits

- Token counts are bytes / 4, the convention used in `docs/audit/BASELINE.md`. Real tokenizer counts differ by roughly ±15–25% and per model. Compare like with like (same estimator, two refs).
- Instruction cost excludes the learner's workspace, web fetches, screenshots and model output, which dominate real sessions (raw/02 estimates 35–100k tokens per lesson). It measures what the skill design controls.
- The M scorers are heuristics over agent-written HTML, not a parser. AS-8 (stems copied from prose) and G1 (uncited numbers) are flags for a reviewer, not verdicts.
- G-scores from files are upper bounds: a lesson can cite a T1 source that does not say what the lesson claims. Only G2 review catches that.

## Adding a topic

1. Add cases to [`fixtures/topics.json`](fixtures/topics.json): one per level, each with a `mission` in the learner's words and three `successCriteria` written as observable outcomes (each becomes a milestone, so avoid "understand").
2. Keep the id `<topic-slug>-<level>`, and set `lang` when the learner writes in another language (`pt` is supported by the runtime).
3. These are prompts for live runs. Never commit outputs generated from them as if they were fixtures of expected quality: an output belongs in `results/` with the run log described in `runners/live-compare.md`.

## Adding a criterion

1. Add the row to the rubric file with M or R.
2. For M, add a function to `scorers` in `runners/score-workspace.mjs` and a row to `RUBRIC`, and name the function in the rubric's last column.
3. Add a test case to `tests/lint-workspace.test.mjs` that makes it pass and fail.
