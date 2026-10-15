// Motion-scene player: narrated, scrubbable explainer animations (video-explainer style) inside lessons.
//
//   <div class="scene" data-scene="my-scene"></div>
//   <script src="../assets/scene.js"></script>
//   <script> Scene.register('my-scene', { title, total, setup(stage, S) { …return refs }, beats: […], chapters: […] }) </script>
//
// A scene is a pure function of time, so play, pause, scrub and chapter-jump all work:
//   setup(stage, S)  builds the SVG/terminal once and returns refs.
//   beats: [{ t, d, f(refs, p) }]   from time t (ms), over d ms, set ABSOLUTE state for progress p in 0..1.
//                                   f must be idempotent: the player calls every beat on every frame.
//   chapters: [{ t, title, caption, say }]   on-screen caption + optional narration (browser speech).
// Helpers on S: svg(tag, attrs, parent, text) · terminal(stage, box) · seg(p, a, b) · lerp · ease
//               fade(el, p) · draw(path, p) · along(path, p) → {x,y} · layers(svg, cx, cy, rings) · highlight(code)
// Watching earns no XP (it's consumption). Under prefers-reduced-motion, beats jump straight to their end state.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function svg(tag, attrs = {}, parent, text) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.append(n);
    return n;
  }
  const fade = (el, p) => { el.style.opacity = p; };
  function draw(path, p) {
    const len = path._len || (path._len = path.getTotalLength());
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len * (1 - p);
  }
  function along(path, p) {
    const len = path._len || (path._len = path.getTotalLength());
    return path.getPointAtLength(len * p);
  }

  // Syntax highlighting for shell / TS / JSON-ish snippets (works on partially typed text).
  const RE = /(\/\/.*$)|('(?:[^'\\]|\\.)*'?|"(?:[^"\\]|\\.)*"?|`[^`]*`?)|(\$[A-Za-z_]+)|\b(\d+(?:\.\d+)?)\b|\b(const|let|await|import|from|if|return|new|for|of)\b|([A-Za-z_]\w*)(?=\s*:)|([A-Za-z_]\w*)(?=\()/g;
  const CLS = [null, 'com', 'str', 'var', 'num', 'kw', 'key', 'fn'];
  function highlight(src) {
    let out = '', last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(src))) {
      if (m[0] === '') { RE.lastIndex++; continue; }
      out += esc(src.slice(last, m.index));
      const g = m.findIndex((x, i) => i > 0 && x !== undefined);
      out += `<span class="sc-${CLS[g]}">${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }

  // Terminal panel. Lines are set per beat: t.set(i, kind, content, p)
  //   kind 'cmd' (prompt + highlighted), 'code' (highlighted), 'out' (content = [{t, c}] with c '' | 'gold' | 'ok' | 'muted')
  function terminal(stage, { x, y, w, h, title = 'zsh' }) {
    const el = document.createElement('div');
    el.className = 'sc-term';
    Object.assign(el.style, { left: x + '%', top: y + '%', width: w + '%', height: h + '%' });
    el.innerHTML = `<div class="sc-term-bar"><i></i><i></i><i></i><span>${esc(title)}</span></div><pre class="sc-term-body"></pre>`;
    stage.append(el);
    const body = el.querySelector('pre'), lines = [];
    const api = {
      el,
      set(i, kind, content, p) { lines[i] = { kind, content, p }; },
      render() {
        let html = '';
        for (const L of lines) {
          if (!L || L.p <= 0) continue;
          let row;
          if (L.kind === 'out') {
            const total = L.content.reduce((n, s) => n + s.t.length, 0);
            let left = Math.ceil(total * L.p);
            row = L.content.map((s) => { const t = s.t.slice(0, Math.max(0, left)); left -= s.t.length; return t ? `<span class="sc-o-${s.c || 'plain'}">${esc(t)}</span>` : ''; }).join('');
          } else {
            const t = L.content.slice(0, Math.ceil(L.content.length * L.p));
            row = (L.kind === 'cmd' ? '<span class="sc-prompt">$</span> ' : '') + highlight(t);
          }
          html += row + (L.p < 1 ? '<span class="sc-cursor">▌</span>' : '') + '\n';
        }
        body.innerHTML = html;
      },
    };
    (stage._terms || (stage._terms = [])).push(api);
    return api;
  }

  // Concentric layers (shell ⊃ kernel ⊃ hardware style). rings: [{ r, label, sub, cls, inner }] painted in order, so pass the OUTERMOST first.
  function layers(root, cx, cy, rings) {
    return rings.map((ring) => {
      const g = svg('g', { class: 'sc-layer ' + (ring.cls || '') }, root);
      svg('circle', { cx, cy, r: ring.r }, g);
      // inner (core) rings are labelled at their centre; outer rings just inside their top edge
      svg('text', { x: cx, y: ring.inner ? cy - 4 : cy - ring.r + 26, 'text-anchor': 'middle', class: 'sc-layer-label' }, g, ring.label);
      if (ring.sub) svg('text', { x: cx, y: ring.inner ? cy + 16 : cy - ring.r + 46, 'text-anchor': 'middle', class: 'sc-layer-sub' }, g, ring.sub);
      return g;
    });
  }

  const S = { svg, terminal, seg, lerp, ease, fade, draw, along, layers, highlight, clamp };
  const registry = {};

  function mount(host, def) {
    host.classList.add('sc-player');
    host.tabIndex = 0;
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Animated explainer: ' + def.title);
    host.innerHTML =
      `<div class="sc-stage"><div class="sc-title">${esc(def.title)}</div></div>` +
      `<div class="sc-cap" aria-live="polite"></div>` +
      `<div class="sc-ctrl"><button class="sc-play" aria-label="Play">▶</button>` +
      `<input class="sc-scrub" type="range" min="0" step="10" aria-label="Timeline">` +
      `<span class="sc-time"></span><button class="sc-voice" title="Narration (browser voice)" aria-pressed="false">🔇</button>` +
      `<button class="sc-full" title="Full screen" aria-label="Full screen">⛶</button></div>` +
      `<div class="sc-chapters"></div>`;
    const stage = host.querySelector('.sc-stage');
    const root = svg('svg', { viewBox: '0 0 960 540', class: 'sc-svg' }, stage);
    const refs = def.setup(stage, S, root);
    const beats = def.beats, chapters = def.chapters;
    const total = def.total || Math.max(...beats.map((b) => b.t + (b.d || 0))) + 1200;
    const cap = host.querySelector('.sc-cap'), play = host.querySelector('.sc-play'), scrub = host.querySelector('.sc-scrub');
    const time = host.querySelector('.sc-time'), voice = host.querySelector('.sc-voice'), chapWrap = host.querySelector('.sc-chapters');
    scrub.max = total;
    const chapBtns = chapters.map((c, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<b>${i + 1}</b> ${esc(c.title)}`;
      b.onclick = () => { stop(); seek(RM ? chapEnd(i) : c.t); };
      chapWrap.append(b);
      return b;
    });
    const chapEnd = (i) => (i + 1 < chapters.length ? chapters[i + 1].t - 1 : total);
    const chapAt = (t) => { let k = 0; chapters.forEach((c, i) => { if (t >= c.t) k = i; }); return k; };

    let t = 0, playing = false, last = 0, narrate = false, curChap = -1, raf = 0;
    function seek(nt) {
      t = clamp(nt, 0, total);
      for (const b of beats) {
        let p = b.d ? clamp((t - b.t) / b.d) : t >= b.t ? 1 : 0;
        if (RM) p = p > 0 ? 1 : 0;
        b.f(refs, p);
      }
      (stage._terms || []).forEach((x) => x.render());
      const k = chapAt(t);
      if (k !== curChap) {
        curChap = k;
        showCap(k);
        chapBtns.forEach((b, i) => b.classList.toggle('on', i === k));
        if (playing && narrate) speak(chapters[k].say || chapters[k].caption);
      }
      scrub.value = t;
      time.textContent = `${(t / 1000).toFixed(1)}s / ${(total / 1000).toFixed(1)}s`;
    }
    // Redundancy principle: with narration on, show only the chapter title, not the same words twice.
    function showCap(k) { cap.innerHTML = `<b>${esc(chapters[k].title)}</b> ${narrate ? '' : chapters[k].caption}`; }
    function speak(text) {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ''));
      u.rate = 1.02;
      speechSynthesis.speak(u);
    }
    function frame(now) {
      if (!playing) return;
      let nt = t + (now - last); last = now;
      // With narration on, hold at a chapter boundary until the voice finishes.
      const next = chapters[curChap + 1];
      if (narrate && speechSynthesis.speaking) {
        const boundary = next ? next.t - 1 : total;
        if (nt >= boundary) nt = boundary;
      }
      seek(nt);
      if (t >= total) return stop(true);
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (RM) { // reduced motion: step chapter by chapter instead of animating
        const k = t >= total ? 0 : Math.min(chapters.length - 1, chapAt(t) + (t >= chapEnd(chapAt(t)) ? 1 : 0));
        curChap = -1; seek(chapEnd(k));
        if (narrate) speak(chapters[k].say || chapters[k].caption);
        return;
      }
      if (t >= total) { curChap = -1; seek(0); }
      playing = true; last = performance.now();
      play.textContent = '❚❚'; play.setAttribute('aria-label', 'Pause');
      const k = chapAt(t);
      if (narrate) speak(chapters[k].say || chapters[k].caption);
      raf = requestAnimationFrame(frame);
    }
    function stop(ended) {
      playing = false; cancelAnimationFrame(raf);
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      play.textContent = ended ? '↺' : '▶'; play.setAttribute('aria-label', ended ? 'Replay' : 'Play');
    }
    play.onclick = () => (playing ? stop() : start());
    scrub.oninput = () => { stop(); seek(+scrub.value); };
    voice.onclick = () => {
      narrate = !narrate;
      voice.textContent = narrate ? '🔊' : '🔇'; voice.setAttribute('aria-pressed', narrate);
      if (curChap >= 0) showCap(curChap);
      if (!narrate && 'speechSynthesis' in window) speechSynthesis.cancel();
    };
    host.querySelector('.sc-full').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : host.requestFullscreen?.());
    host.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === ' ') { e.preventDefault(); playing ? stop() : start(); }
      if (e.key === 'ArrowRight') { stop(); seek(chapters[Math.min(chapters.length - 1, curChap + 1)].t); }
      if (e.key === 'ArrowLeft') { stop(); seek(chapters[Math.max(0, curChap - 1)].t); }
    });
    // Poster frame: show the finished picture until the learner presses play (a static diagram on its own).
    seek(def.poster === 'start' ? 0 : total);
    play.textContent = '▶';
  }

  window.Scene = {
    S,
    register(id, def) { registry[id] = def; },
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.scene[data-scene]').forEach((el) => {
      const def = registry[el.dataset.scene];
      if (def) mount(el, def);
      else el.textContent = 'Missing scene: ' + el.dataset.scene;
    });
  });
})();
