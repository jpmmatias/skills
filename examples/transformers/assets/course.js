// Course manifest (schemaVersion 2) for the shipped EXAMPLE course "How Transformers Work".
// It is an example: no learner, no learning records, no progress. Milestone m1 is open, the rest are locked,
// and no milestone has evidence. Strings are plain text: the runtime escapes them.
window.COURSE = {
  schemaVersion: 2,
  id: 'transformers-example',
  topic: 'How Transformers Work',
  lang: 'en',
  example: true,
  mission: 'Understand what happens inside the LLM I call through an API, from my prompt to each token of the reply.',
  milestones: [
    { id: 'm1', label: 'Read your prompt as the model does', canDo: 'Tokenize your own prompts with a real tokenizer, explain each split and the count, and say how each token becomes a vector that carries its position.', status: 'in-progress', evidence: null },
    { id: 'm2', label: 'Compute one attention head', canDo: 'Compute one attention head by hand on a short sequence (scores, scaling, softmax, causal mask, weighted sum of values) and explain each step.', status: 'locked', evidence: null },
    { id: 'm3', label: 'Explain a streamed reply', canDo: 'Explain how a decoder-only model produces a reply one token at a time and predict how a temperature change reshapes the next-token distribution.', status: 'locked', evidence: null },
  ],
  lessons: [
    {
      n: 1, file: 'lessons/0001-tokens-to-vectors.html', title: 'From text to vectors', milestones: ['m1'],
      canDo: 'split text into tokens the way a BPE tokenizer does, and say how each token becomes a vector that carries its position',
      objectives: [
        { id: 'l1.o1', text: 'Explain how byte pair encoding builds a subword vocabulary and why token counts differ from word counts' },
        { id: 'l1.o2', text: 'Describe how a token id becomes the input vector: an embedding lookup plus positional information' },
      ],
      practice: 'lessons/0001.practice.js',
    },
    {
      n: 2, file: 'lessons/0002-self-attention.html', title: 'Self-attention', milestones: ['m2'],
      canDo: 'compute the attention weights and output of one query, with a causal mask, from its query, keys and values',
      objectives: [
        { id: 'l2.o1', text: 'Compute the attention weights of one query: dot products with the keys, divide by the square root of d_k, softmax' },
        { id: 'l2.o2', text: 'Explain the output of attention as a weighted average of value vectors, and which positions a causal mask lets each token use' },
      ],
      practice: 'lessons/0002.practice.js',
    },
    {
      n: 3, file: 'lessons/0003-blocks-and-generation.html', title: 'Blocks and generation', milestones: ['m3'],
      canDo: 'trace a vector through one decoder block, and explain how the model writes a reply one sampled token at a time',
      objectives: [
        { id: 'l3.o1', text: 'Trace one vector through a pre-LN decoder block: layer norm, attention, residual add, layer norm, MLP, residual add' },
        { id: 'l3.o2', text: 'Explain autoregressive generation and predict how temperature reshapes the next-token distribution' },
      ],
      practice: 'lessons/0003.practice.js',
    },
  ],
  strings: {},
};
