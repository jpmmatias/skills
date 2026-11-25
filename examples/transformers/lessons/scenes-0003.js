// Lesson 3 motion scene: autoregressive generation, one sampled token per step.
// Embed with <div class="scene" data-scene="one-token-at-a-time"></div> after core.js, viz.js and scene.js.
// The mechanism (prompt → blocks → last position → logits → softmax → sample → append → repeat) follows the
// released GPT-2 sampling loop and nanoGPT's generate() (S5, S13). The 12 blocks and the end-of-text id 50256
// are GPT-2 facts (S5, S4). The STOP RULE in chapter 5 is not in S5 or S13: both loops simply run for a fixed
// number of tokens. Stopping at an end-of-text token or stop sequence is general serving practice (RESOURCES L3-C8, gap). Every PROBABILITY and every streamed word is ILLUSTRATIVE and labelled so on screen;
// the first distribution is softmax([3.0, 2.2, 1.8, 1.5, 0.5]), the same toy logits as the temperature explorable.
// Layout: the mechanism sits in x 20–500 so the phone crop (focus) keeps it readable; the terminal moves below.
Scene.register('one-token-at-a-time', {
  title: 'One token at a time',
  poster: 'end',
  phone: { focus: [12, 8, 496, 516] },
  setup(stage, S, root) {
    const term = S.terminal(stage, { x: 55, y: 14, w: 41, h: 58, title: 'streamed reply (illustrative)' });

    // sequence of tokens
    const words = ['The', '␣cat', '␣sat', '␣on', '␣the', '␣mat', '.'];
    const chips = []; let x = 40;
    words.forEach((w, i) => {
      const width = w.length * 9.2 + 18;
      const g = S.svg('g', {}, root);
      S.svg('rect', { x, y: 70, width, height: 32, rx: 6, class: i < 5 ? 'sc-node' : 'sc-node-hot' }, g);
      S.svg('text', { x: x + width / 2, y: 91, 'text-anchor': 'middle', class: 'sc-mono' }, g, w);
      chips.push({ g, x, w: width, cx: x + width / 2 });
      x += width + 6;
    });
    S.svg('text', { x: 40, y: 60, class: 'sc-muted' }, root, 'tokens so far');

    // the decoder stack
    S.svg('rect', { x: 40, y: 130, width: 440, height: 64, rx: 8, class: 'sc-node' }, root);
    S.svg('text', { x: 56, y: 156, class: 'sc-mono' }, root, '12 decoder blocks (GPT-2 small)');
    S.svg('text', { x: 56, y: 178, class: 'sc-muted' }, root, 'masked attention + MLP, every position at once');
    const feed = S.svg('path', { d: 'M24,86 L24,162 L38,162', class: 'sc-wire' }, root);
    const lastCol = S.svg('rect', { x: 0, y: 65, width: 0, height: 42, rx: 8, fill: 'none', style: 'stroke: var(--sc-gold); stroke-width: 2.5' }, root);
    const lastWire = S.svg('path', { d: 'M0,0', class: 'sc-wire', style: 'stroke: var(--sc-accent)' }, root);
    const lastLab = S.svg('text', { x: 40, y: 226, class: 'sc-muted' }, root, 'last position → one score per vocabulary token (50,257)');

    // the distribution
    const barsG = S.svg('g', {}, root);
    const rows = [0, 1, 2, 3, 4].map((i) => {
      const y = 246 + i * 40;
      const lab = S.svg('text', { x: 182, y: y + 19, 'text-anchor': 'end', class: 'sc-mono' }, barsG, '');
      S.svg('rect', { x: 192, y, width: 240, height: 26, rx: 4, class: 'sc-track' }, barsG);
      const bar = S.svg('rect', { x: 192, y, width: 0, height: 26, rx: 4, class: 'sc-bar' }, barsG);
      const val = S.svg('text', { x: 440, y: y + 19, class: 'sc-mono' }, barsG, '');
      return { lab, bar, val, y };
    });
    S.svg('text', { x: 40, y: 462, class: 'sc-muted' }, barsG, 'softmax → probabilities (toy: only 5 candidate tokens, illustrative)');
    const pick = S.svg('rect', { x: 34, y: 242, width: 462, height: 34, rx: 6, fill: 'none', style: 'stroke: var(--sc-gold); stroke-width: 2.5' }, root);
    const pickLab = S.svg('text', { x: 40, y: 500, class: 'sc-mono sc-gold' }, root, '');
    const flights = [5, 6].map((k) => S.svg('path', { d: `M 120 259 C 10 230, 10 120, ${chips[k].cx} 104`, fill: 'none', stroke: 'none' }, root));
    const packet = S.svg('circle', { r: 8, class: 'sc-packet' }, root);
    return { term, chips, feed, lastCol, lastWire, lastLab, barsG, rows, pick, pickLab, flights, packet };
  },
  beats: (() => {
    const { fade, ease, lerp } = Scene.S;
    const D1 = [[' mat', 0.49], [' floor', 0.22], [' sofa', 0.15], [' bed', 0.11], [' roof', 0.04]];
    const D2 = [['.', 0.55], [',', 0.20], [' and', 0.12], [' with', 0.08], [' while', 0.05]];
    const D3 = [['<|endoftext|>', 0.41], [' The', 0.20], [' It', 0.17], ['\\n', 0.12], [' She', 0.10]];
    const setDist = (r, D, p) => r.rows.forEach((row, i) => {
      row.lab.textContent = D[i][0].replace(/^ /, '␣');
      row.bar.setAttribute('width', Math.max(0, 240 * D[i][1] * ease(p)));
      row.bar.setAttribute('class', i === 0 && p >= 1 ? 'sc-win' : 'sc-bar');
      row.val.textContent = p > 0 ? D[i][1].toFixed(2) : '';
    });
    const focusOn = (r, k, p) => {
      const c = r.chips[k];
      r.lastCol.setAttribute('x', c.x - 4); r.lastCol.setAttribute('width', c.w + 8);
      r.lastCol.style.opacity = p;
      r.lastWire.setAttribute('d', `M${c.cx},196 L${c.cx},210`);
      r.lastWire.style.opacity = p;
    };
    const fly = (r, i, p) => {
      const pt = Scene.S.along(r.flights[i], ease(p));
      r.packet.setAttribute('cx', pt.x); r.packet.setAttribute('cy', pt.y);
      r.packet.style.opacity = p > 0 && p < 1 ? 1 : 0;
    };
    const pickRow = (r, text, p) => { r.pick.style.opacity = p; r.pickLab.textContent = text; fade(r.pickLab, p); };
    return [
      // 1 · read the prompt
      { t: 0, d: 1, f: (r) => { r.chips.forEach((c) => (c.g.style.opacity = 0)); r.packet.style.opacity = 0; } },
      { t: 0, d: 1200, f: (r, p) => r.chips.slice(0, 5).forEach((c, i) => (c.g.style.opacity = ease(Math.min(1, Math.max(0, p * 5 - i))))) },
      { t: 0, d: 600, f: (r, p) => r.term.set(0, 'out', [{ t: 'prompt: ', c: 'muted' }, { t: 'The cat sat on the', c: 'plain' }], p) },
      { t: 1400, d: 600, f: (r, p) => fade(r.feed, p) },
      { t: 2200, d: 700, f: (r, p) => { focusOn(r, 4, p); fade(r.lastLab, p); } },
      // 2 · scores become probabilities
      { t: 4000, d: 1200, f: (r, p) => { setDist(r, D1, p); fade(r.barsG, p > 0 ? 1 : 0); } },
      // 3 · sample one token
      { t: 7500, d: 400, f: (r, p) => pickRow(r, 'sampled: ␣mat', p) },
      { t: 8200, d: 1100, f: (r, p) => fly(r, 0, p) },
      { t: 9300, d: 400, f: (r, p) => { r.chips[5].g.style.opacity = p; } },
      { t: 9300, d: 300, f: (r, p) => r.term.set(1, 'out', [{ t: 'reply: ', c: 'muted' }, { t: ' mat', c: 'gold' }], p) },
      // 4 · append and repeat
      { t: 11000, d: 500, f: (r, p) => { if (p > 0) { focusOn(r, 5, 1); pickRow(r, '', 0); setDist(r, D2, 0); } } },
      { t: 11500, d: 1000, f: (r, p) => { if (p > 0) setDist(r, D2, p); } },
      { t: 12600, d: 300, f: (r, p) => { if (p > 0) pickRow(r, 'sampled: .', p); } },
      { t: 13000, d: 900, f: (r, p) => fly(r, 1, p) },
      { t: 13900, d: 400, f: (r, p) => { r.chips[6].g.style.opacity = p; } },
      { t: 13900, d: 300, f: (r, p) => { if (p > 0) r.term.set(1, 'out', [{ t: 'reply: ', c: 'muted' }, { t: ' mat', c: 'plain' }, { t: '.', c: 'gold' }], 1); } },
      // 5 · when it stops
      { t: 15000, d: 500, f: (r, p) => { if (p > 0) { focusOn(r, 6, 1); pickRow(r, '', 0); setDist(r, D3, 0); } } },
      { t: 15500, d: 1000, f: (r, p) => { if (p > 0) setDist(r, D3, p); } },
      { t: 16700, d: 400, f: (r, p) => { if (p > 0) pickRow(r, 'sampled: <|endoftext|> (50256): stop', p); } },
      { t: 17100, d: 500, f: (r, p) => r.term.set(2, 'out', [{ t: '[done: end-of-text token]', c: 'muted' }], p) },
    ];
  })(),
  total: 18800,
  chapters: [
    { t: 0, title: 'Read the whole prompt', caption: 'All prompt tokens go through every block together. The causal mask means the vector at the <b>last position</b> has seen everything so far, so it is the one used to predict what comes next.',
      say: 'All the prompt tokens go through every block together. Because of the causal mask, the vector at the last position has seen everything so far, so that is the one used to predict what comes next.' },
    { t: 4000, title: 'Scores become probabilities', caption: 'That vector becomes one score per vocabulary token, 50,257 for GPT-2. A softmax turns the scores into probabilities. Here we pretend only five tokens exist, so their probabilities add up to 1; in GPT-2 the other 50,252 would share a little of it. The numbers are illustrative.',
      say: 'That vector becomes one score for every token in the vocabulary, fifty thousand two hundred and fifty seven for GPT-2. A softmax turns the scores into probabilities. Here we pretend only five tokens exist, so they add up to one; in GPT-2 the rest of the vocabulary would share a little of it. The numbers are illustrative.' },
    { t: 7500, title: 'Sample one token', caption: 'One token is drawn at random, in proportion to its probability. This time <code>␣mat</code> (0.49) is drawn; another run could draw <code>␣floor</code>.',
      say: 'One token is drawn at random, in proportion to its probability. This time, mat is drawn. Another run could draw floor.' },
    { t: 11000, title: 'Append and repeat', caption: 'The new token is appended and the same step runs again on a sequence one token longer. In plain decoding, a 200-token reply is 200 of these steps, which is why an API can stream it token by token.',
      say: 'The new token is appended, and the same step runs again on a sequence one token longer. In plain decoding, a two hundred token reply is two hundred of these steps, which is why an API can stream it token by token.' },
    { t: 15000, title: 'When it stops', caption: 'GPT-2\'s released sampler just stops after the number of tokens you ask for. Serving systems and APIs typically also stop as soon as the model samples its end-of-text token (id 50256 in GPT-2\'s vocabulary) or a stop sequence. That is general practice, not from the cited code.',
      say: 'GPT-2\'s released sampler just stops after the number of tokens you ask for. Serving systems and APIs typically also stop as soon as the model samples its end of text token, or a stop sequence. That is general practice, not from the cited code.' },
  ],
});
