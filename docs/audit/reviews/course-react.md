# Review: example course "React Rendering Internals" (`examples/react-rendering/`)

Independent review, 2026-11-25. Reviewer roles: research-grounding specialist (is every React claim true for React 19, and does each cited source say exactly that?) and learning scientist (does the course teach and test the way `skills/learn/references/` requires?). I did not write this course. No repository file other than this report was changed; nothing was committed.

**Read in full:** `MISSION.md`, `NOTES.md`, `RESOURCES.md`, `index.html`, `review.html`, `assets/course.js`, `lessons/0001-render-and-commit.html`, `lessons/0002-state-updates.html`, `lessons/0003-effects-and-memo.html`, `lessons/000{1,2,3}.practice.js`, `lessons/0002.figures.js`, `reference/cheat-sheet.html`; the parts of `assets/diagram.js` and `assets/practice.js` that decide what a learner sees first (flow summary, option shuffling, fade labels). Rules: `skills/learn/references/{lesson-contract,grounding,mastery,teaching-core,visual-design}.md`.

**Sources opened (this session):** every react.dev source file the course cites, fetched from `raw.githubusercontent.com/reactjs/react.dev/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/...` (all HTTP 200), plus the two legacy files at `reactjs/legacy.reactjs.org@075d4170…`, and three uncited pages at the same commit: `learn/react-compiler/installation.md`, `reference/dev-tools/react-performance-tracks.md`, `blog/index.md`. Not reachable: `github.com/reactwg/react-18/discussions/21` (S10; the session proxy returned 403) and the GitHub API (so the pinned commit's date, 2026-11-24 in `NOTES.md:28`, is **not** confirmed here).

**Executed:** a behavioural test script against `react@19.3.1` / `react-dom@19.3.1` (development and production builds) and against `react@18.3.1` / `react-dom@18.3.1`, in jsdom, in a scratch directory outside the repo (`/tmp/claude-0/-home-user/be6c5257-bdb3-59a5-94e4-7a2e3ced1103/scratchpad/rev-react/t.js`, `t2.js`). Results are quoted where they back a finding. jsdom has no paint, so nothing below about paint order was executed; those claims were checked against the docs only.

Severity: **P0** = factually wrong statement or wrong answer key · **P1** = misleading/overstated, version-unqualified, or wrong grounding status · **P2** = pedagogy · **P3** = polish.

## Summary

No P0. Every quoted passage exists at the pinned commit, every number and version note checks out, and every practice answer key is correct under the docs' model and, where executable, under React 19.3.1. The P1s are all about rules stated more absolutely than React behaves.

| ID | Sev | Title |
|---|---|---|
| CR-01 | P1 | "A render renders everything inside it" ignores JSX received as `children`, which React does not re-render |
| CR-02 | P1 | React Compiler is described as something "you opt into"; the cited source says new Expo apps have it on by default |
| CR-03 | P1 | "The compiler changes which renders happen, not the rules of this course" hides that it breaks two of the course's predictions, which the practice items and both milestone challenges rely on |
| CR-04 | P1 | `l2-order-spread` asserts the updater runs after the rest of the handler; React 18 and 19 run it inside the set call on the first update |
| CR-05 | P2 | Three "predict first" prompts are answered on screen before the learner can predict |
| CR-06 | P2 | Answer-length cue in three choice items (the correct option is the longest) |
| CR-07 | P2 | Lesson 3 carries four ideas and one objective bundles two of them |
| CR-08 | P2 | `useLayoutEffect` is never mentioned, although the lesson teaches that `useEffect` may run after paint |
| CR-09 | P2 | Milestone 2 criteria ask for Profiler evidence the Profiler cannot show (Effect runs, Strict Mode double calls) |
| CR-10 | P3 | The flow caption puts property diffing in the render phase; React 19 diffs host props in the commit |
| CR-11 | P3 | "Zero DOM changes" is true for the result, but React 19 writes to an `<input>` on every commit that re-renders it |
| CR-12 | P3 | "Effects whose dependencies changed" omits Effects with no dependency array; Strict Mode table says "first mount" only |
| CR-13 | P3 | Grounding polish: S10 quote also in pinned S27; one cite points at the wrong page; one overstated summary of sources; S26 placement; an unused ledger claim |
| CR-14 | P3 | Terminology: "reconciliation" called a legacy name; "position by position" for keyed children; key reset scope on the cheat sheet |
| CR-15 | P3 | Practice polish: distractors that use later lessons' concepts; a fade label that states the answer; the Fiber aside |
| CR-16 | P3 | The Profiler gap could be narrowed with the React Performance Tracks page now on react.dev |

---

## P1 — misleading or overstated

### CR-01 · P1 · "A render renders everything inside it" ignores JSX received as `children`

**Where:**
- `lessons/0002-state-updates.html:57`: `<h2>Rule 3: a render renders everything inside it</h2>`
- `lessons/0002-state-updates.html:58`: "When a component renders, React renders the components it returns, and their children, all the way down … Props do not have to change. Components <em>above</em> or <em>beside</em> the one that updated are not called at all."
- `reference/cheat-sheet.html:44`: "<b>A render renders everything inside it</b> unless a child is in <code>memo</code> with equal props"

**Why:** stated as a rule with one exception (`memo`), but a second exception is the main memo-free technique on react.dev. The memo page the lesson already cites says, at the pinned commit (`reference/react/memo.md:129`): "When a component visually wraps other components, let it accept JSX as children. This way, when the wrapper component updates its own state, React knows that its children don't need to re-render." Executed on 19.3.1 and 18.3.1: `App` renders `<Wrapper><Child/></Wrapper>` and `Wrapper` also creates its own `<Child/>`. After `Wrapper`'s own state update, the log is `['Wrapper render 1', 'Child render']`. The `Child` created by `Wrapper` re-rendered; the `Child` passed in as `children` did not. A learner who applies Rule 3 as written to a layout or provider component will predict renders that the Profiler then does not show (milestone 1, criterion 3). The practice answer keys (`l2-children-default`, `l2-count-renders`) stay correct, because in both items the parent creates the child elements itself.

**Corrected text:**
- Heading: `<h2>Rule 3: a render renders every component it creates</h2>`
- Paragraph: "When a component renders, React renders the components it returns, and their children, all the way down<sup …S1>. The memo reference states the default bluntly: “React normally re-renders a component whenever its parent re-renders”<sup …S11>. Props do not have to change. One case follows from the definition: JSX that a component receives from its parent (for example as <code>children</code>) was created by the parent's render, not by this one, so when only this component's state changes React does not call it again<sup …S11>. Components <em>above</em> or <em>beside</em> the one that updated are not called at all."
- Cheat sheet 44: "<b>A render renders every component it creates</b>, all the way down, unless a child is in <code>memo</code> with equal props<sup …S11>. JSX passed in as <code>children</code> from a parent that did not render is not re-rendered<sup …S11>. Components above or beside the update are not called."
- Add to the L2 ledger: `L2-C10 · consensus · S11 · "When a wrapper updates its own state, JSX it received as children does not need to re-render."`

### CR-02 · P1 · React Compiler: "you opt into" contradicts the cited source

**Where:** `lessons/0003-effects-and-memo.html:96`: "It is a <b>build-time tool</b> you opt into (mainly a Babel plugin)"; `reference/cheat-sheet.html:58`: "React Compiler 1.0 (opt-in build tool, stable since Oct 2025)"; `RESOURCES.md:104` (L3-C9 "an opt-in build-time tool"); `NOTES.md:39` ("opt-in build tool").

**Why:** S19, the source cited for the sentence, says (`blog/2025/10/07/react-compiler-1.md:153`): "Expo SDK 54 and up has the compiler enabled by default", and (`:159`) that `create-vite` and `create-next-app` offer compiler-enabled templates. A learner on a recent Expo app, or one scaffolded from those templates, may have it on without ever opting in, so "check your build config" alone does not tell them it is there. Combined with CR-03, that learner's predictions will fail without explanation.

**Corrected text (lesson 3:96, first two sentences):** "React Compiler reached its first stable release, 1.0, on October 7, 2025<sup …S19>. It is a <b>build-time tool</b> (mainly a Babel plugin), not part of the React runtime, and it works with React 17 and up<sup …S18><sup …S19>. It is optional, but new projects can start with it on: Expo SDK 54 and up enables it by default, and <code>create-vite</code> and <code>create-next-app</code> offer templates with it enabled<sup …S19>."
Cheat sheet 58: "React Compiler 1.0 (build tool, stable since Oct 2025; on by default in new Expo apps)". L3-C9 and `NOTES.md:39`: replace "opt-in" with "optional (default in Expo SDK 54+)".

### CR-03 · P1 · "The compiler changes which renders happen, not the rules of this course"

**Where:** `lessons/0003-effects-and-memo.html:96`: "The compiler changes which renders happen, not the rules of this course: renders, commits and Effects work as taught. Check your build config to know whether it is on in your app." Also, by omission: `lessons/0002-state-updates.html:92` (milestone 1 task) and `lessons/0003-effects-and-memo.html:102` (milestone 2 task); practice items `l2-children-default` (`0002.practice.js:26`), `l2-count-renders` (`:38`), `l3-inline-object` (`0003.practice.js:48`), and the `render-sim` model.

**Why:** two of the course's predictive rules are exactly what the compiler changes. (a) "an object or function created during render is a new value every time" (`0003…html:65`): the compiler caches such values. (b) Rule 3, "children render by default": S18 (`learn/react-compiler/introduction.md`, section "Optimizing Re-renders") says the compiler can "avoid re-rendering `<MessageButton>` as the count changes", a child with no `memo`. With the compiler on, the keyed answers to `l2-children-default` ("Yes"), `l2-count-renders` (5) and `l3-inline-object` ("Yes") no longer match what the learner's own Profiler shows, and milestone 1 is scored on exactly that comparison. The answer keys are right for the model the course teaches. The problem is that the course never states the assumption, and says the rules are unaffected. The docs give a way to check: "Components optimized by React Compiler will show a “Memo ✨” badge in React DevTools" (`learn/react-compiler/installation.md:206`, pinned commit; not yet in `RESOURCES.md`).

**Corrected text (lesson 3:96, replace the last two sentences):** "With the compiler on, renders, commits and Effects still work as taught, but two predictions change: objects and functions created in a component are cached between renders instead of being new every time, and a child whose props did not change is usually skipped without <code>memo</code><sup …S18>. The practice items and the render model in this course assume the compiler is off. To check your app, look in React DevTools: components the compiler optimized show a “Memo ✨” badge<sup …S28>."
Add to the milestone 1 task (`0002…html:92`), after "open the <b>Profiler</b> panel": "If the Components panel shows a “Memo ✨” badge next to your components, React Compiler is on: say so in your prediction, because it skips renders that rules 1–3 predict<sup …S18><sup …S28>." Add the same sentence to milestone 2 (`0003…html:102`).
Add to `RESOURCES.md`: `[S28] [React Compiler: Installation](https://react.dev/learn/react-compiler/installation) — React team / react.dev · docs · tier T1 · verified <date> · version: React Compiler 1.x · open copy: https://github.com/reactjs/react.dev/blob/15653c0f9b95d6c4845e614e5bcc94c7ee2128f6/src/content/learn/react-compiler/installation.md` with use "the Memo ✨ badge that shows the compiler is active". Add the ledger claim `L3-C12 · consensus · S18, S28 · "With the compiler on, values created during render are cached and unchanged children can be skipped without memo; DevTools marks compiled components with a Memo ✨ badge."`

### CR-04 · P1 · `l2-order-spread`: the updater does not reliably run after the handler

**Where:** `lessons/0002.practice.js:42-48`, prompt "A click handler calls <code>setCount(c =&gt; c + 1)</code> in <code>Counter</code>, then logs something", steps in keyed order:
`'The rest of the click handler runs, including the log'`, `'React runs the queued updater and calls Counter with the new count'`, …
Related prose: `lessons/0002-state-updates.html:34`: "React queues it and, during the next render, runs the queue in order".

**Why:** the docs do describe updaters as applied "during the next render" (`learn/queueing-a-series-of-state-updates.md:105,119`; `reference/react/useState.md:74`). React, however, computes an updater eagerly inside the `set` call when the component has no other pending update; this optimisation is how the equal-value bail-out works. Executed, with a log inside the updater and one after the set call:
- React 19.3.1 (dev and prod), first click: `['updater runs with 0', 'rest of handler', 'render c=1']`
- second click: `['rest of handler', 'updater runs with 1', 'render c=2']`
- React 18.3.1: identical.

The item invites exactly this experiment ("then logs something"). A learner who tries it sees the opposite of the answer key on the first click. The key matches the docs' model, which is why this is P1 rather than P0, but the step claims a timing that React does not guarantee. The item's objective (l2.o2: which components render, and when) does not need the updater's timing at all.

**Corrected text:** step 2 becomes `'React calls Counter, and useState returns the new count'`; `why` becomes "Updates wait for the handler to finish (batching); then the updated component renders with the new state, then its children; the commit comes last and touches only what changed. (When exactly React calls the updater is not guaranteed, which is one reason updaters must be pure.)" Because this edits an item's answers, give it a new id (`l2-order-spread-2`), as `lesson-contract.md` ("Editing an item's prompt or answers starts a new history") advises for published items. Optional for the prose at `0002…html:34`: "React queues it, and the queue is applied in order to work out the next render's state<sup …S7>. React may call an updater earlier than that, so keep updaters pure<sup …S8>." The first half is in S7. The second half restates S8's "It must be pure" and adds reviewer-observed behaviour, so either drop "may call … earlier" or mark it as an observation.

---

## P2 — pedagogy

### CR-05 · P2 · "Predict first" prompts answered before the learner can predict

**Where and why:**
- `lessons/0001-render-and-commit.html:44`: "Before you step through it, predict: at which step does a DOM node actually change?" The figure's first paint shows node sub-labels "Commit / change the DOM" (`:47`) and the overview caption "Only the commit changes the DOM" (`:53`; `diagram.js` shows `cfg.summary` as the caption in the initial overview state, `diagram.js:335,341`). The answer is on screen next to the question.
- `lessons/0003-effects-and-memo.html:25`: "does the Effect come before or after the browser paints?" The summary at `:34` answers it ("for interactions they may come before the paint"), as does the edge label "usually".
- `lessons/0002-state-updates.html:45`: "**Why does the first row ignore `n`?** Decide before you read on. (A plain value replaces whatever is pending; only a function receives it.)" The answer is in the same paragraph, in parentheses.
- `lessons/0001.practice.js:25` (`l1-same-output-dom`) asks "returns exactly the same elements … How many DOM nodes does React change?" one paragraph after the bolded "React only changes the DOM nodes if there's a difference" (`0001…html:54`). This is recognition presented as recall.

`NOTES.md:45` makes "predict first, then look" the course's stated preference, and `visual-design.md` requires the figure's final state at first paint. The fix is to ask a question the figure does not answer.

**Corrected text:**
- L1:44: "Before you step through it, predict: if a re-render returns exactly what the last render returned, which of these four steps still happen?" L1:53 summary: "Trigger → render → commit → paint. Press Next to step through one update and check your prediction." The paragraph at :54 then answers it ("trigger and render happen; the commit has nothing to change").
- L3:25: "Predict before stepping through: after a <em>click</em>, can your Effect run before the browser paints?" L3:34 summary: "Trigger → render → commit → paint → Effects. Press Next to step through." The step-3 caption already gives the answer.
- L2:45: delete the parenthesis; put "A plain value replaces whatever is pending; only a function receives it." into the `why` of `l2-fade-queue`.
- `l1-same-output-dom`: move it below the reconciliation section, or make it transfer: "A parent passes `Clock` the same time string twice in a row. In the second commit, how many DOM nodes does React change? (a number)". Use a new id.

### CR-06 · P2 · Answer-length cue in three choice items

`lesson-contract.md` (Quality rules) requires options "within about ±25% of each other's length, with no … length cue to the answer". Lengths measured:
- `l2-children-default` (`0002.practice.js:26`): correct 46 chars, distractors 29/31/38. The correct option is 59% longer than the shortest and is the longest.
- `l3-usememo-when` (`0003.practice.js:60`): correct 62, distractors 48/47/50. Correct is the longest by 12 characters.
- `l1-define-render` (`0001.practice.js:4`): correct 57, distractors 52/47/48. Correct is the longest.

**Corrected text (new ids, since answers change):**
- `l2-children-default`: `'Yes: its parent rendered, so it is called'` (correct) · `'No: none of its props have changed'` · `'Only if its output would be different'` · `'Only in Strict Mode during development'`.
- `l3-usememo-when`: `'A 5 ms filter (console.time), inputs stable'` (correct) · `'Adding three numbers that change each render'` · `'Stopping this component from re-rendering'` · `'A cheap value shown only in its own JSX'`.
- `l1-define-render`: `'React called Sidebar to compute its elements'` (correct); keep the distractors.

### CR-07 · P2 · Lesson 3 carries four ideas, and l3.o1 bundles two

**Where:** `lessons/0003-effects-and-memo.html` teaches Effect timing (:24-36), Strict Mode with a version table (:38-58), re-render ≠ DOM update (:60-62), memoization with a when-is-it-worth-it list (:64-92), and React Compiler (:94-97), all within the 45-minute budget in `MISSION.md:13`. `course.js:42` objective l3.o1 joins "Place useEffect after commit" and "predict what Strict Mode repeats" in one objective, so a learner can reach L3 on it from the Strict Mode items alone (2 of its 3 items are Strict Mode).

**Why:** `lesson-contract.md` self-checklist 2 ("One idea") and `visual-design.md` ("Segmenting"). Lessons 1 and 2 are borderline as well: lesson 1 pairs render/commit with keep/reset, two different mechanisms. Lesson 3 is the clear case.

**Correction:** split into "Lesson 3 · Effects and Strict Mode" (objectives: place Effects after commit; predict Strict Mode's development repeats) and "Lesson 4 · When memoization skips work" (memo/useMemo/useCallback, the compiler box, the `render-sim` memo figure, milestone 2). Give each new objective ≥ 3 items with one non-choice. Keep `l3-interleave-dom` in the new lesson 4 and add an item on lesson 2's objective there. If the split is not wanted, at least split l3.o1 into `l3.o1` (Effect timing) and `l3.o3` (Strict Mode), each with three items.

### CR-08 · P2 · `useLayoutEffect` is never mentioned

**Where:** `lessons/0003-effects-and-memo.html:35`: "The answer is “usually after, but do not count on it” … What you <em>can</em> rely on is that the Effect runs after the commit." `RESOURCES.md:67` lists "`useLayoutEffect` is for work that must block paint" for S13, but no lesson uses it.

**Why:** the lesson creates the question "what if my Effect must run before the user sees the frame?" and leaves it open, so learners fall back on the known misconceptions (a `setTimeout`, or accepting the flicker). The same caveat the lesson quotes answers it.

**Corrected text (append to :35):** "If an Effect must finish before the user sees the screen, for example measuring and positioning a tooltip so it does not flicker, the docs point to <code>useLayoutEffect</code>, which blocks the paint, and add that this “shouldn't be needed for the vast majority of Effects”<sup …S13>." (Source: `reference/react/useEffect.md:65,1862`.) Ledger: `L3-C13 · consensus · S13 · "useLayoutEffect blocks paint; needed only when an Effect must finish before the screen is painted."`

### CR-09 · P2 · Milestone 2 criteria ask for evidence the Profiler cannot show

**Where:** `lessons/0003-effects-and-memo.html:107`: "The before recording names the target component or Effect and shows how many commits it rendered (or ran) in"; `:109`: "The after recording … shows the target rendering (or running) in fewer commits"; `:110`: "If the cause was Strict Mode, the claim is backed by a production build run, or by the setup → cleanup → setup pattern in the console."

**Why:** the DevTools Profiler lists components rendered per commit. It does not list which Effects ran, and Strict Mode's extra render and extra setup/cleanup happen inside one commit, so neither can be counted in commits. (This is reviewer reasoning; S21/S22 describe only per-commit render data.) A learner who picks an Effect or Strict Mode cannot meet criteria 1 and 3 as written. That breaks `lesson-contract.md`: "The learner can self-check against them."

**Corrected text:**
1. "The before evidence names one interaction and the target: for a component, the number of commits in which the Profiler shows it rendered; for an Effect, the number of times a <code>console.log</code> in its setup prints."
3. "The after evidence for the same interaction, collected the same way, shows a lower count, or, for “no change”, the before recording shows the target’s render time in milliseconds next to the threshold you used."
4. "If the cause was Strict Mode, the claim is backed by the same count in a production build, or by the setup → cleanup → setup pattern in the console (the Profiler shows one commit either way)."

---

## P3 — polish

### CR-10 · P3 · Property diffing is placed in the render phase

**Where:** `lessons/0001-render-and-commit.html:51` (flow caption): "React calls the component that updated, then the components it returns, and works out which properties changed since last time. It does not touch the DOM yet."; `:54` quotes the docs to the same effect.

**Why:** the docs do say this (`learn/render-and-commit.md:128,154`: "calculated while rendering!"). In React 19, react-dom compares host-element props during the commit: `react-dom-client.development.js` (19.3.1) has no `prepareUpdate`, and `commitUpdate(domElement, type, oldProps, newProps)` calls `updateProperties(domElement, type, oldProps, newProps)`, which does the comparison. Child matching (which elements to keep, create or delete) is still done while rendering. The course says it does not rely on internals (`0001…html:78`, `NOTES.md:41`), so the caption should not assert one.

**Corrected caption:** "<b>Render.</b> React calls the component that updated, then the components it returns, and compares the result with the previous render to decide what to keep. It does not touch the DOM yet." Keep the docs quote at :54 as a quote.

### CR-11 · P3 · "Zero DOM changes" and `<input>` in React 19

**Where:** `lessons/0001.practice.js:25` (`l1-same-output-dom`, key `0`); `lessons/0001-render-and-commit.html:70` ("It leaves the <code>&lt;input&gt;</code> alone").

**Why:** both are true for what the user can observe: typed text survives (executed), and no attribute or value ends up different. Still, react-dom 19 writes to an `<input>` on every commit that re-renders it: `updateInput` starts with `element.name = ""` and then restores or removes `name`. A MutationObserver on a re-rendered `<div><h1/><input/></div>` with identical output records `attributes:INPUT:name` twice on 19.3.1 and nothing on 18.3.1 (`<h1>` alone: nothing on either). A learner checking "zero DOM changes" with DevTools' DOM-mutation breakpoints or a MutationObserver on a form would see this. No change to the key is needed. Optionally reword the prompt to "how many DOM nodes end up different after the commit?" (new id) and add to the `why`: "React may still rewrite some attributes of form inputs, but nothing ends up different."

### CR-12 · P3 · Effect re-run condition; Strict Mode table scope

- `lessons/0003-effects-and-memo.html:33` (step 3 caption): "React runs the Effects whose dependencies changed". Effects without a dependency array run after every commit. Correction: "React runs the Effects whose dependencies changed (and those with no dependency array)."
- `:42` caption "What runs on the first mount, with Strict Mode on" with the row "Component body … called twice". Strict Mode double-calls the component body on every render, not just the first mount (`reference/react/StrictMode.md:139`). Correction for the row: "called twice (on every render, not just the first)".
- `:55`: "If your team is on 18, the ref-callback row above may not apply." Executed on 18.3.1 under Strict Mode: `['body','body','ref attach','effect setup','effect setup']`, so ref callbacks are not double-invoked. On 19.3.1: `[…'ref attach','effect setup','ref null','ref attach','effect setup']`. Correction: "If your team is on 18, the ref-callback row does not apply: React 18 calls ref callbacks once."

### CR-13 · P3 · Grounding polish

- **S10** (`RESOURCES.md:43`) is the only cited source with no pinned open copy, and it could not be re-fetched in this session (proxy 403). The sentence quoted from it, "Starting in React 18 with createRoot, all updates will be automatically batched, no matter where they originate from", appears word for word in the pinned **S27** (`blog/2022/03/08/react-18-upgrade-guide.md:188`), together with the `flushSync` opt-out (`:207`). Correction: add S27 next to S10 at `0002-state-updates.html:53` (both cites) and to L2-C6's sources, so the claim rests on a pinned copy.
- `reference/cheat-sheet.html:32`: Effect = "Code that runs after the commit because the component is displayed" cites S12, but the "because … displayed" wording is S20's (`learn/you-might-not-need-an-effect.md:288`: "code that should run *because* the component was displayed to the user"). Correction: cite S12 and S20.
- `lessons/0003-effects-and-memo.html:84`: "The reference pages give the same short list for all three tools". The memo list (re-renders often with the same props, expensive render) differs from the useMemo/useCallback list. Correction: "The reference pages give short, overlapping lists:".
- `RESOURCES.md:92`: S26 is a source the author "could not reach at all". `grounding.md` ("A source you tried and could not reach at all goes to `## Gaps`, not into `## Knowledge`") puts it in Gaps only. It is already in Gaps (`:114`) and in Verification debt; remove the Knowledge entry and keep the lesson's link with its `unverified` span (`0003…html:121`), which is correctly marked.
- `RESOURCES.md:30`: L1-C9 ("In Strict Mode during development React calls each component function twice") is ledgered under lesson 1 but taught only in lesson 3. Move it to the L3 ledger (it duplicates part of L3-C3).
- The statuses themselves are sound. Every react.dev and legacy entry cites a pinned open copy, the passages quoted in the lessons are present at those commits (see "Verified correct"), and the method is disclosed at `RESOURCES.md:3` and in Verification debt. Keeping `verified` for the canonical URL on the strength of the source file is a defensible reading of `grounding.md`, given that disclosure.

### CR-14 · P3 · Terminology

- `lessons/0001-render-and-commit.html:31` "The older docs’ name for …" and `reference/cheat-sheet.html:28` "Legacy name for comparing …" suggest the term is retired. react.dev at the pinned commit indeed does not use it in any cited page, but it is still React's own term (the `react-reconciler` package) and is common in talks. Correction: "The name the legacy docs used (and React's source still uses) for React comparing the new elements with the previous ones to decide what to keep."
- `:78`: "compares the new elements with the previous ones, position by position". Keyed children are matched by key. Correction: "position by position (or by key, when children have keys)".
- `reference/cheat-sheet.html:41`: "a new key resets that component". Correction: "a new key resets that component and everything inside it".

### CR-15 · P3 · Practice polish

- Distractors that rely on concepts from later lessons: `l1-branch-same-type` option "It is kept only when Panel is in memo" (`0001.practice.js:44`; `memo` is lesson 3), `l2-batch-timeout` "Two in development, one in production" and `l2-children-default` "Only in Strict Mode during development" (`0002.practice.js:23,35`; Strict Mode is lesson 3). `lesson-contract.md` checklist 2 says "nothing is taught that belongs to a later lesson". These are easy to eliminate by elimination, which weakens the items. Replace with in-lesson misconceptions, e.g. for `l1-branch-same-type`: "It is reset: the component re-rendered".
- `l1-fade-reset-key` label `'the special prop that becomes part of the position'` (`0001.practice.js:33`) repeats the lesson's definition of `key` (`0001…html:96`). Screen-reader users hear the answer as the field name (`practice.js:357` uses labels as `aria-label`). Correction: `'the prop that sets identity'`, or simply `'the attribute name'`.
- `lessons/0001-render-and-commit.html:78`: the parenthetical on Fiber introduces an out-of-scope term (MISSION.md:17) in the middle of the core rule. Move it to "Go deeper" or a footnote.

### CR-16 · P3 · Profiler guidance could use the current react.dev page

`RESOURCES.md:115` (Gaps) is accurate: react.dev has no page on reading the DevTools *Profiler tab*, so the 2018 post (S22) is the best source, and the lessons hedge it. At the pinned commit react.dev does document **React Performance Tracks** (`reference/dev-tools/react-performance-tracks.md`, React 19.2+; Components and Scheduler tracks in the browser Performance panel; on by default in development), and the cited S25 recap (`:81`) lists a talk on it. Adding it to lesson 2/3 "Go deeper", and allowing it as evidence in the milestone challenges, would give learners a current T1-documented tool. Mention that it is off in production builds by default (same page, Pitfall).

---

## Verified correct

Checked against the pinned sources (react.dev @ `15653c0f…`, legacy @ `075d4170…`), and where marked **[run]**, executed on react-dom 19.3.1 (and 18.3.1).

**Lesson 1**
- "Rendering is React calling your components", the two triggers, recursive rendering, the commit applies "the minimal necessary operations", "React only changes the DOM nodes if there's a difference between renders", the paint epilogue: `render-and-commit.md:34,80,85,154,156,197`. The Clock example and why the `<input>` survives: same file. Typed text survives **[run]**.
- Element as "a lightweight description of a piece of the user interface": `createElement.md:185`.
- "the reconciliation algorithm is an implementation detail": legacy `reconciliation.md:172`; the page marks itself "old and won't be updated" (`:9`).
- Same type and position keeps state; a different type resets the entire subtree (the div → section example matches the docs' section → div); state is tied to position in the returned tree, not to the JSX branch (`isFancy` ternary); key as "part of the position"; the chat-draft `key={to.id}` example: `preserving-and-resetting-state.md:275,479,586,1012,1121`. Ternary keeps state; `key={Math.random()}` re-creates state on every render **[run]**.
- `Math.random()` keys "never match up … all your components and DOM being recreated … lose any user input"; index used when no key: `rendering-lists.md:422,424`.
- Version banner: react.dev "Latest version: 19.3" (`versions.md:15`); `react@19.3.1` installs from npm.
- All six L1 answer keys are correct.

**Lesson 2**
- "Setting state only changes it for the *next* render"; "A state variable's value never changes within a render, even if its event handler's code is asynchronous": `state-as-a-snapshot.md:132,255`. `l2-snapshot-log` prints 0 and the next render has n = 1 **[run]**.
- "React waits until *all* code in the event handlers has run…"; "even from multiple components"; no batching across separate intentional events; the "replace with 5" → 6 queue table: `queueing-a-series-of-state-updates.md:58,64,66,173-180`. `l2-fade-queue` (3, then 30) is correct.
- Before React 18 only React event handlers batched; React 18 + `createRoot` batches timeouts, promises and native handlers; `flushSync` opt-out: `react-v18.md:92`, `react-18-upgrade-guide.md:167-224`. Legacy `ReactDOM.render` on 18 "will behave as if it's running React 17": upgrade guide `:48`. `ReactDOM.render` removed in 19: `react-19-upgrade-guide.md:392`. `l2-batch-timeout`: one render after the timeout callback, `['render 1 2']`, **[run]** on 19 and 18.
- "React normally re-renders a component whenever its parent re-renders": `memo.md:57`. `l2-children-default` (Yes) and `l2-count-renders` (5) are correct for the code given (compiler off; see CR-01/CR-03).
- Equal-value bail-out by `Object.is`, "may still need to call your component before skipping the children": `useState.md:84`. Setting an equal value caused no render **[run]**.
- `render-sim` (`0002.figures.js`): within its stated simplification, the four rules match React. Theme toggle: 9 of 9 render, 1 DOM change (header class). +1: 3 render, 1 DOM change. Order is depth-first, as React's work loop goes. `memo` skips only when every prop is `Object.is`-equal. A memo'd component still renders for its own state. `useCallback` keeps handler identity. The lesson 3 goal (2 renders per update) is reachable only with `memo` on Counter, Button and List plus `useCallback`, which is the intended lesson. The page and `NOTES.md:40` label it as a model, not React.

**Lesson 3**
- "Effects run at the end of a commit after the screen updates": `synchronizing-with-effects.md:31`. Non-interaction Effects: React "will generally let the browser paint the updated screen first"; interaction Effects: React "may run your Effect before the browser paints": `useEffect.md:65,67`. The lesson's "always after the commit, paint order not guaranteed for clicks" is exact. Not executed (no paint in jsdom).
- An Effect that sets state "restarts the whole process from scratch": `you-might-not-need-an-effect.md:26`.
- Strict Mode: development-only ("All of these checks are development-only and do not impact the production build", `StrictMode.md:94`); component body double-called, not event handlers (`:139`); extra setup+cleanup for Effects and callback refs (`:43-47`, `:1103`); remount on first mount (`synchronizing-with-effects.md:529,589,591`); "The right question isn't 'how to run an Effect once'…" (`:595`). **[run]** 19.3.1 dev: body ×2, Effect setup ×2 with no cleanup (so `l3-strict-effect` "two connections, neither closed" is right), ref attach → null → attach; production: each once. `l3-strict-body` = 2 is right.
- React 18 introduced the development-only remount check (`react-v18.md:204`). React 19: `useMemo`/`useCallback` reuse first-render results in the double render; ref callbacks double-invoked on initial mount (`react-19-upgrade-guide.md:530,532`). Ref callbacks not double-invoked on 18.3.1 **[run]**.
- `actualDuration` ("milliseconds spent rendering the `<Profiler>` and its descendants for the current update"); profiling disabled in production by default: `Profiler.md:58,40`.
- memo: `Object.is` per prop (`memo.md:45,278`); "a performance optimization, not a guarantee" (`:29`); still re-renders for own state or a used context (`:69,143,218`); "completely useless if the props … are *always different*" and the "only valuable when … re-renders often with the same exact props … no perceptible lag" list (`:123`). An inline object prop defeats `memo` (`l3-inline-object` = Yes) **[run]**.
- useMemo: "only valuable in a few cases"; `console.time`; "say, `1ms` or more"; CPU throttling; "no benefit … no significant harm … less readable" (`useMemo.md:130,142,154,160`). useCallback: "only valuable in a few cases"; "does not prevent *creating* the function" (`useCallback.md:227,234`). `l3-fade-usecallback` (`useCallback`, `[]`) and `l3-usememo-when` keys are correct.
- React Compiler: stable 1.0 on October 7, 2025 (`blog/index.md:45`, `react-compiler-1.md:25`); no later compiler release post up to the pinned commit; React 17+ with a `target` setting and `react-compiler-runtime` (`:93`); pin an exact version without good test coverage (`:190`); build-time, "primarily a light Babel plugin" (`introduction.md`, "What build tools are supported?"); memoizes "React components and hooks, not every function"; `useMemo`/`useCallback` remain escape hatches; "leaving existing memoization in place … or carefully testing before removing" (`introduction.md:174`).
- `l3-order-effect` and `l3-interleave-dom` keys and every per-option `why` in lesson 3 are correct.
- The S26 talk: title, speaker and timestamp URL match S25 (`react-conf-2025-recap.md:79`). It is correctly marked unverified in the lesson.

**Cheat sheet:** apart from CR-01, CR-02, CR-13 and CR-14, every row and every cell of the version table matches the sources above.

**Contract checks that pass:** file names, CSP, `lang`, `data-lesson`, script order; every item placed once with `data-practice-item`; ≥ 3 items per objective, each objective with a recall, order or fade item (so L3 "Understood" is reachable, per `mastery.md`); choice options shuffled at runtime (`practice.js:229`); one interleaved item in lesson 3; worked example → faded item in each lesson; a "why does this line exist?" prompt in each; challenges with correct `data-kind`, 3–4 criteria, own-app transfer (apart from CR-09); mission tie-in, primary source, Go deeper (3–4 links), follow-up line and neighbour links on every lesson; no literal colours in lessons or figures.

## Re-check (revision 1)

Re-checked on 2026-11-25 against the current `examples/react-rendering/` files (lessons 0001–0004, the four practice files, `0002.figures.js`, the cheat sheet, `RESOURCES.md`, `NOTES.md`, `course.js`, `index.html`) and the author's CR list in `docs/audit/handoffs/F2-react.md`. Line numbers refer to the revised files. Sources were re-read at pinned commit `15653c0f…`, including the three new ones (S28–S30), fetched from `raw.githubusercontent.com`. Answer keys were re-run on react/react-dom **19.3.1** and **18.3.1** in jsdom: `t.js` and the new `t3.js` in `/tmp/claude-0/-home-user/be6c5257-bdb3-59a5-94e4-7a2e3ced1103/scratchpad/rev-react/`. `lint-workspace.mjs`: clean. There are no stale references to `0003-effects-and-memo.html` or to retired ids.

### Status of each finding

| CR | Status | Evidence (current text) |
|---|---|---|
| CR-01 | **Fixed** | `0002-state-updates.html:57` "Rule 3: a render renders every component it creates". `:58` adds the `children` case and quotes S11 ("updates its own state, React knows that its children don’t need to re-render"). Cheat sheet rule 5 matches. Ledger L2-C10 added. New item `l4-interleave-children`: key "No" confirmed **[run]**, on 19 and 18 only `Layout` re-renders, `Feed` is not called. |
| CR-02 | **Fixed** | `0004-memoization.html:62` "It is optional, but new projects can start with it on: Expo SDK 54 and up enables it by default, and `create-vite` and `create-next-app` offer templates with it enabled". Matches S19 `react-compiler-1.md:153,159`. Cheat sheet row and L4-C5 match. |
| CR-03 | **Fixed** | `0004…html:30` states the compiler-off assumption up front. `:63` names the two predictions that change and the "Memo ✨" badge. The badge check is also in the m1 task (`0002…html:92`), the m2 task (`0004…html:69`) and cheat sheet rule 8. S28 checked at the pinned commit: `learn/react-compiler/installation.md:206` "Components optimized by React Compiler will show a "Memo ✨" badge in React DevTools". The `verified` status is justified. |
| CR-04 | **Fixed** | `l2-order-spread-2` (`0002.practice.js:40-48`) step 2 is now "React calls Counter, and useState returns the new count". That holds even with eager updaters **[run]**: the render comes after the rest of the handler on both clicks. Prose `0002…html:34`: "the queue is applied in order to work out the next render’s state … Updaters must be pure, so exactly when React calls one never changes the result". |
| CR-05 | **Fixed** | L1 `:44` prediction is now "which of these four steps still happen?", with a neutral summary at `:53` and the answer at `:54`. L3 `:25` asks "after a click, can your Effect run before the browser paints?", with a neutral summary at `:34`. L2 `:45` has no parenthetical answer; it moved to `l2-fade-queue`'s `why`. `l1-same-output-dom` was replaced by the transfer item `l1-same-output-clock` (key 0; the DOM is unchanged **[run]**). |
| CR-06 | **Fixed** | `l1-define-render-2`, `l2-children-default-2` and `l4-usememo-when` use balanced options; the correct option is no longer the longest. The lint option-length check passes. |
| CR-07 | **Fixed** | The split is clean. L3 "Effects and Strict Mode" has l3.o1 (Effect timing, `useLayoutEffect`, Effect-caused re-render) and l3.o2 (Strict Mode), each with ≥ 3 items including a non-choice item, plus an L2 interleave. L4 has l4.o1 with 3 items (1 fade) plus two interleaves, and milestone m2. In `course.js`, lesson 3 has `data-kind="lesson"` and lesson 4 carries `data-milestone="m2"`. |
| CR-08 | **Fixed** | `0003-effects-and-strict-mode.html:36` quotes S13 "shouldn’t be needed for the vast majority of Effects" (`useEffect.md:1862`). Recall item `l3-layout-recall` and ledger L3-C6 are added. |
| CR-09 | **Fixed** | `0004…html:74-77` use the corrected criteria: Effects counted by `console.log`, Strict Mode backed by a production count or the console pattern. |
| CR-10 | **Mostly fixed** | The L1 render caption (`:51`) now reads "compares the result with the previous render to decide what to keep". Residual (P3): `0001…html:54` still says "During a re-render React works out which properties changed", and the L1 edge label is still `"diff"` (`:48`). Both are the docs' wording. Suggest "During a re-render React works out what changed, but …" and the edge label `"compare"` (as L3 already has). |
| CR-11 | **Fixed** | `l1-same-output-clock` asks what "ends up different", and its `why` mentions input-attribute rewrites. Residual (P3): that parenthetical has no source; it rests on this review's run. Either mark it "(observed in React 19)" or drop it. |
| CR-12 | **Fixed** | `0003…html:33` "(and those with no dependency array)". `:62` "called twice, on every render". `:64-65` rows scoped "on the first mount". `:72` "If your team is on React 18, the ref-callback row does not apply", which matches the 18.3.1 run (ref callback once). |
| CR-13 | **Fixed** | S27 is cited next to S10 at `0002…html:53`, in L2-C6 and on the cheat sheet. The cheat-sheet Effect row cites S12+S20, and L3 `:25` now cites S20 for "because the component was displayed". L4 `:50` says "short, overlapping lists". S26 is moved to Gaps (`RESOURCES.md:128`); the L4 link keeps its `unverified` span. L1-C9 is folded into L3-C3. |
| CR-14 | **Fixed** | L1 `:31` and the cheat sheet: "The name the legacy docs used (and React’s source still uses)". `:78` "position by position (or by key, when children have keys)". Cheat sheet "resets that component and everything inside it". |
| CR-15 | **Fixed** | The distractors no longer rely on later lessons: `l1-branch-same-type-2` "It is reset: the component re-rendered"; `l2-batch-timeout-2` has 3 options (allowed: 3–5); `l2-children-default-2` has no Strict Mode option. The fade label is now "the attribute name". The Fiber aside is now a footnote (`0001…html:78` and `#fn-fiber`). |
| CR-16 | **Fixed** | S29 and S30 are added and cited in the L4 m2 task (`:69`), L4 Go deeper and cheat-sheet Profiler item 4. Checked at the pinned commit: `reference/dev-tools/react-performance-tracks.md` documents Scheduler/Components tracks, Effect durations on the Components track (`:101`), on by default in development and off in production (`:24-34`). `blog/2025/10/01/react-19-2.md:5,144` says 19.2 adds Performance Tracks. The `verified` status and "19.2+" scope are justified. |

### New answer keys re-run

The executed results below are identical on 19.3.1 and 18.3.1.
- **`l3-effect-sets-state`** (key "Two"): a Profiler `onRender` on mount logs `['mount', 'update']`, 2 renders, final text "Ada L". Correct.
- **`l3-strict-handler`** (key "Once"): one click under `<StrictMode>` in development runs the handler once. Correct.
- **`l3-interleave-snapshot`** (key 5): renders see `[4, 5]`, and `[4, 4, 5, 5]` under Strict Mode. Correct either way.
- **`l4-interleave-children`** (key "No"): correct; see CR-01.
- **`l4-inline-object`**: the new distractor "No: memo skips every parent-caused render" has a correct `why`.
- **Unchanged, still correct:** `l3-order-effect`, `l3-strict-effect`, `l3-strict-body` and `l3-layout-recall`.
- **Worked example:** the lesson 3 `Profile` example (`:39-49`, "first commit shows ''", then a second pass) matches the run.

### New issues (all P3; no new P0, P1 or P2)

- **CR-R1-01 · P3:** m2 criterion 1 (`0004…html:74`) counts "the number of commits in which the Profiler shows it rendered", but the task (`:69`) also accepts React Performance tracks. Suggested text: "…in which the Profiler, or the Components track, shows it rendered".
- **CR-R1-02 · P3:** ids were renamed or reassigned. `l3-interleave-dom` → `l4-interleave-dom` and `l3-fade-usecallback` → `l4-fade-usecallback` (content unchanged apart from a label). `l3-strict-effect` and `l3-strict-body` moved objective from l3.o1 to l3.o2. This conflicts with `lesson-contract.md` ("Never reuse or rename a published id"), but it is harmless in an example course with no learner records. Note it under Revisions in `NOTES.md`, so readers do not copy it as normal practice.
- **CR-R1-03 · P3:** lesson 3 Go deeper (`0003…html:97-100`) is three docs pages, where `lesson-contract.md` asks for mixed media. The only video candidate (S26) is unverified, so this may be the best available. Say so in `NOTES.md`, or add the S25 recap's "Profiling with React Performance tracks" talk as unverified optional viewing.
- **CR-10 and CR-11 residuals:** listed in the table above.
