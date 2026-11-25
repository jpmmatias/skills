# Runtime components

An index of the runtime a course copies into `assets/`. Read this instead of the asset files. Before using a component, read only the **header comment** of its file in `assets/` (exact attributes and options live there); read a whole file only to extend it. Everything is plain HTML, CSS and classic scripts that open from disk, with no build step and no network.

Improvements to a component go in the course's own `assets/` and, as a proposal, in `NOTES.md` under `## Upstream`. Never edit the skill's `starter/`.

## core.js → `window.Learncraft`

| Member | Use |
|---|---|
| `esc(s)`, `` html`…` ``, `html.raw(s)` | escape text; a tagged template that escapes every interpolation |
| `sanitize(s)` | allows only `b strong em i code br sup sub a[href]`; used for captions and `why`. `href` keeps only `http(s)://host`, `mailto:`, `#fragment` and plain relative paths, checked after the browser's own URL normalisation (so `java&#9;script:` and `\\host\share` are dropped) |
| `safeHref(h)`, `workspaceHref(rel)` | the same URL check for your own code: `` html`…` `` escapes text but does not vet URLs, so a data-built `href="${…}"` goes through one of these (`workspaceHref` allows only paths inside the workspace) |
| `ready(fn)` | run after `DOMContentLoaded` |
| `mount(el, name, fn)` | run a component in try/catch; on error it shows an inline error box instead of breaking the page |
| `register(type, def)`, `mountAll(root)` | registry for `[data-lc="type"]` components; `def.mount(el, ctx)` may return `{ destroy }`. `ctx.record(ok, { objective })` records the component's attempt under its `data-id` |
| `announce(msg)` | polite live region for screen readers |
| `t(key, vars)` | UI strings: `COURSE.strings`, then the built-in `en`/`pt` table for `COURSE.lang`, then `en` |
| `rng(seed)` | seeded random numbers (`() => [0,1)`), for reproducible figures |
| `reducedMotion()`, `onVisible(el, cb)`, `observeVisibility(el, onChange)` | motion and visibility helpers; players pause off-screen and on hidden tabs |

Custom scripts in a lesson use these instead of raw `innerHTML` with course text.

## store

