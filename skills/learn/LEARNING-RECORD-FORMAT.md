# Learning Record Format

Learning records live in `learning-records/` in the course workspace and use sequential numbering: `0001-slug.md`, `0002-slug.md`, and so on. Create the folder lazily, when the first record is written.

They are the teaching equivalent of ADRs: they capture non-obvious lessons, key insights, and established prior knowledge that steer future sessions. They are used to find the learner's zone of proximal development.

## Template

```md
# {Short title of what was learned or established}

{1-3 sentences: what was learned (or what prior knowledge was established), and why it matters for future sessions.}
```

A record can be a single paragraph. The value is recording _that_ this is now known and _why_ it changes what to teach next, not filling in sections.

## Optional frontmatter

Records may start with YAML frontmatter, which makes them machine-checkable. It is **optional**: records without it remain valid. Agents write it on every new record.

```md
---
id: LR-0004
kind: demonstrated            # demonstrated | claimed | misconception | mission-change | prior
milestone: m2                 # the milestone a challenge or cold check concerned
result: pass                  # pass | miss
criteria:
  - { text: "Picks a threshold and justifies it with the measured pass rates", status: met, evidence: "results.json: 0.92 at 0.7", objectives: [l4.o1] }
  - { text: "The new property catches a failure seen in the results", status: met, evidence: "case 14 now fails", objectives: [l4.o2, l3.o1] }
transfer: false               # true only when the task's context differs from all practice and earlier challenges
transfer_reason: ""           # one line, required in practice when transfer is true
date: 2026-11-24
---
```

| Field | Meaning |
|---|---|
| `id` | `LR-NNNN`, where `NNNN` is the filename's number. `LR-0004` is the record whose filename starts with `0004-`. |
| `kind` | `demonstrated`: the learner showed it in assessed work (a challenge, a cold check). `claimed`: the learner said so; a placement hint, never evidence. `misconception`: a wrong belief surfaced, with the correction. `mission-change`: the mission moved. `prior`: diagnostic results used for placement. |
| `milestone` | the milestone id, for challenge and cold-check records |
| `result` | `pass` or `miss`, for challenge and cold-check records |
| `criteria` | each pass criterion copied verbatim, with `status` (`met`, `not_met`, `unverifiable`), the quote or number that decided it, and `objectives`: the objective ids it demonstrates. Only named objectives can reach L4 ([mastery](references/mastery.md#levels)). For `kind: prior`, one entry per diagnostic item: `text` = `<topic-slug>: <item>`, `met` when correct, `not_met` when partial or incorrect (the grade goes in `evidence`); plan-course adds `objectives` after planning. |
| `transfer`, `transfer_reason` | `true` only with a one-line justification in `transfer_reason` (≤ 300 characters), repeated in the Evidence section |
| `date` | `YYYY-MM-DD` |

A record that unlocks a milestone (`course.js` `evidence: 'LR-NNNN'`) must be a milestone-challenge record (title `Milestone m<k> challenge: pass`) with `kind: demonstrated`, `result: pass`, every criterion `met` and naming its `objectives`, and an **Evidence** section. Cold checks (`Cold check m<k>: pass`) and lesson challenges (`Lesson N challenge: pass`, no `milestone`) share that frontmatter but never unlock a milestone; the milestone's record is always the one `course.js` names.

## Optional sections

Include these only when they add value.
- **Status** (`active | superseded by LR-NNNN`): when an earlier understanding turns out wrong and is replaced.
- **Evidence**: how the learner demonstrated it (the work, quoted numbers or words). Required when the record unlocks a milestone.
- **Implications**: what this unlocks or rules out for future sessions.

## Numbering

Scan `learning-records/` for the highest existing number and add one.

## When to write a learning record

1. **The learner demonstrated understanding of something non-trivial** in assessed work: not exposure, but evidence they can use it. This sets a new floor. (`demonstrated`)
2. **The learner disclosed prior knowledge** ("I already know X"), with the depth claimed. (`claimed`)
3. **A diagnostic placed the course.** (`prior`)
4. **A misconception was corrected.** These predict future stumbling blocks. (`misconception`)
5. **The mission shifted.** Link [[MISSION.md]] and update it after the learner confirms. (`mission-change`)

### What does _not_ qualify

- Material that was merely covered. Coverage is not learning.
- A good practice score. Practice evidence lives in the browser and its exports.
- Your impression of the learner. Impressions are not evidence.
- Anything already captured in [[GLOSSARY.md]] as a term definition.
- Session-by-session activity logs.

## Supersession

When a later record contradicts an earlier one, mark the old record `Status: superseded by LR-NNNN` rather than deleting it. The history of how understanding evolved is itself useful signal.
