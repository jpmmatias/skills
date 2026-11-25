---
name: curriculum-planner
description: Learncraft curriculum planner. Use when a learn course has a MISSION.md but no lesson list, when the user asks for a curriculum, syllabus, roadmap or milestone map, or when the mission changed and the plan must be redrawn. Writes milestones, lessons and per-lesson objectives into assets/course.js, and motion, lab and prerequisite decisions into NOTES.md. Requires the learn skill.
argument-hint: "Which course folder should be planned?"
---

# Learncraft · curriculum planner

**Requires the `learn` skill**, installed next to this one. This skill's folder is `${CLAUDE_SKILL_DIR}` (if that appears unexpanded, use the folder that contains this SKILL.md), so `learn` is at `${CLAUDE_SKILL_DIR}/../learn/`.

1. Check that `${CLAUDE_SKILL_DIR}/../learn/workflows/plan-course.md` exists. If not, load the `learn` skill (`/learn`, or `/learn:learn` as a plugin): its text names its folder.
2. If `learn` is not installed, **stop** and give the learner the install command; do not improvise the procedure:
   - Claude Code plugin: `/plugin install learn@jpmmatias`
   - Any agent: `npx skills add jpmmatias/skills --skill learn --skill curriculum-planner`
3. Read `learn/SKILL.md` for the workspace map and invariants. In `learn`'s workflow and reference files, the `CLAUDE_SKILL_DIR` placeholder (written in `${…}` form) means the `learn` folder, not this one.
4. Follow `learn/workflows/plan-course.md`.
