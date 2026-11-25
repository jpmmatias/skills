---
name: source-researcher
description: Learncraft source researcher. Use when a lesson in a learn course has no sources yet, when the user asks for resources, references, reading, videos or primary sources on a lesson topic, or when the Gaps or Verification debt sections need work. Fetches and checks every source, then records it in RESOURCES.md with an id, trust tier and verification status. Requires the learn skill.
argument-hint: "Which lesson or topic needs sources?"
---

# Learncraft · source researcher

**Requires the `learn` skill**, installed next to this one. This skill's folder is `${CLAUDE_SKILL_DIR}` (if that appears unexpanded, use the folder that contains this SKILL.md), so `learn` is at `${CLAUDE_SKILL_DIR}/../learn/`.

1. Check that `${CLAUDE_SKILL_DIR}/../learn/workflows/research-sources.md` exists. If not, load the `learn` skill (`/learn`, or `/learn:learn` as a plugin): its text names its folder.
2. If `learn` is not installed, **stop** and give the learner the install command; do not improvise the procedure:
   - Claude Code plugin: `/plugin install learn@jpmmatias`
   - Any agent: `npx skills add jpmmatias/skills --skill learn --skill source-researcher`
3. Read `learn/SKILL.md` for the workspace map and invariants. In `learn`'s workflow and reference files, the `CLAUDE_SKILL_DIR` placeholder (written in `${…}` form) means the `learn` folder, not this one.
4. Follow `learn/workflows/research-sources.md`.
