# Instruction cost — f8aaf973 (f8aaf973bd1e)

Layout `v1-monolith`: Baseline f8aaf973: learn/SKILL.md (369 lines) is loaded whole on every path; format files on demand; 'read ./assets/ before authoring' (SKILL.md:247); the scene example when a scene is built (SKILL.md:181); the panel runs every role in one context (AI-01). Line references are to f8aaf973.

Estimated tokens = bytes × 0.25 (rough; ±15–25% against a real tokenizer). Always-on skill listing (5 skills): 498 tokens, counted in the main context. Excludes workspace files, web fetches, screenshots and output.

| Path | Profile | Main context | All contexts: instructions | All contexts: code to read | All contexts: total | Contexts |
|---|---|---:|---:|---:|---:|---|
| explain | all | 9078 | 9078 | 0 | 9078 | main 9078 |
| new-course | all | 29215 | 10732 | 18483 | 29215 | main 29215 |
| continue | all | 26430 | 10344 | 16087 | 26430 | main 26430 |
| panel | all | 27191 | 11105 | 16087 | 27191 | main 27191 |
| challenge | all | 2085 | 2085 | 0 | 2085 | main 2085 |

## Files per context

- **explain / all / main** (9078 tokens): `skills/learn/SKILL.md` 8580
- **new-course / all / main** (29215 tokens): `skills/learn/SKILL.md` 8580, `skills/learn/MISSION-FORMAT.md` 388, `skills/learn/RESOURCES-FORMAT.md` 571, `skills/learn/LEARNING-RECORD-FORMAT.md` 694, `skills/learn/starter/assets/course.js` 170 (code), `skills/learn/starter/assets/diagram.js` 4981 (code), `skills/learn/starter/assets/progress.js` 2185 (code), `skills/learn/starter/assets/quiz.js` 424 (code), `skills/learn/starter/assets/scene.js` 2872 (code), `skills/learn/starter/assets/style.css` 5404 (code), `skills/learn/starter/assets/theme.css` 52 (code), `skills/learn/starter/examples/scenes-0001-sampling.js` 2397 (code)
- **continue / all / main** (26430 tokens): `skills/learn/SKILL.md` 8580, `skills/learn/RESOURCES-FORMAT.md` 571, `skills/learn/LEARNING-RECORD-FORMAT.md` 694, `skills/learn/starter/assets/course.js` 170 (code), `skills/learn/starter/assets/diagram.js` 4981 (code), `skills/learn/starter/assets/progress.js` 2185 (code), `skills/learn/starter/assets/quiz.js` 424 (code), `skills/learn/starter/assets/scene.js` 2872 (code), `skills/learn/starter/assets/style.css` 5404 (code), `skills/learn/starter/assets/theme.css` 52 (code)
- **panel / all / main** (27191 tokens): `skills/lesson-panel/SKILL.md` 519, `skills/learn/SKILL.md` 8580, `skills/lesson-panel/agents/author.md` 325, `skills/lesson-panel/agents/expert.md` 223, `skills/lesson-panel/agents/novice.md` 179, `skills/lesson-panel/agents/flow.md` 209, `skills/learn/RESOURCES-FORMAT.md` 571, `skills/learn/starter/assets/course.js` 170 (code), `skills/learn/starter/assets/diagram.js` 4981 (code), `skills/learn/starter/assets/progress.js` 2185 (code), `skills/learn/starter/assets/quiz.js` 424 (code), `skills/learn/starter/assets/scene.js` 2872 (code), `skills/learn/starter/assets/style.css` 5404 (code), `skills/learn/starter/assets/theme.css` 52 (code)
- **challenge / all / main** (2085 tokens): `skills/challenge-reviewer/SKILL.md` 893, `skills/learn/LEARNING-RECORD-FORMAT.md` 694
