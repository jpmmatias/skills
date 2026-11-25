# How Transformers Work Resources

Sources for the example course. Researched 2026-11-25 in an authoring environment whose network proxy blocked most hosts (arxiv.org, aclanthology.org, doi.org, huggingface.co, the GPT-2 paper's CDN, wikipedia.org, youtube.com, 3blue1brown.com). Only `raw.githubusercontent.com` and the npm registry were reachable. So:

- **verified** below means the document's own text was opened in this session. For three explainers (S2, S8, S11) the published web page was blocked, and what was opened is the page's **source file in the author's own GitHub repository**; the annotation says so.
- The three primary papers (S1, S6, S7) could **not** be opened. Every claim the lessons take from them is also backed by a verified source that reproduces or implements the passage (S5, S8), and the lessons say which.
- Identity of the unverified papers (title, authors, arXiv id) comes from a search index or from a bibliography in a verified file; no deep URL was written from memory.

## Knowledge

### Lesson 1 — From text to vectors
Researched 2026-11-25 · online, proxy-restricted · 7 of 11 fetches

- [S1] [Neural Machine Translation of Rare Words with Subword Units](https://doi.org/10.18653/v1/P16-1162) — Rico Sennrich, Barry Haddow, Alexandra Birch / ACL 2016 · paper 11 pp · tier T1 · unverified (blocked: doi.org and aclanthology.org)
  The paper that brought byte pair encoding to neural machine translation: start from characters, repeatedly merge the most frequent adjacent pair, so rare words become sequences of known subword units. Title, authors, venue, pages 1715–1725 and DOI come from the BibTeX in the authors' own `subword-nmt` README (fetched 2026-11-25). Use for: the origin of BPE in NLP. **Primary source for L1**
- [S2] [Tokenization algorithms (Transformers docs)](https://github.com/huggingface/transformers/blob/main/docs/source/en/tokenizer_summary.md) — Hugging Face · docs 8 min read · tier T2 · verified 2026-11-25 · version: transformers docs, main branch on 2026-11-25
  Walks through BPE on a tiny corpus (`hug`, `pug`, `pun`, `bun`, `hugs`), then byte-level BPE, Unigram, SentencePiece and WordPiece. Opened as the doc's Markdown source in the transformers repository; the rendered page on huggingface.co was blocked. Use for: the merge procedure (§ Byte pair encoding, steps 1–5) and "GPT-2 uses byte-level BPE with a vocabulary size of 50,257 (256 byte tokens + 50,000 merges + special end-of-text token)" (§ Byte-level BPE). The worked example in L1 is this corpus.
- [S3] [tiktoken README](https://github.com/openai/tiktoken) — OpenAI · docs 4 min read · tier T1 · verified 2026-11-25 · version: tiktoken main branch on 2026-11-25
  OpenAI's tokenizer library. § "What is BPE anyway?" says BPE is reversible and lossless, works on arbitrary text, and compresses: "On average, in practice, each token corresponds to about 4 bytes." Its first example loads the `o200k_base` encoding, which shows that tokenizers differ between models. Use for: the properties of BPE and the "about 4 bytes" rule of thumb (scope: OpenAI's encodings).
- [S4] [js-tiktoken (npm package, in the dqbd/tiktoken repository)](https://github.com/dqbd/tiktoken) — dqbd · repo · tier T2 · verified 2026-11-25 · version: js-tiktoken 1.0.21
  A pure-JavaScript port of tiktoken that bundles the `gpt2` and `o200k_base` rank files. Installed from the npm registry in a scratch folder and run on 2026-11-25 to produce every token split and token id shown in L1 (script recorded in `NOTES.md`). It reports `<|endoftext|>` as id 50256 in the `gpt2` ranks, consistent with S2's 50,257-token vocabulary. Use for: the real tokenizations in L1's table.
- [S5] [openai/gpt-2: src/model.py, src/sample.py, src/encoder.py](https://github.com/openai/gpt-2) — OpenAI · repo (archived) · tier T1 · verified 2026-11-25 · version: master branch, archived
  The released GPT-2 code. `encoder.py`: byte-level BPE with a regex pre-split that keeps a leading space on words (` ?\p{L}+`). `model.py`: a learned token table `wte` and a learned position table `wpe` whose rows are added; default hyper-parameters `n_ctx=1024, n_embd=768, n_head=12, n_layer=12`; each block computes `x + attn(norm(x))` then `x + mlp(norm(x))`, a lower-triangular `attention_mask`, scores scaled by the inverse square root of the head size, a final norm `ln_f`, and logits from multiplying by `wte`. `sample.py`: divides the last position's logits by `temperature`, optional top-k and top-p, samples one token, appends it and loops. Use for: everything L1–L3 say about GPT-2 specifically.
- [S6] [Language Models are Unsupervised Multitask Learners](https://d4mucfpksywv.cloudfront.net/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) — Alec Radford, Jeffrey Wu, Rewon Child, David Luan, Dario Amodei, Ilya Sutskever / OpenAI 2019 · paper · tier T1 · unverified (blocked: d4mucfpksywv.cloudfront.net)
  The GPT-2 paper. The link and the author list are taken from the gpt-2 repository's model card and README (S5). Use for: Go deeper only; the lessons rely on the released code (S5) for GPT-2 details.
- [S7] [Attention Is All You Need](https://arxiv.org/abs/1706.03762) — Ashish Vaswani et al. (8 authors) / NIPS 2017 · paper · tier T1 · unverified (blocked: arxiv.org)
  The Transformer paper: scaled dot-product attention, multi-head attention, the position-wise feed-forward network, sinusoidal positional encodings (section 3.5, per S11), and residual connections with layer normalization around each sub-layer. Identity from a search index (arXiv 1706.03762, NIPS 2017, "Ashish Vaswani and seven co-authors"). The passages the course uses are read through S8, which reproduces them. **Primary source for L2**
- [S8] [The Annotated Transformer](https://nlp.seas.harvard.edu/annotated-transformer/) — Sasha Rush (2018); v2022 by Austin Huang, Suraj Subramanian, Jonathan Sum, Khalid Almubarak, Stella Biderman · article 60 min read · tier T2 · verified 2026-11-25 · open copy: https://github.com/harvardnlp/annotated-transformer
  The paper's text, reordered, with a line-by-line PyTorch implementation. Opened as `the_annotated_transformer.py` in the authors' repository (the nlp.seas.harvard.edu page was blocked). Use for: the attention formula and the √d_k argument (§ Attention), `LayerNorm(x + Sublayer(x))` and the note that the code puts "the norm first as opposed to last" (§ Encoder), the decoder mask (§ Decoder), the sinusoidal formula and "learned positional embeddings … produced nearly identical results" (§ Positional Encoding), h = 8 and d_k = d_v = 64, d_model = 512, d_ff = 2048.
- [S9] [modeling_llama.py (Transformers)](https://github.com/huggingface/transformers/blob/main/src/transformers/models/llama/modeling_llama.py) — Hugging Face · repo file · tier T2 · verified 2026-11-25 · version: transformers main branch on 2026-11-25
  Hugging Face's implementation of the Llama architecture. `apply_rotary_pos_emb` rotates the queries and keys ("Rotary Position Embedding"); each decoder layer applies `input_layernorm` (RMSNorm) before attention and `post_attention_layernorm` before the MLP, with a residual add after each. Use for: "modern decoders such as Llama use RoPE and normalise before each sub-layer", scoped to this implementation.
- [S10] [RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864) — Jianlin Su, Yu Lu, Shengfeng Pan, Ahmed Murtadha, Bo Wen, Yunfeng Liu / 2021 · paper · tier T1 · unverified (index-only)
  Introduces rotary position embedding (RoPE): positions are encoded by rotating query and key vectors, so their dot product depends on relative position. Identity and summary from a search index only. Use for: Go deeper on RoPE; the lesson's RoPE sentence rests on S9.

Claims L1:
- L1-C1 · consensus · S1, S2 · "BPE starts from single symbols and repeatedly merges the most frequent adjacent pair; each merge adds one token to the vocabulary."
- L1-C2 · supported · S2, S4 · "GPT-2's byte-level BPE vocabulary has 50,257 tokens: 256 bytes, 50,000 merges and one end-of-text token."
- L1-C3 · supported · S3 · "BPE is reversible, handles any text, and averages about 4 bytes per token for OpenAI's encodings."
- L1-C4 · supported · S4 · "The token splits and ids in the table (gpt2 and o200k_base ranks, js-tiktoken 1.0.21)."
- L1-C5 · supported · S5 · "GPT-2 pre-splits text so that a leading space stays attached to the following word."
- L1-C6 · supported · S5 · "GPT-2 adds a learned token-embedding row and a learned position-embedding row; its code defaults are 768-wide vectors and 1,024 positions."
- L1-C7 · supported · S7, S8 · "The original Transformer adds fixed sinusoidal positional encodings; learned ones gave nearly identical results."
- L1-C8 · supported · S7, S8 · "The original paper adds positional information because the model has no recurrence or convolution to supply order."
- L1-C9 · supported · S9, S10 · "Llama-style models instead rotate queries and keys by position inside attention (RoPE)."
- L1-C10 · supported · S7, S8 · "The authors chose sinusoids hoping the model could attend by relative position: for a fixed offset k, PE(pos + k) is a linear function of PE(pos)."

### Lesson 2 — Self-attention
Researched 2026-11-25 · online, proxy-restricted · 2 of 3 fetches · also uses S5, S7, S8

- [S11] [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/) — Jay Alammar · article 25 min read · tier T2 · verified 2026-11-25 · open copy: https://github.com/jalammar/jalammar.github.io/blob/master/_posts/2018-06-27-illustrated-transformer.md
  A picture-first walk through the original encoder–decoder Transformer. Opened as the post's Markdown source in the author's repository (the rendered page was blocked). Use for: the six steps of self-attention (§ Self-Attention in Detail), "divide the scores by 8 (the square root of the dimension of the key vectors used in the paper -- 64)", and the decoder masking future positions "(setting them to -inf)".
- [S12] [Attention in transformers, step-by-step (Deep Learning, Chapter 6)](https://www.3blue1brown.com/lessons/attention) — 3Blue1Brown · video ≈ 26 min (length from a search index) · tier T2 · unverified (index-only)
  An animated explanation of queries, keys, values, attention patterns and masking. Only the search index's description of the lesson page and video was seen. Use for: Go deeper, as a second visual pass.

Claims L2:
- L2-C1 · consensus · S7, S8, S11 · "Attention maps a query and a set of key–value pairs to an output: a weighted sum of the values, weighted by how well the query matches each key."
- L2-C2 · consensus · S7, S8 · "Attention(Q, K, V) = softmax(QKᵀ / √d_k) V."
- L2-C3 · supported · S7, S8 · "The authors scale by 1/√d_k because, for unit-variance random components, a dot product has variance d_k, and large scores push the softmax into regions with tiny gradients (stated by the authors as a suspicion)."
- L2-C4 · consensus · S7, S8, S11 · "Queries, keys and values are the input vectors multiplied by three learned matrices."
- L2-C5 · consensus · S7, S8, S5 · "Decoder self-attention masks later positions by setting their scores to −∞ (GPT-2's code uses −10¹⁰) before the softmax."
- L2-C6 · supported · S7, S8, S5 · "The base Transformer uses 8 heads of size 64 (d_model 512); GPT-2's code defaults to 12 heads over 768 dimensions, 64 each."
- L2-C7 · consensus · S7, S8, S5 · "Head outputs are concatenated and multiplied by a learned output matrix W_O (MultiHead = Concat(head_1 … head_h) W^O; GPT-2: merge_heads then c_proj)."

### Lesson 3 — Blocks and generation
Researched 2026-11-25 · online, proxy-restricted · 3 of 4 fetches · also uses S5, S6, S7, S8, S9

- [S13] [nanoGPT model.py](https://github.com/karpathy/nanoGPT/blob/master/model.py) — Andrej Karpathy · repo file · tier T2 · verified 2026-11-25 · version: master branch on 2026-11-25
  A compact GPT-2-style model that cites the official GPT-2 code as its reference. `Block.forward` is `x = x + self.attn(self.ln_1(x))` then `x = x + self.mlp(self.ln_2(x))`; `generate()` crops the context, takes the last position's logits, divides by `temperature`, optionally keeps the top k, applies softmax, samples with `torch.multinomial` and appends. Use for: the generation loop, line by line.
- [S14] [On Layer Normalization in the Transformer Architecture](https://arxiv.org/abs/2002.04745) — Xiong et al. / ICML 2020 · paper · tier T1 · unverified (index-only)
  Compares post-LN (the original) with pre-LN. According to the search index summary, pre-LN keeps gradients well-behaved at initialisation and can be trained without learning-rate warm-up. Use for: why many later models moved the norm; the lesson marks this claim unverified.
- [S15] [Let's build GPT: from scratch, in code, spelled out](https://www.youtube.com/watch?v=kCc8FmEb1nY) — Andrej Karpathy · video, length not checked · tier T2 · unverified (blocked: youtube.com)
  Lecture 7 of "Neural Networks: Zero to Hero": builds a small GPT following the Transformer paper and GPT-2. Title, description and link verified on 2026-11-25 in the author's course README (karpathy/nn-zero-to-hero); the watch page itself was blocked, so its length is unknown. Use for: Go deeper, building the whole thing in code.
- [S16] [Transformer Explainer](https://poloclub.github.io/transformer-explainer/) — Aeree Cho, Grace C. Kim, Alexander Karpekov et al. / Georgia Tech Polo Club · playground · tier T2 · unverified (blocked: poloclub.github.io)
  Runs a live GPT-2 in the browser on your own text and shows how its components work together to predict the next tokens. The README (opened 2026-11-25 in poloclub/transformer-explainer) describes it; the live tool itself could not be opened. Use for: Go deeper, a full-size version of this lesson's figures.

Claims L3:
- L3-C1 · supported · S7, S8 · "The original Transformer wraps each sub-layer as LayerNorm(x + Sublayer(x)) (post-LN); its feed-forward network is two linear layers with a ReLU, 512 → 2048 → 512."
- L3-C2 · supported · S5, S13 · "GPT-2 normalises first: x + Attn(LN(x)), then x + MLP(LN(x)) (four lines in GPT-2's block(), S5; the two-line form quoted in the lesson is nanoGPT's, S13); the MLP widens 4× with a GELU; a final layer norm precedes the output."
- L3-C3 · single-study · S14 · "Pre-LN can be trained without learning-rate warm-up." (unverified, marked in the lesson)
- L3-C4 · supported · S9 · "Hugging Face's Llama implementation normalises (RMSNorm) before attention and before the MLP."
- L3-C5 · supported · S5 · "GPT-2 turns the last position's vector into one score per vocabulary token by multiplying with the token-embedding table."
- L3-C6 · consensus · S5, S13 · "Generation: take the last position's logits, divide by temperature, softmax, sample one token, append it, repeat (both released loops run for a fixed number of tokens)."
- L3-C7 · supported · reasoning · "Dividing logits by T < 1 sharpens the distribution; T > 1 flattens it; T → 0 approaches always picking the top token." (follows from the softmax; computed in the explorable)
- L3-C8 · gap · — · "Serving systems and APIs also stop when the model samples its end-of-text token or a stop sequence." Not in S5 or S13; stated as general practice, attributed to "APIs", never to GPT-2's code.

## Wisdom (Communities)

None curated for this example: no community page could be opened from the authoring environment, and a community recommendation needs someone to have looked at it.

## Gaps

- L1–L3: the three primary papers (S1, S6, S7) could not be fetched; their passages were checked only through verified secondary copies (S8 reproduces S7's text; S5 implements S6's model).
- L1: no source could be opened on how commercial LLM APIs count tokens; the lessons do not state anything about billing beyond the persona's own words in `MISSION.md`.
- L2: no strong video could be checked; S12 is index-only.
- L3-C8: no verified source for end-of-text / stop-sequence stopping in serving systems; provider docs were blocked. Searched: provider API docs (blocked), GPT-2 and nanoGPT loops (no such check).
- L3: no verified source on how widely pre-LN is used across current models; the lesson names only GPT-2 (S5) and the Llama implementation (S9).

## Verification debt

- S7: fetch arXiv 1706.03762 and check the attention, masking, feed-forward, residual/layer-norm and positional-encoding passages against S8's copy.
- S1: fetch DOI 10.18653/v1/P16-1162 and check the BPE algorithm description.
- S6: fetch the GPT-2 paper and check its input-representation (byte-level BPE) and model (placement of layer norm) sections against the code in S5.
- S10, S14: fetch the arXiv pages and confirm the index summaries.
- S12, S15: open the watch pages and record exact lengths.
- S16: open the live tool and confirm it still runs.
