# Upgrading

Two things can be upgraded: the **skill** (the instructions your agent loads) and each **course** you already made (the files in its `assets/` folder). Updating the skill never touches an existing course. New courses get the new runtime; old courses keep the runtime they were built with until you upgrade them.

## 1. Update the skill

Find how you installed it: `claude plugin list` shows plugin installs, `npx skills list -g` shows skills.sh installs, and anything else in `~/.claude/skills/` is a copy or a symlink. Two installs of the same skill are two skills; keep one.

| Install | Update |
|---|---|
| Claude Code plugin | `claude plugin marketplace update jpmmatias`, then `claude plugin update learn@jpmmatias` (and any pipeline plugin you use). Or turn on auto-update for the marketplace under `/plugin` → Marketplaces: it is off by default for third-party marketplaces |
| skills.sh | `npx skills update learn -g` (leave out `-g` for a project install) |
| Symlink to a clone | `git pull` in the clone |
| Manual copy | copy the folder again (`cp -R skills/skills/learn ~/.claude/skills/` from a fresh clone, after removing the old copy) |

Start a new session afterwards. The plugin commands come from Claude Code's documentation ([compatibility sources](../compatibility.md)); we verified fresh installs, not the update path.

Plugin entries carry `version: "2.0.0"`. Claude Code uses that field to decide whether an update exists, so each release bumps it.

**Pinning.** Both installers accept a git ref (`claude plugin marketplace add jpmmatias/skills@<ref>`, `npx skills add jpmmatias/skills@<ref>`). The repository has no release tags yet; until it does, a ref means a branch or a commit.

