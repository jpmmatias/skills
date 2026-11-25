# Handoff — Workstream A (skill architecture, pedagogy, grounding)

**Agent:** Workstream A (roles 02 AI architecture, 03 pedagogy, 04 grounding)
**Task:** Split `learn` into a router + workflows + references (Learncraft), one next-lesson rule, one challenge procedure, profiles, handoff contracts, failure handling, grounding and injection rules, mastery model, native subagents, pipeline wrappers with a `learn` dependency, corrected citations, marketplace update.
**Status:** done. Not committed (orchestrator commits).

## Files inspected

`docs/audit/{IMPLEMENTATION-PLAN,DECISIONS,FINDINGS,BASELINE}.md`; `docs/audit/raw/{02,03,04,12}*.md`; every file under `skills/` except starter code (starter headers, `templates/lesson.html`, `templates/0001.practice.js`, `tools/lint-workspace.mjs`, `assets/{viz,diagram,store,progress}.js` headers read to align the docs); `.claude-plugin/marketplace.json`; `schemas/*.schema.json` (D); `scripts/validate.mjs` (E, run only); `README.md`, `docs/GUIDE.md` (read only, for broken references).

## Files modified / created

Modified:
- `skills/learn/SKILL.md` (router, 80 lines)
- `skills/learn/{LEARNING-RECORD,RESOURCES,MISSION,THEME}-FORMAT.md` (`GLOSSARY-FORMAT.md` unchanged)
- `skills/{curriculum-planner,source-researcher,lesson-panel,challenge-reviewer}/SKILL.md` (16–18-line wrappers)
- `skills/lesson-panel/agents/{author,expert,novice,flow}.md` (structured verdict output)
- `.claude-plugin/marketplace.json`

Created:
- `skills/learn/workflows/`: `explain`, `deep-learn`, `new-course`, `plan-course`, `continue-course`, `research-sources`, `write-lesson`, `review-panel`, `review-challenge`, `practice`, `review`, `repository-learning` (12)
- `skills/learn/references/`: `teaching-core`, `pedagogy`, `mastery`, `visual-design`, `motion`, `gamification`, `labs`, `lesson-contract`, `components`, `grounding`, `handoff-contracts`, `failure-handling`, `profiles` (13)
- `subagents/lesson-{author,expert,novice,flow}.md` (native subagents; generated from the role files)
- `docs/audit/handoffs/A.md` (this file)

## Findings addressed

F-04 (id rules, A part), F-06 (wording rules: practice is never "mastery"), F-07 (agent reads `progress/*.json` exports), F-09 (diagnostic; record kinds), F-10 (native subagents; never self-play reviewers), F-11 (rounds, caps, sha, structured verdicts, escalation), F-12 (one next-step rule), F-13 (one challenge procedure), F-14 (Requires preflight + marketplace `dependencies`), F-15 (offline policy), F-16 (prompt-injection rules), F-17 (claims ledger + `data-src`, A part), F-18 (`${CLAUDE_SKILL_DIR}`, `~/.cache/learncraft/tools`, A part), F-19 (router + profiles + budgets), F-22 (rules in gamification; C1 renders), F-23 (Deci link), F-24 (claims softened), F-26 (tiers, statuses, versions, disputed; one RESOURCES schema), F-33 (THEME-FORMAT: self-host fonts, CSP), F-35 (LR frontmatter, A part), F-37 (`./` removed; workspace vs skill paths), F-38 (Quick Learn retrieval questions; interleaving rule; cold checks), F-39 (intent-first routing; ≤ 4 questions; never write into the skill). Also AI-10, AI-13, AI-14, AI-15, AI-17, AI-18, PED-10, PED-11, PED-14–18, PED-21, GR-09, GR-10, GR-14, GR-15, DX-04, DX-05 (documented), DX-09, DX-12.

## Decisions

