# 12 · Developer experience, distribution and compatibility

Agent 12 (DX & release engineering). Audit date: 2026-11-24. Repo state: commit `f8aaf97` (HEAD), no tags, no `.github/`.
Nothing in the repo was changed except this file. Test installs ran in throwaway `CLAUDE_CONFIG_DIR` / `HOME` folders in the session scratchpad.

## What we ran (verified-by-us)

| Check | Tool / version | Result |
|---|---|---|
| `claude plugin validate .` and `--strict` | Claude Code 2.1.331 | **Validation passed**, exit 0, no warnings. "Advice": README has no install line for 4 of the 5 plugins |
| `claude plugin marketplace add /home/user/skills` + `install learn@jpmmatias`, `lesson-panel@jpmmatias` | 2.1.331, isolated config | Installed. `plugin details learn` → `Skills (1) learn`, `Agents (0)` |
| `claude plugin marketplace add jpmmatias/skills` (GitHub) + `install challenge-reviewer@jpmmatias` | 2.1.331, isolated config | Installed as version `f8aaf973bd1e` (commit SHA) under `plugins/cache/jpmmatias/challenge-reviewer/f8aaf973bd1e/`. The cache copy holds the **whole repo** (README, media/, all 5 skills), 1.6 MB per plugin |
| `npx skills add /home/user/skills --list` | skills CLI 1.9.0 | All 5 skills discovered |
| `npx skills add … --skill learn --skill lesson-panel -g -a claude-code codex cursor github-copilot gemini-cli opencode -y` | 1.9.0, isolated HOME | Canonical copy in `~/.agents/skills/<name>` ("universal" for Codex, Cursor, Copilot, Gemini CLI, OpenCode); `~/.claude/skills/<name>` is a **symlink** to it. With only `-a claude-code` it **copies** into `~/.claude/skills/`. Works without a TTY and without `-y` |
| Frontmatter / links scan | node one-liner | All 5 `name`s match their folders; descriptions 302–569 chars (limit 1024); `learn/SKILL.md` 370 lines (<500); no broken relative links in any `.md` |
| `$schema` URL in marketplace.json | curl | `https://anthropic.com/claude-code/marketplace.schema.json` → **404**. `https://json.schemastore.org/claude-code-marketplace.json` → 200 |

Not verified by us: running any skill end-to-end in any agent (no model session was started), `${CLAUDE_SKILL_DIR}` substitution at runtime, Windows.

## Answers to the brief

**Manifest validity: valid.** `"source": "."` is documented: a relative path "must start with `./` … `"."` on its own means the root itself" (marketplace reference). Per-entry `skills` is valid and is exactly the documented pattern for root-sourced entries: "When a marketplace entry whose `source` is the marketplace root lists specific `skills` subdirectories, only those subdirectories load, and the plugin's default `skills/` directory isn't scanned" (manifest reference). **No `plugin.json` is needed**: "No `plugin.json`: the entry is the manifest, regardless of `strict`." `strict` therefore has no effect here; adding a root `plugin.json` later would *break* this layout (all five entries would share one manifest name). `version` is optional; without it the version is the commit SHA (verified).

**Namespacing:** `/<plugin>:<skill>`, so `/learn:learn`, `/lesson-panel:lesson-panel` (skills doc; README:120 is correct).

**Plugins can ship subagents:** yes, `agents/*.md` or an `agents` path list (files only, not directories), named `<plugin>:<name>`. Plugin agents support `name, description, model, effort, maxTurns, tools, disallowedTools, skills, memory, background, isolation, color…`; `permissionMode`, `hooks`, `mcpServers`, `initialPrompt` are ignored (components doc).

**How a skill finds its bundled files:**
- Claude Code substitutes `${CLAUDE_SKILL_DIR}` ("the directory containing the skill's SKILL.md") in the SKILL.md body for every skill type, and also in `allowed-tools`. `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` only in plugin skills. These are text substitutions; they are **not** env vars in the Bash tool ("The variables aren't present in the environment of commands Claude runs through the Bash tool").
- Agent Skills spec: "use relative paths from the skill root". Codex passes the `SKILL.md` path with an explicit skill selection; Gemini CLI injects "the SKILL.md body and folder structure" and adds the skill directory to allowed paths.
- So: write `${CLAUDE_SKILL_DIR}/starter/tools/check.mjs` and add one sentence for other agents ("the folder that holds this SKILL.md"). Never `~/.claude/skills/...`.

