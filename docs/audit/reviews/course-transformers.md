# Review: example course "How Transformers Work"

Independent review, 2026-11-25. Reviewer roles: research-grounding specialist and learning scientist. Target: `examples/transformers/`. No repository file other than this report was changed; nothing was committed.

**Read:** `MISSION.md`, `NOTES.md`, `RESOURCES.md`, `index.html`, `review.html`, `assets/course.js`, `lessons/0001–0003-*.html`, `lessons/000{1,2,3}.practice.js`, `lessons/000{1,2,3}.figures.js`, `lessons/scenes-0003.js`, `reference/cheat-sheet.html`, and the grading code in `assets/practice.js`. Rules checked against: `skills/learn/references/{lesson-contract,grounding,mastery,teaching-core,visual-design}.md`.

**Executed (scratch folder outside the repo):**
- `js-tiktoken@1.0.21` from npm, `js-tiktoken/lite` with the `gpt2` and `o200k_base` ranks, on every string the course tokenizes. All ids and splits in L1 match exactly (table under "Verified correct").
- All three lessons loaded in Chromium (Playwright, `file://`). No console errors. The attention explorer's `attend()` was called directly for the worked example, "was", "The" with the mask off, and τ = 0.5. The text alternatives of the PE and temperature explorables were read back.
- Hand and Node recomputation of every number on the pages: attention weights and output, softmax at T = 1, 2 and 0.5, the BPE pair counts, PE values and wavelengths.

**Sources opened (raw.githubusercontent.com, 2026-11-25):** `openai/gpt-2` `src/model.py`, `src/sample.py`, `src/encoder.py`, `README.md`, `model_card.md`; `huggingface/transformers` `docs/source/en/tokenizer_summary.md` and `models/llama/modeling_llama.py`; `openai/tiktoken` `README.md`; `harvardnlp/annotated-transformer` `the_annotated_transformer.py`; `jalammar.github.io` `_posts/2018-06-27-illustrated-transformer.md`; `karpathy/nanoGPT` `model.py`.
**Could not open:** arxiv.org, ar5iv, aclanthology.org, proceedings.mlr.press, papers.nips.cc, huggingface.co, 3blue1brown.com. They failed to resolve, the same proxy limits the author reports. A web search (index snippets only) confirmed the identity of Xiong et al. (ICML 2020, PMLR 119) and its "warm-up can be removed for Pre-LN" finding. S1, S6, S7, S10, S12, S14 and S15 therefore remain unverified, as the course already says.

Severity: **P0** = a factually wrong statement or a wrong answer key that a learner would learn · **P1** = misleading or overstated, or a grounding status that is wrong · **P2** = pedagogy improvement · **P3** = polish.

## Summary

| ID | Sev | Title |
|---|---|---|
| CT-01 | P0 | L2 says the causal mask is *the reason* a model writes one token at a time |
| CT-02 | P1 | "End token" stopping is attributed to GPT-2's sampling loop, which has no such stop |
| CT-03 | P1 | "`␣strawberry` and `strawberry` are different tokens": `strawberry` is not a token |
| CT-04 | P1 | Multi-head attention is described as a plain concatenation (the W_O projection is missing) |
| CT-05 | P1 | Two order items reject mathematically equivalent orders, one contradicting the lesson's own trace |
| CT-06 | P1 | The scene shows "top 5" of a 50,257-token softmax summing to 1.00 |
| CT-07 | P1 | "Only the last position predicts the next token" contradicts the training explanation |
| CT-08 | P1 | "Read it right to left" is the wrong reading order for the attention formula |
| CT-09 | P1 | The τ = 0.25 setting is described as "unscaled" scores; unscaled is τ = 0.5 |
| CT-10 | P1 | "In GPT-2's code this is two lines": the quoted two lines are nanoGPT's (S13), not GPT-2's (S5) |
| CT-11 | P1 | GPT-2 is called "the model that defined the decoder-only recipe" |
| CT-12 | P2 | Lesson 3's challenge does not cover half of its canDo (the block trace) |
| CT-13 | P2 | Lesson 3 has no "why does this line exist?" prompt, and its faded item does not mirror its worked example |
| CT-14 | P2 | The temperature worked example has no faded counterpart |
| CT-15 | P2 | The 5-token "vocabulary" in the temperature examples is never stated |
| CT-16 | P2 | `l1-recall-merge-rule` reuses the prose almost word for word |
| CT-17 | P2 | The sinusoidal explorable teaches content that no objective or item assesses |
| CT-18 | P2 | "Word order would be invisible" is stated without its decoder caveat |
| CT-19 | P3 | "Brought to neural language models" broadens the scope of Sennrich et al. (NMT) |
| CT-20 | P3 | GPT-2 masking: "subtracts 10¹⁰" should be "replaces with −10¹⁰" |
| CT-21 | P3 | Small wording issues in L2/L3 (lede, MLP "small", Xiong link blurb, "N runs") |
| CT-22 | P3 | Challenge wording: position ambiguity and prediction mismatch (L2), T = 0 determinism (L3) |
| CT-23 | P3 | `l2-fade-was` names the non-zero key, which removes the search step |

