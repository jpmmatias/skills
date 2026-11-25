# Lesson contract (binding)

What every lesson must contain so the runtime, the check tool, the validator and the reviewers can rely on it. Structure and prose are free ([flexible structure](teaching-core.md#flexible-structure)); the hooks below are not.

## Files

| File | Name |
|---|---|
| lesson | `lessons/NNNN-<slug>.html` (4-digit number, lowercase dash-case slug), as listed in `course.js` |
| practice items | `lessons/NNNN.practice.js` |
| motion scenes | `lessons/scenes-NNNN.js` |
| other lesson code (explorables, custom figures) | `lessons/NNNN.figures.js` |
| reference documents | `reference/<slug>.html` |
| lab | `labs/NN-<name>/` with a `README.md` |

## Page shell and script order

```html
<!doctype html>
<html lang="en">                                       <!-- the course lang from NOTES.md / course.js -->
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>Lesson 3 · Attention weights</title>
  <link rel="stylesheet" href="../assets/style.css">   <!-- imports figures.css -->
  <link rel="stylesheet" href="../assets/theme.css">
</head>
<body data-lesson="3">
<main>
  <div id="progress"></div>
  … prose, figures, worked and faded examples …
  <div data-practice-set></div>
  <section id="challenge" data-kind="lesson">…</section>
</main>
<script src="../assets/core.js"></script>
<script src="../assets/store.js"></script>
<script src="../assets/course.js"></script>
<script src="0003.practice.js"></script>              <!-- practice items as data -->
<script src="../assets/progress.js"></script>
<script src="../assets/practice.js"></script>
<script src="../assets/viz.js"></script>              <!-- optional; before diagram.js and scene.js -->
<script src="../assets/diagram.js"></script>          <!-- optional -->
<script src="../assets/scene.js"></script>            <!-- optional -->
<script src="scenes-0003.js"></script>                <!-- optional -->
<script src="0003.figures.js"></script>               <!-- optional -->
</body>
</html>
```

Start from `${CLAUDE_SKILL_DIR}/starter/templates/lesson.html` (and `0001.practice.js`, `reference.html` for reference documents). All scripts are classic scripts (no modules, no build) that start themselves after `core.js`.

**No inline code.** The CSP allows only script files from the workspace and no network requests, so courses work offline and cannot phone home. Never write an inline `<script>`, an `on…=` attribute, a remote script, or a CDN stylesheet or font; lesson-specific code goes in `scenes-NNNN.js` or `NNNN.figures.js` next to the lesson.

## Required content

- `<html lang>` set to the course language; `<body data-lesson="N">` matching `course.js`.
- `<div id="progress"></div>`: the runtime renders the mission line, the milestone path and practice stats into it.
- Practice placed with `data-practice-set` or `data-practice-item` (below).
- A `#challenge` section (below).
- The mission tie-in: one sentence on why this lesson matters for the learner's mission.
- A **primary source** recommendation and a **Go deeper** list of 2–5 links from `RESOURCES.md`, mixed media, each with type, length and why it is worth the time.
- One line inviting the learner to ask their agent follow-up questions.
- Links to the previous and next lesson and to the matching reference documents.

## Practice items

Items are data in `lessons/NNNN.practice.js`, rendered by the runtime:

```js
Learncraft.practice(3, [
  { id: 'l3-attn-weights', type: 'choice', objective: 'l3.o1',
    prompt: 'What do the attention weights of one query sum to?',
    options: [ { text: '1', correct: true, why: 'They come out of a softmax.' },
               { text: 'The sequence length', why: 'That is how many weights there are, not their sum.' },
               { text: 'The key dimension', why: 'd_k scales the scores before the softmax; it is not a sum.' } ] },
  { id: 'l3-recall-softmax', type: 'recall', objective: 'l3.o1',
    prompt: 'Which function turns scores into weights?', accept: ['softmax'],
    why: 'Softmax makes every weight positive and the weights sum to 1.' },
  { id: 'l3-order-steps', type: 'order', objective: 'l3.o2',
    prompt: 'Put the steps of one attention head in order.',
    steps: ['Score each key against the query', 'Scale by √d_k', 'Softmax the scores', 'Weight and sum the values'] },
  { id: 'l3-fade-qkv', type: 'fade', objective: 'l3.o2', prompt: 'Complete the score formula.',
    template: 'scores = Q · {{K}}ᵀ / √{{d_k}}', blanks: { K: ['K'], d_k: ['d_k', 'dk'] } },
]);
```

| Field | Rule |
|---|---|
| `id` | required; unique **course-wide**; matches `^[a-z0-9][a-z0-9-]*$`; convention `l<n>-<slug>`. Never reuse or rename a published id. |
| `type` | required: `choice`, `recall`, `order` or `fade` |
| `objective` | an objective id from `course.js` (`l3.o1`); defaults to `l<n>` |
| `prompt` | required; text, with the same limited markup as `why` |
| `why` | shown after answering; recommended on every item; limited markup only (`b strong em i code br sup sub a`) |
| `choice` | `options`: 3–5 entries `{ text, correct?, why }`, exactly one `correct: true`; every option has a `why` saying what that choice gets wrong (or right) |
| `recall` | `accept`: accepted answers; matching ignores case, accents, quotes, spacing and leading/trailing punctuation. An entry may be a number, or `{ answer, tolerance }` with its own numeric tolerance |
| `order` | `steps`: 3–7 steps in the **correct** order; the runtime shuffles them |
| `fade` | `template` with `{{name}}` blanks; `blanks`: `{ name: [accepted answers] }`, one key per blank; `labels`: recommended: `{ name: 'accessible name' }` for each blank (screen readers announce it) |
| `pretest` | optional `true`: asked before teaching (a guess). Recorded with `context: 'diagnostic'`; never counts toward levels, XP or review entry, and not toward the ≥ 3 items per objective |
| optional | `code: true` renders answers in monospace; `recall` and `fade` may set `tolerance` to accept numeric answers within ± that value |

This contract is stricter than `practice-items.schema.json` on purpose (3–5 options, 3–7 steps); the schema accepts more so older lessons still load.

Quality rules:
- Each objective has **≥ 3 items**, at least one not of type `choice`.
- Choice options are within about ±25% of each other's length, with no "all/none of the above" and no wording or length cue to the answer.
- From lesson 3 on, at least one item targets an earlier lesson's objective (interleaving).
- Items test the objective, not page trivia, and do not reuse the prose's exact sentences.
- Editing an item's prompt or answers starts a new history for it (its version changes). Fix typos sparingly; add new items with new ids instead.

**Placement:** `<div data-practice-set></div>` renders all the lesson's items in order. To spread items through the page (a pretest at the top, an item next to its figure), place **every** item with `<div data-practice-item="id"></div>` and leave out `data-practice-set`, so no item appears twice.

## Challenge

```html
<section id="challenge" data-kind="milestone" data-milestone="m2">
  <h2>Challenge</h2>
  <p>The task: a real-world transfer of the lesson's skill, on the learner's own material.</p>
  <h3>What to send back</h3>
  <p>The concrete artifacts: a results file, a diff, a written answer, a photo of the setup.</p>
  <h3>Pass criteria</h3>
  <ol class="criteria"><li>…</li><li>…</li></ol>
</section>
```

- `data-kind="milestone"` only on the last lesson of a milestone, with `data-milestone`; every other lesson uses `data-kind="lesson"`.
- **2–4 criteria**, each naming an observable artifact, number or behaviour, together covering the `canDo`. No evaluative-only words ("good", "clean", "well") and no understand/know/learn verbs. The learner can self-check against them before sending.
- The task differs from the practice items (transfer), and asks for the learner's own data, system or setting where possible.

## Citations and grounding marks

- A sourced claim ends with `<sup class="cite"><a href="../RESOURCES.md#s3" data-src="S3">3</a></sup>`. One `sup` per source; every `data-src` is an id in `RESOURCES.md`.
- A claim resting only on unverified sources is wrapped: `<span class="unverified" title="Not independently verified">…</span>`.
- Numbers that are not from a real run or a cited source say **illustrative** in visible text.
- A disputed claim says so next to it ("disputed, see S4") and cites both sides ([grounding](grounding.md#claim-strength-and-disputed-claims)).

## Theme and text

- No literal colours (hex, `rgb()`, `hsl()`, named colours) or font names in lessons, scenes or practice data. Use theme tokens (`var(--signal)`, `var(--muted)`…, see [THEME-FORMAT](../THEME-FORMAT.md)).
- Course data (`course.js` titles, labels, practice prompts) is plain text: the runtime escapes it. Do not put HTML in it.
- Links in lesson HTML and in `why`/captions are `https://…`, `mailto:`, `#…` or relative paths inside the workspace. The check rejects `javascript:` in any spelling (`java&#9;script:`, `&#1;javascript:`, `javascript&colon;`), `data:` links, `//host` and `\\host` paths, `srcdoc`, `<object>`/`<embed>`, `<base>` and `<meta http-equiv="refresh">`.
- Code blocks that scroll sideways get `tabindex="0"` from the runtime (keyboard users can scroll them); you need not add it.
- Figures follow [visual-design](visual-design.md#building-figures).

## Legacy markup

Lessons written before practice data (`.quiz-q` buttons, `.fade` inputs) keep working. Give each such root a unique `data-id`; without one the runtime uses a positional id and the check warns. New lessons use practice data.

## Self-checklist

Run it on every lesson in every profile. In Fast it is the whole review.

1. File names, `lang`, CSP (the template's `<meta>`, copied exactly, once, in `<head>` before any script or stylesheet: any other policy fails the check), `data-lesson`, `#progress` and the script order match this contract; no inline scripts or handlers.
2. One idea; every objective in `course.js` is taught and practised; nothing is taught that belongs to a later lesson.
3. Every term is defined before use, or is in `GLOSSARY.md`; its aliases-to-avoid are absent.
4. Worked example, then a faded one; one "why does this line exist?" prompt. Mark the worked example with `class="worked"` on its container (or start its heading with "Worked example") so the rubric can find it before the faded item.
5. Practice: ids unique and valid, ≥ 3 items per objective, ≥ 1 non-choice, every choice option has a `why`, no cue gives the answer away, interleaving from lesson 3.
6. Challenge: right `data-kind`, task, what to send back, 2–4 observable criteria, transfer to the learner's material.
7. Every factual or numeric claim has a `data-src`, the `unverified` span, an **illustrative** label, or is clearly your own reasoning.
8. The motion decision in `NOTES.md` is honoured; a scene has a poster frame and labelled data.
9. No literal colours or fonts; figures readable at 390px.
10. Mission tie-in, primary source, Go deeper, follow-up line, neighbour links.
