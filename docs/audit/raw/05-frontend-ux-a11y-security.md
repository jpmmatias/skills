# 05 · Frontend, educational UX, motion, security and accessibility: the LearnKit course runtime

Roles combined: 05 Frontend Architect · 06 Educational UX · 07 Visualization/Motion · 10 Security & Accessibility.
Scope: `skills/learn/starter/assets/{course,progress,quiz,diagram,scene}.js`, `style.css`, `theme.css`,
`starter/examples/scenes-0001-sampling.js`, `themes/joaopdmatias.css`, `starter/tools/check.mjs`, plus `media/guide/*.png` and `media/learn-motion-scene.gif`.
No files under `skills/` were modified.

Severity: **P0** critical security, data loss or blocking · **P1** major · **P2** meaningful · **P3** optional.
Complexity: S/M/L. "Regression risk" means the risk the *fix* introduces.

Already confirmed elsewhere (not re-reported as new, detail added where useful):
(C1) `progress.js` `path()` divides by `milestones.length-1`, which gives NaN with one milestone · (C2) course strings and scene captions reach `innerHTML` unescaped · (C3) first-try mastery is overwritten after a reload.

---

## 0. Method and environment

- **Fixture ("before")**: `/tmp/claude-0/-home-user/be6c5257-bdb3-59a5-94e4-7a2e3ced1103/scratchpad/audit-fe/fixture-ws`.
  It contains the starter assets copied unchanged, a `course.js` with 3 milestones (mastered / in-progress / locked) and 2 lessons, `index.html`, `lessons/0001-…html` (progress header, motion scene from the example file, `data-bars` with alt, `data-bands` with marker, stepper, 2 quiz questions, quiz score, challenge), `lessons/0002-…html` (band-quiz, fade, threshold-explorer with target, quiz, challenge) and `reference/cheat-sheet.html` (table, `.cols`, `.ba`).
  The fade inputs are written exactly as the `diagram.js` header documents them, with no labels.
- **Variants** (same directory, not part of the fixture): `variant-jpdm/` (joaopdmatias theme) and `variant-dup/` (two `.fade` blocks in one lesson). A one-milestone variant was built, run once and then deleted.
- **Scripts**: `…/audit-fe/tools/{shots,axe,kbd,misc,freeze,contrast,overflow}.cjs`, plus `check.mjs`, a byte-identical copy (verified with `cmp`).
- **Environment**: Chromium 1243 (Playwright 1.63) only. **No Firefox or WebKit** was available, so every cross-browser statement below is marked *unverified* unless it says otherwise.
- **axe-core 4.10.2** was installed into the scratchpad.
- **Screenshots**: `docs/audit/screenshots/before/{dashboard,lesson1}-{1280,390}-{light,dark}.png` (DSF 2, full page, with some progress seeded).

## 1. Raw results

### 1.1 `check.mjs` on the fixture

Running it from the repo fails: `ERR_MODULE_NOT_FOUND: Cannot find package 'playwright'`. ESM ignores `NODE_PATH`, so a global Playwright is never found (see FE-12). It was run from a copy with a `node_modules/playwright` symlink in the scratchpad:

```
✓ index.html
✓ lessons/0001-one-prompt-many-answers.html  (2 practice item(s), 1 scene(s))
✓ lessons/0002-pick-the-threshold.html  (4 practice item(s), 0 scene(s))
✗ reference/cheat-sheet.html
    [390px] horizontal scroll: page is 481px wide
Screenshots in …/fixture-ws/.check/ (look at them). 1 page(s) with problems.   exit=1  (6.5 s)
```

Detail for C1: with one milestone, `check.mjs` *does* catch the NaN. It reports 4 console errors per width (`<line> attribute x2: Expected length, "NaN"` and similar), so the default template fails the check until a second milestone is added.

### 1.2 axe-core (tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa)

Setup: 4 pages × {1280, 390} × {light, dark} = 16 runs per theme, each after scrolling through the page so that the observers fire.

| Theme | Violations | Pages clean | `incomplete` (needs review) |
|---|---|---|---|
| default | **`label` (critical) × 3 nodes**, on lesson 2 in all 4 runs (12 nodes in total) | index, lesson 1, reference | color-contrast: 5 (index), 48–49 (L1), 30 (L2) |
| joaopdmatias | the same: `label` × 3 per run | same | same counts |

- The only top violation is `label`: `input[data-answer="0.8"]`, `input[data-answer="0.5"]` and `input[data-answer="triage"]` (the fade blanks).
- best-practice rules: 0 violations.
- axe does not evaluate most of the real problems: SVG text, colour-only state, live regions, focus loss and mobile glyph size. Those were checked by hand below.
- The `incomplete` color-contrast nodes are mostly SVG text and the dark scene stage, where axe cannot resolve the background. Those pairs were computed by hand (§1.4).

