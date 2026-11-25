# Handoff: F1 — example course "How Transformers Work"

## Agent
Workstream F1 example-course author (Agents 03 / 04 / 07 hats: pedagogy, grounding, visual and motion).

## Task
Hand-author a public example course in `examples/transformers/`: a full Learncraft workspace (exact runtime copy, templates, MISSION, RESOURCES, NOTES, cheat sheet, `course.js` v2 with `example: true`), three lessons covering tokenization → embeddings + positions, self-attention (Q/K/V, √d_k, softmax, causal mask), and decoder blocks + autoregressive generation with temperature; at least one real interactive visualization; accurate, sourced, honest about verification. Validate with `scripts/validate.mjs` and `check.mjs`, look at screenshots, complete every practice item by keyboard.

## Status
Done. Validator and lesson check pass; nothing committed. Only `examples/transformers/` and this file were created; no other repository file was edited.

## Files created
- `examples/transformers/assets/` — byte-identical copy of `skills/learn/starter/assets/` (re-synced at the end, after other workstreams changed core/practice/progress/scene/store), except `assets/course.js` (the manifest: id `transformers-example`, `example: true`, lang `en`, 3 milestones m1 `in-progress`, m2/m3 `locked`, all `evidence: null`, 6 objectives).
- `examples/transformers/index.html`, `review.html` — from the templates, placeholders filled.
- `examples/transformers/MISSION.md` — persona mission (developer who uses LLM APIs); 3 success lines = 3 milestones.
- `examples/transformers/RESOURCES.md` — S1–S16, three lesson blocks, claims ledger (L1-C1…L3-C7), Gaps, Verification debt.
- `examples/transformers/NOTES.md` — marked as an example; per-lesson motion/lab decisions; data provenance; practice-count rationale.
- `examples/transformers/reference/cheat-sheet.html` — the path of one step, vocabulary, formulas, rules of thumb.
- `examples/transformers/lessons/0001-tokens-to-vectors.html`, `0001.practice.js` (6 items), `0001.figures.js` (sinusoidal positional-encoding explorable).
- `examples/transformers/lessons/0002-self-attention.html`, `0002.practice.js` (6 items), `0002.figures.js` (attention explorer + causal-mask grid).
- `examples/transformers/lessons/0003-blocks-and-generation.html`, `0003.practice.js` (7 items), `0003.figures.js` (temperature explorable), `scenes-0003.js` (5-chapter scene of autoregressive generation, 18.8 s, poster = end).
- `docs/audit/handoffs/F1-transformers.md` (this file).

Interactive/visual inventory: real GPT-2 / o200k tokenization table; BPE worked example table; embedding-lookup diagram (wide + phone layouts); PE explorable (position slider, values from the formula); attention explorer (query token, causal mask on/off, exploration-only τ; weights, scaled scores and the weighted average of 2-D values recomputed live; output drawn as a point inside the value cloud); causal-mask grid; pre-LN block stepper (5 steps); generation scene; temperature explorable (T = 0 greedy … 2). Every challenge uses the contract markup: `section.challenge#challenge[data-kind="milestone"][data-milestone]`, h3 "What to send back", h3 "Pass criteria" + `ol.criteria` with 4 observable items (each lesson is the last lesson of its milestone).

## Sources

The proxy blocked arxiv.org, aclanthology.org, doi.org, huggingface.co, the GPT-2 paper CDN, wikipedia, youtube, 3blue1brown.com, nlp.seas.harvard.edu, jalammar.github.io, poloclub.github.io. Reachable: `raw.githubusercontent.com` and the npm registry. "verified" below means the document's own text was opened this session; for S2, S8, S11 that is the page's source file in the author's own repository (said in each annotation).

