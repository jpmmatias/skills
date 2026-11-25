// Practice items for lesson 1, as data. Copy to lessons/NNNN.practice.js and load it from the lesson page
// (after course.js). review.html loads it too, so the same items come back in spaced review.
//
// Every item: id (unique in the course, lowercase-with-hyphens; never reuse or renumber one), type, prompt,
//   objective (an id from course.js lessons[].objectives; defaults to 'l<n>').
// Editing what the learner answers (prompt, options, accepted answers, steps, blanks) starts a new history for
// that item; editing only a `why` keeps it.
// Prompts and `why` may use <b> <i> <em> <strong> <code> <sup> <sub> <br> <a href>; anything else shows as text.
// Prefer recall, order and fade items: they are what spaced review asks first, and Understood needs one.
Learncraft.practice(1, [
  { id: 'l1-weights-sum', type: 'choice', objective: 'l1.o1',
    prompt: 'For one query, what do its attention weights add up to?',
    options: [
      { text: '1', correct: true, why: 'They come out of a softmax, which turns any scores into a distribution.' },
      { text: 'The sequence length', why: 'That is how many weights there are, not what they add up to.' },
      { text: 'It depends on the scores', why: 'The scores can be anything; the softmax rescales them so the weights always add up to 1.' },
    ] },
  { id: 'l1-recall-softmax', type: 'recall', objective: 'l1.o1',
    prompt: 'Which function turns raw attention scores into weights?',
    accept: ['softmax', 'soft max', 'the softmax'],
    why: 'Softmax exponentiates each score and divides by the total, so the weights are positive and add up to 1.' },
  { id: 'l1-recall-scale', type: 'recall', objective: 'l1.o2',
    prompt: 'Keys have <code>d_k = 64</code> dimensions. What do the scores get divided by?',
    accept: ['8', 'sqrt(64)', '√64'], tolerance: 0.01,
    why: 'The scale is √d_k = √64 = 8. It keeps large dot products from pushing the softmax into a near one-hot output.' },
  { id: 'l1-order-steps', type: 'order', objective: 'l1.o2',
    prompt: 'Put the steps of one attention head in order.',
    steps: ['Multiply queries by keys', 'Divide by √d_k', 'Apply softmax', 'Weight the values and sum'],
    why: 'Scores first, then scale, then normalise, then mix the values.' },
  { id: 'l1-fade-formula', type: 'fade', objective: 'l1.o2',
    prompt: 'Fill in the two blanks of the attention formula.',
    template: 'weights = softmax(Q · {{K}}ᵀ / √{{d_k}})',
    blanks: { K: ['K'], d_k: ['d_k', 'dk', 'd k'] },
    labels: { K: 'the matrix multiplied by Q', d_k: 'the key dimension' },
    why: 'Queries meet keys; the key dimension sets the scale.' },
]);
