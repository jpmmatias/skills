# Baseline

Recorded before any change, as the reference point for every later comparison.

| Item | Value |
|---|---|
| Repository | `jpmmatias/skills` |
| Branch | `claude/loving-goldberg-xetg0g` (clean working tree) |
| Baseline commit | `f8aaf973bd1e1af68d59e6442db25d00d6c1ccaa` (2026-10-26, "Add the planner, source researcher and challenge reviewer to the course pipeline.") |
| Commits in history | 12 |
| Tracked files | 39 (2,616 text lines; 1.5 MB incl. media) |
| Environment | Linux container, Node 22.23, npm 10.9, Bun 1.4, Python 3.13, Playwright + Chromium 1243. No `claude` CLI. Only Chromium is available (no Firefox/WebKit), so cross-browser claims below are limited to Chromium unless stated. |

## What exists

- Five skills: `learn` (the main skill, 369-line `SKILL.md` + 5 format docs + starter kit + 1 theme) and four pipeline skills (`curriculum-planner`, `source-researcher`, `lesson-panel` with four role prompts, `challenge-reviewer`).
- A Claude Code plugin marketplace (`.claude-plugin/marketplace.json`) exposing each skill as a plugin.
- A starter kit copied into every course: `course.js`, `progress.js`, `quiz.js`, `diagram.js`, `scene.js`, `style.css`, `theme.css`, a worked scene example and a Playwright check script (`tools/check.mjs`).
- Docs: `README.md`, `docs/GUIDE.md` with 8 real screenshots, a demo GIF.

## Validation available at baseline

| Check | Exists? | Result |
|---|---|---|
| Unit tests | No | – |
| Repository/manifest validation | No | – |
| CI | No (`.github/` absent) | – |
| `tools/check.mjs` (per-workspace browser check) | Yes | Needs a course workspace; none is in the repo. Run against a fixture built from the starter (see below). |
| Schema validation | No schemas | – |

## Baseline probe (fresh workspace from the untouched starter, Chromium)

Workspace: the starter's `assets/` + a minimal `index.html` and one lesson with one quiz question.

| Probe | Observed | Expected |
|---|---|---|
| Dashboard with the template's single milestone | `<line x2="NaN">`, `<circle cx="NaN">` — the milestone path does not render | A one-node path |
| Lesson title containing `<b>bold</b>` in `course.js` | Rendered as markup in the dashboard | Rendered as text |
| Answer wrong → reload → answer right | Stored `{"L1:q1": {"ok": true}}`; practice mastery shows 100% | The first-ever attempt (wrong) is kept; mastery stays 0% for that item |
| JS errors | None | None |

## Context cost at baseline (bytes / 4 ≈ tokens; rough)

| File | ≈ tokens |
|---|---|
| `skills/learn/SKILL.md` (loaded whole on every invocation, including one-off explain mode) | 8,580 |
| Format docs (loaded on demand) | 390–780 each |
| Each pipeline skill | 520–950 |
| Each panel role prompt | 180–330 |

A lesson-panel run therefore starts from ≈ 8.6k (learn) + 0.5k (panel) + role prompt per agent, before reading any course file.