| Id | Title | Status | Backs |
|---|---|---|---|
| S1 | Sennrich, Haddow, Birch 2016, Neural Machine Translation of Rare Words with Subword Units | unverified (blocked: doi.org and aclanthology.org); identity from the authors' subword-nmt README BibTeX | BPE origin (wrapped in `.unverified`); primary source for L1 |
| S2 | Hugging Face Transformers docs, Tokenization algorithms (repo source) | verified 2026-11-25 | BPE merge procedure and the hug/pug corpus; GPT-2 vocab 50,257 = 256 + 50,000 + 1 |
| S3 | openai/tiktoken README | verified 2026-11-25 | BPE reversible/any text; ~4 bytes per token (OpenAI encodings); o200k_base exists |
| S4 | js-tiktoken 1.0.21 (dqbd/tiktoken), installed and run | verified 2026-11-25 | every token split and id in L1 (real run); `<|endoftext|>` = 50256 |
| S5 | openai/gpt-2 `src/model.py`, `sample.py`, `encoder.py` | verified 2026-11-25 | all GPT-2 specifics: wte/wpe added, n_ctx 1024, n_embd 768, 12 heads/layers, pre-LN block, 4× GELU MLP, lower-triangular mask (−1e10), scale by 1/√head size, ln_f, logits via wte, temperature/top-k/top-p loop, past keys/values |
| S6 | Radford et al. 2019, Language Models are Unsupervised Multitask Learners | unverified (blocked: d4mucfpksywv.cloudfront.net) | Go deeper only; lessons rely on S5 |
| S7 | Vaswani et al. 2017, Attention Is All You Need | unverified (blocked: arxiv.org) | attention formula, √d_k argument, mask, sinusoids, post-LN, FFN 512→2048, h = 8, d_k = 64 — every passage also checked in S8's reproduction of the text |
| S8 | The Annotated Transformer (Rush; v2022 Huang et al.), repo source | verified 2026-11-25 | the S7 passages above, verbatim; learned vs sinusoidal "nearly identical" |
| S9 | HF Transformers `modeling_llama.py` | verified 2026-11-25 | RoPE applied to q/k; RMSNorm before attention and MLP (scoped to this implementation) |
| S10 | Su et al. 2021, RoFormer | unverified (index-only) | Go deeper on RoPE |
| S11 | Alammar, The Illustrated Transformer, repo source | verified 2026-11-25 | Q/K/V from learned matrices, divide by 8 = √64, decoder masks future with −inf |
| S12 | 3Blue1Brown, Attention in transformers, step-by-step | unverified (index-only) | Go deeper only |
| S13 | nanoGPT `model.py` | verified 2026-11-25 | `Block.forward` pre-LN lines; `generate()` loop |
| S14 | Xiong et al. 2020, On Layer Normalization in the Transformer Architecture | unverified (index-only) | "pre-LN trains without warm-up" (wrapped in `.unverified`) |
| S15 | Karpathy, Let's build GPT (video) | unverified (blocked: youtube.com); title/link verified in karpathy/nn-zero-to-hero README | Go deeper only; length unknown |
| S16 | Transformer Explainer (Polo Club) | unverified (blocked: poloclub.github.io); described from its verified README | Go deeper only |

## Claims I was least sure of
- **Reading S7 through S8.** All "original Transformer" facts (formula, √d_k footnote reasoning, post-LN, FFN sizes, h = 8, sinusoids, "nearly identical") are checked against the Annotated Transformer's reproduction of the paper text, not the paper itself. High confidence, but it is a second-hand copy; it is in Verification debt.
- **RoPE / Llama.** "Llama-style models rotate queries and keys" rests on Hugging Face's implementation (S9), not on Meta's code or the RoFormer paper; the lesson scopes it to "the Llama implementation in Hugging Face Transformers".
- **Pre-LN prevalence.** The course only says GPT-2 and HF Llama are pre-norm; it makes no claim about "most modern LLMs". The warm-up benefit is index-only and marked unverified.
- **Billing.** No provider pricing page could be opened, so the lessons never assert that APIs bill per token; the tie-ins point to the persona's own statement in MISSION.md.
- **"GPT-2 small"** for the code defaults (768/12/12/1024): the code's default hparams are the 124M model's; the 124M `hparams.json` itself (openaipublic host) could not be fetched.
- **The tiktoken README's own example** says "encoding" splits into "encod" + "ing"; the real GPT-2 run gives `enc` + `oding` (o200k: one token). The course uses only the measured splits.
- **Reading times** in Go deeper are my estimates, except where a length came from an index (S12) or was declared unknown (S15).

