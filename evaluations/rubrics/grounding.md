# Grounding rubric

Source: [raw/04-grounding.md C7](../../docs/audit/raw/04-grounding.md#c7-grounding-evaluation-rubric), with the deterministic steps of [C4](../../docs/audit/raw/04-grounding.md#c4-citation-verification-workflow). Score each lesson 0–2 per criterion. **Ship at ≥ 12/16 with no zero on G1, G2 or G5.**

The scorer can only check structure: that a citation exists, which tier and status its `RESOURCES.md` entry claims, and URL syntax. It never fetches anything, so it cannot tell whether a source says what the lesson claims. A G-score from the scorer is therefore an **upper bound** on G1/G3/G4/G5/G6; a reviewer must confirm fidelity (G2) and link resolution (the R half of G5).

| # | Criterion | 0 | 1 | 2 | M/R | Scorer (deterministic part) |
|---|---|---|---|---|---|---|
| G1 | Coverage | Factual claims have no `data-src` | Most are cited | Every factual or numeric claim is cited, marked illustrative, or marked `data-grounding="explanation"` | M (partial) | `scorers.G1`: paragraphs, list items, cells and captions with numbers and no `data-src`, `data-grounding` or `.illustrative` (practice and the challenge are excluded) |
| G2 | Fidelity | A source contradicts a claim, or a number is wrong | The wording overreaches the source (scope words) | The claim matches the quote and locator exactly | R | — |
| G3 | Tier | The claim rests on T4/T5 only | T3 | T1/T2 for every number and core claim | M (as recorded) | `scorers.G3`: tiers of the cited entries as written in `RESOURCES.md` |
| G4 | Verification status | Unverified sources presented as checked | Unverified sources, correctly marked | All verified | M (as recorded) | `scorers.G4`: statuses of cited entries; `.unverified` markers in the lesson |
| G5 | Link integrity | A link points at the wrong work or is dead | Resolves, but not to the most stable form | Resolves to the claimed work (DOI or canonical URL) | M (syntax) + R (resolution) | `scorers.G5`: missing or placeholder URLs score 0; `http:`, tracking parameters or malformed DOIs score 1 |
| G6 | Currency | Version-sensitive facts with no version scope | Scoped but stale | Scoped, fresh, and matches the learner's environment | M (partial) | `scorers.G6`: docs/api/tool entries need a version; verified dates older than 180 days (90 for docs/api/tool) |
| G7 | Epistemic status | Disputed findings stated as settled | Disputed, with no counter-source | Strength shown, with a counter-source for disputed claims | R | — |
| G8 | Injection hygiene | Fetched instructions or commands reached a lesson or lab | Quotes too long, or contain imperatives | Annotations in the agent's own words; commands reviewed | R | — |

The workspace linter also enforces the C4 structural steps as errors: every `data-src` resolves to an `[Sn]` entry (`cite-unresolved`), ids are unique (`resource-id-dup`) and every entry carries `verified YYYY-MM-DD` or `unverified (reason)` (`resource-status`).
