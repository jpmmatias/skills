// Reusable quiz component.
// Markup: <div class="quiz-q" data-answer="X" data-why="explanation">
//           <p>Question</p><div class="quiz-opts"><button>X</button><button>Y</button></div>
//         </div>
// Optional <div class="quiz-score"></div> anywhere shows the running score.
// Options are shuffled so their position never hints at the answer.
(function () {
  const qs = [...document.querySelectorAll('.quiz-q')];
  const score = document.querySelector('.quiz-score');
  let answered = 0, correct = 0;

  const render = () => {
    if (score) score.textContent = `${correct} / ${qs.length} correct on first try` + (answered < qs.length ? ` · ${qs.length - answered} left` : ' · done');
  };

  qs.forEach((q, qi) => {
    const opts = q.querySelector('.quiz-opts');
    const btns = [...opts.children];
    for (let i = btns.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [btns[i], btns[j]] = [btns[j], btns[i]];
    }
    btns.forEach((b) => opts.appendChild(b));

    const fb = document.createElement('div');
    fb.className = 'quiz-fb';
    q.appendChild(fb);
    let first = true;

    btns.forEach((b) => b.addEventListener('click', () => {
      const right = b.textContent.trim() === q.dataset.answer;
      b.classList.add(right ? 'ok' : 'bad');
      if (first) { answered++; if (right) correct++; first = false; render(); window.Progress && Progress.record('q' + (qi + 1), right); }
      fb.className = 'quiz-fb ' + (right ? 'ok' : 'bad');
      fb.textContent = right ? '✓ ' + (q.dataset.why || '') : '✗ Not quite — try again.';
      if (right) btns.forEach((x) => (x.disabled = true));
    }));
  });
  render();
})();
