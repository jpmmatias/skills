# Instruction cost — working tree

Layout `v2-router`: learn/SKILL.md is a router; workflows/ and references/ load on demand (ADR-007). Drafted from the files on 2026-11-25 while workstream A was still writing them; re-check after A lands.

Estimated tokens = bytes × 0.25 (rough; ±15–25% against a real tokenizer). Always-on skill listing (5 skills): 502 tokens, counted in the main context. Excludes workspace files, web fetches, screenshots and output.

| Path | Profile | Main context | All contexts: instructions | All contexts: code to read | All contexts: total | Contexts |
|---|---|---:|---:|---:|---:|---|
| explain | all | 3813 | 3813 | 0 | 3813 | main 3813 |
| new-course | fast | 21054 | 21054 | 0 | 21054 | main 21054 |
| new-course | balanced | 20665 | 26208 | 0 | 26208 | main 20665, researcher 4022, expert 820, novice 702 |
| new-course | deep | 12842 | 28757 | 0 | 28757 | main 12842, researcher 4022, author 9634, expert 820, novice 702, flow 738 |
| continue | fast | 15831 | 15831 | 0 | 15831 | main 15831 |
| continue | balanced | 16363 | 20985 | 0 | 20985 | main 16363, researcher 3101, expert 820, novice 702 |
| continue | deep | 7432 | 22426 | 0 | 22426 | main 7432, researcher 3101, author 9634, expert 820, novice 702, flow 738 |
| panel | balanced | 15769 | 17290 | 0 | 17290 | main 15769, expert 820, novice 702 |
| panel | deep | 6837 | 18731 | 0 | 18731 | main 6837, author 9634, expert 820, novice 702, flow 738 |
| challenge | all | 3427 | 3427 | 0 | 3427 | main 3427 |

## Files per context