`Learncraft.store` keeps practice evidence as an append-only event log in `localStorage["learn:<courseId>:v2"]`. Levels, schedules and XP are derived from it, never stored. Agents meet it through **exports**: `{ format: "learncraft-progress", schemaVersion: 2, course, createdAt, updatedAt, exportedAt, events }`, named `progress-<course>-<UTC date>.json`, downloaded by the browser; the learner moves it into `progress/`. Events this runtime cannot read (a newer kind or field) are kept unread and travel in the export. Imports are capped (5 MB, 20 000 events); if the browser cannot save (storage full or blocked) the page says so. Events have `kind` (`exposure`, `attempt`, `review_session`, `migration`), `context` (`lesson`, `practice`, `review`, `diagnostic`: a pretest guess, which never counts), `lesson`, `objective`, `item`, `firstEver`, `outcome`. It also loads in Node (`require('./assets/store.js')`): see [review → Read exported evidence](../workflows/review.md#read-exported-evidence). Level and scheduling rules: [mastery](mastery.md).

## course.js v2

```js
window.COURSE = {
  schemaVersion: 2,
  id: 'transformers-2026-11',             // unique per course; never the template's 'topic-slug'
  topic: 'How transformers work', lang: 'en', example: false,
  mission: 'One line from MISSION.md',
  milestones: [ { id: 'm1', label: 'Read attention', canDo: '…', status: 'in-progress', evidence: null } ],   // + objectives? (below)
  lessons: [ { n: 1, file: 'lessons/0001-tokens.html', title: 'Tokens', milestones: ['m1'], canDo: '…',
               objectives: [ { id: 'l1.o1', text: 'Explain why text is split into tokens before embedding' } ],
               practice: 'lessons/0001.practice.js' } ],
  strings: {}                              // optional UI string overrides
};
```

Milestone shape: `{ id, label, canDo, status, evidence, objectives? }`. `status`: `locked`, `in-progress` or `mastered` (with `evidence: 'LR-NNNN'`, set only by [review-challenge](../workflows/review-challenge.md)). `objectives`: set by review-challenge on a milestone pass (the union of the record's `criteria[].objectives`). Only listed objectives show L4; a mastered milestone without it shows no per-objective L4 (the milestone itself shows "Proven by your challenge"). `lessons[].practice` must be `lessons/NNNN.practice.js`: the runtime ignores any other path and the check reports it. A file without `schemaVersion` is v1 and still works; its lessons have no objectives, so each lesson is one objective `l<n>`.

## practice.js

Renders practice data (`Learncraft.practice(n, items)`) at `[data-practice-set]` and `[data-practice-item="id"]`, records first attempts in the store, shows the per-option `why`, and announces feedback. Format and placement: [lesson contract → Practice items](lesson-contract.md#practice-items). It also runs legacy `.quiz-q` and `.fade` markup.

## progress.js

Renders `#progress` in lessons (mission line, milestone path, practice stats) and `#dashboard` in `index.html` ("Next up", milestones, per-objective levels in words, what is due, export/import buttons, a notice when storage is unavailable).

## diagram.js

Generic figures as `[data-lc]` components with data in attributes; each renders its final state at first paint and generates its text alternative:
- `data-lc="bars"`: categorical bars, largest value signalled, optional toggle to a second data set; `data-bars` is an object or, to keep integer-like labels in your order, an array `[["1",0.2],["10",0.3]]`;
- `data-lc="numberline"`: a scale with labelled zones from data and an optional marker;
- `data-lc="flow"`: a flow graph from nodes and edges, optionally stepped on the timeline with a packet along each edge;
- `.stepper`: hand-drawn SVG stepped one stage at a time (segmenting). It paints the final state (every step, last caption) first and in print; Play or Next starts again from step 1. Its width is capped.

## viz.js

Generic, data-driven primitives (load before `diagram.js` and `scene.js`):
- **timeline player** `Learncraft.timeline(opts)`: the shared play/pause/scrub player behind scenes, the stepper and flow graphs; pauses off-screen and on hidden tabs, keyboard and screen-reader friendly;
- **param slider** `Learncraft.paramSlider(opts)`, and `Learncraft.explorable(el, opts, ctx)`: change a variable, watch the figure re-render, with a text alternative from `describe()` and an optional graded target (the interactive alternative to a scene); `reseed()` draws a new random sample;
- **histogram** `Learncraft.histogram(opts)`: counts with optional expected values, labelled directly;
- `Learncraft.viz`: SVG and seeded-random helpers.

Random data uses `Learncraft.rng(seed)`, so figures are reproducible. Exact options are in the file header; worked uses are in `${CLAUDE_SKILL_DIR}/starter/examples/` (`sampling-explorer.js`, `binary-search.js`).

## scene

`scene.js` plays motion scenes: `<div class="scene" data-scene="name"></div>` plus `Scene.register(name, { title, total, setup(stage, S), beats: [{ t, d, f(refs, p) }], chapters: [{ t, title, caption, say }] })` in `lessons/scenes-NNNN.js`. Optional keys: `poster` (`'end'` by default, `'start'`, or a time in ms: the frame shown before play, in print and under reduced motion) and `phone: { focus: [x, y, w, h] }` (the stage region kept on screens under 480px; terminals move below the stage, so keep the mechanism within about 480 units). The stage is hidden from screen readers; captions and a Transcript disclosure carry the content. A scene is a pure function of time; helpers on `S` include `svg`, `terminal`, `seg`, `lerp`, `ease`, `fade`, `draw`, `along`, `layers`, `highlight`. Authoring rules: [motion → Scenes](motion.md#scenes).

## Styles, templates, examples

- `style.css` (page and practice) imports `figures.css` (figures and scenes); `theme.css` sets the tokens ([THEME-FORMAT](../THEME-FORMAT.md)).
- `${CLAUDE_SKILL_DIR}/starter/templates/`: `index.html` (dashboard), `review.html` (cold review session), `lesson.html`, `0001.practice.js` and `reference.html`.
- `${CLAUDE_SKILL_DIR}/starter/examples/`: `scenes-0001-sampling.js` (a complete scene), explorable and figure examples, and `jev-confidence/` (domain-specific components from an earlier course). Open `examples/index.html` for a working gallery of the figure and explorable primitives. Copy from examples; they are not part of the generic runtime.
