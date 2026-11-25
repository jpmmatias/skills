// Course manifest (schemaVersion 2): the single source of truth for the dashboard, lesson strips and review.
// Update it when a lesson is added, a learning record is written, or the mission changes.
// Strings are plain text: the runtime escapes them, so `x < y & z` is safe and HTML tags show as text.
window.COURSE = {
  schemaVersion: 2,
  // A unique id for THIS course (lowercase, hyphens). Progress is stored under it, and every local file shares one
  // browser storage, so two courses with the same id would mix their progress. The validator rejects 'topic-slug'.
  id: 'topic-slug',
  topic: 'Topic',
  lang: 'en',            // course language: 'en' or 'pt' (Brazilian Portuguese) for the built-in interface strings
  example: false,        // true only for shipped example courses: shows "Example course — no learner progress is included"
  mission: 'One-line mission from MISSION.md',
  // Milestone status: 'mastered' (evidence in a learning record) | 'in-progress' | 'locked'.
  // Only the teacher changes status, after a challenge review. evidence: 'LR-0001' or 'learning-records/0001-slug.md'.
  milestones: [
    { id: 'm1', label: 'Short label', canDo: 'What the learner can do (from MISSION.md success criteria)', status: 'in-progress', evidence: null },
  ],
  lessons: [
    // {
    //   n: 1, file: 'lessons/0001-slug.html', title: 'Lesson title', milestones: ['m1'],
    //   canDo: 'what practice proves, completing "By the end you can …"',
    //   objectives: [ { id: 'l1.o1', text: 'Explain why …' } ],   // practice items name one of these
    //   practice: 'lessons/0001.practice.js'                        // optional; this path is the default
    // },
  ],
  strings: {},           // optional overrides of interface strings, e.g. { 'next.title': 'Up next' }
};