## Findings

### DX-01 · P1 · Hardcoded `~/.claude/skills/learn` path breaks every install except one
- **Evidence:** `skills/learn/SKILL.md:260-261`, `skills/learn/starter/tools/check.mjs:4-5`, `docs/GUIDE.md:197-198,217`, `README.md:153,162`.
- **Impact:** The path exists only for a user-level copy/symlink in Claude Code. Verified: a plugin install lives at `~/.claude/plugins/cache/jpmmatias/learn/<sha>/skills/learn`; `skills add -a codex` (or Cursor, Copilot, Gemini, OpenCode) lives at `~/.agents/skills/learn`; a project install at `.claude/skills/learn`. In all of those the agent runs a missing file, the lesson check silently does not happen, and the skill's own rule ("If the check can't run … say so") is all that stops a false "verified".
- **Recommendation:** In SKILL.md: `node "${CLAUDE_SKILL_DIR}/starter/tools/check.mjs" .` plus: "`${CLAUDE_SKILL_DIR}` is this skill's folder, the one that holds this SKILL.md. If it appears unexpanded, use that folder's absolute path." Docs: show both plugin and skills.sh locations, or tell humans "ask the agent to run the check".
- **Complexity:** S. **Risk:** low (Claude Code documents the variable; other agents fall back to the sentence).

### DX-02 · P1 · Playwright install lands in a directory that is replaced on update
- **Evidence:** `SKILL.md:260` / `check.mjs:4` install with `npm install --prefix <skill>/starter/tools`; `check.mjs:19` does a bare `import 'playwright'`; `.gitignore:2` ignores `package-lock.json`; `starter/tools/package.json` pins `^1.50.0`.
- **Impact:** Plugin: each commit is a new version directory (version = SHA, verified), so `node_modules` disappears after every update; old dirs are deleted 14 days later. Claude Code's automatic dependency install only runs for `package.json` + lockfile **at the plugin root** (loading doc), which is not the case. skills.sh: the install writes into the managed copy (`~/.agents/skills/learn`), which `skills update` rewrites; for project installs the extra files also change the folder hash `skills check` compares (inferred from the hash rules in the skills README, not tested). Bare ESM `import` ignores `NODE_PATH`, so pointing elsewhere needs code.
- **Recommendation:** Install the tools once into a stable user folder, e.g. `${LEARN_TOOLS_DIR:-${XDG_CACHE_HOME:-~/.cache}/learn-skill/tools}`, and make `check.mjs` resolve Playwright with `createRequire(join(toolsDir, 'package.json'))`, falling back to the script's own folder. Print the exact install command when it is missing. Commit a lockfile for `starter/tools` (remove `package-lock.json` from `.gitignore`).
- **Complexity:** M. **Risk:** low; keeps zero install for courses.

### DX-03 · P1 · The four pipeline skills depend on `learn` but nothing installs or declares it
- **Evidence:** `README.md:19-22` installs each pipeline skill alone; `lesson-panel/SKILL.md:7`, `curriculum-planner/SKILL.md:11,14,15`, `source-researcher/SKILL.md:9,16`, `challenge-reviewer/SKILL.md:7,18` read rules and `*-FORMAT.md` files "in the `learn` skill"; `.claude-plugin/marketplace.json` has no `dependencies`.
- **Impact:** `npx skills add … --skill curriculum-planner` gives a skill that points at files that are not on disk. As plugins, the files happen to exist (whole repo is cached per plugin) but the skill never says where (`../learn/`). Gemini CLI grants file access per *activated* skill directory, so cross-skill reads may need `learn` activated too (inference from Gemini docs).
- **Recommendation:** (a) Add `"dependencies": ["learn"]` to the four marketplace entries (bare names resolve in the same marketplace; manifest reference). (b) README: `npx skills add jpmmatias/skills --skill learn --skill curriculum-planner …`. (c) In each SKILL.md name the file location: "`RESOURCES-FORMAT.md` from the `learn` skill (installed next to this one: `../learn/RESOURCES-FORMAT.md`)". (d) Alternative: one plugin `learn` with all five skills (`/learn:learn`, `/learn:lesson-panel`, …) removes the dependency problem for Claude Code; skills.sh is unaffected.
- **Complexity:** S. **Risk:** low; `dependencies` needs a recent Claude Code but unknown keys are ignored by older ones (marketplace reference: unknown keys ignored).

