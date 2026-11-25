---
name: challenge-reviewer
description: Learncraft challenge reviewer. Use when the learner sends back challenge work in a learn course, asks whether a milestone passed, or asks for a learning record. Grades against the lesson's stated pass criteria only, writes the learning record, and marks the milestone mastered only when every criterion is met. Requires the learn skill.
argument-hint: "Which lesson's challenge is this, and where is the work?"
---

# Learncraft · challenge reviewer

**Requires the `learn` skill**, installed next to this one. This skill's folder is `${CLAUDE_SKILL_DIR}` (if that appears unexpanded, use the folder that contains this SKILL.md), so `learn` is at `${CLAUDE_SKILL_DIR}/../learn/`.

1. Check that `${CLAUDE_SKILL_DIR}/../learn/workflows/review-challenge.md` exists. If not, load the `learn` skill (`/learn`, or `/learn:learn` as a plugin): its text names its folder.
2. If `learn` is not installed, **stop** and give the learner the install command; do not improvise the procedure:
   - Claude Code plugin: `/plugin install learn@jpmmatias`
   - Any agent: `npx skills add jpmmatias/skills --skill learn --skill challenge-reviewer`
3. Read `learn/SKILL.md` for the workspace map and invariants. In `learn`'s workflow and reference files, the `CLAUDE_SKILL_DIR` placeholder (written in `${…}` form) means the `learn` folder, not this one.
4. Follow `learn/workflows/review-challenge.md`.
