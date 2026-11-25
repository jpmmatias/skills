# React Rendering Internals Resources

How these sources were read (2026-11-25): the hosts `react.dev`, `legacy.reactjs.org` and `www.youtube.com` did not resolve in the authoring session. The react.dev and legacy docs pages were read in full from their **source files in the official React documentation repositories** on GitHub (each entry's *open copy*, pinned to the commit that was read); the passages cited below were seen there. The canonical page URL is kept as the main link. One GitHub discussion (S10) was fetched directly. No video was watched. Docs entries are version-scoped and due for re-verification after 90 days (2027-02-23).

## Knowledge

### Lesson 1 — What “render” means
Researched 2026-11-25 · online (GitHub sources) · 5 of 5 sources read

- [S1] [Render and Commit](https://react.dev/learn/render-and-commit) — React team / react.dev · docs 4 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/learn/render-and-commit.md
  The three steps of every screen update (trigger, render, commit) plus the browser paint "epilogue". Defines rendering as "React calling your components", says rendering is recursive through nested components, and that React "only changes the DOM nodes if there's a difference between renders". Use for: the definition of render, the phase order, render ≠ DOM update, Strict Mode calling components twice. **Primary source for L1**
- [S2] [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state) — React team / react.dev · docs 16 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/learn/preserving-and-resetting-state.md
  State is tied to a position in the UI tree; the same component at the same position keeps its state; a different component at the same position resets the state of its whole subtree; a different `key` makes React treat it as a different component. Use for: L1 objective 2 and its worked examples (sections "Same component at the same position preserves state", "Different components at the same position reset state", "Option 2: Resetting state with a key").
- [S3] [createElement](https://react.dev/reference/react/createElement) — React team / react.dev · docs 3 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/reference/react/createElement.md
  The deep dive "What is a React element, exactly?" calls an element "a lightweight description of a piece of the user interface" and shows the plain object JSX produces. Use for: "a render returns a description, not DOM".
- [S4] [Reconciliation (legacy docs)](https://legacy.reactjs.org/docs/reconciliation.html) — React team / legacy.reactjs.org · docs 5 min read · tier T1 · verified 2026-11-25 · version: React ≤ 18 era docs, marked by the page itself as "old and won't be updated" · open copy: https://github.com/reactjs/legacy.reactjs.org/blob/075d4170f2af03115d16507f1a61e5d3a5d78702/content/docs/reconciliation.md
  The origin of the term "reconciliation": two heuristics (different element types produce different trees; `key` hints which children are stable), same-type DOM elements keep their node and update only changed attributes, and "the reconciliation algorithm is an implementation detail". Written with class-component lifecycles. Use for: the term and the implementation-detail caveat only; current behaviour is taught from S1/S2.
- [S5] [Rendering Lists](https://react.dev/learn/rendering-lists) — React team / react.dev · docs 8 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/learn/rendering-lists.md
  Keys must be unique among siblings and stable; React uses the index when no key is given; keys generated on the fly (`Math.random()`) never match, so components and DOM are recreated each render. Use for: the key rules and the random-key practice item.

Claims L1:
- L1-C1 · consensus · S1 · "Rendering is React calling your components."
- L1-C2 · consensus · S1 · "A render is triggered by the initial render or by a state update in the component or one of its ancestors."
- L1-C3 · consensus · S1 · "Rendering is recursive: React renders the components the updated component returns, and so on."
- L1-C4 · consensus · S1 · "On re-render React computes what changed; it changes the DOM only during commit and only where the output differs; then the browser paints."
- L1-C5 · consensus · S3 · "A component returns React elements: lightweight descriptions of UI, not DOM nodes."
- L1-C6 · consensus · S2 · "The same component type at the same position keeps its state; a different type at that position resets the whole subtree's state."
- L1-C7 · consensus · S2, S5 · "A different key makes React treat the component as a different one, so its state resets; random keys recreate components and DOM every render."
- L1-C8 · supported · S4 · "'Reconciliation' is the legacy docs' name for this comparison, and the docs call the algorithm an implementation detail."
- L1-C9 · consensus · S1 · "In Strict Mode during development React calls each component function twice."

### Lesson 2 — How a state update spreads
Researched 2026-11-25 · online (GitHub sources) · 7 of 7 sources read

- [S6] [State as a Snapshot](https://react.dev/learn/state-as-a-snapshot) — React team / react.dev · docs 6 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/learn/state-as-a-snapshot.md
  Setting state "only changes it for the next render"; "a state variable's value never changes within a render", even in asynchronous code inside the handler; the "+3" counter example. Use for: the snapshot rule and the substitution method. **Primary source for L2**
- [S7] [Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates) — React team / react.dev · docs 7 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/learn/queueing-a-series-of-state-updates.md
  React waits until all code in the event handlers has run before processing state updates (batching); it does not batch across separate intentional events such as two clicks; updater functions (`n => n + 1`) are queued and applied in order during the next render; "replace with 5" then `n => n + 1` gives 6. Use for: batching inside handlers, updater functions, the queue tables.
- [S8] [useState](https://react.dev/reference/react/useState) — React team / react.dev · docs 13 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/reference/react/useState.md
  Caveats of the `set` function: it only affects what `useState` returns from the next render; if the new value is identical by `Object.is`, React skips re-rendering the component and its children (it "may still need to call your component before skipping the children"); `flushSync` forces an earlier update. Use for: the equal-value bail-out and `flushSync` mentions.
- [S9] [React v18.0](https://react.dev/blog/2022/03/29/react-v18) — React team / react.dev blog · article 15 min read · tier T1 · verified 2026-11-25 · version: React 18.0 (behaviour kept in 19) · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/blog/2022/03/29/react-v18.md
  Section "New Feature: Automatic Batching": before React 18 only updates inside React event handlers were batched; updates in promises, `setTimeout` and native event handlers now batch too. Section "New Strict Mode Behaviors": React 18 added the development-only unmount-and-remount check on first mount. Use for: the version notes on batching (L2) and on Strict Mode (L3).
- [S10] [Automatic batching for fewer renders in React 18](https://github.com/reactwg/react-18/discussions/21) — Dan Abramov (React team) / React 18 Working Group · article (length not measured) · tier T1 · verified 2026-11-25 · version: React 18+
  The design note behind automatic batching: "Starting in React 18 with createRoot, all updates will be automatically batched, no matter where they originate from"; `flushSync` opts out. Fetched directly from github.com. Use for: the `createRoot` condition and the opt-out.
- [S27] [How to Upgrade to React 18](https://react.dev/blog/2022/03/08/react-18-upgrade-guide) — React team / react.dev blog · article 10 min read · tier T1 · verified 2026-11-25 · version: React 18 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/blog/2022/03/08/react-18-upgrade-guide.md
  Section "Automatic Batching" and the `ReactDOM.render` deprecation: an app that keeps `ReactDOM.render` on React 18 "will behave as if it's running React 17". Use for: the condition on automatic batching.
- [S11] [memo](https://react.dev/reference/react/memo) — React team / react.dev · docs 7 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/reference/react/memo.md
  "React normally re-renders a component whenever its parent re-renders"; `memo` skips that when every prop is equal by `Object.is`, but "memoization is a performance optimization, not a guarantee"; a memoized component still re-renders for its own state or a context it reads; `memo` is useless when a prop is always new (an object or function created during render); "Should you add memo everywhere?". Use for: the default "children render too" rule (L2) and memo (L3).

Claims L2:
- L2-C1 · consensus · S6 · "Calling a setter does not change the variable in the running handler; it requests a new render, and the new value appears in the next render."
- L2-C2 · consensus · S6 · "A state variable's value never changes within a render, even in a timeout scheduled from the handler."
- L2-C3 · consensus · S7 · "React processes state updates after all code in the event handler has run: several setters in one handler cause one re-render."
- L2-C4 · consensus · S7 · "Updater functions are queued and applied in order during the next render; setNumber(number + 5) then setNumber(n => n + 1) from 0 gives 6."
- L2-C5 · consensus · S7 · "React does not batch across separate intentional events such as two clicks."
- L2-C6 · consensus · S9, S10, S27, S15 · "Since React 18 with createRoot, updates inside timeouts, promises and native handlers batch too; before React 18 (or with the legacy ReactDOM.render on 18) only React event handlers batched; React 19 removed ReactDOM.render. flushSync opts out."
- L2-C7 · consensus · S1, S11 · "By default a re-render renders the updated component and every component nested inside it."
- L2-C8 · consensus · S1 · "Components that render with the same output cause no DOM changes."
- L2-C9 · consensus · S8 · "Setting a state to a value identical by Object.is skips re-rendering the component and its children, though React may still call the component first."

### Lesson 3 — Effects, Strict Mode and memoization
Researched 2026-11-25 · online (GitHub sources) · 11 of 12 sources read

- [S12] [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) — React team / react.dev · docs 26 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/learn/synchronizing-with-effects.md
  "Effects run at the end of a commit after the screen updates"; in development with Strict Mode React remounts every component once after mount, so an Effect runs setup → cleanup → setup; production runs setup once; the fix is a cleanup, not a ref guard. Use for: effect timing and the development double-run. **Primary source for L3**
- [S13] [useEffect](https://react.dev/reference/react/useEffect) — React team / react.dev · docs 19 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/reference/react/useEffect.md
  Caveats: if an Effect was not caused by an interaction, React "will generally let the browser paint the updated screen first"; if it was caused by an interaction such as a click, React "may run your Effect before the browser paints"; `useLayoutEffect` is for work that must block paint. Use for: the precise effect-vs-paint wording.
- [S14] [StrictMode](https://react.dev/reference/react/StrictMode) — React team / react.dev · docs 8 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/reference/react/StrictMode.md
  Development-only checks: components render an extra time (the component body and the functions passed to `useState`, to `set` functions, to `useMemo` and to `useReducer`; not event handlers), Effects and ref callbacks run an extra setup+cleanup; "All of these checks are development-only and do not impact the production build." Use for: the Strict Mode table.
- [S15] [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) — React team / react.dev blog · article 12 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/blog/2024/04/25/react-19-upgrade-guide.md
  Section "StrictMode changes": during the development double render `useMemo` and `useCallback` reuse the memoized results from the first render, and ref callbacks are double-invoked on initial mount. Use for: the React 18 → 19 version note.
- [S16] [useMemo](https://react.dev/reference/react/useMemo) — React team / react.dev · docs 16 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/reference/react/useMemo.md
  `useMemo` is "only valuable in a few cases": a noticeably slow calculation whose dependencies rarely change, a value passed to a `memo` component, or a value used as another Hook's dependency; how to measure with `console.time` (about 1 ms or more is worth memoizing) and CPU throttling. Use for: when `useMemo` helps; the measurement advice.
- [S17] [useCallback](https://react.dev/reference/react/useCallback) — React team / react.dev · docs 10 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/reference/react/useCallback.md
  Caching a function is only valuable when it goes to a `memo` component or is another Hook's dependency; `useCallback` "does not prevent creating the function". Use for: when `useCallback` helps.
- [S18] [React Compiler: Introduction](https://react.dev/learn/react-compiler/introduction) — React team / react.dev · docs 4 min read · tier T1 · verified 2026-11-25 · version: React Compiler 1.x (React 17+) · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/learn/react-compiler/introduction.md
  The compiler is a build-time tool that applies the equivalent of manual memoization; it memoizes components and hooks, not every function; `useMemo`/`useCallback` remain as escape hatches; for existing code, leave existing memoization or test carefully before removing it. Use for: the compiler section.
- [S19] [React Compiler v1.0](https://react.dev/blog/2025/10/07/react-compiler-1) — React team / react.dev blog · article 7 min read · tier T1 · verified 2026-11-25 · version: React Compiler 1.0 (October 7, 2025) · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/blog/2025/10/07/react-compiler-1.md
  First stable release; works with React 17 and up (17/18 need a `target` setting and `react-compiler-runtime`); recommends pinning an exact compiler version without good test coverage. Use for: the status and version note.
- [S20] [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) — React team / react.dev · docs 21 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/learn/you-might-not-need-an-effect.md
  An Effect that sets state right after commit "restarts the whole process from scratch"; compute derived data during rendering instead; user events belong in event handlers. Use for: the extra-render cost of state-setting Effects.
- [S21] [&lt;Profiler&gt;](https://react.dev/reference/react/Profiler) — React team / react.dev · docs 2 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/reference/react/Profiler.md
  `onRender` reports `phase` (`mount`, `update`, `nested-update`), `actualDuration` and `baseDuration`; profiling is disabled in production builds by default; points to the DevTools Profiler tab. Use for: the challenge's measurement options.
- [S22] [Introducing the React Profiler](https://legacy.reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html) — Brian Vaughn / legacy.reactjs.org blog · article 7 min read · tier T1 · verified 2026-11-25 · version: React 16.5 era DevTools; today's Profiler UI differs in detail · open copy: https://github.com/reactjs/legacy.reactjs.org/blob/075d4170f2af03115d16507f1a61e5d3a5d78702/content/blog/2018-09-10-introducing-the-react-profiler.md
  How the DevTools Profiler groups work by commit, and how to read the flame chart: "gray components did not render at all during this commit". Use for: how to read Profiler evidence in the challenges; describe the UI loosely, since it has changed since 2018.
- [S23] [React Developer Tools](https://react.dev/learn/react-developer-tools) — React team / react.dev · docs 1 min read · tier T1 · verified 2026-11-25 · version: React 19 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/learn/react-developer-tools.md
  Installing the browser extension, which adds the Components and Profiler panels. Use for: challenge setup.
- [S24] [React Versions](https://react.dev/versions) — React team / react.dev · docs 5 min read · tier T1 · verified 2026-11-25 · version: latest listed 19.3 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/versions.md
  The docs cover the latest major; the page lists 19.3 as the latest version at the commit read. Use for: the "which React" note.
- [S25] [React Conf 2025 Recap](https://react.dev/blog/2025/10/16/react-conf-2025-recap) — React team / react.dev blog · article 4 min read · tier T1 · verified 2026-11-25 · version: October 2025 · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/blog/2025/10/16/react-conf-2025-recap.md
  Lists the conference talks with links into the day-1 and day-2 streams, including "Exploring React Performance" (Joe Savona). Use for: locating S26.
- [S26] [Exploring React Performance (React Conf 2025, day-1 stream)](https://www.youtube.com/watch?v=zyVRg2QR6LA&t=20274s) — Joe Savona / React Conf · talk, segment of the day-1 stream (length not checked) · tier T2 · unverified (blocked: www.youtube.com)
  Listed in S25 as the React team's talk on its performance research. Not watched: nothing in the lessons rests on it. Offered only as optional viewing.

Claims L3:
- L3-C1 · consensus · S12 · "Effects run at the end of a commit, after the screen updates."
- L3-C2 · supported · S13 · "For updates not caused by an interaction React generally lets the browser paint before running the Effect; for an interaction such as a click it may run the Effect before paint."
- L3-C3 · consensus · S12, S14 · "In development, Strict Mode renders components an extra time and runs each Effect's setup and cleanup one extra time; production runs setup once."
- L3-C4 · consensus · S9, S15 · "React 18 introduced the development-only remount check; React 19 changed Strict Mode: useMemo/useCallback reuse the first render's result during the double render, and ref callbacks are double-invoked on mount."
- L3-C5 · consensus · S1 · "A re-render does not imply a DOM update: React changes only nodes whose output differs."
- L3-C6 · consensus · S11 · "memo skips a re-render caused by the parent when every prop is Object.is-equal; it does not stop re-renders from the component's own state or a context it reads, and it is not a guarantee."
- L3-C7 · consensus · S11, S16, S17 · "A function or object created during render is a new value each time, which defeats memo; useCallback/useMemo help only for memo props, Hook dependencies, or noticeably slow calculations."
- L3-C8 · consensus · S16 · "Measure first: the docs suggest console.time and memoizing calculations that take about 1 ms or more, with CPU throttling on."
- L3-C9 · consensus · S18, S19 · "React Compiler 1.0 (stable since October 2025) is an opt-in build-time tool that applies the equivalent of memo/useMemo/useCallback; it works with React 17+, and useMemo/useCallback remain as escape hatches."
- L3-C10 · consensus · S20 · "An Effect that sets state right after commit causes another full render pass."
- L3-C11 · supported · S22, S21 · "The DevTools Profiler groups work by commit; in its flame chart, components that did not render in a commit are grayed out."

## Wisdom (Communities)

- Communities are not part of this example course; no community sources were evaluated.

## Gaps

- No video was verified for any lesson: www.youtube.com was blocked in the authoring session (S26 is listed unverified).
- L3-C11: the current DevTools Profiler UI is documented only in the 2018 legacy post (S22); react.dev has no page on reading the Profiler tab. Lessons describe it loosely ("components that did not render appear grayed out") and ask the learner to say what their own version shows.
- The DevTools settings "Highlight updates when components render" and "Record why each component rendered while profiling" are not documented on react.dev or in S22; the lessons do not rely on them.

## Verification debt

- S1–S9, S11–S25, S27: read from the official source repositories because react.dev and legacy.reactjs.org did not resolve; whoever next has access should open each canonical URL and confirm the rendered page matches.
- S26: blocked host (www.youtube.com) on 2026-11-25; watch the segment and record its length before relying on it.