### 1.3 Keyboard and behaviour (Chromium, verified)

| Component | Fully keyboard-operable? | Visible focus | Result announced? | Notes |
|---|---|---|---|---|
| Quiz | yes (native `<button>`) | UA ring | **no**: `.quiz-fb` has no `aria-live` | After a correct answer, focus stays on a now-disabled button |
| Stepper | yes | UA ring | **no**: the caption swap is not live | Back is skipped while disabled; focus stays on the disabled Next at the last step |
| Scene player | yes: Space and ←/→ on the focused region, plus native buttons and range | box-shadow (host), UA ring (controls) | caption has `aria-live=polite` ✓ | Scrub moves **10 ms per arrow press** (2,150 presses for 21.5 s) and has no `aria-valuetext`. The voice button's name is the emoji "🔇" (only `title`). The stage SVG has no role or label |
| Fade | yes | UA ring | **no** | Inputs have **no accessible name** (axe). A wrong blank is shown only by a red border, and the feedback says "Red blanks need another try" (colour-only) |
| Band-quiz | yes | UA ring | **no** | After pressing **Another →**, focus drops to `<body>` because `replaceChildren` removes the focused button |
| Threshold explorer | yes (native range, 0.05 per arrow) | UA ring | **no**: readout not live, no `aria-valuetext` | SVG label says "drag the threshold", but the SVG is not draggable; only the range below it is |
| Bars toggle | yes | UA ring | no (values change only inside an `img` SVG) | — |
| Completion toast | no keyboard dismiss (click on a `div`) | — | **no** (no role or live region) | `position:fixed` and stays until clicked |

Focus visibility was **acceptable everywhere**: every focusable element showed the UA `outline:auto` ring, or the scene host's 3px box-shadow.

**Reduced motion** (`reducedMotion: 'reduce'`, verified):
- After load, `document.getAnimations().length === 0`.
- Bars and the band marker render their final values immediately.
- Scene Play steps one chapter at a time (4500 → 8000 → 12000 ms) with no rAF loop.
- The stepper creates no packets or animations. The milestone-path animation and the XP bump are skipped.
- Weakness: `matchMedia(...).matches` is read once per script (progress.js:18, diagram.js:26, scene.js:17), so changing the OS setting mid-session is ignored (P3).

### 1.4 Contrast (computed, WCAG 2.x)

| Pair | default light | default dark | jpdm light | jpdm dark |
|---|---|---|---|---|
| `--muted` / `--bg` | 5.39 | 6.70 | 5.10 | 6.79 |
| `--muted` / `--card` | 5.62 | 6.29 | 5.74 | 5.87 |
| `--muted` / `--code-bg` (SVG numbers on tracks) | 4.86 | 5.88 | **4.41** ✗ | 5.87 |
| `--confirm` / `--confirm-bg` (12–13px zone text) | **4.41** ✗ | 7.52 | **4.41** ✗ | 7.52 |
| `--rule` / `--bg` (border of quiz, stepper and check buttons; 1.4.11 needs 3:1) | **1.26** ✗ | **1.40** ✗ | **1.26** ✗ | **1.38** ✗ |
| bar fill (`--muted` @ .55) / card (graphic object) | **2.29** ✗ | **2.85** ✗ | **2.30** ✗ | **2.73** ✗ |
| scene `--sc-muted` / `--sc-bg` | 6.11 | 6.11 | 6.79 | 6.79 |
| scene comment colour `#5c6680` / panel | 3.02 (✗ for 15px text) | 3.02 | 3.14 | 3.14 |

Body text, links, ok/bad feedback and `--muted` on paper all pass. The failures are small coloured labels and non-text control boundaries.

### 1.5 Rendered SVG text at 390px (measured: font-size × rendered width ÷ viewBox width)

| Element | Size at 390px | Element | Size at 390px |
|---|---|---|---|
| `.pg-lab` (milestone names) | **6.1px** | `.pg-icon` | 9.1px |
| `.dg-num`, `.dg-zs` | **6.7px** | `.dg-zl`, `.dg-lab`, `.dg-conf` | 7.3px |
| stepper `.t-title` | 7.1px | scene `.sc-muted` | **5.2px** |
| scene `.sc-mono` | 5.6px | terminal body | **5.3px** |
| scene title | 5.7px | | |

The same shrinkage is visible in `media/guide/08-phone.png`, where the milestone labels are unreadable.

---

## 2. Frontend architecture (FE)

**FE-01 · P1 · Duplicate practice widgets in one lesson stop the lesson from ever completing**
- Evidence: diagram.js:222, :252, :332 report fixed ids `'band'`, `'fade'` and `'explorer'`. progress.js:160 counts one *element* per widget, and :88–89 compares that with the number of *keys*.
- Verified with `variant-dup` (two `.fade` blocks, everything answered): expected = 5, keys = 4, no completion toast. Two band-quizzes or two explorers have the same problem, and their attempts overwrite each other's mastery.
- Impact: the "practice complete" moment never appears, and mastery is computed from merged attempts.
- Fix: give every practice item an explicit, author-supplied `data-id` and fail `check.mjs` on duplicates.
- Complexity S · regression risk low (needs a storage migration that keeps old keys).