---

## P0

### CT-01 · P0 · The causal mask is presented as the cause of one-token-at-a-time generation
`lessons/0002-self-attention.html:27`
> "…and its causal mask is the reason a model can only write left to right, one token at a time, which is what you see when a reply streams."

**Why it is wrong.** Generation is one token at a time because the model is *autoregressive*: each next token depends on the tokens already sampled, so a token cannot be predicted before the one before it exists. That would also be true without a mask. The mask does something else. It makes *training* match that setting, so position *i* cannot see position *i*+1 while every position is predicted in one pass. The lesson's own section at line 98 gives this correct reason. The mission tie-in plants the wrong causal model, and milestone m3 asks the learner to "explain how a decoder-only model produces a reply one token at a time".
**Corrected text:**
> "…and its causal mask is what lets a model be trained to predict every next token using only the tokens before it, the same left-to-right setting it is in when it writes your reply one token at a time."

## P1

### CT-02 · P1 · Stopping at an end token is attributed to GPT-2's sampling loop
- `lessons/0003.practice.js:36`: "This is GPT-2's sampling loop: logits at the last position, ÷ temperature, softmax, sample, append, repeat until an end token or the length limit."
- `lessons/scenes-0003.js:116` (chapter "When it stops"): "The loop ends when the model samples its end-of-text token (id 50256 in GPT-2) or reaches the length limit you set." The file header (line 4) says the mechanism "follows the released GPT-2 sampling loop and nanoGPT's generate() (S5, S13)".
- `reference/cheat-sheet.html:28`: "append, repeat  until end-of-text (50256) or the length limit", on a page whose lede says "Sizes are GPT-2 small's, from its released code".

**Why.** In `openai/gpt-2/src/sample.py` the loop is `tf.while_loop(cond=cond, …, maximum_iterations=length - 1)` with `def cond(*args): return True`, so it always generates exactly `length` tokens and never checks for 50256. nanoGPT's `generate()` is also `for _ in range(max_new_tokens)`, with no end-token check. Stopping at an end-of-text token or a stop sequence is true of serving stacks and chat APIs. But no cited source backs it, and the course ties it to GPT-2's code. Ledger claim L3-C6 does not include it either.
**Corrected text:**
- practice `why`: "This is GPT-2's sampling loop: logits at the last position, ÷ temperature, softmax, sample, append, repeat. GPT-2's released sampler simply runs for a fixed number of tokens; the APIs you call also stop early when the model samples an end token."
- scene chapter caption: "GPT-2's released sampler just stops after the number of tokens you ask for. Serving systems and APIs also stop as soon as the model samples its end-of-text token (id 50256 in GPT-2's vocabulary) or a stop sequence." Change the header comment to say that the stop rule is general serving practice and is not in S5 or S13.
- cheat sheet: "append, repeat  until the length limit (APIs also stop at an end-of-text token, 50256 in GPT-2)". Add a ledger claim L3-C8, marked `reasoning` or `gap`, since no verified source states it.

### CT-03 · P1 · "`␣strawberry` and `strawberry` are different tokens"
`lessons/0001-tokens-to-vectors.html:75`: "…so `␣strawberry` and `strawberry` are different tokens."
`reference/cheat-sheet.html:61`: "A leading space is part of the next token, so `␣word` and `word` are different tokens."

