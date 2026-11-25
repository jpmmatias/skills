// Learncraft practice: renders retrieval practice from data, records every attempt through Learncraft.store,
// and runs the cold review session in review.html. Needs core.js; uses store.js and course.js when present.
//
// Data (lessons/NNNN.practice.js):
//   Learncraft.practice(3, [ { id, type: 'choice'|'recall'|'order'|'fade', objective?, prompt, … } ]);
//     choice  options: [{ text, correct?, why? }]   every option's `why` is shown when it is picked; code: true → mono
//     recall  accept: ['softmax', 42, { answer: 3.14, tolerance: 0.01 }, …], tolerance?: 0.01 (numeric answers;
//             an { answer, tolerance } entry has its own), why?   Text matching: Learncraft.store.matchAnswer. The typed answer (first 200
//             characters) is kept in the attempt's note, so the teacher can see misconceptions in an export.
//             Graded after normalising: trim, case-fold, collapse spaces, strip trailing . , ; : ! ? and quotes.
//             After 2 misses the expected answer is shown; later attempts are recorded with assisted: true.
//     order   steps: ['first', 'second', …] in the right order (shown shuffled; ↑/↓ buttons, keyboard-operable)
//     fade    template: 'scores = Q · {{K}}ᵀ', blanks: { K: ['K'] }, labels?: { K: 'the key matrix' }, code?: false
//   `prompt` and `why` may hold light markup (b, i, em, strong, code, sup, sub, br, a href); everything else is text.
//   pretest: true   asked before teaching (a guess). Recorded with context 'diagnostic': never a first try, never
//                   counted in levels, the lesson counter or review entry, and never drawn into review sessions.
// Placement: <div data-practice-set></div> renders the lesson's items in order (one "Check yourself" list);
//            <div data-practice-item="id"></div> renders one item anywhere.
// Option order: shuffled with Learncraft.rng(item id + page session), so it is stable while the page is open and
//   changes on reload (position never becomes the cue). Set Learncraft.seed before load for fixed screenshots.
// Records: only the first-ever attempt on an item version counts as "first try"; it is never overwritten. A reload
//   shows that first result; answering again is practice (attemptInSession > 1 or a later session).
// Legacy markup keeps working: .quiz-q (buttons, data-answer, data-why) and .fade (inputs with data-answer,
//   optional data-accept="a|b", a .fade-check button). Ids come from data-id, else a positional "legacy:" id.
//   window.Progress.record(id, ok) remains for custom widgets (recorded as "legacy:<id>").
(function (root) {
  'use strict';
  const LC = root.Learncraft;
  if (!LC) { console.error('[learncraft] practice.js needs assets/core.js loaded first'); return; }
  const { html, t, sanitize } = LC;
  const doc = root.document;

  Object.assign(LC.i18n.en, {
    check: 'Check', right: 'Right.', notQuite: 'Not quite.', tryAnother: 'Try another option.',
    'mark.ok': 'right', 'mark.bad': 'not right',
    'recall.label': 'Your answer', 'recall.empty': 'Type an answer first.', 'recall.again': 'Try again: check the spelling and the units.',
    'recall.reveal': 'The expected answer: {answer}.',
    'order.up': 'Move up: {step}', 'order.down': 'Move down: {step}', 'order.moved': '{step}: position {pos} of {n}',
    'order.check': 'Check order', 'order.right': 'That is the order.',
    'order.partial': '{k} of {n} in the right place. Move the ones marked ✗.', 'order.reveal': 'The right order: {list}.',
    'fade.blank': 'Blank {i} of {m}: {name}', 'fade.all': 'Every blank is correct.',
    'fade.partial': '{k} of {m} blanks right. Look again at {list}.', 'fade.reveal': 'Expected: {list}.',
    'prior.right': 'Your first try ({date}): right.',
    'prior.wrong': 'Your first try ({date}): not right. Answering again is practice and does not change that record.',
    'set.count': '{answered} of {total} answered · {right} right on the first try',
    'set.done': 'Practice done: {right} of {total} right on the first try.',
    'set.good': 'You look ready for the challenge.', 'set.low': 'Look again at the ones you missed; they come back in review.',
    'set.recall': 'Before the challenge, get one recall, fill-in or ordering question right from memory.',
    'set.proof': 'Practice is not proof: the challenge is what shows you can {canDo}.', 'set.proofPlain': 'Practice is not proof: the challenge is.',
    'set.link': 'Go to the challenge', dismiss: 'Dismiss',
    'review.loading': 'Loading practice…', 'review.count': '{cards} topics · {items} questions',
    'review.intro': 'Lesson text stays hidden on purpose: answering from memory is what makes it stick. Only your first answer to each question counts.',
    'review.none': 'Nothing is due for review today.', 'review.next': 'Next review: {date}.',
    'review.unscheduled': 'Nothing is scheduled yet. When you finish a lesson’s practice, its first review is due the next day.',
    'review.anyway': 'Practice anyway', 'review.practiceNote': 'Practice mode: answers are saved as practice and never move your review schedule.',
    'review.pass': '{ok}/{n} correct → box {box}, next review {date}.', 'review.fail': '{ok}/{n} correct → back to box 1, next review {date}.',
    'review.early': '{ok}/{n} correct. Early review: box {box} unchanged, due {date}.',
    'review.revisit': 'Revisit lesson {n}: {title}', 'review.results': 'Results', 'review.done': 'Session complete.',
    'review.noItems': 'No practice items were found. Each lesson’s items live in lessons/NNNN.practice.js.',
    'review.noStore': 'Progress storage is not available, so a review cannot be scheduled on this page.',
    'review.objective': 'Lesson {n}'
  });
  Object.assign(LC.i18n.pt, {
    check: 'Verificar', right: 'Certo.', notQuite: 'Ainda não.', tryAnother: 'Tente outra opção.',
    'mark.ok': 'certo', 'mark.bad': 'errado',
    'recall.label': 'Sua resposta', 'recall.empty': 'Digite uma resposta primeiro.', 'recall.again': 'Tente de novo: confira a grafia e as unidades.',
    'recall.reveal': 'A resposta esperada: {answer}.',
    'order.up': 'Mover para cima: {step}', 'order.down': 'Mover para baixo: {step}', 'order.moved': '{step}: posição {pos} de {n}',
    'order.check': 'Verificar ordem', 'order.right': 'Essa é a ordem.',
    'order.partial': '{k} de {n} no lugar certo. Mova os marcados com ✗.', 'order.reveal': 'A ordem certa: {list}.',
    'fade.blank': 'Lacuna {i} de {m}: {name}', 'fade.all': 'Todas as lacunas estão certas.',
    'fade.partial': '{k} de {m} lacunas certas. Revise {list}.', 'fade.reveal': 'Esperado: {list}.',
    'prior.right': 'Sua primeira tentativa ({date}): certa.',
    'prior.wrong': 'Sua primeira tentativa ({date}): errada. Responder de novo é prática e não muda esse registro.',
    'set.count': '{answered} de {total} respondidas · {right} certas na primeira tentativa',
    'set.done': 'Prática concluída: {right} de {total} certas na primeira tentativa.',
    'set.good': 'Você parece pronto para o desafio.', 'set.low': 'Revise as que você errou; elas voltam na revisão.',
    'set.recall': 'Antes do desafio, acerte de memória uma pergunta de lembrar, completar ou ordenar.',
    'set.proof': 'Prática não é prova: o desafio é o que mostra que você consegue {canDo}.', 'set.proofPlain': 'Prática não é prova: o desafio é.',
    'set.link': 'Ir para o desafio', dismiss: 'Fechar',
    'review.loading': 'Carregando a prática…', 'review.count': '{cards} tópicos · {items} perguntas',
    'review.intro': 'O texto das lições fica escondido de propósito: responder de memória é o que fixa. Só a primeira resposta de cada pergunta conta.',
    'review.none': 'Nada para revisar hoje.', 'review.next': 'Próxima revisão: {date}.',
    'review.unscheduled': 'Nada agendado ainda. Quando você terminar a prática de uma lição, a primeira revisão fica para o dia seguinte.',
    'review.anyway': 'Praticar mesmo assim', 'review.practiceNote': 'Modo prática: as respostas ficam salvas como prática e nunca mudam o agendamento das revisões.',
    'review.pass': '{ok}/{n} certas → caixa {box}, próxima revisão {date}.', 'review.fail': '{ok}/{n} certas → de volta à caixa 1, próxima revisão {date}.',
    'review.early': '{ok}/{n} certas. Revisão antecipada: caixa {box} mantida, prevista para {date}.',
    'review.revisit': 'Rever a lição {n}: {title}', 'review.results': 'Resultados', 'review.done': 'Sessão concluída.',
    'review.noItems': 'Nenhum item de prática encontrado. Os itens de cada lição ficam em lessons/NNNN.practice.js.',
    'review.noStore': 'O armazenamento do progresso não está disponível, então a revisão não pode ser agendada nesta página.',
    'review.objective': 'Lição {n}'
  });

  // ---------- registry ----------
  const ID = /^[a-z0-9][a-z0-9-]*$/;
  const TYPES = { choice: 1, recall: 1, order: 1, fade: 1 };
  const items = {}, byLesson = {};
  LC.practice = function (n, list) {
    n = +n;
    byLesson[n] = byLesson[n] || [];
    (list || []).forEach((raw, i) => {
      const it = Object.assign({}, raw, { lesson: n });
      if (!it.id || !ID.test(it.id)) console.warn(`[learncraft] lesson ${n} item ${i + 1}: id "${it.id}" must match ${ID}`);
      if (!TYPES[it.type]) { console.warn(`[learncraft] item ${it.id}: unknown type "${it.type}" (skipped)`); return; }
      if (items[it.id]) { console.warn(`[learncraft] duplicate practice id "${it.id}" (later one skipped)`); return; }
      it.objective = it.objective || 'l' + n;
      items[it.id] = it;
      byLesson[n].push(it);
    });
  };
  (LC._pendingPractice || []).splice(0).forEach((args) => LC.practice(args[0], args[1])); // files loaded before this one
  LC.practiceItems = (n) => (n == null ? Object.keys(items).map((k) => items[k]) : (byLesson[n] || []).slice());

  // ---------- helpers ----------
  const lessonN = () => +doc.body.getAttribute('data-lesson') || null;
  const course = () => root.COURSE || { lessons: [], milestones: [] };
  const store = () => LC.courseStore && LC.courseStore();
  const plain = (s) => { const d = doc.createElement('div'); d.innerHTML = sanitize(s); return d.textContent; };
  let uid = 0;
  const nextId = (p) => 'lc-' + p + '-' + (++uid);
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function version(it) { // what the learner answers; editing it starts a new history (store.itemVersion when present)
    const x = { type: it.type, prompt: it.prompt, accept: it.accept, steps: it.steps, template: it.template, blanks: it.blanks,
      options: Array.isArray(it.options) ? it.options.map((o) => ({ text: o && o.text, correct: !!(o && o.correct) })) : undefined };
    const S = LC.store;
    return S && typeof S.itemVersion === 'function' ? S.itemVersion(x) : hash(JSON.stringify(x));
  }
  function shuffle(arr, seed) {
    const r = LC.rng(seed + ':' + (LC.seed != null ? LC.seed : LC.session)), a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function fmtDate(ms) {
    try { return new Intl.DateTimeFormat(LC.lang(), { month: 'short', day: 'numeric' }).format(new Date(ms)); }
    catch (e) { return new Date(ms).toDateString(); }
  }
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase().replace(/\s+/g, ' ')
      .replace(/[.,;:!?。]+$/, '').replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, '').replace(/%$/, '').trim();
  }
  function num(s) {
    if (!/^[-+]?(\d[\d,]*)?([.,]\d+)?(e[-+]?\d+)?$/i.test(s) || !/\d/.test(s)) return null;
    const v = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    const n = parseFloat(v);
    return isFinite(n) ? n : null;
  }
  // An accepted answer is a string, a number, or { answer, tolerance } (its own numeric tolerance; otherwise the
  // item's). Text is compared with Learncraft.store.matchAnswer when the store is loaded (case, accents, quotes,
  // dashes, spacing, leading/trailing punctuation), so the browser and the Node tools grade alike.
  function accepts(given, list, tol) {
    const g = norm(given);
    if (!g) return false;
    const S = LC.store;
    return (list || []).some((a) => {
      const ans = a && typeof a === 'object' ? a.answer : a, t = a && typeof a === 'object' && a.tolerance != null ? a.tolerance : tol;
      if (ans == null) return false;
      if (S && typeof S.matchAnswer === 'function' ? S.matchAnswer(given, [String(ans)]) : g === norm(ans)) return true;
      const gn = num(g), an = num(norm(ans));
      return gn != null && an != null && Math.abs(gn - an) <= (+t || 0) + 1e-9;
    });
  }
  const answerText = (a) => String(a && typeof a === 'object' ? a.answer : a);
  LC.normalizeAnswer = norm;
  LC.acceptsAnswer = accepts;

  function record(it, ok, extra) {
    const st = store();
    let ev = null;
    if (st) {
      try {
        ev = st.recordAttempt(Object.assign({ lesson: it.lesson, objective: it.objective, item: it.id, itemType: it.type,
          itemVersion: it.version, context: 'lesson', outcome: ok ? 'correct' : 'incorrect', assisted: false }, extra,
          it.pretest === true ? { context: 'diagnostic' } : null)); // a pretest guess is never a first try (SK-03)
      } catch (e) { console.error('[learncraft] could not record attempt', e); }
    }
    doc.dispatchEvent(new CustomEvent('learncraft:attempt', { detail: { item: it.id, lesson: it.lesson, ok: ok, event: ev } }));
    return ev;
  }
  function firstOf(it) {
    const st = store();
    try { return st ? st.firstAttempt(it.id, it.version) : null; } catch (e) { return null; }
  }

  // Common frame: prompt, body, prior-result note, feedback. Feedback has status semantics but speaks through
  // the one shared live region (Learncraft.announce), so nothing is read twice.
  function frame(host, it, opts, bodyHtml, promptAsLabelFor) {
    const pid = nextId('p'), fid = nextId('fb');
    host.classList.add('lc-item', 'lc-' + it.type);
    host.setAttribute('data-item-id', it.id);
    const prompt = promptAsLabelFor
      ? html`<label class="lc-prompt" id="${pid}" for="${promptAsLabelFor}">${html.raw(sanitize(it.prompt))}</label>`
      : html`<p class="lc-prompt" id="${pid}">${html.raw(sanitize(it.prompt))}</p>`;
    host.innerHTML = html`${prompt}${bodyHtml(pid, fid)}<p class="lc-prior" hidden></p>
      <div class="lc-fb" id="${fid}" role="status" aria-live="off"></div>`;
    const fb = host.querySelector('.lc-fb'), prior = host.querySelector('.lc-prior');
    const ctx = opts.context || 'lesson';
    const p = firstOf(it);
    const st = store();
    if (p && p.session !== ((st && st.session) || LC.session) && ctx === 'lesson') {
      prior.hidden = false;
      prior.textContent = t(p.outcome === 'correct' ? 'prior.right' : 'prior.wrong', { date: fmtDate(Date.parse(p.at)) });
    }
    let attempts = 0, assisted = false, first = null;
    return {
      host, fb,
      say(ok, msgHtml) {
        fb.className = 'lc-fb ' + (ok ? 'ok' : 'bad');
        fb.innerHTML = html`<strong>${ok ? t('right') : t('notQuite')}</strong> ${msgHtml}`;
        LC.announce(fb.textContent.replace(/\s+/g, ' ').trim());
      },
      attempt(ok, extra) {
        attempts++;
        const ev = record(it, ok, Object.assign({ context: ctx, attemptInSession: attempts, assisted: assisted }, extra));
        if (first === null) { first = ok; if (opts.onFirst) opts.onFirst(it, ok); }
        return ev;
      },
      assist() { assisted = true; },
      get attempts() { return attempts; }
    };
  }
  const revisit = (it, opts) => {
    if (opts.context !== 'review') return '';
    const l = (course().lessons || []).find((x) => x.n === it.lesson);
    return l ? html` <a href="${LC.workspaceHref ? LC.workspaceHref(l.file) : LC.rootURL + l.file}">${t('review.revisit', { n: l.n, title: l.title })}</a>` : '';
  };

  // ---------- choice ----------
  function choice(host, it, opts) {
    const order = shuffle(it.options.map((o, i) => i), it.id);
    const f = frame(host, it, opts, (pid) => html`<div class="lc-opts" role="group" aria-labelledby="${pid}">${order.map((i) => {
      const o = it.options[i];
      return html`<button type="button" class="lc-opt${o.code || it.code ? ' code' : ''}" data-i="${i}"><span class="lc-mark" aria-hidden="true"></span><span>${html.raw(sanitize(o.text))}</span></button>`;
    })}</div>`);
    let locked = false;
    host.querySelector('.lc-opts').addEventListener('click', (e) => {
      const b = e.target.closest('button.lc-opt');
      if (!b || locked || b.getAttribute('aria-disabled') === 'true') return;
      const o = it.options[+b.getAttribute('data-i')], ok = !!o.correct;
      b.classList.add(ok ? 'ok' : 'bad');
      b.querySelector('.lc-mark').textContent = ok ? '✓' : '✗';
      b.setAttribute('aria-describedby', f.fb.id);
      f.attempt(ok);
      const why = o.why || (ok ? it.why : '');
      f.say(ok, html`${html.raw(sanitize(why || (ok ? '' : t('tryAnother'))))}${ok ? '' : revisit(it, opts)}`);
      if (!ok) { f.assist(); b.setAttribute('aria-disabled', 'true'); }
      if (ok) { locked = true; host.querySelectorAll('.lc-opt').forEach((x) => x.setAttribute('aria-disabled', 'true')); host.classList.add('done'); }
    });
  }

  // ---------- recall ----------
  function recall(host, it, opts) {
    const iid = nextId('in');
    const f = frame(host, it, opts, (pid, fid) => html`<form class="lc-row" novalidate>
      <input id="${iid}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="${fid}">
      <button type="submit" class="lc-btn">${t('check')}</button></form>`, iid);
    const input = host.querySelector('input'), accept = [].concat(it.accept || []);
    let misses = 0, done = false;
    host.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (done) return;
      if (!input.value.trim()) { f.fb.className = 'lc-fb'; f.fb.textContent = t('recall.empty'); LC.announce(t('recall.empty')); input.focus(); return; }
      const ok = accepts(input.value, accept, it.tolerance);
      f.attempt(ok, { note: input.value.slice(0, 200) });
      input.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (ok) { done = true; input.readOnly = true; host.classList.add('done'); f.say(true, html.raw(sanitize(it.why || ''))); return; }
      misses++;
      if (misses >= 2) { f.assist(); f.say(false, html`${t('recall.reveal', { answer: answerText(accept[0]) })} ${html.raw(sanitize(it.why || ''))}${revisit(it, opts)}`); }
      else f.say(false, html`${t('recall.again')}${revisit(it, opts)}`);
      input.focus();
    });
  }

  // ---------- order ----------
  function order(host, it, opts) {
    const n = it.steps.length;
    let idx = shuffle(it.steps.map((s, i) => i), it.id);
    if (n > 1 && idx.every((v, i) => v === i)) idx.push(idx.shift()); // never start already solved
    const f = frame(host, it, opts, (pid) => html`<ol class="lc-order" aria-labelledby="${pid}">${idx.map((k) => {
      const s = plain(it.steps[k]);
      return html`<li data-k="${k}"><span class="lc-mark" aria-hidden="true"></span><span class="lc-step">${html.raw(sanitize(it.steps[k]))}</span>
        <span class="lc-move"><button type="button" class="lc-btn lc-up" aria-label="${t('order.up', { step: s })}"><span aria-hidden="true">↑</span></button><button type="button" class="lc-btn lc-down" aria-label="${t('order.down', { step: s })}"><span aria-hidden="true">↓</span></button></span></li>`;
    })}</ol><button type="button" class="lc-btn lc-check">${t('order.check')}</button>`);
    const list = host.querySelector('.lc-order');
    let misses = 0, done = false;
    const lis = () => Array.prototype.slice.call(list.children);
    const edges = () => lis().forEach((li, i) => {
      li.querySelector('.lc-up').setAttribute('aria-disabled', String(done || i === 0));
      li.querySelector('.lc-down').setAttribute('aria-disabled', String(done || i === n - 1));
    });
    edges();
    list.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || done || b.getAttribute('aria-disabled') === 'true') return;
      const li = b.closest('li'), up = b.classList.contains('lc-up');
      const other = up ? li.previousElementSibling : li.nextElementSibling;
      if (!other) return;
      if (up) list.insertBefore(li, other); else list.insertBefore(other, li);
      lis().forEach((x) => { x.classList.remove('ok', 'bad'); x.querySelector('.lc-mark').textContent = ''; });
      edges();
      const pos = lis().indexOf(li) + 1;
      const keep = li.querySelector(up ? (pos === 1 ? '.lc-down' : '.lc-up') : (pos === n ? '.lc-up' : '.lc-down'));
      keep.focus(); // focus follows the moved step and never lands on body
      LC.announce(t('order.moved', { step: plain(it.steps[+li.getAttribute('data-k')]), pos: pos, n: n }));
    });
    host.querySelector('.lc-check').addEventListener('click', () => {
      if (done) return;
      let k = 0;
      lis().forEach((li, i) => {
        const good = +li.getAttribute('data-k') === i;
        if (good) k++;
        li.classList.toggle('ok', good); li.classList.toggle('bad', !good);
        li.querySelector('.lc-mark').innerHTML = html`${good ? '✓' : '✗'}<span class="lc-sr"> (${good ? t('mark.ok') : t('mark.bad')})</span>`;
        li.querySelector('.lc-mark').removeAttribute('aria-hidden');
      });
      const ok = k === n;
      f.attempt(ok, { score: n ? k / n : 0 });
      if (ok) { done = true; edges(); host.classList.add('done'); f.say(true, html`${t('order.right')} ${html.raw(sanitize(it.why || ''))}`); return; }
      misses++;
      if (misses >= 2) { f.assist(); f.say(false, html`${t('order.reveal', { list: it.steps.map((s, i) => (i + 1) + '. ' + plain(s)).join('  ') })}${revisit(it, opts)}`); }
      else f.say(false, html`${t('order.partial', { k: k, n: n })}${revisit(it, opts)}`);
    });
  }

  // ---------- fade (faded worked example) ----------
  function blankChecker(f, it, opts, inputs, names, answers) {
    let misses = 0, done = false;
    return () => {
      if (done) return;
      const wrong = [];
      inputs.forEach((inp, i) => {
        const good = accepts(inp.value, answers[i], it.tolerance);
        inp.setAttribute('aria-invalid', good ? 'false' : 'true');
        inp.classList.toggle('ok', good); inp.classList.toggle('bad', !good);
        const m = inp.nextElementSibling && inp.nextElementSibling.classList.contains('lc-blank-mark') ? inp.nextElementSibling : null;
        if (m) m.innerHTML = html`${good ? '✓' : '✗'}<span class="lc-sr"> (${good ? t('mark.ok') : t('mark.bad')})</span>`;
        if (!good) wrong.push(i);
      });
      const m = inputs.length, k = m - wrong.length, ok = !wrong.length;
      f.attempt(ok, { score: m ? k / m : 0 });
      if (ok) { done = true; inputs.forEach((x) => { x.readOnly = true; }); f.host.classList.add('done'); f.say(true, html`${t('fade.all')} ${html.raw(sanitize(it.why || ''))}`); return; }
      misses++;
      const label = (i) => t('fade.blank', { i: i + 1, m: m, name: names[i] });
      if (misses >= 2) { f.assist(); f.say(false, html`${t('fade.reveal', { list: wrong.map((i) => names[i] + ' = ' + answers[i][0]).join('; ') })}${revisit(it, opts)}`); }
      else f.say(false, html`${t('fade.partial', { k: k, m: m, list: wrong.map(label).join(', ') })}${revisit(it, opts)}`);
      inputs[wrong[0]].focus();
    };
  }
  function fade(host, it, opts) {
    const parts = String(it.template || '').split(/\{\{\s*([\w.-]+)\s*\}\}/);
    const names = [], answers = [];
    for (let i = 1; i < parts.length; i += 2) { names.push(it.labels && it.labels[parts[i]] || parts[i]); answers.push([].concat(it.blanks[parts[i]] || [])); }
    const m = names.length;
    const f = frame(host, it, opts, (pid) => {
      const body = parts.map((p, i) => {
        if (i % 2 === 0) return html`${p}`;
        const b = (i - 1) / 2, size = Math.max(3, Math.max.apply(null, answers[b].map((a) => String(a).length)) + 1);
        return html`<input type="text" size="${size}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${t('fade.blank', { i: b + 1, m: m, name: names[b] })}"><span class="lc-blank-mark"></span>`;
      });
      const code = it.code === false ? html`<p class="lc-fade-text">${body}</p>` : html`<pre class="lc-fade-code"><code>${body}</code></pre>`;
      return html`<div role="group" aria-labelledby="${pid}">${code}</div><button type="button" class="lc-btn lc-check">${t('check')}</button>`;
    });
    const inputs = Array.prototype.slice.call(host.querySelectorAll('input'));
    const check = blankChecker(f, it, opts, inputs, names, answers);
    host.querySelector('.lc-check').addEventListener('click', check);
    inputs.forEach((inp) => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } }));
  }

  const RENDER = { choice, recall, order, fade };
  function renderItem(host, it, opts) { // everything item-specific runs inside mount: one bad item → one error box (SR-08)
    return LC.mount(host, 'practice item ' + (it && it.id), () => {
      it.version = it.version || version(it);
      return RENDER[it.type](host, it, opts || {});
    });
  }
  LC.renderPracticeItem = renderItem;

  // ---------- legacy markup ----------
  const warned = {};
  function legacyId(el, kind, i) {
    if (el.getAttribute('data-id')) return el.getAttribute('data-id');
    const id = 'legacy:l' + lessonN() + '-' + kind + (i + 1); // unique course-wide (v0 keyed L<n>:q<i>)
    if (!warned[id]) { warned[id] = 1; console.warn(`[learncraft] .${kind === 'q' ? 'quiz-q' : 'fade'} #${i + 1} has no data-id; using positional id "${id}". Add data-id so edits never remap history.`); }
    return id;
  }
  function legacyQuiz(el, i, n) {
    const p = el.querySelector('p');
    const btns = Array.prototype.slice.call(el.querySelectorAll('.quiz-opts button, button'));
    const ans = (el.getAttribute('data-answer') || '').trim();
    const it = {
      id: legacyId(el, 'q', i), type: 'choice', lesson: n, objective: el.getAttribute('data-objective') || 'l' + n, legacy: true,
      prompt: p ? p.innerHTML : '', why: el.getAttribute('data-why') || '',
      options: btns.map((b) => ({ text: b.innerHTML, code: b.classList.contains('code'), why: b.getAttribute('data-why') || '',
        correct: b.hasAttribute('data-correct') || b.textContent.trim() === ans }))
    };
    el.replaceChildren();
    return it;
  }
  function legacyFade(el, i, n) {
    const it = { id: legacyId(el, 'fade', i), type: 'fade', lesson: n, objective: el.getAttribute('data-objective') || 'l' + n, legacy: true,
      prompt: '', blanks: {} };
    const inputs = Array.prototype.slice.call(el.querySelectorAll('input[data-answer]'));
    const answers = inputs.map((inp) => [inp.getAttribute('data-answer')].concat((inp.getAttribute('data-accept') || '').split('|').filter(Boolean)));
    const names = inputs.map((inp, k) => inp.getAttribute('data-label') || String(k + 1));
    it.version = version({ type: 'fade', prompt: el.textContent.replace(/\s+/g, ' ').trim(), blanks: answers });
    // Drop any handler or feedback a pre-Learncraft diagram.js attached, then grade with the shared checker.
    el.querySelectorAll('.quiz-fb').forEach((x) => x.remove());
    let btn = el.querySelector('.fade-check');
    if (btn) { const c = btn.cloneNode(true); btn.replaceWith(c); btn = c; btn.type = 'button'; btn.classList.add('lc-btn'); }
    inputs.forEach((inp, k) => {
      if (!inp.getAttribute('aria-label') && !inp.labels.length) inp.setAttribute('aria-label', t('fade.blank', { i: k + 1, m: inputs.length, name: names[k] }));
      inp.size = Math.max(4, String(answers[k][0]).length + 1);
      inp.autocomplete = 'off'; inp.spellcheck = false;
      const mk = doc.createElement('span'); mk.className = 'lc-blank-mark'; inp.after(mk);
    });
    el.classList.add('lc-item', 'lc-fade');
    el.setAttribute('data-item-id', it.id);
    const fb = doc.createElement('div'); fb.className = 'lc-fb'; fb.id = nextId('fb'); fb.setAttribute('role', 'status'); fb.setAttribute('aria-live', 'off');
    el.appendChild(fb);
    inputs.forEach((inp) => inp.setAttribute('aria-describedby', fb.id));
    let attempts = 0, assisted = false, first = null;
    const f = {
      host: el, fb,
      say(ok, msg) { fb.className = 'lc-fb ' + (ok ? 'ok' : 'bad'); fb.innerHTML = html`<strong>${ok ? t('right') : t('notQuite')}</strong> ${msg}`; LC.announce(fb.textContent); },
      attempt(ok, extra) { attempts++; record(it, ok, Object.assign({ attemptInSession: attempts, assisted: assisted }, extra)); if (first === null) { first = ok; if (el.__onFirst) el.__onFirst(it, ok); } },
      assist() { assisted = true; }
    };
    const check = blankChecker(f, it, {}, inputs, names, answers);
    if (btn) btn.addEventListener('click', check);
    inputs.forEach((inp) => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } }));
    el.setAttribute('data-lc-bound', 'practice'); // tells diagram.js to leave this .fade alone
    return it;
  }

  // Custom widgets (and Learncraft.register components through ctx.record) record a first attempt by id.
  LC.recordPractice = function (id, ok, opts) {
    const n = lessonN();
    if (!n || !id) return null;
    opts = opts || {};
    const itemId = ID.test(String(id)) ? String(id) : 'legacy:l' + n + '-' + id;
    return record({ id: itemId, type: opts.type || 'custom', lesson: n, objective: opts.objective || 'l' + n, version: version({ type: 'custom', prompt: String(id) }) }, !!ok, { assisted: false });
  };
  // Custom widgets and older figure components report through the v0 API.
  root.Progress = root.Progress || {
    record(id, ok) {
      const n = lessonN();
      if (!n) return;
      if (id === 'fade' && doc.querySelector('.fade[data-lc-bound]')) return; // already graded by practice.js
      record({ id: 'legacy:l' + n + '-' + id, type: 'custom', lesson: n, objective: 'l' + n, version: version({ type: 'custom', prompt: String(id) }) }, !!ok, { assisted: false });
    }
  };

  // ---------- lesson page: sets, single items, counter, completion ----------
  function lessonPractice() {
    const n = lessonN();
    const tracked = [];
    const sets = Array.prototype.slice.call(doc.querySelectorAll('[data-practice-set]'));
    sets.forEach((set) => {
      const ln = +set.getAttribute('data-practice-set') || n;
      const list = (byLesson[ln] || []).filter((it) => !doc.querySelector(`[data-practice-item="${it.id}"]`));
      if (!list.length) { console.warn(`[learncraft] no practice items registered for lesson ${ln} (is lessons/${String(ln).padStart(4, '0')}.practice.js loaded?)`); return; }
      set.innerHTML = html`<p class="lc-count" tabindex="-1"></p><ol class="lc-set">${list.map(() => html`<li></li>`)}</ol>`;
      const lis = set.querySelectorAll('.lc-set > li');
      list.forEach((it, i) => { renderItem(lis[i], it, { context: 'lesson', onFirst: update }); if (!it.pretest) tracked.push(it); });
    });
    doc.querySelectorAll('[data-practice-item]').forEach((el) => {
      const it = items[el.getAttribute('data-practice-item')];
      if (!it) { LC.mount(el, 'practice item', () => { throw new Error('unknown practice id ' + el.getAttribute('data-practice-item')); }); return; }
      renderItem(el, it, { context: 'lesson', onFirst: update });
      if (!it.pretest) tracked.push(it);
    });
    if (n) {
      doc.querySelectorAll('.quiz-q').forEach((el, i) => {
        if (el.closest('[data-practice-set]')) return;
        const it = legacyQuiz(el, i, n);
        renderItem(el, it, { context: 'lesson', onFirst: update });
        tracked.push(it);
      });
      setTimeout(() => { // after any figure script that also looked at .fade
        doc.querySelectorAll('.fade').forEach((el, i) => {
          if (el.getAttribute('data-lc-bound')) return;
          LC.mount(el, 'fade', () => { const it = legacyFade(el, i, n); el.__onFirst = update; tracked.push(it); });
        });
        update(null, null, true);
      }, 0);
    }
    const countEl = doc.querySelector('[data-practice-set] .lc-count') || doc.querySelector('.quiz-score');
    let wasDone = null;
    function update(_it, _ok, initial) {
      if (!tracked.length) return;
      let answered = 0, right = 0, recallRight = 0;
      tracked.forEach((it) => { const p = firstOf(it); if (p) { answered++; if (p.outcome === 'correct') { right++; if (RECALLISH[it.type] && !p.assisted) recallRight++; } } });
      if (countEl) countEl.textContent = t('set.count', { answered: answered, total: tracked.length, right: right });
      const done = answered === tracked.length;
      if (initial || wasDone === null) { wasDone = done; return; }
      if (done && !wasDone) { wasDone = true; complete(right, tracked.length, countEl, recallRight > 0 || !tracked.some((it) => RECALLISH[it.type])); }
    }
    LC.lessonPracticeIds = () => tracked.map((it) => it.id);
    LC.lessonPracticeTypes = () => tracked.reduce((m, it) => { m[it.id] = it.type; return m; }, {});
  }

  // Inline, dismissible completion message inside the practice section (no fixed overlay).
  // "Ready for the challenge" needs ≥ 80% right on the first try AND one recall, fade or order item right from
  // memory (the L3 bar). A lesson with no such item at all keeps the old ≥ 80% rule.
  const RECALLISH = { recall: 1, fade: 1, order: 1 };
  function complete(right, total, anchor, recallOk) {
    const C = course(), l = (C.lessons || []).find((x) => x.n === lessonN()) || {};
    const box = doc.createElement('div');
    box.className = 'lc-status';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'off');
    const good = right / total >= 0.8 && recallOk !== false;
    box.innerHTML = html`<p><strong>${t('set.done', { right: right, total: total })}</strong> ${t(good ? 'set.good' : right / total >= 0.8 ? 'set.recall' : 'set.low')}
      ${l.canDo ? t('set.proof', { canDo: l.canDo }) : t('set.proofPlain')}
      ${doc.getElementById('challenge') ? html`<a href="#challenge">${t('set.link')}</a>` : ''}</p>
      <button type="button" class="lc-dismiss lc-btn" aria-label="${t('dismiss')}"><span aria-hidden="true">×</span></button>`;
    const set = doc.querySelector('[data-practice-set]');
    const where = set || (anchor && anchor.parentNode ? anchor : null) || doc.querySelector('.lc-item:last-of-type');
    if (where) where.after(box); else (doc.querySelector('main') || doc.body).appendChild(box);
    LC.announce(box.querySelector('p').textContent.replace(/\s+/g, ' '));
    box.querySelector('.lc-dismiss').addEventListener('click', () => {
      const back = (set && set.querySelector('.lc-count')) || anchor;
      box.remove();
      if (back) { if (!back.hasAttribute('tabindex')) back.setAttribute('tabindex', '-1'); back.focus(); }
    });
  }

  // ---------- review.html ----------
  const pad4 = (n) => String(n).padStart(4, '0');
  const PRACTICE_FILE = /^lessons\/\d{4}\.practice\.js$/;
  LC.PRACTICE_FILE = PRACTICE_FILE;
  function loadPracticeFiles(done) {
    const ls = (course().lessons || []);
    let left = ls.length;
    if (!left) return done();
    // lessons[].practice names the file; without it a schemaVersion 2 course uses lessons/NNNN.practice.js.
    // practice: null (or false) marks a lesson with no practice file, e.g. an older lesson with inline quizzes.
    const v2 = (course().schemaVersion || 1) >= 2;
    ls.forEach((l) => {
      let file = typeof l.practice === 'string' ? l.practice : l.practice === undefined && v2 ? 'lessons/' + pad4(l.n) + '.practice.js' : null;
      // A data field must never choose which local script runs: on file:// a CSP 'self' matches every file (SR-04).
      if (file && !PRACTICE_FILE.test(file)) { console.warn(`[learncraft] lesson ${l.n}: practice "${String(file).slice(0, 80)}" ignored: it must match ${PRACTICE_FILE}`); file = null; }
      if (!file || (byLesson[l.n] && byLesson[l.n].length)) { if (!--left) done(); return; }
      const s = doc.createElement('script');
      s.src = LC.rootURL + file;
      s.onload = s.onerror = () => { if (!--left) done(); };
      doc.body.appendChild(s);
    });
  }
  LC.loadPracticeFiles = loadPracticeFiles;
  function objectiveText(id) {
    let found = null;
    (course().lessons || []).forEach((l) => (l.objectives || []).forEach((o) => { if (o.id === id) found = o.text; }));
    const m = /^l(\d+)$/.exec(id);
    return found || (m ? t('review.objective', { n: m[1] }) : id);
  }
  function pick(list, k, seed) {
    const pref = (it) => (it.type === 'choice' ? 1 : 0); // recall, order and fade before recognition
    const r = LC.rng(seed);
    return list.map((it) => ({ it, k: pref(it) + r() * 0.9 })).sort((a, b) => a.k - b.k).slice(0, k).map((x) => x.it);
  }
  function reviewView(el) {
    el.innerHTML = html`<p class="lc-muted">${t('review.loading')}</p>`;
    loadPracticeFiles(() => LC.mount(el, 'review', () => buildReview(el)));
  }
  function buildReview(el) {
    const st = store();
    const all = LC.practiceItems().filter((it) => it && !it.pretest); // pretest guesses never enter a review
    if (!all.length) { el.innerHTML = html`<p>${t('review.noItems')}</p>`; return; }
    if (!st) { el.innerHTML = html`<p>${t('review.noStore')}</p>`; return; }
    const now = Date.now();
    const cards = (st.due(now) || []).slice().sort((a, b) => (b.overdueRatio || 0) - (a.overdueRatio || 0))
      .filter((c) => all.some((it) => it.objective === c.objective)).slice(0, 10);
    if (!cards.length) return nothingDue(el, st, all, now);
    const chosen = {};
    cards.forEach((c) => { chosen[c.objective] = pick(all.filter((it) => it.objective === c.objective), 3, LC.session + c.objective); });
    const session = shuffle([].concat.apply([], cards.map((c) => chosen[c.objective])), 'review');
    const results = {};
    const total = session.length;
    el.innerHTML = html`<p class="lc-count" tabindex="-1">${t('review.count', { cards: cards.length, items: total })}</p>
      <p class="lc-muted">${t('review.intro')}</p><ol class="lc-set">${session.map(() => html`<li></li>`)}</ol>
      <section class="lc-results" hidden aria-labelledby="lc-results-h"><h2 id="lc-results-h">${t('review.results')}</h2><ul></ul></section>`;
    const lis = el.querySelectorAll('.lc-set > li'), out = el.querySelector('.lc-results ul');
    let finished = 0;
    session.forEach((it, i) => renderItem(lis[i], it, { context: 'review', onFirst(item, ok) {
      const card = cards.find((c) => c.objective === item.objective), r = results[item.objective] = results[item.objective] || [];
      r.push({ item: item.id, outcome: ok ? 'correct' : 'incorrect' });
      if (r.length < chosen[item.objective].length) return;
      let res = null;
      try { res = st.recordReviewSession({ objective: item.objective, results: r }); } catch (e) { console.error('[learncraft] review not recorded', e); }
      const okN = r.filter((x) => x.outcome === 'correct').length;
      const vars = { ok: okN, n: r.length, box: res ? res.box : '?', date: res && res.due ? fmtDate(res.due) : '?' };
      const key = !res ? 'review.fail' : !res.passed ? 'review.fail' : res.box === card.box ? 'review.early' : 'review.pass';
      const line = objectiveText(item.objective) + ': ' + t(key, vars);
      el.querySelector('.lc-results').hidden = false;
      const li = doc.createElement('li'); li.textContent = line; out.appendChild(li);
      LC.announce(line);
      if (++finished === cards.length) { const d = doc.createElement('li'); d.className = 'lc-done'; d.textContent = t('review.done'); out.appendChild(d); }
    } }));
  }
  function nothingDue(el, st, all, now) {
    let next = null;
    try { (st.due(now + 4e10) || []).forEach((c) => { if (c.due && (next === null || c.due < next)) next = c.due; }); } catch (e) { /* ignore */ }
    el.innerHTML = html`<p class="lc-lead">${t('review.none')} ${next ? t('review.next', { date: fmtDate(next) }) : ''}</p>
      ${next ? '' : html`<p class="lc-muted">${t('review.unscheduled')}</p>`}
      <p><button type="button" class="lc-btn lc-anyway">${t('review.anyway')}</button></p><div class="lc-practice-anyway"></div>`;
    el.querySelector('.lc-anyway').addEventListener('click', function () {
      const box = el.querySelector('.lc-practice-anyway');
      const list = shuffle(pick(all, 8, LC.session + 'anyway'), 'anyway');
      box.innerHTML = html`<p class="lc-count" tabindex="-1">${t('review.practiceNote')}</p><ol class="lc-set">${list.map(() => html`<li></li>`)}</ol>`;
      const lis = box.querySelectorAll('.lc-set > li');
      list.forEach((it, i) => renderItem(lis[i], it, { context: 'practice' }));
      this.parentNode.remove();
      box.querySelector('.lc-count').focus();
    });
  }

  LC.ready(() => {
    const rv = doc.querySelector('[data-review]');
    if (rv) reviewView(rv); else lessonPractice();
  });
})(window);
