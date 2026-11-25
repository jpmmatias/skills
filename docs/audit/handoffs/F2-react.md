# Handoff: F2, example course "React Rendering Internals"

- **Agent:** F2, example-course author (Agents 03/04/07 hats)
- **Task:** Hand-author the public example course `examples/react-rendering/`: 3 lessons on React rendering for React 19, sourced from the React docs, with practice, transfer challenges, at least one meaningful interactive, and no learner data.
- **Status:** Done. `scripts/validate.mjs`: 0 errors and 0 warnings for this course. `check.mjs`: all 6 pages clean, axe included. Nothing committed.

## Files created (all under `examples/react-rendering/`)

| File | Contents |
|---|---|
| `assets/` | An exact copy of `skills/learn/starter/assets/`, re-synced at the end because `core.js` and `store.js` changed upstream during the session. Only `course.js` differs. |
| `assets/course.js` | v2 manifest with `example: true` and id `react-rendering-example`. Milestones: m1 is in progress, m2 is locked; both have `evidence: null`. 3 lessons, 2 objectives each. |
| `index.html`, `review.html` | Built from the templates. The index carries an example-course note. |
| `MISSION.md` | The example mission: a frontend developer who wants to stop guessing why components re-render. It has 2 success lines, which map to the 2 milestones. |
| `NOTES.md` | lang, profile and theme; the React version and how the sources were read; per-lesson motion decisions; accuracy notes; Upstream proposals. |
| `RESOURCES.md` | 27 source records (S1–S27), with lesson blocks, claims ledgers, Gaps and Verification debt. |
| `lessons/0001-render-and-commit.html` + `0001.practice.js` | What "render" means. Covers elements, trigger → render → commit → paint (stepped flow graph), the three keep-or-reset cases (type, position, key), and the clock and chat-draft worked examples. 6 items. Lesson challenge. |
| `lessons/0002-state-updates.html` + `0002.practice.js` + `0002.figures.js` | Covers the state snapshot, the updater queue table, batching with a React 17/18/19 version note, and how renders spread to children. Includes the **render-sim explorable**. 6 items. Milestone challenge for m1. |
| `lessons/0003-effects-and-memo.html` + `0003.practice.js` | Covers Effects after the commit (stepped flow graph, including the caveat that paint and Effect order is not fixed), a Strict Mode development vs production table, the React 18 → 19 Strict Mode changes, re-render ≠ DOM update, when memo, useMemo and useCallback help (render-sim in memo mode with a goal check), and a React Compiler status note. 7 items. Milestone challenge for m2. |
| `reference/cheat-sheet.html` | Vocabulary, 8 rules of thumb, a version-notes table (17/18/19) and how to read the Profiler. Every line is cited. |

### The interactive

`render-sim` (`lessons/0002.figures.js`) is a bespoke `Learncraft.register` component, labelled on the page as a **simplified model, not React**.
- **Controls:** the learner picks the update (Counter `setCount` or App `setTheme`). In lesson 3 they can also wrap Counter, Button or List in `memo` and switch on `useCallback` handlers.
- **What it shows:** on a 9-component tree, which components rendered, which `memo` skipped and which were never called, plus the DOM nodes that change in the commit ("DOM ✎"). An ordered log explains each decision.
- **Rules applied:** the four rules taught, each cited.
- **Properties:** pure and deterministic, no motion (so nothing changes under reduced motion), native radios and checkboxes inside fieldsets, `role=img` with a text alternative, announced summaries, theme tokens only, and readable at 390px.
- **Goal check:** in lesson 3, the goal is "both updates render only 2 components". It needs memo on all three components plus `useCallback`. The check gives feedback only and records nothing.

## Sources

The `react.dev`, `legacy.reactjs.org` and `www.youtube.com` hosts did not resolve. Instead, I read each docs page in full from its source Markdown in the official repositories: `reactjs/react.dev` at commit `15653c0`, 2026-11-24, and `reactjs/legacy.reactjs.org` at `075d417`, both sparse-cloned over git. These are marked `verified 2026-11-25`, with the GitHub file pinned to that commit as the `open copy`, and the method is stated at the top of RESOURCES.md and in Verification debt. S10 was fetched directly with WebFetch. S26 is `unverified (blocked: www.youtube.com)`, and its Go-deeper line is wrapped in `.unverified`.