1. **Native agents live in `subagents/`, not `agents/`, and are listed only on the `learn` entry.** Measured: with five root-sourced plugin entries, a plugin-root `agents/` folder is auto-scanned by **every** entry (`plugin details` showed the probe agent in `learn` and `curriculum-planner`), and an explicit `agents` list (even `[]`) does not suppress the scan. A non-default folder listed via `agents` loads only where listed (debug log: "Loaded agent from plugin learn custom file"). Names: `learn:lesson-author|expert|novice|flow`. They ship with `learn` because Balanced (the default, run from `learn`) needs expert and novice.
2. **Role files stay the source of truth;** native agents = frontmatter + one line + the role file verbatim (sync check: native body ends with the role file). Generator kept in the session scratchpad; E may add the sync check to `validate.mjs`.
3. **Reviewers echo `content_sha256` from the task message;** the orchestrator re-hashes the lesson files after collecting reviews and discards the round if they changed (novice/expert have no Bash to hash).
4. **Panel fallback order:** native subagent → generic subagent with the role file as prompt → Fast with `independence: self` (also when `lesson-panel` is not installed). Never self-play reviewers.
5. **Prerequisites (`requires`) live in the `NOTES.md` per-lesson line,** not in `course.js`, because course.js v2 (§5) has no `requires` field.
6. **Challenge kinds:** `#challenge[data-kind="lesson|milestone"][data-milestone]`; only a milestone challenge masters a milestone.
7. **Cold checks:** on a milestone pass, `cold-check: m<k> after <date+14d>` in `NOTES.md`; continue-course runs it in chat; a fail sets `lapsed` and never relocks.
8. **Practice mode runs in chat** with fresh items; browser practice grows only by appending new-id items.
9. **Citations behind the skill** are listed once, as `K1–K5` in `references/grounding.md`, all `unverified (index-only)`. Fetching was retried on 2026-11-25: every host returned proxy 403, so nothing was upgraded. Deci now links PubMed 10589297, marked as corrected from index evidence, not fetched. devlinpeck.com removed; pressbooks kept as "secondary summary (T3)".
10. **Lesson-specific code** goes in `lessons/scenes-NNNN.js` or the new optional `lessons/NNNN.figures.js` (the templates' CSP forbids inline scripts; the linter allows scripts next to the lesson).
11. **`version: "2.0.0"`** on all five plugin entries (accepted by validate; installs show "Version: 2.0.0"). Releases must bump it, or users stop receiving updates.

## Validation performed and results

| Check | Result |
|---|---|
| `claude plugin validate .` / `--strict` (CLI 2.1.331) | `√ Validation passed`, exit 0 both (only README "Advice" lines, F's file) |
| `node scripts/validate.mjs --strict` (E) | `0 error(s), 0 warning(s). OK` |
| `node scripts/validate.mjs --portable` | 5 errors, all `argument-hint` (intended: DX-05, documented in `references/failure-handling.md`) |
| Link + anchor check (own script, GitHub slug rules) over `skills/**/*.md` (excl. starter) and `subagents/` | `194 relative links checked, 0 broken` |
| `~/.claude`, `/home/`, `./` path scan in skill text | none |
| Role file ↔ native agent sync | 4/4 in sync |
| Frontmatter | 5 names match folders; descriptions 317–509 chars; native agent descriptions 262–284 chars |
| Install test, throwaway `HOME`/`CLAUDE_CONFIG_DIR` (scratchpad `ws-a/install`), local marketplace from a git snapshot of the tree | `install curriculum-planner@jpmmatias` → "Successfully installed … (+ 1 dependency: learn)"; all 5 show `Version: 2.0.0` |
| Real session (`claude -p`, debug log) | "Total plugin agents loaded: 4" (`subagents/lesson-*.md` from plugin learn); 5 skills loaded; model listed `learn:learn`, `curriculum-planner:curriculum-planner`, `lesson-panel:lesson-panel`, `source-researcher:source-researcher`, `challenge-reviewer:challenge-reviewer`, `learn:lesson-author/expert/flow/novice` |
| `${CLAUDE_SKILL_DIR}` substitution | invoking `curriculum-planner` via the Skill tool showed `…/install/repo/skills/curriculum-planner/../learn/workflows/plan-course.md`, which exists |
| Evidence snippet in `workflows/review.md` against D's real `store.js` | imported a synthetic export (`{"added":4,"skipped":0,"errors":[]}`) and printed the due card for `l1.o1` |
| `claude plugin details learn@jpmmatias` | shows `Agents (0)`: the inventory command does not count marketplace-entry `agents` paths, although the session loads them (CLI quirk, not a packaging error) |

Not verified: a skills.sh (`npx skills add`) install this session (the command was denied by the permission classifier; raw/12 verified placement earlier); any end-to-end lesson run; agents other than Claude Code.

## Instruction cost (bytes / 4; files loaded per path)

| Path | Baseline | After |
|---|---|---|
| Router / always-loaded `learn` body | 8,580 | 1,826 |
| Quick Learn (explain) | 8,580 | 3,125 |
| New course up to the plan | 10,233 (+ 16,086 `assets/`) | 6,583 |
| New course + lesson 1, Fast, one agent | 10,233 + 16,086 | 18,324 |
| Continue, Fast, lesson with scene | 8,580 + 16,086 `assets/` | 10,648 |
| Continue, Balanced, main agent | 8,580 + 16,086 | 12,976 (+ researcher 4,006; expert 744; novice 679 in their own contexts) |
| Panel orchestrator (via `lesson-panel`) | 9,099 | 4,577 |
| Challenge review (via `challenge-reviewer`; via router) | 10,167 | 4,845; 4,487 |

The router is 80 lines but ≈1.8k tokens (target was ≈1.2k): the workspace map and index tables account for most of it.

## Known limitations

- Citations K1–K5 remain index-only; whoever has access to those hosts should fetch them and update `references/grounding.md`.
- `source-record.schema.json` (D) uses claim `strength` ∈ {supported, partial, disputed}; the spec (raw/04, `RESOURCES-FORMAT.md`) uses {consensus, supported, single-study, disputed, gap}. The ledger is Markdown and E's linter does not parse it, so nothing breaks today, but the vocabularies should be unified (proposal: D adopts the spec's five values).
- Chat practice, chat reviews and cold checks do not reach the browser schedule (no agent → browser evidence path; deferred per plan).
- Repository Learning is documented as experimental only.
- `argument-hint` kept (works in Claude Code; rejected by claude.ai uploads and the Skills API).

## Dependencies

- **C1:** `templates/{index,review,lesson,reference}.html` and `0001.practice.js` names (used by the scaffold and the contract); export file name `progress-<course>-<date>.json`; `#challenge[data-kind][data-milestone]` and `.criteria` styling; `NNNN.figures.js` allowed next to lessons.
- **C2:** `viz.js` before `diagram.js`/`scene.js`; diagram `data-lc` components (`bars`, `numberline`, `flow`, `stepper`) as indexed in `references/components.md`.
- **D:** `store.js` Node export of `createStore` (used by the evidence snippet; verified); `learning-record-frontmatter` matches (incl. `transfer_reason`); `review-handoff` matches (`items: []` required, `problems`, `sources`); source-record strength mismatch above.
- **E:** validator should keep the role↔native-agent sync check and treat `subagents/*.md` as agent files; `check.mjs` must resolve Playwright from `~/.cache/learncraft/tools` (the workflow installs it there).
- **F:** README line 27 and GUIDE lines 197–198, 205–206, 217 still describe the old `SKILL.md`, the four-agent loop, `~/.claude/skills/learn/...` paths and "copy it back into the starter" (now forbidden). README needs the `/plugin install <name>@jpmmatias` lines (validator advice) and should present pipeline plugins as add-ons that pull in `learn`.

## Next action

Orchestrator: commit; ask D to unify the claim-strength enum; ask F to update README/GUIDE references listed above; at release, keep `version` bumped across all five entries.