### DX-04 · P2 · `./` means two different folders inside `learn/SKILL.md`
- **Evidence:** `SKILL.md:20-26` mixes `./MISSION-FORMAT.md` (skill folder) with `./reference/*.html`, `./learning-records/` (course workspace); `:181` `./assets/scene.js` (workspace) next to `./starter/examples/…` (skill); `:249`, `:270-272`.
- **Impact:** Agents resolve paths against their working directory. In Claude Code relative links in a skill are read from the skill folder, but in a shell command `./` is the workspace. Mis-resolution = reading a missing file or writing into the skill.
- **Recommendation:** Convention: workspace paths bare (`lessons/0001-x.html`); skill files as `${CLAUDE_SKILL_DIR}/MISSION-FORMAT.md` in commands and plain relative links (`[MISSION-FORMAT.md](MISSION-FORMAT.md)`) in prose. Enforce in `validate.mjs` (warn on `./` + workspace folder names).
- **Complexity:** S. **Risk:** low.

### DX-05 · P2 · `argument-hint` is rejected by claude.ai uploads and the Skills API
- **Evidence:** line 4 of every `SKILL.md`. Claude Code skills doc: "Outside Claude Code, such as claude.ai uploads and the Skills API, only `name`, `description`, `license`, `compatibility`, `metadata`, and `allowed-tools` are allowed. Other keys cause a hard error, for example: `Unexpected key(s) in SKILL.md frontmatter: argument-hint.`"
- **Impact:** Upload to claude.ai or the Skills API is refused. Codex's parser reads only `name`, `description`, `metadata.short-description` (source via Context7) and tolerates other keys; others: not documented.
- **Recommendation:** Keep `argument-hint` (useful in Claude Code), state "claude.ai / API: not supported as-is" in the README compat table, and offer `validate.mjs --portable` that fails on non-spec keys if that target is ever wanted. Optionally add `compatibility:` (spec field, ≤500 chars) naming Node/Playwright for the check.
- **Complexity:** S. **Risk:** none.

### DX-06 · P2 · Manual and symlink install commands fail on a fresh machine
- **Evidence:** `README.md:125-126,134-135`, `GUIDE.md:141-142`.
- **Impact:** `skills/skills/learn` is **correct** after `git clone` (clone dir `skills/` + repo dir `skills/`). But `cp -r … ~/.claude/skills/learn` and `ln -s … ~/.claude/skills/learn` fail with "No such file or directory" when `~/.claude/skills` does not exist, and if `~/.claude/skills/learn` already exists `cp -r` nests a second `learn/learn/`. `GUIDE.md:217` tells plugin and skills.sh users to look for `~/.claude/skills/learn/SKILL.md`, which is wrong for them.
- **Recommendation:** `mkdir -p ~/.claude/skills && cp -R skills/skills/learn ~/.claude/skills/` (and the same `mkdir -p` before `ln -s`). Troubleshooting: list the three locations, or "run `/skills` / `claude plugin list`".
- **Complexity:** S. **Risk:** none.

### DX-07 · P2 · Plugin update story is undocumented and every commit is a release
- **Evidence:** `README.md:120` "Updates arrive through `/plugin`"; marketplace has no `version`; verified version = commit SHA.
- **Impact:** Third-party marketplaces have auto-update **off** by default (loading doc), so users stay on their install commit unless they act. When they do update, any commit (a README typo) is a new version of all five plugins, each re-copying 1.6 MB including `media/`.
- **Recommendation:** Document `claude plugin marketplace update jpmmatias` + `claude plugin update learn@jpmmatias`, or turning on auto-update under `/plugin` → Marketplaces. Start tagging releases (`v1.0.0`); users can pin with `claude plugin marketplace add jpmmatias/skills@v1.0.0` and `npx skills add jpmmatias/skills@v1.0.0` (both documented). Keep SHA versioning (no `version` field) until there is a release habit: a pinned `version` that is not bumped freezes users.
- **Complexity:** S. **Risk:** low.

### DX-08 · P2 · No CI, no validator, no tests
- **Evidence:** no `.github/`, no `package.json` at root, no `tests/`.
- **Impact:** Nothing catches a broken link, a renamed folder that no longer matches `name`, a marketplace path typo (validate passes on a missing relative path; install fails), or a JS error in `starter/assets`.
- **Recommendation:** `scripts/validate.mjs` + workflow below. **Complexity:** M. **Risk:** none.