## Validation performed and results
- `node scripts/validate.mjs` → 0 errors, 0 warnings (lints `examples/transformers` through `lintWorkspace`).
- `node skills/learn/starter/tools/check.mjs examples/transformers` (Playwright from the global npm root; axe-core 4.10.2 installed in a scratch folder and passed via `NODE_PATH`, nothing installed in the repo) → lint clean; all 6 pages ✓; axe: 0 violations after making two scrollable blocks keyboard-focusable (`.trace`, `.formula`); axe "needs manual review" nodes remain (37/60/73 per lesson, typical incomplete contrast checks on SVG and the dark scene).
- Screenshots looked at: the check's element shots and scene frames (15/35/55/75/100 %), plus my own scratch script at 1280 and 390 px in light and dark for every figure. Fixes made from them: phone layouts for the token table and the embedding diagram (text was < 11 px), clipped labels in the attention plane and "masked" column, scene overlaps (highlight box over text, `<|endoftext|>` label), scene phone crop under the title, shortened explorable captions.
- Keyboard: a scratch Playwright script answered all 19 practice items using only Tab/Shift+Tab, typing, ↑/↓ buttons and Enter → 19/19 "Right" on first attempt, at 390 px. Explorables (range inputs), the stepper (→) and the scene (Home, PageDown) driven by keyboard at 1280 light and 390 dark with `prefers-reduced-motion: reduce`; no page errors.
- Numbers re-computed in Node: worked attention example (weights 0.078/0.578/0.078/0.078/0.188, output [0.46, 0.55]), faded example (0.47), T = 0.5/1/2 tables (0.74 / 0.49 / 0.34), pair counts in the BPE merges.
- `examples/transformers/.check/` deleted afterwards.

## Known limitations
- Practice counts: 6 / 6 / 7. The brief said 4–6 per lesson; the contract's "≥ 3 items per objective" with two objectives plus "interleave from lesson 3" forces 7 in L3 (recorded in NOTES.md).
- Toy numbers: attention vectors and the logits are illustrative and labelled; the "four features" reading of the toy key dimensions is our design and the lesson says so.
- The τ knob in the attention explorer is not part of real attention; it is labelled "exploration only; real attention uses 1" on the control and in the prose.
- The scene's later distributions and the streamed words are illustrative; the first distribution equals softmax of the same logits used by the temperature explorable and worked example.
- No GLOSSARY.md: terms are defined in each lesson's term strip and in the cheat sheet.
- Verification debt (RESOURCES.md) should be paid by the first session with arxiv.org/doi.org access.

## Runtime bugs and rough edges found (not fixed; nothing in `starter/` was touched)
1. **Duplicated "Right."** in order and fade feedback: `practice.js` `say(true, …)` prefixes `t('right')` ("Right.") and the messages `order.right` ("Right, that is the order.") and `fade.all` ("All blanks right.") repeat it, so learners read "Right. Right, that is the order." Suggest dropping the prefix for those two or rewording `order.right` to "That is the order."
2. **Stepper poster is step 1**, not the final state (`diagram.js` `tl.set(D * 0.9)`), which contradicts visual-design's "final state visible at first paint" (print does show all steps). Documented in the header as segmenting, but the two rules disagree.
3. **Hand-drawn stepper SVGs scale up without limit** (`svg.dg { width: 100% }`): a 360-unit diagram renders at ~1.9× on desktop unless the author adds a `max-width` (done here via a lesson `<style>`). A `data-max-width` or a default cap would help.
4. **check.mjs element screenshots are taken only in the first pass (light, 900 px)**; the 390 px and dark passes produce a dark full-page shot only. Reviewing figures at 390 px / dark needed a separate script.
5. **Transient lint failure**: one check run ended with "All pages clean. Lint: 4 error(s)." while other workstreams were editing `scripts/lib/schema.mjs`; re-runs were clean and it did not reproduce. Possibly the check re-reads shared schema code mid-run; worth a look if it recurs.
6. `axe-core` is not resolvable from the repo's tooling by default in this environment (accessibility scan silently skipped unless `NODE_PATH` points at an install).
