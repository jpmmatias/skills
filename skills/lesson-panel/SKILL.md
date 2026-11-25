---
name: lesson-panel
description: Learncraft lesson panel. Use when the user wants the next lesson of a learn course written and independently reviewed, asks for a review panel, or names an author with expert, novice or course-flow reviewers. Reviewers run as separate subagents in capped rounds with versioned verdict files. Requires the learn skill.
argument-hint: "Which course or lesson should the panel take next?"
---

# Learncraft · lesson panel

**Requires the `learn` skill**, installed next to this one. This skill's folder is `${CLAUDE_SKILL_DIR}` (if that appears unexpanded, use the folder that contains this SKILL.md), so `learn` is at `${CLAUDE_SKILL_DIR}/../learn/`.

1. Check that `${CLAUDE_SKILL_DIR}/../learn/workflows/review-panel.md` exists. If not, load the `learn` skill (`/learn`, or `/learn:learn` as a plugin): its text names its folder.
2. If `learn` is not installed, **stop** and give the learner the install command; do not improvise the procedure:
   - Claude Code plugin: `/plugin install learn@jpmmatias`
   - Any agent: `npx skills add jpmmatias/skills --skill learn --skill lesson-panel`
3. Read `learn/SKILL.md` for the workspace map and invariants. In `learn`'s workflow and reference files, the `CLAUDE_SKILL_DIR` placeholder (written in `${…}` form) means the `learn` folder, not this one.
4. Follow `learn/workflows/review-panel.md`.

The role prompts are [author](agents/author.md), [expert](agents/expert.md), [novice](agents/novice.md) and [flow](agents/flow.md). They are the source of truth for the native subagents (`lesson-author` and so on) shipped with the `learn` plugin; agents without those use these files as generic subagent prompts.