### DX-09 · P3 · `$schema` URL is a 404
- **Evidence:** `.claude-plugin/marketplace.json:2`. **Impact:** no editor completion; ignored at load time. **Recommendation:** `https://json.schemastore.org/claude-code-marketplace.json` (200, knows `skills`, `strict`, `dependencies`). **Complexity:** XS. **Risk:** none.

### DX-10 · P3 · Missing project hygiene files
- **Evidence:** only `LICENSE`, `README.md`, `.gitignore` at root; `git tag` is empty.
- **Recommendation:** `CHANGELOG.md` (Keep a Changelog), `CONTRIBUTING.md` (how to test a change: symlink install, `node scripts/validate.mjs`, run `check.mjs` on a fixture), `SECURITY.md` (skills run with full agent permissions; how to report), `.github/ISSUE_TEMPLATE/{bug,skill-behaviour}.yml` asking agent + version + install method, `.github/pull_request_template.md` with the release checklist items. **Complexity:** S. **Risk:** none.

### DX-11 · P3 · README gaps found by tools
- **Evidence:** validator advice (above); skills README "Requires Node.js 22.20 or later"; `README.md:17-23,84-92`.
- **Recommendation:** add `/plugin install <name>@jpmmatias` lines for the 4 pipeline plugins; state the Node ≥ 22.20 requirement for `npx skills`; mention `-a codex`/`-a '*'` lands in `~/.agents/skills`. **Complexity:** XS.

### DX-12 · P3 · lesson-panel roles could be native Claude Code subagents
- **Evidence:** `skills/lesson-panel/agents/*.md` have no frontmatter; `SKILL.md:9` tells the agent to "read the role, then do that role".
- **Impact:** In Claude Code the three reviewers could run in isolated contexts with read-only-ish tools, which is the point of an independent review. Codex treats a skill's `agents/` folder as its metadata folder (`agents/openai.yaml`, Codex loader source); `.md` files there are not read, so no clash today, but the name is overloaded.
- **Recommendation:** Add frontmatter (`name`, `description`, `tools`, optional `skills: [learn:learn]`) to each role, list them in the `lesson-panel` entry: `"agents": ["./skills/lesson-panel/agents/author.md", …]` → `lesson-panel:expert` etc. Keep the "read the role" fallback for non-Claude agents; frontmatter is harmless when read as text. Consider renaming the folder to `roles/` to stay clear of Codex's `agents/`. **Complexity:** M. **Risk:** medium (behaviour change; validate with one real panel run).

### DX-13 · P3 · Docs say `/learn`; plugin users must type `/learn:learn`
- **Evidence:** `learn/SKILL.md:9` ("invokes `/learn`"), `README.md:46,144`, `GUIDE.md:114`. **Recommendation:** "`/learn` (or `/learn:learn` as a plugin)" in user docs; in SKILL.md say "invokes this skill". **Complexity:** XS.

### DX-14 · P3 · Windows paths
- **Evidence:** `check.mjs` browser fallbacks cover Linux/macOS dirs only; docs use `~` and `cp`/`ln`. **Impact:** `~` is not expanded for native commands in cmd and not reliably in PowerShell. **Recommendation:** document PowerShell equivalents or "ask the agent"; add `chrome-win` to fallbacks. Unknown whether Windows matters to users; low priority.

## Compatibility matrix

Levels: **verified-by-us** (we ran it), **documented-by-vendor**, **community-reported**, **unknown**. "Indirect" = vendor page found by search, host blocked here, content read through the search summary or vendor source code.

