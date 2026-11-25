# Handoff: workstream F3 (example course: Probability & Statistics, by experiment)

## Agent
Example-course author, F3 (Agent 03 pedagogy / 04 grounding / 07 visual hats).

## Task
Hand-author a public example course in `examples/probability/`: 3 lessons (distributions and sampling; expected value and variance; conditional probability and base rates), each with interactive seeded experiments, practice data, a transfer challenge and citations. Course marked `example: true`, with no learner data. Verify every number. Own only `examples/probability/` and this handoff.

## Status
Done. Lint clean, browser check clean on all 6 pages, every practice item completed once by keyboard. Not committed.

## Files created (all under `examples/probability/`)
- `assets/`: a byte-identical copy of `skills/learn/starter/assets/`, except `assets/course.js` (the course manifest: v2, `id: 'probability-example'`, `lang: 'en'`, `example: true`, 3 milestones (m1 `in-progress`; m2 and m3 `locked`; `evidence: null`), 3 lessons, 5 objectives).
- `index.html`, `review.html`: from the templates.
- `MISSION.md`: an example mission, labelled as describing a typical reader. `NOTES.md`: lang, profile, per-lesson motion decisions, accuracy note and `## Upstream` proposals. `RESOURCES.md`: S1–S5, all unverified, with claims ledger, gaps and verification debt.
- `reference/cheat-sheet.html`: vocabulary, formulas and rules of thumb.
- `lessons/0001-distributions-and-sampling.html`, `0001.practice.js`, `0001.figures.js` (`pmf-sampler`: sliders for p and n, New seed; a histogram against the binomial PMF, plus a running-share line on a log axis; draws use the lesson's inverse-CDF sampler).
- `lessons/0002-expected-value-and-variance.html`, `0002.practice.js`, `0002.figures.js` (`mean-narrowing`: a slider for n, New seed; 1,000 simulated means of n dice, the exact distribution by convolution, a bracket at 3.5 ± σ/√n; the readout compares the simulated SD with σ/√n).
- `lessons/0003-conditional-probability.html`, `0003.practice.js`, `0003.figures.js` (`bayes-tree`: sliders for base rate, sensitivity and specificity, New seed; an exact natural-frequency tree for 10,000 people and one simulated icon array of 1,000 people).

Every lesson has a goal (`#progress`), mission tie-in, pre-training terms, a worked example then a faded one (answer in `<details>`), a "why does this line exist?" prompt, 6 practice items (choice, recall, order and fade; per-option `why`; numeric `tolerance`; unique ids; 2 interleaved items in L3), a milestone `#challenge` (`data-kind="milestone"`, `data-milestone`, h3 *What to send back*, h3 *Pass criteria* with `ol.criteria` of 3–4 items), primary source, Go deeper and neighbour links. Motion: no scenes. Each lesson uses an explorable instead, and `NOTES.md` records why. Every simulation is labelled "simulated", is deterministic per seed and has a text alternative that states the numbers.

## Sources
All source hosts were blocked by the session's network allowlist: DNS failed for projects.iq.harvard.edu, www.openintro.org, seeing-theory.brown.edu and math.dartmouth.edu. Identities come from WebSearch snippets only. Nothing is `verified`.

| Id | Title | Status | Backs |
|---|---|---|---|
| S1 | Blitzstein & Hwang, *Introduction to Probability*, 2nd ed. (CRC, 2019), Routledge page | unverified (blocked: projects.iq.harvard.edu; identity index-only) | primary source L1–L3; "LLN / CLT are proved there" (wrapped in the unverified span) |
| S2 | Diez, Çetinkaya-Rundel & Barr, *OpenIntro Statistics*, 4th ed., leanpub.com/os | unverified (blocked: www.openintro.org; identity index-only) | naming of "standard error of a sample proportion" (L2) |
| S3 | Grinstead & Snell, *Introduction to Probability* (AMS; GNU FDL), Dartmouth CHANCE page | unverified (blocked: math.dartmouth.edu; identity index-only) | LLN reading (L1), Go deeper |
| S4 | *Seeing Theory* (Kunin et al., Brown) | unverified (blocked: seeing-theory.brown.edu; identity index-only) | Go deeper only |
| S5 | Gigerenzer & Hoffrage (1995), "How to improve Bayesian reasoning without instruction: Frequency formats", *Psychological Review* 102(4), 684–704; UNIL library record, plus a UCSD open copy | unverified (index-only; not fetched once the other hosts failed) | the natural-frequency claim and the "common answer is 90%" claim in L3, both in the unverified span; no figures quoted from the paper |

All mathematics is presented as derived on the page and checked numerically, so it does not rest on the unverified sources. The DOI of S5 was not confirmed and is not given. Page counts from memory were removed.

## Numeric checks performed
- Script `numbers.mjs` (scratch). It recomputes:
  - binomial PMFs: 3 fair flips; 2 flips at p = 0.3; 3 and 5 trials at p = 0.2; 5 at p = 0.5;
  - P(X ≤ 1) = 0.5; the sampler at u = 0.62 → 1;
  - the die: E = 3.5, E[X²] = 91/6, Var = 35/12, σ = 1.708;
  - two dice: Var = 35/6, by formula and by enumerating all 36 pairs; Cov(X, 7 − X) = −35/12;
  - practice values: E = 0.7, Var = 0.61; SE = 0.02 (p = 0.2, n = 400); SE table 0.03 / 0.015 / 0.006 / 0.003; brackets 0.854 and 0.427;
  - Bayes: 9.17% (1%, 90%, 91%), with the sweep 0.99 / 9.17 / 52.63 / 90.91%; 90.09% at 99.9% specificity; the 50% crossover at 0.09/0.99 = 9.09%;
  - A/B: 0.64, 0.873 and 0.457; practice 19/117 = 16.2% and 0.8; √(1000 · 0.01 · 0.99) = 3.15; P(≥ 7 heads in 10) = 0.172.
- Script `sim.mjs` (scratch). It runs `assets/core.js` `Learncraft.rng` in Node `vm` and replicates the figures:
  - L1: the worst bar gap over 200 seeds at p = 0.30 has median 10.1 points at n = 30 and max 1.36 at n = 10,000 (max 1.37 over every p, 50 seeds). The prose states these.
  - L2: the simulated SD of means is within 6% of σ/√n for seeds 7–9 at every n; 65–73% of means fall within ±SE.
  - L3: seed 7 at the defaults gives 13 people with the condition, 11 TP and 89 FP. This matches what the page renders.
- Keyboard run (`kb.cjs`, Playwright, 390 px):
  - all 18 items answered right by Tab/Enter/typing only; set counters show 6/6;
  - in every explorable, a slider (ArrowRight) and New seed (Enter) changed the readout;
  - no horizontal overflow, no console errors; smallest rendered explorable SVG text is 12 px in light and dark.

## Claims least sure of
- S1's free online edition at probabilitybook.net: from a search summary of the Stat 110 page, wrapped as unverified.
- S2's licence (CC BY-SA) and price status: index snippets conflict about a 2025 price change. Flagged in RESOURCES.md.
- S5's one-sentence summary and "a common answer is about 90%": consistent with the index abstract, not checked against the paper. Both are in the unverified span.
- "Seeing Theory has a Compound Probability chapter" rests on the index only, and is worded that way.
- The L2 challenge asks the learner to compare SE with the day-to-day SD. Real dashboards are often more variable than SE predicts, because of day effects and dependence. The criteria ask only for the comparison, not for agreement.

## Validation and results
- `node skills/learn/starter/tools/lint-workspace.mjs examples/probability`: clean, 0 errors and 0 warnings. This followed one round fixing two `choice-option-parity` warnings.
- `node scripts/validate.mjs`: 0 findings for `examples/probability`. The run fails overall on 8 errors that belong to other workstreams:
  - README `media/readme/*.png` missing;
  - broken relative links in `docs/audit/reviews/skills-architecture-pedagogy.md`;
  - `examples/transformers` lesson 3 practice file missing.
- `check.mjs examples/probability`: run with Playwright and axe from the scratch tools folder via `LEARNCRAFT_TOOLS_DIR`, and Chromium from /opt/pw-browsers. Nothing was added to the repo.
  - Result: all 6 pages ✓; axe reports no violations, only "needs manual review" nodes.
  - The first run flagged `scrollable-region-focusable` on the L1 code block. Fixed with `tabindex="0"` and an `aria-label`.
- Screenshots reviewed: every element shot at 900 px, the dark full pages, and the explorables at 390 px in light and dark under reduced motion.
  - Fixed after review: bars ordering (see the runtime bugs below) and the running-chart label overlapping the line.
  - `examples/probability/.check/` deleted afterwards.

## Known limitations
- No source was opened; every status is unverified, and RESOURCES.md lists the verification debt.
- No motion scenes, by decision: the learner learns by changing a variable.
- The explorables have no graded target (`explorable` `target`). Practice items carry the evidence instead.
- `index.html` shows both my example note and the runtime's "Example course" banner. This is slightly redundant, but the note adds the MISSION.md disclaimer.
- The icon array distinguishes groups by shape (filled dot, ring, square, small dot) as well as colour. Its legend sits inside the explorable's `role="img"` figure, so screen readers get the numbers from the `aria-label` and readout, not from the legend.

## Runtime bugs and gaps found (not fixed; outside ownership)
1. **`diagram.js` bars reorder integer-like keys.** `data-bars` is parsed into a plain object, so JSON keys like `"1"`, `"2"` are enumerated before `"0 sign-ups"`: JS orders integer-like keys first. The bars came out in the order 1, 2, 3, 4, 5, then "0 sign-ups", silently. Workaround: non-numeric keys (`"k = 0"`). Fix: accept an array of `[label, value]` pairs, or document it.
2. **`explorable` has no reseed option.** Each figure adds its own New seed button and calls `update()`, and must keep the seed in closure, because `o.seed` is read once. Proposed in NOTES.md `## Upstream`.
3. **`recall` has a single `tolerance` for every accepted answer.** An item cannot accept both `0.16` and `16` (percent) with sensible tolerances. Prompts here name the unit instead.
4. **`explorable` target recording.** `core.js` `ctxFor()` provides no `ctx.record`, so a target's first attempt falls back to `Learncraft.recordPractice` or `Progress.record` (a legacy id). Observed in code only; targets are not used in this course.
