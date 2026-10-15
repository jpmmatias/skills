// Course manifest: the single source of truth for the dashboard and lesson headers.
// Update when a lesson is added, a learning record is written, or the mission changes.
// Milestone status: 'mastered' (evidence in a learning record) | 'in-progress' | 'locked'.
window.COURSE = {
  id: 'topic-slug',
  topic: 'Topic',
  mission: 'One-line mission from MISSION.md',
  milestones: [
    { id: 'm1', label: 'Short label', canDo: 'What the learner can do (from MISSION.md success criteria)', status: 'in-progress', evidence: null },
  ],
  lessons: [
    // { n: 1, file: 'lessons/0001-slug.html', title: 'Lesson title', milestones: ['m1'], canDo: 'what practice proves' },
  ],
};
