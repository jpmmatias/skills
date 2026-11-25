// Reusable diagram + visual-practice components. Inline SVG, themed via CSS vars in style.css.
// Animations are representational only (they show the actual change), learner-controlled,
// under 1s each, and disabled under prefers-reduced-motion.
//
//   <div data-bands data-act="0.8" data-confirm="0.5" [data-marker="0.42"]></div>
//       Confidence band number line. The marker slides to its value when scrolled into view.
//   <div data-bars='{"a":0.61,"b":0.35}' [data-confidence="0.42"]
//        [data-bars-alt='{…}' data-confidence-alt="0.95" data-alt-label="Show other ticket"]></div>
//       Probability bars that grow into view. With data-bars-alt, a toggle animates between
//       the two distributions (rows re-sort, widths tween, confidence updates).
//   <div class="stepper"> <svg>…[data-step="1"]…</svg> <div class="captions"><p data-step="1">…</p></div> </div>
//       Click-through process. Each step draws its arrows and sends a "packet" along them.
//       Play / Pause runs the steps automatically.
//   <div class="band-quiz" data-act="0.8" data-confirm="0.5"></div>
//       Visual retrieval: a random confidence marker slides in and the learner picks the band.
//   <div class="fade"> …<input data-answer="choice">… <button class="fade-check">Check</button></div>
//       Faded worked example: fill the blanks, with feedback per blank.
//   <div class="threshold-explorer" data-seed="7" data-n="80" [data-target="0.95"] [data-start="0.5"]></div>
//       Labeled results as dots on the confidence axis (green = Jev was right, red = wrong).
//       Drag the line: coverage (share automatic) and accuracy of the automatic slice update live,
//       with per-bucket accuracy bars below. With data-target, "Lock in" checks whether the learner
//       found the LOWEST line (0.05 steps) that keeps accuracy >= target. The data is synthetic.
// Practice components report first attempts to window.Progress (assets/progress.js) when present.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const record = (id, ok) => window.Progress && Progress.record(id, ok);
  const svg = (tag, attrs = {}, text) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  };
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const tween = (ms, fn) => new Promise((res) => {
    if (RM || ms <= 0) { fn(1); return res(); }
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      fn(ease(t));
      t < 1 ? requestAnimationFrame(tick) : res();
    };
    requestAnimationFrame(tick);
  });
  const onVisible = (el, fn) => {
    if (RM || !('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold: 0.4 });
    io.observe(el);
  };

  // ---------- Band number line ----------
  function bands(el, { act, confirm, marker }) {
    const W = 640, H = 120, L = 20, R = W - 20, Y = 40, BH = 34;
    const x = (v) => L + v * (R - L);
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg', role: 'img',
      'aria-label': `Confidence bands: triage below ${confirm}, confirm up to ${act}, act above` });
    [[0, confirm, 'z-triage', 'TRIAGE', 'human handles it'],
     [confirm, act, 'z-confirm', 'CONFIRM', 'human approves'],
     [act, 1, 'z-act', 'ACT', 'fully automatic']].forEach(([a, b, cls, label, sub]) => {
      s.append(svg('rect', { x: x(a), y: Y, width: x(b) - x(a), height: BH, class: cls }));
      const cx = (x(a) + x(b)) / 2;
      s.append(svg('text', { x: cx, y: Y + 15, class: 'dg-zl', 'text-anchor': 'middle' }, label));
      s.append(svg('text', { x: cx, y: Y + 28, class: 'dg-zs', 'text-anchor': 'middle' }, sub));
    });
    [0, confirm, act, 1].forEach((v) => {
      s.append(svg('line', { x1: x(v), x2: x(v), y1: Y + BH, y2: Y + BH + 8, class: 'dg-tick' }));
      s.append(svg('text', { x: x(v), y: Y + BH + 22, class: 'dg-num', 'text-anchor': 'middle' }, String(v)));
    });
    s.append(svg('text', { x: L, y: 18, class: 'dg-cap' }, 'confidence →'));
    const m = svg('g', { class: 'dg-marker' });
    m.append(svg('path', { d: 'M -7 -12 L 7 -12 L 0 0 Z' }));
    const mt = svg('text', { y: -16, 'text-anchor': 'middle', class: 'dg-mt' });
    m.append(mt);
    s.append(m);
    let cur = 0;
    const place = (v) => { m.setAttribute('transform', `translate(${x(v)},${Y})`); mt.textContent = v.toFixed(2); };
    // Slide from the previous value, so the learner watches the number land in its zone.
    const setMarker = (v, animate = true) => {
      if (v == null) { m.style.display = 'none'; return Promise.resolve(); }
      m.style.display = '';
      const from = cur; cur = v;
      if (!animate) { place(v); return Promise.resolve(); }
      return tween(650, (t) => place(from + (v - from) * t));
    };
    el.replaceChildren(s);
    if (marker != null) { setMarker(0, false); onVisible(el, () => setMarker(marker)); }
    else setMarker(null);
    return { setMarker };
  }

  // ---------- Probability bars (keyed rows, animated) ----------
  function bars(el, probs, confidence, alt, confAlt, altLabel) {
    const keys = [...new Set([...Object.keys(probs), ...Object.keys(alt || {})])];
    const W = 640, row = 30, L = 150, R = W - 90, hasConf = confidence != null;
    const H = keys.length * row + (hasConf ? 34 : 6);
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg', role: 'img', 'aria-label': 'Probability per option' });
    const rows = {};
    keys.forEach((k) => {
      const g = svg('g');
      const lab = svg('text', { x: L - 10, y: 17, 'text-anchor': 'end', class: 'dg-lab' }, k);
      const track = svg('rect', { x: L, y: 0, width: R - L, height: 22, class: 'dg-track' });
      const bar = svg('rect', { x: L, y: 0, width: 0, height: 22, class: 'dg-bar' });
      const val = svg('text', { x: L + 6, y: 16, class: 'dg-num' });
      g.append(lab, track, bar, val);
      s.append(g);
      rows[k] = { g, bar, val, y: keys.indexOf(k) * row + 4, v: 0 };
    });
    const conf = hasConf ? svg('text', { x: L, y: H - 8, class: 'dg-conf' }) : null;
    if (conf) s.append(conf);
    const confText = (c) => `confidence = ${c.toFixed(2)}  (${c >= 0.8 ? 'one clear winner' : c >= 0.5 ? 'fairly clear' : 'weight is spread out'})`;

    let curConf = confidence ?? 0;
    function show(p, c, ms) {
      const order = Object.entries(p).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      const start = Object.fromEntries(keys.map((k) => [k, { y: rows[k].y, v: rows[k].v }]));
      const target = Object.fromEntries(keys.map((k) => [k, { y: order.indexOf(k) * row + 4, v: p[k] || 0 }]));
      keys.forEach((k) => rows[k].bar.setAttribute('class', k === order[0] ? 'dg-win' : 'dg-bar'));
      const c0 = curConf;
      return tween(ms, (t) => {
        keys.forEach((k) => {
          const r = rows[k], y = start[k].y + (target[k].y - start[k].y) * t, v = start[k].v + (target[k].v - start[k].v) * t;
          r.y = y; r.v = v;
          r.g.setAttribute('transform', `translate(0,${y})`);
          r.bar.setAttribute('width', Math.max(2, v * (R - L)));
          r.val.setAttribute('x', L + v * (R - L) + 6);
          r.val.textContent = v.toFixed(2) + (k === order[0] ? '  ← choice' : '');
        });
        if (conf && c != null) { curConf = c0 + (c - c0) * t; conf.textContent = confText(curConf); }
      });
    }
    keys.forEach((k) => rows[k].g.setAttribute('transform', `translate(0,${rows[k].y})`));
    if (conf) conf.textContent = confText(0);
    curConf = 0;
    el.replaceChildren(s);
    onVisible(el, () => show(probs, confidence, 700));

    if (alt) {
      let onAlt = false;
      const btn = document.createElement('button');
      btn.className = 'dg-toggle';
      btn.textContent = '⇄ ' + (altLabel || 'Switch');
      btn.onclick = () => { onAlt = !onAlt; show(onAlt ? alt : probs, onAlt ? confAlt : confidence, 700); };
      el.append(btn);
    }
  }

  // ---------- Stepper (draws arrows, sends a packet, Play/Pause) ----------
  function stepper(el) {
    const s = el.querySelector('svg');
    const caps = [...el.querySelectorAll('.captions [data-step]')];
    const n = caps.length;
    let cur = 1, timer = null;
    const nav = document.createElement('div');
    nav.className = 'stepper-nav';
    const prev = Object.assign(document.createElement('button'), { textContent: '← Back' });
    const play = Object.assign(document.createElement('button'), { textContent: '▶ Play' });
    const next = Object.assign(document.createElement('button'), { textContent: 'Next →' });
    const count = document.createElement('span');
    const mid = document.createElement('span'); mid.className = 'stepper-mid'; mid.append(play, count);
    nav.append(prev, mid, next);
    el.append(nav);

    function flow(g) {
      if (RM) return;
      g.querySelectorAll('.arrow').forEach((p) => {
        if (p.style.display === 'none' || !p.getTotalLength) return;
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 500, easing: 'ease-out', fill: 'forwards' });
        const dot = svg('circle', { r: 5, class: 'dg-packet' });
        s.append(dot);
        tween(600, (t) => { const pt = p.getPointAtLength(t * len); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); })
          .then(() => dot.remove());
      });
    }
    const show = (animate) => {
      s.querySelectorAll('[data-step]').forEach((g) => {
        const k = +g.dataset.step;
        g.classList.toggle('st-hidden', k > cur);
        g.classList.toggle('st-now', k === cur);
        if (animate && k === cur) flow(g);
      });
      caps.forEach((c) => (c.hidden = +c.dataset.step !== cur));
      count.textContent = `step ${cur} / ${n}`;
      prev.disabled = cur === 1; next.disabled = cur === n;
    };
    const stop = () => { clearInterval(timer); timer = null; play.textContent = '▶ Play'; };
    prev.onclick = () => { stop(); cur--; show(false); };
    next.onclick = () => { stop(); cur++; show(true); };
    play.onclick = () => {
      if (timer) return stop();
      if (cur === n) { cur = 1; show(true); }
      play.textContent = '❚❚ Pause';
      timer = setInterval(() => { if (cur >= n) return stop(); cur++; show(true); }, 2200);
    };
    show(false);
  }

  // ---------- Visual retrieval: place the band ----------
  function bandQuiz(el) {
    const act = +el.dataset.act, confirm = +el.dataset.confirm;
    const fig = document.createElement('div');
    const prompt = document.createElement('p');
    const opts = document.createElement('div'); opts.className = 'quiz-opts';
    const fb = document.createElement('div'); fb.className = 'quiz-fb';
    const tally = document.createElement('p'); tally.className = 'quiz-score';
    el.append(prompt, fig, opts, fb, tally);
    const b = bands(fig, { act, confirm, marker: null });
    let v, done, right = 0, total = 0, reported = false;
    const truth = (c) => (c >= act ? 'Act' : c >= confirm ? 'Confirm' : 'Triage');
    const round = () => {
      v = Math.round(Math.random() * 100) / 100; done = false;
      prompt.innerHTML = `Jev returned <code>confidence: ${v.toFixed(2)}</code>. Which band? <em>(The zones reveal once you answer.)</em>`;
      fig.classList.add('dg-blind');
      b.setMarker(0, false); b.setMarker(v);
      fb.textContent = ''; fb.className = 'quiz-fb';
      opts.replaceChildren(...['Act', 'Confirm', 'Triage'].map((t) => {
        const btn = document.createElement('button'); btn.textContent = t;
        btn.onclick = () => {
          if (done) return; done = true; total++;
          const ok = t === truth(v); if (ok) right++;
          if (!reported) { reported = true; record('band', ok); }
          btn.classList.add(ok ? 'ok' : 'bad');
          fig.classList.remove('dg-blind');
          fb.className = 'quiz-fb ' + (ok ? 'ok' : 'bad');
          fb.textContent = (ok ? '✓ ' : `✗ It's ${truth(v)}. `) + `Lines are at ${confirm} and ${act}.`;
          tally.textContent = `${right} / ${total} correct`;
          const again = document.createElement('button'); again.textContent = 'Another →'; again.className = 'dg-again';
          again.onclick = round; opts.append(again);
        };
        return btn;
      }));
    };
    round();
  }

  // ---------- Faded worked example ----------
  function fade(el) {
    const inputs = [...el.querySelectorAll('input[data-answer]')];
    inputs.forEach((i) => (i.size = Math.max(4, i.dataset.answer.length + 1)));
    const fb = document.createElement('div'); fb.className = 'quiz-fb';
    el.append(fb);
    let reported = false;
    el.querySelector('.fade-check').onclick = () => {
      let ok = 0;
      inputs.forEach((i) => {
        const good = i.value.trim() === i.dataset.answer;
        i.classList.toggle('ok', good); i.classList.toggle('bad', !good);
        if (good) ok++;
      });
      const all = ok === inputs.length;
      if (!reported) { reported = true; record('fade', all); }
      fb.className = 'quiz-fb ' + (all ? 'ok' : 'bad');
      fb.textContent = all ? '✓ All blanks correct.' : `${ok} / ${inputs.length} correct. Red blanks need another try.`;
    };
  }


  // ---------- Threshold explorer (coverage vs accuracy) ----------
  function thresholdExplorer(el) {
    let seed = +(el.dataset.seed || 1);
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = +(el.dataset.n || 80), target = el.dataset.target ? +el.dataset.target : null;
    // Synthetic but realistic: confidence skews high, and P(correct) rises with confidence.
    const pts = Array.from({ length: n }, () => {
      const c = Math.round(Math.min(0.99, Math.max(0.2, 1 - Math.pow(rnd(), 1.6) * 0.8)) * 100) / 100;
      return { c, ok: rnd() < 0.35 + 0.64 * c * c, j: rnd() };
    });
    const stats = (t) => {
      const auto = pts.filter((p) => p.c >= t), right = auto.filter((p) => p.ok).length;
      return { cov: auto.length / n, acc: auto.length ? right / auto.length : 1, wrong: auto.length - right, auto: auto.length };
    };
    const W = 640, L = 20, R = W - 20, x = (v) => L + v * (R - L), DY = 34, DH = 90, BY = 166, BH = 70;
    const s = svg('svg', { viewBox: `0 0 ${W} 276`, class: 'dg te', role: 'img', 'aria-label': 'Labeled results by confidence; drag the threshold' });
    const shadeL = svg('rect', { x: L, y: DY - 6, height: DH + 12, class: 'te-human' });
    const shadeR = svg('rect', { y: DY - 6, height: DH + 12, class: 'te-auto' });
    s.append(shadeL, shadeR);
    const lblH = svg('text', { y: DY + 4, class: 'te-zone', 'text-anchor': 'middle' }, 'to humans');
    const lblA = svg('text', { y: DY + 4, class: 'te-zone te-zone-a', 'text-anchor': 'middle' }, 'automatic');
    s.append(lblH, lblA);
    const dots = pts.map((p) => {
      const d = svg('circle', { cx: x(p.c), cy: DY + 14 + p.j * (DH - 20), r: 4.5, class: p.ok ? 'te-ok' : 'te-bad' });
      s.append(d); return d;
    });
    // per-bucket accuracy bars (calibration view)
    s.append(svg('text', { x: L, y: BY - 10, class: 'dg-cap' }, 'accuracy per confidence bucket'));
    for (let b = 2; b < 10; b++) {
      const inB = pts.filter((p) => p.c >= b / 10 && p.c < (b + 1) / 10 + (b === 9 ? 0.01 : 0));
      if (!inB.length) continue;
      const acc = inB.filter((p) => p.ok).length / inB.length, bx = x(b / 10) + 3, bw = x(0.1) - x(0) - 6;
      s.append(svg('rect', { x: bx, y: BY, width: bw, height: BH, class: 'dg-track' }));
      s.append(svg('rect', { x: bx, y: BY + BH * (1 - acc), width: bw, height: BH * acc, class: 'te-bucket' }));
      s.append(svg('text', { x: bx + bw / 2, y: BY + BH * (1 - acc) - 4, 'text-anchor': 'middle', class: 'dg-num' }, Math.round(acc * 100) + '%'));
    }
    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach((v) => s.append(svg('text', { x: x(v), y: BY + BH + 18, 'text-anchor': 'middle', class: 'dg-num' }, String(v))));
    s.append(svg('text', { x: R, y: BY + BH + 36, 'text-anchor': 'end', class: 'dg-cap' }, 'confidence →'));
    const line = svg('line', { y1: DY - 10, y2: BY + BH + 4, class: 'te-line' });
    const knob = svg('text', { y: DY - 16, 'text-anchor': 'middle', class: 'dg-mt' });
    s.append(line, knob);

    const panel = document.createElement('div'); panel.className = 'te-panel';
    const range = Object.assign(document.createElement('input'), { type: 'range', min: 0.2, max: 0.95, step: 0.05, value: el.dataset.start || 0.5 });
    range.setAttribute('aria-label', 'Act threshold');
    const readout = document.createElement('div'); readout.className = 'te-readout';
    panel.append(range, readout);
    el.replaceChildren(s, panel);

    const render = (t) => {
      line.setAttribute('x1', x(t)); line.setAttribute('x2', x(t));
      knob.setAttribute('x', x(t)); knob.textContent = 'act ≥ ' + t.toFixed(2);
      shadeL.setAttribute('width', x(t) - L); shadeR.setAttribute('x', x(t)); shadeR.setAttribute('width', R - x(t));
      lblH.setAttribute('x', (L + x(t)) / 2); lblA.setAttribute('x', (x(t) + R) / 2);
      pts.forEach((p, i) => dots[i].classList.toggle('te-dim', p.c < t));
      const st = stats(t), hit = target != null && st.acc >= target;
      readout.innerHTML =
        `<span><b>${Math.round(st.cov * 100)}%</b> coverage <small>(${st.auto}/${n} automatic)</small></span>` +
        `<span class="${target == null ? '' : hit ? 'te-hit' : 'te-miss'}"><b>${(st.acc * 100).toFixed(1)}%</b> accuracy of the automatic slice</span>` +
        `<span><b>${st.wrong}</b> wrong actions taken automatically</span>`;
    };
    let shown = +range.value;
    range.oninput = () => { const from = shown, to = +range.value; shown = to; tween(180, (k) => render(from + (to - from) * k)); };
    render(shown);

    if (target != null) {
      const cands = []; for (let t = 0.2; t <= 0.951; t += 0.05) cands.push(Math.round(t * 100) / 100);
      const best = cands.find((t) => stats(t).acc >= target);
      const btn = Object.assign(document.createElement('button'), { textContent: '🔒 Lock in this line', className: 'dg-toggle' });
      const fb = document.createElement('div'); fb.className = 'quiz-fb';
      let reported = false;
      btn.onclick = () => {
        const t = Math.round(+range.value * 100) / 100, ok = t === best;
        if (!reported) { reported = true; record('explorer', ok); }
        fb.className = 'quiz-fb ' + (ok ? 'ok' : 'bad');
        fb.textContent = ok
          ? `✓ ${t} is the lowest line that keeps accuracy ≥ ${target * 100}%. It automates ${Math.round(stats(t).cov * 100)}% of the traffic.`
          : stats(t).acc < target
            ? `✗ At ${t}, accuracy is ${(stats(t).acc * 100).toFixed(1)}%, below the ${target * 100}% target. Move the line right.`
            : `✗ ${t} meets the target, but a lower line also does and automates more. Move the line left.`;
      };
      panel.append(btn, fb);
    }
  }

  document.querySelectorAll('[data-bands]').forEach((el) =>
    bands(el, { act: +el.dataset.act, confirm: +el.dataset.confirm, marker: el.dataset.marker ? +el.dataset.marker : null }));
  document.querySelectorAll('[data-bars]').forEach((el) =>
    bars(el, JSON.parse(el.dataset.bars), el.dataset.confidence ? +el.dataset.confidence : null,
      el.dataset.barsAlt ? JSON.parse(el.dataset.barsAlt) : null,
      el.dataset.confidenceAlt ? +el.dataset.confidenceAlt : null, el.dataset.altLabel));
  document.querySelectorAll('.stepper').forEach(stepper);
  document.querySelectorAll('.band-quiz').forEach(bandQuiz);
  document.querySelectorAll('.fade').forEach(fade);
  document.querySelectorAll('.threshold-explorer').forEach(thresholdExplorer);
})();
