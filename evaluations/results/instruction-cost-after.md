# Instruction cost — working tree

Layout `v2-router`: learn/SKILL.md is a router; workflows/ and references/ load on demand (ADR-007). Drafted from the files on 2026-11-25 while workstream A was still writing them; re-check after A lands.

Estimated tokens = bytes × 0.25 (rough; ±15–25% against a real tokenizer). Always-on skill listing (5 skills): 502 tokens, counted in the main context. Excludes workspace files, web fetches, screenshots and output.

| Path | Profile | Main context | All contexts: instructions | All contexts: code to read | All contexts: total | Contexts |
|---|---|---:|---:|---:|---:|---|
| explain | all | 3627 | 3627 | 0 | 3627 | main 3627 |
| new-course | fast | 19388 | 19388 | 0 | 19388 | main 19388 |
| new-course | balanced | 18586 | 24016 | 0 | 24016 | main 18586, researcher 4007, expert 744, novice 680 |
| new-course | deep | 11525 | 26493 | 0 | 26493 | main 11525, researcher 4007, author 8802, expert 744, novice 680, flow 736 |
| continue | fast | 14770 | 14770 | 0 | 14770 | main 14770 |
| continue | balanced | 14889 | 19398 | 0 | 19398 | main 14889, researcher 3086, expert 744, novice 680 |
| continue | deep | 6740 | 20787 | 0 | 20787 | main 6740, researcher 3086, author 8802, expert 744, novice 680, flow 736 |
| panel | balanced | 14505 | 15929 | 0 | 15929 | main 14505, expert 744, novice 680 |
| panel | deep | 6357 | 17318 | 0 | 17318 | main 6357, author 8802, expert 744, novice 680, flow 736 |
| challenge | all | 2988 | 2988 | 0 | 2988 | main 2988 |

## Files per context

