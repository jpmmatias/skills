# Mission: React Rendering Internals

> Example mission for a shipped example course. It describes a typical learner, not a real person.

## Why
A frontend developer who builds React apps every day wants to stop guessing why components re-render. Today they sprinkle `memo`, `useMemo` and `useCallback` by feel and remove effects by trial and error; they want to predict what React will do after a state update and back every performance change with evidence from their own app.

## Success looks like
- Predict, for a state update in their own app, which components render and which DOM nodes actually change, and confirm the prediction with React DevTools.
- Explain a surprising re-render or effect run in their own app from Profiler evidence, and choose the fix (cleanup, stable props, `memo`, or no change) that the evidence supports.

## Constraints
- About 45 minutes per lesson; works in an existing app on React 19 (the rules taught also hold on React 18 unless a lesson says otherwise).
- Has React Developer Tools in a desktop browser.

## Out of scope
- React's internal data structures and scheduler (Fiber, lanes): implementation details that may change.
- Server Components, Suspense, transitions and concurrent rendering features.
- Class components and legacy lifecycles.
