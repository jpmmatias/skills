// Goal + progress + evidence-based gamification. Needs assets/course.js loaded first.
//
// Lesson page:  <body data-lesson="1"> … <div id="progress"></div>
//               load course.js, then progress.js, then quiz.js and diagram.js
// Dashboard:    <div id="dashboard"></div>
//
// Practice components call Progress.record(id, correct) on a learner's FIRST attempt.
// Custom practice widgets: add the attribute data-practice to the widget's root element so it counts
// toward lesson completion, and call Progress.record from it (built-ins are counted automatically).
// XP only comes from first-try correct retrieval. Milestones are evidence-gated in course.js and
// are never unlocked from here. Review is due after expanding intervals (1, 3, 7, 14 days).
(function () {
  const C = window.COURSE;
  if (!C) return;
  const ROOT = new URL('..', document.currentScript.src).href;
  const KEY = 'learn:' + C.id;
  const DAY = 864e5, INTERVALS = [1, 3, 7, 14, 30];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
  let S = Object.assign({ xp: 0, answers: {}, lessons: {} }, load());

  const lessonN = +document.body.dataset.lesson || null;
  const lesson = C.lessons.find((l) => l.n === lessonN);
  const msById = Object.fromEntries(C.milestones.map((m) => [m.id, m]));

  const mastery = (n) => {
    const a = Object.entries(S.answers).filter(([k]) => k.startsWith('L' + n + ':')).map(([, v]) => v);
    return a.length ? { pct: Math.round((100 * a.filter((x) => x.ok).length) / a.length), done: a.length } : null;
  };
  const due = (n) => {
    const L = S.lessons[n];
    if (!L) return null;
    return L.last + INTERVALS[Math.min(L.stage, INTERVALS.length - 1)] * DAY;
  };
  const rel = (t) => {
    const d = Math.round((t - Date.now()) / DAY);
    return d <= 0 ? 'due now' : d === 1 ? 'in 1 day' : `in ${d} days`;
  };
  const level = () => Math.floor(S.xp / 100) + 1;

  // ---------- milestone path (SVG, animated fill) ----------
  function path(highlight = []) {
    const ms = C.milestones, W = 640, H = 78, pad = 70, step = (W - 2 * pad) / (ms.length - 1);
    const doneCount = ms.filter((m) => m.status === 'mastered').length;
    const activeIdx = ms.findIndex((m) => m.status !== 'mastered');
    const fillTo = activeIdx < 0 ? ms.length - 1 : activeIdx;
    let s = `<svg class="dg pg-path" viewBox="0 0 ${W} ${H}" role="img" aria-label="Milestones: ${doneCount} of ${ms.length} mastered">`;
    s += `<line x1="${pad}" x2="${W - pad}" y1="24" y2="24" class="pg-track"/>`;
    s += `<line x1="${pad}" x2="${pad + fillTo * step}" y1="24" y2="24" class="pg-fill"/>`;
    ms.forEach((m, i) => {
      const x = pad + i * step, hl = highlight.includes(m.id);
      const cls = m.status === 'mastered' ? 'pg-done' : m.status === 'in-progress' ? 'pg-active' : 'pg-locked';
      const icon = m.status === 'mastered' ? '✓' : m.status === 'in-progress' ? String(i + 1) : '🔒';
      s += `<g class="pg-node ${cls}${hl ? ' pg-hl' : ''}"><circle cx="${x}" cy="24" r="${hl ? 15 : 12}"/>` +
        `<text x="${x}" y="29" text-anchor="middle" class="pg-icon">${icon}</text>` +
        `<text x="${x}" y="60" text-anchor="middle" class="pg-lab">${m.label}</text></g>`;
    });
    return s + '</svg>';
  }
  function animatePath(root) {
    const f = root.querySelector('.pg-fill');
    if (!f || RM) return;
    const len = f.getTotalLength ? f.getTotalLength() : 0;
    f.style.strokeDasharray = len; f.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
  }

  // ---------- lesson header ----------
  function header() {
    const el = document.getElementById('progress');
    if (!el || !lesson) return;
    const m = mastery(lessonN), d = due(lessonN);
    el.className = 'pg-header';
    el.innerHTML =
      `<div class="pg-top"><a href="${ROOT}index.html" class="pg-mission">🎯 ${C.mission}</a>` +
      `<span class="pg-xp" title="XP comes only from first-try correct answers">⚡ ${S.xp} XP · level ${level()}</span></div>` +
      path(lesson.milestones) +
      `<div class="pg-meta">This lesson builds <strong>${lesson.milestones.map((id) => msById[id].label).join(', ')}</strong>` +
      ` · Practice mastery: <strong class="pg-m">${m ? m.pct + '%' : '–'}</strong>` +
      (d ? ` · Next review: <strong>${rel(d)}</strong>` : '') + `</div>`;
    animatePath(el);
  }

  // ---------- completion banner ----------
  let expected = 0, toasted = false;
  function maybeComplete() {
    const answered = Object.keys(S.answers).filter((k) => k.startsWith('L' + lessonN + ':')).length;
    if (toasted || !expected || answered < expected) return;
    toasted = true;
    const m = mastery(lessonN);
    const t = document.createElement('div');
    t.className = 'pg-toast';
    t.innerHTML = `<strong>Practice complete: ${m.pct}% first try.</strong> ` +
      (m.pct >= 80 ? `You can now ${lesson.canDo}. ` : `Look again at the ones you missed. Spaced review will bring them back. `) +
      `<a href="#challenge">Next: 🏆 the milestone challenge</a>, which unlocks <em>${lesson.milestones.map((id) => msById[id].label).join(', ')}</em> once I review it.`;
    document.body.append(t);
    setTimeout(() => t.classList.add('pg-toast-in'), 30);
    t.onclick = () => t.remove();
  }

  // ---------- public API ----------
  window.Progress = {
    record(id, ok) {
      if (!lessonN) return;
      const k = `L${lessonN}:${id}`;
      const first = !(k in S.answers);
      S.answers[k] = { ok, at: Date.now() };
      if (ok && first) S.xp += 10;
      const L = S.lessons[lessonN] || { stage: 0, last: 0 };
      if (!L.last) L.last = Date.now();
      else if (Date.now() >= L.last + INTERVALS[Math.min(L.stage, INTERVALS.length - 1)] * DAY) { L.stage++; L.last = Date.now(); }
      S.lessons[lessonN] = L;
      save(S);
      if (ok && first) bump();
      refresh();
      maybeComplete();
    },
  };
  function bump() {
    const x = document.querySelector('.pg-xp');
    if (!x || RM) return;
    x.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 350 });
  }
  function refresh() {
    const x = document.querySelector('.pg-xp'), m = document.querySelector('.pg-m');
    if (x) x.textContent = `⚡ ${S.xp} XP · level ${level()}`;
    const mm = mastery(lessonN);
    if (m && mm) m.textContent = mm.pct + '%';
  }

  // ---------- dashboard ----------
  function dashboard() {
    const el = document.getElementById('dashboard');
    if (!el) return;
    const mastered = C.milestones.filter((m) => m.status === 'mastered').length;
    const dueNow = C.lessons.filter((l) => due(l.n) && due(l.n) <= Date.now());
    el.innerHTML =
      `<div class="box win"><div class="kicker">Mission</div><p style="margin:.3rem 0 0;font-size:1.15rem">${C.mission}</p></div>` +
      `<div class="pg-stats"><div><b>${mastered}/${C.milestones.length}</b>milestones</div><div><b>${S.xp}</b>XP · level ${level()}</div>` +
      `<div><b>${dueNow.length}</b>reviews due</div></div>` +
      `<h2>Milestones</h2>` + path() +
      `<ol class="pg-ms">` + C.milestones.map((m) =>
        `<li class="pg-${m.status}"><strong>${m.label}</strong>: ${m.canDo}. <span class="pg-st">${
          m.status === 'mastered' ? '✓ mastered' + (m.evidence ? ` (${m.evidence})` : '') :
          m.status === 'in-progress' ? 'in progress: send me the challenge' : '🔒 locked'}</span></li>`).join('') + `</ol>` +
      `<p class="note">Milestones unlock only when your teacher reviews your challenge work. Quiz scores show practice, not mastery.</p>` +
      `<h2>Lessons</h2><div class="pg-lessons">` + C.lessons.map((l) => {
        const m = mastery(l.n), d = due(l.n);
        return `<a class="pg-lesson" href="${ROOT}${l.file}"><span class="pg-n">${l.n}</span><span class="pg-t">${l.title}` +
          `<small>${l.milestones.map((id) => msById[id].label).join(' · ')}${d ? ' · review ' + rel(d) : ' · not started'}</small></span>` +
          `<span class="pg-bar"><i style="width:${m ? m.pct : 0}%"></i></span><span class="pg-pct">${m ? m.pct + '%' : '–'}</span></a>`;
      }).join('') + `</div>`;
    animatePath(el);
  }

  header();
  dashboard();
  if (lessonN) {
    expected = document.querySelectorAll('.quiz-q, .band-quiz, .fade, .threshold-explorer[data-target], [data-practice]').length;
    if (Object.keys(S.answers).filter((k) => k.startsWith('L' + lessonN + ':')).length >= expected) toasted = true; // already complete: don't re-toast
  }
})();
