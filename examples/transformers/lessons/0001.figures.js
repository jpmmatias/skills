// Lesson 1 figures: the sinusoidal positional-encoding explorable.
//   <div data-lc="pe-explorer" data-dims="16" data-max="60" data-pos="3"></div>
// Values are computed from the formula of the original Transformer (S7, as reproduced in S8):
//   PE(pos, 2i) = sin(pos / 10000^(2i/d)),  PE(pos, 2i+1) = cos(pos / 10000^(2i/d))
// with a toy width d (16 here; the original model used 512). Nothing is illustrative except the width.
// Built on Learncraft.explorable: deterministic, keyboard-operable range input, text alternative from describe().
(function () {
  'use strict';
  var L = window.Learncraft, V = L.viz;

  function pe(pos, d) {
    var out = [];
    for (var k = 0; k < d; k++) {
      var i = Math.floor(k / 2), angle = pos / Math.pow(10000, (2 * i) / d);
      out.push(k % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
    }
    return out;
  }
  var wavelength = function (i, d) { return 2 * Math.PI * Math.pow(10000, (2 * i) / d); };
  var f2 = function (v) { var m = Math.abs(v), t = m === 0 ? '0' : m < 0.01 ? m.toPrecision(1) : m.toFixed(2); return (v < 0 && t !== '0' ? '−' : '') + t; };

  L.register('pe-explorer', {
    mount: function (el, ctx) {
      var d = +(el.getAttribute('data-dims') || 16), max = +(el.getAttribute('data-max') || 60), start = +(el.getAttribute('data-pos') || 0);
      return L.explorable(el, {
        seed: 1,
        label: 'Sinusoidal positional encoding with a toy width of ' + d + ' dimensions',
        params: [
          { id: 'pos', label: 'Position', min: 0, max: max, step: 1, value: start,
            format: function (v) { return String(v); }, valuetext: function (v) { return 'position ' + v + ' of ' + max; } },
        ],
        render: function (vals, rng, width) {
          var a = pe(vals.pos, d), b = pe(vals.pos + 1, d);
          var W = width, left = 34, right = 8, top = 22, ph = 150, H = top + ph + 44;
          var cw = (W - left - right) / d, y0 = top + ph / 2, sy = ph / 2 - 4;
          var y = function (v) { return y0 - v * sy; };
          var s = '<svg class="dg" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
          [1, 0, -1].forEach(function (t) {
            s += '<line class="' + (t === 0 ? 'dg-axis' : 'dg-grid') + '" x1="' + left + '" x2="' + (W - right) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' +
              '<text class="dg-num" x="' + (left - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + (t < 0 ? '−1' : t) + '</text>';
          });
          s += '<text class="dg-cap" x="' + left + '" y="12">value · filled: position ' + vals.pos + ' · outline: position ' + (vals.pos + 1) + '</text>';
          var every = cw < 22 ? 2 : 1;
          for (var k = 0; k < d; k++) {
            var x = left + k * cw, bw = Math.max(2, cw * 0.62), bx = x + (cw - bw) / 2;
            var ya = y(Math.max(0, a[k])), ha = Math.abs(y(a[k]) - y0);
            var yb = y(Math.max(0, b[k])), hb = Math.abs(y(b[k]) - y0);
            s += '<rect class="dg-win" x="' + bx.toFixed(1) + '" y="' + ya.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0.5, ha).toFixed(1) + '"/>';
            s += '<rect x="' + bx.toFixed(1) + '" y="' + yb.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0.5, hb).toFixed(1) + '" style="fill:none;stroke:var(--fg);stroke-width:1.2;stroke-dasharray:3 2"/>';
            if (k % every === 0) s += '<text class="dg-num" x="' + (x + cw / 2).toFixed(1) + '" y="' + (top + ph + 16) + '" text-anchor="middle">' + k + '</text>';
          }
          s += '<text class="dg-cap" x="' + left + '" y="' + (H - 4) + '">dimension → (low: changes fast · high: changes slowly)</text>';
          return s + '</svg>';
        },
        describe: function (vals) {
          var a = pe(vals.pos, d), b = pe(vals.pos + 1, d);
          return 'Position ' + vals.pos + '. Dimension 0 is ' + f2(a[0]) + ' and changes by ' + f2(b[0] - a[0]) + ' at the next position (wavelength ' +
            wavelength(0, d).toFixed(1) + ' positions). Dimension ' + (d - 2) + ' is ' + f2(a[d - 2]) + ' and changes by ' + f2(b[d - 2] - a[d - 2]) +
            ' (wavelength about ' + Math.round(wavelength(d / 2 - 1, d)).toLocaleString('en') + ' positions).';
        },
      }, ctx);
    },
  });
})();
