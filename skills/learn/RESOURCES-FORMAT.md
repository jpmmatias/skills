# RESOURCES.md Format

`RESOURCES.md` lives at the course workspace root. It is the curated set of sources for the course: lessons cite it by source id, and knowledge comes from here, not from parametric guesses. Only the [research-sources](workflows/research-sources.md) workflow writes it. Tiers, statuses, verification and the offline policy are defined in [grounding](references/grounding.md).

## Structure

```md
# {Topic} Resources

## Knowledge

### Lesson 3 — {Lesson title}
Researched 2026-11-24 · online · 6 of 8 fetches

- [S3] [{Title as published}](https://example.org/paper) — {Author} / {Publisher or venue} · paper 15 pp · tier T1 · verified 2026-11-24
  {What it covers, in your own words.} Use for: {the claim or section it backs}; see §3.2. **Primary source for L3**
- [S4] [{Title}](https://example.org/docs) — {Publisher} · docs 6 min read · tier T1 · verified 2026-11-24 · version: React 19
  {Annotation.} Use for: {…}.
- [S5] [{Title}](https://example.org/watch) — {Channel} · video 14 min · tier T2 · unverified (blocked: example.org)
  {Annotation.} Watch 4:10–9:30 for {…}.

Claims L3:
- L3-C1 · consensus · S3 · "{The claim as the lesson states it}"
- L3-C2 · disputed · S3, S6 · "{…}"
- L3-C3 · gap · — · "{…}"

## Wisdom (Communities)

- [{Community name}](https://example.org/community) — {who runs or moderates it}
  {Why it is high-signal.} Use for: {kind of question}.

## Gaps

- L3-C3: no primary source found for {…}; searched {queries, sites}.
- L3: no strong video; searched {…}.

## Verification debt

- S5: blocked host on 2026-11-24; fetch and check the 4:10–9:30 segment.
```

## Entry line

```
- [S<n>] [<Title>](<url>) — <Author> / <Publisher> · <type>[ <length>] · tier T<1-5> · <status>[ · version: <scope>][ · open copy: <url>]
```

- **Id** `S<n>`: unique across the whole course, assigned in order, never reused or renumbered, even when an entry is pruned. Lessons link it as `../RESOURCES.md#s<n>` with `data-src="S<n>"`.
- **Type**: `paper`, `docs`, `spec`, `book`, `article`, `video`, `talk`, `course`, `playground`, `repo` or `dataset`, then the length (`video 14 min`, `article 8 min read`, `paper 42 pp`).
- **Status**: `verified YYYY-MM-DD` or `unverified (<reason>)`, exactly as in [grounding → Statuses](references/grounding.md#statuses).
- **version:** required for docs, APIs and tools.
- **open copy:** an open record or copy of a paywalled primary source.
- The next line, indented, is the **annotation**: what the source covers and when to reach for it, in your own words and in the course language. Titles stay in their original language. Quotes are short, in quotation marks, with a locator.

## Claims ledger

One `Claims L<N>:` list per lesson block: `- L<N>-C<k> · <strength> · <source ids or —> · "<claim>"`. Strength is `consensus`, `supported`, `single-study`, `disputed` (needs a source on each side) or `gap` (also listed under `## Gaps`).

## Rules

- **High trust only.** T1 first; T4 only as a readable summary next to T1/T2; never T5.
- **Annotate every entry.** A bare link is useless in three months.
- **Group by Knowledge / Wisdom**, mirroring the [philosophy](references/pedagogy.md#philosophy).
- **Surface gaps.** Every claim the course needs is backed or listed under `## Gaps`.
- **Prune.** A source that turned out wrong, shallow or off-mission is removed (its id stays retired).
- **Record community preferences.** If the learner opted out of communities, say so under Wisdom.
- **Older files** without ids or lesson blocks stay readable. The next research run adds ids to the entries it keeps and moves them into lesson blocks.
