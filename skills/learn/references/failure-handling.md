# Failure handling

What to do when something is missing or breaks. The principle: degrade visibly, record it in a file, never pretend.

| Condition | Detect | Behaviour | Recorded in |
|---|---|---|---|
| Offline, or web tools denied | the first fetch errors, or no web tool exists | follow the [offline policy](grounding.md#offline-policy): no URLs from memory, unverified statuses, Quick Learn says links were not verified | `RESOURCES.md` `## Verification debt`; `NOTES.md` `sources: pending` |
| One URL fails (404, paywall, marketing) | the fetch result | drop it and try the next candidate within budget | `## Gaps` if the claim stays unbacked |
| No browser or Playwright | `check.mjs` cannot launch, or the learner declines the install | ask once to install; otherwise run the lint ([write-lesson → Verify](../workflows/write-lesson.md#verify)); never say "verified" | author `check: skipped`, `check_reason` |
| Check keeps failing | still failing after 2 fix passes | stop fixing; deliver with the problems listed, or escalate in Deep | author `check: fail` and the problems |
| No subagent support, or role files missing | no subagent or task tool; `lesson-panel/agents/` absent | Balanced and Deep run as Fast; tell the learner once that the review was not independent | verdicts `independence: self` |
| Reviewer crashes, times out, or writes a bad file | file missing, unparsable, wrong round or sha | retry once, then `BLOCKED`; never fall back to an earlier round's file | `r<R>-<role>.md` `verdict: BLOCKED` |
| Reviewers disagree | contradictory fixes at one location | precedence expert > novice > flow; declined items carry a reason; escalate if a blocker remains | author `addressed[]`, `escalation.md` |
| Budget exhausted (fetches, rounds, agent calls) | `state.md` counters | finish the current step; `status: paused`; tell the learner what remains and that `/learn` resumes; on resume, one extension with the learner's yes ([review-panel → Budget](../workflows/review-panel.md#budget)) | `state.md` `budget_extension` |
| Missing prerequisite (`MISSION.md`, plan, NOTES decision, sources block) | the workflow's Preconditions | route to the workflow that produces it; never improvise the artifact | `NOTES.md` line |
| Pipeline skill without `learn` | its Requires preflight | stop and print the install command | — |
| Storage unavailable in the browser | the runtime's notice | progress is not kept; suggest a normal (non-private) window and export | — |
| Long run, context pressure | you | state lives in files: resume from `state.md`, round files and `NOTES.md`, not memory | `state.md` |
| A learner's export will not parse | `importJSON` errors | report the error; never edit the learner's file | — |

## Platform limits

- **`${CLAUDE_SKILL_DIR}`** is substituted by Claude Code in `SKILL.md` text only. In workflow and reference files, and in agents that do not substitute it, read it as the skill folder's absolute path. It is never a shell variable.
- **`argument-hint`** in the frontmatter works in Claude Code but is rejected by claude.ai uploads and the Skills API ("Unexpected key(s) in SKILL.md frontmatter"). It is kept on purpose; remove it from a copy you upload there.
- **Plugin names:** installed as a Claude Code plugin, the command is `/learn:learn` and the agents are `learn:lesson-expert` and so on. Installed as a plain skill, the command is `/learn` and there are no native agents (the panel uses generic subagents).
- **Agents other than Claude Code** load `SKILL.md` and its folder, but subagents, slash arguments and the browser check vary by agent and are not verified.
