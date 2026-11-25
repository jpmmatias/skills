# Compatibility

Where Learncraft runs, and how sure we are. Every row names its evidence level and its source. A level is never upgraded without a new check, and "files land where the agent reads them" is not the same as "it works".

**Levels**

- **Verified by us**: we ran it and saw the result. The date and the run are named.
- **Documented by vendor**: the agent's own documentation says it reads skills from that place. "Indirect" means the vendor page was blocked from our network and was read through a search summary or the vendor's source code.
- **Unknown**: nobody has checked.

Last reviewed: 2026-11-25. Sources: [the DX and compatibility audit](audit/raw/12-dx-compat.md) (2026-11-24) and [workstream A's handoff](audit/handoffs/A.md) (2026-11-25).

## Agents

| Agent / surface | Where it reads skills | Install | Load `SKILL.md` + bundled files | Command | Native review subagents | Level | Source, date |
|---|---|---|---|---|---|---|---|
| **Claude Code, plugin** | `~/.claude/plugins/cache/jpmmatias/<plugin>/<version>/` | `claude plugin marketplace add jpmmatias/skills` + `claude plugin install learn@jpmmatias` | yes; `${CLAUDE_SKILL_DIR}` substitution seen working | `/learn:learn` | yes: `learn:lesson-author`, `-expert`, `-novice`, `-flow` load in a session | **Verified by us** for validation, install (local and GitHub), dependency install (`curriculum-planner` pulls in `learn`), skill and agent loading | `claude plugin validate --strict` and installs with Claude Code 2.1.331 (raw/12, 2026-11-24); session debug log "Total plugin agents loaded: 4" (handoff A, 2026-11-25) |
| **Claude Code, skills folder** | `~/.claude/skills/`, `.claude/skills/` | `npx skills add jpmmatias/skills --skill learn -g -a claude-code`, or a copy/symlink | yes | `/learn` | no native agents; the panel uses generic subagents with the role files | **Verified by us** for install and placement; runtime behaviour documented by vendor | skills CLI 1.9.0 (raw/12, 2026-11-24) |
| **OpenAI Codex CLI** | `.agents/skills` (cwd up to repo root), `~/.agents/skills` | `npx skills add … -a codex` | yes, per vendor docs | `/skills`, `$learn` | unknown | **Documented by vendor** (indirect, plus Codex source). Placement verified by us | developers.openai.com/codex/skills via search; `codex-rs/skills` source via Context7 (raw/12, 2026-11-24) |
| **Cursor** | `.agents/skills`, `.cursor/skills`, `.claude/skills`, `~/.claude/skills` | `npx skills add … -a cursor` | yes, per vendor docs | unknown | unknown | **Documented by vendor** (indirect). Placement verified by us | cursor.com/docs/context/skills via search (raw/12, 2026-11-24) |
| **GitHub Copilot** (CLI, cloud agent, VS Code agent mode) | `.github/skills`, `.claude/skills`, `.agents/skills`, `~/.copilot/skills`, `~/.agents/skills` | `npx skills add … -a github-copilot` | yes, per vendor docs | unknown | unknown | **Documented by vendor** (indirect). Placement verified by us | docs.github.com "About agent skills" via search (raw/12, 2026-11-24) |
| **Gemini CLI** | `~/.gemini/skills` or `~/.agents/skills`; `.gemini/skills` or `.agents/skills` | `npx skills add … -a gemini-cli` | yes; the skill folder is added to allowed paths after consent | `activate_skill` (by the model), `/skills list` | unknown | **Documented by vendor** (docs read directly). Placement verified by us | gemini-cli `docs/cli/skills.md` (raw/12, 2026-11-24) |
| **OpenCode** | v1 docs: `.opencode/skills`, `.claude/skills`, `.agents/skills`, `~/.claude/skills`, `~/.agents/skills`; v2 docs list `.opencode/skills` | `npx skills add … -a opencode` | yes, per v1 docs | unknown | unknown | **Documented by vendor** (indirect, v1). v2: **unknown** | opencode.ai/docs/skills via search (raw/12, 2026-11-24) |
| **claude.ai uploads / Skills API** | upload | — | **rejected as-is**: `argument-hint` in the frontmatter is a hard error there | — | — | **Documented by vendor: incompatible as-is.** Removing `argument-hint` from your copy should get past that error; nothing beyond it was checked | Claude Code skills docs (raw/12, 2026-11-24); `node scripts/validate.mjs --portable` reports the 5 keys |

**What "placement verified by us" means.** `npx skills add … -a claude-code codex cursor github-copilot gemini-cli opencode` (skills CLI 1.9.0) put the canonical copy in `~/.agents/skills/<name>` and a symlink in `~/.claude/skills/<name>`. That is where the vendor docs say each agent reads skills. **No agent other than Claude Code has been run with Learncraft**, so for them we know the files are in the right place and nothing more.

**Not verified anywhere:** a full course built end to end and graded (no model session was scored), Windows, and the multi-agent review panel outside Claude Code.

## Features and what they need

Learncraft degrades when something is missing and says so; it never pretends. The rules are in [failure-handling.md](../skills/learn/references/failure-handling.md).

| Feature | Needs | Without it |
|---|---|---|
| Quick Learn, Practice, chat Review | any agent that loads `SKILL.md` | — |
| Sources with verified links | a web fetch tool and network access | the offline policy applies: no links from memory, sources marked `unverified` with a reason, Quick Learn says links were not verified |
| **Balanced** profile (default): independent expert and novice review | subagents (Claude Code: native `learn:lesson-*` agents when installed as a plugin, generic subagents otherwise) | runs as Fast; verdicts are stamped `independence: self` and you are told the review was not independent |
| **Deep** profile: plus a flow reviewer and a subagent author, up to 3 rounds | subagents | same as above |
| Lesson check (`check.mjs`): JS errors, phone overflow, accessibility scan, screenshots | Node ≥ 20 and Playwright with Chromium, installed once in `~/.cache/learncraft/tools` (axe-core optional) | the agent runs the data lint only and must not call the lesson "verified" |
| Courses (dashboard, lessons, practice, `review.html`) | a web browser opening local files | — |
| Reading your practice evidence | you export it from the dashboard into `progress/`; Node helps the agent derive what is due | the agent says it cannot see browser practice and offers a chat review |
| `npx skills` installer | Node ≥ 22.20 (skills CLI requirement) | install as a Claude Code plugin, or copy the folder |

### Browsers

The course runtime and its Content-Security-Policy were tested in **Chromium only** (Playwright 1.63, Chromium 1243, file:// pages; handoffs [C1](audit/handoffs/C1.md) and [C2](audit/handoffs/C2.md)). Firefox and Safari behaviour on `file://` (CSP `'self'`, `localStorage`) is **unknown**.

Practice progress lives in the browser you used (per-browser `localStorage`) until you export it. A private window, another browser or cleared site data starts empty; the files in the course folder are never affected.

## Re-checking

Hosts that were blocked during the audit and would be needed to confirm the indirect rows: agentskills.io, developers.openai.com, cursor.com, docs.github.com, opencode.ai. If you run Learncraft in one of these agents, an issue with the agent, its version, the install method and what happened is the fastest way to move a row from "documented" to "verified".
