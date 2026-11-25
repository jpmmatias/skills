// Backward compatibility only. Lessons written before Learncraft 2 load course.js → progress.js → quiz.js
// (→ diagram.js). Quizzes are now rendered by practice.js from data (lessons/NNNN.practice.js), and the
// .quiz-q / .fade markup in those older lessons is upgraded in place by practice.js: stable ids, per-option
// feedback, announced results, first try kept. This file only makes sure that runtime is on the page.
// New lessons do not include it.
(function () {
  var me = document.currentScript, LC = window.Learncraft || {};
  if (!me) return;
  var base = me.src.replace(/[^\/?#]*([?#].*)?$/, '');
  var need = [];
  if (!LC.ready) need.push('core.js');
  if (!LC.store) need.push('store.js');
  if (!LC.practiceItems) need.push('practice.js'); // core.js defines a queueing practice(); practiceItems is practice.js's own
  if (!need.length) return;
  if (document.readyState === 'loading') {
    // Parser-inserted, so they run in order before the next <script> tag in the lesson.
    document.write(need.map(function (f) { return '<script src="' + base + f + '"></' + 'script>'; }).join(''));
  } else {
    need.forEach(function (f) { var s = document.createElement('script'); s.src = base + f; s.async = false; document.head.appendChild(s); });
  }
})();
