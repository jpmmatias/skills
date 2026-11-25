# Review: example course "Probability & Statistics, by experiment"

Independent review, 2026-11-25, of `examples/probability/`. Reviewer roles: research-grounding specialist, learning scientist and statistician. I did not write the course. No repository file other than this report was changed.

**Read:** `MISSION.md`, `NOTES.md`, `RESOURCES.md`, `assets/course.js`, the three `lessons/*.html`, the three `*.practice.js` and `*.figures.js` files, `reference/cheat-sheet.html`, `index.html` and `review.html`; the parts of `assets/core.js` (rng), `assets/viz.js` (explorable, histogram) and `assets/practice.js` (answer matching) that the lessons depend on. Rules applied: `skills/learn/references/{lesson-contract,grounding,mastery,teaching-core,visual-design}.md`.

**Executed:**
- My own Node script (`verify.js` and `binom1000.js` in the session scratchpad `rev-prob/`, not reused from the author) recomputes every number on the pages, in the captions, the readouts and the practice answer keys. I re-implemented mulberry32 and both samplers from the algorithm, then re-ran the explorables' experiments over many seeds.
- Playwright and Chromium loaded every lesson from `file://`. I moved the sliders, pressed *New seed*, read the explorables' text alternatives (`.lc-ex-readout`, the same string as the `aria-label`), ran every answer key through the runtime's own `Learncraft.acceptsAnswer`, and checked layout at 390 px. There were no console errors and no horizontal scroll.

**Network:** none used. Where I mention what a cited work actually contains, that comes from my memory and is marked **unverified**.

Severity: **P0** = mathematically wrong statement or wrong answer key · **P1** = misleading or overstated, or wrong grounding status · **P2** = pedagogy · **P3** = polish.

**Bottom line:** every number, formula, worked example and answer key checks out. No answer key is wrong. One explanation makes a false claim about the sampler (CP-01). Two statistical statements are stronger than the mathematics allows (CP-02, CP-03), and one distractor explanation is misleading (CP-04). Three grounding marks claim more than the recorded evidence supports (CP-05 to CP-07).

## Summary

| ID | Sev | Title |
|---|---|---|
| CP-01 | P0 | L1's "why `<` and not `<=`" reveal makes a false claim about what `<=` would do |
| CP-02 | P1 | "Var(X + Y) = Var(X) + Var(Y) only when X and Y are independent": zero covariance is enough |
| CP-03 | P1 | L2 says the SE of one average sizes an arm-to-arm *difference*; the difference has √2 × the noise, and the course never teaches it |
| CP-04 | P1 | Distractor "The next run will have fewer" is in fact about 79% likely; its explanation invites the reverse fallacy |
| CP-05 | P1 | "A common answer is 'about 90%'" is cited to S5, but neither the ledger nor the index evidence supports it |
| CP-06 | P1 | "far more often" is stronger than the recorded support for S5 (ledger L3-C3 says "easier") |
| CP-07 | P1 | L2-C4 is recorded as resting on unverified S2, yet the page neither wraps it nor treats it as derived |
| CP-08 | P2 | L3's faded Bayes item: the answer equals the power (0.8, the confusion the lesson attacks), and the template gives the prior away |
| CP-09 | P2 | No practice item tests the key L2 contrast (expectation adds without independence, variance does not) |
| CP-10 | P2 | L2 carries too much for one 30-minute lesson |
| CP-11 | P2 | L3 challenge criteria 1 and 2 conflict when leaf counts are rounded |
| CP-12 | P2 | L2 challenge: the simulated-data fallback makes criterion 2 empty, and nothing prepares the learner for daily SD > SE |
| CP-13 | P3 | L3 challenge criterion 4 needs the general crossover formula, which the page gives only as one number |
| CP-14 | P3 | L1 "within about 1.5 points … whatever the seed and p" was checked only at p = 0.30 |
| CP-15 | P3 | L3 text says "0.99%" at a 0.1% base rate; the explorable shows "1%" |
| CP-16 | P3 | L2 says the covariance −35/12 "cancels the two variances"; it is 2·Cov that does |
| CP-17 | P3 | l1-lln-streak: "The surplus of 2 heads stays" is imprecise, and the correct option reuses the prose's "swamped" |
| CP-18 | P3 | l2-halve-se asks "how many more users" but its answer is "4 times as many" |
| CP-19 | P3 | l3-interleave-sim-count: the correct option is the longest (length ratio 0.70, outside ±25%) |
| CP-20 | P3 | A/B mapping: "flag 5% … as winners" is a one-sided α; power depends on effect size |
| CP-21 | P3 | "Specificity matters more than sensitivity" needs its scope: for P(condition \| +) |
| CP-22 | P3 | "has moved by less than one standard error: that is ordinary noise" concludes too much |
| CP-23 | P3 | Small grounding and bookkeeping drift (host names, `sources:` value, "open textbooks", claims missing from the ledger, S5 DOI) |
| CP-24 | P3 | NOTES' upstream request asks for a `reseed` that `explorable` already has |
| CP-25 | P3 | L1 histogram draws the PMF as a connected line between integer values |