- **explain / all / main** (3813 tokens): `skills/learn/SKILL.md` 1829, `skills/learn/workflows/explain.md` 810, `skills/learn/references/teaching-core.md` 674
- **new-course / fast / main** (21054 tokens): `skills/learn/SKILL.md` 1829, `skills/learn/workflows/new-course.md` 1197, `skills/learn/MISSION-FORMAT.md` 475, `skills/learn/LEARNING-RECORD-FORMAT.md` 1276, `skills/learn/workflows/plan-course.md` 1354, `skills/learn/workflows/continue-course.md` 1018, `skills/learn/workflows/research-sources.md` 838, `skills/learn/RESOURCES-FORMAT.md` 921, `skills/learn/workflows/write-lesson.md` 1118, `skills/learn/references/profiles.md` 451, `skills/learn/references/motion.md` 1109, `skills/learn/references/grounding.md` 2262, `skills/learn/references/lesson-contract.md` 2865, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 2145, `skills/learn/references/labs.md` 412
- **new-course / balanced / main** (20665 tokens): `skills/learn/SKILL.md` 1829, `skills/learn/workflows/new-course.md` 1197, `skills/learn/MISSION-FORMAT.md` 475, `skills/learn/LEARNING-RECORD-FORMAT.md` 1276, `skills/learn/workflows/plan-course.md` 1354, `skills/learn/workflows/continue-course.md` 1018, `skills/learn/workflows/review-panel.md` 1447, `skills/learn/workflows/write-lesson.md` 1118, `skills/learn/references/profiles.md` 451, `skills/learn/references/handoff-contracts.md` 1276, `skills/learn/references/failure-handling.md` 910, `skills/learn/references/motion.md` 1109, `skills/learn/references/lesson-contract.md` 2865, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 2145, `skills/learn/references/labs.md` 412
- **new-course / balanced / researcher** (4022 tokens): `skills/learn/workflows/research-sources.md` 838, `skills/learn/RESOURCES-FORMAT.md` 921, `skills/learn/references/grounding.md` 2262
- **new-course / balanced / expert** (820 tokens): `subagents/lesson-expert.md` 820
- **new-course / balanced / novice** (702 tokens): `subagents/lesson-novice.md` 702
- **new-course / deep / main** (12842 tokens): `skills/learn/SKILL.md` 1829, `skills/learn/workflows/new-course.md` 1197, `skills/learn/MISSION-FORMAT.md` 475, `skills/learn/LEARNING-RECORD-FORMAT.md` 1276, `skills/learn/workflows/plan-course.md` 1354, `skills/learn/workflows/continue-course.md` 1018, `skills/learn/workflows/review-panel.md` 1447, `skills/learn/references/profiles.md` 451, `skills/learn/references/handoff-contracts.md` 1276, `skills/learn/references/failure-handling.md` 910, `skills/learn/references/motion.md` 1109
- **new-course / deep / researcher** (4022 tokens): `skills/learn/workflows/research-sources.md` 838, `skills/learn/RESOURCES-FORMAT.md` 921, `skills/learn/references/grounding.md` 2262
- **new-course / deep / author** (9634 tokens): `subagents/lesson-author.md` 703, `skills/learn/workflows/write-lesson.md` 1118, `skills/learn/references/lesson-contract.md` 2865, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 2145, `skills/learn/references/motion.md` 1109, `skills/learn/references/labs.md` 412
- **new-course / deep / expert** (820 tokens): `subagents/lesson-expert.md` 820
- **new-course / deep / novice** (702 tokens): `subagents/lesson-novice.md` 702
- **new-course / deep / flow** (738 tokens): `subagents/lesson-flow.md` 738
- **continue / fast / main** (15831 tokens): `skills/learn/SKILL.md` 1829, `skills/learn/workflows/continue-course.md` 1018, `skills/learn/references/profiles.md` 451, `skills/learn/workflows/research-sources.md` 838, `skills/learn/workflows/write-lesson.md` 1118, `skills/learn/references/grounding.md` 2262, `skills/learn/references/lesson-contract.md` 2865, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 2145, `skills/learn/references/motion.md` 1109, `skills/learn/references/labs.md` 412
- **continue / balanced / main** (16363 tokens): `skills/learn/SKILL.md` 1829, `skills/learn/workflows/continue-course.md` 1018, `skills/learn/references/profiles.md` 451, `skills/learn/workflows/review-panel.md` 1447, `skills/learn/workflows/write-lesson.md` 1118, `skills/learn/references/handoff-contracts.md` 1276, `skills/learn/references/failure-handling.md` 910, `skills/learn/references/lesson-contract.md` 2865, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 2145, `skills/learn/references/motion.md` 1109, `skills/learn/references/labs.md` 412
- **continue / balanced / researcher** (3101 tokens): `skills/learn/workflows/research-sources.md` 838, `skills/learn/references/grounding.md` 2262
- **continue / balanced / expert** (820 tokens): `subagents/lesson-expert.md` 820
- **continue / balanced / novice** (702 tokens): `subagents/lesson-novice.md` 702
- **continue / deep / main** (7432 tokens): `skills/learn/SKILL.md` 1829, `skills/learn/workflows/continue-course.md` 1018, `skills/learn/references/profiles.md` 451, `skills/learn/workflows/review-panel.md` 1447, `skills/learn/references/handoff-contracts.md` 1276, `skills/learn/references/failure-handling.md` 910
- **continue / deep / researcher** (3101 tokens): `skills/learn/workflows/research-sources.md` 838, `skills/learn/references/grounding.md` 2262
- **continue / deep / author** (9634 tokens): `subagents/lesson-author.md` 703, `skills/learn/workflows/write-lesson.md` 1118, `skills/learn/references/lesson-contract.md` 2865, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 2145, `skills/learn/references/motion.md` 1109, `skills/learn/references/labs.md` 412
- **continue / deep / expert** (820 tokens): `subagents/lesson-expert.md` 820
- **continue / deep / novice** (702 tokens): `subagents/lesson-novice.md` 702
- **continue / deep / flow** (738 tokens): `subagents/lesson-flow.md` 738
- **panel / balanced / main** (15769 tokens): `skills/lesson-panel/SKILL.md` 423, `skills/learn/SKILL.md` 1829, `skills/learn/workflows/review-panel.md` 1447, `skills/learn/workflows/write-lesson.md` 1118, `skills/learn/references/handoff-contracts.md` 1276, `skills/learn/references/failure-handling.md` 910, `skills/learn/references/profiles.md` 451, `skills/learn/references/lesson-contract.md` 2865, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 2145, `skills/learn/references/motion.md` 1109, `skills/learn/references/labs.md` 412
- **panel / balanced / expert** (820 tokens): `subagents/lesson-expert.md` 820
- **panel / balanced / novice** (702 tokens): `subagents/lesson-novice.md` 702
- **panel / deep / main** (6837 tokens): `skills/lesson-panel/SKILL.md` 423, `skills/learn/SKILL.md` 1829, `skills/learn/workflows/review-panel.md` 1447, `skills/learn/references/handoff-contracts.md` 1276, `skills/learn/references/failure-handling.md` 910, `skills/learn/references/profiles.md` 451
- **panel / deep / author** (9634 tokens): `subagents/lesson-author.md` 703, `skills/learn/workflows/write-lesson.md` 1118, `skills/learn/references/lesson-contract.md` 2865, `skills/learn/references/teaching-core.md` 674, `skills/learn/references/visual-design.md` 610, `skills/learn/references/components.md` 2145, `skills/learn/references/motion.md` 1109, `skills/learn/references/labs.md` 412
- **panel / deep / expert** (820 tokens): `subagents/lesson-expert.md` 820
- **panel / deep / novice** (702 tokens): `subagents/lesson-novice.md` 702
- **panel / deep / flow** (738 tokens): `subagents/lesson-flow.md` 738
- **challenge / all / main** (3427 tokens): `skills/challenge-reviewer/SKILL.md` 358, `skills/learn/workflows/review-challenge.md` 1293, `skills/learn/LEARNING-RECORD-FORMAT.md` 1276
