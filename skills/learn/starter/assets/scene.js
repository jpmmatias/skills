// Motion-scene player: narrated, scrubbable explainer animations inside lessons.
// Needs core.js and viz.js (the player is Learncraft.timeline). Classic script, ES2017.
//
//   <div class="scene" data-scene="my-scene"></div>          (or <div data-lc="scene" data-scene="my-scene">)
//   <script src="../assets/scene.js"></script>
//   <script src="scenes-0003.js"></script>   → Scene.register('my-scene', { title, total, poster, setup, beats, chapters, phone })
//
// A scene is a pure function of time, so play, pause, scrub and chapter jumps all work:
//   setup(stage, S, root)  builds the SVG (root, viewBox 960×540) and terminals once and returns refs.
//   beats: [{ t, d, f(refs, p) }]  from time t (ms), over d ms, set ABSOLUTE state for progress p in 0..1.
//                                  f must be idempotent: the player calls every beat on every frame, in order.
//   chapters: [{ t, title, caption, say }]  3–6 chapters. caption allows <b> <em> <code> <a> (sanitised);
//                                  say is the optional narration (browser speech, COURSE.lang).
//   total: ms (default: last beat end + 1.2 s).
//   poster: ms | 'start' | 'end' (default 'end'): the frame shown before play, in print and on load.
//                                  It must stand alone as a static diagram.
//   phone: { focus: [x, y, w, h] }  stage region kept on screens under 480px (default: the bounding box of
//                                  the SVG content). On phones, terminals move below the stage at 12px and
//                                  the SVG is cropped to the focus, so keep the mechanism ≤ ~480 units wide.
// Helpers on S: svg(tag, attrs, parent, text) · terminal(stage, box) · seg(p, a, b) · lerp · ease · clamp
//               fade(el, p) · draw(path, p) · along(path, p) → {x,y} · layers(svg, cx, cy, rings) · highlight(code)
// Each scene mounts through Learncraft.mount, so a broken scene shows an error box and the others keep working.
// The stage is aria-hidden; the caption (polite live region, chapter changes only) and the Transcript
// disclosure carry the content. Reduced motion: Play steps chapter by chapter, beats jump to their end state.
// Watching earns no XP (it's consumption). Always follow a scene with retrieval practice.
(function () {
  'use strict';
  var L = window.Learncraft;
  if (!L || !L.timeline) { console.error('scene.js: load assets/core.js and assets/viz.js first'); window.Scene = { S: {}, register: function () {} }; return; }
  var NS = 'http://www.w3.org/2000/svg', V = L.viz;
  var clamp = V.clamp, lerp = V.lerp, ease = V.ease;
  var seg = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var esc = L.esc, sanitize = L.sanitize || L.esc;
  var PHONE = 480;

  function svg(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  var fade = function (el, p) { el.style.opacity = p; };
  function draw(path, p) {
    var len = path._len || (path._len = path.getTotalLength());
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len * (1 - p);
  }
  function along(path, p) {
    var len = path._len || (path._len = path.getTotalLength());
    return path.getPointAtLength(len * p);
  }

  // Syntax highlighting for shell / TS / JSON-ish snippets (works on partially typed text). Output is escaped.
  var RE = /(\/\/.*$)|('(?:[^'\\]|\\.)*'?|"(?:[^"\\]|\\.)*"?|`[^`]*`?)|(\$[A-Za-z_]+)|\b(\d+(?:\.\d+)?)\b|\b(const|let|await|import|from|if|return|new|for|of)\b|([A-Za-z_]\w*)(?=\s*:)|([A-Za-z_]\w*)(?=\()/g;
  var CLS = [null, 'com', 'str', 'var', 'num', 'kw', 'key', 'fn'];
  function highlight(src) {
    var out = '', last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(src))) {
      if (m[0] === '') { RE.lastIndex++; continue; }
      out += esc(src.slice(last, m.index));
      var g = 1; while (g < m.length && m[g] === undefined) g++;
      out += '<span class="sc-' + CLS[g] + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }

  // Terminal panel. Lines are set per beat: term.set(i, kind, content, p)
  //   kind 'cmd' (prompt + highlighted), 'code' (highlighted), 'out' (content = [{ t, c }] with c '' | 'gold' | 'ok' | 'muted')
  function terminal(stage, box) {
    var el = document.createElement('div');
    el.className = 'sc-term';
    el.style.left = box.x + '%'; el.style.top = box.y + '%'; el.style.width = box.w + '%'; el.style.height = box.h + '%';
    el.innerHTML = '<div class="sc-term-bar"><i></i><i></i><i></i><span>' + esc(box.title || 'zsh') + '</span></div><pre class="sc-term-body"></pre>';
    stage.appendChild(el);
    var body = el.querySelector('pre'), lines = [], lastHtml = null;
    var api = {
      el: el, lines: lines,
      set: function (i, kind, content, p) { lines[i] = { kind: kind, content: content, p: p }; },
      render: function () {
        var html = '';
        lines.forEach(function (Ln) {
          if (!Ln || Ln.p <= 0) return;
          var row;
          if (Ln.kind === 'out') {
            var total = Ln.content.reduce(function (n, s) { return n + s.t.length; }, 0), left = Math.ceil(total * Ln.p);
            row = Ln.content.map(function (s) { var x = s.t.slice(0, Math.max(0, left)); left -= s.t.length; return x ? '<span class="sc-o-' + (s.c || 'plain') + '">' + esc(x) + '</span>' : ''; }).join('');
          } else {
            var x = Ln.content.slice(0, Math.ceil(Ln.content.length * Ln.p));
            row = (Ln.kind === 'cmd' ? '<span class="sc-prompt">$</span> ' : '') + highlight(x);
          }
          html += row + (Ln.p < 1 ? '<span class="sc-cursor">▌</span>' : '') + '\n';
        });
        if (html !== lastHtml) { body.innerHTML = html; lastHtml = html; }
      },
    };
    (stage._terms || (stage._terms = [])).push(api);
    return api;
  }

  // Concentric layers (shell ⊃ kernel ⊃ hardware). rings: [{ r, label, sub, cls, inner }], OUTERMOST first.
  function layers(root, cx, cy, rings) {
    return rings.map(function (ring) {
      var g = svg('g', { class: 'sc-layer ' + (ring.cls || '') }, root);
      svg('circle', { cx: cx, cy: cy, r: ring.r }, g);
      svg('text', { x: cx, y: ring.inner ? cy - 4 : cy - ring.r + 26, 'text-anchor': 'middle', class: 'sc-layer-label' }, g, ring.label);
      if (ring.sub) svg('text', { x: cx, y: ring.inner ? cy + 16 : cy - ring.r + 46, 'text-anchor': 'middle', class: 'sc-layer-sub' }, g, ring.sub);
      return g;
    });
  }

  var S = { svg: svg, terminal: terminal, seg: seg, lerp: lerp, ease: ease, fade: fade, draw: draw, along: along, layers: layers, highlight: highlight, clamp: clamp };
  var registry = {};

  function mount(host, def) {
    var chapters = def.chapters && def.chapters.length ? def.chapters : [{ t: 0, title: def.title || '', caption: '' }];
    var beats = def.beats || [];
    var total = def.total || Math.max.apply(null, beats.map(function (b) { return b.t + (b.d || 0); }).concat([0])) + 1200;
    host.classList.add('sc-player');
    host.tabIndex = 0;
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', V.tr('scene', { title: def.title || '' }));
    host.innerHTML = '<div class="sc-stage" aria-hidden="true"><div class="sc-title">' + esc(def.title || '') + '</div></div>' +
      '<div class="sc-side" aria-hidden="true"></div><div class="sc-cap"></div>';
    var stage = host.querySelector('.sc-stage'), side = host.querySelector('.sc-side'), cap = host.querySelector('.sc-cap');
    var root = svg('svg', { viewBox: '0 0 960 540', class: 'sc-svg', focusable: 'false' }, stage);
    var refs = def.setup(stage, S, root);
    var terms = stage._terms || [];
    var narrate = false, failed = false;

    function showCap(k) {
      var c = chapters[k];
      cap.innerHTML = '<b>' + esc(c.title || '') + '</b> ' + (narrate ? '' : sanitize(c.caption || ''));
    }
    var tl = L.timeline({
      host: host, total: total, chapters: chapters, prefix: 'sc', keyStep: 1000,
      ui: { play: true, scrub: true, time: true, narration: chapters.some(function (c) { return c.say || c.caption; }), fullscreen: host, chapters: true },
      onSeek: function (t, info) {
        var reduced = info.reduced;
        for (var i = 0; i < beats.length; i++) {
          var b = beats[i], p = b.d ? clamp((t - b.t) / b.d) : t >= b.t ? 1 : 0;
          if (reduced) p = p > 0 ? 1 : 0;
          b.f(refs, p);
        }
        terms.forEach(function (x) { x.render(); });
        if (info.changed && !failed) showCap(info.chapter);
      },
      onNarration: function (on) { narrate = on; showCap(Math.max(0, tl.chapter())); },
      onError: function (e, t) { failed = true; cap.textContent = V.tr('sceneError', { t: (t / 1000).toFixed(1) }); },
    });
    host.appendChild(tl.el);
    host.appendChild(tl.chapters);

    // Transcript: every chapter's title and caption, readable without playing anything.
    var det = document.createElement('details'); det.className = 'sc-transcript';
    var sum = document.createElement('summary'); sum.textContent = V.tr('transcript');
    var ol = document.createElement('ol');
    chapters.forEach(function (c) {
      var li = document.createElement('li'), b = document.createElement('b'), span = document.createElement('span');
      b.textContent = c.title || ''; span.innerHTML = sanitize(c.caption || '');
      li.append(b, ' ', span); ol.appendChild(li);
    });
    det.append(sum, ol); host.appendChild(det);

    var poster = typeof def.poster === 'number' ? clamp(def.poster, 0, total) : def.poster === 'start' ? 0 : total;
    tl.set(poster);
    cap.setAttribute('aria-live', 'polite'); // after the first caption, so page load doesn't announce it

    // Phone layout: below 480px the 960-wide stage would shrink text to ~5px. Crop the SVG to the
    // mechanism and move terminals under the stage at a fixed, readable size.
    var focus = null, phone = false;
    terms.forEach(function (x) { x.el.style.setProperty('--sc-lines', String(Math.max(1, x.lines.length))); });
    function setPhone(on) {
      if (on === phone) return;
      phone = on;
      host.classList.toggle('sc-phone', on);
      terms.forEach(function (x) { (on ? side : stage).appendChild(x.el); });
      if (on && !focus) {
        if (def.phone && def.phone.focus) focus = def.phone.focus;
        else { var bb = root.getBBox(); focus = bb.width > 0 ? [bb.x - 10, bb.y - 44, bb.width + 20, bb.height + 54] : [0, 0, 960, 540]; } // extra top room for the title
        focus = focus.map(function (v) { return Math.round(v); });
      }
      root.setAttribute('viewBox', on ? focus.join(' ') : '0 0 960 540');
      stage.style.aspectRatio = on ? focus[2] + ' / ' + focus[3] : '';
      tl.render();
    }
    var check = function () { setPhone(host.getBoundingClientRect().width < PHONE && host.getBoundingClientRect().width > 0); };
    check();
    var ro = 'ResizeObserver' in window ? new ResizeObserver(check) : null;
    if (ro) ro.observe(host);
    return { timeline: tl, destroy: function () { tl.destroy(); if (ro) ro.disconnect(); } };
  }

  function mountById(el) {
    if (el._lcScene) return el._lcScene;
    var id = el.getAttribute('data-scene'), def = registry[id];
    if (!def) {
      console.error('[learncraft] Missing scene: ' + id + ' (is scenes-NNNN.js loaded after scene.js?)');
      el.innerHTML = '<p class="lc-error" role="alert">Missing scene: ' + esc(id) + '</p>';
      return null;
    }
    el._lcScene = mount(el, def);
    return el._lcScene;
  }

  window.Scene = { S: S, register: function (id, def) { registry[id] = def; }, mount: mountById };
  L.register('scene', { mount: function (el) { return mountById(el); } });
  L.ready(function () {
    document.querySelectorAll('.scene[data-scene]:not([data-lc])').forEach(function (el) {
      L.mount(el, 'scene "' + el.getAttribute('data-scene') + '"', mountById);
    });
  });
})();
