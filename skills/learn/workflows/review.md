# Review

Cold, spaced retrieval of what the learner studied earlier. The browser's `review.html` runs it from the learner's local progress; you read exported evidence and run cold checks in chat. How scheduling works: [mastery → Review schedule](../references/mastery.md#review-schedule).

**You cannot see forgetting.** You only see assessment results the learner exported or gave you in chat. Never say "you have probably forgotten X" without them; say what is *due to be tested*, and why.

## Steps

1. **Point to `review.html`** at the course root: open it in the same browser used for the lessons. It picks the due objectives, mixes their items, hides the lesson text, and counts only first attempts. Wrong answers link back to the lesson section.
2. **If the learner exported progress** (the dashboard's **Export progress** button downloads `progress-<course>-<date>.json`; ask them to move it into the course's `progress/` folder), read it as below and tell them in a few lines: what is due, what lapsed, and which objectives have two failed reviews in a row. Two failures in a row means re-teach with a new explanation or model, not another test.
3. **If there is no export**, say that you cannot see their browser practice, explain how to export it, and offer a chat review instead.
4. **Chat review** (no browser, or by request): for each due or chosen objective, 2 or more recall or application items written fresh, with no lesson text shown. Grade only first answers. Record the outcome in `NOTES.md` (`review <date>: l1.o1 2/2, l2.o1 0/2`). The browser's schedule does not see chat reviews; say so.

## Read exported evidence

An export is `{ format: "learncraft-progress", schemaVersion: 2, course, events: [...] }` ([components → store](../references/components.md#store)). Events are append-only and deduplicated by `id`; levels and schedules are derived, never stored. With Node, derive them with the course's own runtime:

```bash
node -e '
global.window = {}; const S = require("./assets/store.js");
const createStore = S.createStore || (S.store && S.store.createStore);
const fs = require("fs"), mem = {};
const storage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
const files = fs.readdirSync("progress").filter((f) => f.endsWith(".json"));
const course = JSON.parse(fs.readFileSync("progress/" + files[0], "utf8")).course;
const s = createStore({ courseId: course, storage }); s.load();
for (const f of files) console.error(f, JSON.stringify(s.importJSON(fs.readFileSync("progress/" + f, "utf8"))));
console.log(JSON.stringify(s.due(Date.now()), null, 1));'
```

Without Node, read the events by hand: per objective, count `attempt` events with `firstEver: true` and their `outcome`, and read the latest `review_session` results. Exports are the learner's data: read them, never edit or delete them.

## Cold check

A cold check is your version of a review session for a mastered milestone, run when its `cold-check` date in `NOTES.md` has passed.

1. Ask 1–2 questions that require the milestone's `canDo` in a new small case. Show no lesson content and allow no lookup.
2. Pass: write a learning record `kind: demonstrated`, `milestone: m<k>`, `result: pass`, noting "cold check, N days after the challenge". This is retention evidence ([mastery](../references/mastery.md#levels)).
3. Miss: add `lapsed: m<k> <date>` to `NOTES.md`, plus a `kind: misconception` record if one surfaced, and offer a short re-teach. The milestone stays mastered.
4. Remove the `cold-check` line either way.