**Why.** In `gpt2`, `strawberry` is not a token at all. My run gives `st`(301) `raw`(1831) `berry`(8396), while ` strawberry` is one token (41236). The table four lines above shows exactly this. The point (a leading space changes the tokenization) is right; the sentence states it falsely. The cheat sheet generalizes the false form with no table next to it.
**Corrected text:**
- L1: "…so `␣strawberry` (one token) and `strawberry` (three: `st`, `raw`, `berry`) are tokenized differently."
- Cheat sheet: "A leading space belongs to the word that follows it, so `␣word` and `word` are different strings to the tokenizer and can split differently (lesson 1: `␣strawberry` is 1 token, `strawberry` is 3)."

### CT-04 · P1 · Multi-head attention without the output projection
`lessons/0002-self-attention.html:105`: "A real layer runs several attention heads side by side, each with its own W_Q, W_K, W_V, and concatenates their outputs."
`reference/cheat-sheet.html:42`: "A layer runs several (…) and concatenates them."

**Why.** The paper's definition, as reproduced in S8, is `MultiHead(Q,K,V) = Concat(head_1, …, head_h) W^O`. GPT-2 does the same: `merge_heads` and then `conv1d(a, 'c_proj', n_state)` in `model.py:110-111`. Without W_O, a learner believes the concatenation is the sub-layer's output, and so that head *k*'s result always lands in fixed slots 64k…64k+63 of the residual stream.
**Corrected text:**
- L2: "…each with its own W_Q, W_K, W_V; their outputs are concatenated and multiplied by one more learned matrix, W_O, which mixes the heads back into a single 512-wide (GPT-2: 768-wide) vector."
- Cheat sheet: "…and concatenates them, then multiplies by a learned output matrix W_O."

### CT-05 · P1 · Order items whose answer key rejects equivalent correct orders
`assets/practice.js:317` grades order items by exact position, so the learner is shown "✗" for any other sequence.
1. `lessons/0002.practice.js:25`: steps `… 'Divide the scores by √d_k', 'Set the scores of later positions to −∞', 'Apply the softmax' …`. Masking before scaling gives the identical result (−∞ ÷ 2 = −∞). A learner who reasons correctly is marked wrong, and the `why` ("The mask must come before the softmax") states the only real constraint.
2. `lessons/0003.practice.js:35`: steps `'Take the vector at the last position', 'Turn it into one logit per vocabulary token'`. The lesson's own worked trace (`0003-blocks-and-generation.html:96-97`) does it the other way: "× wteᵀ … 5 × 50,257", then "keep the last row". So does GPT-2's `sample.py:64` (`logits[:, -1, :]`, after computing logits for every position). A learner who follows the worked example fails the item.

**Corrected text:**
1. Merge the two steps into `'Divide the scores by √d_k and set later positions’ scores to −∞'`, which leaves 5 steps, and keep the `why`. Because the edit changes the item's version, publish it as a new id, for example `l2-order-head-v2`, per the contract.
2. Replace the two steps with one: `'Turn the vectors into logits and keep the last position’s row'`, which leaves 5 steps (new id).

### CT-06 · P1 · The scene's "top 5" of a 50,257-way softmax sums to 1.00
`lessons/scenes-0003.js:47`: "softmax → probabilities (top 5 shown, illustrative)". Line 110: "That vector becomes one score per vocabulary token, 50,257 for GPT-2. A softmax turns the scores into probabilities. Five are shown". The data (lines 56-58) sums to 1.01, 1.00 and 1.00.

**Why.** If these were the top 5 of 50,257 softmax outputs, they would sum to less than 1, because a softmax gives every token a positive probability. The display teaches that everything outside the top 5 has probability 0. `NOTES.md` confirms that D1 is the softmax of the five logits alone, so the label is the problem.
**Corrected text:** line 47: "softmax → probabilities (toy: only 5 candidate tokens, illustrative)". Chapter 2 caption: "…A softmax turns the scores into probabilities. Here we pretend only five tokens exist, so their probabilities add up to 1; in GPT-2 the other 50,252 would share a little of it. The numbers are illustrative." (See CT-15 for the matching fix in the temperature section.)

