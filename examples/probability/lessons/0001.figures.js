// Lesson 1 figure: "pmf-sampler", an explorable on Learncraft.explorable + Learncraft.histogram.
// X = number of successes in 5 independent trials, each a success with probability p (a binomial PMF).
// The learner sets p and the number of simulated draws n. Each draw turns ONE uniform number u into a value
// by walking the PMF's cumulative sum (the sampler the lesson teaches), so the histogram is a real simulation.
// The uniform stream is fixed per seed, so a bigger n extends the same sample and every seed is reproducible;
// "New seed" moves to the next seed.
//
//   <div data-lc="pmf-sampler" id="sampler" data-seed="7"></div>
(function () {
  'use strict';
  var L = window.Learncraft, V = L.viz;
  var K = 5;                                                     // trials per draw
  var SIZES = [10, 30, 100, 300, 1000, 3000, 10000];
  var MAXN = SIZES[SIZES.length - 1];
  var VALUES = [0, 1, 2, 3, 4, 5];

  function choose(n, k) { var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
  function pmf(p) { return VALUES.map(function (k) { return choose(K, k) * Math.pow(p, k) * Math.pow(1 - p, K - k); }); }
  // The inverse-CDF sampler from the lesson: the first value whose running total exceeds u.
  function sample(probs, u) {
    var c = 0;
    for (var k = 0; k < probs.length; k++) { c += probs[k]; if (u < c) return k; }
    return probs.length - 1;                                     // u within rounding of 1
  }
  function uniforms(seed) { var r = L.rng(seed), a = new Float64Array(MAXN); for (var i = 0; i < MAXN; i++) a[i] = r(); return a; }
  function pct(v, d) { return (v * 100).toFixed(d == null ? 1 : d) + '%'; }
  function fmtN(n) { return n.toLocaleString('en-US'); }

  // Running share of draws equal to `target`, on a log-scaled x axis (draw 1 … n).
  function runningChart(xs, target, prob, n, w) {
    var H = 170, left = 44, right = 12, top = 22, bottom = 40, pw = w - left - right, ph = H - top - bottom;
    var lx = function (i) { return left + pw * Math.log10(i) / Math.log10(n); };
    var y = function (v) { return top + ph * (1 - v); };
    var s = '<svg class="dg" viewBox="0 0 ' + w + ' ' + H + '" aria-hidden="true">';
    [0, 0.5, 1].forEach(function (v) {
      s += '<line class="dg-grid" x1="' + left + '" x2="' + (w - right) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '"/>' +
        '<text class="dg-num" x="' + (left - 6) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end">' + (v * 100) + '%</text>';
    });
    var hits = 0, pts = [], next = 1;
    for (var i = 1; i <= n; i++) {
      if (xs[i - 1] === target) hits++;
      if (i >= next || i === n) { pts.push(lx(i).toFixed(1) + ',' + y(hits / i).toFixed(1)); next = Math.max(i + 1, Math.ceil(i * 1.06)); }
    }
    s += '<line class="dg-expected" x1="' + left + '" x2="' + (w - right) + '" y1="' + y(prob).toFixed(1) + '" y2="' + y(prob).toFixed(1) + '"/>';
    s += '<polyline points="' + pts.join(' ') + '" style="fill:none;stroke:var(--fg);stroke-width:1.6"/>';
    var ticks = [1, 10, 100, 1000, 10000].filter(function (t) { return t <= n; });
    ticks.forEach(function (t) { s += '<text class="dg-num" x="' + lx(Math.max(t, 1)).toFixed(1) + '" y="' + (top + ph + 16) + '" text-anchor="middle">' + fmtN(t) + '</text>'; });
    s += '<line class="dg-axis" x1="' + left + '" x2="' + (w - right) + '" y1="' + (top + ph) + '" y2="' + (top + ph) + '"/>';
    s += '<text class="dg-cap" x="' + left + '" y="12">share so far with X = ' + target + '</text>';
    // key in the top-right corner, on the title row, so it never collides with the line
    var key = 'P(X = ' + target + ') = ' + pct(prob), kx = w - right - key.length * 7;
    s += '<line class="dg-expected" x1="' + (kx - 30).toFixed(1) + '" x2="' + (kx - 6).toFixed(1) + '" y1="8" y2="8"/>' +
      '<text class="dg-expected-lab" x="' + (w - right) + '" y="12" text-anchor="end">' + key + '</text>';
    s += '<text class="dg-cap" x="' + (w - right) + '" y="' + (H - 6) + '" text-anchor="end">draws (log scale) →</text>';
    return s + '</svg>';
  }

  L.register('pmf-sampler', {
    mount: function (el) {
      var seed = +(el.getAttribute('data-seed') || 7), cache = {};
      var stream = function () { return cache[seed] || (cache[seed] = uniforms(seed)); };
      function run(vals) {
        var p = vals.p / 100, n = SIZES[vals.n], probs = pmf(p), u = stream(), xs = new Array(n), counts = VALUES.map(function () { return 0; });
        for (var i = 0; i < n; i++) { xs[i] = sample(probs, u[i]); counts[xs[i]]++; }
        var shares = counts.map(function (c) { return c / n; });
        var gap = 0, at = 0; shares.forEach(function (s, k) { var d = Math.abs(s - probs[k]); if (d > gap) { gap = d; at = k; } });
        var mode = probs.indexOf(Math.max.apply(null, probs));
        return { p: p, n: n, probs: probs, xs: xs, shares: shares, counts: counts, gap: gap, at: at, mode: mode };
      }
      var ex = L.explorable(el, {
        seed: seed,
        label: 'Simulation: histogram of X, the number of successes in 5 trials, against its PMF, and the running share of the most likely value',
        params: [
          { id: 'p', label: 'Success probability p per trial', min: 5, max: 95, step: 5, value: 30,
            format: function (v) { return (v / 100).toFixed(2); }, valuetext: function (v) { return 'p = ' + (v / 100).toFixed(2); } },
          { id: 'n', label: 'Simulated draws n', min: 0, max: SIZES.length - 1, step: 1, value: 1,
            format: function (v) { return fmtN(SIZES[v]); }, valuetext: function (v) { return fmtN(SIZES[v]) + ' draws'; } },
        ],
        render: function (vals, rng, width) {
          var r = run(vals);
          return L.histogram({
            counts: r.shares.map(function (v) { return v * 100; }), expected: r.probs.map(function (v) { return v * 100; }), labels: VALUES,
            width: width, height: 220, xLabel: 'X = successes in 5 trials →', yLabel: '% of draws', expectedLabel: 'PMF',
          }) + runningChart(r.xs, r.mode, r.probs[r.mode], r.n, width);
        },
        describe: describe,
      });
      function describe(vals) {
          var r = run(vals);
          return 'Simulated, seed ' + seed + ': ' + fmtN(r.n) + ' draws with p = ' + r.p.toFixed(2) + '. Observed vs PMF: ' +
            VALUES.map(function (k) { return 'X=' + k + ' ' + pct(r.shares[k]) + ' vs ' + pct(r.probs[k]); }).join('; ') +
            '. Largest gap: ' + (r.gap * 100).toFixed(1) + ' percentage points, at X = ' + r.at + '. Share of draws with X = ' + r.mode +
            ' after all ' + fmtN(r.n) + ' draws: ' + pct(r.shares[r.mode]) + ' (PMF ' + pct(r.probs[r.mode]) + ').';
      }
      // "New seed": the next seed, so a run is always reproducible by its number.
      var row = document.createElement('div'); row.className = 'lc-ex-check';
      var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'New seed';
      var lab = document.createElement('p'); lab.className = 'lc-ex-fb'; lab.textContent = 'Seed ' + seed;
      btn.addEventListener('click', function () {
        seed += 1; lab.textContent = 'Seed ' + seed; ex.update();
        L.announce(describe(ex.values));
      });
      row.append(btn, lab); el.appendChild(row);
      return ex;
    },
  });
})();
