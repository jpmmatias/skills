# Example courses

Three courses in the format Learncraft produces, so you can see the output before installing anything:

| Course | Folder |
|---|---|
| How Transformers Work | [transformers/](transformers/index.html) |
| React Rendering Internals | [react-rendering/](react-rendering/index.html) |
| Probability & Statistics, by experiment | [probability/](probability/index.html) |

[`index.html`](index.html) is a gallery page that links them. The `pages` workflow publishes this folder as the site root, so once GitHub Pages is enabled for the repository the gallery is at https://jpmmatias.github.io/skills/.

## What they are, and what they are not

- **Hand-authored to the skill's contracts.** Each course was written by an agent following the `learn` skill's own rules: the [lesson contract](../skills/learn/references/lesson-contract.md) (page shell, practice as data in `lessons/NNNN.practice.js`, challenge, citations), the [`course.js` v2 manifest](../docs/architecture/data-model.md), and the [RESOURCES format](../skills/learn/RESOURCES-FORMAT.md). Their `assets/` and page shells are copies of `skills/learn/starter/` (runtime and templates); each course adds only its own `course.js`, lessons, practice files, figure scripts, reference page and sources. When the starter runtime changes, re-copy it into each course's `assets/` (keeping `course.js` and `theme.css`) so the published demo runs the current code. They are **not** transcripts of a learner's session, and they are not evidence of how good a generated course is; that is what the [evaluations](../evaluations/README.md) protocol is for, and it has not been run yet.
- **No learner data.** `course.js` sets `example: true`, so every page shows an example banner. There are no `learning-records/`, no `progress/` exports and no browser history. The mission describes a made-up persona; milestone 1 is "in progress" only so the dashboard has something to point at.
- **Sources are honest about their status.** Every source in each course's `RESOURCES.md` has an id, a trust tier and a status: `verified` with the date it was fetched, or `unverified` with the reason (for example, the host was blocked from the authoring environment). Claims that rest on an unverified source are marked in the lesson. Read the status before relying on a claim.
- **Numbers are labelled.** Figures either derive their numbers from the data they show, are seeded simulations labelled as simulated, or are labelled illustrative.

## Run them locally

No install and no server: open `examples/index.html` (or any course's `index.html`) in a browser straight from disk. Practice you do is stored in that browser's `localStorage` only; the dashboard's **Export progress** and **Import progress** buttons work here too.

The runtime is tested in Chromium. Firefox and Safari on `file://` are not verified ([compatibility.md](../docs/compatibility.md#browsers)).

## Check them

```bash
node scripts/validate.mjs            # lints every example course (data, ids, citations, sources), no install
node scripts/check-examples.mjs      # the full lesson check in Chromium on each course; needs Playwright
```

`check-examples.mjs` runs `skills/learn/starter/tools/check.mjs` on each course and writes screenshots to `examples/<course>/.check/` (not committed, not published). Install the tools as in [installing.md](../docs/guides/installing.md#optional-the-lesson-check).

## Regenerate the README and guide screenshots

The screenshots in `media/readme/`, `media/guide/` and the social preview (`media/social-preview.png`) are taken from these courses by [`media/capture.mjs`](../media/capture.mjs), with Playwright at a device scale factor of 2:

```bash
node media/capture.mjs               # all of them
node media/capture.mjs readme        # or one group: readme | guide | social
```

It finds Playwright the same way the lesson check does (`~/.cache/learncraft/tools`, the repository's `node_modules`, the global npm root). Look at the images before committing them.

## Add a course

See [CONTRIBUTING.md → Add an example course](../CONTRIBUTING.md#common-changes), then add an entry to `index.html`.