| Id | Title | Status | Backs |
|---|---|---|---|
| S1 | Render and Commit | verified (source) | the definition of render, the phase order, render ≠ DOM update, Strict Mode calling components twice |
| S2 | Preserving and Resetting State | verified (source) | keep or reset by type, position and key |
| S3 | createElement | verified (source) | elements are "lightweight descriptions" |
| S4 | Reconciliation (legacy docs) | verified (source) | the term "reconciliation" and the fact that it is an implementation detail |
| S5 | Rendering Lists | verified (source) | stable keys; random keys recreate components and DOM |
| S6 | State as a Snapshot | verified (source) | the snapshot rule |
| S7 | Queueing a Series of State Updates | verified (source) | batching in handlers, the updater queue, separate clicks |
| S8 | useState | verified (source) | the equal-value bail-out |
| S9 | React v18.0 | verified (source) | automatic batching; the new Strict Mode remount in React 18 |
| S10 | Automatic batching for fewer renders in React 18 (reactwg #21) | verified (direct fetch) | the `createRoot` condition and `flushSync` |
| S11 | memo | verified (source) | children re-render by default; memo semantics and limits |
| S12 | Synchronizing with Effects | verified (source) | Effects at the end of the commit; dev setup → cleanup → setup |
| S13 | useEffect | verified (source) | paint vs Effect order (interaction caveat) |
| S14 | StrictMode | verified (source) | what is double-invoked; development only |
| S15 | React 19 Upgrade Guide | verified (source) | React 19 Strict Mode changes; `ReactDOM.render` removed |
| S16 | useMemo | verified (source) | when useMemo helps; `console.time` and the ~1 ms guidance |
| S17 | useCallback | verified (source) | when useCallback helps |
| S18 | React Compiler: Introduction | verified (source) | what the compiler memoizes; escape hatches |
| S19 | React Compiler v1.0 | verified (source) | stable since 2025-10-07; React 17+ support |
| S20 | You Might Not Need an Effect | verified (source) | a state-setting Effect causes another render pass |
| S21 | `<Profiler>` | verified (source) | `actualDuration`; off in production builds |
| S22 | Introducing the React Profiler (2018) | verified (source) | Profiler groups work by commit; grey = did not render |
| S23 | React Developer Tools | verified (source) | challenge setup |
| S24 | React Versions | verified (source) | the docs were at 19.3 when written |
| S25 | React Conf 2025 Recap | verified (source) | locating S26 |
| S26 | Exploring React Performance (talk) | unverified (blocked: www.youtube.com) | nothing; optional viewing only |
| S27 | How to Upgrade to React 18 | verified (source) | legacy `ReactDOM.render` on 18 behaves like 17 (no automatic batching) |

## Claims I am least sure of

1. **Status of "verified".** Every S entry except S10 and S26 was read from the page's source Markdown, not the rendered page. The text is the same, but MDX components such as sandboxes and callouts were not rendered, and a deploy could lag the repository. A reviewer may prefer `unverified (blocked: react.dev)` until someone opens the live pages.
2. **S22, the DevTools Profiler UI.** The only description of the UI is the 2018 post. The challenges say "components that did not render are shown greyed out" and ask the learner to report what their version shows. The UI details may be out of date.
3. **The Strict Mode table row for ref callbacks.** It follows S14 and S15 (a React 19 behaviour) and is flagged for teams on React 18. The component-body row uses "called twice" (S1, S14). The React 19 detail that `useMemo` and `useCallback` reuse results during the double render is stated only in the version note, not in the table.
4. **render-sim modelling choices.**
   - Button and Rows count as owning DOM. A new `onClick` function is treated as no DOM change, because React DOM event handlers are not DOM attributes. That is my reasoning, not a cited claim.
   - The `useCallback` toggle assumes stable dependencies.
5. **The React Compiler sentence "a build-time tool you opt into (mainly a Babel plugin)".** It is accurate per S18 and S19. Expo SDK 54+ and some framework templates enable the compiler by default (S19), so "opt into" means it is opt-in at the project level.

## Validation

| Check | Result |
|---|---|
| `node scripts/validate.mjs` | No findings for `examples/react-rendering`. At the end, the whole repository was 0 errors and 0 warnings. Earlier runs showed errors only in `README.md` media links and `examples/transformers` (other workstreams). |
| `node skills/learn/starter/tools/lint-workspace.mjs examples/react-rendering` | clean: 0 errors, 0 warnings (option-length parity included) |
| `node skills/learn/starter/tools/check.mjs examples/react-rendering`, using the global Playwright 1.63 and axe-core 4.10 via `NODE_PATH` from the scratchpad | **All pages clean** (index, review, 3 lessons, cheat sheet). Light 900/390, dark 900, reduced motion 390, axe WCAG 2.2 AA. |
| Fix passes | 1. Horizontal scroll at 390: labels in the render-sim were flex rows with `<code>`, so the text now sits in a wrapping span. 2. axe `scrollable-region-focusable` on `<pre>`: added `tabindex="0"` and reflowed the long code lines. |
| Screenshots | I looked at the check's element shots and at my own shots of every figure, table, card, header and challenge at **1280 and 390, light and dark**, plus full pages of the index and the cheat sheet. Fixes made from them: the `=>` ligature turned into ⇒ in the UI font (off inside render-sim); keep/reset cards clipped their code in 3 columns (now stacked); a log line wrongly said "same output" for components with no DOM of their own; a `th` uppercased the `n` in code. `.check/` was deleted afterwards. |
| Keyboard | A Playwright script used only Tab, typing, Enter, Space and the arrow keys. It completed **all 19 practice items** (6 + 6 + 7), all right on the first try, with no page errors. It also drove the render-sim radios (arrow keys), the 4 checkboxes (Space) and "Check the goal" (Enter), which reached the success state. |
| Model check | Ran `Learncraft.renderSim.simulate` in Node for 7 configurations. Render and DOM counts match the prose: +1 gives 3 rendered and 1 DOM change; theme gives 9 rendered and 1 DOM change; the goal configuration gives 2 rendered for each update. |

## Known limitations

- **Lesson 3 has 7 practice items, not 4–6.** The binding contract requires ≥ 3 items per objective, and from lesson 3 on at least one item on an earlier objective. With 2 objectives that forces 3 + 3 + 1. One objective covering both effects and memo would have kept 6 items but blurred per-objective mastery.
- **No motion scene.** Motion uses two stepped `flow` timelines (L1 and L3) and the render-sim explorable. The reasons are recorded per lesson in NOTES.md: the insight comes from changing the trigger and the memo switches, not from watching.
- **Strict Mode** is a table, not an animation.
- **lesson 3 loads `0002.figures.js`.** The component is shared, so lesson 3 loads lesson 2's file from the same folder. The linter accepts this, but the file contract assumes one figures file per lesson (noted under Upstream in NOTES.md).
- **No video was verified.** See Gaps in RESOURCES.md.
- **Context is not modelled.** The render-sim ignores context, keys, equal-value bail-outs and concurrent rendering, and it says so on the page.

## Runtime findings (not bugs in the runtime's logic; nothing in `skills/` was edited)

1. **axe `scrollable-region-focusable` on every overflowing `<pre>`.** `style.css` gives `pre` `overflow:auto`, so a long code line makes a scroll region that keyboard users cannot reach. Courses must add `tabindex="0"` by hand. Neither the lesson contract nor the template says so. Suggestion: mention it in `lesson-contract.md`, or add `tabindex="0"` to the template's code samples.
2. **`--font-ui` and `=>`.** In the check's Chromium, the system UI font renders `=>` as a "⇒" ligature in plain-text runs: practice readouts, captions and explorable labels. Code is ambiguous wherever arrow functions appear outside `<code>`. Suggestion: `font-variant-ligatures: none; font-feature-settings: "calt" 0` on `.lc-ex-readout`, `.lc-opt` and `.lc-prompt`, or on `body`.
3. **`.cols` holding a `.box` with `<pre>`.** Code is clipped and scrolled inside narrow columns at desktop width. This is not a bug but an authoring trap; this course stacks its boxes instead.
4. **`Learncraft.explorable` takes range sliders only.** Choice and toggle parameters would have let render-sim reuse the explorable's readout, announce and target plumbing (proposal in NOTES.md → Upstream).
5. **check.mjs element screenshots are taken only at the 900px viewport.** The 390px and dark runs save only a full page, so phone layout problems inside figures are easy to miss without a separate script.
6. **The starter assets changed during the session** (`core.js`, `store.js`). The copy in `assets/` was re-synced at the end. Any later runtime change needs another re-sync of the example's `assets/`.
