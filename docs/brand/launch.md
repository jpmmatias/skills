# Launch kit

Drafts for the owner. Nothing here has been posted, submitted or registered. Before posting anywhere: finish the owner actions at the end, enable GitHub Pages so the demo link works, and re-read [brand-guidelines.md](brand-guidelines.md) for tone.

## Show HN

**Title** (≤ 80 characters):

> Show HN: Learncraft – agent skills that make your coding agent write you a course

**Text:**

> Learncraft is a set of MIT-licensed agent skills (`SKILL.md`) for Claude Code and other agents that load the format. Ask "how does X work?" and you get a first-principles explanation that ends with questions to answer from memory. Run `/learn <topic>` in an empty folder and it asks why you're learning, checks what you already know with a few short questions, writes a `MISSION.md`, and builds short static-HTML lessons: diagrams, explorables, narrated motion scenes you can scrub, practice with immediate feedback, and a challenge per lesson.
>
> Everything stays in that folder and opens from disk, with no server, account or build step. Practice is logged in your browser as an append-only history (first tries are never overwritten), a review page tests what is due on a 1/3/7/14/30-day schedule, and you can export that history for the agent to read. A milestone counts as mastered only after the agent reviews your work against written pass criteria and writes a learning record with the evidence. Sources carry a trust tier and a verified/unverified status, and the agent won't present a link from memory as verified.
>
> By default each lesson is reviewed by separate "expert" and "novice" subagents before you see it; `--fast` skips that, `--deep` adds a course-flow reviewer. We've verified installs and loading in Claude Code; for Codex, Cursor, Copilot, Gemini CLI and OpenCode we've only verified that the files land where their docs say skills are read. Three example courses (transformers, React rendering, probability) are in the repo, with no learner data.
>
> Repo: https://github.com/jpmmatias/skills · Demo: https://jpmmatias.github.io/skills/

Keep the last paragraph's honesty about agent support: it is the first question people will ask.

## Short announcement (≈ 280 characters)

> Learncraft: agent skills that turn your coding agent into a teacher. `/learn <topic>` writes a course into your folder — lessons, motion scenes, practice, spaced review — and a milestone counts only after the agent reviews your work. Local files, MIT. github.com/jpmmatias/skills

## Longer announcement (blog, newsletter, LinkedIn)

> I wanted my coding agent to *teach* me things, not just answer. Learncraft is the result: open agent skills that build a course in a folder you own. Each lesson is one idea, a diagram or a short narrated animation when motion is the point, practice you answer from memory, and a challenge from your own work. The agent reviews that work against written criteria before it marks anything mastered. Practice history stays in your browser until you export it; review sessions are scheduled from your results. It's MIT-licensed and builds on Matt Pocock's original `teach` skill.
>
> Install in Claude Code: `/plugin marketplace add jpmmatias/skills`, then `/plugin install learn@jpmmatias`. Or `npx skills add jpmmatias/skills --skill learn`.

## Distribution channels

Each was observed to exist on 2026-11-24 ([raw/11](../audit/raw/11-brand-naming.md)). Their contribution rules were **not** read; read each one's CONTRIBUTING or submission page first.

| Channel | Status | Note |
|---|---|---|
| skills.sh / `npx skills` | npm `skills` 1.9.0 exists; installing from this repo verified (raw/12) | already the documented install path; the skills.sh website itself was not reachable from the audit sandbox |
| Claude Code plugin marketplace | this repo is one (`jpmmatias`); validated with `claude plugin validate --strict` | users add it directly |
| `anthropics/claude-plugins-official` | repository exists | submission process could not be read (HTTP 403); check before applying |
| Awesome lists | exist and were pushed in 2026 | ComposioHQ/awesome-claude-skills, hesreallyhim/awesome-claude-code, VoltAgent/awesome-agent-skills, travisvn/awesome-claude-skills, BehiSecc/awesome-claude-skills, heilcheng/awesome-agent-skills, composio-community/awesome-claude-plugins, ccplugins/awesome-claude-code-plugins. quemsah/awesome-claude-plugins is an automated index (nothing to submit) |
| Show HN | — | post once Pages is live and the example courses are linked |

Lead with what is specific (the course folder, the motion scenes, evidence-gated mastery, graded review), not "AI tutor": that niche is crowded.

## GitHub repository settings (owner applies)

The repository currently has no description, no topics and no homepage.

- **Description:** `Learncraft: turn your AI coding agent into a personal learning environment. Agent skills that write a course to your folder — lessons, motion scenes, practice, spaced review, evidence-gated milestones.`
- **Homepage:** `https://jpmmatias.github.io/skills/` (after Pages is enabled; until then leave it empty).
- **Topics:** `claude-code`, `agent-skills`, `claude-skills`, `claude-code-plugin`, `skills-sh`, `learning-tools`, `spaced-repetition`, `education`, `tutor`, `learncraft`.
  Observed repository counts per topic on 2026-11-24 (raw/11): claude-code 128,700; agent-skills 47,568; claude-skills 17,757; claude-code-plugin 17,530; spaced-repetition 3,945; skills-sh 1,327; learning-tools 316.
- **Social preview:** upload [`media/social-preview.png`](../../media/social-preview.png) under Settings → General → Social preview (1280×640).

## Owner actions before launch

1. Trademark search for LEARNCRAFT (USPTO TSDR, WIPO Brand Database, EUIPO; classes 9, 41, 42). Not done by us.
2. Domain check at a registrar (learncraft.dev / .app / .ai / .com). Not done by us.
3. Decide whether to rename the repository (it stays `jpmmatias/skills` for now; GitHub redirects old URLs after a rename, but install commands in other people's notes would still show the old name).
4. Enable GitHub Pages with **Source: GitHub Actions** (Settings → Pages). The `pages` workflow ([.github/workflows/pages.yml](../../.github/workflows/pages.yml)) lints the example courses and publishes `examples/` as the site root, so `https://jpmmatias.github.io/skills/` serves the gallery (`examples/index.html`). It runs on pushes to `main` that touch `examples/`, or by hand (workflow_dispatch). Open the URL once after the first run.
5. Apply the description, homepage, topics and social preview above.
6. Tag a release (`v2.0.0`) to match the plugin `version`, so users can pin it.