**FE-02 · P2 · Quiz ids are positional, so editing a lesson remaps history**
- Evidence: quiz.js:33 uses `'q' + (qi + 1)`.
- Impact: inserting or reordering a question attaches old answers to different questions. The agent is told to keep improving lessons, so this will happen.
- Fix: use `data-id` on `.quiz-q`, required by the check. Complexity S · risk low.

**FE-03 · P2 · Widgets don't rehydrate from saved state (extends C3)**
- Evidence: quiz.js keeps its own counters (`answered`, `correct`, `first`), and no component reads `S.answers`.
- Verified: after a reload, lesson 1's header shows **Practice mastery 100%** while the quiz shows **"0 / 2 correct on first try · 2 left"** and no answer is marked (`screenshots/before/lesson1-390-dark.png` shows the same mismatch, 50% vs 0/2).
- Impact: the same screen gives contradictory progress signals, and re-answering silently overwrites history (C3).
- Fix: put the store behind an API (`get(itemId)` and `attempt(itemId, ok)`, keeping `firstAttempt` immutable) and have components render their saved state. Complexity M · risk medium.

**FE-04 · P2 · Scene player keeps rAF running off-screen and jumps ahead after the tab or page is backgrounded**
- Evidence: scene.js:166–178 has no IntersectionObserver or `visibilitychange` handling, and `nt = t + (now - last)` has no clamp.
- Verified:
  - While playing, the scrub advanced 620 → 1620 ms after 1 s scrolled out of view.
  - After a 4 s `Page.setWebLifecycleState('frozen')`, time jumped by **4120 ms** (310 → 4430 ms), skipping chapter 1's content.
  - `speechSynthesis` is not paused on `visibilitychange`, so narration continues while the visuals are frozen (code-reasoned).
  - The stepper's `setInterval` (diagram.js:194) also keeps running off-screen.
- Impact: learners who switch tabs mid-scene miss content, and the page wastes battery.
- Fix: pause on `visibilitychange` and when less than 25% of the scene is visible; clamp the frame delta (for example `Math.min(now - last, 100)`); resume from the paused time. Complexity S · risk low.

**FE-05 · P2 · Figures show wrong data until scrolled into view, and the check screenshots capture mid-tween frames**
- Evidence: diagram.js:132 initialises the confidence text with `confText(0)` and :135 defers the real values to `onVisible`; :86 starts the band marker at 0.
- Verified at 390px before scrolling: bars empty, `"confidence = 0.00 (weight is spread out)"`, band marker `0.00`. The same applies in print (no IntersectionObserver fires there).
- Separately, `check.mjs` screenshotted the band marker at **0.14** when the real value is 0.42, and the bars at 0.60 vs 0.61. So the agent "looks" at wrong frames.
- Impact: printed references and the agent's verification both show false data. The skill says reference documents "print out well".
- Fix: render the final state in markup or at first paint and animate *from* it only when visible; in `check.mjs`, wait for `document.getAnimations()` and the tweens to settle, or emulate reduced motion for screenshots. Complexity S · risk low.

**FE-06 · P1 · Course-specific ("Jev") components and tokens live in the generic runtime**
- Evidence:
  - diagram.js:19 ("Jev was right") and :213 (`"Jev returned <code>confidence…"`, shipped to every course).
  - :57–59 hard-code the ACT/CONFIRM/TRIAGE labels and sublabels; :217 hard-codes the Act/Confirm/Triage answers.
  - :110 hard-codes confidence phrases at 0.8 and 0.5.
  - :278–310 hard-code "to humans", "automatic" and "act ≥".
  - style.css:12–14 and 30 define `--act`, `--confirm` and `--triage` tokens; :95–100, :109, :145–148 (`.ba` uses triage/act colours), :207–208 and :249–297 (`sc-z-*`, `sc-x-*`, `sc-glow-*`, `sc-ring.late`, `sc-retune`, `sc-lines`) are left over from one course's scenes.
- Generic: `svg`, `tween`, `onVisible`, stepper, fade, the bars mechanics, the quiz and the scene player.
- Course-specific: bands presets, band-quiz, threshold-explorer, bar confidence copy, `.ba` colours and the `sc-*` decision tokens.
- Impact: every new course on any topic (yoga, history) ships a component that prints "Jev returned…". The agent is nudged to reuse confidence-band semantics, and the starter API is harder to understand.
- Fix: see §6. Complexity M · risk medium (lessons that already use these classes need an examples path).

