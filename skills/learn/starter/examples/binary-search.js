// Example: a bespoke stepped animation built directly on Learncraft.timeline (data structures / algorithms).
// Binary search on a sorted array: each chapter is one comparison. lo, mid and hi move, the compared cell
// is signalled, and the half that can't hold the target fades. Everything is derived from the data, so the
// trace is exact, deterministic and needs no "illustrative" label.
//
//   <div data-lc="binary-search" data-values="2,5,8,12,16,23,38,56,72,91,95,99" data-target="56"></div>
//   <script src="../assets/core.js"></script> <script src="../assets/viz.js"></script> <script src="binary-search.js"></script>
//
// Pattern to copy for any "algorithm step by step" figure:
//   1. compute the trace from the data first (pure function, no DOM);
//   2. one timeline chapter per step, caption = what happened and why;
//   3. onSeek(t, info) sets ABSOLUTE state from (chapter, progress), so scrub/back/reduced motion all work;
//   4. lay the SVG out at the container width (Learncraft.viz.width) so 12-13px text stays readable on phones;
//   5. poster = the final frame, which must make sense on its own.
(function () {
  'use strict';
  var L = window.Learncraft, V = L.viz;

  function trace(a, target) {
    var lo = 0, hi = a.length - 1, steps = [];
    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2), v = a[mid], s = { lo: lo, hi: hi, mid: mid, v: v };
      if (v === target) { s.found = true; steps.push(s); return steps; }
      if (v < target) { s.next = [mid + 1, hi]; s.why = 'a[' + mid + '] = ' + v + ' < ' + target + ', so the target can only be to the right: lo = ' + (mid + 1) + '.'; lo = mid + 1; }
      else { s.next = [lo, mid - 1]; s.why = 'a[' + mid + '] = ' + v + ' > ' + target + ', so the target can only be to the left: hi = ' + (mid - 1) + '.'; hi = mid - 1; }
      steps.push(s);
    }
    steps.push({ lo: lo, hi: hi, mid: -1, empty: true });
    return steps;
  }

  L.register('binary-search', {
    mount: function (el) {
      var a = (el.getAttribute('data-values') || '').split(',').map(Number), target = +el.getAttribute('data-target');
      if (!a.length || a.some(isNaN)) throw new Error('data-values must be comma-separated numbers');
      for (var i = 1; i < a.length; i++) if (a[i] < a[i - 1]) throw new Error('data-values must be sorted ascending');
      var steps = trace(a, target), D = 2600, n = a.length, w = V.width(el), refs;
      var maxSteps = Math.floor(Math.log2(n)) + 1;
      var fig = document.createElement('div'), cap = document.createElement('p');
      cap.className = 'dg-flow-cap';
      el.classList.add('dg-flow-wrap');

      function build() {
        var rows = w < 420 && n > 8 ? 2 : 1, per = Math.ceil(n / rows), cw = Math.min(52, (w - 16) / per), ch = 34, rowH = 132;
        var x0 = (w - per * cw) / 2, H = (rows - 1) * rowH + 30 + ch + 76; // room for lo and hi stacked under the last row
        var s = V.svg('svg', { viewBox: '0 0 ' + w + ' ' + H, class: 'dg', role: 'img' });
        var pos = function (i) { var r = Math.floor(i / per); return { x: x0 + (i % per) * cw, y: 30 + r * rowH }; };
        var cells = a.map(function (v, i) {
          var p = pos(i), g = V.svg('g', { class: 'dg-node' }, s);
          V.svg('rect', { x: (p.x + 2).toFixed(1), y: p.y, width: (cw - 4).toFixed(1), height: ch, rx: 4, class: 'node' }, g);
          V.svg('text', { x: (p.x + cw / 2).toFixed(1), y: p.y + 22, 'text-anchor': 'middle', class: 'dg-lab' }, g, String(v));
          V.svg('text', { x: (p.x + cw / 2).toFixed(1), y: p.y + ch + 15, 'text-anchor': 'middle', class: 'dg-num' }, g, String(i));
          return g;
        });
        var ptr = function (label, above) {
          var g = V.svg('g', { class: 'dg-ptr' + (above ? ' dg-ptr-signal' : '') }, s);
          V.svg('path', { d: above ? 'M-6,-10 L6,-10 L0,-2 Z' : 'M-6,10 L6,10 L0,2 Z' }, g);
          V.svg('text', { y: above ? -14 : 24, 'text-anchor': 'middle' }, g, label);
          return g;
        };
        refs = { s: s, cells: cells, pos: pos, cw: cw, ch: ch, mid: ptr('mid', true), lo: ptr('lo', false), hi: ptr('hi', false) };
        fig.replaceChildren(s);
      }
      function at(g, i, dy, p) { // place pointer g under/over cell i (fractional i slides between cells)
        var a0 = refs.pos(Math.floor(i)), a1 = refs.pos(Math.min(n - 1, Math.ceil(i))), f = i - Math.floor(i);
        if (a0.y !== a1.y) { a1 = a0; f = 0; } // don't slide diagonally between rows
        g.setAttribute('transform', 'translate(' + (V.lerp(a0.x, a1.x, f) + refs.cw / 2).toFixed(1) + ',' + (a0.y + dy).toFixed(1) + ')');
        g.style.opacity = p;
      }
      function render(k, q, reduced) {
        var st = steps[k], prev = steps[k - 1] || { lo: 0, hi: n - 1, mid: st.mid < 0 ? 0 : st.mid };
        var move = reduced ? 1 : V.ease(V.clamp(q / 0.3)), judge = reduced ? 1 : V.clamp((q - 0.35) / 0.15), cut = reduced ? 1 : V.clamp((q - 0.6) / 0.3);
        var lo = V.lerp(prev.next ? prev.next[0] : prev.lo, st.lo, move), hi = V.lerp(prev.next ? prev.next[1] : prev.hi, st.hi, move);
        refs.cells.forEach(function (c, i) {
          var live = i >= st.lo && i <= st.hi, nextLive = st.next ? i >= st.next[0] && i <= st.next[1] : live;
          c.style.opacity = live ? (nextLive ? 1 : V.lerp(1, 0.28, cut)) : 0.28;
          c.setAttribute('class', 'dg-node' + (i === st.mid && judge > 0 ? (st.found ? ' hot found' : ' hot') : ''));
        });
        if (st.mid >= 0) at(refs.mid, V.lerp(k === 0 ? st.mid : prev.mid, st.mid, move), 0, 1); else refs.mid.style.opacity = 0;
        var loHiSame = Math.round(lo) === Math.round(hi);
        at(refs.lo, V.clamp(lo, 0, n - 1), refs.ch + 18, st.empty ? 0.4 : 1);
        at(refs.hi, V.clamp(hi, 0, n - 1), refs.ch + 18 + (loHiSame ? 26 : 0), st.empty ? 0.4 : 1);
        var text = st.empty ? 'lo (' + st.lo + ') passed hi (' + st.hi + '): ' + target + ' is not in the array.'
          : 'mid = ⌊(' + st.lo + ' + ' + st.hi + ') / 2⌋ = ' + st.mid + '. ' + (st.found ? 'a[' + st.mid + '] = ' + st.v + ': found after ' + (k + 1) + ' of at most ' + maxSteps + ' comparisons.' : st.why);
        refs.s.setAttribute('aria-label', 'Sorted array ' + a.join(', ') + '. Searching for ' + target + '. Step ' + (k + 1) + ': ' + text);
        if (cap._k !== k) { cap._k = k; cap.textContent = text; }
      }
      build();
      el.replaceChildren(fig, cap);
      var state = [steps.length - 1, 1, true];
      var tl = L.timeline({
        host: el, total: steps.length * D, prefix: 'stepper', keyStep: 'chapter', segment: 2000,
        chapters: steps.map(function (s, i) { return { t: i * D, title: 'Comparison ' + (i + 1) }; }),
        ui: { prev: true, play: true, counter: true, next: true },
        onSeek: function (t, info) { state = [info.chapter, info.progress * D / 2000, info.reduced]; render(state[0], state[1], state[2]); },
      });
      el.tabIndex = 0; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Binary search for ' + target);
      el.appendChild(tl.el);
      tl.set(tl.total);
      cap.setAttribute('aria-live', 'polite');
      var ro = V.onResize(el, function (nw) { w = nw; build(); render(state[0], state[1], state[2]); });
      return { destroy: function () { tl.destroy(); ro.disconnect(); } };
    },
  });
})();
