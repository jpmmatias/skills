# Skills

Agent skills for [Claude Code](https://claude.com/claude-code) and other agents that support `SKILL.md`.

## `learn`

A skill that teaches a concept from first principles. It explains *why* things work, builds intuitive mental models, gives small annotated reference examples, and makes hidden mechanisms visible with diagrams and narrated motion scenes.

It has two modes:

- **Explain mode** answers a one-off "how does X actually work?" in the terminal. You get the core idea, an ASCII diagram, a small annotated example and verified links to go deeper. No files are created.
- **Course mode** (`/learn <topic>`) turns the current directory into a learning workspace that spans several sessions.

### What a course includes

| Piece | What it does |
|---|---|
| `MISSION.md` | Why you're learning this. Every lesson ties back to it. |
| `lessons/*.html` | Short, beautiful, self-contained lessons with citations and a recommended primary source |
| `reference/*.html` | Printable cheat sheets and glossaries |
| `index.html` | Dashboard with the mission, milestone map, mastery per lesson and spaced-review reminders |
| `RESOURCES.md` | Curated, verified articles, docs, videos and playgrounds |
| `learning-records/` | What you've actually shown you can do, used to choose the next lesson |

### Built on learning research

- **Retrieval practice, spacing and interleaving** for long-term retention, not just a feeling of fluency.
- **Mayer's multimedia principles**: every core idea gets a diagram (dual coding), with labels on the diagram, no decoration, one highlight colour, step-by-step reveals, and narration instead of repeated on-screen text.
- **No "learning styles"**: matching lessons to a learning style has no empirical support ([Pashler et al., 2008](https://journals.sagepub.com/doi/full/10.1111/j.1539-6053.2009.01038.x)), so visuals are designed to help everyone.
- **Animations only when the motion is the concept** ([Höffler & Leutner, 2007](https://eric.ed.gov/?id=EJ780451)). You control playback, and reduced-motion settings are respected.
- **Light gamification** ([Sailer & Homner, 2020](https://eric.ed.gov/?id=EJ1245270)): XP only for first-try correct answers, mastery over points, spaced review instead of login streaks, and milestones that unlock only after the agent reviews real work.

### Starter kit

`skills/learn/starter/assets/` is copied into every new course. Everything is dependency-free HTML, CSS and JS that opens straight from disk:

- `style.css`: a print-friendly stylesheet with tokens for light and dark mode
- `quiz.js`: immediate-feedback quizzes with shuffled options
- `diagram.js`: step-through diagrams, confidence bands, animated probability bars, a threshold explorer, visual recall drills and faded worked examples
- `progress.js` + `course.js`: the dashboard, the progress header and evidence-gated milestones
- `scene.js`: a narrated, scrubbable motion-scene player in explainer-video style (terminal with syntax highlighting, concentric layers, node-and-box flows)

## Install

```bash
git clone https://github.com/jpmmatias/skills.git
cp -r skills/skills/learn ~/.claude/skills/learn
```

Then in Claude Code run `/learn <topic>`, or just ask how something works.

## Credits

`learn` is derived from the [`teach` skill](https://github.com/mattpocock/skills) by Matt Pocock (MIT). This version adds explain mode, first-principles and reference-model guidance, evidence-based visual design, motion scenes, progress tracking and gamification, verified further-learning links, and the starter kit.

## License

[MIT](LICENSE)
