// Lesson 3 figure: "bayes-tree", an explorable on Learncraft.explorable with its own SVG.
// Sliders: base rate (prevalence), sensitivity, specificity. Two views of the same numbers:
//   1. an EXACT natural-frequency tree for 10,000 people (expected counts, no randomness);
//   2. ONE simulated population of 1,000 people (seeded): each person independently has the condition with
//      probability = base rate, then tests positive with probability = sensitivity (if they have it) or
//      1 − specificity (if not). Icons are grouped by outcome so the positives can be counted.
// The person stream is fixed per seed (two uniforms per person), so moving a slider re-labels the same
// people and every seed is reproducible. "New seed" moves to the next seed.
//
//   <div data-lc="bayes-tree" id="bayes" data-seed="7"></div>
(function () {
  'use strict';
  var L = window.Learncraft;
  var PREV = [0.1, 0.5, 1, 2, 5, 10, 20, 30, 50];            // %
  var SPEC = [50, 60, 70, 80, 85, 90, 91, 95, 97, 99, 99.5, 99.9];  // %
  var POP = 10000, SIM = 1000;

  function n(v) { // natural-frequency counts: integers as 9,009; non-integers to one decimal
    var r = Math.round(v * 10) / 10;
    return Number.isInteger(r) ? r.toLocaleString('en-US') : r.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  // percentages: two significant figures below 10% (0.99%, 9.2%), one decimal above (52.6%)
  function pc(v) { var x = v * 100; return (x > 0 && x < 10 ? x.toLocaleString('en-US', { maximumSignificantDigits: 2 }) : x.toLocaleString('en-US', { maximumFractionDigits: 1 })) + '%'; }
  function people(seed) { var r = L.rng(seed), a = new Float64Array(SIM * 2); for (var i = 0; i < a.length; i++) a[i] = r(); return a; }

  L.register('bayes-tree', {
    mount: function (el) {
      var seed = +(el.getAttribute('data-seed') || 7), cache = {};
      var stream = function () { return cache[seed] || (cache[seed] = people(seed)); };
      function run(v) {
        var prev = PREV[v.prev] / 100, sens = v.sens / 100, spec = SPEC[v.spec] / 100;
        var has = POP * prev, no = POP - has, tp = has * sens, fn = has - tp, fp = no * (1 - spec), tn = no - fp;
        var post = tp + fp > 0 ? tp / (tp + fp) : 0;
        var u = stream(), sim = { tp: 0, fn: 0, fp: 0, tn: 0 }, cls = new Array(SIM);
        for (var i = 0; i < SIM; i++) {
          var h = u[2 * i] < prev, pos = h ? u[2 * i + 1] < sens : u[2 * i + 1] < 1 - spec;
          var c = h ? (pos ? 'tp' : 'fn') : (pos ? 'fp' : 'tn'); sim[c]++; cls[i] = c;
        }
        sim.post = sim.tp + sim.fp ? sim.tp / (sim.tp + sim.fp) : null;
        return { prev: prev, sens: sens, spec: spec, has: has, no: no, tp: tp, fn: fn, fp: fp, tn: tn, post: post, sim: sim };
      }
      function tree(r, W) {
        var H = 230, s = '<svg class="dg" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
        var lw = Math.min(150, (W - 8) / 4 - 6), mw = Math.min(170, W / 2 - 16);
        var xs = [W / 8, 3 * W / 8, 5 * W / 8, 7 * W / 8], xm = [W / 4, 3 * W / 4];
        function box(cx, y, w, line1, line2, hot) {
          return '<rect class="' + (hot ? 'node-hot' : 'node') + '" x="' + (cx - w / 2).toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="44" rx="6"/>' +
            '<text class="t-sub" x="' + cx.toFixed(1) + '" y="' + (y + 17) + '" text-anchor="middle">' + line1 + '</text>' +
            '<text class="t-title" x="' + cx.toFixed(1) + '" y="' + (y + 36) + '" text-anchor="middle">' + line2 + '</text>';
        }
        function edge(x1, y1, x2, y2) { return '<line class="dg-edge" x1="' + x1.toFixed(1) + '" y1="' + y1 + '" x2="' + x2.toFixed(1) + '" y2="' + y2 + '"/>'; }
        s += edge(W / 2, 46, xm[0], 84) + edge(W / 2, 46, xm[1], 84);
        s += edge(xm[0], 128, xs[0], 170) + edge(xm[0], 128, xs[1], 170) + edge(xm[1], 128, xs[2], 170) + edge(xm[1], 128, xs[3], 170);
        s += box(W / 2, 2, Math.min(200, W - 20), 'everyone', '10,000 people', false);
        s += box(xm[0], 84, mw, 'have it (' + pc(r.prev) + ')', n(r.has), false);
        s += box(xm[1], 84, mw, 'do not', n(r.no), false);
        s += box(xs[0], 170, lw, 'test +', n(r.tp), true) + box(xs[1], 170, lw, 'test −', n(r.fn), false);
        s += box(xs[2], 170, lw, 'test +', n(r.fp), true) + box(xs[3], 170, lw, 'test −', n(r.tn), false);
        s += '<text class="dg-num" x="' + ((xm[0] + xs[0]) / 2 - 4).toFixed(1) + '" y="' + 154 + '" text-anchor="end">' + pc(r.sens) + '</text>';
        s += '<text class="dg-num" x="' + ((xm[1] + xs[2]) / 2 - 4).toFixed(1) + '" y="' + 154 + '" text-anchor="end">' + pc(1 - r.spec) + '</text>';
        return s + '</svg>';
      }
      function icons(r, cls, W) {
        var cols = W < 520 ? 40 : 50, rows = SIM / cols, cell = (W - 4) / cols, H = rows * cell + 4, rad = Math.max(2.2, cell * 0.36);
        var order = ['tp', 'fp', 'fn', 'tn'], k = 0, s = '<svg class="dg" viewBox="0 0 ' + W.toFixed(0) + ' ' + H.toFixed(1) + '" aria-hidden="true">';
        var counts = { tp: 0, fp: 0, fn: 0, tn: 0 }; cls.forEach(function (c) { counts[c]++; });
        order.forEach(function (c) {
          for (var i = 0; i < counts[c]; i++, k++) {
            var cx = 2 + (k % cols + 0.5) * cell, cy = 2 + (Math.floor(k / cols) + 0.5) * cell;
            if (c === 'tp') s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rad.toFixed(1) + '" style="fill:var(--signal)"/>';
            else if (c === 'fp') s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (rad - 0.8).toFixed(1) + '" style="fill:none;stroke:var(--signal);stroke-width:1.6"/>';
            else if (c === 'fn') s += '<rect x="' + (cx - rad).toFixed(1) + '" y="' + (cy - rad).toFixed(1) + '" width="' + (2 * rad).toFixed(1) + '" height="' + (2 * rad).toFixed(1) + '" style="fill:var(--fg)"/>';
            else s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (rad * 0.55).toFixed(1) + '" style="fill:var(--muted)"/>';
          }
        });
        return s + '</svg>';
      }
      function legend(r) {
        var sm = r.sim;
        return '<ul class="bt-legend">' +
          '<li><span class="bt-k bt-tp" aria-hidden="true"></span>has it, tests + <b>' + sm.tp + '</b></li>' +
          '<li><span class="bt-k bt-fp" aria-hidden="true"></span>does not, tests + <b>' + sm.fp + '</b></li>' +
          '<li><span class="bt-k bt-fn" aria-hidden="true"></span>has it, tests − <b>' + sm.fn + '</b></li>' +
          '<li><span class="bt-k bt-tn" aria-hidden="true"></span>does not, tests − <b>' + sm.tn + '</b></li></ul>';
      }
      function describe(v) {
        var r = run(v), sm = r.sim;
        return 'Base rate ' + pc(r.prev) + ', sensitivity ' + pc(r.sens) + ', specificity ' + pc(r.spec) + '. Exact, per 10,000 people: ' + n(r.has) +
          ' have the condition and ' + n(r.tp) + ' of them test positive; ' + n(r.no) + ' do not and ' + n(r.fp) + ' of them test positive. P(condition | positive) = ' +
          n(r.tp) + ' / ' + n(r.tp + r.fp) + ' = ' + pc(r.post) + '. Simulated population of 1,000 (seed ' + seed + '): ' + sm.tp + ' true positives and ' + sm.fp +
          ' false positives, so ' + (sm.post == null ? 'no positives at all' : sm.tp + ' / ' + (sm.tp + sm.fp) + ' = ' + pc(sm.post)) + ' of its positives have the condition.';
      }
      var ex = L.explorable(el, {
        seed: seed,
        label: 'Natural-frequency tree for 10,000 people (exact) and a simulated population of 1,000 people grouped by condition and test result',
        params: [
          { id: 'prev', label: 'Base rate (prevalence)', min: 0, max: PREV.length - 1, step: 1, value: 2,
            format: function (v) { return PREV[v] + '%'; }, valuetext: function (v) { return PREV[v] + ' percent have the condition'; } },
          { id: 'sens', label: 'Sensitivity P(+ | has it)', min: 50, max: 99, step: 1, value: 90,
            format: function (v) { return v + '%'; }, valuetext: function (v) { return 'sensitivity ' + v + ' percent'; } },
          { id: 'spec', label: 'Specificity P(− | does not)', min: 0, max: SPEC.length - 1, step: 1, value: 6,
            format: function (v) { return SPEC[v] + '%'; }, valuetext: function (v) { return 'specificity ' + SPEC[v] + ' percent'; } },
        ],
        render: function (v, rng, W) {
          var r = run(v), u = stream(), cls = [];
          for (var i = 0; i < SIM; i++) { var h = u[2 * i] < r.prev, pos = h ? u[2 * i + 1] < r.sens : u[2 * i + 1] < 1 - r.spec; cls.push(h ? (pos ? 'tp' : 'fn') : (pos ? 'fp' : 'tn')); }
          var wrap = document.createElement('div');
          wrap.innerHTML =
            '<p class="bt-h">Exact: natural frequencies for 10,000 people</p>' + tree(r, W) +
            '<p class="bt-answer">Of the <b>' + n(r.tp + r.fp) + '</b> people who test positive, <b>' + n(r.tp) + '</b> have the condition: P(condition | +) = <b>' + pc(r.post) + '</b></p>' +
            '<p class="bt-h">Simulated: one population of 1,000 people (seed ' + seed + ')</p>' + icons(r, cls, W) + legend(r) +
            '<p class="bt-answer">In this simulated population: ' + (r.sim.post == null ? 'nobody tested positive.' : '<b>' + r.sim.tp + '</b> of <b>' + (r.sim.tp + r.sim.fp) + '</b> positives have the condition = <b>' + pc(r.sim.post) + '</b>.') + '</p>';
          return wrap;
        },
        describe: describe,
      });
      var row = document.createElement('div'); row.className = 'lc-ex-check';
      var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'New seed';
      var lab = document.createElement('p'); lab.className = 'lc-ex-fb'; lab.textContent = 'Seed ' + seed;
      btn.addEventListener('click', function () { seed += 1; lab.textContent = 'Seed ' + seed; ex.update(); L.announce(describe(ex.values)); });
      row.append(btn, lab); el.appendChild(row);
      return ex;
    },
  });
})();