**FE-07 · P2 · UI strings are hard-coded in English, and speech has no language**
- Evidence:
  - progress.js:76–96 and :138–153 ("Practice complete", "in progress: send me the challenge", "reviews due", "level").
  - quiz.js:35 ("Not quite — try again").
  - diagram.js:155–157 and :226–254; scene.js:115–118.
  - scene.js:162 never sets `u.lang`.
- SKILL.md:290 requires the course language "everywhere: lessons, quizzes, the dashboard and feedback".
- Impact: a Portuguese course gets an English dashboard, feedback and controls, and narration in the default system voice and language.
- Fix: put a `COURSE.lang` and a string table in the runtime; set `<html lang>` and `u.lang`. Complexity S · risk low.

**FE-08 · P2 · No error isolation: one bad attribute disables every later component on the page**
- Evidence: diagram.js:344–353 runs component initialisation in a single sequence; `JSON.parse(el.dataset.bars)` at :347 throws on malformed JSON and aborts the stepper, band-quiz, fade and explorer setup. scene.js:222–227 behaves the same way, where a scene whose `setup` throws stops the rest.
- Impact: a typo in agent-generated markup produces a lesson where all later practice is inert. `check.mjs` reports the JS error, but not *which* components died.
- Fix: per-component `try/catch` that renders an inline error box and logs `component@selector`. Complexity S · risk low.

