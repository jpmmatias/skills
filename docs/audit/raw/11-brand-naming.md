# 11 — Brand & naming audit (Agent 11: Brand Strategist & Open-Source Growth)

Observed on 2026-11-24. Scope: proposed name "LearnKit" / tagline "Turn your AI coding agent into a personal
learning environment." for `jpmmatias/skills` (main skill `learn`). Nothing was registered, posted or contacted.
The owner decides. Everything below the "Judgment" headings is a recommendation only.

## How evidence was gathered (and what could not be checked)

- GitHub: `gh api -X GET search/repositories` (search API works here). Per-repo endpoints
  (`gh api repos/<owner>/<repo>`) for repos outside this session returned HTTP 403, so details come from the search API.
- npm: `npm view <name>`, `npm search <name> --json`. PyPI: `https://pypi.org/pypi/<name>/json` (HTTP code).
- Web: the WebSearch tool. Its results are *summaries of search hits*, not first-hand page reads. WebFetch failed
  for producthunt.com and ctrlaltwill.github.io (host not allowed in this sandbox), so I could not open those pages.
- Not checkable here: Homebrew (`formulae.brew.sh` refused by the egress proxy, HTTP 403); domains
  (`curl https://learnkit.{com,io,dev,ai,app}` all returned code 000 through the proxy, so I cannot say whether
  they resolve or who owns them, and WHOIS was not attempted); skills.sh website (code 000);
  the USPTO TSDR system (no paid or official database was used, only Justia/Markinton pages surfaced by search).
  Treat every trademark line below as a signal, not legal clearance.

---

## Task 1 — "LearnKit" naming audit

### Observed evidence

| Channel | What I saw |
|---|---|
| GitHub `learnkit` | 67 repos; `learnkit in:name` 83 repos. Top: **ctrlaltwill/LearnKit, 187★, 16 forks, MIT, created 2026-01-11, pushed 2026-10-31**, "A native study system for your Obsidian vault. LearnKit turns notes into durable knowledge…" (homepage ctrlaltwill.github.io/LearnKit). Others ≤4★, incl. siddhu1716/LearnKit ("LIA Labs / Learnkit – Make your AI agents Learn Improve and Adapt", pushed 2026-08-15), org `learnkit-dev` (2023–2024), org `learnkit-tech`. |
| GitHub `learnkit-ai/learnkit` | 0★, created 2026-05-03, pushed 2026-05-29: "The open-source AI workbench for teams that ship. Generate personalized, role-aware learning paths for Claude, Cursor, ChatGPT and 40+ tools…" |
| GitHub `"learn kit"` / `learn-kit` | 572 / 3,146 repos (generic "learning kit" usage; e.g. sadanandpai/frontend-learning-kit 4,698★, future-agi/agent-learning-kit 129★). |
| Obsidian | `obsidianmd/obsidian-releases` community-plugins.json contains `{"id": "learnkit", "name": "LearnKit", "author": "William Guy", "repo": "ctrlaltwill/learnkit"}`. The plugin ID `learnkit` is taken in that directory. |
| npm `learnkit` | `npm view learnkit` → E404 "Unpublished on 2026-08-20T03:10:06Z" (the name had a package that was unpublished). `learn-kit` → 404. |
| npm search | 3 hits, all one product: `@learnkit-ai/core` 0.1.1 ("Deterministic learning-path engine for LearnKit AI"), `@learnkit-ai/react` 0.1.1, `@learnkit-ai/schemas` 0.1.0; created 2026-05-29; repo github.com/learnkit-ai/learnkit; homepage learnkit-ai.com. |
| PyPI | `learnkit` exists (HTTP 200): v0.0.0, summary "Machine Learning Toolkit", uploaded 2025-04-24 (placeholder-like). `learn-kit` → 404. |
| Web: learnkit.io | Search hits (Product Hunt, aichief.com, aipure.ai, neura.market) describe **LearnKit.io, an AI visual-learning whiteboard** ("Whiteboard + AI = The learning supertool you needed"), Product Hunt launch 2025-04-13, marked Free; a second PH listing "LearnKit" (2025-04-09) uses similar copy. Not opened first-hand. |
| Web: learnkit-ai | Site learnkit-web.vercel.app (docs, /teams, /tools/cursor, blog "Launching LearnKit AI" dated 2026-05-01), Apache-2.0 per search summary. |
| Web: learnkit.com | Slideshare "LearnKit corporate overview" (www.learnkit.com, 1-844-E-LRNkit, @learnkit): a custom e-learning company. Current activity not verified. |
| Trademark signals | Justia: **LEARNKIT, serial 86875476, reg. 5772382, owner Kesson Group Inc., education/online training, registered 2019-06-11**, status shown "700 – Registered" (status date 2019). Markinton shows the same registration as "Dead", cancelled 2025-12-26. Second LEARNKIT filing 86875316 (Class 9) abandoned. Status unresolved without TSDR. |
| Domains | Not observable from here (see limitations). Search shows learnkit.io and learnkit.com in use by the products above; learnkit.dev / .ai unknown. |
| Homebrew | Not checked (proxy refused). |

