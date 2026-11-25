# Gamification and progress

Motivation design for the dashboard and lesson headers. Source ids `K…`: [grounding → Sources behind this skill](grounding.md#sources-behind-this-skill).

## Evidence

- A meta-analysis found a positive effect of gamification on cognitive learning outcomes (g ≈ .49; unverified figure, K4 was not fetched), which its authors describe as small [K4].
- Expected, tangible rewards made contingent on doing a task reduced free-choice intrinsic motivation in a meta-analysis of experiments [K5]; the finding is debated, and comments were published alongside it.

The rules below are **design choices** that follow from those findings and from [mastery](mastery.md). The meta-analyses do not isolate these exact mechanics.

## Rules

- **Learning signal first.** "Next up" and per-objective mastery levels, in words ("Understood: 5 attempts, 1 recall"), lead the dashboard. XP is secondary, and there is no player level.
- **Reward retrieval, not consumption.** XP = 10 × first-ever correct attempts. Opening, scrolling or watching earns nothing.
- **Practice is practice.** A finished practice set says "Practice done: X% first try. The challenge shows whether you can {canDo}." It never says "You can now…".
- **Milestones are real tasks.** A milestone unlocks only through a reviewed challenge ([review-challenge](../workflows/review-challenge.md)), never through a score.
- **Informational feedback.** Feedback says what the learner can now do or what is missing, not praise for its own sake.
- **Spaced review, not streaks.** The dashboard shows what is due to be tested ([mastery → Review schedule](mastery.md#review-schedule)); there are no login streaks.
- **No leaderboards, no loss mechanics.** A lapse schedules practice; it never removes progress.

## Local-first progress

- Browser progress lives in `localStorage`, per browser and per course (`learn:<courseId>:v2`). Pages must work without it, and the runtime says so visibly when storage is unavailable.
- The learner can **export** progress to a JSON file (the browser downloads it; the learner moves it into the course's `progress/` folder, where agents read it) and **import** it in another browser. Nothing leaves the machine.
- Prefer the four [practice item types](lesson-contract.md#practice-items) over custom widgets. A custom widget needs `data-practice` and a unique `data-id` on its root, and records first attempts through the API documented in the header of `assets/practice.js`.
