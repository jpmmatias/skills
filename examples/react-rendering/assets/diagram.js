// Generic figure components. Needs core.js and viz.js. Classic script, ES2017, inline SVG themed by figures.css.
// Every component registers with Learncraft.register, so a malformed one shows an error box and the rest
// of the page keeps working. Figures render their FINAL, true state at first paint (and in print); motion
// only happens on a learner action and is skipped under prefers-reduced-motion. Generated SVG is laid out
// at the container's width, so 12px text stays 12px on a phone.
//
//   <div data-lc="bars" data-bars='{"refund":0.61,"complaint":0.27,"return":0.12}' data-label="Next-token probability"
//        [data-format="fixed2|percent|int"] [data-max="1"] [data-sort="desc"] [data-summary="…"] [data-note="illustrative"]
//        [data-alt='{…}' data-alt-label="Show the other ticket" data-alt-summary="…"]></div>
//       data-bars may also be an ordered array: '[["1",0.2],["2",0.5],["10",0.3]]' or '[{"label":"1","value":0.2}]'
//       (object keys that look like integers are reordered by JavaScript; an array keeps your order).
//       Categorical bars; the largest value is signalled. The text alternative lists every value.
//       With data-alt, a toggle (aria-pressed) animates between the two sets.
//   <div data-lc="numberline" data-min="0" data-max="1" data-label="confidence"
//        data-zones='[{"from":0,"to":0.5,"label":"Low","sub":"…","tone":"muted|signal|ok|bad","cls":"…"}]' [data-marker="0.42"] [data-ticks="0,0.5,1"]></div>
//       A scale with labelled zones from data and an optional marker. JS: Learncraft.diagram.numberline(el, cfg) → { setMarker(v, animate) }.
//   <div data-lc="flow" data-flow='{"nodes":[{"id":"a","label":"Browser","sub":"…"}], "edges":[{"from":"a","to":"b","label":"GET /"}],
//        "steps":[{"edges":[0],"caption":"…"}], "summary":"…", "layout":"auto|vertical|horizontal"}'></div>
//       Flow graph from data. With steps, the timeline (Back / Play / Next) emphasises each step's edges and
//       sends a packet along them; the poster is the whole graph. Alt text is generated: "A → B → C".
//   <div class="stepper" (or data-lc="stepper")> <svg>…<g data-step="1">…<path class="arrow"/></g>…</svg>
//        <div class="captions"><p data-step="1">…</p>…</div> </div>
//       Hand-drawn SVG, stepped on the timeline: each step draws its .arrow paths and sends a packet.
//       First paint (and print) shows the FINAL state: every step drawn, the last caption. Play or Next
//       starts again from step 1 (segmenting). Use a unique marker id per SVG. Width is capped (figures.css).
// Faded examples (.fade) and quizzes moved to practice.js. The ACT/CONFIRM/TRIAGE bands, band-quiz and
// threshold explorer moved to starter/examples/jev-confidence/ as a worked example of a bespoke module.
(function () {
  'use strict';
  var L = window.Learncraft;
  if (!L || !L.viz) { console.error('diagram.js: load assets/core.js and assets/viz.js first'); return; }
  var V = L.viz, svg = V.svg, esc = L.esc;

  function json(el, attr) {
    var raw = el.getAttribute(attr);
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch (e) { throw new Error(attr + ' is not valid JSON (' + e.message + ')'); }
  }
  function num(el, attr, dflt) { var v = el.getAttribute(attr); return v == null || v === '' ? dflt : +v; }
  function once(el) { if (el._lcDone) return false; el._lcDone = true; return true; }
  var textW = function (s, px) { return String(s).length * px * 0.6; };

  // ---------- bars ----------
  // values (and alt) may be an object { label: value } or an ordered array [[label, value], …] / [{ label, value }]:
  // object keys that look like integers ("1", "10", "2") are reordered by JavaScript, an array keeps the author's order.
  function pairs(v) {
    if (!Array.isArray(v)) return v || {};
    var o = { __order: [] };
    v.forEach(function (p) {
      var k = Array.isArray(p) ? p[0] : p && p.label, x = Array.isArray(p) ? p[1] : p && p.value;
      if (k == null) throw new Error('bars: each entry needs a label');
      k = String(k); o[k] = +x; if (o.__order.indexOf(k) < 0) o.__order.push(k);
    });
    return o;
  }
  function bars(el, cfg) {
    cfg = Object.assign({}, cfg, { values: pairs(cfg.values), alt: cfg.alt ? pairs(cfg.alt) : cfg.alt });
    var keys = [], add = function (o) { (o && o.__order ? o.__order : Object.keys(o || {})).forEach(function (k) { if (k !== '__order' && keys.indexOf(k) < 0) keys.push(k); }); };
    add(cfg.values); add(cfg.alt);
    if (!keys.length) throw new Error('bars need at least one value');
    keys.forEach(function (k) { if (!isFinite(cfg.values[k] || 0) || (cfg.alt && !isFinite(cfg.alt[k] || 0))) throw new Error('bar "' + k + '" is not a number'); });
    var all = keys.map(function (k) { return cfg.values[k] || 0; }).concat(keys.map(function (k) { return (cfg.alt || {})[k] || 0; }));
    var max = cfg.max || (Math.max.apply(null, all) <= 1 ? 1 : Math.max.apply(null, all));
    var f = cfg.format === 'percent' ? function (v) { return Math.round(v * 100) + '%'; } : cfg.format === 'int' ? function (v) { return String(Math.round(v)); } : function (v) { return v.toFixed(2); };
    var onAlt = false, shown = {}, ys = {}, row = 32, svgEl, rows, summary, w = V.width(el);
    keys.forEach(function (k) { shown[k] = cfg.values[k] || 0; });
    var data = function () { return onAlt ? cfg.alt : cfg.values; };
    var order = function (vals) { return cfg.sort === 'desc' ? keys.slice().sort(function (a, b) { return (vals[b] || 0) - (vals[a] || 0); }) : keys; };
    var describe = function () {
      var vals = data();
      return (cfg.label ? cfg.label + ': ' : '') + order(vals).map(function (k) { return k + ' ' + f(vals[k] || 0); }).join(', ') +
        (cfg.note ? ' (' + cfg.note + ')' : '');
    };
    order(data()).forEach(function (k, i) { ys[k] = i * row; });
    function build() {
      var W = w, labW = Math.min(W * 0.4, Math.max(48, Math.max.apply(null, keys.map(function (k) { return textW(k, 13); })) + 12));
      var x0 = labW, x1 = W - 58, H = keys.length * row + (cfg.note ? 20 : 2);
      svgEl = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'dg dg-bars', role: 'img', 'aria-label': describe() });
      rows = {};
      keys.forEach(function (k) {
        var g = svg('g', {}, svgEl);
        svg('text', { x: x0 - 8, y: 17, 'text-anchor': 'end', class: 'dg-lab' }, g, k);
        svg('rect', { x: x0, y: 2, width: x1 - x0, height: 22, class: 'dg-track' }, g);
        rows[k] = { g: g, bar: svg('rect', { x: x0, y: 2, height: 22 }, g), val: svg('text', { x: x1 + 8, y: 18, class: 'dg-num' }, g), x0: x0, x1: x1 };
      });
      if (cfg.note) svg('text', { x: x0, y: H - 4, class: 'dg-cap' }, svgEl, cfg.note);
      paint();
      el.replaceChildren(svgEl);
      if (summary) el.appendChild(summary);
      if (toggle) el.appendChild(toggle);
    }
    function paint() {
      var top = keys.reduce(function (a, k) { return shown[k] > shown[a] ? k : a; }, keys[0]);
      keys.forEach(function (k) {
        var r = rows[k], v = shown[k];
        r.g.setAttribute('transform', 'translate(0,' + ys[k].toFixed(1) + ')');
        r.bar.setAttribute('width', Math.max(1, (v / max) * (r.x1 - r.x0)).toFixed(1));
        r.bar.setAttribute('class', k === top ? 'dg-win' : 'dg-bar');
        r.val.textContent = f(v);
      });
    }
    var sumText = function () { return onAlt ? cfg.altSummary : cfg.summary; };
    if (cfg.summary || cfg.altSummary) { summary = document.createElement('p'); summary.className = 'dg-summary'; summary.textContent = sumText() || ''; }
    var toggle = null;
    if (cfg.alt) {
      toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'dg-toggle';
      toggle.setAttribute('aria-pressed', 'false');
      toggle.innerHTML = '<span aria-hidden="true">⇄</span> ' + esc(cfg.altLabel || 'Switch');
      toggle.addEventListener('click', function () {
        onAlt = !onAlt; toggle.setAttribute('aria-pressed', String(onAlt));
        var from = {}, fy = {}, to = data(), ty = {};
        keys.forEach(function (k) { from[k] = shown[k]; fy[k] = ys[k]; });
        order(to).forEach(function (k, i) { ty[k] = i * row; });
        svgEl.setAttribute('aria-label', describe());
        if (summary) summary.textContent = sumText() || '';
        L.announce(describe() + (sumText() ? '. ' + sumText() : ''));
        V.tween(600, function (p) { keys.forEach(function (k) { shown[k] = V.lerp(from[k], to[k] || 0, p); ys[k] = V.lerp(fy[k], ty[k], p); }); paint(); });
      });
    }
    build();
    var ro = V.onResize(el, function (nw) { w = nw; build(); });
    return { destroy: function () { ro.disconnect(); } };
  }

  // ---------- number line with zones ----------
  function numberline(el, cfg) {
    var min = cfg.min == null ? 0 : cfg.min, max = cfg.max == null ? 1 : cfg.max, zones = cfg.zones || [];
    if (!(max > min)) throw new Error('numberline needs max > min');
    zones.forEach(function (z, i) { if (!(z.to > z.from)) throw new Error('zone ' + (i + 1) + ' needs to > from'); });
    var digits = cfg.digits == null ? 2 : cfg.digits, fv = function (v) { return (+v).toFixed(digits).replace(/\.?0+$/, '') || '0'; };
    var cur = cfg.marker, w = V.width(el), m, mt, x, notes;
    var zoneOf = function (v) { var z = null; zones.forEach(function (q) { if (v >= q.from && v <= q.to) z = q; }); return z; };
    function describe() {
      var s = (cfg.label || 'Scale') + ' from ' + fv(min) + ' to ' + fv(max);
      if (zones.length) s += '. ' + zones.map(function (z) { return z.label + ' ' + fv(z.from) + '–' + fv(z.to) + (z.sub ? ' (' + z.sub + ')' : ''); }).join('; ');
      if (cur != null) { var z = zoneOf(cur); s += '. Marker at ' + fv(cur) + (z ? ', in ' + z.label : ''); }
      return s + '.';
    }
    function build() {
      var W = w, x0 = 16, x1 = W - 16, Y = 38, BH = 40, H = Y + BH + 50;
      x = function (v) { return x0 + ((v - min) / (max - min)) * (x1 - x0); };
      var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'dg dg-nl', role: 'img', 'aria-label': describe() });
      var hidden = [];
      zones.forEach(function (z, i) {
        var zw = x(z.to) - x(z.from), cx = (x(z.from) + x(z.to)) / 2;
        svg('rect', { x: x(z.from), y: Y, width: zw, height: BH, class: 'dg-z dg-z-' + (z.tone || 't' + Math.min(i, 3)) + (z.cls ? ' ' + z.cls : '') }, s);
        var fitsLabel = textW(z.label, 13) <= zw - 6, fitsSub = z.sub && textW(z.sub, 12) <= zw - 6;
        svg('text', { x: cx, y: fitsSub ? Y + 17 : Y + 25, class: 'dg-zl', 'text-anchor': 'middle' }, s, fitsLabel ? z.label : z.label.slice(0, 1));
        if (fitsSub) svg('text', { x: cx, y: Y + 32, class: 'dg-zs', 'text-anchor': 'middle' }, s, z.sub);
        if (!fitsLabel || (z.sub && !fitsSub)) hidden.push(z);
      });
      var ticks = cfg.ticks || [min].concat(zones.map(function (z) { return z.from; }), zones.map(function (z) { return z.to; }), [max]);
      ticks = ticks.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      var lastX = -99;
      ticks.forEach(function (v) {
        svg('line', { x1: x(v), x2: x(v), y1: Y + BH, y2: Y + BH + 6, class: 'dg-tick' }, s);
        if (x(v) - lastX >= 30) { svg('text', { x: x(v), y: Y + BH + 20, class: 'dg-num', 'text-anchor': 'middle' }, s, fv(v)); lastX = x(v); }
      });
      if (cfg.label) svg('text', { x: x1, y: H - 4, class: 'dg-cap', 'text-anchor': 'end' }, s, cfg.label + ' →');
      m = svg('g', { class: 'dg-marker' }, s);
      svg('path', { d: 'M -7 -12 L 7 -12 L 0 0 Z' }, m);
      mt = svg('text', { y: -17, 'text-anchor': 'middle', class: 'dg-mt' }, m);
      place(cur);
      el.replaceChildren(s);
      if (hidden.length) {
        notes = document.createElement('p'); notes.className = 'dg-zone-notes';
        notes.textContent = hidden.map(function (z) { return z.label + (z.sub ? ': ' + z.sub : ''); }).join(' · ');
        el.appendChild(notes);
      }
    }
    function place(v) {
      if (v == null) { m.style.display = 'none'; return; }
      m.style.display = '';
      m.setAttribute('transform', 'translate(' + x(v).toFixed(1) + ',38)');
      mt.setAttribute('x', (V.clamp(x(v), 30, w - 30) - x(v)).toFixed(1));
      mt.textContent = fv(v);
    }
    build();
    var ro = V.onResize(el, function (nw) { w = nw; build(); });
    return {
      setMarker: function (v, animate) {
        var from = cur == null ? min : cur; cur = v;
        el.querySelector('svg').setAttribute('aria-label', describe());
        if (v == null || !animate) { place(v); return Promise.resolve(); }
        return V.tween(600, function (p) { place(V.lerp(from, v, p)); });
      },
      describe: describe, destroy: function () { ro.disconnect(); },
    };
  }

  // ---------- packet helper shared by stepper and flow ----------
  function packets(root) {
    var dots = [];
    return {
      at: function (i, path, p) {
        var d = dots[i] || (dots[i] = svg('circle', { r: 5, class: 'dg-packet' }, root));
        if (!(p > 0 && p < 1) || !path.getTotalLength) { d.style.display = 'none'; return; }
        var len = path.getTotalLength(), pt = path.getPointAtLength(len * V.ease(p));
        d.style.display = ''; d.setAttribute('cx', pt.x.toFixed(1)); d.setAttribute('cy', pt.y.toFixed(1));
      },
      hideFrom: function (i) { for (var j = i; j < dots.length; j++) if (dots[j]) dots[j].style.display = 'none'; },
    };
  }
  function drawPath(p, amount) {
    if (!p.getTotalLength) return;
    var len = p.getTotalLength();
    if (amount >= 1) { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; return; }
    p.style.strokeDasharray = len; p.style.strokeDashoffset = len * (1 - amount);
  }

  // ---------- stepper (hand-drawn SVG on the timeline) ----------
  function stepper(el) {
    var s = el.querySelector('svg'), caps = [].slice.call(el.querySelectorAll('.captions [data-step]'));
    if (!s || !caps.length) throw new Error('stepper needs an <svg> and .captions [data-step] paragraphs');
    var D = 2400, groups = [].slice.call(s.querySelectorAll('[data-step]')), pk = packets(s), capBox = el.querySelector('.captions');
    if (!s.getAttribute('role')) s.setAttribute('aria-hidden', 'true');
    // Hand-drawn SVGs can't re-lay out: on phones keep text ≥ ~11px and let the figure scroll sideways.
    var wrap = document.createElement('div'); wrap.className = 'dg-scroll';
    s.parentNode.insertBefore(wrap, s); wrap.appendChild(s);
    var vb = s.viewBox && s.viewBox.baseVal;
    if (vb && vb.width) s.style.minWidth = Math.round(vb.width * 0.92) + 'px';
    var fit = function () {
      var over = wrap.scrollWidth > wrap.clientWidth + 1;
      if (over) { wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Diagram (scrolls sideways)'); }
      else { wrap.removeAttribute('tabindex'); wrap.removeAttribute('role'); wrap.removeAttribute('aria-label'); }
    };
    fit();
    var roFit = V.onResize(el, fit);
    var tl = L.timeline({
      host: el, total: caps.length * D, prefix: 'stepper', keyStep: 'chapter', segment: 1100, wrap: true, // Next on the final state → step 1
      chapters: caps.map(function (c, i) { return { t: i * D, title: c.textContent.trim() }; }),
      ui: { prev: true, play: true, counter: true, next: true },
      onSeek: function (t, info) {
        var cur = info.chapter + 1, q = info.reduced ? 1 : info.progress * D / 1100, n = 0;
        groups.forEach(function (g) {
          var k = +g.getAttribute('data-step');
          g.classList.toggle('st-hidden', k > cur); g.classList.toggle('st-now', k === cur);
          [].forEach.call(g.querySelectorAll('.arrow'), function (a) {
            drawPath(a, k === cur ? V.clamp(q / 0.4) : 1);
            if (k === cur) pk.at(n++, a, info.reduced ? 1 : V.clamp((q - 0.15) / 0.75));
          });
        });
        pk.hideFrom(n);
        caps.forEach(function (c) { c.hidden = +c.getAttribute('data-step') !== cur; });
        if (info.changed && wrap.scrollWidth > wrap.clientWidth + 1) { // phone: bring the current step into view
          var g = s.querySelector('[data-step="' + cur + '"]'), k = s.getBoundingClientRect().width / (vb && vb.width || 1);
          if (g && g.getBBox) { var bb = g.getBBox(); wrap.scrollTo({ left: Math.max(0, (bb.x + bb.width / 2) * k - wrap.clientWidth / 2), behavior: info.reduced || !info.playing ? 'auto' : 'smooth' }); }
        }
      },
    });
    el.tabIndex = el.tabIndex < 0 ? 0 : el.tabIndex;
    if (!el.getAttribute('role')) { el.setAttribute('role', 'group'); el.setAttribute('aria-roledescription', 'stepper'); }
    el.appendChild(tl.el);
    tl.set(caps.length * D); // final, true state at first paint; Play restarts from step 1
    if (capBox) capBox.setAttribute('aria-live', 'polite');
    return { timeline: tl, destroy: function () { tl.destroy(); roFit.disconnect(); } };
  }

  // ---------- flow graph from data ----------
  function flowAlt(nodes, edges) {
    var name = function (id) { return (nodes.filter(function (n) { return n.id === id; })[0] || {}).label || id; };
    var parts = [], chain = null;
    edges.forEach(function (e) {
      if (chain && chain[chain.length - 1] === e.from) chain.push(e.to); else { chain = [e.from, e.to]; parts.push(chain); }
    });
    return parts.map(function (c) { return c.map(name).join(' → '); }).join('; ');
  }
  function flow(el, cfg) {
    var nodes = cfg.nodes || [], edges = cfg.edges || [], steps = cfg.steps || [];
    var idx = {}; nodes.forEach(function (nd, i) { if (!nd.id) throw new Error('flow node ' + (i + 1) + ' has no id'); idx[nd.id] = i; });
    edges.forEach(function (e, i) { if (!(e.from in idx) || !(e.to in idx)) throw new Error('flow edge ' + (i + 1) + ' points to an unknown node'); });
    steps.forEach(function (st, i) { (st.edges || []).forEach(function (j) { if (!edges[j]) throw new Error('flow step ' + (i + 1) + ' uses missing edge ' + j); }); });
    var alt = (cfg.title ? cfg.title + ': ' : '') + flowAlt(nodes, edges);
    var uidv = V.uid('lc-flow'), w = V.width(el), paths = [], nodeEls = [], labels = [], pk, svgEl;
    var fig = document.createElement('div'); fig.className = 'dg-flow-fig';
    var cap = document.createElement('p'); cap.className = 'dg-flow-cap';
    function build() {
      var n = nodes.length, horiz = cfg.layout === 'horizontal' || (cfg.layout !== 'vertical' && w / n >= 170);
      var W = w, pos = [], nw, nh = 46, H;
      if (horiz) {
        nw = Math.min(140, W / n - 60); var gap = (W - n * nw) / Math.max(1, n - 1); H = 150;
        nodes.forEach(function (nd, i) { pos.push({ x: i * (nw + gap), y: 52 }); });
      } else {
        nw = Math.min(240, W * 0.5); var vgap = 58; H = n * nh + (n - 1) * vgap + 8;
        nodes.forEach(function (nd, i) { pos.push({ x: (W - nw) / 2, y: 4 + i * (nh + vgap) }); });
      }
      svgEl = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'dg dg-flow', role: 'img', 'aria-label': alt });
      var defs = svg('defs', {}, svgEl);
      ['', 'on'].forEach(function (v) {
        var mk = svg('marker', { id: uidv + '-ah' + v, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
        svg('path', { d: 'M0,0 L10,5 L0,10 z', class: v ? 'dg-ah-on' : 'dg-ah' }, mk);
      });
      paths = []; labels = []; nodeEls = [];
      edges.forEach(function (e) {
        var a = pos[idx[e.from]], b = pos[idx[e.to]], ia = idx[e.from], ib = idx[e.to], d, lx, ly, anchor, fwd = ib > ia;
        if (horiz) {
          var yy = fwd ? a.y + nh / 2 - 8 : a.y + nh / 2 + 8, xa = fwd ? a.x + nw : a.x, xb = fwd ? b.x : b.x + nw;
          d = Math.abs(ia - ib) > 1 ? 'M' + (a.x + nw / 2) + ',' + (fwd ? a.y : a.y + nh) + ' C' + (a.x + nw / 2) + ',' + (fwd ? 8 : H - 8) + ' ' + (b.x + nw / 2) + ',' + (fwd ? 8 : H - 8) + ' ' + (b.x + nw / 2) + ',' + (fwd ? b.y : b.y + nh)
            : 'M' + xa + ',' + yy + ' L' + xb + ',' + yy;
          lx = (xa + xb) / 2; ly = fwd ? a.y - 10 : a.y + nh + 20; anchor = 'middle';
        } else {
          var lane = fwd ? -26 : 26, xx = W / 2 + lane, ya = fwd ? a.y + nh : a.y, yb = fwd ? b.y : b.y + nh;
          d = Math.abs(ia - ib) > 1 ? 'M' + (fwd ? a.x : a.x + nw) + ',' + (a.y + nh / 2) + ' C' + (fwd ? a.x - 40 : a.x + nw + 40) + ',' + (a.y + nh / 2) + ' ' + (fwd ? b.x - 40 : b.x + nw + 40) + ',' + (b.y + nh / 2) + ' ' + (fwd ? b.x : b.x + nw) + ',' + (b.y + nh / 2)
            : 'M' + xx + ',' + ya + ' L' + xx + ',' + yb;
          lx = fwd ? xx - 10 : xx + 10; ly = (ya + yb) / 2 + 4; anchor = fwd ? 'end' : 'start';
        }
        paths.push(svg('path', { d: d, class: 'dg-edge', 'marker-end': 'url(#' + uidv + '-ah)' }, svgEl));
        labels.push(e.label ? svg('text', { x: lx.toFixed(1), y: ly.toFixed(1), 'text-anchor': anchor, class: 'dg-elab' }, svgEl, e.label) : null);
      });
      nodes.forEach(function (nd, i) {
        var p = pos[i], g = svg('g', { class: 'dg-node' }, svgEl);
        svg('rect', { x: p.x.toFixed(1), y: p.y, width: nw.toFixed(1), height: nh, rx: 6, class: 'node' }, g);
        svg('text', { x: (p.x + nw / 2).toFixed(1), y: p.y + (nd.sub ? 20 : 28), 'text-anchor': 'middle', class: 't-title' }, g, nd.label || nd.id);
        if (nd.sub) svg('text', { x: (p.x + nw / 2).toFixed(1), y: p.y + 37, 'text-anchor': 'middle', class: 't-sub' }, g, nd.sub);
        nodeEls.push(g);
      });
      pk = packets(svgEl);
      fig.replaceChildren(svgEl);
    }
    function show(k, q, reduced) { // k = step index, or steps.length for the overview
      var on = k < steps.length ? steps[k].edges || [] : null, hot = {};
      paths.forEach(function (p, j) {
        var isOn = on && on.indexOf(j) >= 0;
        p.setAttribute('class', 'dg-edge' + (isOn ? ' on' : on ? ' dim' : ''));
        p.setAttribute('marker-end', 'url(#' + uidv + '-ah' + (isOn ? 'on' : '') + ')');
        if (labels[j]) labels[j].setAttribute('class', 'dg-elab' + (isOn ? ' on' : on ? ' dim' : ''));
        if (isOn) { hot[edges[j].from] = 1; hot[edges[j].to] = 1; }
      });
      nodeEls.forEach(function (g, i) { g.setAttribute('class', 'dg-node' + (hot[nodes[i].id] ? ' hot' : on ? ' dim' : '')); });
      (on || []).forEach(function (j, i) {
        var a = 0.08 + 0.7 * i / on.length, b = 0.08 + 0.7 * (i + 1) / on.length;
        pk.at(i, paths[j], reduced ? 1 : (q - a) / (b - a));
      });
      pk.hideFrom(on ? on.length : 0);
      var text = on ? steps[k].caption : cfg.summary || alt;
      if (cap._k !== k) { cap._k = k; cap.innerHTML = (L.sanitize || esc)(text || ''); }
    }
    el.classList.add('dg-flow-wrap');
    el.replaceChildren(fig, cap);
    build();
    var tl = null, state = { k: steps.length, q: 1, r: true };
    if (steps.length) {
      var D = 2200, total = steps.length * D + 600;
      tl = L.timeline({
        host: el, total: total, prefix: 'stepper', keyStep: 'chapter', segment: 1800, wrap: true,
        chapters: steps.map(function (st, i) { return { t: i * D, title: 'Step ' + (i + 1) }; }).concat([{ t: steps.length * D, title: V.tr('overview') }]),
        counterText: function (k) { return k < steps.length ? V.tr('step', { k: k + 1, n: steps.length }) : V.tr('overview'); },
        ui: { prev: true, play: true, counter: true, next: true },
        onSeek: function (t, info) { state = { k: info.chapter, q: info.progress * D / 1800, r: info.reduced }; show(state.k, state.q, state.r); },
      });
      el.tabIndex = 0; el.setAttribute('role', 'group'); el.setAttribute('aria-label', cfg.title || alt);
      el.appendChild(tl.el);
      tl.set(total);
    } else show(0, 1, true);
    cap.setAttribute('aria-live', 'polite');
    var ro = V.onResize(el, function (nw) { w = nw; build(); show(state.k, state.q, state.r); });
    return { timeline: tl, destroy: function () { ro.disconnect(); if (tl) tl.destroy(); } };
  }

  // ---------- registration (+ legacy markup) ----------
  var defs = {
    bars: function (el) {
      return bars(el, { values: json(el, 'data-bars') || {}, alt: json(el, 'data-alt') || json(el, 'data-bars-alt'), altLabel: el.getAttribute('data-alt-label'),
        label: el.getAttribute('data-label') || 'Values', format: el.getAttribute('data-format'), max: num(el, 'data-max', null), sort: el.getAttribute('data-sort'),
        note: el.getAttribute('data-note'),
        summary: el.getAttribute('data-summary') || (el.hasAttribute('data-confidence') ? 'confidence = ' + (+el.getAttribute('data-confidence')).toFixed(2) : null),
        altSummary: el.getAttribute('data-alt-summary') || (el.hasAttribute('data-confidence-alt') ? 'confidence = ' + (+el.getAttribute('data-confidence-alt')).toFixed(2) : null) });
    },
    numberline: function (el) {
      return numberline(el, { min: num(el, 'data-min', 0), max: num(el, 'data-max', 1), zones: json(el, 'data-zones') || [], marker: num(el, 'data-marker', null),
        label: el.getAttribute('data-label'), digits: num(el, 'data-digits', 2),
        ticks: el.hasAttribute('data-ticks') ? el.getAttribute('data-ticks').split(',').map(Number) : null });
    },
    flow: function (el) { return flow(el, json(el, 'data-flow') || {}); },
    stepper: stepper,
  };
  Object.keys(defs).forEach(function (type) {
    L.register(type, { mount: function (el, ctx) { return once(el) ? defs[type](el, ctx || {}) : null; } });
  });
  L.ready(function () {
    [['.stepper:not([data-lc])', 'stepper'], ['[data-bars]:not([data-lc])', 'bars']].forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (el) {
        L.mount(el, pair[1], function () { return once(el) ? defs[pair[1]](el, {}) : null; });
      });
    });
  });
  L.diagram = { bars: bars, numberline: numberline, flow: flow, stepper: stepper, flowAlt: flowAlt };
})();
