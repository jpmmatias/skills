window.COURSE = {
  "schemaVersion": 3,
  "id": "fixture-attention",
  "topic": "Attention from scratch",
  "lang": "en",
  "example": true,
  "mission": "Compute one attention head by hand and explain each step.",
  "milestones": [
    {
      "id": "m1",
      "label": "Scores",
      "canDo": "Compute attention scores for a 3-token input",
      "status": "mastered",
      "evidence": "LR-0002"
    },
    {
      "id": "m2",
      "label": "Weights",
      "canDo": "Turn scores into weights and mix values",
      "status": "in-progress",
      "evidence": null
    }
  ],
  "lessons": [
    {
      "n": 1,
      "file": "lessons/0001-dot-products.html",
      "title": "Dot products",
      "milestones": [
        "m1"
      ],
      "canDo": "Compute a dot product",
      "objectives": [
        {
          "id": "l1.o1",
          "text": "Compute a dot product of two vectors"
        }
      ],
      "practice": "lessons/0001.practice.js"
    },
    {
      "n": 2,
      "file": "lessons/0002-softmax.html",
      "title": "Softmax",
      "milestones": [
        "m2"
      ],
      "canDo": "Apply softmax",
      "requires": [
        1
      ],
      "objectives": [
        {
          "id": "l2.o1",
          "text": "Explain why softmax outputs sum to 1"
        },
        {
          "id": "l2.o2",
          "text": "Compute softmax for three scores"
        }
      ],
      "practice": "lessons/0002.practice.js"
    }
  ],
  "strings": {
    "dashboard.next": "Next up"
  }
};
