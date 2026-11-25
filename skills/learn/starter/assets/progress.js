// Learncraft views: the lesson strip, the course dashboard, export/import and page notices.
// All state goes through Learncraft.store (assets/store.js); this file only reads it and draws.
//
// Lesson page:  <body data-lesson="3"> … <div id="progress"></div>   (put it right after the h1 and lede;
//               an older lesson that has it above the h1 gets it moved there)
// Dashboard:    <div id="dashboard"></div>   in index.html
//
// What it shows, and why:
//   · The lesson goal first ("By the end you can …"), then the milestone, then practice as a level in words with
//     its basis ("Familiar · 1 of 2 right first time"). No points or "level" in the lesson chrome.
//   · Levels are derived by the store from evidence. Browser practice reaches Understood at most; Applied and
//     Transferred need your teacher's challenge review; Retained needs a spaced review (review.html).
//   · The dashboard leads with "Next up": reviews due → review.html, the next lesson, or the challenge to send.
//   · Milestones are evidence-gated in course.js and are never unlocked from here.
(function () { // Older pages load course.js → progress.js → quiz.js (→ diagram.js) with no core.js: bring the runtime in first.
  var me = document.currentScript;
  if ((window.Learncraft && window.Learncraft.ready) || !me || window.__learncraftBoot || document.readyState !== 'loading') return;
  window.__learncraftBoot = true;
  var base = me.src.replace(/[^\/?#]*([?#].*)?$/, '');
  document.write(['core.js', 'store.js', 'viz.js', 'progress.js'].map(function (f) { return '<script src="' + base + f + '"></' + 'script>'; }).join(''));
})();
(function (root) {
  'use strict';
  const LC = root.Learncraft;
  if (!LC || !LC.ready) { if (!root.__learncraftBoot) console.error('[learncraft] progress.js needs assets/core.js loaded first'); return; }
  const { html, t } = LC;
  const doc = root.document;
  const DAY = 864e5;

  Object.assign(LC.i18n.en, {
    'level.0': 'Not started', 'level.1': 'Seen', 'level.2': 'Familiar', 'level.3': 'Understood',
    'level.4': 'Applied', 'level.5': 'Retained', 'level.6': 'Transferred',
    'levels.title': 'What the words mean',
    'levels.1': 'Seen: you opened the lesson.',
    'levels.2': 'Familiar: at least 2 items tried, 60% or more right on the first try.',
    'levels.3': 'Understood: at least 3 items, 80% or more right on the first try, including one you had to recall or build.',
    'levels.4': 'Applied: your teacher reviewed your challenge work and every criterion was met.',
    'levels.5': 'Retained: you passed a review taken cold, a week or more later.',
    'levels.6': 'Transferred: you applied it again in a context that differs from the practice.',
    'levels.note': 'Practice in the browser can reach Understood at most. Retries after feedback never count.',
    'goal': 'By the end you can {canDo}.',
    'strip.milestone': 'Milestone', 'strip.practice': 'Your practice', 'strip.review': 'Review',
    'ms.of': '{i} of {n}', 'basis': '{right} of {tried} right on the first try', 'basis.none': 'nothing answered yet', 'basis.challenge': 'from your reviewed challenge',
    'basis.recall': { one: '1 recalled from memory', other: '{n} recalled from memory' },
    'review.due': 'due {date}', 'review.now': 'due now', 'review.lapsed': 'missed last time, due {date}',
    'review.new': 'starts the day after you finish the practice',
    'next.title': 'Next up', 'next.review': { one: 'Review 1 topic that is due', other: 'Review {n} topics that are due' },
    'next.reviewHint': 'A few questions from memory, about {min} minutes.',
    'next.continue': 'Continue lesson {n}: {title}', 'next.start': 'Start lesson {n}: {title}',
    'next.challenge': 'Send the {label} challenge',
    'next.challengeHint': 'Do the challenge at the end of lesson {n}, then send your work to your teacher in the terminal.',
    'next.caughtUp': 'You are caught up. Ask your teacher in the terminal for the next lesson.',
    'next.empty': 'Your first lesson is on its way. Ask your teacher in the terminal.',
    'next.then': 'Then', 'mission': 'Mission', 'next.progress': '{done} of {total} practice questions answered so far.',
    'ms.title': 'Milestones', 'ms.done': 'Proven by your challenge', 'ms.active': 'In progress',
    'ms.activeHint': 'the challenge is in lesson {n}', 'ms.locked': 'Not yet',
    'ms.note': 'Milestones unlock only when your teacher reviews your challenge work. Practice shows practice, not mastery.',
    'lessons.title': 'Lessons', 'lesson.notStarted': 'not started', 'lesson.items': '{done} of {total} answered',
    'record.title': 'Your record', 'record.export': 'Export progress', 'record.import': 'Import progress',
    'record.help': 'Progress lives in this browser only. Export it to keep a copy or to share it with your teacher; import it in another browser. The export includes what you typed in recall answers, so your teacher can see your reasoning.',
    'record.xp': '{xp} XP from first-try answers',
    'record.imported': 'Imported: {added} new, {skipped} already here.', 'record.importErrors': '{n} could not be read.',
    'record.exported': 'Saved {file}.', 'record.bad': 'That file is not a Learncraft progress file.',
    'unverified': 'not independently verified', 'unverified.short': 'unverified'
  });
  Object.assign(LC.i18n.pt, {
    'level.0': 'Não iniciado', 'level.1': 'Visto', 'level.2': 'Familiar', 'level.3': 'Compreendido',
    'level.4': 'Aplicado', 'level.5': 'Retido', 'level.6': 'Transferido',
    'levels.title': 'O que as palavras significam',
    'levels.1': 'Visto: você abriu a lição.',
    'levels.2': 'Familiar: pelo menos 2 itens tentados, 60% ou mais certos na primeira tentativa.',
    'levels.3': 'Compreendido: pelo menos 3 itens, 80% ou mais certos na primeira tentativa, incluindo um que você teve de lembrar ou montar.',
    'levels.4': 'Aplicado: seu professor revisou o seu desafio e todos os critérios foram atendidos.',
    'levels.5': 'Retido: você passou numa revisão feita de memória, uma semana ou mais depois.',
    'levels.6': 'Transferido: você aplicou de novo num contexto diferente do da prática.',
    'levels.note': 'A prática no navegador chega no máximo a Compreendido. Novas tentativas depois do feedback nunca contam.',
    'goal': 'Ao final você consegue {canDo}.',
    'strip.milestone': 'Marco', 'strip.practice': 'Sua prática', 'strip.review': 'Revisão',
    'ms.of': '{i} de {n}', 'basis': '{right} de {tried} certas na primeira tentativa', 'basis.none': 'nada respondido ainda', 'basis.challenge': 'pelo seu desafio revisado',
    'basis.recall': { one: '1 lembrada de memória', other: '{n} lembradas de memória' },
    'review.due': 'prevista para {date}', 'review.now': 'para agora', 'review.lapsed': 'errada da última vez, prevista para {date}',
    'review.new': 'começa no dia seguinte ao fim da prática',
    'next.title': 'A seguir', 'next.review': { one: 'Revisar 1 tópico pendente', other: 'Revisar {n} tópicos pendentes' },
    'next.reviewHint': 'Algumas perguntas de memória, cerca de {min} minutos.',
    'next.continue': 'Continuar a lição {n}: {title}', 'next.start': 'Começar a lição {n}: {title}',
    'next.challenge': 'Enviar o desafio de {label}',
    'next.challengeHint': 'Faça o desafio no fim da lição {n} e envie o seu trabalho ao professor no terminal.',
    'next.caughtUp': 'Você está em dia. Peça a próxima lição ao professor no terminal.',
    'next.empty': 'Sua primeira lição está a caminho. Fale com o professor no terminal.',
    'next.then': 'Depois', 'mission': 'Missão', 'next.progress': '{done} de {total} perguntas de prática respondidas até agora.',
    'ms.title': 'Marcos', 'ms.done': 'Comprovado pelo seu desafio', 'ms.active': 'Em andamento',
    'ms.activeHint': 'o desafio está na lição {n}', 'ms.locked': 'Ainda não',
    'ms.note': 'Os marcos só são liberados quando o professor revisa o seu desafio. A prática mostra prática, não domínio.',
    'lessons.title': 'Lições', 'lesson.notStarted': 'não iniciada', 'lesson.items': '{done} de {total} respondidas',
    'record.title': 'Seu registro', 'record.export': 'Exportar progresso', 'record.import': 'Importar progresso',
    'record.help': 'O progresso fica só neste navegador. Exporte para guardar uma cópia ou compartilhar com o professor; importe em outro navegador. A exportação inclui o que você digitou nas respostas de memória, para o professor ver o seu raciocínio.',
    'record.xp': '{xp} XP de respostas certas na primeira tentativa',
    'record.imported': 'Importado: {added} novos, {skipped} já existiam.', 'record.importErrors': '{n} não puderam ser lidos.',
    'record.exported': '{file} salvo.', 'record.bad': 'Esse arquivo não é um arquivo de progresso do Learncraft.',
    'unverified': 'não verificado de forma independente', 'unverified.short': 'não verificado'
  });

  const C = () => root.COURSE || null;
  const st = () => LC.courseStore && LC.courseStore();
  const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch (e) { console.error('[learncraft]', e); return dflt; } };
  const fmtDate = (ms) => { try { return new Intl.DateTimeFormat(LC.lang(), { month: 'short', day: 'numeric' }).format(new Date(ms)); } catch (e) { return new Date(ms).toDateString(); } };
  const href = (rel) => LC.rootURL + String(rel || '').replace(/^\.?\//, '');
  const lessonsOf = (c) => (c.lessons || []).slice().sort((a, b) => a.n - b.n);
  const objectivesOf = (l) => (l.objectives && l.objectives.length ? l.objectives.map((o) => o.id) : ['l' + l.n]);
  const msById = (c) => (c.milestones || []).reduce((m, x) => { m[x.id] = x; return m; }, {});

  // ---------- derived lesson state (all from the store) ----------
  function lessonState(c, l, s, ids, types) {
    const ms = msById(c);
    const mastered = (l.milestones || []).length > 0 && (l.milestones || []).every((id) => ms[id] && ms[id].status === 'mastered');
    const knownIds = ids && ids.length ? ids : null;
    const stats = s ? safe(() => s.lessonStats(l.n, knownIds || undefined), null) : null;
    const total = knownIds ? knownIds.length : (stats && stats.items) || 0;
    let level = 0, review = null, recall = 0;
    objectivesOf(l).forEach((o, i) => {
      if (!s) return;
      const lv = safe(() => s.level(o, { itemTypes: types || {}, milestoneMastered: mastered }), { level: 0 });
      level = i === 0 ? +lv.level || 0 : Math.min(level, +lv.level || 0);
      if (lv.basis && typeof lv.basis === 'object') recall += +lv.basis.recallCorrect || 0;
      const objIds = knownIds && (LC.practiceItems ? LC.practiceItems(l.n).filter((it) => it.objective === o).map((it) => it.id) : null);
      const sc = safe(() => s.schedule(o, { itemIds: objIds && objIds.length ? objIds : knownIds || undefined }), null);
      if (sc && sc.due && sc.status !== 'new' && (!review || sc.due < review.due)) review = sc;
    });
    const tried = stats ? stats.attempted || 0 : 0, right = stats ? stats.firstTryCorrect || 0 : 0;
    return { level, tried, right, total, review, recall, started: level >= 1 || tried > 0, done: total > 0 && tried >= total };
  }
  function reviewText(r) {
    if (!r) return t('review.new');
    if (r.status === 'lapsed') return t('review.lapsed', { date: fmtDate(r.due) });
    return r.due <= Date.now() ? t('review.now') : t('review.due', { date: fmtDate(r.due) });
  }
  const basis = (s) => (s.level >= 4 && !s.tried ? t('basis.challenge') : s.tried ? t('basis', { right: s.right, tried: s.tried }) + (s.recall ? ', ' + t('basis.recall', { n: s.recall }) : '') : t('basis.none'));
  function ladder(current) {
    return html`<details class="lc-why"><summary>${t('levels.title')}</summary><ol class="lc-ladder">${[1, 2, 3, 4, 5, 6].map((k) =>
      html`<li${k === current ? html.raw(' aria-current="true" class="is-current"') : ''}>${t('levels.' + k)}</li>`)}</ol>
      <p class="lc-muted">${t('levels.note')}</p></details>`;
  }

  // ---------- notices (both pages) ----------
  function notices(host) {
    const c = C(), s = st(), out = [];
    if (c && c.example === true) out.push(html`<p class="lc-banner">${t('example.banner')}</p>`);
    const r = s && s.loadResult;
    if (!s || s.persistent === false || (r && r.persistent === false)) out.push(html`<p class="lc-notice" role="note">${t('storage.off')}</p>`);
    if (!out.length) return;
    const box = doc.createElement('div');
    box.className = 'lc-notices';
    box.innerHTML = html`${out}`;
    host.insertBefore(box, host.firstChild);
  }
  function markUnverified() {
    doc.querySelectorAll('.unverified').forEach((el) => {
      if (!el.title) el.title = t('unverified');
      el.setAttribute('data-lc-label', t('unverified.short'));
      if (!el.querySelector('.lc-sr')) { const s = doc.createElement('span'); s.className = 'lc-sr'; s.textContent = ' (' + t('unverified') + ')'; el.appendChild(s); }
    });
  }

  // ---------- lesson strip ----------
  function strip(el, n) {
    const c = C(), l = c && lessonsOf(c).find((x) => x.n === n);
    if (!l) { el.innerHTML = ''; return; }
    const h1 = doc.querySelector('main h1') || doc.querySelector('h1');
    if (h1 && (el.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING)) { // legacy placement above the title
      let anchor = h1, nx = h1.nextElementSibling;
      while (nx && nx.matches('.lede, p.lede, .subtitle')) { anchor = nx; nx = nx.nextElementSibling; }
      anchor.after(el);
    }
    el.classList.add('pg-header', 'lc-strip');
    const s = st(), ms = msById(c), all = c.milestones || [];
    const ids = LC.lessonPracticeIds ? LC.lessonPracticeIds() : null;
    const state = lessonState(c, l, s, ids, LC.lessonPracticeTypes ? LC.lessonPracticeTypes() : null);
    const mains = (l.milestones || []).map((id) => ms[id]).filter(Boolean);
    const main = doc.querySelector('main') || doc.body;
    const showGoal = l.canDo && main.textContent.replace(/\s+/g, ' ').indexOf(String(l.canDo).trim()) < 0;
    el.innerHTML = html`${showGoal ? html`<p class="lc-goal">${t('goal', { canDo: l.canDo })}</p>` : ''}
      <dl class="lc-facts">
        ${mains.length ? html`<div><dt>${t('strip.milestone')}</dt><dd>${mains.map((m, i) => html`${i ? ', ' : ''}<strong>${m.label}</strong> <span class="lc-muted">(${t('ms.of', { i: all.indexOf(m) + 1, n: all.length })})</span>`)}</dd></div>` : ''}
        <div><dt>${t('strip.practice')}</dt><dd><strong class="lc-level">${t('level.' + state.level)}</strong> · ${basis(state)}</dd></div>
        <div><dt>${t('strip.review')}</dt><dd>${reviewText(state.review)}</dd></div>
      </dl>${ladder(state.level)}`;
  }

  // ---------- dashboard ----------
  function nextUp(c, s, rows) {
    const steps = [];
    const due = s ? safe(() => s.due(Date.now()), []) : [];
    if (due.length) steps.push({ text: t('next.review', { n: due.length }), hint: t('next.reviewHint', { min: Math.max(3, Math.min(10, due.length * 2)) }), href: href('review.html') });
    const ms = c.milestones || [];
    const challenge = ms.find((m) => m.status === 'in-progress' && rows.some((r) => (r.l.milestones || []).indexOf(m.id) >= 0) &&
      rows.filter((r) => (r.l.milestones || []).indexOf(m.id) >= 0).every((r) => r.s.done));
    const open = rows.find((r) => !r.s.done);
    const lessonStep = open ? { text: t(open.s.started ? 'next.continue' : 'next.start', { n: open.l.n, title: open.l.title }), href: href(open.l.file),
      hint: open.s.started && open.s.total ? t('next.progress', { done: open.s.tried, total: open.s.total }) : open.l.canDo ? t('goal', { canDo: open.l.canDo }) : '' } : null;
    if (challenge) {
      const last = rows.filter((r) => (r.l.milestones || []).indexOf(challenge.id) >= 0).pop();
      steps.push({ text: t('next.challenge', { label: challenge.label }), hint: t('next.challengeHint', { n: last.l.n }), href: href(last.l.file) + '#challenge' });
    }
    if (lessonStep && (!challenge || !open.s.started)) steps.push(lessonStep);
    if (!steps.length) steps.push({ text: rows.length ? t('next.caughtUp') : t('next.empty') });
    const [first, second] = steps;
    return html`<section class="lc-next" aria-labelledby="lc-next-h"><h2 id="lc-next-h" class="kicker">${t('next.title')}</h2>
      ${first.href ? html`<a class="lc-next-main" href="${first.href}">${first.text} <span aria-hidden="true">→</span></a>` : html`<p class="lc-next-main">${first.text}</p>`}
      ${first.hint ? html`<p class="lc-next-hint">${first.hint}</p>` : ''}
      ${second ? html`<p class="lc-next-then">${t('next.then')}: ${second.href ? html`<a href="${second.href}">${second.text}</a>` : second.text}</p>` : ''}</section>`;
  }
  function evidenceLink(ev) {
    if (!ev) return '';
    const s = String(ev);
    if (/\.md$/i.test(s)) return html` · <a href="${href(s)}">${s.replace(/^.*\//, '')}</a>`;
    return /^LR-\d+$/.test(s) ? html` · <a href="${href('learning-records/')}" title="learning-records/">${s}</a>` : html` · ${s}`;
  }
  function milestones(c, rows) {
    const ms = c.milestones || [];
    if (!ms.length) return '';
    return html`<section aria-labelledby="lc-ms-h"><h2 id="lc-ms-h">${t('ms.title')}</h2><ol class="lc-path">${ms.map((m, i) => {
      const where = rows.filter((r) => (r.l.milestones || []).indexOf(m.id) >= 0).pop();
      const state = m.status === 'mastered' ? html`${t('ms.done')}${evidenceLink(m.evidence)}`
        : m.status === 'in-progress' ? html`${t('ms.active')}${where ? html` · <a href="${href(where.l.file)}#challenge">${t('ms.activeHint', { n: where.l.n })}</a>` : ''}`
          : t('ms.locked');
      const cls = m.status === 'mastered' ? 'is-done' : m.status === 'in-progress' ? 'is-active' : 'is-locked';
      return html`<li class="${cls}"${m.status === 'in-progress' ? html.raw(' aria-current="step"') : ''}><span class="lc-node" aria-hidden="true">${m.status === 'mastered' ? '✓' : String(i + 1)}</span>
        <span class="lc-ms-label">${m.label}</span> <span class="lc-ms-state">${state}</span>${m.canDo ? html`<span class="lc-ms-can">${m.canDo}</span>` : ''}</li>`;
    })}</ol><p class="lc-muted lc-small">${t('ms.note')}</p></section>`;
  }
  function lessons(c, rows) {
    if (!rows.length) return '';
    const ms = msById(c);
    return html`<section aria-labelledby="lc-ls-h"><h2 id="lc-ls-h">${t('lessons.title')}</h2><ol class="lc-lessons">${rows.map((r) => html`<li>
      <a href="${href(r.l.file)}"><span class="lc-n" aria-hidden="true">${r.l.n}</span><span class="lc-title">${r.l.title}</span></a>
      <span class="lc-meta">${(r.l.milestones || []).map((id) => (ms[id] ? ms[id].label : id)).join(' · ')}${r.s.started
        ? html` · <strong>${t('level.' + r.s.level)}</strong> · ${r.s.total ? t('lesson.items', { done: r.s.tried, total: r.s.total }) : basis(r.s)}${r.s.review ? html` · ${t('strip.review').toLowerCase()} ${reviewText(r.s.review)}` : ''}`
        : html` · ${t('lesson.notStarted')}`}</span></li>`)}</ol>${ladder(0)}</section>`;
  }
  function record(host, s, c, rerender) {
    const xp = s ? safe(() => s.xp(), 0) : 0;
    host.innerHTML = html`<section class="lc-record" aria-labelledby="lc-rec-h"><h2 id="lc-rec-h">${t('record.title')}</h2>
      <p class="lc-muted lc-small">${t('record.help')}${xp ? html` ${t('record.xp', { xp: +xp || 0 })}.` : ''}</p>
      <p class="lc-actions"><button type="button" class="lc-btn lc-export">${t('record.export')}</button>
      <label class="lc-btn lc-import">${t('record.import')}<input type="file" accept=".json,application/json" class="lc-sr"></label></p>
      <p class="lc-record-msg" role="status" aria-live="off"></p></section>`;
    const msg = host.querySelector('.lc-record-msg');
    const say = (text) => { msg.textContent = text; LC.announce(text); };
    host.querySelector('.lc-export').addEventListener('click', () => {
      if (!s) return say(t('storage.off'));
      const d = new Date(), day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const file = 'progress-' + String(c.id || 'course').replace(/[^A-Za-z0-9_-]+/g, '-') + '-' + day + '.json'; // local date
      const url = URL.createObjectURL(new Blob([s.exportJSON()], { type: 'application/json' }));
      const a = doc.createElement('a'); a.href = url; a.download = file; doc.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      say(t('record.exported', { file: file }));
    });
    host.querySelector('input[type=file]').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f || !s) return;
      const rd = new FileReader();
      rd.onload = () => {
        const r = safe(() => s.importJSON(String(rd.result)), null);
        if (!r) return say(t('record.bad'));
        const errs = (r.errors || []).length;
        say(!r.added && !r.skipped && errs ? t('record.bad') : t('record.imported', { added: r.added || 0, skipped: r.skipped || 0 }) + (errs ? ' ' + t('record.importErrors', { n: errs }) : ''));
        e.target.value = '';
        rerender();
      };
      rd.readAsText(f);
    });
  }
  function dashboard(el) {
    const c = C();
    if (!c) { el.textContent = ''; return; }
    el.classList.add('lc-dash');
    el.innerHTML = html`${c.mission ? html`<p class="lc-mission"><span class="kicker">${t('mission')}</span> ${c.mission}</p>` : ''}<div class="lc-dash-main"></div><div class="lc-dash-record"></div>`;
    const main = el.querySelector('.lc-dash-main');
    const draw = () => {
      const s = st();
      const rows = lessonsOf(c).map((l) => {
        const its = LC.practiceItems ? LC.practiceItems(l.n) : [];
        const types = its.reduce((m, it) => { m[it.id] = it.type; return m; }, {});
        return { l, s: lessonState(c, l, s, its.map((it) => it.id), types) };
      });
      main.innerHTML = html`${nextUp(c, s, rows)}${milestones(c, rows)}${lessons(c, rows)}`;
    };
    record(el.querySelector('.lc-dash-record'), st(), c, draw);
    draw();
    if (LC.loadPracticeFiles) LC.loadPracticeFiles(draw); // item counts and types make "Next up" exact
    notices(el);
  }

  LC.ready(() => {
    markUnverified();
    const dash = doc.getElementById('dashboard');
    if (dash) LC.mount(dash, 'dashboard', dashboard);
    const n = +doc.body.getAttribute('data-lesson') || null;
    const el = doc.getElementById('progress');
    if (n) {
      const s = st();
      if (s) safe(() => s.recordExposure(n), null);
      if (el) {
        // After practice.js has registered the page's items (it boots in the same tick).
        setTimeout(() => setTimeout(() => LC.mount(el, 'lesson strip', () => strip(el, n)), 0), 0);
        doc.addEventListener('learncraft:attempt', () => LC.mount(el, 'lesson strip', () => strip(el, n)));
      }
      notices(doc.querySelector('main') || doc.body);
    }
  });
})(window);
