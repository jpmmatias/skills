# Execution profiles

**Selection:** `--fast` or `--deep` in the arguments, else `profile:` in `NOTES.md`, else **Balanced**. Never upgrade to Deep on your own. Downgrade when a capability is missing or a budget is spent ([failure-handling](failure-handling.md)), and tell the learner once.

| | Fast | **Balanced** (default) | Deep |
|---|---|---|---|
| Plan | [plan-course](../workflows/plan-course.md) inline; may plan only the next 3 lessons | plan-course inline, once per course | plan-course in a subagent |
| Research, fetches per lesson | inline; reuse `RESOURCES.md`; 1 primary source; **≤ 4** | researcher subagent; **≤ 8** | researcher subagent; **≤ 15**; every claim backed or in Gaps |
| Quick Learn fetches | ≤ 2 | ≤ 3 | ≤ 5 |
| Author | you | you | `lesson-author` subagent |
| Verify | lint; `check --only` if already installed; scene poster frame | `check --only`; flagged elements and scene frames 55%/100%; ≤ 2 fix passes | full check of the lesson; all screenshots; ≤ 2 fix passes |
| Review | [self-checklist](lesson-contract.md#self-checklist), `independence: self` | `lesson-expert` + `lesson-novice` | `lesson-expert` + `lesson-novice` + `lesson-flow` |
| Round cap | 0 | **2** (one revision) | **3** |
| Agent calls per lesson (max) | 1 | **6** (you + researcher + 2 reviewers × 2 rounds) | **14** (you + researcher + 4 roles × 3 rounds; the planner adds 1 per course) |
| Tokens per lesson (estimate, not measured) | 30–45k | 70–100k | 200–350k |

Counters live in `.review/l<N>/state.md` (`budget:`). A retry of a failed reviewer counts as an agent call.
