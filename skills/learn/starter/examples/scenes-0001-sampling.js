// Worked example of a motion scene (from the "Building Reliable AI Agents" course, Lesson 1).
// Embed with <div class="scene" data-scene="one-prompt-many-answers"></div>, then load assets/scene.js and this file.
// Real data: the Thinking Machines Lab experiment (Qwen3-235B, 1,000 runs at temperature 0,
// 80 unique completions, split at token 103 into 992 "Queens, New York" / 8 "New York City").
// Illustrative (labelled on screen): the triage token probabilities, the near-tie values, the 19/20 rate.

Scene.register('one-prompt-many-answers', {
  title: 'One prompt, many answers',
  setup(stage, S, root) {
    const term = S.terminal(stage, { x: 3, y: 10, w: 43, h: 84, title: 'labs/01-variance — zsh' });

    // --- sampling (top right) ---
    const model = S.svg('g', {}, root);
    S.svg('rect', { x: 470, y: 62, width: 120, height: 56, rx: 6, class: 'sc-node-hot' }, model);
    S.svg('text', { x: 530, y: 96, 'text-anchor': 'middle', class: 'sc-big', 'font-size': 20 }, model, 'LLM');
    const ctx = S.svg('text', { x: 610, y: 84, class: 'sc-mono' }, root, 'next token after');
    const ctx2 = S.svg('text', { x: 610, y: 106, class: 'sc-mono sc-gold' }, root, '{"intent":"');
    const tempT = S.svg('text', { x: 930, y: 84, 'text-anchor': 'end', class: 'sc-muted' }, root, '');
    const barsG = S.svg('g', {}, root);
    const toks = ['refund', 'complaint', 'return'];
    const bars = toks.map((k, i) => {
      const y = 140 + i * 40;
      S.svg('text', { x: 620, y: y + 18, 'text-anchor': 'end', class: 'sc-mono' }, barsG, k);
      S.svg('rect', { x: 630, y, width: 260, height: 24, rx: 4, class: 'sc-track' }, barsG);
      const bar = S.svg('rect', { x: 630, y, width: 0, height: 24, rx: 4, class: i === 0 ? 'sc-win' : 'sc-bar' }, barsG);
      const val = S.svg('text', { x: 900, y: y + 18, class: 'sc-mono' }, barsG, '');
      return { bar, val, y };
    });
    S.svg('text', { x: 630, y: 274, class: 'sc-muted', 'font-size': 12 }, barsG, 'illustrative probabilities');
    const pick = S.svg('rect', { x: 520, y: 0, width: 420, height: 32, rx: 6, fill: 'none', style: 'stroke: var(--sc-gold); stroke-width: 2.5' }, root);
    const paths = bars.map((b) => S.svg('path', { d: `M 590 90 C 610 90, 600 ${b.y + 12}, 625 ${b.y + 12}`, fill: 'none', stroke: 'none' }, root));
    const packet = S.svg('circle', { r: 7, class: 'sc-packet' }, root);

    // --- batching (bottom right) ---
    const server = S.svg('g', {}, root);
    S.svg('rect', { x: 470, y: 300, width: 470, height: 220, rx: 8, class: 'sc-node' }, server);
    S.svg('text', { x: 486, y: 324, class: 'sc-muted' }, server, 'inference server · temperature 0');
    const slots = [];
    for (let i = 0; i < 32; i++) {
      const x = 486 + (i % 8) * 22, y = 340 + Math.floor(i / 8) * 22;
      slots.push(S.svg('rect', { x, y, width: 18, height: 18, rx: 3, class: i === 0 ? 'sc-win' : 'sc-bar' }, server));
    }
    const batchT = S.svg('text', { x: 486, y: 450, class: 'sc-mono sc-gold' }, server, '');
    S.svg('text', { x: 486, y: 470, class: 'sc-muted', 'font-size': 12 }, server, 'gold = your request');
    const tie = ['"Queens"', '"New York City"'].map((k, i) => {
      const y = 350 + i * 34;
      S.svg('text', { x: 790, y: y - 4, 'text-anchor': 'middle', class: 'sc-mono', 'font-size': 12 }, server, k);
      S.svg('rect', { x: 700, y, width: 180, height: 14, rx: 3, class: 'sc-track' }, server);
      return S.svg('rect', { x: 700, y, width: 90, height: 14, rx: 3, class: 'sc-bar' }, server);
    });
    S.svg('text', { x: 700, y: 430, class: 'sc-muted', 'font-size': 12 }, server, 'token 103 · a near-tie (illustrative)');
    const real = S.svg('text', { x: 486, y: 504, class: 'sc-mono' }, server, '');

    const badge = S.svg('g', {}, root);
    S.svg('rect', { x: 520, y: 382, width: 370, height: 48, rx: 24, class: 'sc-badge' }, badge);
    S.svg('text', { x: 705, y: 412, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700 }, badge, 'grade the rate, not one roll');

    return { term, model, ctx, ctx2, tempT, barsG, bars, pick, paths, packet, server, slots, batchT, tie, real, badge };
  },
  beats: (() => {
    const { fade, ease, lerp } = Scene.S;
    const setBars = (r, vals) => r.bars.forEach((b, i) => {
      b.bar.setAttribute('width', Math.max(0, 260 * vals[i]));
      b.val.textContent = vals[i] > 0.001 ? vals[i].toFixed(2) : '0';
    });
    const HOT = [0.7, 0.2, 0.1], COLD = [1, 0, 0];
    const fly = (r, i, p) => {
      const pt = Scene.S.along(r.paths[i], ease(p));
      r.packet.setAttribute('cx', pt.x); r.packet.setAttribute('cy', pt.y);
      r.packet.style.opacity = p > 0 && p < 1 ? 1 : 0;
    };
    const pickRow = (r, i, p) => { r.pick.setAttribute('y', r.bars[i].y - 4); r.pick.style.opacity = p; };
    return [
      // 1 · token by token
      { t: 0, d: 700, f: (r, p) => r.term.set(0, 'cmd', 'PROVIDER=ollama TEMP=0.8 npm run trials', p) },
      { t: 0, d: 400, f: (r, p) => { fade(r.model, p); fade(r.ctx, p); fade(r.ctx2, p); fade(r.barsG, p); r.tempT.textContent = 'temperature 0.8'; } },
      { t: 600, d: 1000, f: (r, p) => setBars(r, HOT.map((v) => v * ease(p))) },
      { t: 2000, d: 700, f: (r, p) => fly(r, 0, p) },
      { t: 2700, d: 1, f: (r, p) => pickRow(r, 0, p) },
      { t: 2900, d: 500, f: (r, p) => r.term.set(1, 'out', [{ t: 'trial 1  {"intent":"', c: 'muted' }, { t: 'refund', c: 'ok' }, { t: '",…}  ✓', c: 'muted' }], p) },
      // 2 · the die is rolled
      { t: 4600, d: 700, f: (r, p) => { if (p > 0) fly(r, 1, p); } },
      { t: 5300, d: 1, f: (r, p) => { if (p > 0) pickRow(r, 1, 1); } },
      { t: 5500, d: 500, f: (r, p) => r.term.set(2, 'out', [{ t: 'trial 2  {"intent":"', c: 'muted' }, { t: 'complaint', c: 'gold' }, { t: '",…}  ✗', c: 'muted' }], p) },
      // 3 · temperature 0
      { t: 8000, d: 600, f: (r, p) => r.term.set(3, 'cmd', 'TEMP=0 npm run trials', p) },
      { t: 8200, d: 900, f: (r, p) => { if (p > 0) { setBars(r, HOT.map((v, i) => lerp(v, COLD[i], ease(p)))); r.tempT.textContent = 'temperature 0'; pickRow(r, 0, 1); } } },
      ...[0, 1, 2].map((k) => ({ t: 9300 + k * 450, d: 400, f: (r, p) => r.term.set(4 + k, 'out', [{ t: `trial ${k + 1}  {"intent":"`, c: 'muted' }, { t: 'refund', c: 'ok' }, { t: '",…}  ✓', c: 'muted' }], p) })),
      // 4 · batching tips the scale
      { t: 12000, d: 400, f: (r, p) => fade(r.server, p) },
      { t: 12400, d: 2200, f: (r, p) => {
        const n = p > 0.5 ? Math.round(lerp(1, 32, (p - 0.5) * 2)) : 1;
        r.slots.forEach((s, i) => (s.style.opacity = i < n ? 1 : 0.12));
        r.batchT.textContent = `batch size ${n}`;
        const flip = n > 16; // the numerics shift with batch size, so the near-tie can flip
        r.tie[0].setAttribute('width', flip ? 88 : 92); r.tie[1].setAttribute('width', flip ? 92 : 88);
        r.tie[0].setAttribute('class', flip ? 'sc-bar' : 'sc-win'); r.tie[1].setAttribute('class', flip ? 'sc-win' : 'sc-bar');
      } },
      { t: 15000, d: 700, f: (r, p) => { r.real.textContent = p > 0 ? '1,000 runs → 80 unique · 992 vs 8 at token 103' : ''; fade(r.real, p); } },
      { t: 15000, d: 500, f: (r, p) => r.term.set(7, 'out', [{ t: '# Thinking Machines, real data, temp 0:', c: 'muted' }], p) },
      { t: 15500, d: 500, f: (r, p) => r.term.set(8, 'out', [{ t: '1,000 runs → ', c: 'muted' }, { t: '80 unique completions', c: 'gold' }], p) },
      // 5 · so grade the rate
      { t: 18000, d: 500, f: (r, p) => { if (p > 0) r.server.style.opacity = lerp(1, 0.18, p); fade(r.badge, p); } },
      { t: 18200, d: 500, f: (r, p) => r.term.set(9, 'out', [{ t: '# many trials → grader → rate', c: 'muted' }], p) },
      { t: 18800, d: 700, f: (r, p) => r.term.set(10, 'out', [{ t: '✓✓✓✓✗✓✓✓✓✓ ✓✓✓✓✓✓✓✓✓✓', c: 'ok' }], p) },
      { t: 19600, d: 600, f: (r, p) => r.term.set(11, 'out', [{ t: 'pass rate ', c: 'muted' }, { t: '19/20 = 0.95', c: 'gold' }, { t: '  (illustrative)', c: 'muted' }], p) },
    ];
  })(),
  total: 21500,
  chapters: [
    { t: 0, title: 'Token by token', caption: 'The model doesn\'t return an answer. It returns <em>probabilities</em> for the next token, then samples one.',
      say: 'The model does not return an answer. It returns probabilities for the next token, and then samples one.' },
    { t: 4500, title: 'The die is rolled', caption: 'Same prompt, second trial: the 20% token wins this time. Nothing changed but the roll.',
      say: 'Same prompt, second trial. This time the twenty percent token wins. Nothing changed except the roll.' },
    { t: 8000, title: 'Temperature 0', caption: 'Temperature 0 means "always take the top token". In theory, that makes every trial identical.',
      say: 'Temperature zero means: always take the top token. In theory, that makes every trial identical.' },
    { t: 12000, title: 'Batching tips the scale', caption: 'But the server batches your request with others. The numbers shift with batch size, and a near-tie can flip. In a real run, 1,000 trials at temperature 0 gave <b>80</b> different completions.',
      say: 'But the server batches your request with other people\'s. The numbers shift slightly with batch size, and a near tie can flip. In a real experiment, a thousand runs at temperature zero produced eighty different completions.' },
    { t: 18000, title: 'Grade the rate', caption: 'So don\'t assert on one roll. Run many trials, grade each with properties, and report a pass rate.',
      say: 'So do not assert on one roll. Run many trials, grade each one, and report a pass rate.' },
  ],
});
