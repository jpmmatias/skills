# New course

Set up a course workspace, learn why the learner is here and where they start, then hand off to planning.

**Preconditions:** no `MISSION.md` in the workspace. If the current directory holds unrelated work (a code repository, documents), propose a course folder next to it (`learn-<topic-slug>/`) and wait for a yes.

## Setup interview

One message, **at most four questions**, before writing anything. A detailed outline from the learner still leaves the *why* open, so ask it anyway. Never re-ask what they already said.

1. **Why**: the real-world outcome (a job, a project at work, a portfolio piece, curiosity). This becomes the mission.
2. **Starting point**: what they have already done in this area, and how deeply.
3. **Environment** (hands-on topics only): the stack or equipment they will use, plus accounts, API keys and budget for paid services.
4. **Language**: only when it is ambiguous (they wrote in one language and asked for another, or mixed languages). Otherwise use the language they write in and state it in one line.

The theme takes a question only under [Theme](#theme) rule 3, and only if a slot is still free; otherwise use the default and mention how to change it. Do not ask about the profile: say once that Balanced is the default and `--fast`/`--deep` exist.

After the answers:
- Verify the environment yourself where you can (`node -v`, `which ollama`, whether a key variable is set, without printing it) and record it with the date in `NOTES.md`.
- Write `MISSION.md` ([format](../MISSION-FORMAT.md)) and `NOTES.md` with `lang:`, `profile:`, `theme:` and the environment.
- Record the claimed prior knowledge as a learning record with `kind: claimed` ([format](../LEARNING-RECORD-FORMAT.md)). A claim is a placement hint, never evidence.

## Theme

Pick the course look in this order, then copy the file over `assets/theme.css` and write its name in `NOTES.md`:
1. A theme the learner names: a file in `${CLAUDE_SKILL_DIR}/themes/`, or "make it look like my site" (follow [THEME-FORMAT.md](../THEME-FORMAT.md)).
2. The learner's personal default, `~/.config/learn/theme.css`, if it exists.
3. If `${CLAUDE_SKILL_DIR}/themes/` holds themes and neither rule above applies, ask which one (do not guess from a file name). Offer to save the choice as the personal default; write `~/.config/learn/theme.css` only after a yes.
4. Otherwise keep the starter's default `theme.css`.

## Scaffold

Copy from the skill into the workspace. Never write back into the skill.

```bash
mkdir -p assets lessons
cp -R "${CLAUDE_SKILL_DIR}/starter/assets/." assets/
cp "${CLAUDE_SKILL_DIR}/starter/templates/index.html" "${CLAUDE_SKILL_DIR}/starter/templates/review.html" .
```

- Replace `${CLAUDE_SKILL_DIR}` with the absolute skill folder; it is not a shell variable.
- Do not copy `starter/tools/` or `starter/examples/`; they stay in the skill.
- In `assets/course.js` set `schemaVersion: 2`, `lang`, `topic`, and an `id` unique to this course: the topic slug plus a short suffix such as the start date (`transformers-2026-11`). The template id `topic-slug` is rejected by the validator and would mix progress between courses.
- Create `learning-records/`, `reference/`, `labs/` and `progress/` lazily, when the first file goes in.

## Diagnostic

Before planning, find the learner's real floor with **3–6 short items** in one chat message. Draft them from the mission and the claims, covering what the first lessons would teach.

- Prefer recall and application ("What does X return when …?", "Write the line that …") over multiple choice.
- Tell the learner: answer without looking anything up, and "I don't know" is a good answer that saves them a lesson they don't need.
- Grade each answer as `correct`, `partial` or `incorrect` with one line of feedback. Do not teach yet.
- Write one learning record with `kind: prior` listing each item, its outcome and the objective it probed. It places the course; it does not set a mastery level ([mastery](../references/mastery.md#who-records-what)).
- If the learner declines, write `diagnostic: declined` in `NOTES.md` and plan from the claims, starting one step below the claimed floor.

## Hand off

Run [plan-course](plan-course.md), then [continue-course](continue-course.md) for lesson 1.