---

## P0

### CP-01 · P0 · L1 sampler reveal: the `<=` explanation is false

`lessons/0001-distributions-and-sampling.html:114`:
> With `<`, a value whose probability is 0 has an empty slice and can never be returned. With `<=`, a u exactly on an edge would go to the wrong value, and a zero-probability value right after it could be drawn.

**Why it is wrong.** With `<=`, value x is returned when P(X ≤ x−1) < u ≤ P(X ≤ x). A zero-probability value has equal left and right edges, so its slice (a, a] is still empty. A zero-probability value *after* an edge can never be drawn. My script tried pmf `[0.5, 0, 0.5]` with u = 0.5: `<=` returns 0 (the value on the left), not the zero-probability 1. The one zero-probability value `<=` *can* return is the **first** one, when u = 0 exactly, and `rng()` can return 0 (pmf `[0, 0.5, 0.5]`, u = 0 → 0). "The wrong value" is also overstated. Under `<=` an edge hit goes to the left neighbour instead of the right one, and with this generator that has probability 2⁻³² per edge. This is the lesson's only "why does this line exist?" prompt, so its reasoning should be right.

**Corrected text:**
> With `<`, value x owns exactly the slice [P(X ≤ x − 1), P(X ≤ x)), half-open like u itself, so the slices tile [0, 1) and a value with probability 0 owns an empty slice that the loop can never return. With `<=`, the slices become (left edge, right edge], which no longer matches u in [0, 1). A u of exactly 0, which `rng()` can return, would then land on the first value even if its probability is 0, and a u exactly on an edge would go to the value on its left. Edge hits are rare (one chance in 2³² per edge with this generator), but `<` makes the code match the picture exactly.

---

## P1

### CP-02 · P1 · "only when independent" overstates the condition for adding variances

- `lessons/0002-expected-value-and-variance.html:86`: "Var(X + Y) = Var(X) + Var(Y) &nbsp;&nbsp;only when X and Y are independent"
- `:87`: "Variance needs independence."
- `RESOURCES.md:32` (L2-C2): "Var(X + Y) = Var(X) + Var(Y) needs independence"
- `reference/cheat-sheet.html:46`: condition "X, Y independent" (fine as a sufficient condition, but it repeats the same framing)

**Why.** "Only when" makes independence a *necessary* condition, and it is not one. The identity holds exactly when Cov(X, Y) = 0. Counter-example, checked in my script: X uniform on {−1, 0, 1} and Y = X². They are dependent, yet Var(X + Y) = Var X + Var Y = 0.8889. The page's own reveal at `:94` gives the covariance formula, so the box contradicts the reveal.

**Corrected text:**
- `:86`: "Var(X + Y) = Var(X) + Var(Y) &nbsp;&nbsp;when X and Y are independent (more generally, whenever Cov(X, Y) = 0)"
- `:87`: "Variance needs more: independence, or at least zero covariance."
- `RESOURCES.md:32`: "… Var(X + Y) = Var(X) + Var(Y) needs zero covariance, which independence guarantees (counter-example X and 7 − X)"
- cheat sheet `:46` condition: "X, Y independent (or uncorrelated); in general add 2·Cov(X, Y)"