### CT-07 · P1 · "Only the last position predicts the next token"
`reference/cheat-sheet.html:63`: "In a decoder, position i attends to positions 0…i. Only the last position predicts the next token."

**Why.** Every position produces logits: the lesson's trace shows `5 × 50,257`, and in training every position predicts its own next token (L2 line 98; item `l3-choice-mask-training`). What is true is that generation *uses* only the last row.
**Corrected text:** "…When generating, only the last position's logits are used to pick the next token (every position predicts its own next token, which is how training works)."

### CT-08 · P1 · "Read it right to left"
`lessons/0002-self-attention.html:39`: "Read it right to left for one query: dot the query with every key, divide by √d_k, softmax, then use the weights to average the values."

**Why.** In `softmax(Q·Kᵀ / √d_k) · V`, reading right to left starts with V, which is used last. The steps listed go from the inside out. The instruction contradicts the sequence it introduces.
**Corrected text:** "Read it from the inside out for one query: dot the query with every key (Q·Kᵀ), divide by √d_k, softmax, then use the weights to average the values (· V)."

### CT-09 · P1 · τ = 0.25 is not "unscaled"
`lessons/0002-self-attention.html:90`: "Push it to 0.25 to see what unscaled, large scores would do".

**Why.** The explorer computes `dot / (√d_k · τ)` (`0002.figures.js:67`) with √d_k = 2. Unscaled scores are exactly τ = 0.5, an option on the slider (`TAUS = [0.25, 0.5, 1, 2, 4]`). τ = 0.25 doubles the unscaled scores. I ran it: at τ = 0.5 the weight on "cat" goes from 0.58 to 0.86.
**Corrected text:** "Set it to 0.5 and you get exactly the unscaled scores (÷ 1 instead of ÷ 2): "cat" jumps from 0.58 to 0.86. At 0.25 the scores are twice that large, as they would be with a bigger d_k, and the softmax puts nearly all the weight on one token."

### CT-10 · P1 · The quoted "GPT-2 code" is nanoGPT's
`lessons/0003-blocks-and-generation.html:86`: "In GPT-2's code this is two lines, `x = x + attn(ln_1(x))` and `x = x + mlp(ln_2(x))` …[S5]".
`lessons/0003.practice.js:5`: "Complete GPT-2's block, as two lines of its code (pre-LN order)."

**Why.** GPT-2's `model.py:126-129` is four lines: `a, present = attn(norm(x, 'ln_1'), …)`, `x = x + a`, `m = mlp(norm(x, 'ln_2'), …, nx*4, …)`, `x = x + m`. The two-line form is verbatim nanoGPT (`model.py:104-105`, S13). The semantics match, but the citation (S5 only) does not support the quoted text. This is a fidelity error under the grounding rubric.
**Corrected text:**
- L3:86: "In nanoGPT, which follows GPT-2's code, this is two lines, `x = x + self.attn(self.ln_1(x))` and `x = x + self.mlp(self.ln_2(x))`[S13]; GPT-2's own `block()` does the same in four[S5]. The MLP width is 4 × 768 = 3,072 with a GELU[S5]."
- Item prompt (new id): "Complete the GPT-2 block, as nanoGPT writes it in two lines (pre-LN order)."

### CT-11 · P1 · "The model that defined the decoder-only recipe"
`lessons/0001-tokens-to-vectors.html:196`: "…in the model that defined the decoder-only recipe."

**Why.** This is an overstated historical claim with no source. GPT-1 (Radford et al., 2018) was already a decoder-only Transformer language model, as was Liu et al.'s 2018 "Generating Wikipedia" decoder.
**Corrected text:** "…in the decoder-only model this course uses as its reference."

## P2

### CT-12 · P2 · Lesson 3's challenge does not cover the block half of its canDo
canDo (`assets/course.js`, lesson 3): "trace a vector through one decoder block, and explain how the model writes a reply one sampled token at a time". The criteria at `lessons/0003-blocks-and-generation.html:151-155` cover only sampling and temperature. The contract requires the criteria to "together cover the canDo", and objective l3.o1 never reaches L4.
**Fix:** add a criterion such as "The explanation names, in order, the six stages one position passes through in each block (norm, attention, add, norm, MLP, add), and the shape of the logits for your prompt (tokens × vocabulary size of the model you used, or of GPT-2 if it is not published)." That makes 4 criteria. Alternatively, move l3.o1 out of the m3 milestone.

