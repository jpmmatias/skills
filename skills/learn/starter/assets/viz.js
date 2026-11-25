// viz.js: shared visualization and motion primitives. Classic script, ES2017, no dependencies.
// Load after core.js and before diagram.js, scene.js and any lesson module that uses these.
//
// Learncraft.timeline(opts) → player
//   The one time-based player behind scene.js, the stepper and flow graphs. A view is a pure
//   function of time: the player calls opts.onSeek(t, info) and the view sets absolute state.
//   opts: { host,                       element that gets the keys and is watched for visibility
//           total, chapters: [{ t, title, caption?, say? }],   ms; chapter t is its start
//           onSeek(t, info),            info = { chapter, progress (0..1 inside it), playing, reduced, changed }
//           ui: { play, prev, next, scrub, time, counter, chapters, narration, fullscreen: el },
//           prefix: 'sc',               class prefix for the controls (sc-play, sc-scrub, …)
//           keyStep: 1000 | 'chapter',  what ←/→ on the host do
//           segment: ms,                Next/chapter buttons play only this long into a chapter
//           wrap, counterText(k), onNarration(on), onError(e) }
//   player: { el, seek(t), play(), pause(), toggle(), step(±1), go(k), replay(), time(), chapter(), playing(), destroy() }
//   Rules it enforces: pauses below 25% visible or on a hidden tab and
//   resumes from the paused time (ratio-based: see watch()); frame delta ≤ 100 ms; reduced motion = chapter stepping with no rAF;
//   speechSynthesis is feature-detected on every access, utterances get COURSE.lang or <html lang>, and
//   speech is cancelled on pause or hide; the scrub moves 1% per arrow and carries aria-valuetext
//   "4.5 of 21.5 seconds, chapter 2: Title"; host keys: Space play/pause, ←/→ ±1 s, PageUp/PageDown
//   chapter, Home/End; the narration button has a text name and aria-pressed; fullscreen is hidden
//   where unsupported.
//
// Learncraft.paramSlider({ label, min, max, step, value, format(v), valuetext(v), onInput(v) }) → { el, input, value(), set(v) }
//   Labelled range input with a visible <output> and aria-valuetext.
//
// Learncraft.explorable(el, { params: [slider opts + id], seed, render(values, rng, width) → SVG string,
//                             describe(values) → text, label, target: { id, label, check(values) → { ok, msg } } })
//   "Change a variable, watch the picture": re-renders on input (one frame), the figure's text alternative
//   is describe(values), and the same text is announced 600 ms after the learner stops moving. render
//   gets a fresh Learncraft.rng(seed) each time, so equal values and seed give identical markup.
//   width is the container width (280–760) so 12px SVG text renders at 12px on phones. With target,
//   a Check button grades the values and records the first attempt (ctx.record, else
//   Learncraft.recordPractice(id, ok) when present, else window.Progress.record(id, ok) from practice.js).
//
// Learncraft.histogram({ counts, labels, expected?, width, height, xLabel, yLabel, note }) → SVG string
//   Bars for counts, optional expected values as a dashed line with dots, labelled directly.
//
// Learncraft.viz: { svg(tag, attrs, parent, text), clamp, lerp, ease, easeOut, tween(ms, fn), uid(prefix),
//                   fmt(v, digits), tr(key, vars), normal(rng), int(rng, lo, hi), pick(rng, arr), shuffle(rng, arr),
//                   width(el), onResize(el, fn) }
(function () {
  'use strict';
  var L = window.Learncraft;
  if (!L) { console.error('viz.js: load assets/core.js first'); return; }
  var NS = 'http://www.w3.org/2000/svg';
  var STR = {
    en: { play: 'Play', pause: 'Pause', replay: 'Replay', nextChapter: 'Next chapter', back: 'Back', next: 'Next', start: 'Start',
      narration: 'Narration', fullscreen: 'Full screen', timeline: 'Timeline', chapters: 'Chapters',
      valuetext: '{t} of {total} seconds, chapter {k}: {title}', step: 'Step {k} of {n}', overview: 'Overview',
      transcript: 'Transcript', scene: 'Animated explainer: {title}', check: 'Check', sceneError: 'This scene stopped at {t} s because of an error.' },
    pt: { play: 'Reproduzir', pause: 'Pausar', replay: 'Repetir', nextChapter: 'Próximo capítulo', back: 'Voltar', next: 'Avançar', start: 'Começar',
      narration: 'Narração', fullscreen: 'Tela cheia', timeline: 'Linha do tempo', chapters: 'Capítulos',
      valuetext: '{t} de {total} segundos, capítulo {k}: {title}', step: 'Passo {k} de {n}', overview: 'Visão geral',
      transcript: 'Transcrição', scene: 'Animação explicativa: {title}', check: 'Verificar', sceneError: 'Esta cena parou em {t} s por causa de um erro.' },
  };
  // UI strings join core's tables as viz.<key>, so COURSE.strings['viz.play'] overrides them.
  if (L.i18n) Object.keys(STR).forEach(function (lg) {
    var t = L.i18n[lg] = L.i18n[lg] || {};
    Object.keys(STR[lg]).forEach(function (k) { if (!('viz.' + k in t)) t['viz.' + k] = STR[lg][k]; });
  });
  function lang() { return (window.COURSE && window.COURSE.lang) || document.documentElement.lang || 'en'; }
  function tr(key, vars) {
    var r = typeof L.t === 'function' ? L.t('viz.' + key, vars) : null;
    if (r && r !== 'viz.' + key) return r;
    var table = STR[lang().slice(0, 2).toLowerCase()] || STR.en;
    return String(table[key] || STR.en[key] || key).replace(/\{(\w+)\}/g, function (m, k) { return vars && k in vars ? vars[k] : m; });
  }
  var clamp = function (v, a, b) { return Math.min(b == null ? 1 : b, Math.max(a == null ? 0 : a, v)); };
  var lerp = function (a, b, p) { return a + (b - a) * p; };
  var ease = function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  var easeOut = function (p) { return 1 - Math.pow(1 - p, 3); };
  var rm = function () { return typeof L.reducedMotion === 'function' ? L.reducedMotion() : false; };
  var n = 0;
  var uid = function (p) { return (p || 'lc') + '-' + (++n); };
  var fmt = function (v, d) { return (+v).toFixed(d == null ? 2 : d); };
  function svg(tag, attrs, parent, text) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs || {}) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }
  // Short learner-triggered transitions (≤ 1 s). Reduced motion: jump to the end state.
  function tween(ms, fn) {
    return new Promise(function (res) {
      if (rm() || ms <= 0) { fn(1); return res(); }
      var t0 = performance.now();
      (function tick(now) { var p = Math.min(1, (now - t0) / ms); fn(easeOut(p)); if (p < 1) requestAnimationFrame(tick); else res(); })(t0);
    });
  }
  function width(el) { var w = el.getBoundingClientRect().width; return Math.round(clamp(w || 640, 280, 760)); }
  // Calls fn(width) when the rounded width changes; returns { disconnect }.
  function onResize(el, fn) {
    if (!('ResizeObserver' in window)) return { disconnect: function () {} };
    var last = width(el), timer = 0;
    var ro = new ResizeObserver(function () { clearTimeout(timer); timer = setTimeout(function () { var w = width(el); if (w !== last) { last = w; fn(w); } }, 120); });
    ro.observe(el);
    return { disconnect: function () { ro.disconnect(); } };
  }
  // Seeded sampling helpers: always pass an rng from Learncraft.rng(seed), never Math.random.
  function normal(rng) { var u = 1 - rng(), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function int(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function shuffle(rng, arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  // Visible = at least 25% on screen and the tab not hidden. (Learncraft.observeVisibility reports
  // isIntersecting, which stays true down to 1px, so players watch the ratio themselves.)
  function watch(el, cb) {
    var inView = true, last = null;
    var emit = function () { var v = inView && !document.hidden; if (v !== last) { last = v; cb(v); } };
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      inView = es[es.length - 1].intersectionRatio >= 0.249; emit();
    }, { threshold: [0, 0.25, 0.5, 1] }) : null;
    if (io) io.observe(el);
    document.addEventListener('visibilitychange', emit);
    return { disconnect: function () { if (io) io.disconnect(); document.removeEventListener('visibilitychange', emit); } };
  }

  // ---------- speech (guarded on every access) ----------
  function synth() { try { return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function' ? window.speechSynthesis : null; } catch (e) { return null; } }
  function plain(s) { var d = document.createElement('div'); d.innerHTML = (L.sanitize || L.esc)(s || ''); return d.textContent; }
  function speak(text) {
    var s = synth(); if (!s) return;
    try { s.cancel(); var u = new window.SpeechSynthesisUtterance(plain(text)); u.lang = lang(); u.rate = 1.02; s.speak(u); } catch (e) { /* no voice */ }
  }
  function hush() { var s = synth(); try { if (s) s.cancel(); } catch (e) { /* ignore */ } }
  function speaking() { var s = synth(); try { return !!(s && s.speaking); } catch (e) { return false; } }

  var ICON = {
    play: '<path d="M6 4l14 8-14 8z"/>', pause: '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>',
    replay: '<path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/>', next: '<path d="M5 4l10 8-10 8zM17 4h2v16h-2z"/>',
    voice: '<path d="M4 9h4l5-4v14l-5-4H4zM16 8a5 5 0 0 1 0 8M18.5 5.5a8.5 8.5 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    full: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2"/>',
  };
  var icon = function (k) { return '<svg class="lc-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">' + ICON[k] + '</svg>'; };

  // ---------- timeline ----------
  function timeline(o) {
    var host = o.host, total = Math.max(1, +o.total || 1), ui = o.ui || {}, P = o.prefix || 'lc-tl';
    var ch = o.chapters && o.chapters.length ? o.chapters : [{ t: 0, title: '' }];
    var t = 0, playing = false, last = 0, raf = 0, cur = -1, narrate = false, autoPaused = false, segEnd = null, dead = false;
    var el = document.createElement('div');
    el.className = 'lc-tl ' + P + '-ctrl';
    function button(cls, label, html) {
      var b = document.createElement('button'); b.type = 'button'; b.className = P + '-' + cls;
      b.setAttribute('aria-label', label); b.innerHTML = html; el.appendChild(b); return b;
    }
    var bPrev = ui.prev ? button('prev', tr('back'), '<span aria-hidden="true">←</span> ' + L.esc(tr('back'))) : null;
    var bPlay = ui.play !== false ? button('play', tr('play'), icon('play')) : null;
    var counter = ui.counter ? el.appendChild(document.createElement('span')) : null;
    if (counter) counter.className = P + '-count';
    var bNext = ui.next ? button('next', tr('next'), L.esc(tr('next')) + ' <span aria-hidden="true">→</span>') : null;
    var scrub = null, timeEl = null, voice = null, full = null, chapWrap = null, chapBtns = [];
    if (ui.scrub) {
      scrub = document.createElement('input');
      scrub.type = 'range'; scrub.className = P + '-scrub'; scrub.min = 0; scrub.max = total;
      scrub.step = Math.max(1, Math.round(total / 100)); scrub.setAttribute('aria-label', tr('timeline'));
      el.appendChild(scrub);
    }
    if (ui.time) { timeEl = el.appendChild(document.createElement('span')); timeEl.className = P + '-time'; timeEl.setAttribute('aria-hidden', 'true'); }
    if (ui.narration && synth()) { // named by its visible text (WCAG 2.5.3); state is aria-pressed
      voice = button('voice', '', icon('voice') + '<span>' + L.esc(tr('narration')) + '</span>');
      voice.removeAttribute('aria-label'); voice.setAttribute('aria-pressed', 'false');
    }
    var fsEl = ui.fullscreen;
    if (fsEl && (document.fullscreenEnabled || document.webkitFullscreenEnabled) && (fsEl.requestFullscreen || fsEl.webkitRequestFullscreen)) full = button('full', tr('fullscreen'), icon('full'));
    if (ui.chapters) {
      chapWrap = document.createElement('div'); chapWrap.className = P + '-chapters';
      chapWrap.setAttribute('role', 'group'); chapWrap.setAttribute('aria-label', tr('chapters'));
      chapBtns = ch.map(function (c, i) {
        var b = document.createElement('button'); b.type = 'button';
        var num = document.createElement('b'); num.textContent = i + 1;
        b.append(num, ' ' + (c.title || ''));
        b.addEventListener('click', function () { go(i); });
        chapWrap.appendChild(b); return b;
      });
    }
    var chapAt = function (x) { var k = 0; for (var i = 0; i < ch.length; i++) if (x >= ch[i].t) k = i; return k; };
    var chapEnd = function (k) { return k + 1 < ch.length ? ch[k + 1].t - 1 : total; };

    function sync() {
      var k = cur < 0 ? 0 : cur, ended = t >= total, red = rm();
      if (bPlay) {
        var st = playing ? 'pause' : ended ? 'replay' : red ? 'next' : 'play';
        if (bPlay.dataset.state !== st) {
          bPlay.dataset.state = st;
          bPlay.innerHTML = icon(st === 'next' ? 'next' : st);
          bPlay.setAttribute('aria-label', tr(st === 'next' ? 'nextChapter' : st));
        }
      }
      if (bPrev) bPrev.setAttribute('aria-disabled', String(k === 0 && t <= chapEnd(0)));
      if (bNext) bNext.setAttribute('aria-disabled', String(!o.wrap && k === ch.length - 1));
      if (counter) counter.textContent = o.counterText ? o.counterText(k) : tr('step', { k: k + 1, n: ch.length });
      chapBtns.forEach(function (b, i) { if (i === k) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    }
    function seek(nt) {
      t = clamp(nt, 0, total);
      var k = chapAt(t), span = chapEnd(k) - ch[k].t, changed = k !== cur;
      cur = k;
      try {
        o.onSeek(t, { chapter: k, progress: span > 0 ? clamp((t - ch[k].t) / span) : 1, playing: playing, reduced: rm(), changed: changed });
      } catch (e) {
        pause(); console.error('[learncraft] timeline frame failed at ' + Math.round(t) + ' ms:', e);
        if (o.onError) o.onError(e, t);
      }
      if (changed && playing && narrate) speak(ch[k].say || ch[k].caption || ch[k].title);
      if (scrub) {
        scrub.value = Math.round(t);
        scrub.setAttribute('aria-valuetext', tr('valuetext', { t: (t / 1000).toFixed(1), total: (total / 1000).toFixed(1), k: k + 1, title: ch[k].title || '' }));
      }
      if (timeEl) timeEl.textContent = (t / 1000).toFixed(1) + ' s / ' + (total / 1000).toFixed(1) + ' s';
      sync();
    }
    function frame(now) {
      if (!playing || dead) return;
      var nt = t + clamp(now - last, 0, 100); last = now;
      // With narration on, hold just before the next chapter until the voice finishes.
      if (narrate && speaking()) nt = Math.min(nt, (cur + 1 < ch.length ? ch[cur + 1].t : total) - 1);
      if (segEnd != null && nt >= segEnd) { seek(segEnd); return pause(); }
      seek(nt);
      if (t >= total) return pause();
      raf = requestAnimationFrame(frame);
    }
    function run() { playing = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); sync(); }
    function play() {
      autoPaused = false; segEnd = null;
      if (rm()) { // chapter stepping: show the end of the next chapter, no animation loop
        var k = chapAt(t), nk = t >= total ? 0 : t >= chapEnd(k) ? Math.min(ch.length - 1, k + 1) : k;
        cur = -1; seek(chapEnd(nk));
        if (narrate) speak(ch[nk].say || ch[nk].caption || ch[nk].title);
        return;
      }
      if (t >= total) { cur = -1; seek(0); }
      run();
      if (narrate) speak(ch[cur].say || ch[cur].caption || ch[cur].title);
    }
    function pause() { playing = false; segEnd = null; cancelAnimationFrame(raf); hush(); sync(); }
    function toggle() { if (playing) { autoPaused = false; pause(); } else play(); }
    // Go to chapter k: with motion, play just that chapter (or opts.segment ms of it); else show its end.
    function go(k, still) {
      k = clamp(k, 0, ch.length - 1); autoPaused = false;
      if (rm() || still) { pause(); cur = -1; seek(chapEnd(k)); if (narrate && !still) speak(ch[k].say || ch[k].caption || ch[k].title); return; }
      pause(); cur = -1; seek(ch[k].t);
      segEnd = o.segment ? Math.min(chapEnd(k), ch[k].t + o.segment) : chapEnd(k);
      run();
      if (narrate) speak(ch[k].say || ch[k].caption || ch[k].title);
    }
    function step(dir) {
      var k = chapAt(t);
      if (dir > 0) { if (k + 1 < ch.length) go(k + 1); else if (o.wrap) go(0); }
      else if (k > 0) go(k - 1, true); else go(0, true);
    }
    function userSeek(nt) { autoPaused = false; var was = playing && !rm(); pause(); seek(nt); if (was) run(); }

    if (bPlay) bPlay.addEventListener('click', toggle);
    if (bPrev) bPrev.addEventListener('click', function () { if (bPrev.getAttribute('aria-disabled') !== 'true') step(-1); });
    if (bNext) bNext.addEventListener('click', function () { if (bNext.getAttribute('aria-disabled') !== 'true') step(1); });
    if (scrub) {
      scrub.addEventListener('input', function () { autoPaused = false; pause(); seek(+scrub.value); });
      scrub.addEventListener('keydown', function (e) {
        if (e.key === 'PageDown' || e.key === 'PageUp') { e.preventDefault(); e.stopPropagation(); step(e.key === 'PageDown' ? 1 : -1); }
      });
    }
    if (voice) voice.addEventListener('click', function () {
      narrate = !narrate; voice.setAttribute('aria-pressed', String(narrate));
      if (!narrate) hush(); else if (playing) speak(ch[cur].say || ch[cur].caption || ch[cur].title);
      if (o.onNarration) o.onNarration(narrate);
    });
    if (full) full.addEventListener('click', function () {
      var d = document;
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else (fsEl.requestFullscreen || fsEl.webkitRequestFullscreen).call(fsEl);
    });
    function onKey(e) {
      if (/^(INPUT|BUTTON|SELECT|TEXTAREA|SUMMARY|A)$/.test(e.target.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
      var byChapter = o.keyStep === 'chapter', s = byChapter ? 0 : (+o.keyStep || 1000);
      switch (e.key) {
        case ' ': toggle(); break;
        case 'ArrowRight': if (byChapter) step(1); else userSeek(t + s); break;
        case 'ArrowLeft': if (byChapter) step(-1); else userSeek(t - s); break;
        case 'PageDown': step(1); break;
        case 'PageUp': step(-1); break;
        case 'Home': userSeek(0); break;
        case 'End': userSeek(total); break;
        default: return;
      }
      e.preventDefault();
    }
    if (host) host.addEventListener('keydown', onKey);
    var vis = host ? watch(host, function (visible) {
      if (!visible && playing) { var seg = segEnd; pause(); autoPaused = true; segEnd = seg; }
      else if (visible && autoPaused) { autoPaused = false; run(); }
    }) : null;

    return {
      el: el, chapters: chapWrap, seek: function (x) { userSeek(x); }, play: play, pause: function () { autoPaused = false; pause(); },
      toggle: toggle, step: step, go: go, replay: function () { cur = -1; seek(0); play(); },
      time: function () { return t; }, chapter: function () { return cur; }, playing: function () { return playing; },
      total: total, chapterEnd: chapEnd, render: function () { seek(t); }, set: function (x) { seek(x); },
      destroy: function () { dead = true; pause(); if (host) host.removeEventListener('keydown', onKey); if (vis && vis.disconnect) vis.disconnect(); },
    };
  }

  // ---------- param slider ----------
  function paramSlider(o) {
    var id = uid('lc-param'), f = o.format || function (v) { return String(v); };
    var wrap = document.createElement('div'); wrap.className = 'lc-param';
    var lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = o.label;
    var out = document.createElement('output'); out.htmlFor = id; out.className = 'lc-param-out';
    var input = document.createElement('input');
    input.type = 'range'; input.id = id; input.min = o.min; input.max = o.max; input.step = o.step || 'any';
    wrap.append(lab, out, input);
    function show(v) { out.textContent = f(v); input.setAttribute('aria-valuetext', o.valuetext ? o.valuetext(v) : f(v)); }
    input.addEventListener('input', function () { var v = +input.value; show(v); if (o.onInput) o.onInput(v); });
    input.value = o.value; show(+input.value);
    return { el: wrap, input: input, value: function () { return +input.value; }, set: function (v) { input.value = v; show(+input.value); } };
  }

  // ---------- explorable ----------
  function explorable(el, o, ctx) {
    ctx = ctx || {};
    var values = {}, frameReq = 0, sayTimer = 0, w = width(el), recorded = false;
    var fig = document.createElement('div'); fig.className = 'lc-ex-fig'; fig.setAttribute('role', 'img');
    var controls = document.createElement('div'); controls.className = 'lc-ex-controls';
    var readout = document.createElement('p'); readout.className = 'lc-ex-readout';
    var sliders = (o.params || []).map(function (p) {
      values[p.id] = p.value;
      var s = paramSlider({ label: p.label, min: p.min, max: p.max, step: p.step, value: p.value, format: p.format, valuetext: p.valuetext,
        onInput: function (v) { values[p.id] = v; schedule(true); } });
      controls.appendChild(s.el); return s;
    });
    el.classList.add('lc-explorable');
    el.replaceChildren(fig, readout, controls);
    function draw() {
      frameReq = 0;
      var out = o.render(values, L.rng(o.seed == null ? 1 : o.seed), w);
      if (typeof out === 'string') fig.innerHTML = out; else fig.replaceChildren(out);
      var text = o.describe ? o.describe(values) : '';
      fig.setAttribute('aria-label', (o.label ? o.label + '. ' : '') + text);
      readout.textContent = text;
    }
    function schedule(user) {
      if (!frameReq) frameReq = requestAnimationFrame(draw);
      if (user && o.describe) { clearTimeout(sayTimer); sayTimer = setTimeout(function () { L.announce(o.describe(values)); }, 600); }
    }
    if (o.target) {
      var row = document.createElement('div'); row.className = 'lc-ex-check';
      var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = o.target.label || tr('check');
      var fb = document.createElement('p'); fb.className = 'lc-ex-fb'; fb.setAttribute('role', 'status');
      btn.addEventListener('click', function () {
        var r = o.target.check(values) || {};
        fb.className = 'lc-ex-fb ' + (r.ok ? 'ok' : 'bad');
        fb.textContent = (r.ok ? '✓ ' : '✗ ') + (r.msg || '');
        if (!recorded) {
          recorded = true;
          if (typeof ctx.record === 'function') ctx.record(!!r.ok);
          else if (typeof L.recordPractice === 'function') L.recordPractice(o.target.id || el.id, !!r.ok);
          else if (window.Progress && typeof window.Progress.record === 'function') window.Progress.record(o.target.id || el.id, !!r.ok);
        }
      });
      row.append(btn, fb); el.appendChild(row);
      el.setAttribute('data-practice', '');
    }
    draw();
    var ro = onResize(el, function (nw) { w = nw; schedule(false); });
    return {
      values: values, update: function () { schedule(false); },
      set: function (id, v) { values[id] = v; sliders.forEach(function (s, i) { if (o.params[i].id === id) s.set(v); }); schedule(false); },
      destroy: function () { ro.disconnect(); cancelAnimationFrame(frameReq); clearTimeout(sayTimer); },
    };
  }

  // ---------- histogram (returns deterministic SVG markup) ----------
  function histogram(o) {
    var esc = L.esc, W = o.width || 640, H = o.height || 240, c = o.counts, nb = c.length, ex = o.expected;
    var top = 18, bottom = 44, left = 44, right = 12, ph = H - top - bottom, pw = W - left - right;
    var max = Math.max.apply(null, c.concat(ex || [], [1])) * 1.08;
    var textW = function (t) { return String(t).length * 7; };
    var bw = pw / nb, y = function (v) { return top + ph * (1 - v / max); }, f1 = function (v) { return v.toFixed(1); };
    var s = '<svg class="dg lc-hist" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
    var step = Math.pow(10, Math.floor(Math.log10(max / 3))), tick = [1, 2, 5, 10].map(function (m) { return m * step; }).filter(function (v) { return max / v <= 5; })[0];
    for (var v = 0; v <= max; v += tick) {
      s += '<line class="dg-grid" x1="' + left + '" x2="' + (W - right) + '" y1="' + f1(y(v)) + '" y2="' + f1(y(v)) + '"/>' +
        '<text class="dg-num" x="' + (left - 6) + '" y="' + f1(y(v) + 4) + '" text-anchor="end">' + Math.round(v * 100) / 100 + '</text>';
    }
    var every = Math.ceil(nb / Math.max(1, Math.floor(pw / 34)));
    c.forEach(function (v, i) {
      var x = left + i * bw;
      s += '<rect class="dg-bar" x="' + f1(x + 1) + '" y="' + f1(y(v)) + '" width="' + f1(Math.max(1, bw - 2)) + '" height="' + f1(top + ph - y(v)) + '"/>';
      if (o.labels && i % every === 0) s += '<text class="dg-num" x="' + f1(x + bw / 2) + '" y="' + (top + ph + 16) + '" text-anchor="middle">' + esc(o.labels[i]) + '</text>';
    });
    if (ex) {
      s += '<polyline class="dg-expected" points="' + ex.map(function (v, i) { return f1(left + (i + 0.5) * bw) + ',' + f1(y(v)); }).join(' ') + '"/>';
      ex.forEach(function (v, i) { s += '<circle class="dg-expected-dot" r="3" cx="' + f1(left + (i + 0.5) * bw) + '" cy="' + f1(y(v)) + '"/>'; });
      // Key in the top-right corner, on the axis-title row: never collides with bars or the line.
      var kx = W - right - textW(o.expectedLabel || 'expected');
      s += '<line class="dg-expected" x1="' + f1(kx - 30) + '" x2="' + f1(kx - 6) + '" y1="7" y2="7"/>' +
        '<text class="dg-expected-lab" x="' + (W - right) + '" y="11" text-anchor="end">' + esc(o.expectedLabel || 'expected') + '</text>';
    }
    s += '<line class="dg-axis" x1="' + left + '" x2="' + (W - right) + '" y1="' + (top + ph) + '" y2="' + (top + ph) + '"/>';
    if (o.xLabel) s += '<text class="dg-cap" x="' + (W - right) + '" y="' + (H - 6) + '" text-anchor="end">' + esc(o.xLabel) + '</text>';
    if (o.yLabel) s += '<text class="dg-cap" x="' + left + '" y="11">' + esc(o.yLabel) + '</text>';
    return s + '</svg>';
  }

  L.timeline = timeline;
  L.paramSlider = paramSlider;
  L.explorable = explorable;
  L.histogram = histogram;
  L.viz = { svg: svg, clamp: clamp, lerp: lerp, ease: ease, easeOut: easeOut, tween: tween, uid: uid, fmt: fmt, tr: tr, watch: watch,
    normal: normal, int: int, pick: pick, shuffle: shuffle, width: width, onResize: onResize, reducedMotion: rm };
})();