### CP-03 · P1 · The SE of one average is not the noise of an A/B difference

`lessons/0002-expected-value-and-variance.html:29`:
> the standard error of an average tells you how big a day-to-day or arm-to-arm difference pure noise produces, which is exactly what you need before calling an A/B result.

**Why.** For two independent arms (or days), each with SE s, the difference has SE √(s² + s²) = √2·s. With the page's own numbers that is 0.85 points, not 0.6 (n = 2,500 per arm, p = 10%). The course states the opposite and never teaches the difference. The mission is about A/B tests ("how much a 'winning' result is worth"), so a learner who compares an observed lift with one arm's SE will call noise "significant" too often. The tool is already on the page: the rule for variances of independent sums, and practice item `l2-var-difference`.

**Corrected text** for `:29`:
> a conversion rate is an average, and the standard error of an average tells you how much pure noise moves one day's or one arm's number. The difference between two independent arms wobbles √2 times as much, because their variances add. Both are what you need before calling an A/B result.

**Addition** after `:128`:
> Comparing two arms of 2,500 visitors each? Their rates are independent, so the variances add: the difference has SE = √(0.6² + 0.6²) ≈ 0.85 points.

Add one recall item for l2.o2 as well. Prompt: "Two independent arms each have SE 0.6 points. What is the SE of the difference of their rates, in points?" Accept 0.85, tolerance 0.01.

### CP-04 · P1 · "The next run will have fewer": the explanation is misleading

`lessons/0003.practice.js:37`:
> { text: 'The next run will have fewer', why: 'Each run is independent of the last: nothing pulls the next one down to compensate.' }

**Why.** With X ~ Binomial(1000, 0.01), P(next run < 13) = **0.793** (computed exactly). A learner who reasons "13 is above the expected 10, so the next run will probably be lower" is right, by regression to the mean. The feedback tells them the option is wrong only because "nothing pulls the next one down", so it seems to say a lower count is not to be expected. That teaches the reverse error while trying to prevent the gambler's fallacy. The option is also the vaguest of the four (see CP-19).

