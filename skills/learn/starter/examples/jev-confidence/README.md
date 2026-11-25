# jev-confidence: a worked example of a bespoke interactive module

These components come from one course, *Building Reliable AI Agents*, in which an agent called Jev returns `{ choice, confidence }` and the learner decides when to let it act. They used to ship in the generic `assets/diagram.js` and `style.css`, so every course on any topic carried "Jev returned…" prompts and ACT / CONFIRM / TRIAGE colours. They now live here as an example of how to build a course-specific interactive on top of the Learncraft runtime.

Nothing in this folder is loaded by default. To use or adapt it in a workspace, copy `jev-confidence.js` and `jev-confidence.css` into the workspace's `assets/`, link the CSS after `style.css`, and load the script after `core.js`, `viz.js` and `diagram.js`. `demo.html` shows every component.

## What it contains

| Component | Markup | Built on |
|---|---|---|
| Confidence bands | `<div data-lc="jev-bands" data-act="0.8" data-confirm="0.5" data-marker="0.42">` | `Learncraft.diagram.numberline` with three zones and a `cls` per zone |
| Confidence bars | `<div data-lc="confidence-bars" data-bars='{…}' data-confidence="0.42">` | `Learncraft.diagram.bars` plus a confidence phrase |
| Band quiz (visual retrieval) | `<div data-lc="band-quiz" id="l2-band" data-act="0.8" data-confirm="0.5" data-seed="3">` | the number line with the zones hidden until the learner answers |
| Threshold explorer | `<div data-lc="threshold-explorer" id="l2-explorer" data-seed="7" data-n="80" data-target="0.95">` | `Learncraft.explorable` with a target check |
| Decision colours for scenes | `sc-z-*`, `sc-t-*`, `sc-x-*`, `sc-glow-*`, `sc-ring`, `sc-retune`, `sc-lines` | plain CSS classes |

Lessons written before Learncraft used `data-bands`, `class="band-quiz"` and `class="threshold-explorer"`. The module mounts those too.

The `--act`, `--confirm` and `--triage` tokens are defined in `jev-confidence.css`, not in the runtime. The generic stylesheet uses only `--ok`, `--bad` and `--signal`.

## The pattern to copy

1. **Register a type.** Call `Learncraft.register('my-widget', { mount(el, ctx) { …; return { destroy } } })`. The runtime mounts every `[data-lc="my-widget"]` inside `Learncraft.mount`. If your code throws, that element shows an error box and the rest of the page keeps working.
2. **Read configuration from data attributes and validate it.** Throw a clear `Error` when it is wrong, for example `need 0 < data-confirm < data-act < 1`. The error is logged with the component name.
3. **Reuse primitives instead of drawing from scratch.**
   - The number line, bars and flow graph are in `Learncraft.diagram`.
   - Parameter sliders, explorables, the histogram and the timeline are in `viz.js`.
   - Generated SVG is laid out at the container width (`Learncraft.viz.width(el)`), so text stays readable on a phone.
4. **Be deterministic.** Use `Learncraft.rng(seed)`, never `Math.random`, so feedback, screenshots and checks reproduce. (The explorer keeps its original generator so that existing lessons keep their data and their right answer.)
5. **Record only the first attempt.** Use `ctx.record(ok)` when the runtime provides it, else `Learncraft.recordPractice(id, ok)`, else the legacy `window.Progress.record(id, ok)`. Give every practice element a unique `id`.
6. **Make it accessible.**
   - Feedback goes in a `role="status"` element.
   - Focus stays in the widget when buttons are replaced (the band quiz focuses the first new option).
   - Right and wrong are never shown by colour alone: the explorer draws wrong results as ×, and quiz buttons get a dashed border and strike-through.
   - Every figure has a text alternative generated from its data.
7. **Label made-up data.** The explorer's results are synthetic and say so on screen.
