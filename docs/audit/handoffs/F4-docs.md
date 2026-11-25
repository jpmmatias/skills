# Handoff F4: brand, docs, demo gallery

| | |
|---|---|
| **Agent** | F4 (Agents 11 Brand Strategist, 12 Developer Experience docs) |
| **Task** | Rewrite README and GUIDE for Learncraft 2.0; brand guidelines and launch kit; compatibility matrix; install and upgrade guides (incl. v1 → v2 course migration); social preview; example gallery page and examples README; screenshots from the example courses |
| **Status** | Done. Screenshots were taken from the finished example courses. Nothing committed. |

## Files

Created or rewritten (all inside F4's ownership):

- `README.md` (rewritten)
- `docs/GUIDE.md` (rewritten for 2.0)
- `docs/brand/brand-guidelines.md`, `docs/brand/launch.md`
- `docs/guides/installing.md`, `docs/guides/upgrading.md`
- `docs/compatibility.md`
- `examples/index.html` (gallery, no JS, inline stylesheet with the starter's tokens, CSP), `examples/README.md`
- `media/capture.mjs` (regenerates every screenshot and the social preview)
- `media/readme/{dashboard,lesson}.png`, `media/guide/01..08-*.png` (all eight **replaced** with 2.0 screenshots from the example courses), `media/social-preview.svg`, `media/social-preview.png` (1280×640), `media/social-preview@2x.png`
- this handoff

Not touched: `skills/**`, runtime, tests, scripts, `.github`, CHANGELOG, the example courses themselves.

## Decisions

1. **Install appears on the first screen** as the two plugin commands plus a one-line skills.sh alternative; the full matrix lives in `docs/guides/installing.md`.
2. **README hero** = two real screenshots of `examples/transformers` (attention explorer, dashboard). The motion-scene GIF stays in "What it does", captioned as pre-2.0 styling (it is from the old course).
3. **Guide screenshots all retaken** from the examples, so no "pre-2.0" marks were needed in GUIDE. The old images (from the *Building Reliable AI Agents* course, joaopdmatias theme) remain in git history.
4. **Upgrade guide was tested, not just written.** On the v1 fixture (`evaluations/fixtures/baseline-workspace`) in Chromium I tried four variants: (A) copy new assets keeping `course.js`/`theme.css`: no errors; quizzes, fades, bars, stepper and scene work, but `data-bands`, `.band-quiz`, `.threshold-explorer` render empty. (C) A + `jev-confidence.{js,css}`: everything renders. (B/D) keeping the old `diagram.js` as `diagram-v1.js`: renders, but colours are lost (old classes gone from `style.css`). The guide recommends C and documents B as a fallback with that caveat.
5. **Progress migration verified in Chromium:** an answer saved by the v1 runtime appeared in `learn:<id>:v2` as `attempt` + `migration` events, and the v0 key was byte-for-byte unchanged.
6. **Hosted demo path** is `https://jpmmatias.github.io/skills/` because E's `pages.yml` publishes `examples/` as the site root; the gallery is `examples/index.html`. All copy says "live once Pages is enabled".
7. **Naming conflict check re-run on 2026-11-25** (GitHub search API, npm, PyPI): same results as 2026-11-24 (105 repos; `Weilan0811/learncraft` active, pushed 2026-11-23; npm and PyPI 404).
8. **Gallery uses an inline stylesheet**, not a course's `style.css`, so it never breaks when a course's assets change.
9. **Social preview** uses a real fragment: the left 60% of the attention explorer from `examples/transformers` lesson 2 rendered in dark mode, plus that course's real file list. No logo was invented; the motif is a thin ruled page with one rust mark.

## Validation

| Check | Result |
|---|---|
| `node scripts/validate.mjs` | 0 findings in any F4 file. 5 errors remain, all in `docs/audit/reviews/skills-architecture-pedagogy.md` (not F4's; its relative links point at `docs/audit/references/…`) |
| Example courses lint (via validate) | 0 errors once the courses landed (2 option-length warnings in probability earlier, gone in the final run) |
| Gallery in Chromium | 1280 light and 390 dark: no console errors, no horizontal scroll, every relative link resolves |
| Screenshots | all 11 images and the social preview rendered at DSF 2 and inspected |
| Claims audit | README/GUIDE/brand claims checked against handoffs A, C1, C2, D, E and raw/11, raw/12; token costs labelled as estimates; no scores, stars or user counts |

## Known limitations

- **Example `core.js` is older than the starter's.** The starter's `core.js` gained a URL allow-list fix (`safeHref`/`workspaceHref`) after the examples copied it; all three examples differ from the starter in `core.js` (and `course.js`, by design). Re-copy `assets/` into each example before publishing. `examples/README.md` says to.
- The upgrade guide was tested on one fixture course in Chromium only; components a learner's agent invented in v1 are covered only by the `diagram-v1.js` fallback, which loses colours.
- The plugin update commands in `upgrading.md` come from Claude Code's docs (raw/12); only fresh installs were verified.
- No agent other than Claude Code has been run; the compatibility matrix says so and no row was upgraded.
- The README GIF is from the pre-2.0 Jev course; replace it with a recording of the transformers scene when someone can capture video.
- Screenshots use the fonts available in this container (Iowan Old Style is not installed, so the serif falls back).

## Owner actions needed

1. **Rename?** The product is Learncraft; the repository stays `jpmmatias/skills`. Decide whether to rename it later (GitHub redirects, but third-party notes would show the old name).
2. **Enable GitHub Pages** with Source: GitHub Actions; run the `pages` workflow once and open `https://jpmmatias.github.io/skills/`.
3. **Repository settings:** description, homepage and topics as listed in `docs/brand/launch.md`; upload `media/social-preview.png` as the social preview.
4. **Trademark and domain checks** for LEARNCRAFT (USPTO TSDR, WIPO, EUIPO; classes 9/41/42; learncraft.dev/.app/.ai/.com). Not done by us.
5. Tag `v2.0.0` to match the plugin `version`.

## Next action

Orchestrator: re-copy the starter `assets/` into the three examples (keep `course.js`/`theme.css`), re-run `node media/capture.mjs` if the pages change visibly, fix the links in `docs/audit/reviews/skills-architecture-pedagogy.md`, then commit.