**Corrected option and why** (new id, per the contract's versioning rule, e.g. `l3-interleave-sim-count-2`):
> { text: 'The next run will be pulled below 10', why: 'Runs are independent: nothing pulls the next one down to make up for this one. A count below 13 is likely next time (about 79% of runs are), but only because 13 is above the expected 10, and that would be just as likely after a run of 7.' }

### CP-05 · P1 · "A common answer is 'about 90%'" is cited to S5 beyond its recorded support

`lessons/0003-conditional-probability.html:59`:
> `<span class="unverified">A common answer is "about 90%"</span><sup>…S5…</sup>`

**Why.** The ledger has no claim for this sentence. `RESOURCES.md:40` says "The index snippets support only that summary, not any specific percentage". S5 studied its own problems with other numbers; from memory (unverified), its mammography problem uses 1%, 80% and 9.6%. So S5 cannot back a claim about which answer people give to *this* illustrative test. The `unverified` span is honest about the status, but the citation still points at a source that does not support the sentence.

**Corrected text:**
> The tempting answer is "about 90%", but 90% is the sensitivity, P(+ | condition), the reverse of what was asked.

No span and no citation: this is the lesson's own reasoning about its illustrative problem.

### CP-06 · P1 · "far more often" exceeds the recorded evidence for S5

`lessons/0003-conditional-probability.html:67`:
> Gigerenzer and Hoffrage argued, with experiments, that people reach the correct answer **far more often** when the same information is given as natural frequencies …

**Why.** The ledger claim (`RESOURCES.md:45`, L3-C3) is "makes the Bayesian answer *easier to reach*". The S5 annotation (`:40`) says the index supports only that frequency formats "raised the share of Bayesian answers" and no figure. "Far more often" is a scope word the evidence does not carry (grounding.md, Verification step 3: "small" is not "small-to-moderate"). From memory (unverified), the paper's effect was large, so the wording may be true. But it has to wait for the fetch.

**Corrected text** (keep the span and the citation):
> Gigerenzer and Hoffrage reported experiments in which more people reached the correct answer when the same information was given as natural frequencies like these than when it was given as probabilities.

### CP-07 · P1 · L2-C4: the ledger says "rests on S2", the page says neither "unverified" nor "derived"

`RESOURCES.md:34`: "L2-C4 · consensus · S2 (unverified) · 'A conversion rate is a sample mean of 0/1 values, so its standard error is √(p(1 − p)/n)'"
`lessons/0002-expected-value-and-variance.html:114`: "Statistics texts call this the standard error of a sample proportion<sup>2</sup>" (no `unverified` span).

**Why.** By the ledger, this claim rests only on an unverified source, so the contract requires the span. In fact the mathematics is derived on the page (Bernoulli variance in the "Your turn" section, then σ/√n). Only the *naming* rests on S2. The grounding status is wrong in one place or the other.

**Corrected text:**
- `RESOURCES.md:34`: "L2-C4 · consensus · — (derived on the page; S2 for the applied-statistics name, unverified) · …"
- `:114`: "… applies with σ = √(p(1 − p)). `<span class="unverified" title="Not independently verified">Applied-statistics texts call this the standard error of a sample proportion</span><sup>2</sup>`:"

---

## P2

### CP-08 · P2 · The faded Bayes item reinforces the confusion it should test

`lessons/0003.practice.js:21-26`: prior 0.2, power 0.8, FPR 0.05, template `0.8 × {{prior}} / (0.8 × 0.2 + {{fpr}} × 0.8) = {{post}}`, answer 0.8.

**Why.**
1. The posterior (0.8) equals the power (0.8) and also P(not real) (0.8). The lesson's central misconception is confusing P(real | win) with P(win | real). A learner who writes the power gets this item right, and one who computes it sees "posterior = power" and may conclude that the two coincide.
2. The prior blank is given away: the template prints `0.8 × 0.2` right next to it, and the prompt states FPR 0.05.

The item is mostly recognition, not retrieval.

**Corrected item** (new id `l3-fade-bayes-2`):
```js
{ id: 'l3-fade-bayes-2', type: 'fade', objective: 'l3.o1',
  prompt: '20% of tested changes truly help (illustrative). Power is 0.7 and 10% of changes that do nothing are flagged as wins. Complete Bayes’ rule for P(real | win), as decimals.',
  template: 'P(real | win) = 0.7 × {{prior}} / (0.7 × {{prior2}} + {{fpr}} × {{notprior}}) = {{post}}',
  blanks: { prior: ['0.2', '.2'], prior2: ['0.2', '.2'], fpr: ['0.1', '.1', '0.10'], notprior: ['0.8', '.8'], post: ['0.636', '0.64', '.636', '.64'] },
  labels: { prior: 'the prior P(real)', prior2: 'the prior again', fpr: 'the false-positive rate', notprior: 'P(not real)', post: 'the result' },
  tolerance: 0.005,
  why: '0.14 / (0.14 + 0.1 × 0.8) = 0.14 / 0.22 ≈ 0.636. Not 0.7: the power is P(win | real), the reverse conditional.' }
```
(0.14 / 0.22 = 0.63636, checked.)

### CP-09 · P2 · No item tests "expectation adds without independence, variance does not"

`lessons/0002.practice.js`: the only sum item, `l2-var-difference`, uses *independent* X and Y. The page puts the contrast at its centre (`:84-95`, "the difference between them matters"), but practice never asks for it. That leaves the contrast at recognition only, and l2.o1 can reach L3 without it.

**Add** (a context the prose does not use):
```js
{ id: 'l2-dependent-sum', type: 'choice', objective: 'l2.o1',
  prompt: 'X = heads and Y = tails in 10 fair flips. What are E[X + Y] and Var(X + Y)?',
  options: [
    { text: 'E = 10 and Var = 0', correct: true, why: 'X + Y is always 10. Linearity still gives E = 5 + 5 = 10; the variances do not add because Y = 10 − X, so Cov(X, Y) = −2.5 cancels them.' },
    { text: 'E = 10 and Var = 5', why: 'That adds Var X = Var Y = 2.5 as if X and Y were independent. They move in opposite directions.' },
    { text: 'E = 5 and Var = 2.5', why: 'Those are the values for X alone.' },
    { text: 'E cannot be added here', why: 'Linearity of expectation needs no independence: E[X + Y] = E[X] + E[Y] always.' } ] }
```
(Var X = 10 × 0.25 = 2.5, the sum of 10 independent Bernoulli variances, which the page teaches.)

### CP-10 · P2 · L2 is overloaded for a 30-minute session

L2 introduces five terms. It covers E, Var and the shortcut formula, a worked and a faded example, three rules for sums, covariance (in the reveal), the σ/√n derivation, an explorable, the SE of a proportion with a table, six practice items and a milestone challenge. L1 and L3 are each about half that. The mission constraint is "About 30 minutes a session" (`MISSION.md:14`). Suggested cut, with no new lesson needed: keep `E[aX + b]` and `Var(aX + b)` on the cheat sheet only, move the covariance reveal into an optional "Go further" `<details>`, and use the space for the arm-difference sentence from CP-03, which the mission needs more.

### CP-11 · P2 · L3 challenge criteria 1 and 2 conflict when counts are rounded

`lessons/0003-conditional-probability.html:113-114`: "The four leaf counts of the tree add up to 1,000 … Bayes' rule … gives the same percentage as the tree, to within 0.1 percentage point."

**Why.** Real detector inputs (for example a base rate of 0.5%, giving 4.75 true flags out of 1,000) produce fractional leaves. A learner who rounds them to whole people, as natural frequencies invite, can miss the 0.1-point tolerance and fail criterion 2 with correct work.

**Corrected text** for criterion 1:
> The four leaf counts of the tree, kept unrounded (decimals allowed), add up to 1,000, and P(real | flagged) is shown as true flags / all flags, as a fraction and as a percentage.

### CP-12 · P2 · L2 challenge: an empty fallback and an uninterpreted comparison

`lessons/0002-expected-value-and-variance.html:138, 144`: "If you cannot share real data, simulate 14 days with your lesson 1 sampler and say so." and criterion 2: "… which is larger and by what factor."

**Why.** If the 14 days are simulated from one fixed p, their SD equals the SE up to noise, so criterion 2 is passed by construction. With real data the daily SD is usually *larger*: the true rate varies by weekday, n varies, and visitors repeat. The lesson never says so, so the learner reports a factor without knowing what it means. That gap is exactly the "how much of a bump is noise" the mission is about.

**Corrected text:**
- Fallback: "… simulate 14 days with your lesson 1 sampler, letting the true rate itself change from day to day (for example a p between 9% and 11%), and say so."
- Criterion 2: "The standard deviation of at least 14 daily values is reported next to the SE, with one sentence saying which is larger and by what factor, and, if the factor is above 1.5, one named reason (the true rate changes by day, n changes by day, or users are counted more than once)."

---

## P3

### CP-13 · L3 challenge criterion 4 needs a formula the page shows only as a number
`:81` gives "near a base rate of 9.1% (0.09 / 0.99)", and the challenge (`:116`) asks for the same thing for the learner's detector. **Add** after the sentence at `:81`: "In general, half the positives are real when sensitivity × base rate = false-positive rate × (1 − base rate), that is at base rate = FPR / (sensitivity + FPR)." (0.09 / 0.99 = 0.0909, checked.)

### CP-14 · "whatever the seed and p" was checked at one p
`lessons/0001-distributions-and-sampling.html:122`: "at 10,000 draws every bar sits within about 1.5 points of its line, whatever the seed and p." My rerun (mulberry32, p = 0.05…0.95, seeds 1–500) found 26 of 9,500 runs above 1.5 points (0.27%), with a worst case of 2.04 points (p = 0.80, seed 399). The parenthetical check is accurate for p = 0.30 (seeds 1–200: median 10.1 at 30 draws, maximum 1.36 at 10,000). **Corrected:** "at 10,000 draws every bar almost always sits within about 1.5 points of its line, whatever p you choose."

### CP-15 · "0.99%" in the text, "1%" in the readout
`lessons/0003-conditional-probability.html:81`: "0.99% at a base rate of 0.1%". The explorable formats to one decimal place and shows "P(condition | +) = 1%" (`0003.figures.js:61` `pc()`; observed in Chromium). **Corrected:** "about 1% (0.99%) at a base rate of 0.1%", or let `pc()` keep two significant figures below 10%.

### CP-16 · Which term cancels
`lessons/0002-expected-value-and-variance.html:94`: "For Y = 7 − X it is −35/12, which exactly cancels the two variances." Cov = −35/12, and it is **2·Cov = −35/6** that cancels 35/12 + 35/12. **Corrected:** "For Y = 7 − X it is −35/12, so 2·Cov(X, Y) = −35/6 exactly cancels the two variances."

### CP-17 · l1-lln-streak: wording and cue
`lessons/0001.practice.js:32`: "The surplus of 2 heads stays". The *expected* surplus stays at 2, but the actual surplus keeps wandering (its typical size grows like √n). What shrinks is the surplus *divided by n*. The correct option also reuses the prose's distinctive word "swamped" (`.html:123`), a recognition cue (lesson-contract: "do not reuse the prose's exact sentences"). **Corrected** text: "It heads toward 0.5, as the early 7 of 10 become negligible". **Corrected** why: "Later flips neither cancel nor keep the 2 extra heads; they add their own ±noise. Divided by 10,000 flips, any such surplus is tiny. That is how frequencies converge."

### CP-18 · "how many more users"
`lessons/0002.practice.js:24`: "how many more users do you need?" with the answer "4 times as many". Read literally, "how many more" is 3× more. **Corrected:** "To cut it in half, how many users do you need in total?"

### CP-19 · Length cue
`l3-interleave-sim-count`: option lengths are 33/23/28/28 characters (min/max ratio 0.70), and the correct option is the longest, which breaks the contract's ±25% rule. The CP-04 rewrite (36 characters) and "The generator must be biased" (28) bring the set to 33/28/28/36 (ratio 0.78), with the correct option no longer the longest.

### CP-20 · A/B mapping assumptions
`lessons/0003-conditional-probability.html:84`: "flag 5% of changes that do nothing as winners". A standard two-sided test at α = 0.05 flags 2.5% of null changes as *winners*, which with the page's other inputs gives P(real | win) = 78.0%. Power is also a property of one effect size. Both numbers are labelled illustrative, so nothing is wrong, but the footer question at `:132` points the learner at exactly this. **Add:** "(a one-sided 5% test; a two-sided 5% test flags 2.5% as wins and 2.5% as losses. Power here means the power for the size of improvement a helpful change typically has.)"

### CP-21 · Scope of "specificity matters more"
`lessons/0003-conditional-probability.html:81` and `reference/cheat-sheet.html:62`. This is true for P(condition | +): at a 1% base rate, raising specificity to 99.9% gives 90.1%, while raising sensitivity to 99.9% gives only 10.1% (computed). For trusting a *negative*, sensitivity matters more. **Corrected:** "when the condition is rare, specificity matters more than sensitivity for how far you can trust a positive."

### CP-22 · "that is ordinary noise"
`lessons/0002-expected-value-and-variance.html:128`. Being within one SE shows the reading is *consistent with* noise around 10%, not that it *is* noise. **Corrected:** "… has moved by less than one standard error: well within what noise alone produces."

### CP-23 · Grounding bookkeeping
- `RESOURCES.md:3` says DNS failed for `math.dartmouth.edu`, but S3's link (`:14`) is on `chance.dartmouth.edu`. Name the host that was actually tried.
- `NOTES.md:9` says `sources: unverified`. grounding.md (offline policy, step 5) asks for `sources: pending`.
- `lessons/0001-distributions-and-sampling.html:122` calls S1 and S3 "both open textbooks". S1 is a CRC Press book whose free online edition is itself an unverified claim (`:146`). Corrected: "in both textbooks below".
- The CLT sentence (`0002…html:111`, wrapped, citing S1) and the free-edition sentence (`0001…html:146`) have no ledger ids. Add L2-C5 and L1-C4, so every wrapped sentence can be traced (grounding.md, Traceability).
- S5: the reviewer recalls (unverified) DOI 10.1037/0033-295X.102.4.684. Add it to the Verification debt item as the identifier to confirm. The `pages.ucsd.edu/~scoulson/…` "open copy" is a course-page PDF whose availability and permission are unchecked; prefer the DOI once it is confirmed.

### CP-24 · Stale upstream request
`NOTES.md:27`: "A `reseed` option on `explorable` would save every course this code." `assets/viz.js:33` and `:372-374` already provide `reseed(seed?)`. The figures ignore the `rng` that `render` receives and keep their own seed, so a button would still be needed. Narrow the note to "explorable has `reseed()` but no built-in *New seed* button".

### CP-25 · PMF drawn as a continuous line
L1's histogram (`Learncraft.histogram`, `viz.js:398`) joins the PMF dots with a dashed polyline, which suggests values between the integers. Dots only, or short dashed ticks per bar, would match a PMF. This is a shared-component choice, so it belongs upstream rather than in this course.

---

## Verified correct

All of the following agree with my independent recomputation (`verify.js`: every check passed; `binom1000.js` for n = 1,000).

**Lesson 1**
- 3-fair-flip PMF 1/8, 3/8, 3/8, 1/8. P(X ≥ 2) = 1/2. Practice P(X ≤ 1) = 0.5.
- Binomial(5, 0.2) = 0.32768, 0.4096, 0.2048, 0.0512, 0.0064, 0.00032 (sum 1). Binomial(5, 0.5) = 1, 5, 10, 10, 5, 1 over 32 (0.3125 for k = 2 and 3).
- "Your turn" with 3 visitors: 0.512, 0.384, 0.096, 0.008. Faded 2 flips at p = 0.3: 0.49, 0.42, 0.09.
- Numberline: u = 0.7 → X = 2, with slice edges 0.125, 0.5, 0.875. Practice: u = 0.62 on (0.49, 0.42, 0.09) → 1.
- P(≥ 7 heads in 10) = 176/1024 = 0.172 ("about 17%").
- Explorable checks: at p = 0.30, seeds 1–200, the median worst gap at 30 draws is 10.1 points and the maximum at 10,000 draws is 1.36 points (the page says 10.1 and "never exceeded 1.4"). The inverse-CDF sampler walks the exact binomial PMF with one uniform per draw, and a larger n extends the same stream, as the comment says. The readout (seed 7: largest gap 7.5 points at 30 draws, 0.8 at 10,000) is consistent with the text.
- Order and `<` logic: "first value where the running total exceeds u" matches `u < total`, and the code is correct (only its explanation, CP-01, is not).
- The law of large numbers is stated as convergence of shares with independent draws, with "swamped, not corrected". There is no gambler's-fallacy implication in the lesson text.

**Lesson 2**
- Die: E = 3.5, E[X²] = 91/6 ≈ 15.167, Var = 35/12 ≈ 2.917, σ ≈ 1.708.
- Bernoulli: E = p, Var = p(1 − p); at p = 0.1, Var = 0.09 and σ = 0.3.
- Two independent dice: Var = 35/6 ≈ 5.83, σ ≈ 2.42 (by enumerating all 36 pairs). Cov(X, 7 − X) = −35/12.
- E[aX + b] and Var(aX + b) are correct. Linearity is stated correctly as holding "always". The derivation of E[X̄] = μ and Var(X̄) = σ²/n is correct, and the SE is correctly tied to the mean of independent draws.
- SE for 25 rolls 0.342, for 100 rolls 0.171. Bracket 0.85 → 0.43 from n = 4 to n = 16. Table 0.03, 0.015, 0.006, 0.003. 10.5% vs 10% at n = 2,500 is 0.5 < 0.6. 4 × 2,500 = 10,000.
- Practice: E = 0.7, Var = 1.1 − 0.49 = 0.61, Var(X − Y) = 8, SE = 0.4/20 = 0.02, √2 → 2^¼ ≈ 1.19, √8 ≈ 2.83. All the per-option explanations are correct.
- Explorable: dice are `1 + floor(6u)` with mulberry32 / 2³² (bias at most 4 in 2³²), and experiments use disjoint 100-roll blocks, so they are independent. The exact overlay is a convolution, binned with the same `bin()` as the simulation, and my own convolution agrees.
- Seeds 7, 8, 9: worst |SD/SE − 1| is 3.0%, 1.6% and 5.3% (the page says "within 6%"). Over seeds 1–300 × 8 values of n, 10 of 2,400 cells exceed 6% (worst 8.1%), so "within a few percent" is fair.
- Exact share within ±σ/√n is 65.6–70.6% across the slider's n, consistent with "about two-thirds". The CLT is mentioned without overclaiming.

**Lesson 3**
- P(X = 3 | X ≥ 2) = 1/4. Worked tree: 100 / 9,900, then 90 and 891, so 90/981 = 9.17%. Bayes: 0.009/0.0981 ≈ 0.092.
- P(condition | +) at base rates 0.1%, 1%, 10%, 50%: 0.99%, 9.17%, 52.6%, 90.9%. The crossover base rate 0.09/0.99 = 9.09% gives exactly 50%.
- Specificity 99.9%: 9.9 false positives and 90.1%.
- A/B example: 80/125 = 0.64; a 30% prior gives 87.3%; a 5% prior gives 45.7%.
- Practice: 19/117 = 16.2%; 900/1,710 = 52.6%; 0.16/0.2 = 0.8; 0.3/30 = 1 point; SD of Binomial(1000, 0.01) = 3.15 ("≈ 3.1"); P(7 ≤ X ≤ 13) = 0.737 ("routine").
- Simulation: one uniform for the condition and one for the test, with the correct branch probabilities. Readouts in Chromium match the exact tree at every base rate tried.
- Challenge criterion 3: given m flags, true flags ~ Binomial(m, q), so the ±3 SE band is valid. For m = 100 and q = 0.64 its coverage is 0.998.
- Base-rate neglect is taught with natural frequencies first and Bayes' rule second, and "Predict first" precedes the explorable. Pedagogically sound.

**Answer keys in the runtime** (`Learncraft.acceptsAnswer`, Chromium): every intended answer is accepted, plus sensible variants (`.5`, `1/2`, `0.50`, `0.420`, `16%`, `1.0`, micro sign `µ` for `μ`). Plausible wrong answers are rejected: 0.6 or 0.62 for 0.61, 0.021 for 0.02, 18 for 16. Tolerances are sensible. Each recall prompt names its unit, so percent and decimal answers are not confused.

**Contract checks:** at least 3 items per objective with at least 1 non-choice item in every lesson. Interleaving is present in L3 (l2.o2, l1.o2). Each lesson has a worked → faded sequence and one "why does this line exist?" prompt. Each challenge has 3–4 observable criteria on the learner's own data. Options are shuffled at runtime. Each lesson has a primary source and a Go deeper list of 3 links. Every figure has a text alternative built from the same data. Pages work at 390 px with no horizontal scroll, and there are no console errors.

**Grounding:** every source is marked unverified, with reasons and Verification debt entries. Claims L1-C3 and L3-C3 carry the span on the page. Derived results (L1-C1, C2; L2-C1 to C3; L3-C1, C2, C4) are presented as derived, and illustrative inputs are labelled illustrative. Titles, authors and years for S1 to S5 match the reviewer's recollection (unverified). The exceptions are listed in CP-05 to CP-07 and CP-23.
