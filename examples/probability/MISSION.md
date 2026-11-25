# Mission: Probability & Statistics, by experiment

> Example mission for a shipped example course. It describes a typical learner, not a real person.

## Why
I am a developer who runs A/B tests and reads product dashboards. Today I eyeball them: a bump looks real, a dip looks worrying, and I cannot say how much of either is noise. I want to reason about randomness by simulating it, so I can say how big a wobble should be and how much a "winning" result is worth before I ship on it.

## Success looks like
- Write down the distribution of a metric I care about, sample from it in code, and show how its observed frequencies settle as the sample grows.
- Compute the expected value and the standard error of a dashboard metric, and say how many more users it takes to halve its noise.
- Turn a base rate, a hit rate and a false-alarm rate into the chance that a flagged result (a positive test, a significant experiment) is real.

## Constraints
- About 30 minutes a session, a few sessions a week.
- Comfortable with JavaScript or Python and high-school algebra; no calculus required.
- Prefers experiments to proofs: every formula should come with a simulation that checks it.

## Out of scope
- Hypothesis-test recipes (t-tests, p-value tables) and statistics software.
- Continuous distributions beyond what the standard error needs.
- Bayesian A/B-testing platforms and vendor tooling.
