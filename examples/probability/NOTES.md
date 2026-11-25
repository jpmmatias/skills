# Notes

lang: en
profile: balanced
theme: default (assets/theme.css unchanged)
example: true — shipped example course; no learner, no diagnostic, no learning records, no progress
diagnostic: not applicable (example course)
environment: none needed. Every experiment runs in the browser from file:// with the seeded generator `Learncraft.rng`; the challenges ask for a short script in the learner's own language (JavaScript or Python).
sources: pending — the authoring session (2026-11-25) could not open any source host (DNS blocked by the network allowlist). See `RESOURCES.md` → Verification debt.

## Per-lesson decisions

- L1: no scene — an explorable instead (sliders for the success probability and the number of draws, a new-seed button): the insight comes from changing n and watching the histogram settle on the PMF, not from watching a fixed animation | requires: — | challenge: milestone m1
- L2: no scene — an explorable instead (slider for n, a new-seed button): 1,000 simulated sample means narrow as n grows, with the exact distribution and a ±σ/√n bracket overlaid | requires: l1.o1, l1.o2 | challenge: milestone m2
- L3: no scene — an explorable instead (sliders for base rate, sensitivity and specificity, a new-seed button): an exact natural-frequency tree for 10,000 people next to one simulated population of 1,000 | requires: l2.o2 (interleaved), l1.o2 (interleaved) | challenge: milestone m3

## Accuracy

Every number a lesson states was recomputed by a Node script during authoring (formulas, worked and faded examples, practice answers). Simulated figures are labelled "simulated" and are reproducible per seed. Illustrative inputs (prevalence, sensitivity, the share of experiments that truly help) are labelled "illustrative" on the page.

## Preferences

- Experiments before formulas; formulas always checked against a simulation.

## Upstream

- `Learncraft.explorable` has `reseed()` but no built-in *New seed* button; each figure here adds its own button (and keeps its own seed, because it draws its sample from a cached per-seed stream rather than the `rng` passed to `render`).
- `Learncraft.histogram` joins the expected values with a dashed polyline, which suggests values between the integers; for a PMF, dots or a short tick per bar would be more faithful (review CP-25).
- `diagram.js` bars: `data-bars` keys that look like integers ("1", "2") are reordered ahead of other keys by JavaScript object ordering; accept an array of pairs or document it.
- Recall items could accept both units with per-entry `{ answer, tolerance }`; these lessons ask for one unit instead, to keep the prompt unambiguous.
