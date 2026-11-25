# Teaching core

How to explain anything, in chat or in a lesson.

## First principles

Explain **why** things work, not only what they do.
- Start from the problem the concept solves and the constraint that forces its shape. A learner who knows the why can rebuild the what.
- Prefer one causal chain ("X happens because Y, which forces Z") over a list of facts.
- Strip jargon. Introduce a term only when it is needed, define it in plain words on first use, and use the `GLOSSARY.md` term when one exists.

## Mental models

Give one intuitive model per concept: an analogy or picture the learner can reason with ("a hash map is a coat check: the ticket number tells you which hook"). Then say where the model breaks, so it does not become a misconception later.

## Minimal reference models

Make abstract ideas tangible with the **smallest complete example** that shows the mechanism: code, a schema, a config file or a structural outline.
- Minimal means it runs, or reads as a whole, with nothing extra. Cut every line that does not teach.
- Annotate with numbered markers or comments that say *why* each important line exists, not what it literally does.
- When the learner wants to build their own version, give the core in a few dozen lines and list the production concerns it leaves out.
- Keep reference models in the reference documents too, so the learner can copy them later.

## Flexible structure

Shape each explanation around the topic, not a template.
- Split into steps only when the topic has real stages. A simple idea gets one explanation and one picture.
- Follow the concept's own logic and the learner's questions. In lessons, the required hooks in the [lesson contract](lesson-contract.md) are fixed; where they sit in the prose is your choice.
- When the learner asks something mid-lesson, answer it; do not force them back onto the plan.

## Visual breakdowns

Make the invisible mechanism visible. Pick the form that matches the concept's shape:

| Concept shape | Visual |
|---|---|
| Parts stacked on parts (protocols, frameworks, the OS) | layered architecture |
| Choices and branches | process or decision tree |
| Things changing over time | state snapshots (before → after) or a timeline |
| Parties talking to each other | sequence or flow diagram |
| Quantities and distributions | number line, bars or a scale |

In lessons, draw these as inline SVG with the shared [components](components.md). In the terminal, use ASCII:

```
 GET /users/7 ──▶ [ cache ] ── hit ──▶ 200 (0.3 ms)
                     │
                    miss
                     ▼
                 [ database ] ──▶ store in cache ──▶ 200 (12 ms)
```
