# Learncraft brand guidelines

**Learncraft** — Turn your AI coding agent into a personal learning environment.

This file is for anyone writing about Learncraft: the README, release notes, a launch post, a talk slide. It is adapted from the [brand and naming audit](../audit/raw/11-brand-naming.md), which was written for a different candidate name; the owner chose Learncraft ([ADR-012](../audit/DECISIONS.md#adr-012--name-learncraft-keep-the-existing-install-identifiers)).

## Positioning

For people who already use an AI coding agent and want to *understand* a topic, not just get an answer, Learncraft is a set of open agent skills that makes the agent a teacher. Unlike chat tutoring or hosted course platforms, it writes a real course into your own folder (a mission, short lessons, practice, sources and learning records), schedules spaced review from your actual results, and marks a milestone mastered only after the agent has reviewed your work.

One line, when space is short: *Your coding agent, as a teacher that writes the course to disk.*

## Differentiators

Each one is shipped behaviour, with the file that implements it. Don't claim anything outside this list without adding it here first, with its evidence.

1. **The course is files you keep.** `MISSION.md`, `lessons/*.html`, `reference/*.html`, `RESOURCES.md`, `learning-records/`, `index.html` and `review.html`, all in the current folder, dependency-free, opening from disk with no server and no account. Running `/learn` again resumes from those files, not from chat memory. ([SKILL.md](../../skills/learn/SKILL.md))
2. **Explanations you can watch and change.** Step-through diagrams, data-driven figures, explorables and narrated, scrubbable motion scenes, built only when the motion *is* the concept, honouring reduced-motion settings, and pausing off-screen. ([motion reference](../../skills/learn/references/motion.md))
3. **Mastery takes evidence.** Practice is practice. A milestone becomes mastered only when a challenge review finds every pass criterion met in your own work and writes a learning record with the evidence. Levels (Seen, Familiar, Understood, Applied, Retained, Transferred) are derived from recorded events, never self-declared. ([mastery reference](../../skills/learn/references/mastery.md))
4. **Review that tests, not reminds.** `review.html` runs a cold, mixed session over objectives that are due; Leitner boxes of 1/3/7/14/30 days move only on review results, and a failure goes back to box 1. ([data model](../architecture/data-model.md))
5. **Grounded or labelled.** Sources carry an id, a trust tier and a status (`verified` with a date, or `unverified` with a reason). Offline, nothing is recorded as verified. Lessons link claims to source ids and mark claims that rest on unverified sources. ([grounding reference](../../skills/learn/references/grounding.md))
6. **Independent review, when the agent can do it.** In the default Balanced profile a separate expert and a separate novice review each lesson as subagents; when subagents are missing, the review says it was not independent. ([profiles](../../skills/learn/references/profiles.md))

Supporting points: local-first (progress stays in your browser until *you* export it; nothing is sent anywhere by Learncraft), MIT-licensed, and it runs in the agents listed in [compatibility.md](../compatibility.md) at the level stated there.

**Category context.** "AI tutor skill for Claude Code" is a busy niche (the audit found 31 repositories for one search, several with hundreds of stars). Lead with what is specific to Learncraft: the course folder you keep, the motion scenes, evidence-gated mastery and graded review. Don't lead with "AI tutor".

## Tone of voice

- Write like a good teacher: plain, specific, unhurried. Explain why something works and skip hype.
- Describe mechanisms ("writes `MISSION.md`", "unlocks after review"), not outcomes ("master anything").
- No speed or results claims ("10x", "learn faster"), no invented users, stars, testimonials or metrics. Cite research only as the skill's [grounding reference](../../skills/learn/references/grounding.md) does, with its stated strength.
- Second person, short sentences, at most one metaphor per paragraph.
- Use the code's vocabulary: lesson, mission, milestone, objective, practice, challenge, evidence, learning record, review.
- Say what is verified and what is not. "Documented by the vendor" is not "works with".
- Estimates are labelled as estimates (token costs per profile are estimates, not measurements).

## Naming usage

| Write | When |
|---|---|
| **Learncraft** | the product, in prose and headings. One word, capital L, lowercase c. |
| `learn` | the skill's name and folder, in code formatting: "the `learn` skill", `skills/learn/`. |
| `/learn` | the command when installed as a plain skill (skills.sh, copy, symlink). |
| `/learn:learn` | the command when installed as a Claude Code plugin. In user docs write "`/learn` (or `/learn:learn` as a plugin)" the first time. |
| `learn@jpmmatias` | the plugin id. The marketplace is `jpmmatias`. The pipeline plugins keep their names (`lesson-panel@jpmmatias`, …). |
| `jpmmatias/skills` | the GitHub repository. It is **not** renamed; every link points to `github.com/jpmmatias/skills`. |

Don't write: "LearnCraft", "Learn Craft", "learncraft" in prose, "the Learncraft skill" when you mean the `learn` skill's files, or "Learncraft AI". In code and data the lowercase `learncraft` appears where identifiers must be lowercase (`window.Learncraft`, `"format": "learncraft-progress"`, `~/.cache/learncraft/tools`); that is fine.

## Visual identity

Everything comes from the course runtime itself, so the brand and the product look the same. Tokens are in [`starter/assets/style.css`](../../skills/learn/starter/assets/style.css).

**Type**

| Role | Stack |
|---|---|
| Body and headings | `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif` — a book face |
| Small UI labels, kickers | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, uppercase with wide tracking for kickers |
| Commands, file names | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` |

**Colour.** One accent, used for one thing at a time.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` paper | `#fbfaf7` | `#171614` | page |
| `--fg` ink | `#1d1c1a` | `#ebe7df` | text |
| `--muted` | `#6b6760` | `#a29d93` | secondary text |
| `--rule` | `#e4e0d8` | `#34312c` | hairlines |
| `--accent` / `--signal` rust | `#9a3b1b` | `#e08a62` | links; the single thing to notice |
| `--ok` / `--bad` | `#2f6b3a` / `#a12a2a` | `#7cc48a` / `#e98080` | right / wrong, always with a text mark too |

**Scenes (dark surfaces).** Night `--sc-bg #0e1116`, panel `--sc-panel #161b23`, line `--sc-line #2a313d`, text `--sc-fg #e8eaed`, muted `--sc-muted #8b93a1`, and **gold `--sc-gold #f5c451` as the one signal colour** ("this is the thing to look at"). Other scene colours exist for data (green, amber, red, blue) and are not brand colours.

**Layout.** Generous margins, a ~42rem text column, hairline rules, side notes. No gradients, no stock illustration, no emoji in UI chrome, no glow.

**Motif.** A ruled page: a thin-line rectangle with a few horizontal rules and one rust mark in the margin — a lesson that is a file. Use it once per surface at most. There is no logo yet; don't invent one in a hurry.

### Do / don't

| Do | Don't |
|---|---|
| Show real UI: screenshots of the example courses, the motion-scene GIF | Mock up UI that doesn't exist, or fake data in a "screenshot" |
| One rust accent on paper; gold only on dark scene surfaces | Rust and gold together on one light surface; multiple accents |
| Serif for reading text, mono for commands | Display fonts, all-caps headlines |
| Label example courses "Example course — no learner data" | Present example progress as a real learner's |
| Say "documented by vendor" for agents we haven't run | "Works with every agent" |
| Name the research and its stated strength | "Science-backed", "proven" |
| Show the install command | Stars, download counts, "trusted by" rows |

## Naming audit summary

- **Rejected candidate "LearnKit":** significant conflict. At least four learning products use the exact name (an Obsidian study plugin listed in Obsidian's directory, an AI learning whiteboard, an open-source AI learning-path engine naming Claude and Cursor, a corporate e-learning firm), the npm and Obsidian identifiers are taken, and a 2019 US LEARNKIT education mark exists with unresolved status. Details: [raw/11](../audit/raw/11-brand-naming.md).
- **Audit recommendation:** Hornbook, fallback Learnwright. **Owner decision:** Learncraft (2026-11-24).
- **Learncraft conflict check** (GitHub search API, npm and PyPI, 2026-11-24; re-run 2026-11-25 with the same results):
  - GitHub: **105 repositories** named `learncraft`. Most are inactive or empty. Two are close to our idea:
    - `LearnCraftOrg/LearnCraft` — "LLM-based system that automatically generates quizzes, explanations, and learning guides from lecture transcripts using a RAG pipeline" (0★, last push 2026-04-03).
    - `Weilan0811/learncraft` — generates interactive learning handouts, illustrated handouts, posts, podcasts and slides from a learning topic (4★, **active**, last push 2026-11-23).
    Others include a course platform for a company and several unnamed projects.
  - npm `learncraft`: **unregistered** (404). PyPI `learncraft`: **unregistered** (404).
  - **Verdict:** moderate. The name is free on the package registries, but two small projects use it for AI-generated learning material, one of them active. Search results for "learncraft" will be mixed; "Learncraft agent skill", "learncraft claude" and the repository link are easier to own.
  - **Not checked:** trademarks (USPTO TSDR, WIPO Brand Database, EUIPO; classes 9, 41, 42) and domains. These are **owner actions** before any public launch.
