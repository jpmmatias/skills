# Installing Learncraft

Learncraft is a set of agent skills. The main one is `learn`; four optional pipeline skills split course production into roles. Pick **one** install method. Two installs of the same skill (for example the plugin and a copy in `~/.claude/skills/`) show up as two separate skills.

Which agents can load it, and how sure we are: [compatibility.md](../compatibility.md).

## Claude Code plugin

This repository is a Claude Code plugin marketplace called `jpmmatias`. Inside Claude Code:

```
/plugin marketplace add jpmmatias/skills
/plugin install learn@jpmmatias
```

Or from your shell:

```bash
claude plugin marketplace add jpmmatias/skills
claude plugin install learn@jpmmatias
```

- Plugin skills are namespaced: the command is **`/learn:learn <topic>`**.
- The `learn` plugin also ships four review subagents (`learn:lesson-author`, `learn:lesson-expert`, `learn:lesson-novice`, `learn:lesson-flow`). The default Balanced profile uses the expert and the novice.
- Uninstall: `claude plugin uninstall learn@jpmmatias`.

### Optional pipeline plugins

Each one depends on `learn` and installs it if it is missing (verified with `curriculum-planner`):

```
/plugin install curriculum-planner@jpmmatias
/plugin install source-researcher@jpmmatias
/plugin install lesson-panel@jpmmatias
/plugin install challenge-reviewer@jpmmatias
```

| Plugin | What it does on its own |
|---|---|
| `curriculum-planner` | turns `MISSION.md` and the diagnostic into milestones, lessons and objectives in `assets/course.js` |
| `source-researcher` | fills `RESOURCES.md` for the next lesson with fetched, tiered and dated sources |
| `lesson-panel` | writes the next lesson and has it reviewed by independent expert, novice and course-flow subagents in capped rounds |
| `challenge-reviewer` | grades challenge work against its pass criteria, writes the learning record, masters a milestone only when every criterion is met |

`learn` already runs all of these steps itself. The pipeline plugins are for running one step on its own.

## skills.sh (`npx skills`)

Needs Node.js 22.20 or later (a requirement of the `skills` CLI).

```bash
npx skills add jpmmatias/skills --skill learn -g -a claude-code
```

- `-g` installs for your user; leave it out to install into the current project only.
- `-a claude-code` targets Claude Code. `-a codex`, `-a cursor`, `-a github-copilot`, `-a gemini-cli`, `-a opencode` or `-a '*'` target other agents. Those land in `~/.agents/skills/learn`, with a symlink in `~/.claude/skills/learn` when Claude Code is also selected.
- Installed this way the command is **`/learn`** in Claude Code, and the panel uses generic subagents with the role files instead of the native ones.
- The pipeline skills need `learn` next to them. Install them together:

  ```bash
  npx skills add jpmmatias/skills --skill learn --skill curriculum-planner --skill source-researcher \
    --skill lesson-panel --skill challenge-reviewer -g -a claude-code
  ```

- See what is available: `npx skills add jpmmatias/skills --list`.
- The CLI sends anonymous install telemetry to skills.sh. Set `DISABLE_TELEMETRY=1` to opt out.

## Manual copy

```bash
git clone https://github.com/jpmmatias/skills.git
mkdir -p ~/.claude/skills
cp -R skills/skills/learn ~/.claude/skills/
```

`skills/skills/learn` is right: the clone folder is `skills/` and the repository keeps its skills in `skills/`. Copy any pipeline skill the same way, next to `learn`.

## Symlink (to edit the skill)

```bash
git clone https://github.com/jpmmatias/skills.git ~/code/skills
mkdir -p ~/.claude/skills
ln -s ~/code/skills/skills/learn ~/.claude/skills/learn
```

Changes take effect in the next session, and `git pull` updates it. To try the whole plugin from a checkout instead: `claude plugin marketplace add ~/code/skills` and `claude plugin install learn@jpmmatias`.

## Optional: the lesson check

Before handing over a lesson, the agent can open it in a headless browser and look for JS errors, phone-width overflow, accessibility problems and missing practice, and save screenshots it then reads. That needs Playwright with Chromium, installed once per machine into a folder that survives skill updates:

```bash
npm install --prefix ~/.cache/learncraft/tools playwright@1.63.0 axe-core@4.10.2
npx --prefix ~/.cache/learncraft/tools playwright install chromium
```

`axe-core` is optional (without it the accessibility scan is skipped, and the check says so). Set `LEARNCRAFT_TOOLS_DIR` to use another folder. The agent asks before installing; without the tools it runs a data lint only and does not call the lesson "verified".

## Optional: your own default theme

```bash
mkdir -p ~/.config/learn
cp /path/to/your-theme.css ~/.config/learn/theme.css
```

Or ask "make my courses look like my site". The format is in [THEME-FORMAT.md](../../skills/learn/THEME-FORMAT.md); [`themes/joaopdmatias.css`](../../skills/learn/themes/joaopdmatias.css) is a worked example.

## Check the install

- Start a **new** session after installing.
- Claude Code: `/skills` lists `learn`; `claude plugin list` shows plugin installs.
- Where the files are, by method:

| Method | Skill folder |
|---|---|
| Plugin | `~/.claude/plugins/cache/jpmmatias/learn/<version>/skills/learn` |
| skills.sh, Claude Code only | `~/.claude/skills/learn` (a copy) |
| skills.sh, other agents | `~/.agents/skills/learn` (plus a symlink in `~/.claude/skills/learn` if Claude Code was selected) |
| Project install (no `-g`) | `.claude/skills/learn` or `.agents/skills/learn` in the project |
| Manual copy / symlink | `~/.claude/skills/learn` |

Updating: [upgrading.md](upgrading.md).