### CT-13 · P2 · Lesson 3: no "why does this line exist?" prompt; the faded item does not match the worked example
- Self-checklist item 4 requires one "why does this line exist?" prompt per lesson. L1 (line 95) and L2 (line 83) have one; L3 has none (the note at line 88 is "Which version is this?").
- The worked example is a **shape trace** (lines 92-97), but the faded item `l3-fade-preln` is a **code completion**. Its second blank (`x = {{res}} + mlp(ln_2(x))`) is answered by the line just above it (`x = x + …`), so it tests copying, not recall.

**Fix:** add `<p class="note"><strong>Why does the <code>x +</code> exist?</strong> Without it, each block would have to rebuild the whole vector, including everything it does not change. With it, a block only has to produce the change, and a block with nothing to add can output almost zero and let the vector pass through.</p>`. Add a faded shape trace as a new item, for example: "The prompt has 9 tokens. Fill in: after the embeddings `9 × {{w}}`; after `× wteᵀ` `9 × {{v}}`; logits used for the next token: row {{r}}", with `w: ['768']`, `v: ['50257','50,257']`, `r: ['9','last','the last','8']` (accepting either a 1-based or a 0-based index, or state the convention in the prompt).

### CT-14 · P2 · The temperature worked example has no faded twin
The worked example at T = 2 (lines 110-126) is followed only by a choice item at T = 0.5 (`l3-choice-temperature`), which is recognition. Converting it, or adding a `fade` item ("logits ÷ 0.5 → mat {{a}}, floor {{b}}; p(mat) ≈ {{p}}", with `a: ['6','6.0']`, `b: ['4.4']`, `p: ['0.74']`, tolerance 0.01), gives the learner one generative step on the exact skill named in milestone m3 ("predict how a temperature change reshapes the distribution").

### CT-15 · P2 · The 5-token "vocabulary" is never stated in the temperature section
`lessons/0003-blocks-and-generation.html:111` ("Illustrative logits for the token after…"), the table (lines 115-122) and the explorable caption (line 130) give probabilities that sum to 1 over five tokens. A learner who has just read "5 × 50,257" can infer that the real ~0.49 for `␣mat` comes from this computation.
**Fix:** at line 111, add: "To keep the arithmetic small, pretend these five are the only tokens in the vocabulary (a real model spreads a little probability over all 50,257)."

### CT-16 · P2 · A recall item that echoes the prose
`lessons/0001.practice.js:21`: "Complete the BPE training rule: at each step, merge the most ______ pair of adjacent symbols." The lesson says "merge the most frequent pair" at line 78, so this is close to cued recognition and breaks the contract rule "do not reuse the prose's exact sentences". A stronger recall item for the same objective (new id): "In the worked corpus *before any merge*, what is the weighted count of the pair `p u`?" `accept: ['17']`, why: "`p u g` 5 + `p u n` 12 = 17. It loses to `u g` (20), and after merge 1 it drops to 12 because `p ug` no longer contains it." This also surfaces a fact the worked table hides: `p u` (17) was the runner-up, not `h u` (15).

### CT-17 · P2 · The sinusoidal explorable is unassessed
L1's only explorable (lines 157-161) teaches sinusoidal encoding, which is neither the course's reference model (GPT-2, learned) nor the modern default (RoPE). No objective or item touches it, so it adds load to a lesson that already carries BPE, embeddings and three position schemes. Either label the section as optional ("Aside: how the 2017 model did it") or add one item to l1.o2, for example a choice: "In the sinusoidal scheme, which dimensions change most between neighbouring positions?" (correct: "the lowest ones"). Also worth one sentence in the caption: the per-position change shown is the source's idea that "PE_pos+k can be represented as a linear function of PE_pos" (S8, § Positional Encoding).