**FE-09 · P3 · Script-order coupling and globals**
- Evidence:
  - `window.COURSE`, `window.Progress` and `window.Scene` are globals.
  - progress.js:15 uses `document.currentScript` (null in modules or when called later).
  - quiz.js and diagram.js run at parse time, so they must come last in `<body>` (scene.js waits for DOMContentLoaded; the others don't).
  - Handlers use `.onclick =` assignment, which overwrites.
  - The `#ah` arrow marker id is author-defined per SVG and collides if two steppers define it.
- Fix: one `learnkit.js` entry that boots on DOMContentLoaded, plus a registry. Complexity M · risk medium.

**FE-10 · P2 · `.ba` before/after grid overflows on phones**
- Evidence: style.css:143 sets `grid-template-columns: 1fr` (the min-content of a long `<pre>` wins).
- Verified: `check.mjs` reports a 481px page at 390px, from `DIV.bad`/`DIV.good` (right edge at 481).
- Fix: `minmax(0, 1fr)` and `min-width: 0` on children. Complexity S · risk low.

**FE-11 · P3 · `overflow-wrap: anywhere` on every table cell breaks words mid-word**
- Evidence: style.css:60. `media/guide/07-reference.png` shows "transcri / pt" and the header "FIXAB / LE?" at desktop width.
- Fix: use `overflow-wrap: break-word` (it only breaks unbreakable strings) and apply `anywhere` only to `code` inside cells. Complexity S · risk low.

**FE-12 · P2 · `check.mjs` coverage and portability gaps**
- Evidence:
  - It cannot resolve a global Playwright (ESM; verified failure).
  - Its fallback browser search scans only `~/.cache/ms-playwright` (check.mjs:36–42).
  - It runs light mode only, 900px and 390px only, with no axe, no keyboard pass and no duplicate-id or schema validation.
  - Element screenshots are taken right after scroll-into-view (FE-05).
  - `requestfailed` reports only `file:` URLs, so a broken font or CDN is silent (:55).
- It **passed** lessons with unlabeled inputs, 5px scene text, duplicate practice ids and wrong pre-scroll data.
- Fix: add axe, dark mode, a reduced-motion pass, a settle-wait and data validation; resolve Playwright via `createRequire` or a `PLAYWRIGHT_MODULE` fallback. Complexity M · risk low.

**FE-13 · P3 · Browser-API compatibility notes**
- `speechSynthesis.speaking` is read without a guard (scene.js:171), so a browser without the API throws inside the rAF loop once narration is toggled on.
- `host.requestFullscreen?.()` (:206) silently does nothing on iPhone Safari, which has no element fullscreen (*known, unverified here*); the button should be hidden there.
- Container units (`cqw`, style.css:233–269) need Chrome 105, Safari 16 or Firefox 110. On older engines the font declaration is invalid and the terminal inherits 18px, then gets clipped (`overflow:hidden`).
- `getTotalLength()` on `<line>` (progress.js:65) is guarded, but its WebKit support is *unverified*.
- Not used: `structuredClone`, `fetch`, URL parameters.
- Used and fine in evergreen browsers: `Element.animate`, `IntersectionObserver` (with a fallback), `matchMedia`, optional chaining, `??`, optional catch binding.
- Complexity S.

**FE-14 · P2 · Progress storage on file:// is fragile (data loss)**
- Verified in Chromium: `location.origin === "file://"`, and a key written from `fixture-ws/` is readable from a different directory (`variant-jpdm/`). So **every local HTML file on the machine shares one localStorage**.
- Consequences:
  - Two copies of a course, or two courses that keep the template id `'topic-slug'` (course.js:5), share progress (*inferred* from the shared origin).
  - Clearing site data, or a private window, wipes all practice history.
  - There is no export or backup.
- *Unverified* (no browsers available): Firefox's file-URI origin policy and Safari's file:// storage behaviour may scope or drop storage differently, and must be tested before claiming support.
- Fix:
  - Make `check.mjs` refuse the template id.
  - Version the stored schema and add export/import (download/upload JSON from the dashboard).
  - Optionally have the agent snapshot practice state into the workspace (the learner pastes or exports it).
- Complexity M · risk low.

**FE-15 · P3 · Visual collisions in the bands figure and the scene poster frame**
- The marker label (`y = Y-16`) overlaps the `"confidence →"` caption at `y=18` for values below about 0.15 (diagram.js:69 and :72). This was seen in `check.mjs` output at a marker of 0.14.
- The poster frame (scene.js:214) is the *end* state. In the example it stacks the badge over a faded server box with text showing through (`screenshots/before/lesson1-1280-dark.png`).
- Fix: move the caption or the label; let scenes declare `poster: t`. Complexity S.

## 3. Educational UX (UX)

**UX-01 · P1 · Gamification chrome outranks the learning signal, contrary to the skill's own rule**
- Evidence:
  - Every lesson opens with a bordered header card *above the h1* (progress.js:75–81; `media/guide/02-lesson.png`, where the h1 starts at about 42% of the first screen).
  - The header puts `⚡ N XP · level L` top-right in bold accent colour, while "Practice mastery" sits in a .82rem muted meta line (style.css:157–158).
  - SKILL.md:235 says "Show per-lesson mastery … more prominently than raw XP".
  - The dashboard gives XP a stat tile equal to milestones.
  - `level = floor(xp/100)+1` (progress.js:41) needs 10 first-try correct answers per level, so it barely moves and carries no meaning.
- Impact: attention goes to points. The mission and lesson goal are pushed down, and the visual hierarchy contradicts the documented pedagogy.
- Fix:
  - Lesson top shows `Lesson N · Milestone` plus the "By the end you can…" goal. The header becomes a slim strip below the title, or a footer.
  - Show mastery as the primary number. Drop `level`; keep XP small or remove it.
- Complexity S · risk low.

**UX-02 · P1 · "Reviews due" is a counter, not a review experience, and review corrupts the record**
- Evidence:
  - `due()` is per lesson (progress.js:32–36). `L.stage++` happens on any attempt after the due date, **whether right or wrong** (:112).
  - The dashboard's "reviews due" tile links nowhere.
  - The header says "Next review: in 1 day" immediately after the first answer.
  - Reviewing means re-opening the lesson, which re-runs the same questions (reshuffled), and re-answering overwrites mastery (C3, FE-03).
- Impact: spaced retrieval, which the skill names as a core goal, is not actually supported. Mastery percentages become unreliable after any review.
- Fix:
  - Keep item-level history (`attempts[]`, immutable first attempt).
  - Use a correctness-aware schedule (reset or hold the stage on a miss).
  - Add a dashboard "Review now" section that pulls due *items* from all lessons into one short session, rendered by the standard quiz/recall components (needs the data-driven components in §6).
- Complexity M–L · risk medium.

**UX-03 · P2 · The dashboard reads as an admin panel, not as "what do I do next"**
- Evidence: progress.js:138–153 renders a mission box, 3 stat tiles, an SVG path, a milestone list, a note and lesson rows with bars (`screenshots/before/dashboard-1280-light.png`).
- There is no primary next action. The in-progress milestone says "send me the challenge" but doesn't link to the challenge. Lesson rows show a "–" or a percentage with no verb.
- Fix:
  - Lead with a "Next up" block, for example `Continue lesson 2` or `Send the Threshold challenge →` (link to `lessons/…#challenge`).
  - Then the milestone story with evidence links (`LR-0001` opens the learning record).
  - Reduce the stat tiles to one line ("1 of 3 milestones proven · 2 items due for review").
- Complexity S · risk low.

**UX-04 · P2 · Card overuse flattens hierarchy**
- Evidence: lesson 1 of the fixture has **9 bordered boxes** (header, 3 `.term`, scene, stepper, 2 `.quiz-q`, challenge), and the dashboard has 6 (mission, 3 stats, 2 lesson rows). Each component's CSS draws its own card (style.css:62, 69, 113, 120, 124, 130, 153, 178, 187, 206).
- Impact: practice, definitions, figures and the challenge all look equally weighted. The `.challenge` (2px accent border) is the only escalation.
- Fix:
  - Make figures borderless with captions (Tufte-style, which the skill asks for).
  - Group a lesson's retrieval practice into *one* "Check yourself" section with a counter.
  - Keep a card only for the challenge.
- Complexity S · risk low.

**UX-05 · P2 · Feedback quality on wrong answers**
- quiz.js:35 gives a wrong pick only "✗ Not quite — try again." There is no per-distractor explanation, so the misconception is never addressed; `data-why` is shown only on the correct answer.
- Fade grading is exact and case-sensitive (diagram.js:247): "Triage" or "0.80" is marked wrong.
- The quiz matches the answer by visible text (quiz.js:31), which is brittle with markup inside buttons.
- Fix: per-option `why`; recall normalisation (trim, case-fold, numeric tolerance, `accept: []` alternatives). Complexity S · risk low.

**UX-06 · P2 · Type and layout on phones**
- SVG text is 5–7px at 390px (§1.5). Scenes are unreadable on a phone, and the fullscreen escape hatch fails on iPhone (FE-13).
- Quiz options are set in monospace 15px for prose answers too (style.css:73; `media/guide/05-quiz.png`), so they read like code.
- The default theme mixes three families inside one component (serif body, sans UI, mono options).
- The joaopdmatias h1 (uppercase mono up to 3rem) wraps 2–3 lines on long titles (`02-lesson.png`).
- UI text is small: `.kicker` .78rem, `.pg-meta` .82rem, lesson-row `small` .78rem.
- Fix:
  - SVG figures: a minimum rendered text size (switch to a taller phone layout or HTML labels below 480px).
  - Scenes: a phone layout (stacked panels, or a "captions + key frame" mode).
  - Quiz options in `--font-ui` unless the answer is code (`data-code`).
- Complexity M · risk medium (scene layouts are bespoke).

**UX-07 · P3 · Emoji in UI**
- Emoji used: 🎯 (mission link, progress.js:76), ⚡ (XP, :77/:127), 🏆 (toast :96 and every challenge h3), 🔒 (locked milestone :55/:146 *and* "🔒 Lock in this line", diagram.js:327, two meanings), ⇄ (:141), 🔇/🔊 (scene).
- Effects:
  - They render as colour glyphs inside a monochrome editorial theme.
  - 🔒 in SVG text is about 6px on a phone.
  - Screen readers announce "direct hit", "high voltage" and "locked".
- Fix: use text labels or small inline SVG icons with `aria-hidden`, and rename "Lock in" to "Check this line". Complexity S.

**UX-08 · P3 · The joaopdmatias theme sets `--accent` to `--fg`, so single-accent signaling is lost**
- Evidence: themes/joaopdmatias.css:10 and :27. The winning bar, the marker, the explorer line and the active milestone become plain black or white, like body text. SKILL.md:138 ("one accent colour to mark the single thing to notice").
- Fix: add a separate `--signal` token (themes may keep links monochrome). Complexity S.

## 4. Accessibility (A11Y)

**A11Y-01 · P1 · Fade inputs have no accessible name**
- axe `label`, critical, in every run.
- Evidence: the documented markup in diagram.js:16 produces it; :240 sets only `size`.
- Fix: the component adds `aria-label="Blank N of M"`, or derives it from `data-label`; the check fails on unlabeled inputs. Complexity S · risk low.

**A11Y-02 · P1 · Practice results are not announced**
- Only `.sc-cap` is live (verified inventory).
- Not live: quiz/fade/band/explorer feedback (quiz.js:25, diagram.js:205, 241, 328), the explorer readout (:304), stepper captions and the completion toast (progress.js:92–99).
- Impact: screen-reader learners get no feedback from retrieval practice, which is the core learning loop.
- Fix: one shared polite live-region announcer in the runtime; feedback containers get `role="status"`. Complexity S · risk low.

**A11Y-03 · P1 · Figures and scenes are illegible on phones**
- §1.5, WCAG 1.4.4/1.4.10 in spirit: text that cannot reach a readable size without pinch-zoom. See UX-06 for the fix. Complexity M.

**A11Y-04 · P2 · Text alternatives for figures are generic or wrong**
- Bars: "Probability per option" with no values (diagram.js:96).
- Bands: no marker value (:56).
- Explorer: says "drag" (:274).
- Scene stage SVG: no role or name (scene.js:121). The captions are good, but the terminal text is announced on every frame while playing, because `<pre>` content is rewritten on each `seek`.
- Stepper SVGs depend on the author.
- Fix: generate labels from data (`"refund 0.61, complaint 0.27, return 0.12; confidence 0.42"`), mark the stage `aria-hidden` and rely on captions plus a "transcript" disclosure listing the chapter captions. Complexity S.

**A11Y-05 · P2 · Focus loss and scrub keyboard ergonomics**
- Band-quiz "Another →" drops focus to `<body>` (verified; diagram.js:217).
- Scene scrub: 10 ms per arrow press (scene.js:116), no `aria-valuetext`.
- The voice toggle has no `aria-label` (emoji name only).
- Fix:
  - Move focus to the first new option.
  - `step` = 1% of the total, or handle arrows as ±1 s and PageUp/PageDown as chapters; `aria-valuetext="4.5 of 21.5 seconds, chapter 2"`.
  - `aria-label="Narration"` with `aria-pressed`.
- Complexity S.

**A11Y-06 · P2 · Information conveyed by colour only**
- Wrong fade blanks are shown by a red border only, and the copy says "Red blanks…" (diagram.js:248, 254).
- Explorer dots use green and red only to mean right and wrong (:282, style.css:209).
- Fix: `aria-invalid`, a ✗ marker or a different border style for wrong blanks; dot shapes for wrong results (×) plus a legend. Complexity S.

**A11Y-07 · P2 · Non-text contrast**
- Option and button borders are 1.26–1.40:1 (WCAG 1.4.11; style.css:74, 118, 131).
- Bar fills are 2.3–2.9:1 (:99).
- The locked milestone circle is 1.11:1.
- Small zone text is 4.41:1 (§1.4).
- Fix: a `--control-border` token at ≥3:1 and bars at ≥3:1. Complexity S · risk low (visual change on every theme).

**A11Y-08 · P3 · Structure**
- The progress header has no heading and comes before the `h1`.
- The toast is appended outside `<main>` with no role and is dismissed by clicking a `div` (progress.js:97–99).
- Starter pages have no shared shell, so `lang`, `viewport` and landmarks depend on each generated page (the fixture added them; nothing enforces them).
- `matchMedia` is not live (§1.3).
- Fix: a page shell in the runtime or template, and a `<dialog>`-free status toast with a close button. Complexity S.

## 5. Security (SEC)

**SEC-01 · P2 · `innerHTML` sinks (detail for C2)**

| Sink | Data | Source | Escaped? |
|---|---|---|---|
| progress.js:75–81 header | `C.mission`, `m.label` (via `path()` :54–58), lesson milestone labels, `S.xp`, `ROOT` | course.js (author/agent) · **localStorage** (`S.xp`) | no |
| progress.js:94–96 toast | `lesson.canDo`, labels, `m.pct` (number) | course.js | no |
| progress.js:138–153 dashboard | `C.mission`, `m.label`, `m.canDo`, `m.evidence`, `l.file` (href), `l.title`, `S.xp` | course.js · localStorage | no |
| diagram.js:213, 315 | numbers only, plus the literal "Jev" | code | safe |
| scene.js:64, 85, 112, 130 | terminal title and lines, scene title, chapter titles | scene file | `esc()` ✓ (attribute-quote escaping is absent but not used in attributes) |
| scene.js:158 caption | `chapters[k].caption` | scene file (HTML allowed by design) | no |

- URL params and `location.hash`: not read anywhere ✓.
- Data attributes such as `data-bars` and `data-answer` go through `textContent` or comparisons ✓.
- Risk model: the content is agent-generated, often from web research. A quoted source title such as `Why x<y & z` silently breaks markup. A prompt-injected source could plant `<img onerror>` that runs on a file:// page sharing storage with every other local file (SEC-02).
- Fix: an `html` tagged-template escaper for all course strings; captions as a restricted subset (`<em> <b> <code>`) via a tiny allow-list sanitiser. Complexity S · risk low.

**SEC-02 · P2 · Learner state is a cross-file, untyped injection channel**
- `S = Object.assign({…}, JSON.parse(localStorage…))` (progress.js:22) is never type-checked, and `S.xp` is interpolated into HTML (:77, :140).
- On Chromium file:// the storage origin is shared by **all** local HTML files (verified, FE-14). Any other HTML file the learner opens (a downloaded page, another tool's report) can read or alter progress and plant markup that runs every time the course is opened.
- A stored `"__proto__"` key also reassigns `S`'s prototype through `Object.assign` (low impact).
- Fix: validate the stored schema (numbers are numbers, known keys only), coerce `+S.xp || 0`, and never interpolate state as HTML. Complexity S.

**SEC-03 · P2 · Third-party request in the theme**
- `@import url("https://fonts.googleapis.com/…")` (themes/joaopdmatias.css:6) makes every page open call Google (IP and user agent; there is EU case law on Google Fonts). It is a render-blocking chain (style → theme → fonts CSS → woff2) and fails silently offline. `check.mjs` ignores non-file request failures.
- Fix: self-host the font files in `assets/fonts/` (the theme format can copy them), or fall back to system stacks; document this in THEME-FORMAT.md. Complexity S · risk low (font licences: Geist and Space Mono are OFL).

**SEC-04 · P2 · Generated code runs with full page privileges and there is no CSP**
- `lessons/scenes-NNNN.js` and any inline scripts are agent-written JS. `check.mjs` executes them in headless Chromium on the user's machine.
- Chromium blocks file→file reads by default, but outbound requests (`fetch`, `new Image().src`) are unrestricted, so an injected beacon could exfiltrate progress or page content.
- Fix:
  - Add `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'">` to the page shell.
  - **Verify** how `'self'` matches `file:` in Chromium and Firefox before relying on it; `connect-src 'none'` alone is a safe first step.
  - Longer term, standard lessons become data (§6), so most pages contain no generated JS.
- Complexity M · risk medium (inline `<script>` in existing lessons would need moving).

**SEC-05 · P3** `check.mjs` has no command execution or eval risk; its arguments are only used as paths ✓. Its `npm install --prefix ~/.claude/skills/...` step writes `node_modules` into the installed skill directory, so the dependency supply chain lands in the skill folder. Pin the Playwright version.

## 6. Recommended frontend architecture (no frameworks)

**Shape: a stable runtime plus validated lesson data, with bespoke interactives as modules.**

1. **Lesson data, not lesson code, for the standard parts.**
   - Each lesson keeps hand-written prose HTML (the agent writes good prose). Practice and standard figures are declared as data in `<script type="application/json" data-lk="lesson">…</script>` inside the page.
   - Embedded, because **`fetch()` of a sibling JSON file fails on file:// in Chromium**, so the data cannot be a separate `.json` file. An alternative is `lessons/0001.data.js` that calls `LearnKit.lesson({...})`.
   - Placeholders such as `<div data-lk="quiz-1"></div>` mark where each item renders.
   - Each item has a stable `id`, a `type` and typed fields, for example `{id, type:'choice', prompt, options:[{text, correct, why}]}`.
2. **Runtime `assets/learnkit/`**, a few small ES5-compatible classic scripts or a single file:
   - `core`: boot on DOMContentLoaded; component registry `register(type, {mount(el, data, ctx) → {destroy}})`; per-component `try/catch` with an inline error box; `html` escaping tag; i18n `t()` from `COURSE.lang`; shared live-region `announce()`.
   - `store`: versioned schema, per-item `attempts[]` with an immutable `first`, validation on load, migration from `learn:<id>` v0, export/import.
   - `schedule`: item-level, correctness-aware intervals that feed a dashboard "Review now" session.
   - `views`: lesson strip (goal-first) and dashboard ("Next up" → milestones with evidence → lessons).
   - Standard data-rendered components: **choice quiz** (per-option why), **recall** (free text, normalisation, `accept[]`), **faded example** (labelled blanks), **stepper**, **ordering/sorter**, **review session**.
3. **Bespoke interactives stay JS modules.**
   - They register with `LearnKit.register('threshold-explorer', …)` and receive `ctx = {id, record(ok), announce, rng(seed), reducedMotion, t, onVisible}`. They never touch storage or globals.
   - `check.mjs` validates the data before rendering: unique ids, the answer exists among the options, the milestone ids exist, every input is labelled, the course id is not the template id, ≥2 milestones or graceful single-milestone rendering.
4. **Generic visualization primitives to extract**
   - **Timeline player**: play/pause/step/replay, chapters, scrub (1 s or chapter keyboard steps, `aria-valuetext`), visibility/IO pause, delta clamp, narration with `lang`, reduced-motion chapter stepping, configurable poster. It serves both the scene player and the stepper.
   - **Param slider**: range input plus `aria-valuetext`, a debounced live readout and an optional "check my value" target.
   - **Seeded RNG**: mulberry32, used by the explorer *and* band-quiz (currently `Math.random`, diagram.js:212) so feedback and screenshots are reproducible.
   - **Bars**: categorical, values in text alternative, final state at first paint.
   - **Number line**: labelled zones from data (the bands figure becomes one configuration).
   - **Node-graph/flow**: nodes and edges from data, unique marker ids, packet animation per edge, generated alt text "A → B → C".
   - **Scene helpers**: `S.terminal`, `highlight`, `layers`, `along`, `draw` are already generic and stay.
5. **Move to `starter/examples/jev-confidence/`**:
   - The ACT/CONFIRM/TRIAGE bands preset, band-quiz, threshold-explorer and its synthetic data model, and the bars' confidence phrases.
   - The `--act`, `--confirm` and `--triage` tokens; the `.ba` colours; and `sc-z-*`, `sc-x-*`, `sc-glow-*`, `sc-ring`, `sc-retune`, `sc-lines`.
   - They are kept as worked examples of "a bespoke interactive module" next to `scenes-0001-sampling.js`.
   - The generic stylesheet keeps only `--ok`, `--bad` and a `--signal` accent.
6. **Constraints kept**:
   - Zero build step, works on file://, no dependencies, themes remain token-only.
   - Reduced motion and print render final states.
   - `check.mjs` gains axe, dark mode, a keyboard smoke test, a reduced-motion pass and settle-before-screenshot.
