// Worked example of a bespoke interactive module: the confidence-band components from one course
// ("Building Reliable AI Agents", where the agent Jev returns { choice, confidence }). They used to ship in
// the generic diagram.js; they live here because their labels, thresholds and colours mean something only
// in that course. Copy this folder into a workspace's assets/ to reuse or adapt it. See README.md.
//
// Needs core.js, viz.js and diagram.js (it builds on Learncraft.diagram.numberline / bars and Learncraft.explorable).
// Load jev-confidence.css after style.css.
//
//   <div data-lc="jev-bands" data-act="0.8" data-confirm="0.5" [data-marker="0.42"]></div>   (legacy: <div data-bands …>)
//   <div data-lc="confidence-bars" data-bars='{"refund":0.61,"complaint":0.27}' data-confidence="0.42"
//        [data-bars-alt='{…}' data-confidence-alt="0.95" data-alt-label="Show other ticket"]></div>
//   <div data-lc="band-quiz" data-act="0.8" data-confirm="0.5" [data-seed="3"] id="l2-band"></div>   (legacy: class="band-quiz")
//   <div data-lc="threshold-explorer" data-seed="7" data-n="80" [data-target="0.95"] [data-start="0.5"] id="l2-explorer"></div>
//       (legacy: class="threshold-explorer"). The labelled results are SYNTHETIC and say so on screen.
// Practice items record their first attempt through ctx.record, else Learncraft.recordPractice(id, ok),
// else the legacy window.Progress.record(id, ok).
(function () {
  'use strict';
  var L = window.Learncraft;
  if (!L || !L.diagram) { console.error('jev-confidence.js: load core.js, viz.js and diagram.js first'); return; }
  var V = L.viz;
  function recorder(el, ctx) {
    var done = false, id = el.id || el.getAttribute('data-id') || el.getAttribute('data-lc');
    return function (ok) {
      if (done) return; done = true;
      if (ctx && typeof ctx.record === 'function') ctx.record(ok);
      else if (typeof L.recordPractice === 'function') L.recordPractice(id, ok);
      else if (window.Progress && window.Progress.record) window.Progress.record(id, ok);
    };
  }
  var zonesFor = function (act, confirm) {
    return [{ from: 0, to: confirm, label: 'TRIAGE', sub: 'human handles it', cls: 'z-triage' },
      { from: confirm, to: act, label: 'CONFIRM', sub: 'human approves', cls: 'z-confirm' },
      { from: act, to: 1, label: 'ACT', sub: 'fully automatic', cls: 'z-act' }];
  };
  var phrase = function (c) { return c >= 0.8 ? 'one clear winner' : c >= 0.5 ? 'fairly clear' : 'weight is spread out'; };

  function bands(el) {
    var act = +el.getAttribute('data-act'), confirm = +el.getAttribute('data-confirm');
    if (!(confirm > 0 && act > confirm && act < 1)) throw new Error('need 0 < data-confirm < data-act < 1');
    return L.diagram.numberline(el, { min: 0, max: 1, zones: zonesFor(act, confirm), label: 'confidence',
      marker: el.hasAttribute('data-marker') ? +el.getAttribute('data-marker') : null });
  }

  function confidenceBars(el) {
    var c = el.getAttribute('data-confidence'), ca = el.getAttribute('data-confidence-alt');
    var sum = function (x) { return x == null ? null : 'confidence = ' + (+x).toFixed(2) + ' (' + phrase(+x) + ')'; };
    return L.diagram.bars(el, { values: JSON.parse(el.getAttribute('data-bars')), alt: el.hasAttribute('data-bars-alt') ? JSON.parse(el.getAttribute('data-bars-alt')) : null,
      altLabel: el.getAttribute('data-alt-label'), label: 'Probability per option', sort: 'desc', summary: sum(c), altSummary: sum(ca) });
  }

  // Visual retrieval: a marker lands on the scale and the learner names the band (zones hidden until answered).
  function bandQuiz(el, ctx) {
    var act = +el.getAttribute('data-act'), confirm = +el.getAttribute('data-confirm'), rng = L.rng(+(el.getAttribute('data-seed') || 1));
    var record = recorder(el, ctx);
    var prompt = document.createElement('p'), fig = document.createElement('div'), opts = document.createElement('div');
    var fb = document.createElement('p'), tally = document.createElement('p');
    opts.className = 'quiz-opts'; fb.className = 'quiz-fb'; fb.setAttribute('role', 'status'); tally.className = 'quiz-score';
    el.replaceChildren(prompt, fig, opts, fb, tally);
    el.setAttribute('data-practice', '');
    var nl = L.diagram.numberline(fig, { min: 0, max: 1, zones: zonesFor(act, confirm), label: 'confidence', marker: null });
    var right = 0, total = 0, v;
    var truth = function (c) { return c >= act ? 'Act' : c >= confirm ? 'Confirm' : 'Triage'; };
    function round(focus) {
      v = Math.round(rng() * 100) / 100;
      prompt.innerHTML = 'Jev returned <code>confidence: ' + v.toFixed(2) + '</code>. Which band? <em>(The zones appear once you answer.)</em>';
      fig.classList.add('dg-blind');
      nl.setMarker(v, false);
      fb.textContent = ''; fb.className = 'quiz-fb';
      var answered = false;
      opts.replaceChildren.apply(opts, ['Act', 'Confirm', 'Triage'].map(function (t) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = t;
        b.addEventListener('click', function () {
          if (answered) return; answered = true; total++;
          var ok = t === truth(v); if (ok) right++;
          record(ok);
          b.classList.add(ok ? 'ok' : 'bad'); b.setAttribute('aria-pressed', 'true');
          fig.classList.remove('dg-blind');
          fb.className = 'quiz-fb ' + (ok ? 'ok' : 'bad');
          fb.textContent = (ok ? '✓ Right. ' : '✗ It\'s ' + truth(v) + '. ') + v.toFixed(2) + ' against lines at ' + confirm + ' and ' + act + '.';
          tally.textContent = right + ' / ' + total + ' correct';
          var again = document.createElement('button'); again.type = 'button'; again.className = 'dg-again'; again.textContent = 'Another one';
          again.addEventListener('click', function () { round(true); });
          opts.appendChild(again);
          again.focus();
        });
        return b;
      }));
      if (focus) opts.firstChild.focus(); // keep focus in the widget when the old buttons are replaced
    }
    round(false);
  }

  // Coverage vs accuracy: move the act threshold over SYNTHETIC labelled results.
  function thresholdExplorer(el, ctx) {
    var seed = +(el.getAttribute('data-seed') || 1), n = +(el.getAttribute('data-n') || 80);
    var target = el.hasAttribute('data-target') ? +el.getAttribute('data-target') : null;
    var s = seed, rnd = function () { return (s = (s * 16807) % 2147483647) / 2147483647; }; // same generator as before the move: lessons keep their data
    var pts = [];
    for (var i = 0; i < n; i++) {
      var c = Math.round(Math.min(0.99, Math.max(0.2, 1 - Math.pow(rnd(), 1.6) * 0.8)) * 100) / 100;
      pts.push({ c: c, ok: rnd() < 0.35 + 0.64 * c * c, j: rnd() });
    }
    var stats = function (t) {
      var auto = pts.filter(function (p) { return p.c >= t; }), right = auto.filter(function (p) { return p.ok; }).length;
      return { cov: auto.length / n, acc: auto.length ? right / auto.length : 1, wrong: auto.length - right, auto: auto.length };
    };
    var cands = []; for (var k = 4; k <= 19; k++) cands.push(k / 20);
    var best = target == null ? null : cands.filter(function (t) { return stats(t).acc >= target; })[0];
    var record = recorder(el, ctx);
    var ex = L.explorable(el, {
      seed: seed, label: 'Synthetic labelled results by confidence, with the act threshold',
      params: [{ id: 't', label: 'Act threshold', min: 0.2, max: 0.95, step: 0.05, value: +(el.getAttribute('data-start') || 0.5),
        format: function (v) { return 'act ≥ ' + v.toFixed(2); }, valuetext: function (v) { return 'act at confidence ' + v.toFixed(2) + ' or more'; } }],
      render: function (vals, rng, W) {
        var t = vals.t, x0 = 16, x1 = W - 16, x = function (v) { return (x0 + v * (x1 - x0)).toFixed(1); }, DY = 54, DH = 90, BY = 200, BH = 64;
        var o = '<svg class="dg te" viewBox="0 0 ' + W + ' 312" aria-hidden="true">';
        o += '<rect class="te-human" x="' + x0 + '" y="' + (DY - 6) + '" width="' + (x(t) - x0).toFixed(1) + '" height="' + (DH + 12) + '"/>';
        o += '<rect class="te-auto" x="' + x(t) + '" y="' + (DY - 6) + '" width="' + (x1 - x(t)).toFixed(1) + '" height="' + (DH + 12) + '"/>';
        o += '<text class="dg-cap" x="' + x0 + '" y="14">● right   × wrong   (synthetic data)</text>';
        pts.forEach(function (p) {
          var cx = +x(p.c), cy = DY + 12 + p.j * (DH - 20), dim = p.c < t ? ' te-dim' : '';
          o += p.ok ? '<circle class="te-ok' + dim + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4"/>'
            : '<path class="te-bad' + dim + '" d="M' + (cx - 4).toFixed(1) + ',' + (cy - 4).toFixed(1) + 'l8,8m0,-8l-8,8"/>';
        });
        o += '<text class="dg-cap" x="' + x0 + '" y="' + (BY - 24) + '">accuracy per confidence bucket</text>';
        for (var b = 2; b < 10; b++) {
          var inB = pts.filter(function (p) { return p.c >= b / 10 && p.c < (b + 1) / 10 + (b === 9 ? 0.01 : 0); });
          if (!inB.length) continue;
          var acc = inB.filter(function (p) { return p.ok; }).length / inB.length, bx = +x(b / 10) + 3, bw = (x1 - x0) / 10 - 6;
          o += '<rect class="dg-track" x="' + bx.toFixed(1) + '" y="' + BY + '" width="' + bw.toFixed(1) + '" height="' + BH + '"/>';
          o += '<rect class="te-bucket" x="' + bx.toFixed(1) + '" y="' + (BY + BH * (1 - acc)).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (BH * acc).toFixed(1) + '"/>';
          if (bw >= 26) o += '<text class="dg-num" text-anchor="middle" x="' + (bx + bw / 2).toFixed(1) + '" y="' + (BY + BH * (1 - acc) - 4).toFixed(1) + '">' + Math.round(acc * 100) + '%</text>';
        }
        [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(function (v) { o += '<text class="dg-num" text-anchor="middle" x="' + x(v) + '" y="' + (BY + BH + 18) + '">' + v + '</text>'; });
        o += '<text class="dg-cap" text-anchor="end" x="' + x1 + '" y="' + (BY + BH + 38) + '">confidence →</text>';
        o += '<line class="te-line" x1="' + x(t) + '" x2="' + x(t) + '" y1="' + (DY - 10) + '" y2="' + (BY + BH + 4) + '"/>';
        o += '<text class="dg-mt" text-anchor="middle" x="' + V.clamp(+x(t), 44, W - 44).toFixed(1) + '" y="' + (DY - 14) + '">act ≥ ' + t.toFixed(2) + '</text>';
        return o + '</svg>';
      },
      describe: function (vals) {
        var st = stats(vals.t);
        return 'At act ≥ ' + vals.t.toFixed(2) + ': ' + Math.round(st.cov * 100) + '% coverage (' + st.auto + ' of ' + n + ' automatic), ' +
          (st.acc * 100).toFixed(1) + '% accuracy on the automatic slice, ' + st.wrong + ' wrong actions taken automatically.';
      },
      target: target == null ? null : { id: el.id || 'explorer', label: 'Check this line',
        check: function (vals) {
          var t = Math.round(vals.t * 100) / 100, st = stats(t);
          if (t === best) return { ok: true, msg: t + ' is the lowest line that keeps accuracy ≥ ' + target * 100 + '%. It automates ' + Math.round(st.cov * 100) + '% of the traffic.' };
          return { ok: false, msg: st.acc < target ? 'At ' + t + ', accuracy is ' + (st.acc * 100).toFixed(1) + '%, below the ' + target * 100 + '% target. Move the line right.'
            : t + ' meets the target, but a lower line also does and automates more. Move the line left.' };
        } },
    }, { record: record });
    return ex;
  }

  var defs = { 'jev-bands': bands, 'confidence-bars': confidenceBars, 'band-quiz': bandQuiz, 'threshold-explorer': thresholdExplorer };
  Object.keys(defs).forEach(function (type) { L.register(type, { mount: function (el, ctx) { return defs[type](el, ctx); } }); });
  // Lessons written before Learncraft used class/attribute markup; mount those too.
  L.ready(function () {
    [['[data-bands]:not([data-lc])', 'jev-bands'], ['.band-quiz:not([data-lc])', 'band-quiz'], ['.threshold-explorer:not([data-lc])', 'threshold-explorer']].forEach(function (p) {
      document.querySelectorAll(p[0]).forEach(function (el) { L.mount(el, p[1], function () { return defs[p[1]](el, {}); }); });
    });
  });
})();
