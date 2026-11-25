# Notes: How Transformers Work (example course)

This is a **shipped example course**, hand-authored to show what Learncraft produces. There is no learner: no progress, no learning records, no exports. `MISSION.md` describes a persona (a developer who calls LLM APIs). Milestone m1 is open, m2 and m3 are locked, and none has evidence.

## Course settings

- lang: en · profile: Standard · course id: `transformers-example`
- Environment for version-scoped facts: GPT-2 as released in `openai/gpt-2` (archived); Hugging Face Transformers `main` on 2026-11-25; js-tiktoken 1.0.21.
- sources: researched 2026-11-25 with a proxy that blocked most hosts; see the header of `RESOURCES.md` and its Verification debt.
- Which model the lessons describe: **GPT-2** for every concrete size and code detail (decoder-only, learned positions, pre-LN). The **2017 original** is named whenever it differs (sinusoidal positions, post-LN, ReLU FFN, encoder–decoder). **Llama (Hugging Face implementation)** is named once each for RoPE and RMSNorm pre-norm.

## Per-lesson decisions

- L1: no scene — tokenization and embedding lookup are static structures; a real tokenizer table and a lookup diagram show them at a glance. **Explorable** for sinusoidal positional encoding: insight comes from moving the position and comparing neighbours (values computed from the formula, toy width 16).
- L2: no scene — attention is learned best by **changing a variable**: the attention explorer (query token, causal mask, an exploration-only sharpness τ) recomputes weights and the weighted average of 2-D values live from toy vectors. Static causal-mask grid next to it.
- L3: **scene** — autoregressive generation is a process over time (prompt → blocks → last position → logits → softmax → sample → append → repeat), 5 chapters, under 19 s, poster = final frame. Plus a **stepper** for the block (real stages, segmenting) and a **temperature explorable** (variable → distribution).
- Labs: none. The challenges use the learner's own prompts and API instead.

## Data provenance

- Token splits and ids in L1 are a real run, not illustrative: js-tiktoken 1.0.21 from the npm registry, `js-tiktoken/lite` with `js-tiktoken/ranks/gpt2` and `ranks/o200k_base`, `encode()` then `decode([id])` per id, run 2026-11-25 in a scratch folder outside the repository.
- Attention numbers in L2 are toy vectors chosen by hand (labelled on the page); the weights and outputs are computed from them by `lessons/0002.figures.js` and match the worked-example table.
- Logits in L3 are illustrative ([3.0, 2.2, 1.8, 1.5, 0.5]); the scene's first distribution is their softmax at T = 1, so the scene, the worked example and the explorable agree. The scene's second and third distributions and the streamed words are illustrative.

## Practice

- 19 items: 6 in L1, 6 in L2, 7 in L3. Two objectives per lesson with 3 items each (at least one non-choice per objective); L3's seventh item interleaves L2 (`l2.o2`, the causal mask during training). The brief asked for 4–6 per lesson; the contract's "≥ 3 per objective" plus "interleave from lesson 3" makes 7 the minimum for L3 with two objectives.
- Items are placed individually (`data-practice-item`) so each faded example sits next to its worked example.

## Upstream

- Nothing in `assets/` was changed (only `assets/course.js`, the manifest). Observations for the runtime are in the workstream handoff (`docs/audit/handoffs/F1-transformers.md`).
