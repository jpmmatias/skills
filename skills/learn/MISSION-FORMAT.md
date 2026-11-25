# MISSION.md Format

`MISSION.md` lives at the course workspace root. It captures the _reason_ the user is learning this topic. Every teaching decision — what to teach next, which resources to surface, which exercises to design — should trace back to this document.

## Template

```md
# Mission: {Topic}

## Why
{1-3 sentences. The concrete real-world goal the user is chasing. What changes in their life or work when they have this skill? Avoid abstract framings like "to understand X" — push for the underlying outcome.}

## Success looks like
- {A specific, observable thing the user will be able to do. Each line becomes one milestone.}
- {Another specific thing}
- {…}

## Constraints
- {Time, budget, prior commitments, learning preferences, anything that bounds the approach}

## Out of scope
- {Adjacent topics the user explicitly does not want to chase right now — protects the zone of proximal development}
```

## Rules

- **One mission per workspace.** If the user wants to learn two unrelated things, that is two workspaces.
- **Concrete over abstract.** "Run a half marathon by October" beats "get fitter." "Ship a Rust CLI to my team" beats "learn Rust."
- **Push back on vagueness.** If the user cannot articulate why, interview them before writing anything. A bad mission is worse than no mission.
- **Revise when reality shifts, with consent.** Missions change. When the user's goal moves, confirm the new wording with them, update this file, and write a `kind: mission-change` learning record ([format](LEARNING-RECORD-FORMAT.md)). Don't leave a stale mission steering future sessions.
- **Success lines must be observable.** Each one becomes a milestone that a challenge can demonstrate, so write what the user will *do*, not what they will "understand".
- **Keep it short.** If `MISSION.md` runs past a screen, it has stopped being a compass and started being a plan.