### CT-18 · P2 · "Word order would be invisible" without the decoder caveat
`lessons/0001.practice.js:40`: correct option "Attention compares content only, so word order would be invisible to it". This is true for the original bidirectional model, which is permutation-equivariant without positions. A causal decoder can, however, infer some position from the mask alone (for example, how many tokens it can see). A learner who later meets "NoPE" models will find a contradiction.
**Fix:** keep the option and extend its `why`: "The original paper adds positions because the model has no recurrence and no convolution to supply order. (A causal mask leaks a little order information in decoders, but models still add or rotate positions explicitly.)"

## P3

### CT-19 · P3 · Scope of Sennrich et al.
`lessons/0001-tokens-to-vectors.html:78`: "brought to neural language models by Sennrich, Haddow and Birch in 2016". The paper (and the RESOURCES annotation) is about neural **machine translation**, and BPE itself is older (a 1994 compression algorithm).
**Corrected text:** "brought to neural machine translation by Sennrich, Haddow and Birch in 2016" (keep the unverified span).

### CT-20 · P3 · GPT-2's mask arithmetic
`lessons/0002-self-attention.html:98`: "…subtracts 10¹⁰ from the blocked scores". The code is `w = w*b - 1e10*(1-b)` (`model.py:88`): blocked scores are zeroed and then set to −10¹⁰. The ledger L2-C5 already says "uses −10¹⁰".
**Corrected text:** "GPT-2's code builds a lower-triangular mask and replaces the blocked scores with −10¹⁰, which has the same effect."

### CT-21 · P3 · Wording
- `0002-self-attention.html:23`: "takes in information from the other tokens" → "takes in information from other tokens (in a decoder, only earlier ones)".
- `0003-blocks-and-generation.html:23`: "One attention head is one step. A model stacks it into blocks" → "Attention is one step. A block pairs it with an MLP; a model stacks the blocks…". Heads run side by side, not stacked.
- `0003-blocks-and-generation.html:32`: "A small two-layer network" → "A two-layer network". In GPT-2 the MLP holds about two thirds of each block's weights (768×3,072×2 vs 768×768×4).
- `0003-blocks-and-generation.html:168`: "Why the norm moved before the sub-layer." → "An analysis of why putting the norm first makes training easier." GPT-2 (2019) moved the norm before this 2020 paper existed.
- `scenes-0003.js:114` and `cheat-sheet.html:64`: "A 200-token reply is 200 of these steps" / "N runs of the loop": add "in plain decoding". Speculative and multi-token decoding, used by some providers, can accept several tokens per large-model pass.

### CT-22 · P3 · Challenge wording
- L2 (`0002-self-attention.html:126`): "positions 2 and 3" → "positions 2 and 3 (counting from 0, i.e. the third and fourth tokens)". A learner counting from 1 would mask the wrong positions.
- L2 criterion 4 grades a "written prediction from before the run" for the no-scaling run, but the task text (line 120) only asks for a prediction of *which token attends to which*. Add to the task: "Before the no-scaling run, write down what you expect the largest weight to become."
- L3 criterion 4: add "temperature 0 is not guaranteed to be deterministic on hosted APIs" to the example causes, and note that some models ignore or reject `temperature`.

### CT-23 · P3 · The faded item does the search for the learner
`lessons/0002.practice.js:4`: "Only the key of “it”, [0.5, 0, 0, 1.5], gives a non-zero score." In the lesson, the text above the item asks the learner to find that key; in `review.html` (no lesson text) the item states it outright. Give all six visible keys in the prompt and add a blank `{{key}}` (accept `it`).

---

## Grounding audit

- **Statuses.** Every `verified` entry I could re-open matched its annotation: S2 (the 50,257 quote is verbatim at `tokenizer_summary.md:64`; the corpus and the merges match), S3 ("about 4 bytes", reversible, educational submodule), S4 (reproduced), S5 (every listed detail, including `n_ctx=1024, n_embd=768, n_head=12, n_layer=12`, the regex, `wte`/`wpe`, lower-triangular mask, `rsqrt` scaling, `ln_f`, logits × `wteᵀ`, temperature/top-k/top-p, KV `past`), S8 (attention formula, √d_k footnote, "LayerNorm(x + Sublayer(x))", "norm is first as opposed to last", "setting to −∞", the PE formula, "nearly identical results", h = 8, d_k = d_v = 64, d_ff = 2048), S9 (`apply_rotary_pos_emb`, `input_layernorm`/`post_attention_layernorm` as RMSNorm with residual adds), S11 ("divide the scores by 8 (… -- 64)", "setting them to `-inf`"), S13 (`Block.forward`, `generate()`). No status is overstated.
- **Unverified marking.** S1 and S14 claims carry the `unverified` span. S10, S12, S15 and S16 appear only in Go-deeper or alongside a verified source, and say "not checked". Correct.
- **Misattributions:** CT-02 (end-token stop on S5/S13) and CT-10 (nanoGPT text cited as S5). CT-11 is an unsourced historical claim.
- **Ledger gaps:** add a claim for the end-token stop (CT-02) and one for W_O (CT-04; S8 supports it).

