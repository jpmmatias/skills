// Lesson 3 figures: the temperature explorable.
//   <div data-lc="temp-explorer" data-t="1"></div>
// Five ILLUSTRATIVE logits for the token after "The cat sat on the" (labelled on the page). Probabilities are
// computed for real: p_i = softmax(logit_i / T), as in GPT-2's sample.py and nanoGPT's generate() (S5, S13).
// T = 0 is drawn as greedy decoding (all probability on the top token), the limit of T → 0.
(function () {
  'use strict';
  var L = window.Learncraft, esc = L.esc;
  var TOK = ['␣mat', '␣floor', '␣sofa', '␣bed', '␣roof'];
  var LOGIT = [3.0, 2.2, 1.8, 1.5, 0.5];

  function probs(T) {
    if (T <= 0) return LOGIT.map(function (v, i) { return i === 0 ? 1 : 0; });
    var m = Math.max.apply(null, LOGIT), e = LOGIT.map(function (v) { return Math.exp((v - m) / T); });
    var z = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (v) { return v / z; });
  }
  var fmtT = function (T) { return T === 0 ? '0 (greedy)' : T.toFixed(2); };

  L.register('temp-explorer', {
    mount: function (el, ctx) {
      var t0 = el.hasAttribute('data-t') ? +el.getAttribute('data-t') : 1;
      return L.explorable(el, {
        seed: 1,
        label: 'Next-token probabilities after “The cat sat on the” at different temperatures, from illustrative logits',
        params: [
          { id: 'T', label: 'Temperature T', min: 0, max: 2, step: 0.05, value: t0, format: fmtT, valuetext: function (v) { return 'temperature ' + fmtT(v); } },
        ],
        render: function (vals, rng, width) {
          var p = probs(vals.T), W = width, row = 34, labW = 64, lgW = 44, x0 = labW + lgW + 12, x1 = W - 52, top = 22, H = top + LOGIT.length * row + 24;
          var s = '<svg class="dg" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
            '<text class="dg-cap" x="' + (labW + lgW) + '" y="12" text-anchor="end">logit</text>' +
            '<text class="dg-cap" x="' + x0 + '" y="12">probability at T = ' + esc(fmtT(vals.T)) + '</text>';
          TOK.forEach(function (t, i) {
            var y = top + i * row;
            s += '<text class="dg-lab" x="' + (labW - 4) + '" y="' + (y + 17) + '" text-anchor="end">' + esc(t) + '</text>' +
              '<text class="dg-num" x="' + (labW + lgW) + '" y="' + (y + 17) + '" text-anchor="end">' + LOGIT[i].toFixed(1) + '</text>' +
              '<rect class="dg-track" x="' + x0 + '" y="' + (y + 2) + '" width="' + (x1 - x0) + '" height="22"/>' +
              '<rect class="' + (i === 0 ? 'dg-win' : 'dg-bar') + '" x="' + x0 + '" y="' + (y + 2) + '" width="' + ((x1 - x0) * p[i]).toFixed(1) + '" height="22"/>' +
              '<text class="dg-num" x="' + (x1 + 6) + '" y="' + (y + 17) + '">' + p[i].toFixed(2) + '</text>';
          });
          s += '<text class="dg-cap" x="0" y="' + (H - 4) + '">illustrative logits · p = softmax(logit ÷ T)</text>';
          return s + '</svg>';
        },
        describe: function (vals) {
          var p = probs(vals.T);
          return 'T = ' + fmtT(vals.T) + ': ' + TOK.map(function (t, i) { return t.replace('␣', '') + ' ' + p[i].toFixed(2); }).join(', ') +
            '. In 10 samples you would expect about ' + (10 * (1 - p[0])).toFixed(1) + ' that are not “mat”.';
        },
      }, ctx);
    },
  });
})();
