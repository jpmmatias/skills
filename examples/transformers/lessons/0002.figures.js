// Lesson 2 figures. Two components, both computed for real from ILLUSTRATIVE toy vectors (chosen by hand,
// labelled "toy numbers" on the page; a trained model learns its own):
//   <div data-lc="attention-explorer" data-query="4"></div>
//       Scaled dot-product attention for one query over a 7-token sentence:
//       weights = softmax(q·k / (√d_k · τ)), output = Σ weight × value. The learner picks the query token,
//       switches the causal mask, and changes τ (an exploration knob: real attention has τ = 1).
//       Values are 2-D so the output can be drawn as a point: a weighted average of the value points.
//   <div data-lc="mask-grid" data-highlight="4"></div>
//       The causal mask as a grid: row = query position, column = key position, filled = allowed.
// Deterministic (no randomness), keyboard-operable (range inputs), text alternatives from the same data.
(function () {
  'use strict';
  var L = window.Learncraft, esc = L.esc;

  // Toy sentence and vectors (d_k = 4, d_v = 2). Same numbers as the table in the lesson.
  var TOKENS = ['The', 'cat', 'sat', 'because', 'it', 'was', 'tired'];
  var Q = [[1, 0, 0, 0], [0, 0, 1, 0], [2, 0, 0, 0], [0, 2, 0, 0], [2, 0, 0, 0.5], [0, 0, 0, 2], [1.5, 0, 0, 1]];
  var K = [[0, 0, 1, 0], [2, 0, 0, 0], [0, 2, 0, 0], [0, 0, 1, 0], [0.5, 0, 0, 1.5], [0, 1, 0.5, 0], [0.5, 1, 0, 0]];
  var Vv = [[0.1, 0.1], [0.9, 0.8], [0.2, -0.8], [-0.6, 0.1], [-0.2, 0.7], [-0.8, -0.5], [0.6, -0.4]];
  var TAUS = [0.25, 0.5, 1, 2, 4];
  var DK = 4;

  function attend(qi, masked, tau) {
    var scores = K.map(function (k, j) {
      if (masked && j > qi) return null;
      var dot = 0; for (var c = 0; c < DK; c++) dot += Q[qi][c] * k[c];
      return dot / (Math.sqrt(DK) * tau);
    });
    var live = scores.filter(function (s) { return s !== null; }), m = Math.max.apply(null, live);
    var ex = scores.map(function (s) { return s === null ? 0 : Math.exp(s - m); });
    var z = ex.reduce(function (a, b) { return a + b; }, 0);
    var w = ex.map(function (e) { return e / z; });
    var out = [0, 1].map(function (d) { return w.reduce(function (a, wj, j) { return a + wj * Vv[j][d]; }, 0); });
    return { scores: scores, w: w, out: out };
  }
  var f2 = function (v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(2); };
  L.transformersToy = { tokens: TOKENS, Q: Q, K: K, V: Vv, attend: attend };

  // ---------- attention explorer ----------
  function weightsPanel(r, qi, W, x0, y0) {
    var row = 30, labW = 74, scW = 52, barX = x0 + labW + scW + 8, barW = Math.max(60, W - (barX - x0) - 58);
    var s = '<text class="dg-cap" x="' + x0 + '" y="' + (y0 + 12) + '">key</text>' +
      '<text class="dg-cap" x="' + (x0 + labW + scW) + '" y="' + (y0 + 12) + '" text-anchor="end">score</text>' +
      '<text class="dg-cap" x="' + barX + '" y="' + (y0 + 12) + '">weight</text>';
    var top = r.w.indexOf(Math.max.apply(null, r.w));
    TOKENS.forEach(function (t, j) {
      var y = y0 + 22 + j * row, off = r.scores[j] === null;
      var lab = t + (j === qi ? ' ◂' : '');
      s += '<g' + (off ? ' class="dim"' : '') + '>' +
        '<text class="dg-lab" x="' + x0 + '" y="' + (y + 16) + '"' + (j === qi ? ' style="font-weight:700"' : '') + '>' + esc(lab) + '</text>' +
        '<text class="dg-num" x="' + (x0 + labW + scW) + '" y="' + (y + 16) + '" text-anchor="end">' + (off ? '−∞' : f2(r.scores[j])) + '</text>' +
        '<rect class="dg-track" x="' + barX + '" y="' + (y + 3) + '" width="' + barW + '" height="18"/>' +
        (off ? '' : '<rect class="' + (j === top ? 'dg-win' : 'dg-bar') + '" x="' + barX + '" y="' + (y + 3) + '" width="' + (barW * r.w[j]).toFixed(1) + '" height="18"/>') +
        '<text class="dg-num" x="' + (barX + barW + 6) + '" y="' + (y + 16) + '">' + (off ? 'masked' : r.w[j].toFixed(2)) + '</text></g>';
    });
    return { svg: s, h: 22 + TOKENS.length * row };
  }
  function planePanel(r, size, x0, y0) {
    var pad = 18, span = size - 2 * pad, cx = function (v) { return x0 + pad + (v + 1) / 2 * span; }, cy = function (v) { return y0 + pad + (1 - v) / 2 * span; };
    var s = '<rect class="dg-track" x="' + (x0 + pad) + '" y="' + (y0 + pad) + '" width="' + span + '" height="' + span + '" style="fill-opacity:.5"/>' +
      '<line class="dg-grid" x1="' + cx(-1) + '" x2="' + cx(1) + '" y1="' + cy(0) + '" y2="' + cy(0) + '"/>' +
      '<line class="dg-grid" x1="' + cx(0) + '" x2="' + cx(0) + '" y1="' + cy(-1) + '" y2="' + cy(1) + '"/>' +
      '<text class="dg-cap" x="' + (x0 + pad) + '" y="' + (y0 + 10) + '">value vectors (toy, 2-D) and the output</text>';
    var out = r.out;
    Vv.forEach(function (v, j) {
      var off = r.scores[j] === null, rad = off ? 3 : 3 + 9 * Math.sqrt(r.w[j]);
      s += '<line x1="' + cx(out[0]).toFixed(1) + '" y1="' + cy(out[1]).toFixed(1) + '" x2="' + cx(v[0]).toFixed(1) + '" y2="' + cy(v[1]).toFixed(1) + '" style="stroke:var(--muted);stroke-width:' + (off ? 0 : (0.5 + 3 * r.w[j]).toFixed(2)) + ';stroke-opacity:.55"/>';
      s += '<g' + (off ? ' class="dim"' : '') + '><circle cx="' + cx(v[0]).toFixed(1) + '" cy="' + cy(v[1]).toFixed(1) + '" r="' + rad.toFixed(1) + '" style="fill:' + (off ? 'none' : 'var(--muted)') + ';fill-opacity:.35;stroke:var(--muted);stroke-width:1.2"/>' +
        (v[0] > 0.3 ? '<text class="dg-lab" x="' + (cx(v[0]) - rad - 3).toFixed(1) + '" y="' + (cy(v[1]) + 4).toFixed(1) + '" text-anchor="end">'
                    : '<text class="dg-lab" x="' + (cx(v[0]) + rad + 3).toFixed(1) + '" y="' + (cy(v[1]) + 4).toFixed(1) + '">') + esc(TOKENS[j]) + '</text></g>';
    });
    var ox = cx(out[0]), oy = cy(out[1]);
    s += '<path d="M' + (ox - 7) + ',' + oy + ' L' + ox + ',' + (oy - 7) + ' L' + (ox + 7) + ',' + oy + ' L' + ox + ',' + (oy + 7) + ' Z" class="dg-win" style="stroke:var(--bg);stroke-width:1.5"/>' +
      '<text class="dg-mt" x="' + ox.toFixed(1) + '" y="' + (oy + 22).toFixed(1) + '" text-anchor="middle">output</text>';
    return s;
  }

  L.register('attention-explorer', {
    mount: function (el, ctx) {
      var q0 = +(el.getAttribute('data-query') || 4);
      return L.explorable(el, {
        seed: 1,
        label: 'Scaled dot-product attention on a toy sentence',
        params: [
          { id: 'q', label: 'Query token', min: 0, max: TOKENS.length - 1, step: 1, value: q0,
            format: function (v) { return '“' + TOKENS[v] + '” (position ' + v + ')'; }, valuetext: function (v) { return TOKENS[v] + ', position ' + v; } },
          { id: 'mask', label: 'Causal mask', min: 0, max: 1, step: 1, value: 1,
            format: function (v) { return v ? 'on (decoder)' : 'off'; }, valuetext: function (v) { return v ? 'on' : 'off'; } },
          { id: 't', label: 'Sharpness τ (exploration only; real attention uses 1)', min: 0, max: TAUS.length - 1, step: 1, value: 2,
            format: function (v) { return 'τ = ' + TAUS[v]; }, valuetext: function (v) { return 'tau ' + TAUS[v]; } },
        ],
        render: function (vals, rng, width) {
          var r = attend(vals.q, !!vals.mask, TAUS[vals.t]);
          var wide = width >= 600, W = width;
          if (wide) {
            var leftW = Math.round(W * 0.56), size = Math.min(W - leftW - 16, 300);
            var a = weightsPanel(r, vals.q, leftW, 0, 0), H = Math.max(a.h, size) + 22;
            return '<svg class="dg" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + a.svg + planePanel(r, size, leftW + 16, 0) +
              '<text class="dg-cap" x="0" y="' + (H - 4) + '">toy numbers, chosen by hand; weights and output computed live</text></svg>';
          }
          var b = weightsPanel(r, vals.q, W, 0, 0), sz = Math.min(W, 320), H2 = b.h + 12 + sz + 22;
          return '<svg class="dg" viewBox="0 0 ' + W + ' ' + H2 + '" aria-hidden="true">' + b.svg + planePanel(r, sz, (W - sz) / 2, b.h + 12) +
            '<text class="dg-cap" x="0" y="' + (H2 - 4) + '">toy numbers, chosen by hand; computed live</text></svg>';
        },
        describe: function (vals) {
          var r = attend(vals.q, !!vals.mask, TAUS[vals.t]);
          var seen = [], hidden = [];
          TOKENS.forEach(function (t, j) { if (r.scores[j] === null) hidden.push(t); else seen.push(t + ' ' + r.w[j].toFixed(2)); });
          var top = TOKENS[r.w.indexOf(Math.max.apply(null, r.w))];
          return 'Query “' + TOKENS[vals.q] + '”, mask ' + (vals.mask ? 'on' : 'off') + ', τ = ' + TAUS[vals.t] + '. Weights: ' + seen.join(', ') +
            (hidden.length ? '. Masked: ' + hidden.join(', ') : '') + '. Output (' + f2(r.out[0]) + ', ' + f2(r.out[1]) + '), pulled most toward “' + top + '”.';
        },
      }, ctx);
    },
  });

  // ---------- causal mask grid ----------
  L.register('mask-grid', {
    mount: function (el) {
      var hi = el.hasAttribute('data-highlight') ? +el.getAttribute('data-highlight') : -1, n = TOKENS.length;
      var W = L.viz.width(el), labW = 64, cell = Math.min(36, Math.floor((Math.min(W, 420) - labW - 8) / n)), top = 66;
      var H = top + n * cell + 26, s = '<svg class="dg" viewBox="0 0 ' + (labW + n * cell + 8) + ' ' + H + '" style="max-width:' + (labW + n * cell + 8) + 'px" role="img" aria-label="' +
        esc('Causal mask for the 7-token sentence. Row = query position, column = key position. Each token may attend to itself and every earlier token; all later tokens are masked.' +
          (hi >= 0 ? ' Highlighted: “' + TOKENS[hi] + '” sees ' + TOKENS.slice(0, hi + 1).join(', ') + '.' : '')) + '">';
      s += '<text class="dg-cap" x="' + (labW + n * cell) + '" y="12" text-anchor="end">key position →</text>';
      TOKENS.forEach(function (t, j) {
        var x = labW + j * cell + cell / 2;
        s += '<text class="dg-lab" transform="translate(' + (x + 4) + ',' + (top - 6) + ') rotate(-50)">' + esc(t) + '</text>';
      });
      TOKENS.forEach(function (t, i) {
        var y = top + i * cell;
        s += '<text class="dg-lab" x="' + (labW - 6) + '" y="' + (y + cell / 2 + 4) + '" text-anchor="end"' + (i === hi ? ' style="font-weight:700"' : '') + '>' + esc(t) + '</text>';
        for (var j = 0; j < n; j++) {
          var ok = j <= i, cls = ok ? (i === hi ? 'dg-win' : 'dg-bar') : 'dg-track';
          s += '<rect class="' + cls + '" x="' + (labW + j * cell + 1) + '" y="' + (y + 1) + '" width="' + (cell - 2) + '" height="' + (cell - 2) + '"' + (ok && i !== hi ? ' style="fill-opacity:.45"' : '') + '/>';
        }
      });
      s += '<text class="dg-cap" x="0" y="' + (H - 6) + '">↓ query position · filled = may attend</text></svg>';
      el.innerHTML = s;
    },
  });
})();
