# Handoff contracts

File shapes for the [review panel](../workflows/review-panel.md). All panel state lives under `.review/l<N>/` in the course workspace. Files are YAML frontmatter, optionally followed by free notes; **round files are never overwritten** (only `state.md` changes), so a stale approval can never count for a new draft.

## State file

File: `.review/l<N>/state.md`.

Owned by the orchestrator (the agent running the panel).

```yaml
---
lesson: l3
file: lessons/0003-attention.html
profile: balanced               # fast | balanced | deep
round: 2
round_cap: 2                    # balanced 2, deep 3
status: in_review               # drafting | in_review | approved | escalated | paused
sources: done                   # pending after an offline session: the next online session researches first
budget: { fetches_used: 5, fetches_max: 8, agent_calls_used: 4, agent_calls_max: 6 }   # reviewer fetches count too
budget_extension: ""            # set once, on a resume from paused: "<date> +K calls +F fetches"
history:
  - { round: 1, verdicts: { expert: REVISE, novice: APPROVE } }
---
```

## Author handoff

File: `.review/l<N>/r<R>-author.md`.

Written by the author **last**, after every lesson file is saved.

```yaml
---
lesson: l3
round: 2
content_sha256: 9f2c…           # sha256 of the lesson HTML + NNNN.practice.js + scenes-NNNN.js, in that order, those that exist
check: pass                     # pass | fail | skipped
check_reason: ""                # e.g. "no-playwright"
problems: []                    # what the check still reports after 2 fix passes
motion: scene                   # must equal the NOTES.md decision for this lesson
sources_cited: [S12, S14]
sources_request: []             # new sources the lesson needs; research-sources adds them, the author never edits RESOURCES.md
addressed:                      # empty in round 1
  - { id: E-2, action: fixed, note: "recomputed 0.83 → 0.81" }
  - { id: N-1, action: declined, reason: "conflicts with E-1 (scope); precedence: expert" }
---
```

## Reviewer verdict

File: `.review/l<N>/r<R>-<role>.md`.

One per reviewer (`expert`, `novice`, `flow`).

```yaml
---
lesson: l3
role: expert
round: 2
reviewed_sha256: 9f2c…          # the content_sha256 from the task message; must equal this round's, else ignored
independence: subagent          # subagent | self
verdict: REVISE                 # APPROVE | REVISE | BLOCKED
items:                          # [] when there is nothing to report
  - id: E-1                     # E-, N- or F- plus a number, unique within the lesson across rounds
    severity: blocker           # blocker | major | minor
    location: "#worked-example"
    quote: "the weights sum to the sequence length"
    problem: "False: softmax outputs sum to 1."
    fix: "Replace with 'the weights of one query sum to 1'."
---
```

**Severity:**
- `blocker`: the learner would leave with a false picture, a number contradicts its source, a link points at the wrong work, or the lesson cannot be completed.
- `major`: the core idea or main exercise cannot be done from the page without guessing; an undefined term on the critical path; a practice item answerable from cues; a challenge that is not a transfer task; a contract hook missing.
- `minor`: wording, polish, a nicer example. Never starts a round.

**Verdicts:** `APPROVE` = no open blocker or major item. `REVISE` = at least one blocker or major item. `BLOCKED` = could not review (file missing, sha mismatch, tool failure); state why in `problem`.

## Rules

- Reviewers start only when `state.md` says `status: in_review` for the round they were given.
- A review counts only if it parses, its `round` matches, its `reviewed_sha256` equals the author's `content_sha256`, and the lesson files still hash to that value when the reviews are collected.
- Completion: every required role has `APPROVE` in the current round.
- Item ids persist across rounds: a reviewer re-raising an issue reuses its id.
- Precedence on conflicting fixes: **expert > novice > flow** (truth, then comprehension, then sequence).
- Reviewers never edit lesson files, `RESOURCES.md`, `course.js` or `NOTES.md`.

## Escalation file

File: `.review/l<N>/escalation.md`.

```yaml
---
lesson: l3
round: 2
reason: round_cap               # round_cap | blocked_reviewer | declined_blocker | draft_moved
open:
  - { id: E-1, severity: blocker, expert: "…", author: "…", proposal: "cut the claim and what depends on it" }
question: "One question for the learner"
resolution: ""                  # written after the learner answers; then status approved, or one more round
---
```

## Upstream handoffs

- **Researcher → author:** the `### Lesson N` block in `RESOURCES.md`, with the `Claims` ledger ([RESOURCES-FORMAT](../RESOURCES-FORMAT.md)).
- **Planner → author:** the lesson's `course.js` entry and its `NOTES.md` decision line ([plan-course](../workflows/plan-course.md)).
- **Challenge reviewer → everyone:** the learning record frontmatter ([LEARNING-RECORD-FORMAT](../LEARNING-RECORD-FORMAT.md)) and the milestone status in `course.js`.