## Verified correct

**Tokenizer data** (js-tiktoken 1.0.21, my run): `The cat sat on the mat.` → 464, 3797, 3332, 319, 262, 2603, 13 (7 tokens); `Tokenization` → `Token`+`ization`; `strawberry` → `st`/`raw`/`berry`; ` strawberry` → 1 token; `1234567` → gpt2 `123`/`45`/`67`, o200k `123`/`456`/`7`; `Olá, tudo bem?` → gpt2 8 tokens with the shown splits, o200k 5; `<|endoftext|>` = 50256 in gpt2; every word of "The cat sat because it was tired" is one gpt2 token; ` mat`, ` floor`, ` sofa`, ` bed`, ` roof` are single tokens.

**BPE:** the HF corpus, base vocabulary, merge 1 (`u g` = 20) and merge 2 (`u n` = 16); the third merge `h ug` = 15 (answer key of `l1-fade-next-merge`); 256 + 50,000 + 1 = 50,257; the GPT-2 regex keeps a leading space on letters.

**Embeddings/positions:** a lookup of a learned row; `wte` 50,257 × 768, `wpe` 1,024 × 768, added; positions count from 0; the sinusoid formula and its pairing; "no recurrence and no convolution" (verbatim); learned ≈ sinusoidal results; RoPE rotates queries and keys and adds nothing to the input (HF Llama); PE explorable values (pos 3: dim 0 = 0.14, Δ −0.90, wavelength 2π ≈ 6.3; dim 14 = 0.0009, wavelength ≈ 19,869 at d = 16).

**Attention:** the formula; d_k as key length; the variance-d_k argument and the authors' "suspect" framing; ÷ 8 for d_k = 64; the worked example (scores 0, 4, 0, 0, 1.75 → weights 0.078, 0.578, 0.078, 0.078, 0.188; total 12.788; output [0.459, 0.547] ≈ [0.46, 0.55]); "was" → 0.4727; the "The"-unmasked → "cat" claim (0.29, the maximum); the output is a convex combination; mask −∞ → weight 0; 8 × 64 = 512 and 12 × 64 = 768.

**Blocks/generation:** pre-LN order in GPT-2 and HF Llama (RMSNorm); post-LN and ReLU 512 → 2048 → 512 in the original; MLP 4× with GELU; final `ln_f`; tied output weights; only the last row is used for sampling; KV reuse via `past` gives the same result; temperature divides the logits; ranking is preserved for T > 0; softmax at T = 1 (0.49, 0.22, 0.15, 0.11, 0.04), T = 2 (0.34, 0.23, 0.18, 0.16, 0.10; `␣roof` ×2.4) and T = 0.5 (`␣mat` 0.741); "under 300 lines" (174 + 95); encoder.py "about 120 lines" (117); nanoGPT "about 330 lines" (330).

**Answer keys:** all 19 marked answers are correct and all distractors are wrong, except the two order-item keys in CT-05 that reject equivalent orders. Choice options are within ±17% of each other's length (max/min ratio 0.83 or higher) and are shuffled by the runtime. Every objective has at least 3 items with at least one non-choice. L3 interleaves l2.o2.

**Pedagogy that works:** the mission tie-ins (except CT-01); a worked example then a faded item in L1 and L2, placed side by side; honest "toy numbers" and "illustrative" labels; real tokenizer data; challenges on the learner's own prompts and API with observable criteria and written predictions; the misconceptions addressed in the option feedback (one-hot vs lookup, syllables, the softmax normalising anyway, keys vs values).
