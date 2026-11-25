// Lesson 2 figure: "mean-narrowing", an explorable on Learncraft.explorable with its own SVG.
// 1,000 simulated experiments; each rolls a fair die n times and records the mean of its n rolls.
// The histogram of those 1,000 sample means narrows as n grows. Overlays: the EXACT distribution of the
// mean of n dice (computed by convolution, not simulated) as a dashed line, and a bracket at 3.5 ± σ/√n.
// Experiment j uses rolls j·100 … j·100 + n − 1 of a fixed stream per seed, so a bigger n extends the same
// experiments and every seed is reproducible. "New seed" moves to the next seed.
//
//   <div data-lc="mean-narrowing" id="narrowing" data-seed="7"></div>
(function () {
  'use strict';
  var L = window.Learncraft, V = L.viz;
  var NS = [1, 2, 4, 9, 16, 25, 50, 100], M = 1000, MAXN = 100;
  var MU = 3.5, SIGMA = Math.sqrt(35 / 12);                    // fair die: Var = 91/6 − 3.5² = 35/12
  var BW = 0.25, NB = 21;                                      // bins centred on 1, 1.25, …, 6
  var YMAX = 60;                                               // % of experiments; fixed so the narrowing shows

  function bin(m) { return Math.round((m - 1) / BW); }
  function rolls(seed) { var r = L.rng(seed), a = new Uint8Array(M * MAXN); for (var i = 0; i < a.length; i++) a[i] = 1 + Math.floor(r() * 6); return a; }
  // Exact distribution of the sum of n dice, then binned as a mean.
  var exactCache = {};
  function exact(n) {
    if (exactCache[n]) return exactCache[n];
    var d = [1];                                               // d[s] = P(sum of 0 dice = s)
    for (var k = 0; k < n; k++) {
      var nd = new Array(d.length + 6).fill(0);
      for (var s = 0; s < d.length; s++) if (d[s]) for (var f = 1; f <= 6; f++) nd[s + f] += d[s] / 6;
      d = nd;
    }
    var out = new Array(NB).fill(0);
    for (var t = n; t <= 6 * n; t++) out[bin(t / n)] += d[t];
    return (exactCache[n] = out);
  }
  function f2(v) { return v.toFixed(2); }

  L.register('mean-narrowing', {
    mount: function (el) {
      var seed = +(el.getAttribute('data-seed') || 7), cache = {};
      var stream = function () { return cache[seed] || (cache[seed] = rolls(seed)); };
      function run(vals) {
        var n = NS[vals.n], r = stream(), means = new Float64Array(M), counts = new Array(NB).fill(0), sum = 0, ss = 0, within = 0, se = SIGMA / Math.sqrt(n);
        for (var j = 0; j < M; j++) {
          var t = 0; for (var i = 0; i < n; i++) t += r[j * MAXN + i];
          var m = t / n; means[j] = m; counts[bin(m)]++; sum += m;
        }
        var mean = sum / M;
        for (j = 0; j < M; j++) { ss += (means[j] - mean) * (means[j] - mean); if (Math.abs(means[j] - MU) <= se + 1e-9) within++; }
        return { n: n, se: se, counts: counts, mean: mean, sd: Math.sqrt(ss / (M - 1)), within: within / M, exact: exact(n) };
      }
      function svg(r, W) {
        var H = 260, left = 44, right = 12, top = 46, bottom = 40, pw = W - left - right, ph = H - top - bottom;
        var x = function (m) { return left + pw * (m - 0.875) / (6.125 - 0.875); };
        var y = function (v) { return top + ph * (1 - Math.min(v, YMAX) / YMAX); };
        var s = '<svg class="dg" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
        [0, 20, 40, 60].forEach(function (v) {
          s += '<line class="dg-grid" x1="' + left + '" x2="' + (W - right) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '"/>' +
            '<text class="dg-num" x="' + (left - 6) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end">' + v + '%</text>';
        });
        var bw = pw / NB;
        r.counts.forEach(function (c, i) {
          var v = c / M * 100, bx = x(1 + i * BW) - bw / 2;
          if (c) s += '<rect class="dg-bar" x="' + (bx + 1).toFixed(1) + '" y="' + y(v).toFixed(1) + '" width="' + Math.max(1, bw - 2).toFixed(1) + '" height="' + (top + ph - y(v)).toFixed(1) + '"/>';
        });
        s += '<polyline class="dg-expected" points="' + r.exact.map(function (p, i) { return x(1 + i * BW).toFixed(1) + ',' + y(p * 100).toFixed(1); }).join(' ') + '"/>';
        // bracket at μ ± σ/√n, above the plot
        var bx0 = x(Math.max(0.875, MU - r.se)), bx1 = x(Math.min(6.125, MU + r.se)), by = 34;
        s += '<path d="M' + bx0.toFixed(1) + ',' + (by + 6) + ' V' + by + ' H' + bx1.toFixed(1) + ' V' + (by + 6) + '" style="fill:none;stroke:var(--signal);stroke-width:2"/>';
        s += '<line x1="' + x(MU).toFixed(1) + '" x2="' + x(MU).toFixed(1) + '" y1="' + by + '" y2="' + (top + ph) + '" style="stroke:var(--signal);stroke-width:1;stroke-dasharray:2 3"/>';
        s += '<text class="dg-expected-lab" x="' + x(MU).toFixed(1) + '" y="' + (by - 6) + '" text-anchor="middle">3.5 ± σ/√n = 3.5 ± ' + f2(r.se) + '</text>';
        for (var k = 1; k <= 6; k++) s += '<text class="dg-num" x="' + x(k).toFixed(1) + '" y="' + (top + ph + 16) + '" text-anchor="middle">' + k + '</text>';
        s += '<line class="dg-axis" x1="' + left + '" x2="' + (W - right) + '" y1="' + (top + ph) + '" y2="' + (top + ph) + '"/>';
        s += '<text class="dg-cap" x="' + left + '" y="12">% of 1,000 experiments</text>';
        s += '<text class="dg-cap" x="' + (W - right) + '" y="' + (H - 6) + '" text-anchor="end">mean of n rolls →</text>';
        s += '<text class="dg-cap" x="' + (W - right) + '" y="12" text-anchor="end">dashed: exact</text>';
        return s + '</svg>';
      }
      function describe(vals) {
        var r = run(vals);
        return 'Simulated, seed ' + seed + ': 1,000 experiments of n = ' + r.n + ' die rolls each. Their means average ' + f2(r.mean) +
          ' (exact: 3.50) with a standard deviation of ' + r.sd.toFixed(3) + '; the formula σ/√n = 1.708/√' + r.n + ' gives ' + r.se.toFixed(3) +
          '. ' + Math.round(r.within * 100) + '% of the means fall within 3.5 ± ' + f2(r.se) + '.';
      }
      var ex = L.explorable(el, {
        seed: seed,
        label: 'Simulation: histogram of 1,000 sample means of n die rolls, with the exact distribution and a bracket at 3.5 plus or minus sigma over root n',
        params: [
          { id: 'n', label: 'Rolls per experiment n', min: 0, max: NS.length - 1, step: 1, value: 2,
            format: function (v) { return String(NS[v]); }, valuetext: function (v) { return 'n = ' + NS[v] + ' rolls'; } },
        ],
        render: function (vals, rng, width) { return svg(run(vals), width); },
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