| Agent | Where it reads skills | Load `SKILL.md` + bundled files | `argument-hint` | Slash/explicit call | Parallel role agents (lesson-panel) | Level |
|---|---|---|---|---|---|---|
| Claude Code (skills dir) | `~/.claude/skills`, `.claude/skills` | yes, `${CLAUDE_SKILL_DIR}` | used | `/learn` | yes (subagents) | **verified-by-us** for install + load; runtime documented-by-vendor |
| Claude Code (plugin) | `~/.claude/plugins/cache/jpmmatias/<plugin>/<sha>/` | yes, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}` | used | `/learn:learn` | yes; plugin `agents` possible | **verified-by-us** (validate, local + GitHub install) |
| claude.ai upload / Skills API | upload | — | **rejected (hard error)** | — | — | documented-by-vendor: **incompatible as-is** |
| OpenAI Codex CLI | `.agents/skills` (cwd → repo root), `~/.agents/skills` | yes; skill path passed on explicit use | ignored (parser reads name, description, metadata.short-description) | `/skills`, `$learn` | unknown | documented-by-vendor (indirect) + Codex source; skills.sh placement verified-by-us |
| Cursor | `.agents/skills`, `.cursor/skills`, also `.claude/skills`, `~/.claude/skills` | yes | unknown | unknown | unknown | documented-by-vendor (indirect); placement verified-by-us |
| GitHub Copilot (CLI, cloud agent, VS Code agent mode) | `.github/skills`, `.claude/skills`, `.agents/skills`; `~/.copilot/skills`, `~/.agents/skills` | yes | unknown | unknown | unknown | documented-by-vendor (indirect); placement verified-by-us |
| Gemini CLI | `~/.gemini/skills` or `~/.agents/skills`; `.gemini/skills` or `.agents/skills` | yes; skill dir added to allowed paths after consent | unknown | `activate_skill` (model), `/skills list` | unknown | documented-by-vendor (raw docs fetched); placement verified-by-us |
| OpenCode | v1 docs: `.opencode/skills`, `.claude/skills`, `.agents/skills`, `~/.claude/skills`, `~/.agents/skills`; v2 docs: `.opencode/skills` (others unconfirmed) | yes | unknown | unknown | unknown | documented-by-vendor (indirect, v1); v2 unknown |

Feature support claimed by the skills CLI's own table (`docs/agents.md`): `allowed-tools` yes for all six listed here, `context: fork` Claude Code only. That is community-reported for agents other than Claude Code. **No agent other than Claude Code is "works"**: we only verified that files land where the vendor docs say the agent reads them. The Playwright check and the multi-agent panel are unknown outside Claude Code.

## Proposal A · `scripts/validate.mjs` (zero dependencies, Node ≥ 20)

`node scripts/validate.mjs [--portable] [--json]`; exit 1 on any error, warnings never fail unless `--strict`.

1. **JSON:** every `*.json` parses (`marketplace.json`, `starter/tools/package.json`).
2. **Frontmatter** (tiny parser: `---` block, `key: value`, quoted strings, one-level maps): each `skills/*/SKILL.md` has `name` and `description`; `name` matches `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤64 chars, equals the folder name; `description` 1–1024 chars (spec) and warn >1536 incl. `when_to_use` (Claude listing cap); `compatibility` ≤500. Known keys = spec ∪ Claude Code list; unknown → warning. `--portable`: non-spec keys (e.g. `argument-hint`) → error.
3. **Size:** `SKILL.md` ≤ 500 lines (warn).
4. **Marketplace:** required `name`, `owner.name`, `plugins[]`; unique entry names; `source` is `"."` or starts with `./`, no `..`; each `skills[]` path exists and holds `SKILL.md`; each `agents[]` path is an existing `.md`; every `skills/*` folder is listed by some entry (warn); each `dependencies[]` names an entry; `$schema` is the SchemaStore URL (warn).
5. **Links:** every relative Markdown link and `src=`/`href=` in `.md` resolves to a file; `#anchors` into `.md` match a heading slug (GitHub slugger rules).
6. **Paths:** no `~/.claude/`, `$HOME/.claude`, `/Users/`, `/home/` inside `skills/**` (error); allowlist `~/.config/learn/` by rule; warn on `./(lessons|reference|assets|learning-records|labs)/` next to skill-file links (DX-04).
7. **Cross-skill refs:** a `SKILL.md` that mentions "the `learn` skill" must belong to an entry with `dependencies` containing `learn`.
8. **Docs sync:** every skill folder appears in README's install section (`--skill <name>` and `<name>@jpmmatias`).
9. **Starter JS:** `node --check` every `starter/**/*.js|mjs` (syntax only).

Unit tests: `tests/validate.test.mjs` with `node:test`, fixtures under `tests/fixtures/{good,bad-*}` (one fixture per rule).

## Proposal B · `.github/workflows/ci.yml`

```yaml
name: ci
on: { push: { branches: [main] }, pull_request: {} }
permissions: { contents: read }
jobs:
  validate:
    runs-on: ubuntu-latest
    strategy: { matrix: { node: [20, 22] } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ matrix.node }}" }
      - run: node scripts/validate.mjs --strict
      - run: node --test tests/
  install-smoke:            # Node >= 22.20 is required by the skills CLI
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npx -y skills@1.9.0 add "$PWD" --list
        env: { DISABLE_TELEMETRY: "1" }
      # Optional, pin the version you tested; check the package name first:
      # - run: npx -y @anthropic-ai/claude-code@<x.y.z> plugin validate . --strict
  check-smoke:              # optional, runs the lesson checker on a fixture course
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci --prefix skills/learn/starter/tools   # needs the committed lockfile (DX-02)
      - run: npx --prefix skills/learn/starter/tools playwright install --with-deps chromium
      - run: node skills/learn/starter/tools/check.mjs tests/fixtures/course
