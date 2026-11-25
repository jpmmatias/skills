// render-sim: an explorable SIMPLIFIED MODEL of the rendering rules taught in lessons 2 and 3. It is not React.
// The learner picks which component calls its state setter and (in "memo" mode) which components are wrapped in
// memo and whether the handlers come from useCallback. The figure shows, for ONE update from the initial state:
// which components React calls (rendered), which it skips (memo with equal props), which it never visits, and
// which DOM nodes change in the commit.
//
//   <div data-lc="render-sim" [data-mode="basic|memo"] [data-trigger="count|theme"] [data-goal]></div>
//   Loads after core.js and viz.js. Lessons 2 and 3 both load this file (lesson 3 from its own folder).
//
// The rules the model applies (each cited in the lessons):
//   1. The component whose state changed renders (S1, S6).
//   2. When a component renders, each child renders too, unless the child is wrapped in memo and every prop is
//      Object.is-equal to last time; then the child and its subtree are skipped (S11).
//   3. A function created during render is a new value every render, unless it comes from useCallback (S17).
//   4. A rendered component changes the DOM only where its output differs from last time (S1).
// Left out on purpose: context, keys, equal-value bail-outs, effects, concurrent rendering, and every
// implementation detail. Everything is a pure function of the controls, so it is deterministic.
(function () {
  'use strict';
  var L = window.Learncraft, V = L && L.viz;
  if (!L || !V) { console.error('0002.figures.js: load assets/core.js and assets/viz.js first'); return; }

  // The app being modelled, as data. dom: what host output depends on (null = output never changes here).
  var TREE = [
    { id: 'App', parent: null, depth: 0, state: 'theme', host: false },
    { id: 'Header', parent: 'App', depth: 1, props: function (s) { return { theme: s.theme }; }, dom: function (s) { return 'class="' + s.theme + '"'; }, domName: '<header class>', host: true },
    { id: 'Counter', parent: 'App', depth: 1, state: 'count', host: false, props: function () { return {}; } },
    { id: 'List', parent: 'App', depth: 1, props: function (s, h) { return { items: 'ITEMS', onPick: h.onPick }; }, host: true },
    { id: 'Display', parent: 'Counter', depth: 2, props: function (s) { return { value: s.count }; }, dom: function (s) { return String(s.count); }, domName: '<output> text', host: true },
    { id: 'Button', parent: 'Counter', depth: 2, props: function (s, h) { return { label: '+1', onClick: h.increment }; }, host: true },
    { id: 'Row a', parent: 'List', depth: 2, props: function () { return { item: 'a' }; }, host: true },
    { id: 'Row b', parent: 'List', depth: 2, props: function () { return { item: 'b' }; }, host: true },
    { id: 'Row c', parent: 'List', depth: 2, props: function () { return { item: 'c' }; }, host: true },
  ];
  var BY = {}; TREE.forEach(function (c) { BY[c.id] = c; });
  var kids = function (id) { return TREE.filter(function (c) { return c.parent === id; }); };
  var TRIGGERS = {
    count: { owner: 'Counter', setter: 'setCount(c => c + 1)', label: 'Click +1: Counter calls setCount(c => c + 1)' },
    theme: { owner: 'App', setter: 'setTheme(next)', label: 'Toggle theme: App calls setTheme(next)' },
  };
  var MEMOABLE = ['Counter', 'Button', 'List'];

  // ---------- the model (pure) ----------
  // A "handler identity" token: the same token means Object.is-equal. Inline handlers get a fresh token per render
  // of their owner; useCallback handlers (with stable dependencies) keep the token from the previous render.
  function simulate(cfg) {
    var before = { theme: 'light', count: 0 }, after = { theme: before.theme, count: before.count };
    if (cfg.trigger === 'theme') after.theme = 'dark'; else after.count = 1;
    var ownerRendered = {};
    var out = {};
    var prevH = { increment: 'increment#1', onPick: 'onPick#1' };
    function handlers(rendered) {
      return {
        increment: cfg.useCallback || !rendered.Counter ? prevH.increment : 'increment#2',
        onPick: cfg.useCallback || !rendered.App ? prevH.onPick : 'onPick#2',
      };
    }
    function same(a, b) { var ks = Object.keys(a).concat(Object.keys(b)); return ks.every(function (k) { return Object.is(a[k], b[k]); }); }
    function changed(a, b) { return Object.keys(b).filter(function (k) { return !Object.is(a[k], b[k]); }); }
    // Depth-first, the order React would describe it in the docs' "recursive" rendering.
    var order = [];
    function visit(c, why) {
      ownerRendered[c.id] = true;
      var rec = { id: c.id, status: 'rendered', why: why, dom: null };
      if (c.dom) {
        var d0 = c.dom(before), d1 = c.dom(after);
        if (d0 !== d1) rec.dom = { name: c.domName, from: d0, to: d1 };
      }
      out[c.id] = rec; order.push(rec);
      kids(c.id).forEach(function (k) {
        var h1 = handlers(ownerRendered), p0 = k.props(before, prevH), p1 = k.props(after, h1);
        var memo = cfg.memo[k.id], diff = changed(p0, p1);
        if (memo && same(p0, p1)) {
          var r = { id: k.id, status: 'skipped', why: 'memo compared its props and all are equal' + (Object.keys(p1).length ? ' (' + Object.keys(p1).join(', ') + ')' : ' (it has none)'), dom: null };
          out[k.id] = r; order.push(r);
          skipSubtree(k);
          return;
        }
        var reason = memo ? 'memo compared its props, but ' + diff.map(function (p) { return p === 'onClick' || p === 'onPick' ? p + ' is a new function' : p + ' changed'; }).join(' and ')
          : diff.length ? 'its parent rendered, and ' + diff.map(function (p) { return p === 'onClick' || p === 'onPick' ? p + ' is a new function' : p + ' changed'; }).join(' and ')
          : 'its parent rendered (not wrapped in memo, so props are not compared)';
        visit(k, reason);
      });
    }
    function skipSubtree(c) { kids(c.id).forEach(function (k) { var r = { id: k.id, status: 'idle', why: 'inside a skipped component', dom: null }; out[k.id] = r; skipSubtree(k); }); }
    var owner = BY[TRIGGERS[cfg.trigger].owner];
    visit(owner, 'its own state changed: ' + TRIGGERS[cfg.trigger].setter);
    TREE.forEach(function (c) { if (!out[c.id]) out[c.id] = { id: c.id, status: 'idle', why: 'above or beside the component that updated', dom: null }; });
    var count = { rendered: 0, skipped: 0, idle: 0, dom: 0 };
    TREE.forEach(function (c) { count[out[c.id].status]++; if (out[c.id].dom) count.dom++; });
    return { out: out, order: order, count: count, before: before, after: after };
  }

  // ---------- drawing ----------
  function draw(res, cfg, w) {
    var esc = L.esc, rows = [[], [], []];
    TREE.forEach(function (c) { rows[c.depth].push(c); });
    var top = 30, rowH = 104, nh = 46, H = top + 2 * rowH + nh + 30, pos = {};
    rows.forEach(function (row, d) {
      var n = row.length, slot = w / n, nw = Math.min(124, slot - 8);
      row.forEach(function (c, i) { pos[c.id] = { x: slot * i + (slot - nw) / 2, y: top + d * rowH, w: nw }; });
    });
    var small = w < 520;
    var s = '<svg class="dg" viewBox="0 0 ' + w + ' ' + H + '" aria-hidden="true" focusable="false">';
    TREE.forEach(function (c) {
      if (!c.parent) return;
      var a = pos[c.parent], b = pos[c.id], on = res.out[c.parent].status === 'rendered' && res.out[c.id].status !== 'idle', faint = res.out[c.parent].status !== 'rendered' || res.out[c.id].status === 'idle';
      s += '<path class="dg-edge' + (on && res.out[c.id].status === 'rendered' ? ' on' : '') + '" d="M' + (a.x + a.w / 2).toFixed(1) + ',' + (a.y + nh) + ' C' + (a.x + a.w / 2).toFixed(1) + ',' + (a.y + nh + 30) + ' ' + (b.x + b.w / 2).toFixed(1) + ',' + (b.y - 30) + ' ' + (b.x + b.w / 2).toFixed(1) + ',' + b.y + '"' + (faint ? ' style="opacity:.35"' : '') + '/>';
    });
    var trig = TRIGGERS[cfg.trigger];
    TREE.forEach(function (c) {
      var p = pos[c.id], r = res.out[c.id], memo = cfg.memo[c.id];
      var cx = (p.x + p.w / 2).toFixed(1);
      var box = r.status === 'rendered' ? 'fill: var(--signal); fill-opacity: .13; stroke: var(--signal); stroke-width: 2.5'
        : r.status === 'skipped' ? 'fill: var(--card); stroke: var(--fg); stroke-width: 1.5; stroke-dasharray: 5 4'
        : 'fill: var(--card); stroke: var(--rule); stroke-width: 1.5';
      s += '<g' + (r.status === 'idle' ? ' style="opacity:.55"' : '') + '>';
      if (memo) s += '<rect x="' + (p.x - 4).toFixed(1) + '" y="' + (p.y - 4) + '" width="' + (p.w + 8).toFixed(1) + '" height="' + (nh + 8) + '" rx="9" style="fill: none; stroke: var(--muted); stroke-width: 1"/>';
      s += '<rect x="' + p.x.toFixed(1) + '" y="' + p.y + '" width="' + p.w.toFixed(1) + '" height="' + nh + '" rx="6" style="' + box + '"/>';
      s += '<text x="' + cx + '" y="' + (p.y + 19) + '" text-anchor="middle" style="font-weight: 700; font-size: ' + (small ? 12 : 13) + 'px">' + esc(c.id) + '</text>';
      var word = r.status === 'rendered' ? 'rendered' : r.status === 'skipped' ? 'skipped' : 'not called';
      s += '<text x="' + cx + '" y="' + (p.y + 36) + '" text-anchor="middle" style="font-size: 11.5px; ' + (r.status === 'rendered' ? 'fill: var(--signal); font-weight: 700' : 'fill: var(--muted)') + '">' + word + '</text>';
      if (memo) s += '<text x="' + (p.x - 2).toFixed(1) + '" y="' + (p.y - 8) + '" style="font: 11px var(--font-mono); fill: var(--muted)">memo</text>';
      if (r.dom) s += '<text x="' + cx + '" y="' + (p.y + nh + 16) + '" text-anchor="middle" style="font: 700 11.5px var(--font-ui); fill: var(--signal)">DOM ✎</text>';
      s += '</g>';
      if (c.id === trig.owner) s += '<text x="' + cx + '" y="' + (p.y - (memo ? 20 : 9)) + '" text-anchor="middle" style="font: 700 12px var(--font-mono); fill: var(--signal)">' + esc(trig.setter.replace(/\(.*$/, '()')) + ' ⚡</text>';
    });
    return s + '</svg>';
  }

  function summary(res, cfg) {
    var c = res.count;
    return TRIGGERS[cfg.trigger].label + '. ' + c.rendered + ' of ' + TREE.length + ' components rendered, ' + c.skipped + ' skipped by memo, ' + c.idle + ' not called; ' +
      (c.dom ? c.dom + ' DOM node' + (c.dom > 1 ? 's' : '') + ' changed in the commit.' : 'no DOM node changed in the commit.');
  }

  // Component styles, theme tokens only (no literal colours). Injected once; the page CSP allows inline styles.
  var CSS = '[data-lc=render-sim],[data-lc=render-sim] *{font-variant-ligatures:none;font-feature-settings:"calt" 0,"liga" 0}.rsim-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr));gap:.75rem 1.25rem;margin-bottom:.75rem}' +
    '.rsim-controls fieldset{border:1px solid var(--rule);border-radius:var(--radius-sm);padding:.5rem .8rem .6rem;margin:0;min-width:0}' +
    '.rsim-controls legend{font:600 .85rem var(--font-ui);color:var(--muted);padding:0 .3rem}' +
    '.rsim-opt{display:flex;gap:.5rem;align-items:baseline;font:.92rem/1.35 var(--font-ui);padding:.3rem 0;cursor:pointer}' +
    '.rsim-opt input{accent-color:var(--signal);flex:none;margin:0;transform:translateY(1px)}' +
    '.rsim-opt span{min-width:0;overflow-wrap:anywhere}.rsim-opt code{font-size:.85em}' +
    '.rsim-loghead{font:600 .85rem var(--font-ui);color:var(--muted);margin:.6rem 0 .2rem}' +
    '.rsim-log{font:.88rem/1.45 var(--font-ui);margin:0 0 .5rem;padding-left:1.3rem}' +
    '.rsim-log li{margin:.15rem 0}' +
    '.rsim-note{font:.82rem/1.4 var(--font-ui);color:var(--muted);margin:.5rem 0 0}';
  function injectStyle() {
    if (document.getElementById('rsim-style')) return;
    var st = document.createElement('style'); st.id = 'rsim-style'; st.textContent = CSS; document.head.appendChild(st);
  }

  L.register('render-sim', {
    mount: function (el) {
      injectStyle();
      var mode = el.getAttribute('data-mode') === 'memo' ? 'memo' : 'basic';
      var cfg = { trigger: el.getAttribute('data-trigger') === 'theme' ? 'theme' : 'count', memo: {}, useCallback: false };
      var uid = V.uid('rsim'), w = V.width(el), sayTimer = 0;
      el.classList.add('lc-explorable');

      var controls = document.createElement('div'); controls.className = 'rsim-controls';
      var h = '<fieldset><legend>Which state update?</legend>';
      Object.keys(TRIGGERS).forEach(function (k) {
        h += '<label class="rsim-opt"><input type="radio" name="' + uid + '-t" value="' + k + '"' + (cfg.trigger === k ? ' checked' : '') + '><span>' + L.esc(TRIGGERS[k].label) + '</span></label>';
      });
      h += '</fieldset>';
      if (mode === 'memo') {
        h += '<fieldset><legend>Optimizations</legend>';
        MEMOABLE.forEach(function (id) { h += '<label class="rsim-opt"><input type="checkbox" data-memo="' + id + '"><span>Wrap <code>' + id + '</code> in <code>memo</code></span></label>'; });
        h += '<label class="rsim-opt"><input type="checkbox" data-cb><span>Create <code>increment</code> and <code>onPick</code> with <code>useCallback</code></span></label>';
        h += '</fieldset>';
      }
      controls.innerHTML = h;

      var fig = document.createElement('div'); fig.className = 'lc-ex-fig'; fig.setAttribute('role', 'img');
      var readout = document.createElement('p'); readout.className = 'lc-ex-readout';
      var logHead = document.createElement('p'); logHead.className = 'rsim-loghead'; logHead.textContent = 'What the model did, in the order React would call the components:';
      var log = document.createElement('ol'); log.className = 'rsim-log';
      var note = document.createElement('p'); note.className = 'rsim-note';
      note.textContent = 'Simplified model of the rules in this lesson, not React itself: it shows one update from the start state (count 0, theme light) and ignores context, keys and everything React treats as an implementation detail.';
      el.replaceChildren(controls, fig, readout, logHead, log, note);

      var goal = null;
      if (el.hasAttribute('data-goal') && mode === 'memo') {
        goal = document.createElement('div'); goal.className = 'lc-ex-check';
        var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'Check the goal';
        var fb = document.createElement('p'); fb.className = 'lc-ex-fb'; fb.setAttribute('role', 'status');
        btn.addEventListener('click', function () {
          var a = simulate({ trigger: 'theme', memo: cfg.memo, useCallback: cfg.useCallback }), b = simulate({ trigger: 'count', memo: cfg.memo, useCallback: cfg.useCallback });
          var themeOk = a.count.rendered === 2, countOk = b.count.rendered === 2;
          var ok = themeOk && countOk;
          fb.className = 'lc-ex-fb ' + (ok ? 'ok' : 'bad');
          fb.textContent = ok ? '✓ Both updates now render only 2 components each, and the DOM changes are the same as before: memo skipped work, it did not change the result.'
            : '✗ Theme toggle renders ' + a.count.rendered + ' components (goal 2); +1 renders ' + b.count.rendered + ' (goal 2). ' +
              (!cfg.useCallback && (cfg.memo.List || cfg.memo.Button) ? 'A memo component that receives a new function every render still renders.' : 'Look at which "rendered" components have equal props.');
        });
        goal.append(btn, fb);
        el.insertBefore(goal, note);
      }

      function render(user) {
        var res = simulate(cfg);
        fig.innerHTML = draw(res, cfg, w);
        var text = summary(res, cfg);
        fig.setAttribute('aria-label', 'Component tree, simplified model. ' + text);
        readout.textContent = text;
        log.replaceChildren.apply(log, res.order.map(function (r) {
          var li = document.createElement('li');
          var b = document.createElement('b'); b.textContent = r.id + (r.status === 'skipped' ? ' skipped' : ' rendered');
          li.append(b, document.createTextNode(': ' + r.why + '.'));
          if (r.dom) li.append(document.createTextNode(' Commit: ' + r.dom.name + ' changes from ' + r.dom.from + ' to ' + r.dom.to + '.'));
          else if (r.status === 'rendered') li.append(document.createTextNode(BY[r.id].host ? ' Its own DOM nodes come out the same, so the commit leaves them alone.' : ' It returns only other components, so it has no DOM nodes of its own to change.'));
          return li;
        }));
        if (user) { clearTimeout(sayTimer); sayTimer = setTimeout(function () { L.announce(text); }, 400); }
      }
      controls.addEventListener('change', function (e) {
        var t = e.target;
        if (t.type === 'radio') cfg.trigger = t.value;
        else if (t.hasAttribute('data-memo')) cfg.memo[t.getAttribute('data-memo')] = t.checked;
        else if (t.hasAttribute('data-cb')) cfg.useCallback = t.checked;
        render(true);
      });
      render(false);
      var ro = V.onResize(el, function (nw) { w = nw; render(false); });
      return { destroy: function () { ro.disconnect(); clearTimeout(sayTimer); } };
    },
  });

  // Exposed for tests and for the practice-answer check in NOTES.md: Learncraft.renderSim.simulate(cfg).
  L.renderSim = { simulate: simulate, tree: TREE };
})();
