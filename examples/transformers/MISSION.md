# Mission: How Transformers Work

> Example mission for a shipped example course. The learner is a persona, not a real person.

## Why
I build features on top of LLM APIs: I send prompts, stream replies and tune `temperature`. The APIs I use count my prompts and replies in tokens, and I want to know what actually happens between the text I send and each token that comes back, so I can reason about token counts, prompt behaviour and sampling settings instead of guessing.

## Success looks like
- I can tokenize my own prompts with a real tokenizer, explain each split and the count, and say how each token becomes a vector that carries its position.
- I can compute one attention head by hand on a short sequence (scores, scaling, softmax, causal mask, weighted sum of values) and explain each step.
- I can explain how a decoder-only model produces a reply one token at a time and predict how a temperature change reshapes the next-token distribution.

## Constraints
- About 30 minutes per lesson, on weekday evenings.
- Comfortable with code and with vectors and dot products; no calculus, no training maths.
- No GPU and no model downloads: everything runs in the browser or by hand.

## Out of scope
- Training: loss functions, backpropagation, optimisers, fine-tuning.
- Encoder-decoder translation models and BERT-style encoders, beyond one sentence of context.
- Serving and efficiency tricks (KV caching internals, quantisation, batching).
