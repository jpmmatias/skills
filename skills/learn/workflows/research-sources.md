# Research sources for a lesson

The single procedure for sources. It writes **only** `RESOURCES.md`, in the [RESOURCES-FORMAT](../RESOURCES-FORMAT.md) shape. The `source-researcher` skill and the researcher subagent run this file. This workflow is the only writer of `RESOURCES.md`: authors ask for new sources through it.

**Load:** [grounding](../references/grounding.md) (tiers, statuses, offline policy, injection rules).

**Preconditions:** the lesson's entry in `assets/course.js` and its line under `## Per-lesson decisions` in `NOTES.md`. Otherwise run [plan-course](plan-course.md).

**Budget (fetches per lesson):** Fast ≤ 4, Balanced ≤ 8, Deep ≤ 15. Count every page open. When the budget runs out, record what is left under `## Gaps`.

## Steps

1. **Scope.** From the lesson's `title`, `canDo` and `objectives`, `MISSION.md` and the NOTES line, write the 2–4 claims the lesson must support, as ids `L<N>-C1`, `L<N>-C2`… Note any version-sensitive fact (a library, API or tool version) and the version recorded in `NOTES.md` for the learner's environment.
2. **Reuse.** Check existing `RESOURCES.md` entries first. An entry still within its re-check window ([grounding → Versions](../references/grounding.md#version-sensitive-facts-and-staleness)) can back a claim without a new fetch.
3. **Search.** Per claim, look for a T1 source first (paper, spec, official docs, the creator's own text), then one T2 explainer, one video if a strong one exists, and one hands-on page (playground, repo, dataset). Never search with private repository content ([repository learning](repository-learning.md#privacy)).
4. **Fetch and check** each candidate per the [verification steps](../references/grounding.md#verification-steps): the title and author match, the passage says what you will cite it for, numbers match character for character, and for a video the length comes from the watch page. Drop marketing, SEO farms and AI-generated pages (T5). For a paywalled paper, keep it by DOI and link an open record or copy as well.
5. **Write the lesson block** under `## Knowledge`: `### Lesson N — <title>`, its research line, the entries, and the `Claims` ledger. Give new entries the next free `S<n>` id; never reuse or renumber an id. Mark one entry **Primary source for L<N>**. Annotations are in your own words, in the course language; titles stay in their original language.
6. **Gaps.** Every claim is either backed in the ledger or listed under `## Gaps` with what you searched. The author then labels that part illustrative or leaves it out.
7. **Community.** When the mission needs practice outside the course and the learner has not opted out, add one well-moderated place under `## Wisdom (Communities)`.
8. **Report** in at most 8 lines: the primary source, each new id with its type and status, and the gaps. A subagent returns this report and nothing else; it never asks the learner anything (a choice it cannot make goes into the report).

## Rules

- A link from memory is a guess, however familiar. Offline, follow the [offline policy](../references/grounding.md#offline-policy): no URLs, `unverified (offline)`, an entry in `## Verification debt`.
- Prune while you add: an entry that turned out wrong, shallow or off-mission is removed.
- Do not write lesson HTML or `course.js`. Do not commit unless the learner asks.