**Lesson-check tools.** Playwright now installs once into `~/.cache/learncraft/tools`, which survives updates ([installing.md](installing.md#optional-the-lesson-check)). An older install inside the skill's `starter/tools/node_modules` is no longer used, and updates replace that folder anyway.

**Plugin vs skills.sh names.** As a plugin the command is `/learn:learn` and the review subagents are `learn:lesson-*`. As a plain skill it is `/learn`, and reviews use generic subagents. Moving between the two: uninstall one, install the other, start a new session.

## 2. Upgrade an existing course (runtime v1 → v2)

Courses made before Learncraft 2.0 still open and work as they are. Upgrading their `assets/` gets you the fixes and new features listed below. You can also ask your agent to do it: "Upgrade this course to the current Learncraft starter, keeping `course.js` and `theme.css`, and follow the upgrade guide."

### What changes

| | Before (v1) | After (v2) |
|---|---|---|
| Runtime files | `course.js`, `progress.js`, `quiz.js`, `diagram.js`, `scene.js`, `style.css`, `theme.css` | adds `core.js`, `store.js`, `practice.js`, `viz.js`, `figures.css`; rewrites `progress.js`, `diagram.js`, `scene.js`, `style.css`; `quiz.js` becomes a small compatibility shim |
| Practice | quiz and fill-in markup inside each lesson | new lessons keep practice as data in `lessons/NNNN.practice.js`; old `.quiz-q` and `.fade` markup is upgraded in place with stable `legacy:` ids |
| Progress in the browser | `localStorage["learn:<course id>"]`; one wrong answer then a right one after a reload was stored as right | `localStorage["learn:<course id>:v2"]`: an append-only log of attempts, first tries never overwritten |
| Mastery display | XP, "level", a "You can now…" toast | levels in words (Seen → Transferred) derived from evidence; XP once, small |
| Review | "reviews due" meant reopening the lesson | `review.html`: a cold, mixed session over due objectives, Leitner boxes 1/3/7/14/30 days |
| Your data | in the browser only | **Export progress** / **Import progress** on the dashboard; the agent reads exports you put in `progress/` |
| Course-specific components | ACT/CONFIRM/TRIAGE bands, band quiz, threshold explorer shipped in the generic `diagram.js` | moved to `starter/examples/jev-confidence/` in the skill |
| `course.js` | no version | `schemaVersion: 2` with objectives and practice files; **v1 files are still read unchanged** |

### Steps

Run these in the course folder. `<skill>` is the skill folder from [installing.md → Check the install](installing.md#check-the-install).

1. **Back up** the runtime (or commit the folder to git first):

   ```bash
   cp -R assets assets-v1
   ```

2. **Copy the new runtime, then put your course data and theme back:**

   ```bash
   cp -R "<skill>/starter/assets/." assets/
   cp assets-v1/course.js assets-v1/theme.css assets/
   cp "<skill>/starter/templates/review.html" .
   ```

   Your `theme.css` keeps working: the two new tokens (`--signal`, `--control-border`) have defaults in `style.css`.

3. **Lessons that used the moved components** (`data-bands`, `class="band-quiz"`, `class="threshold-explorer"`, or scene classes such as `sc-z-*`): copy the module and load it in those lessons.

   ```bash
   cp "<skill>/starter/examples/jev-confidence/jev-confidence."{js,css} assets/
   ```

   In each such lesson add `<link rel="stylesheet" href="../assets/jev-confidence.css">` after the `theme.css` link, and `<script src="../assets/jev-confidence.js"></script>` after the `diagram.js` script.

4. **Components you added to the old `diagram.js` yourself** are not in the new one. Keep the old file for the lessons that need it:

   ```bash
   cp assets-v1/diagram.js assets/diagram-v1.js
   ```

   and change `../assets/diagram.js` to `../assets/diagram-v1.js` in those lessons only. It runs on top of the new runtime, but it was written for the old stylesheet, so some colours may be lost: in our test the old bands rendered as black bars. Prefer step 3, or ask the agent to rebuild the component on the new primitives (`references/components.md` in the skill).

5. **`index.html`.** The old one keeps working. If you never edited it, replace it with `<skill>/starter/templates/index.html` and put your title and lede back: the new one adds a Content-Security-Policy and loads `practice.js`, so the dashboard counts practice files exactly.

6. **Check it.** Open `index.html` and each lesson, or run the lesson check:

   ```bash
   node "<skill>/starter/tools/check.mjs" .
   ```

   Old practice items are reported as `legacy` warnings; warnings never fail the check.

7. When every lesson looks right, delete `assets-v1/` (keep `diagram-v1.js` if a lesson uses it).

**What we tested.** On a v1 fixture course (two lessons with quizzes, a fill-in, bars, a stepper, a motion scene, bands, a band quiz and a threshold explorer), in Chromium: after step 2, every page loaded with no errors, and quizzes, fill-ins, bars, the stepper and the scene worked; the bands, the band quiz and the threshold explorer did not render until step 3, after which they all worked. Firefox and Safari were not tested.

### Progress data migrates automatically

- The first time a v2 page opens in the browser you used before, the old progress (`learn:<course id>`) is converted into the new log (`learn:<course id>:v2`), including one `migration` event per lesson for the old review schedule.
- **The old key is read once and never written or deleted.** If you roll back to `assets-v1/`, the old runtime finds its data exactly as it was (practice done after the upgrade is only in the new log).
- Old answers keep their old ids. They count toward the "Familiar" level, but a legacy lesson's "answered" counter starts at zero for its new `legacy:` ids.
- Progress is per browser. Migrate in the browser that has your history; to move it elsewhere afterwards, use **Export progress** and **Import progress**.
- **Keep the course `id` in `course.js` unchanged.** Progress is stored under it, and there is no tool to move history to a new id. If it is still the template id `topic-slug`, the dashboard shows a notice; changing it starts that course's browser history from empty.

Tested in Chromium: an answer saved by the v1 runtime appeared in the v2 log as an `attempt` plus `migration` events, and the v1 key was left byte-for-byte unchanged. The migration rules are covered by the store's unit tests (`tests/store.test.mjs`).

### Optional: move `course.js` to v2

Not required: v1 files are read as they are, and every v1 lesson's objective defaults to `l<n>`. New lessons written by the updated skill use objectives and practice files. To get objective-level review for old lessons, ask the agent to add `schemaVersion: 2`, objectives and practice files; it re-plans through `course.js`, never silently.

### No more copying components back into the skill

Older docs said to copy an improved component from a course back into the skill folder. The skill now never writes into its own folder (updates would overwrite it). The agent writes improvement ideas into the course's `NOTES.md` under `## Upstream`; send them as an issue or pull request.