### Judgment — verdict: **significant conflict. Don't adopt "LearnKit".**

- At least four separate, recent learning products use the exact name: an Obsidian study plugin with spaced
  repetition (active Oct 2026, listed in Obsidian's plugin directory), an AI learning whiteboard (learnkit.io), an
  open-source AI learning-path engine that names Claude and Cursor (LearnKit AI, npm `@learnkit-ai/*`), and a
  corporate e-learning firm (learnkit.com). Two of them are in exactly our space: AI plus personal study.
- A US LEARNKIT mark for education services existed (2019). It may now be cancelled, but the name sits in a
  contested education niche.
- Discoverability is poor. Searching "LearnKit" returns a mix of these products, and "learn kit" is a generic
  phrase (3k+ repos). The npm and Obsidian identifiers are not available to us anyway.

---

## Task 2 — Alternatives (each checked on GitHub + npm + PyPI + web search)

Rejected during screening (exact evidence, same date):
- **Learnfold**: npm `learnfold-link` 0.3.10 "Securely connects a learner-owned coding agent to the Learnfold app" (created 2026-07-30). Direct conflict.
- **Lessonsmith**: web: LessonSmith, an AI lesson-planning tool for teachers (lessonsmith.ai per StartupHub).
- **Tutorfile**: PyPI `tutorfile` 0.1.4 "A vimtutor-inspired library for generating interactive tutorials using AI".
- **Mentorfile**: GitHub Mentorfile/mentorfile "Install someone's judgment: mentorfiles for Claude Code and Codex" (pushed 2026-10-03).
- **Whetstone**: npm `whetstone` 0.2.1 "Sharpen your coding agent — three Cl…"; deliveryhero/whetstone 218★.
- **Journeywork**: kamy-labs/Journeywork "gives Claude Code a full engineering t[eam]".
- **Proofbook**: npm `proofbook` 0.1.11 "Evidence layer for agentic AI systems".
- **Proofwork**: npm placeholder `proofwork` 0.0.0; also reads as crypto "proof of work".
- **Copybook, Commonplace, Quire, Understudy, Scholia, Docent, Groundwork**: crowded (hundreds or thousands of repos, taken npm names).

### Shortlist

| # | Name | GitHub (`in:name`) | npm | PyPI | Web (exact) | Conflict |
|---|---|---|---|---|---|---|
| 1 | **Hornbook** | 15 repos, max 1★ (a flash-card toy, an entropy game) | `hornbook` unregistered; search: only `@open-metric-fonts/hornbook` (a font) | 404 | No software product found. Known non-software uses: *The Horn Book Magazine* (children's-literature reviews, Boston, since 1924, hbook.com); "hornbook" in law (West Academic HORNBOOK SERIES, Class 16 books, reg. 1247659). No Class 9/41 HORNBOOK mark surfaced. | Low (software); moderate associative |
| 2 | **Learnwright** | 3 repos, 0★, empty | unregistered, 0 search hits | 404 | No exact match. Sounds identical to **LearnRight** (an LMS on G2, founded 2022; its 1993 LEARNRIGHT mark was cancelled in 2004). Close to Pathwright (course platform since 2009) and LearningWrite. LEARNWRIGHT LLC filing abandoned in 2003. | Low–moderate (homophone of an active LMS) |
| 3 | **Proofpiece** | 0 | unregistered, 0 hits | 404 | No hits outside printing "proof" terms | Very low |
| 4 | **Learnstead** | 4 repos; kyungseo/learnstead 46★ (Korean course on local LLM, RAG and agents, created 2026-08-10) | unregistered, 0 hits | 404 | No exact match (near: LearnStream, LearnStreet) | Low–moderate (same-domain GitHub repo) |
| 5 | **Coursewright** | 8 repos ≤1★, but two do the same thing: shivarajbakale/coursewright ("…a team of AI agen[ts]…") and groundworklms/coursewright ("Objectives + sources → a full cited course", 2026-09-12) | unregistered, 0 hits | 404 | No product; Pathwright is close | Moderate (same concept, tiny) |

### Reasoning (judgment)

1. **Hornbook**. A hornbook was the first learning tool many children held: one lesson sheet on a paddle
   behind clear horn. That maps well onto "one short lesson per HTML file, the agent as tutor". The word is
   unusual and easy to remember, it fits the editorial, Tufte-like style, and it has a simple icon. Risks:
   people may link it to children's reading (The Horn Book) or law-school texts, and some won't know the word.
   For search, "hornbook" alone is dominated by the law and magazine senses, but "hornbook agent skill",
   "hornbook claude" and the `owner/hornbook` repo would be easy to own.
2. **Learnwright**. Means "maker of learning" (like playwright or shipwright). It keeps "learn", which matches the
   `/learn` command and the skill name, and it's free across the channels I checked. The sound-alike LearnRight is an
   active LMS in the same category, which matters for spoken word of mouth and possibly for trademark.
3. **Proofpiece**. A "masterpiece" was originally the work a journeyman submitted to prove mastery, which is what
   `challenge-reviewer` does (milestones unlock only on reviewed evidence). It's the cleanest name of the five but
   says the least about learning and is harder to say.
4. **Learnstead**. "Your learning homestead", the course lives in your folder. Pleasant, but it has no strong
   image, and a same-domain repo already uses it.
5. **Coursewright**. Clear meaning, but small 2026 projects already use it for "agents write a course",
   which is our exact concept.

**Recommendation: Hornbook**, with **Learnwright** as the fallback if the owner wants "learn" in the name.
Before adopting, the owner should check the USPTO TSDR / WIPO Brand Database for HORNBOOK in Classes 9, 41 and 42,
check domains (hornbook.dev / .app / .ai) at a registrar, and check that `hornbook` is free on npm and GitHub
at decision time. Keep the skill and command name `learn`. The brand names the project; the command stays plain.

---

## Task 3 — Brand direction (written for "Hornbook"; swap the name if another is chosen)

### Positioning statement
For people who already use an AI coding agent and want to *understand* a topic, not just get an answer,
Hornbook is a set of open agent skills that turns the agent into a personal tutor. Unlike chat tutoring or
hosted course platforms, it writes a real course into your own folder (mission, short lessons, references,
learning records), and it marks a milestone mastered only when the agent has reviewed your work.

### Three differentiators (grounded in the repo)
1. **The course is files you keep.** `MISSION.md`, `lessons/*.html`, `reference/*.html`, `RESOURCES.md`,
   `learning-records/`, `index.html`, all in the current directory and dependency-free (open from disk, no server).
   Running `/learn` again picks up from your records.
2. **Explanations you can watch and use.** Step-through diagrams, narrated and scrubbable motion scenes (`scene.js`),
   immediate-feedback quizzes, faded worked examples and runnable labs. A scene is built only when the motion *is*
   the concept, and reduced-motion settings are respected.
3. **Mastery takes evidence.** Quiz XP is practice. A milestone becomes `mastered` only after `challenge-reviewer`
   finds every pass criterion met in the learner's own work and writes a learning record with an Evidence section.
   Supporting points: local-first (no account; the only telemetry is the skills.sh CLI's anonymous install
   telemetry, which can be turned off), and it runs in agents you already use (Claude Code plugin, or `SKILL.md` via `npx skills`).

### Tone of voice
- Write like a good teacher: plain, specific, unhurried. Explain why something works, and skip hype.
- Describe mechanisms ("writes `MISSION.md`", "unlocks after review") rather than outcomes ("master anything").
- Don't claim speed or results ("10x", "learn faster") or social proof the project doesn't have. Cite the research the README already cites.
- Use second person and short sentences. Use one metaphor at most per paragraph, and say what is real and what is illustrative.
- Use the vocabulary the code uses: lesson, mission, milestone, challenge, evidence, learning record.

### Visual identity direction
- **Type:** serif body and headings in the starter's book faces (Iowan Old Style / Palatino stack). Monospace for
  commands and file names. System sans only for small UI labels.
- **Colour:** warm paper `#fbfaf7`, ink `#1d1c1a`, and one rust accent `#9a3b1b` (dark mode `#e08a62`), taken from
  `starter/assets/style.css`. Motion and dark surfaces use the scene palette: night `#0e1116`, with gold `#f5c451` as the
  single signal colour ("this is the thing to look at").
- **Motif:** the hornbook paddle, a rounded rectangle with a short handle and one ruled lesson sheet inside, drawn
  as a thin-line glyph. The sheet doubles as a file or page, which ties the motif to "lessons are files". Use it once per surface.
- **Layout:** Tufte-like generous margins, side notes, hairline rules, no gradients or stock illustration.

### GitHub social preview (1280×640)
- The left 55% is a paper background. Top left has the small paddle glyph in rust, then "Hornbook" set large in
  the serif, then the line "Your coding agent, as a personal tutor." in muted ink, then a mono line:
  `npx skills add jpmmatias/skills --skill learn`.
- The right 45% is a night `#0e1116` scene panel. A terminal shows `/learn <topic>`, and below it a file tree
  appears: `MISSION.md`, `lessons/0001-….html`, `learning-records/0001-….md`, `index.html`. A gold marker sits
  beside one milestone labelled "mastered — evidence reviewed".
- No logos of other products, no metrics, no learner photos. Text stays inside the centre 1200×600 safe area.

### README first screen (draft)
```
# Hornbook
Turn your AI coding agent into a personal tutor that builds a course in your own folder.

- **A course you keep**: a mission, short HTML lessons, cheat sheets and learning records, as plain files that open from disk.
- **Explanations you can watch**: step-through diagrams, narrated motion scenes, quizzes and hands-on challenges.
- **Mastery you earn**: milestones unlock only after the agent reviews your own work against pass criteria.
```
(Keep the existing GIF directly below it; it is the strongest proof on the page.)

### Launch message (Show HN style)
**Title:** Show HN: Hornbook – agent skills that turn your coding agent into a tutor that writes a course to disk

**Description:** Hornbook is a set of MIT-licensed agent skills (`SKILL.md`) for Claude Code and other agents that
support the format. Run `/learn <topic>` in an empty folder. It asks why you're learning, writes a `MISSION.md`, then
produces short static-HTML lessons with diagrams, narrated motion scenes, quizzes and a challenge per lesson. Progress
lives in your folder, and a milestone counts as mastered only after the agent reviews your work against written
pass criteria.

### Distribution (verified to exist on 2026-11-24; contribution rules not read)
- **skills.sh / `npx skills`**: npm `skills` 1.9.0, "The open agent skills ecosystem", homepage
  github.com/vercel-labs/skills. The README already documents installation through it. The skills.sh site itself was not reachable from here.
- **Claude Code plugin marketplace**: the repo already ships `.claude-plugin/marketplace.json` (marketplace
  `jpmmatias`, plugins `learn`, `lesson-panel`, `curriculum-planner`, `source-researcher`, …). The Anthropic-managed directory
  `anthropics/claude-plugins-official` exists (48,123★). Its submission process could not be read (403), so check it before applying.
- **GitHub topics** (repo currently has no description, no topics, 0★). Suggested topics with observed repo counts:
  `claude-code` (128,700), `agent-skills` (47,568), `claude-skills` (17,757), `claude-code-plugin` (17,530),
  `skills-sh` (1,327), `spaced-repetition` (3,945), `learning-tools` (316), plus `education`, `tutor`.
  Add a one-line repo description and a homepage.
- **Awesome lists** (all exist and were pushed in 2026): ComposioHQ/awesome-claude-skills (80,249★),
  hesreallyhim/awesome-claude-code (58,738★), VoltAgent/awesome-agent-skills (37,518★), travisvn/awesome-claude-skills
  (15,930★), BehiSecc/awesome-claude-skills (10,481★), heilcheng/awesome-agent-skills (6,434★),
  composio-community/awesome-claude-plugins (2,009★), ccplugins/awesome-claude-code-plugins (1,017★);
  quemsah/awesome-claude-plugins (1,667★) is an *automated* index. Read each CONTRIBUTING file before opening a PR.
- **Category context (judgment):** "AI tutor skill for Claude Code" is already a busy niche. A GitHub search for
  `claude code tutor learning skill` returned 31 repos, e.g. Li-Evan/BloomTutor 333★, hluaguo/learn-faster-kit 411★
  ("AI-powered learning coach with spaced repetition with Claude Code"), smashburger-dev/socratic-workshop 24★,
  LilZeeCN/zee-tutor 8★, AnjanJ/bodhikit 2★. Lead with what those don't show, namely the persistent course folder, the motion
  scenes (show the GIF) and evidence-gated mastery, rather than "AI tutor".

## Summary
- LearnKit: significant conflict (four learning products use it, two in AI/personal study; npm/Obsidian IDs taken; a 2019 LEARNKIT education mark of uncertain status).
- Recommended: **Hornbook**. Fallback: **Learnwright**. Others: Proofpiece, Learnstead, Coursewright.
- Owner approval required; run TSDR/WIPO and registrar checks before adopting any name.
