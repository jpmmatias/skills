# Review panel (Balanced and Deep)

Independent review of one lesson by reviewers in fresh contexts, in capped rounds, through versioned files. The `lesson-panel` skill runs this file. File shapes are in [handoff-contracts](../references/handoff-contracts.md); failures in [failure-handling](../references/failure-handling.md).

**Preconditions:** the [write-lesson](write-lesson.md) preconditions hold, and the lesson was chosen by the [next-step rule](continue-course.md#the-next-step-rule) or named by the learner.

## Roles

| Profile | Author | Reviewers (in parallel) | Round cap |
|---|---|---|---|
| Balanced | you, following [write-lesson](write-lesson.md) | `lesson-expert`, `lesson-novice` | 2 |
| Deep | `lesson-author` subagent | `lesson-expert`, `lesson-novice`, `lesson-flow` | 3 |

**Starting a reviewer**, in this order of preference:
1. **Native subagent** (Claude Code with the `learn` plugin): `lesson-expert`, `lesson-novice`, `lesson-flow`, `lesson-author`, shown as `learn:lesson-expert` and so on.
2. **Generic subagent** (any agent with a subagent or task tool): its prompt is the full text of the role file `${CLAUDE_SKILL_DIR}/../lesson-panel/agents/<role>.md` plus the task message below.
3. **Neither, or the role files are missing** (the `lesson-panel` skill is not installed): fall back to Fast. Run the [self-checklist](../references/lesson-contract.md#self-checklist), stamp `independence: self`, and tell the learner once that the review was not independent. Never play the reviewers yourself in this context: you wrote the lesson, so you cannot see its gaps.

**Task message** to every reviewer: the workspace path, lesson number, round, the lesson's files, `content_sha256`, the output path `.review/l<N>/r<R>-<role>.md`, the absolute `learn` skill folder, and for the novice the previous lesson's path. Nothing else: no summary of the lesson, no hints about what you intended. The author subagent (Deep) gets the same, plus the review files that counted in the previous round.

## Loop

1. **Init.** Create `.review/l<N>/state.md` with `status: drafting`, `round: 1`, the profile, the cap and the budget counters.
2. **Author.** Write or revise the lesson per [write-lesson](write-lesson.md). Compute `content_sha256` over the lesson HTML, then `lessons/NNNN.practice.js`, then `lessons/scenes-NNNN.js` (those that exist, in that order):

   ```bash
   cat lessons/0003-*.html lessons/0003.practice.js lessons/scenes-0003.js 2>/dev/null | sha256sum   # macOS: shasum -a 256
   ```

   Write `r<R>-author.md` last, then set `status: in_review`.
3. **Review.** Start the reviewers in parallel. Each writes only its own `r<R>-<role>.md` and never edits the lesson.
4. **Collect.** A review counts only if its frontmatter parses, `round` is R and `reviewed_sha256` equals the author's `content_sha256`. A missing or malformed file: retry that reviewer once, then record it as `BLOCKED`. Never reuse a file from an earlier round. When all reviews are in, hash the lesson files again: if the hash changed, the draft moved under the reviewers, so discard the round's reviews and review again.
5. **Decide.**
   - Every required role `APPROVE` → `status: approved`. Done.
   - Any `REVISE` (it must carry at least one `blocker` or `major` item) and R < cap → R+1; the author addresses every blocker and major item (`fixed`, or `declined` with a reason) and goes to step 2. `minor` items never start a round.
   - Conflicting fixes at the same place resolve by precedence **expert > novice > flow**; the losing item is `declined` with the precedence as its reason.
   - Otherwise → [escalate](#escalation).
6. **Hand back** to [continue-course](continue-course.md#run-the-pipeline-for-the-next-lesson) for delivery.

## Escalation

When the cap is reached with open items, a reviewer is `BLOCKED` after its retry, or the author declines a `blocker`:
1. Write `.review/l<N>/escalation.md`: each open item, each side's position, and your proposed resolution.
2. Set `status: escalated` and ask the learner **one** question.
3. Until it is resolved, deliver the lesson only if no expert `blocker` is open. Otherwise cut the disputed section or label it illustrative, and list open `major` items in `NOTES.md`.

## Budget

Stop at the profile's caps ([profiles](../references/profiles.md)). On exhaustion, finish the current step, set `status: paused`, and tell the learner what remains; `/learn` resumes from `state.md`.