- **explain / all / main** (3627 tokens): `skills/learn/SKILL.md` 1826, `skills/learn/workflows/explain.md` 626, `skills/learn/references/teaching-core.md` 674
- **new-course / fast / main** (19388 tokens): `skills/learn/SKILL.md` 1826, `skills/learn/workflows/new-course.md` 1071, `skills/learn/MISSION-FORMAT.md` 475, `skills/learn/LEARNING-RECORD-FORMAT.md` 1124, `skills/learn/workflows/plan-course.md` 1028, `skills/learn/workflows/continue-course.md` 807, `skills/learn/workflows/research-sources.md` 818, `skills/learn/RESOURCES-FORMAT.md` 921, `skills/learn/workflows/write-lesson.md` 1081, `skills/learn/references/profiles.md` 402, `skills/learn/references/motion.md` 1088, `skills/learn/references/grounding.md` 2268, `skills/learn/references/lesson-contract.md` 2539, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 1745, `skills/learn/references/labs.md` 412
- **new-course / balanced / main** (18586 tokens): `skills/learn/SKILL.md` 1826, `skills/learn/workflows/new-course.md` 1071, `skills/learn/MISSION-FORMAT.md` 475, `skills/learn/LEARNING-RECORD-FORMAT.md` 1124, `skills/learn/workflows/plan-course.md` 1028, `skills/learn/workflows/continue-course.md` 807, `skills/learn/workflows/review-panel.md` 1113, `skills/learn/workflows/write-lesson.md` 1081, `skills/learn/references/profiles.md` 402, `skills/learn/references/handoff-contracts.md` 1215, `skills/learn/references/failure-handling.md` 876, `skills/learn/references/motion.md` 1088, `skills/learn/references/lesson-contract.md` 2539, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 1745, `skills/learn/references/labs.md` 412
- **new-course / balanced / researcher** (4007 tokens): `skills/learn/workflows/research-sources.md` 818, `skills/learn/RESOURCES-FORMAT.md` 921, `skills/learn/references/grounding.md` 2268
- **new-course / balanced / expert** (744 tokens): `subagents/lesson-expert.md` 744
- **new-course / balanced / novice** (680 tokens): `subagents/lesson-novice.md` 680
- **new-course / deep / main** (11525 tokens): `skills/learn/SKILL.md` 1826, `skills/learn/workflows/new-course.md` 1071, `skills/learn/MISSION-FORMAT.md` 475, `skills/learn/LEARNING-RECORD-FORMAT.md` 1124, `skills/learn/workflows/plan-course.md` 1028, `skills/learn/workflows/continue-course.md` 807, `skills/learn/workflows/review-panel.md` 1113, `skills/learn/references/profiles.md` 402, `skills/learn/references/handoff-contracts.md` 1215, `skills/learn/references/failure-handling.md` 876, `skills/learn/references/motion.md` 1088
- **new-course / deep / researcher** (4007 tokens): `skills/learn/workflows/research-sources.md` 818, `skills/learn/RESOURCES-FORMAT.md` 921, `skills/learn/references/grounding.md` 2268
- **new-course / deep / author** (8802 tokens): `subagents/lesson-author.md` 653, `skills/learn/workflows/write-lesson.md` 1081, `skills/learn/references/lesson-contract.md` 2539, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 1745, `skills/learn/references/motion.md` 1088, `skills/learn/references/labs.md` 412
- **new-course / deep / expert** (744 tokens): `subagents/lesson-expert.md` 744
- **new-course / deep / novice** (680 tokens): `subagents/lesson-novice.md` 680
- **new-course / deep / flow** (736 tokens): `subagents/lesson-flow.md` 736
- **continue / fast / main** (14770 tokens): `skills/learn/SKILL.md` 1826, `skills/learn/workflows/continue-course.md` 807, `skills/learn/references/profiles.md` 402, `skills/learn/workflows/research-sources.md` 818, `skills/learn/workflows/write-lesson.md` 1081, `skills/learn/references/grounding.md` 2268, `skills/learn/references/lesson-contract.md` 2539, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 1745, `skills/learn/references/motion.md` 1088, `skills/learn/references/labs.md` 412
- **continue / balanced / main** (14889 tokens): `skills/learn/SKILL.md` 1826, `skills/learn/workflows/continue-course.md` 807, `skills/learn/references/profiles.md` 402, `skills/learn/workflows/review-panel.md` 1113, `skills/learn/workflows/write-lesson.md` 1081, `skills/learn/references/handoff-contracts.md` 1215, `skills/learn/references/failure-handling.md` 876, `skills/learn/references/lesson-contract.md` 2539, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 1745, `skills/learn/references/motion.md` 1088, `skills/learn/references/labs.md` 412
- **continue / balanced / researcher** (3086 tokens): `skills/learn/workflows/research-sources.md` 818, `skills/learn/references/grounding.md` 2268
- **continue / balanced / expert** (744 tokens): `subagents/lesson-expert.md` 744
- **continue / balanced / novice** (680 tokens): `subagents/lesson-novice.md` 680
- **continue / deep / main** (6740 tokens): `skills/learn/SKILL.md` 1826, `skills/learn/workflows/continue-course.md` 807, `skills/learn/references/profiles.md` 402, `skills/learn/workflows/review-panel.md` 1113, `skills/learn/references/handoff-contracts.md` 1215, `skills/learn/references/failure-handling.md` 876
- **continue / deep / researcher** (3086 tokens): `skills/learn/workflows/research-sources.md` 818, `skills/learn/references/grounding.md` 2268
- **continue / deep / author** (8802 tokens): `subagents/lesson-author.md` 653, `skills/learn/workflows/write-lesson.md` 1081, `skills/learn/references/lesson-contract.md` 2539, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 1745, `skills/learn/references/motion.md` 1088, `skills/learn/references/labs.md` 412
- **continue / deep / expert** (744 tokens): `subagents/lesson-expert.md` 744
- **continue / deep / novice** (680 tokens): `subagents/lesson-novice.md` 680
- **continue / deep / flow** (736 tokens): `subagents/lesson-flow.md` 736
- **panel / balanced / main** (14505 tokens): `skills/lesson-panel/SKILL.md` 423, `skills/learn/SKILL.md` 1826, `skills/learn/workflows/review-panel.md` 1113, `skills/learn/workflows/write-lesson.md` 1081, `skills/learn/references/handoff-contracts.md` 1215, `skills/learn/references/failure-handling.md` 876, `skills/learn/references/profiles.md` 402, `skills/learn/references/lesson-contract.md` 2539, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 1745, `skills/learn/references/motion.md` 1088, `skills/learn/references/labs.md` 412
- **panel / balanced / expert** (744 tokens): `subagents/lesson-expert.md` 744
- **panel / balanced / novice** (680 tokens): `subagents/lesson-novice.md` 680
- **panel / deep / main** (6357 tokens): `skills/lesson-panel/SKILL.md` 423, `skills/learn/SKILL.md` 1826, `skills/learn/workflows/review-panel.md` 1113, `skills/learn/references/handoff-contracts.md` 1215, `skills/learn/references/failure-handling.md` 876, `skills/learn/references/profiles.md` 402
- **panel / deep / author** (8802 tokens): `subagents/lesson-author.md` 653, `skills/learn/workflows/write-lesson.md` 1081, `skills/learn/references/lesson-contract.md` 2539, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 1745, `skills/learn/references/motion.md` 1088, `skills/learn/references/labs.md` 412
- **panel / deep / expert** (744 tokens): `subagents/lesson-expert.md` 744
- **panel / deep / novice** (680 tokens): `subagents/lesson-novice.md` 680
- **panel / deep / flow** (736 tokens): `subagents/lesson-flow.md` 736
- **challenge / all / main** (2988 tokens): `skills/challenge-reviewer/SKILL.md` 358, `skills/learn/workflows/review-challenge.md` 1005, `skills/learn/LEARNING-RECORD-FORMAT.md` 1124
