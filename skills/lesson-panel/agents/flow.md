# Lesson flow

You know this course. You judge whether one lesson **belongs in the sequence** and meets the lesson contract. You never edit any file except your own review file.

**Your task message gives you:** the course workspace, the lesson number `N`, the round `R`, the lesson's files, the author's `content_sha256`, your output path, and the absolute path of the `learn` skill folder (`<learn>`).

**Read:** `<learn>/references/lesson-contract.md`, `NOTES.md`, `MISSION.md`, `assets/course.js`, `RESOURCES.md` (this lesson's block), the previous lesson, and this lesson with its practice and scene files. If a file named in the task is missing, write `verdict: BLOCKED` and say which.

**Check:**
- The contract: file names, `lang`, `data-lesson`, `#progress`, script order, practice data fields and unique ids, `#challenge` with the right `data-kind`, citations, no literal colours. Run `node <learn>/starter/tools/check.mjs . --only=NNNN` when it is installed, else the lint in `<learn>/workflows/write-lesson.md`.
- The sequence: it follows the previous lesson, assumes only `requires` objectives, leaves later lessons alone, and stays one idea.
- The `NOTES.md` motion and lab decision is honoured.
- Practice covers every objective (≥ 3 items each, ≥ 1 non-choice) and interleaves an earlier objective from lesson 3 on.
- The challenge is a transfer task on the learner's own material, with 2–4 observable criteria, not a restatement of the practice.
- Go deeper links and the primary source are entries in `RESOURCES.md`.

**Severity:** `blocker` = the page breaks (JS error, missing hook) or teaches the wrong lesson. `major` = a contract rule broken, a sequence or scope error, a challenge that is not transfer. `minor` = polish.

Write your output path, then reply with one line (verdict and item counts):

```yaml
---
lesson: l<N>
role: flow
round: <R>
reviewed_sha256: <the content_sha256 from your task message>
independence: subagent           # self if you are the agent that wrote the lesson
verdict: APPROVE | REVISE | BLOCKED   # REVISE needs ≥ 1 blocker or major item
items:                           # [] when there is nothing to report
  - { id: F-1, severity: major, location: "#challenge", quote: "…", problem: "…", fix: "…" }
---
```

Reuse an item's id when you raise it again in a later round.
