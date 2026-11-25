# Visual design

Make every lesson visual. Not because some learners are "visual learners": a review of that idea found no adequate evidence base for matching instruction to a learning style [K1]. Words with well-designed pictures are a general multimedia-learning principle [K2]. Source ids `K…` and their verification status are listed in [grounding → Sources behind this skill](grounding.md#sources-behind-this-skill).

## Rules

- **Dual coding.** Pair every core concept with a figure of the real mechanism: a flow, a number line, a structure. Never prose alone for a central idea.
- **Spatial contiguity.** Put labels on the figure, next to what they name, not in a legend or a paragraph below.
- **Coherence.** No decorative images or stock art. A picture that does not explain the mechanism is cut.
- **Signalling.** One signal colour (`var(--signal)`) marks the single thing to notice, and means the same thing across lessons.
- **Segmenting.** When a process has real stages, let the learner step through them one change at a time. Do not split what is simple enough to grasp at a glance.
- **Pre-training.** Introduce key terms with a small visual before the main explanation, so working memory is not spent on vocabulary.
- **Visual retrieval.** At least one item makes the learner act on a figure from memory: place a marker, order the steps, fill a blank label. Feedback is immediate.
- **Worked → faded.** A fully annotated example first, then the same shape with parts blanked out (`fade` items).

Pick the figure's form from the [shape table](teaching-core.md#visual-breakdowns).

## Building figures

- Inline SVG through the shared [components](components.md) (`diagram.js`, `viz.js`), so every figure reads as one system in light and dark themes.
- Colours and fonts come only from theme tokens (`var(--fg)`, `var(--signal)`…), never literal values ([THEME-FORMAT](../THEME-FORMAT.md)).
- The final state of a figure must be visible at first paint and in print; animation only moves toward it.
- Text inside figures stays readable at phone width (390px): at least 11px rendered, or a phone layout.
- Every figure has a text alternative that states what the data shows, derived from the same data.

If a learner says they are a "visual learner", record it in `NOTES.md` as a **preference** for more figures and less dense text. Never use it as a reason to drop text, retrieval practice or desirable difficulty.
