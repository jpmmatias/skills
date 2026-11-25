# Probability & Statistics, by experiment — Resources

This file is part of a shipped **example course**. It was researched on 2026-11-25 in an authoring environment whose network allowlist blocked every source host (DNS lookups failed for projects.iq.harvard.edu, www.openintro.org, seeing-theory.brown.edu and math.dartmouth.edu; the hosts in the links below for S1, S2, S3 and S5 were then not tried). No source page was opened, so **every entry is unverified**. Titles, authors and links come from a search index (`index-only`), never from memory alone.

How the lessons use these sources: the mathematics in the lessons (definitions, expected value, variance, standard error, Bayes' rule) is standard and is **derived on the page and checked numerically** (a Node script recomputed every number, and the in-page simulations reproduce them). The books below are where to read it properly; they are not the authority for the numbers. Claims that rest only on a source (what a study found, what a site contains) are wrapped in the `unverified` mark in the lessons.

## Knowledge

### Lesson 1 — Distributions and sampling
Researched 2026-11-25 · offline (host allowlist) · 0 of 4 fetches

- [S1] [Introduction to Probability, Second Edition](https://www.routledge.com/Introduction-to-Probability-Second-Edition/Blitzstein-Hwang/p/book/9781138369917) — Joseph K. Blitzstein & Jessica Hwang / CRC Press (Chapman & Hall/CRC Texts in Statistical Science), 2019 · book 620+ pp · tier T2 · unverified (blocked: projects.iq.harvard.edu; identity index-only) · open copy: free online edition at probabilitybook.net, according to the Harvard Stat 110 course page as summarised by the search index (not opened)
  The textbook behind Harvard's Stat 110: random variables and PMFs, expectation, variance, conditional probability and Bayes' rule, all with many worked problems. Assumes one semester of calculus. Use for: the definitions in all three lessons, as the place to read the full treatment. **Primary source for L1–L3**
- [S3] [Introduction to Probability (Grinstead & Snell)](https://chance.dartmouth.edu/teaching_aids/books_articles/probability_book/book.html) — Charles M. Grinstead & J. Laurie Snell / American Mathematical Society, second edition; free under the GNU Free Documentation License · book · tier T2 · unverified (index-only; a copy on math.dartmouth.edu was blocked, chance.dartmouth.edu not tried)
  An open probability text that leans on computer simulation throughout, which suits this course's "experiment first" approach. Use for: discrete distributions, simulation, the law of large numbers.
- [S4] [Seeing Theory: A Visual Introduction to Probability and Statistics](https://seeing-theory.brown.edu/) — Daniel Kunin, with Jingru Guo, Tyler Dae Devlin and Daniel Xiang / Brown University · playground, 6 chapters · tier T3 · unverified (blocked: seeing-theory.brown.edu; identity index-only)
  Interactive D3 visualisations, by the index's description grouped into chapters such as Basic Probability, Compound Probability, Probability Distributions and Frequentist Inference. The index describes the site as archived for reference. Use for: a second hands-on view of chance events, expectation and the central limit theorem.

Claims L1:
- L1-C1 · consensus · — (derived on the page) · "A PMF assigns each value a probability ≥ 0 and the probabilities add up to 1; the probability of an event is the sum over its values"
- L1-C2 · consensus · — (derived on the page) · "Walking the cumulative sum of a PMF with one uniform number u in [0, 1) draws a value with exactly the PMF's probabilities"
- L1-C3 · consensus · S1, S3 (unverified) · "Empirical frequencies converge to the probabilities as the number of independent draws grows (law of large numbers); a short run is not corrected by later draws"
- L1-C4 · supported · S1 (unverified) · "A free online edition of S1 is at probabilitybook.net, according to the Stat 110 course page"

### Lesson 2 — Expected value and variance
Researched 2026-11-25 · offline (host allowlist) · 0 of 1 fetches

- [S2] [OpenIntro Statistics, 4th edition](https://leanpub.com/os) — David Diez, Mine Çetinkaya-Rundel & Christopher Barr / OpenIntro, 2019 · book · tier T2 · unverified (index-only; www.openintro.org was blocked, leanpub.com not tried)
  An introductory statistics text, licensed CC BY-SA according to the University of Minnesota Open Textbook Library listing in the index. Its chapters on random variables and on point estimates cover expected value, variance and the standard error of a sample proportion. The index also reports a 2025 price change for the PDF; check before relying on it being free. Use for: standard error of a proportion, in the vocabulary of applied statistics.

Claims L2:
- L2-C1 · consensus · — (derived on the page) · "E[X] = Σ x·P(X = x); Var(X) = E[X²] − (E[X])²; a fair die has E = 3.5, Var = 35/12 ≈ 2.917, SD ≈ 1.708"
- L2-C2 · consensus · — (derived on the page) · "E[X + Y] = E[X] + E[Y] for any X, Y; Var(X + Y) = Var(X) + Var(Y) needs zero covariance, which independence guarantees (counter-example X and 7 − X)"
- L2-C3 · consensus · — (derived on the page, checked by simulation) · "The mean of n independent draws has standard error σ/√n; halving it takes 4× the sample"
- L2-C4 · consensus · — (derived on the page; S2 for the applied-statistics name, unverified) · "A conversion rate is a sample mean of 0/1 values, so its standard error is √(p(1 − p)/n)"
- L2-C5 · consensus · S1 (unverified) · "The distribution of the sample mean approaches a bell shape as n grows (central limit theorem); the textbooks prove it"
- L2-C6 · consensus · — (derived on the page) · "The difference of two independent arms has SE √(SE_A² + SE_B²), √2 × one arm's SE for equal arms (0.85 points at 2,500 visitors per arm and 10%)"

### Lesson 3 — Conditional probability and base rates
Researched 2026-11-25 · offline (host allowlist) · 0 of 1 fetches

- [S5] [How to improve Bayesian reasoning without instruction: Frequency formats](https://serval.unil.ch/notice/serval:BIB_285729DDD792) — Gerd Gigerenzer & Ulrich Hoffrage / Psychological Review 102(4), 684–704, 1995 · paper 21 pp · tier T1 · unverified (index-only; not fetched after the allowlist blocked the other hosts) · open copy: https://pages.ucsd.edu/~scoulson/203/GG_How_1995.pdf
  The paper that argues Bayesian inference is easier when the information is given as natural frequencies (counts out of a population) than as single-event probabilities, and reports experiments in which frequency formats raised the share of Bayesian answers. The index snippets support only that summary, not any specific percentage, so the lesson quotes no figures from it. The link is a university library record; the DOI recalled by the reviewer is listed under Verification debt, unconfirmed.

Claims L3:
- L3-C1 · consensus · — (derived on the page) · "P(A | B) = P(A and B) / P(B); Bayes' rule P(A | B) = P(B | A)·P(A) / P(B), with P(B) from the law of total probability"
- L3-C2 · consensus · — (derived on the page) · "With prevalence 1 %, sensitivity 90 % and specificity 91 % (illustrative), P(condition | positive) = 90 / 981 ≈ 9.2 %"
- L3-C3 · supported · S5 (unverified) · "Presenting the same information as natural frequencies makes the Bayesian answer easier to reach than presenting it as probabilities"
- L3-C4 · consensus · — (derived on the page) · "With 10 % of changes truly helping, 80 % power and a 5 % false-positive rate (illustrative), 64 % of significant wins are real"

## Wisdom (Communities)

- None listed. This is an example course with no learner; a real course asks the learner whether they want communities and records the answer here.

## Gaps

- No source was opened in the authoring session: all five entries need a fetch (see Verification debt).
- L1–L3: no video was looked for; videos are never listed from memory. Candidates to search for: the Stat 110 lecture videos by Joe Blitzstein.
- Chapter and section locators for S1–S3 are not given because no copy was opened.

## Verification debt

- S1: open the free online edition (probabilitybook.net) and the Routledge page; confirm the title, edition and that the online edition is still free; record chapter locators for random variables, expectation and conditional probability.
- S2: open openintro.org; confirm the edition, the licence and whether the PDF is still free; record the section on the standard error of a proportion.
- S3: open the Dartmouth CHANCE page; confirm the licence and record chapter locators for discrete distributions and the law of large numbers.
- S4: open seeing-theory.brown.edu; confirm the chapter names and that the site still runs.
- S5: open the paper; confirm title, volume, issue and pages; confirm the DOI recalled by the reviewer (10.1037/0033-295X.102.4.684, unconfirmed) and then prefer it over the UCSD course-page copy, whose availability and permission are unchecked; check that the lesson's one-sentence summary (L3-C3) matches the abstract.
