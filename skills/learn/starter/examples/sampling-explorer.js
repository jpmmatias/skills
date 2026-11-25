// Example: an explorable built on Learncraft.explorable + Learncraft.histogram (probability).
// "Roll two dice n times": the histogram of the sums converges to the triangular distribution as n grows.
// The learner changes the sample size and the run, and watches the gap to the expected shares shrink.
// Simulated, and labelled as simulated: the rolls come from a seeded generator, so the same seed and run
// always draw the same rolls (screenshots, feedback and the check are reproducible).
//
//   <div data-lc="sampling-explorer" data-seed="7" [data-target="2"]></div>
//   <script src="../assets/core.js"></script> <script src="../assets/viz.js"></script> <script src="sampling-explorer.js"></script>
//
// With data-target (percentage points), a Check button asks for the smallest listed sample size at which
// every bar is within that many points of its expected share, for the current run.
(function () {
  'use strict';
  var L = window.Learncraft, V = L.viz;
  var SIZES = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  var SUMS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  var EXPECTED = SUMS.map(function (s) { return (6 - Math.abs(7 - s)) / 36; });

  // Rolls for one run: the first n of a fixed stream, so a bigger n extends the same sample.
  function rolls(seed, run) {
    var rng = L.rng(seed * 1000 + run), out = [];
    for (var i = 0; i < SIZES[SIZES.length - 1]; i++) out.push(V.int(rng, 1, 6) + V.int(rng, 1, 6));
    return out;
  }
  function shares(r, n) {
    var c = SUMS.map(function () { return 0; });
    for (var i = 0; i < n; i++) c[r[i] - 2]++;
    return c.map(function (k) { return k / n; });
  }
  function gap(sh) {
    var g = 0, at = 0;
    sh.forEach(function (v, i) { var d = Math.abs(v - EXPECTED[i]); if (d > g) { g = d; at = SUMS[i]; } });
    return { pts: g * 100, at: at };
  }

  L.register('sampling-explorer', {
    mount: function (el, ctx) {
      var seed = +(el.getAttribute('data-seed') || 7), target = el.hasAttribute('data-target') ? +el.getAttribute('data-target') : null;
      var cache = {};
      var get = function (run) { return cache[run] || (cache[run] = rolls(seed, run)); };
      var label = function (v) { return SIZES[v] + ' rolls'; };
      return L.explorable(el, {
        seed: seed,
        label: 'Histogram of the sum of two dice, simulated, against the expected shares',
        params: [
          { id: 'n', label: 'Sample size', min: 0, max: SIZES.length - 1, step: 1, value: 1, format: label, valuetext: label },
          { id: 'run', label: 'Run', min: 1, max: 10, step: 1, value: 1, format: function (v) { return '#' + v; }, valuetext: function (v) { return 'run ' + v + ' of 10'; } },
        ],
        render: function (vals, rng, width) {
          var n = SIZES[vals.n], sh = shares(get(vals.run), n);
          return L.histogram({
            counts: sh.map(function (v) { return v * 100; }), expected: EXPECTED.map(function (v) { return v * 100; }), labels: SUMS,
            width: width, height: 230, xLabel: 'sum of two dice →', yLabel: '% of rolls', expectedLabel: 'expected',
          });
        },
        describe: function (vals) {
          var n = SIZES[vals.n], g = gap(shares(get(vals.run), n));
          return n + ' simulated rolls (run ' + vals.run + '). Largest gap from the expected share: ' + g.pts.toFixed(1) + ' percentage points, at a sum of ' + g.at + '.';
        },
        target: target == null ? null : {
          id: el.id || 'sampling-explorer', label: 'Check this sample size',
          check: function (vals) {
            var r = get(vals.run), ok = function (i) { return gap(shares(r, SIZES[i])).pts <= target; };
            var best = -1; for (var i = 0; i < SIZES.length; i++) if (ok(i) && SIZES.slice(i).every(function (s, j) { return ok(i + j); })) { best = i; break; }
            if (best < 0) return { ok: false, msg: 'None of these sizes stays within ' + target + ' points for run ' + vals.run + '.' };
            if (vals.n === best) return { ok: true, msg: SIZES[best] + ' rolls is the smallest size here that stays within ' + target + ' points, for run ' + vals.run + '.' };
            if (!ok(vals.n)) return { ok: false, msg: 'At ' + SIZES[vals.n] + ' rolls one bar is still ' + gap(shares(r, SIZES[vals.n])).pts.toFixed(1) + ' points off. Try more rolls.' };
            return { ok: false, msg: SIZES[vals.n] + ' rolls is close enough, but a smaller size also stays within ' + target + ' points. Try fewer.' };
          },
        },
      }, ctx);
    },
  });
})();
