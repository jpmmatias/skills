// Course manifest (schemaVersion 2) for the shipped example course "React Rendering Internals".
// example: true → the dashboard says "Example course — no learner progress is included".
// No learner exists: milestone evidence is null, there are no learning records and no progress exports.
window.COURSE = {
  schemaVersion: 2,
  id: 'react-rendering-example',
  topic: 'React Rendering Internals',
  lang: 'en',
  example: true,
  mission: 'Stop guessing why components re-render: predict what React does after a state update, and back every performance fix with evidence from your own app.',
  milestones: [
    { id: 'm1', label: 'Predict a render',
      canDo: 'predict which components render and which DOM nodes change after a state update in your own app, and confirm it in React DevTools',
      status: 'in-progress', evidence: null },
    { id: 'm2', label: 'Diagnose with evidence',
      canDo: 'explain a surprising re-render or effect run in your own app from Profiler evidence and pick the fix that evidence supports',
      status: 'locked', evidence: null },
  ],
  lessons: [
    {
      n: 1, file: 'lessons/0001-render-and-commit.html', title: 'What “render” means', milestones: ['m1'],
      canDo: 'tell rendering apart from committing and painting, and predict when React keeps or resets a component',
      objectives: [
        { id: 'l1.o1', text: 'Explain what rendering is and put trigger, render, commit and paint in order for one update' },
        { id: 'l1.o2', text: 'Predict whether React keeps or resets a component’s state and DOM from its type, position and key' },
      ],
      practice: 'lessons/0001.practice.js',
    },
    {
      n: 2, file: 'lessons/0002-state-updates.html', title: 'How a state update spreads', milestones: ['m1'],
      canDo: 'predict the state value, the number of renders and the components that render after a set call',
      objectives: [
        { id: 'l2.o1', text: 'Predict the state value inside a handler and in the next render after a series of set calls' },
        { id: 'l2.o2', text: 'Predict which components render after a state update, and which of them change the DOM' },
      ],
      practice: 'lessons/0002.practice.js',
    },
    {
      n: 3, file: 'lessons/0003-effects-and-memo.html', title: 'Effects, Strict Mode and memoization', milestones: ['m2'],
      canDo: 'place effects after commit, recognise development-only double calls, and choose when memoization skips work',
      objectives: [
        { id: 'l3.o1', text: 'Place useEffect after commit in the update sequence and predict what Strict Mode repeats in development' },
        { id: 'l3.o2', text: 'Choose whether memo, useMemo or useCallback will skip work, given the props and the evidence' },
      ],
      practice: 'lessons/0003.practice.js',
    },
  ],
  strings: {},
};
