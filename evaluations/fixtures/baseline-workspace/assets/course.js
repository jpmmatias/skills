// Course manifest (audit fixture): 3 milestones, 2 lessons. Mirrors starter/assets/course.js shape.
window.COURSE = {
  id: 'audit-fixture',
  topic: 'Confidence-gated automation',
  mission: 'Ship a classifier route that acts automatically only when it is safe to',
  milestones: [
    { id: 'm1', label: 'Measure', canDo: 'Measure how often a model output varies and pick a success criterion', status: 'mastered', evidence: 'LR-0001' },
    { id: 'm2', label: 'Threshold', canDo: 'Choose an act threshold from labelled data', status: 'in-progress', evidence: null },
    { id: 'm3', label: 'Ship', canDo: 'Ship the gated route with a regression check', status: 'locked', evidence: null },
  ],
  lessons: [
    { n: 1, file: 'lessons/0001-one-prompt-many-answers.html', title: 'One prompt, many answers', milestones: ['m1'], canDo: 'replace an exact-match test with property checks over many trials' },
    { n: 2, file: 'lessons/0002-pick-the-threshold.html', title: 'Pick the threshold', milestones: ['m2'], canDo: 'pick the lowest act threshold that meets an accuracy target' },
  ],
};
