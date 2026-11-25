# Live comparison protocol

> **NOT EXECUTED in this repository.** No live runs were made and no results exist. This file describes how to run them, so that a later comparison is fair and reproducible. Live runs cost money and model time; they are optional.

## Question

On the same learner prompts, does each configuration produce better courses, at what cost, and how often does it fail?

| Condition | What runs |
|---|---|
| **A · single agent** | The agent with no skill installed, asked to "teach me X as a course of static HTML lessons". |
| **B · baseline pipeline** | The skills at commit `f8aaf973` (`learn` + `lesson-panel` etc.), installed per the README of that commit. |
| **C · Fast** | Current skills, `/learn --fast`. |
| **D · Balanced** | Current skills, default profile. |
| **E · Deep** | Current skills, `/learn --deep`. |

## Inputs

- Cases: [`../fixtures/topics.json`](../fixtures/topics.json) (6 topics × 3 levels). A pilot can use 3 cases (one per level); a decision needs all 18.
- The simulated learner answers the setup interview from the case's `mission`, level and `successCriteria`, and answers the diagnostic with a fixed script per level (beginner: "I don't know" to everything beyond definitions; intermediate: correct on the first half; advanced: correct except the last item). Write the scripts down before the first run and do not change them.
- Unit of work: setup + plan + lesson 1 + lesson 2, each lesson checked with `check.mjs`.

## Fixed settings

- Same model and version for every condition; record the model id and the date.
- Same agent client and version (e.g. Claude Code `x.y.z`), the same tool permissions, network on, a fresh `HOME` and `CLAUDE_CONFIG_DIR` per run.
- Three runs per case and condition (models are stochastic). Report the median and the range.
- Randomise the order of conditions per case.

## Capture per run

| Field | How |
|---|---|
| `run_id`, `case_id`, `condition`, `model`, `client_version`, `date` | recorded by the runner |
| `input_tokens`, `output_tokens`, `cache_read_tokens` per agent context | client usage log or API usage fields |
| `cost_usd` | from the token counts and the price list on the run date (record the price list) |
| `wall_clock_s` per phase (setup, plan, lesson 1, lesson 2) | timestamps |
| `review_rounds`, `escalations` | `.review/` files (C–E); 0 for A and B |
| `failure` | one of: none · crashed · stalled (no progress for 10 min) · wrote into the skill folder · invented a source (a URL that does not resolve or a title that does not match) · check failed at hand-off · asked the learner > 4 setup questions |
| `check_exit`, `lint_errors`, `lint_warnings` | `check.mjs` exit code and `score-workspace.mjs` lint totals |
| `m_pass`, `m_fail`, `m_na` | `score-workspace.mjs` summary |
| `r_scores` | blinded human review, below |
| `workspace_archive` | the produced workspace, zipped, with `.review/` and `NOTES.md` |

Store one JSON line per run in `results/live/<date>-runs.jsonl` and the archives next to it.

## Blinded human review

1. Strip identifying traces from each workspace: delete `.review/`, `NOTES.md` profile lines and anything naming the condition; renumber workspaces with random ids. Keep a sealed key file.
2. Two reviewers per workspace score every R item in [`../rubrics/`](../rubrics/) (0–2) from the lesson files alone, then G2 by opening the cited sources.
3. Disagreements of 2 points go to a third reviewer. Report inter-rater agreement (weighted kappa) per criterion.
4. Optionally a model pre-scores the same R items under the same blinding; report it in a separate column and never merge it into the human score.
5. Unseal the key only after all scores are in.

## Analysis

- Per condition: median cost, median wall-clock, failure rate, M pass rate, R totals, and grounding ship rate (≥ 12/16 with no zero on G1, G2, G5).
- Compare D (the default) with B (the baseline) first; report every condition, including the ones that lose.
- State the sample size next to every number. With 18 cases × 3 runs, differences smaller than the run-to-run range are not findings.

## Not covered

Learning outcomes for real learners (whether people learn more) need a study with participants and are out of scope here.
