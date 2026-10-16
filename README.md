# Skills

Agent skills for [Claude Code](https://claude.com/claude-code) and other agents that support `SKILL.md`.

## `learn`

A skill that teaches a concept from first principles. It explains *why* things work, builds intuitive mental models, gives small annotated reference examples, and makes hidden mechanisms visible with diagrams and narrated motion scenes.

![A narrated motion scene from a learn course: a terminal types a Jev API call, probability bars grow, and a confidence marker lands in the "confirm" band](media/learn-motion-scene.gif)

<sub>A motion scene from a course made with <code>learn</code>: one <a href="https://docs.typesafe.ai">Jev</a> API call, end to end. In the lesson it's narrated, scrubbable and split into chapters.</sub>

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
- `theme.css`: the course's look (colours, fonts, headings, corners, scene palette), swappable without touching any lesson
- `quiz.js`: immediate-feedback quizzes with shuffled options
- `diagram.js`: step-through diagrams, confidence bands, animated probability bars, a threshold explorer, visual recall drills and faded worked examples
- `progress.js` + `course.js`: the dashboard, the progress header and evidence-gated milestones
- `scene.js`: a narrated, scrubbable motion-scene player in explainer-video style (terminal with syntax highlighting, concentric layers, node-and-box flows)

`skills/learn/starter/examples/scenes-0001-sampling.js` is a complete worked motion scene to copy from. The skill decides per lesson whether a scene is worth building: yes for processes over time and hidden mechanisms, no for static structures or concepts better learned by changing a variable.

## Install

```bash
git clone https://github.com/jpmmatias/skills.git
cp -r skills/skills/learn ~/.claude/skills/learn
```

Then in Claude Code run `/learn <topic>`, or just ask how something works.

### Use your own design

Courses can match your website or brand. Ask "make my courses look like my site" and point at it, or write a theme by hand following [`THEME-FORMAT.md`](skills/learn/THEME-FORMAT.md). To make a theme your default for every new course:

```bash
mkdir -p ~/.config/learn
cp ~/.claude/skills/learn/themes/<name>.css ~/.config/learn/theme.css
```

[`themes/joaopdmatias.css`](skills/learn/themes/joaopdmatias.css) is a worked example: a monochrome editorial look with Space Mono headlines and a column grid.

## License

[MIT](LICENSE)
