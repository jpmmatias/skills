# Notes

lang: en
profile: balanced
theme: default (assets/theme.css unchanged)
example: true — shipped example course; no learner, no diagnostic, no learning records, no progress
diagnostic: not applicable (example course)
environment: the learner's own React app on React 19 (18 works; each lesson flags what changed), React Developer Tools in a desktop browser. Nothing in the course itself needs a build: every figure runs from file://.
version: React 19. The react.dev docs used were at version 19.3 (their "React Versions" page, source commit 15653c0, 2026-11-24). Re-verify docs entries after 90 days (2027-02-23).
sources: read 2026-11-25. react.dev and legacy.reactjs.org did not resolve in the authoring session, so each docs page was read from its source file in the official GitHub repository (reactjs/react.dev at 15653c0; reactjs/legacy.reactjs.org at 075d417) and recorded with that file as its open copy. One GitHub discussion was fetched directly. Videos could not be opened (youtube.com blocked) and stay unverified.

## Per-lesson decisions

- L1: no scene — a stepped flow graph (trigger → render → commit → paint, diagram.js `flow`) plus three side-by-side reconciliation cases as cards: the order of phases is a short chain the learner steps through, and the reconciliation rules are a comparison, which a static figure shows at a glance | requires: — | challenge: lesson
- L2: no scene — an explorable instead (`render-sim` in `lessons/0002.figures.js`): the learner picks which component calls its setter and sees which components render and which DOM nodes change; insight comes from changing the trigger, not from watching | requires: l1.o1 | challenge: milestone m1
- L3: no scene — a stepped flow graph of trigger → render → commit → paint → Effects (diagram.js `flow`), a worked example of an Effect that costs a second render, and a development-vs-production table for Strict Mode (a comparison, so a table) | requires: l1.o1, l2.o1 (interleaved item l3-interleave-snapshot) | challenge: lesson
- L4: no scene — the `render-sim` explorable with its memo and `useCallback` switches on (lesson 4 loads `0002.figures.js` from the same folder) and a goal check; insight comes from flipping switches, not from watching | requires: l1.o1, l2.o2 (interleaved items l4-interleave-dom, l4-interleave-children) | challenge: milestone m2

## Accuracy

- Every claim about React behaviour cites a react.dev page (T1) or the React 18 batching discussion by the React team. Version-specific behaviour is flagged where it is taught: automatic batching (React 18+ with `createRoot`), Strict Mode effect double-run (since React 18), the React 19 Strict Mode changes (memoized results reused in the second render; ref callbacks double-invoked), React Compiler 1.0 (stable since October 2025, optional build tool that is on by default in Expo SDK 54+ and offered by create-vite/create-next-app templates, React 17+).
- The `render-sim` explorable is a **simplified model of the rules the lessons teach**, not React. It says so on the page. It ignores context, `key` changes, bail-outs on equal state, concurrent rendering and everything the docs call an implementation detail.
- **The course assumes React Compiler is off** (stated in lesson 4, on the cheat sheet and in both milestone challenges, with the DevTools “Memo ✨” badge as the way to check). The practice keys and the render model follow the no-compiler rules.
- The render model creates every child inside its parent, so it never shows the `children`-as-JSX exception taught in lesson 2 (rule 3); that case is practised in `l4-interleave-children`.
- Fiber is not taught. The legacy reconciliation page is cited only for the term "reconciliation" and its statement that the algorithm is an implementation detail.

## Preferences

- Predict first, then look: every figure invites a prediction before the answer is shown in prose.

## Upstream

- `Learncraft.explorable` takes range sliders only. The render-sim needs radio buttons and checkboxes, so it is a bespoke `Learncraft.register` component; an explorable `params` type for `choice` and `toggle` would let courses like this reuse the explorable's readout, announce and target-check plumbing.
- A component used by two lessons has no obvious home in the file contract (`NNNN.figures.js` is per lesson). Lesson 4 loads `0002.figures.js` from its own folder, which the linter accepts.

## Revisions

- revision 1 (2026-11-25): independent review `docs/audit/reviews/course-react.md`. Lesson 3 split into lesson 3 (Effects and Strict Mode) and lesson 4 (memoization); items whose answers changed got new ids; sources S28–S30 added, S26 retired to Gaps.
- Renamed or re-scoped item ids in revision 1 (allowed here only because an example course has no learners; the lesson contract forbids renaming a published id in a real course): `l3-interleave-dom` → `l4-interleave-dom`, `l3-fade-usecallback` → `l4-fade-usecallback`; the Strict Mode items moved from objective `l3.o1` to `l3.o2`.
- Lesson 3's Go deeper is docs-only: the only video candidate (S26) is unverified and listed under Gaps in `RESOURCES.md`.
