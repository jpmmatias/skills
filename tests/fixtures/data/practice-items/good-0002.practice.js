// Practice items as data (plan §4). Loaded by loadPracticeJs().
Learncraft.practice(2, [
  {
    "id": "l2-softmax-sum",
    "type": "choice",
    "objective": "l2.o1",
    "prompt": "What do softmax outputs sum to?",
    "options": [
      {
        "text": "1",
        "correct": true,
        "why": "Each output is divided by the total."
      },
      {
        "text": "0",
        "why": "Every output is positive."
      },
      {
        "text": "It depends on the inputs",
        "why": "Normalisation removes that dependence."
      }
    ]
  },
  {
    "id": "l2-softmax-name",
    "type": "recall",
    "objective": "l2.o1",
    "prompt": "Name the function that turns scores into weights.",
    "accept": [
      "softmax",
      "soft max"
    ]
  },
  {
    "id": "l2-softmax-fade",
    "type": "fade",
    "objective": "l2.o2",
    "prompt": "Complete the formula.",
    "template": "w_i = exp(s_i) / {{denominator}}",
    "blanks": {
      "denominator": [
        "Σ exp(s_j)",
        "sum exp(s_j)"
      ]
    },
    "labels": {
      "denominator": "denominator"
    }
  }
]);
