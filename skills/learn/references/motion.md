# Motion

When a lesson gets motion, and how to build it. Source ids `K…`: [grounding → Sources behind this skill](grounding.md#sources-behind-this-skill).

## Decide

Decide per lesson, on purpose, while planning; never by omission.

**Build a scene** when at least one holds:
- **Process over time.** The concept *is* a sequence: tokens sampled one by one, a request through layers, a retry loop, an event-loop tick.
- **Cause → effect across parts.** Changing one thing visibly shifts another (load changes batch size, which changes latency).
- **A hidden mechanism at the wrong scale or speed**: what a server does with a request, memory being allocated, packets on a wire.
- **The prose wants to say "then… then… then…"**: a chain of state changes.

**Skip the scene**, with a one-line reason, when:
- the concept is a static structure, definition, taxonomy or comparison (a labelled figure or table does it at a glance);
- the learner learns more by **changing a variable** than by watching: build an interactive explorer (a param slider) instead;
- the lesson is mostly real-world practice (steps, poses, drills);
- you cannot ground it in real data or clearly labelled illustrative values.

Quick test: at a whiteboard, would you draw it step by step while talking? Then a scene. One labelled picture? A static figure. Insight from fiddling with a value? An interactive.

Record it in `NOTES.md` as `L1: scene — <why>` or `L2: no scene — <what instead>`. When the answer is yes, the scene is part of the lesson's definition of done.

## Why motion, and its limits

A meta-analysis reported an advantage of representational animations over static pictures (d ≈ 0.40; unverified figure, K3 was not fetched) [K3]. Its effects may differ by kind of knowledge, so using animation for conceptual topics such as programming is a design choice, not a finding. Nothing in it favours decorative motion, so add none.

## Animation rules

- Animate only when the motion *is* the concept: data flowing, a value moving into a zone, a distribution shifting.
- Learner-controlled: step, play, pause, scrub. Never autoplay a long sequence.
- Short changes (under about 1 second each). The final frame must make sense as a static picture.
- Respect `prefers-reduced-motion`: jump to end states.
- Build motion into the shared components (`scene.js`, the `viz.js` timeline player), not one-off scripts.

## Scenes

A **motion scene** is a short, narrated, scrubbable animation in explainer-video style, built with `scene.js` ([components → scene](components.md#scene)). `${CLAUDE_SKILL_DIR}/starter/examples/scenes-0001-sampling.js` is a complete worked example to copy from.

1. **Storyboard first.** One sentence per chapter: what the learner should understand, what moves, and what the final frame shows. If you cannot write 3–6 such sentences, it is probably not a scene.
2. **Lay out the stage** (960×540). A terminal on the left ("what you'd see running it") and the mechanism on the right works for most programming topics.
3. **Beats set absolute state.** Every beat runs on every frame, in order, so later beats override earlier ones. Guard a later chapter's re-set of an earlier beat's element with `if (p > 0)`.
4. **Place it where the mental model is introduced**, before practice, with one line on how to use it (▶, chapters, narration).
5. **Verify** with the lesson check, which renders each scene at several timeline positions ([write-lesson → Verify](../workflows/write-lesson.md#verify)).

Rules, following Mayer's multimedia principles [K2]:
- **Segmenting:** 3–6 chapters, one idea each, with chapter buttons; the learner sets the pace.
- **Modality:** optional narration (`say`) over the animation rather than the same words on screen.
- **Redundancy:** with narration on, show only the chapter title, never the narrated sentence as a caption.
- **No presenter** (a design choice, not one of the principles in K2): no on-camera host or avatar; spend the pixels on the mechanism.
- **Real data only:** terminal output and numbers come from a real run or a cited source (`data-src`); label anything else **illustrative**, visibly.
- **Poster frame:** paused, and under reduced motion, the final frame stands alone as a static figure.
- Under about 20 seconds of motion in total. Watching earns no XP; always follow a scene with retrieval practice.
- Narration speaks the course language (`lang`).
