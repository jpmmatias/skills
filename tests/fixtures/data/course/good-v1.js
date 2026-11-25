// v1 fixture (no schemaVersion): accepted unchanged.
window.COURSE = {
  "id": "old-course",
  "topic": "Old",
  "mission": "A v1 course without schemaVersion",
  "milestones": [
    {
      "id": "m1",
      "label": "One",
      "canDo": "Do one thing",
      "status": "in-progress",
      "evidence": null
    }
  ],
  "lessons": [
    {
      "n": 1,
      "file": "lessons/0001-one.html",
      "title": "One",
      "milestones": [
        "m1"
      ],
      "canDo": "one"
    }
  ]
};
