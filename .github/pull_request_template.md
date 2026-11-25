## What and why

<!-- One paragraph: the problem, the change, and the finding or issue it addresses (e.g. F-02, #12). -->

## Checklist

- [ ] `node scripts/validate.mjs` passes (paste the last line below)
- [ ] `node --test tests/*.test.mjs` passes; browser tests ran (not skipped) if the runtime, templates or `check.mjs` changed
- [ ] `node skills/learn/starter/tools/check.mjs examples/<each>` passes for runtime, template or theme changes, and I looked at the screenshots in `.check/`
- [ ] UI changes: before/after screenshots at 390px and 900px, light and dark, attached below
- [ ] Skill-instruction changes: `node evaluations/runners/instruction-cost.mjs` before/after numbers below
- [ ] `CHANGELOG.md` entry under "Unreleased" (with upgrade notes if courses need a refreshed `assets/`)
- [ ] Marketplace `version` bumped on every entry, if this is a release
- [ ] No new runtime dependency, remote request, inline script or inline handler in generated courses
- [ ] No unverified claims: everything described as tested, verified or compatible was actually run, and I say what was not

## Validation

```text
<!-- paste command output -->
```

## Screenshots

<!-- before / after -->
