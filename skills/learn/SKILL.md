---
name: learn
description: Teach a concept or skill from first principles. Explains why it works, builds intuitive mental models, shows minimal annotated reference examples (code, schemas, outlines) and makes hidden mechanisms visible with diagrams and animations. Use when the user wants to understand a complex concept, explore how something works under the hood ("how does X actually work?", "explain the mechanics of Y"), build their own version of a system or pattern, or learn a topic over several sessions. In course mode it keeps lessons, references and progress in the current workspace.
argument-hint: "What would you like to learn about?"
---

The user wants to understand something. Pick the mode that fits the request.

## Modes

- **Explain mode**: a one-off "how does X work?" or "help me understand Y", outside a teaching workspace (no `MISSION.md` in the current directory). Answer inline in the terminal. Start from first principles, give one intuitive mental model and an ASCII diagram of the mechanism, then a minimal annotated reference example, then 2–3 verified links to go deeper (see [Further Learning](#further-learning-videos-articles--resources)). Don't create any files. End by offering to turn it into a course if the user wants to go deeper over time.
- **Course mode**: the user asks to *learn* a topic over time, invokes `/learn`, or a `MISSION.md` already exists here. This is a stateful request that spans multiple sessions. Use the full workspace described below.

Everything below applies to course mode. The sections on [First Principles](#first-principles--clarity), [Minimal Reference Models](#minimal-reference-models), [Visual Breakdowns](#visual-breakdowns) and [Flexible Structure](#flexible-structure) also apply to explain mode.

## Teaching Workspace

Treat the current directory as a teaching workspace. The state of their learning is captured in this directory in several files:

- `MISSION.md`: A document capturing the _reason_ the user is interested in the topic. This should be used to ground all teaching. Use the format in [MISSION-FORMAT.md](./MISSION-FORMAT.md).
- `./reference/*.html`: A directory of reference materials. These are the compressed learnings from the lessons - cheat sheets, reference algorithms, syntax, yoga poses, glossaries. They are the raw units of learning. They should be beautiful documents which print out well, and are designed for quick reference.
- `RESOURCES.md`: A list of resources which can be explored to ground your teaching in contextual knowledge, or to acquire knowledge and wisdom. Use the format in [RESOURCES-FORMAT.md](./RESOURCES-FORMAT.md).
- `./learning-records/*.md`: A directory of learning records, which capture what the user has learned. These are loosely equivalent to architectural decision records in software development - they capture non-obvious lessons and key insights that may need to be revised later, or drive future sessions. These should be used to calculate the zone of proximal development. They are titled `0001-<dash-case-name>.md`, where the number increments each time. Use the format in [LEARNING-RECORD-FORMAT.md](./LEARNING-RECORD-FORMAT.md).
- `./lessons/*.html`: A directory of lessons. A **lesson** is a single, self-contained HTML output that teaches one tightly-scoped thing tied to the mission. This is the primary unit of teaching in this workspace.
- `./labs/NN-<name>/`: Runnable hands-on projects for topics where the skill is built by doing real work (programming, data, infrastructure). See [Labs](#labs). Created lazily, only when a lesson needs one.
- `GLOSSARY.md`: The canonical vocabulary of the course, holding only terms the learner can already use correctly. Use the format in [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md). Created lazily, once the first term is earned.
- `./assets/*`: Reusable **components** shared across lessons, plus `theme.css`, the course's look. See [Assets](#assets) and [Theme](#theme).
- `NOTES.md`: A scratchpad for you to jot down user preferences, or working notes.
- `index.html`: The course dashboard: mission, milestone map, lesson mastery and review due. See [Goal & Progress Visibility](#goal--progress-visibility).
- `./assets/course.js`: The course manifest (mission, milestones, lessons) that the dashboard and lesson headers render from.

## Philosophy

To learn at a deep level, the user needs three things:

- **Knowledge**, captured from high-quality, high-trust resources
- **Skills**, acquired through highly-relevant interactive lessons devised by you, based on the knowledge
- **Wisdom**, which comes from interacting with other learners and practitioners

Before the `RESOURCES.md` is well-populated, your focus should be to find high-quality resources which will help the user acquire knowledge. Never trust your parametric knowledge.

Some topics may require more skills than knowledge. Learning more about theoretical physics might be more knowledge-based. For yoga, more skills-based.

### Fluency vs Storage Strength

You should be careful to split between two types of learning:

- **Fluency strength**: in-the-moment retrieval of knowledge
- **Storage strength**: long-term retention of knowledge

Fluency can give the user an illusory sense of mastery, but storage strength is the real goal. Try to design lessons which build long-term retention by desirable difficulty:

- Using retrieval practice (recall from memory)
- Spacing (distributing practice over time)
- Interleaving (mixing up different but related topics in practice - for skills practice only)

## Lessons

A lesson is the main thing you produce — the unit in which knowledge and skills reach the user. Each lesson is one self-contained HTML file, saved to `./lessons/` and titled `0001-<dash-case-name>.html` where the number increments each time.

A lesson should be **beautiful** — clean, readable typography and layout — since the user will return to these later to review. Think Tufte.

The lesson should be short, and completable very quickly. Learners' working memory is very small, and we need to stay within it. But each lesson should give the user a single tangible win that they can build on. It should be directly tied to the mission, and should be in the user's zone of proximal development.

If possible, open the lesson file for the user by running a CLI command.

Each lesson should link via HTML anchors to other lessons and reference documents.

Each lesson should recommend a primary source for the user to read or watch. This should be the most high-quality, high-trust resource you found on the topic.

Each lesson should contain a reminder to ask followup questions to the agent. The agent is their teacher, and can assist with anything that's unclear.

### Decide on motion while planning the lesson

Before writing a lesson, decide explicitly whether it gets a [motion scene](#motion-scenes-explainer-video-style). Not every lesson needs one, but the decision must be made on purpose, never by omission. Learners notice when a mechanism that clearly moves is shown only as a still picture.

**Build a scene** when you're confident the motion will teach better than a still, which means at least one of these holds:

- **Process over time.** The concept *is* a sequence: tokens sampled one by one, a request passing through layers, a retry loop, an event loop tick, a build pipeline.
- **Cause → effect across parts.** Changing one thing visibly shifts another: load changes batch size, which flips an output, or a config change reroutes traffic.
- **A hidden mechanism at the wrong scale or speed.** Something the learner can't observe directly: what a server does with their request, memory being allocated, packets on a wire.
- **The prose wants to say "then… then… then…".** If the explanation is a chain of state changes, show the states changing.

**Skip the scene** (and say why in one line) when:

- The concept is a static structure, a definition, a taxonomy or a comparison. A labelled diagram or table does it in one glance.
- The learner learns more by *changing a variable* than by watching. Build an interactive explorer instead (a slider, a simulator). Doing beats watching.
- The lesson is mostly real-world practice (steps, poses, drills) rather than an invisible mechanism.
- You can't ground it in real data or clearly labelled illustrative values.

Quick test: *at a whiteboard, would you draw this step by step while talking?* If yes, build a scene. If one labelled picture does it, use a static diagram. If the insight comes from fiddling with a value, build an interactive.

Record the decision in `NOTES.md` as one line per lesson, such as `L1: scene (sampling → batching → grade the rate)` or `L2: no scene (static taxonomy; used a sorter instead)`. When the answer is yes, the scene is part of the lesson's definition of done. Never swap it for static diagrams to save effort.

### Further Learning: Videos, Articles & Resources

Each lesson ends with a short **Go deeper** list of 2–5 curated links, and the reference documents carry the same links. Mix the media:

- **Video**: a talk, explainer or walkthrough, when a high-quality one exists. Prefer the creator of the technology, recognised experts and conference talks over generic tutorial channels.
- **Article / docs**: the official documentation page, and the best expert write-up.
- **Hands-on**: a playground, a repository or an interactive demo where the learner can poke at the real thing.

For each link, give its type and approximate length (`▶ Video · 12 min`, `📄 Article · 8 min read`, `🛠 Playground`) and one line on *why* it is worth the learner's time and what to look for. Never link anything you haven't confirmed exists: search for it and fetch the page first. Never invent URLs or video titles. Record every link in `RESOURCES.md` with its type. If no good video exists, say so in the `RESOURCES.md` Gaps section rather than padding the list with a weak one.

## First Principles & Clarity

Explain **why** things work, not just what they do.

- Start from the problem the concept solves and the constraint that forces its shape. A learner who knows the "why" can rebuild the "what".
- Build one **intuitive mental model** per concept, an analogy or picture the learner can reason with ("Jev is a smart `if` statement"). Then say where the model breaks down.
- Strip jargon. Introduce a term only when the learner needs it, define it in plain words on first use, and add it to the glossary once the learner can use it correctly.
- Prefer one clear causal chain ("X happens because Y, which forces Z") over a list of facts.

## Minimal Reference Models

Make abstract ideas tangible with the **smallest complete example** that shows the mechanism: code, a schema, a config file or a structural outline.

- Minimal means it runs, or reads as a whole, with nothing extra. Cut every line that doesn't teach.
- Annotate heavily. Use numbered markers or inline comments that explain *why* each important line exists, not what it literally does.
- When the learner wants to build a similar implementation, give a "build your own" reference model: the core of the system in a few dozen lines, with the production concerns it leaves out listed explicitly.
- Keep reference models in the reference documents too, so the learner can copy them later.

## Flexible Structure

Avoid rigid multi-phase templates. Shape each explanation and lesson around the topic:

- Break things into steps only when the topic actually has stages or the complexity demands it. A simple idea gets one clear explanation and one picture.
- Let the order follow the learner's curiosity and the concept's own logic, not a fixed section list. The required elements (the mission tie-in, retrieval practice, sources, the follow-up reminder) can sit wherever they read most naturally.
- Adapt to what the learner asks mid-lesson, and don't force them back onto the template.

## Visual Design (Evidence-Based)

Make every lesson visual. This is not because some learners are "visual learners". Matching instruction to a learning style has no empirical support ([Pashler et al., 2008](https://journals.sagepub.com/doi/full/10.1111/j.1539-6053.2009.01038.x)). Words plus well-designed pictures help almost everyone ([Mayer, multimedia learning](https://pressbooks.pub/learningenvironmentsdesign/chapter/mayer-applying-the-science-of-learning-evidence-based-principles-for-the-design-of-multimedia-instruction/)). Apply these rules:

- **Dual coding**: Pair every core concept with a diagram that shows the real mechanism, such as a flow, a number line or a structure. Never use prose alone for a central idea.
- **Spatial contiguity**: Put labels directly on the diagram, next to the thing they name. Don't put them in a legend or a paragraph below it.
- **Coherence**: Leave out decorative images, stock art and extra visuals. If a picture doesn't explain the mechanism, cut it.
- **Signaling**: Use one accent colour to mark the single thing to notice. Use colour the same way across lessons, for example the same colour always means "auto-act".
- **Segmenting**: When a process has real stages, let the learner click through them one change at a time instead of facing one dense figure. Don't split something that is simple enough to grasp at a glance.
- **Pre-training**: Introduce key terms with a small visual before the main explanation, so working memory isn't spent decoding vocabulary.
- **Visual retrieval practice**: Include at least one exercise that makes the learner act on a diagram from memory, such as placing a marker, labelling a blank diagram or ordering steps. Feedback should be immediate.
- **Worked → faded examples**: Show a fully annotated example first, then the same shape with parts blanked out for the learner to complete.

Build diagrams as inline SVG with reusable helpers in `./assets/`, so every diagram reads as one system and works in both light and dark themes.

If a learner says they are a "visual learner", record it in `NOTES.md` as a **preference** for more diagrams and fewer walls of text. Never use it as a reason to drop text, retrieval practice or desirable difficulty.

### Visual Breakdowns

Whenever it helps, map the concept so the invisible mechanism becomes visible. Pick the form that matches the concept's shape:

| Concept shape | Visual |
|---|---|
| Parts stacked on parts (protocols, frameworks, the OS) | Layered architecture |
| Choices and branches | Process or decision tree |
| Things changing over time | State snapshots (before → after) or a timeline |
| Parties talking to each other | Sequence or flow diagram |
| Quantities and distributions | Number line, bars or a scale |

In lessons and reference documents, draw these as inline SVG with the shared components. In the terminal (explain mode or chat answers), use ASCII diagrams:

```
 request ──▶ [ Jev ] ──▶ { choice, confidence }
                               │
                  ┌────────────┼────────────┐
               < 0.5       0.5–0.8        ≥ 0.8
              triage       confirm         act
```

### Animation

Animate only when the motion *is* the concept: data flowing through a system, a value moving into a zone, a distribution shifting. Animations that represent the change outperform static pictures (d ≈ 0.40). Decorative motion doesn't ([Höffler & Leutner, 2007](https://eric.ed.gov/?id=EJ780451)).

- Learner-controlled: step, play and pause. Never autoplay a long sequence.
- Short (under 1 second per change). The final frame must make sense on its own as a static picture.
- Always respect `prefers-reduced-motion`.
- Build animations into the shared diagram components, not one-off scripts.

### Motion Scenes (Explainer-Video Style)

For a mechanism that unfolds over time or across several parts (a request passing through a system, layers wrapping a core, a process spawning children, memory changing), build a **motion scene**. When to build one is decided per lesson (see [Decide on motion while planning the lesson](#decide-on-motion-while-planning-the-lesson)). It's a short, narrated, scrubbable animation in the style of a polished programming explainer video, embedded in the lesson. Use `./assets/scene.js`, which comes with the starter kit. Its header documents the API, and [`./starter/examples/scenes-0001-sampling.js`](./starter/examples/scenes-0001-sampling.js) is a complete worked example: terminal, probability bars, a server box and five chapters, with real and illustrative data labelled.

Authoring workflow:

1. **Storyboard first.** Write the chapters as one sentence each: what the learner should understand, what moves, and what the final frame shows. If you can't write 3–6 such sentences, the concept probably isn't a scene.
2. **Lay out the stage** (960×540). A terminal on the left for "what you'd see running it" and the mechanism on the right works for most programming topics.
3. **Write beats as absolute state.** Every beat runs on every frame, in order, so later beats override earlier ones. When a later chapter re-sets something an earlier beat controls, guard it with `if (p > 0)`.
4. **Place it where the mental model is introduced.** That's usually right after the intuitive explanation and before the lab or practice, with one line telling the learner how to use it (▶, chapters, narration).
5. **Verify headlessly.** Run the [workspace check](#verify-before-shipping). It renders every scene at 5 timeline positions. Look at the images and fix anything that overlaps or reads poorly.

- A scene is a **pure function of time**: `setup()` builds the SVG and terminal once, and each beat sets absolute state for progress `p`. That makes play, pause, scrub and chapter jumps all work.
- Put the scene definitions for a lesson in `./lessons/scenes-NNNN.js`, next to the lesson that uses them.
- Use the shared visual vocabulary: concentric **layers** (shell ⊃ kernel style), **node-and-box** flows, **state snapshots**, and a dark **terminal** with syntax highlighting. Signal the one key value per line with **gold** text (signaling).

Rules (from [Mayer's principles](https://www.devlinpeck.com/content/mayers-principles-of-multimedia-learning)):

- **Segmenting**: 3–6 chapters, one idea each, with chapter buttons. The learner controls the pace, and the scene never autoplays.
- **Modality**: optional narration (`say`) over the animation. People learn better from graphics plus narration than from graphics plus on-screen text.
- **Redundancy**: with narration on, show only the chapter title, never the same words in a caption.
- **Image principle**: no on-camera host or avatar. A speaker's image doesn't necessarily help, so spend the pixels on the mechanism.
- **Real data only**: terminal output and numbers come from real runs or cited sources. Label anything illustrative as illustrative.
- **Poster frame**: when paused, the final frame must stand alone as a static diagram, for print and for reduced motion.
- Keep it under about 20 seconds of motion, with no decorative motion. Watching earns no XP, because it's consumption, not retrieval. Always follow a scene with retrieval practice.
- Check scenes by rendering several timeline positions headlessly before shipping (the workspace check does this).

## Goal & Progress Visibility

The learner should always see **where they are going and how far they have come**.

- `./index.html` is the course dashboard. It shows the mission, the milestone map, every lesson with its practice mastery, and what is due for review.
- Every lesson opens with a progress header: the mission in one line, the milestone path with this lesson's milestone highlighted, and the learner's practice stats.
- `./assets/course.js` is the single source of truth for both. It holds the mission, the milestones (taken from the `MISSION.md` success criteria) and the lesson list. Update it whenever a lesson is added, a learning record is written or the mission changes.
- **Milestones are evidence-gated.** A milestone becomes `mastered` only when you have reviewed the learner's challenge work and written a learning record for it. Self-scored quiz results never unlock milestones. They show practice, not mastery.

### Milestone challenges and review

Every challenge box (`id="challenge"`) states, before the learner starts:

- **The task**: a real-world transfer of the lesson's skill, not a repeat of the quiz.
- **What to send back**: the concrete artifacts, such as results files, a diff, a written answer or a photo of the setup.
- **Pass criteria**: 2–4 observable checks you'll grade against, for example "picks a criterion and justifies its threshold with the measured pass rates" or "the new property catches a failure seen in the results". The learner should be able to self-check against them before sending.

When the learner sends work back, review it against those criteria and nothing else:

1. Go criterion by criterion. Say what the evidence shows for each one, quoting their numbers or words. Feedback is informational: what they can now do, and what is missing.
2. **All criteria met**: write a learning record with an **Evidence** section, set the milestone to `mastered` in `assets/course.js` with `evidence` pointing at the record (`'LR-0003'`), set the next milestone to `in-progress`, and update the lesson's `canDo` if the review revealed something sharper.
3. **Some criteria missing**: keep the milestone `in-progress`, name the smallest piece of work that would close each gap, and invite a resubmission. Never pass work on effort or partial credit. A misconception you uncover is worth its own learning record.
4. Use what the review revealed to pick the next lesson (zone of proximal development).

## Gamification (Evidence-Based)

Gamification has a small-to-moderate positive effect on learning (cognitive g ≈ 0.49). The effect is strongest with challenge and meaningful goals, and weak for points and status alone ([Sailer & Homner, 2020](https://eric.ed.gov/?id=EJ1245270)). Expected rewards can undermine intrinsic motivation ([Deci, Koestner & Ryan, 1999](https://pubmed.ncbi.nlm.nih.gov/10589298)). So:

- **Reward retrieval, not consumption.** XP comes only from first-try correct answers in practice, never from opening or scrolling a lesson.
- **Mastery over points.** Show per-lesson mastery (the share of first-try correct answers) more prominently than raw XP.
- **Milestone challenges, not badges for clicks.** Each lesson ends with a challenge tied to a mission milestone: a real-world transfer task the learner sends back to you. Passing it unlocks the milestone. That is the meaningful-goal mechanic.
- **Informational feedback.** Feedback says what the learner can now *do* ("You can now pick the right primitive"). It doesn't praise or reward for its own sake.
- **Spaced-review prompts instead of login streaks.** Practice is due again after expanding intervals (1, 3, 7, 14 days), and the dashboard shows what is due.
- **No leaderboards and no loss mechanics.** Never let a game mechanic remove desirable difficulty.

Progress lives in `localStorage`, per learner and per browser. It is a convenience, so pages must still work without it.

## Assets

Lessons are built from reusable **components**, stored in `./assets/`: stylesheets, quiz widgets, simulators, diagram helpers — anything a second lesson could reuse.

Reuse is the default, not the exception. Before authoring a lesson, read `./assets/` and build from the components already there. When a lesson needs something new and reusable, write it as a component in `./assets/` and link to it — never inline code a future lesson would duplicate.

**Starter kit:** when you create a new workspace, copy [`./starter/assets/`](./starter/assets/) into it. It contains the shared stylesheet, the quiz, the diagrams (stepper, bands, bars, threshold explorer, faded examples), progress tracking and gamification, the motion-scene player, and a `course.js` template. Each file's header documents its API. When you improve a component in a workspace, consider copying it back into the starter kit.

A shared stylesheet is the first component every workspace earns: every lesson links it, so the lessons look like one consistent course rather than a pile of one-offs. As the workspace grows, so should the component library.

**Custom practice components** must report to progress tracking: put `data-practice` on the widget's root element so it counts toward lesson completion, and call `Progress.record(id, correct)` on the learner's first attempt. Without `data-practice`, the "practice complete" banner never fires.

### Verify before shipping

Before telling the learner a lesson is ready, run the workspace check from the skill's starter kit:

```bash
npm install --prefix ~/.claude/skills/learn/starter/tools   # once: installs playwright
node ~/.claude/skills/learn/starter/tools/check.mjs .       # or --only=0003 for one lesson
```

It loads the dashboard, every lesson and every reference document at desktop and phone width. It reports JS errors, missing local files, horizontal scroll on phones, missing progress headers, challenges and practice, and unregistered scenes. It also screenshots every figure, widget and scene (at 5 timeline points) into `./.check/`. **Look at the screenshots**: passing the script isn't the same as looking right. Fix problems before handing the lesson over. If the check can't run (no browser available), say so instead of claiming the lesson was verified.

### Theme

Every page links `assets/style.css` and then `assets/theme.css`. The theme restyles the whole course through tokens: colours, fonts, heading style, corner radius and the motion-scene palette. When you create a workspace, pick its theme in this order:

1. A theme the user names (a file in [`./themes/`](./themes/), or "make it look like my site").
2. The user's personal default at `~/.config/learn/theme.css`, if it exists.
3. Otherwise keep the starter's default `theme.css`.

Copy the chosen file over `assets/theme.css` and note its name in `NOTES.md`. Never put theme colours or fonts in lessons or components; read the tokens instead, so a later theme swap restyles everything. To build a theme from a website or brand, follow [THEME-FORMAT.md](./THEME-FORMAT.md).

## The Mission

Every lesson should be tied into the mission - the reason that the user is interested in learning about the topic.

If the user is unclear about the mission, or the `MISSION.md` is not populated, your first job should be to question the user on why they want to learn this.

Failing to understand the mission will mean knowledge acquisition is not grounded in real-world goals. Lessons will feel too abstract. You will have no way of judging what the user should do next.

Missions may change as the user develops more skills and knowledge. This is normal - make sure to update the `MISSION.md` and add a learning record to capture the change. Confirm with the user before changing the mission.

## Zone Of Proximal Development

Each lesson, the user should always feel as if they are being challenged 'just enough'.

The user may specify an exact thing they want to learn. If they don't, figure out their zone of proximal development by:

- Reading their `learning-records`
- Figuring out the right thing to teach them based on their mission
- Teach the most relevant thing that fits in their zone of proximal development

## Knowledge

Lessons should be designed around a skill the user is going to learn. The knowledge in the lesson should be only what's required to acquire that skill. You teach the knowledge first, then get the user to practice the skills via an interactive feedback loop.

Knowledge should first be gathered from trusted resources. Use `RESOURCES.md` to keep track of them. Lessons should be littered with citations - links to external resources to back up any claim made. This increases the trustworthiness of the lesson.

For acquiring knowledge, difficulty is the enemy. It eats working memory you need for understanding.

## Skills

If knowledge is all about acquisition, skills are about durability and flexibility. Make the knowledge stick.

For skill acquisition, difficulty is the tool. Effortful retrieval is what builds storage strength. Skills should be taught through interactive lessons. There are several tools at your disposal:

- Interactive lessons, using quizzes and light in-browser tasks
- Lessons which guide the user through a list of real-world steps to take (for instance, yoga poses)
- Hands-on [labs](#labs): runnable projects the learner executes and changes on their own machine

Each of these should be based on a **feedback loop**, where the user receives feedback on their performance. This feedback loop should be as tight as possible, giving feedback immediately - and ideally automatically.

### Labs

For programming and other hands-on technical topics, the real skill is built in a real project, not in the browser. Pair the lesson with a lab in `./labs/NN-<name>/` (NN matches the lesson number):

- **One command to run.** The lab's `README.md` covers setup, the exact run commands and the cost of any paid API calls. Prefer the learner's stated stack, and keep dependencies minimal.
- **Works without paid services.** Give the lab a free or offline path, such as a local model, a stub or a `fake` mode, so the harness can be smoke-tested without keys or money. Label offline output as synthetic, and never accept it as challenge evidence.
- **Run it yourself before shipping.** Install it, typecheck or lint it, and run it end to end, at least in offline mode. A lab that fails on the learner's first command destroys trust in the whole course. Say plainly which paths you couldn't run (for example, no API key).
- **Produces evidence.** The lab writes a results file (JSON or similar) with the configuration it ran under. That file is what the learner sends back for the milestone challenge.
- **Accumulates toward the mission.** When the mission is to build something, design labs so their code grows into that deliverable instead of being thrown away after each lesson.
- **Check the environment early.** During the mission interview, find out which tools, accounts and budget the learner has, and record them in `NOTES.md`. Later, verify with a quick command (`which`, version checks) instead of assuming.

For quizzes, each answer should be exactly the same number of words (and characters, if possible). Don't give the user any clues about the answer through formatting.

## Acquiring Wisdom

Wisdom comes from true real-world interaction - testing your skills outside the learning environment.

When the user asks a question that appears to require wisdom, your default posture should be to attempt to answer - but to ultimately delegate to a **community**.

A community is a place (online or offline) where the user can test their skills in the real world. This might be a forum, a subreddit, a real-world class (budget permitting) or a local interest group.

You should attempt to find high-reputation communities the user can join. If the user expresses a preference that they don't want to join a community, respect it.

## Reference Documents

While creating lessons, you should also create reference documents. Lessons can reference these documents - they are useful for tracking raw units of knowledge useful across lessons.

Lessons will rarely be revisited later - reference documents will be. They should be the compressed essence of the lesson, in a format designed for quick reference.

Some learning topics lend themselves to reference:

- Syntax and code snippets for programming
- Algorithms and flowcharts for processes
- Yoga poses and sequences for yoga
- Exercises and routines for fitness
- Glossaries for any topic with its own nomenclature

Glossaries, in particular, are an essential reference. The canonical glossary lives in `GLOSSARY.md` at the workspace root ([GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md)). Promote a term into it only once the learner has used it correctly, typically in challenge work or while you write a learning record. Once it exists, every lesson, quiz and learning record uses its terms, and its aliases-to-avoid stay out of new lessons. A printable `reference/glossary.html` can mirror it, but `GLOSSARY.md` is the source of truth.

## `NOTES.md`

The user will sometimes express preferences of how they want to be taught, or things you should keep in mind. This is the place to record those preferences, so you can refer back to them when designing lessons or working with the user.
