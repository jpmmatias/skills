# Write a lesson

Author one lesson: its HTML, practice data, scene, reference updates and lab. The panel's author role and Fast mode both follow this file.

**Preconditions** (route to the producing workflow when one is missing; never improvise it):
- the lesson's entry in `assets/course.js`, with objectives → [plan-course](plan-course.md);
- its line under `## Per-lesson decisions` in `NOTES.md` → [plan-course](plan-course.md);
- a `### Lesson N` block in `RESOURCES.md` → [research-sources](research-sources.md). In Fast, existing entries that back the claims are enough; note `sources: reused` in `NOTES.md`.

**Read:** [lesson-contract](../references/lesson-contract.md) (binding), [teaching-core](../references/teaching-core.md), [visual-design](../references/visual-design.md), [components](../references/components.md); [motion](../references/motion.md) when the decision is `scene`; [labs](../references/labs.md) when there is a lab. From the workspace: `NOTES.md`, `MISSION.md`, the lesson's `course.js` entry, its `RESOURCES.md` block, `GLOSSARY.md`, and the previous lesson. Read a runtime file in `assets/` only to extend it, and then read its header first.

## Steps

1. **Outline** in a few lines: for each objective, the explanation, the figure, the worked → faded example and its practice items; the scene storyboard if the decision is `scene`; the challenge task and its 2–4 criteria.
2. **Write the files** named in the [lesson contract](../references/lesson-contract.md#files): the lesson HTML, `lessons/NNNN.practice.js`, `lessons/scenes-NNNN.js` when the decision is `scene`, and the lab when there is one. A lesson marked `scene` is not done until its scene works; never swap it for static figures to save effort.
3. **Cite while you write.** Every factual or numeric claim carries a `data-src` to a `RESOURCES.md` id, or is labelled illustrative, or is your own reasoning. Claims resting on unverified sources get the `unverified` span. You never edit `RESOURCES.md`: list a needed source under `sources_request` (panel) or run [research-sources](research-sources.md) for it (Fast).
4. **Reference documents.** Add the lesson's compressed essence (syntax, algorithm, model, the annotated reference model) to the matching `reference/*.html`, so the learner can come back to it ([pedagogy → Reference documents](../references/pedagogy.md#reference-documents)).
5. **Self-check** against the [self-checklist](../references/lesson-contract.md#self-checklist). Fix every miss before verifying.
6. **Verify** as below. Record `check: pass`, `fail` or `skipped` with a reason.
7. **Hand off.** In the panel, write `r<N>-author.md` ([handoff-contracts](../references/handoff-contracts.md#author-handoff)). In Fast, return to [continue-course](continue-course.md) to deliver.

Do not change `MISSION.md`, milestone status or the lesson order. Do not open the lesson in a browser yourself during rounds; delivery does that once.

## Verify

The check tool lives in the skill and installs its browser into a stable user folder, outside the skill:

```bash
# Once per machine, only after the learner agrees (a one-time download of Playwright and Chromium):
npm install --prefix ~/.cache/learncraft/tools playwright@1
~/.cache/learncraft/tools/node_modules/.bin/playwright install chromium

# Each lesson, from the course workspace:
node "${CLAUDE_SKILL_DIR}/starter/tools/check.mjs" . --only=0003
```

- Replace `${CLAUDE_SKILL_DIR}` with the absolute skill folder. Ask before installing; if the learner declines or the install fails, use the lint below and record `check: skipped (no-playwright)`.
- It checks JS errors, missing files, phone-width overflow, the required hooks and practice data, and writes screenshots to `.check/`. Look at the screenshots of elements it flags and at each scene's frames at 55% and 100%; in Deep, look at all of them.
- At most **two fix passes**. If it still fails, stop fixing and hand off with `check: fail` and the problems listed.
- **Lint without a browser** (also the Fast minimum):

  ```bash
  grep -c 'data-lesson=\|id="progress"\|id="challenge"\|data-practice-' lessons/0003-*.html
  node --check lessons/0003.practice.js && node --check lessons/scenes-0003.js
  ```

  The lint is not a verification: never call a lesson "verified" after lint alone.