```

`tests/fixtures/course` does not exist yet: a two-lesson course built from `starter/assets` (one scene, one quiz).

## Proposal C · Versioning and release checklist

- One repo version, SemVer, git tags `vX.Y.Z`, `CHANGELOG.md`. Keep plugin versions SHA-derived (no `version` field) until releases are routine; then set `version` on all five entries in the same commit as the tag.
- **Major:** a skill renamed or removed, a plugin entry renamed (add `renames` in marketplace.json), workspace format change that old courses can't read (`course.js` shape, `*-FORMAT.md` required fields). **Minor:** new skill, new optional format field, new starter component. **Patch:** wording, fixes, docs.
- Checklist: `node scripts/validate.mjs --strict` green → `claude plugin validate . --strict` → fresh install via plugin and via `npx skills add jpmmatias/skills@<branch>` in a clean HOME → run `check.mjs` on the fixture course → one real lesson in Claude Code → CHANGELOG entry with "Upgrade notes" → tag → GitHub release with the CHANGELOG section.

## Proposal D · `docs/UPGRADING.md` outline

1. Find your install: plugin (`claude plugin list`), skills.sh (`npx skills list -g`), copy, symlink. Two installs = two skills.
2. Update per method: `claude plugin marketplace update jpmmatias` + `claude plugin update <name>@jpmmatias` (or auto-update toggle); `npx skills update -g`; `git pull` (symlink); re-copy.
3. Pin a version: `@vX.Y.Z` for both CLIs.
4. Existing courses: what each release changes in `assets/` and how to refresh a course's copy of `starter/assets` without losing `course.js` and `theme.css`.
5. Lesson checker: where Playwright is installed (stable tools folder, DX-02) and how to reinstall.
6. Per-version notes (from CHANGELOG "Upgrade notes"), newest first.
7. Moving between install methods (plugin ↔ skills.sh) and the `/learn` vs `/learn:learn` name.

## Sources (read 2026-11-24)

- Claude Code, Create a marketplace: https://code.claude.com/docs/en/plugin-marketplaces
- Claude Code, Plugin manifest reference: https://code.claude.com/docs/en/plugins-reference (→ manifest-reference)
- Claude Code, Marketplace reference: https://code.claude.com/docs/en/plugins/marketplace-reference.md
- Claude Code, Plugin components (agents, path variables): https://code.claude.com/docs/en/plugins/components.md
- Claude Code, Plugin loading (cache, versions, auto-update, deps): https://code.claude.com/docs/en/plugins/loading.md
- Claude Code, Skills (frontmatter, substitutions, Agent Skills, outside-Claude-Code keys): https://code.claude.com/docs/en/skills
- Agent Skills spec: https://raw.githubusercontent.com/agentskills/agentskills/main/docs/specification.mdx (agentskills.io blocked by this session's network)
- skills CLI: https://raw.githubusercontent.com/vercel-labs/skills/main/README.md and `docs/{agents,commands,creating-skills}.md` in the same repo; CLI 1.9.0 run locally
- SchemaStore: https://json.schemastore.org/claude-code-marketplace.json
- Gemini CLI: https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/skills.md
- Codex: https://developers.openai.com/codex/skills (via web search; host blocked) and `codex-rs/skills/src/parser.rs`, `codex-rs/ext/skills/src/loader/mod.rs` (via Context7 `/openai/codex`)
- Cursor: https://cursor.com/docs/context/skills (via web search; host blocked)
- GitHub Copilot: https://docs.github.com/en/copilot/concepts/agents/about-agent-skills (via web search; host blocked)
- OpenCode: https://opencode.ai/docs/skills and https://opencode.ai/v1/docs/skills (via web search; host blocked)

Blocked hosts that a re-check would need allowed: agentskills.io, developers.openai.com, cursor.com, docs.github.com, opencode.ai.
