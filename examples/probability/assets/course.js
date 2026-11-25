// Course manifest (schemaVersion 2) for the shipped EXAMPLE course "Probability & Statistics, by experiment".
// This is an example: it carries no learner progress, no learning records and no milestone evidence.
// Strings are plain text: the runtime escapes them.
window.COURSE = {
  schemaVersion: 2,
  id: 'probability-example',
  topic: 'Probability & Statistics, by experiment',
  lang: 'en',
  example: true,
  mission: 'Reason about randomness in A/B tests and dashboards instead of eyeballing it: simulate it, measure its noise, and weigh evidence against base rates.',
  milestones: [
    { id: 'm1', label: 'Simulate a metric', canDo: 'Write down the distribution of a metric, sample from it, and show how its frequencies settle as the sample grows', status: 'in-progress', evidence: null },
    { id: 'm2', label: 'Size the noise', canDo: 'Compute the expected value and standard error of a dashboard metric and say how many users it takes to halve the noise', status: 'locked', evidence: null },
    { id: 'm3', label: 'Weigh a signal', canDo: 'Turn a base rate, a hit rate and a false-alarm rate into the chance that a flagged result is real', status: 'locked', evidence: null },
  ],
  lessons: [
    {
      n: 1, file: 'lessons/0001-distributions-and-sampling.html', title: 'Distributions and sampling', milestones: ['m1'],
      canDo: 'write the PMF of a discrete outcome, sample from it with a uniform random number, and say what more samples do to the observed frequencies',
      objectives: [
        { id: 'l1.o1', text: 'Build the PMF of a discrete random variable and use it to compute the probability of an event' },
        { id: 'l1.o2', text: 'Sample from a PMF and predict how empirical frequencies behave as the number of draws grows' },
      ],
      practice: 'lessons/0001.practice.js',
    },
    {
      n: 2, file: 'lessons/0002-expected-value-and-variance.html', title: 'Expected value and variance', milestones: ['m2'],
      canDo: 'compute the expected value and variance of a discrete distribution, combine them for sums, and compute the standard error of a sample mean and of an A/B difference',
      objectives: [
        { id: 'l2.o1', text: 'Compute E[X] and Var(X) of a discrete distribution and combine them for sums of variables' },
        { id: 'l2.o2', text: 'Compute the standard error σ/√n of a sample mean, and of the difference between two independent means, and predict how it changes with n' },
      ],
      practice: 'lessons/0002.practice.js',
    },
    {
      n: 3, file: 'lessons/0003-conditional-probability.html', title: 'Conditional probability and base rates', milestones: ['m3'],
      canDo: 'compute P(condition | positive) from a base rate, sensitivity and specificity with a natural-frequency tree and with Bayes’ rule',
      objectives: [
        { id: 'l3.o1', text: 'Compute a conditional probability with a natural-frequency tree and Bayes’ rule, and say how the base rate changes it' },
      ],
      practice: 'lessons/0003.practice.js',
    },
  ],
  strings: {},
};
