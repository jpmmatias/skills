---
name: source-researcher
description: Fill RESOURCES.md for a learn course before a lesson is written. Use when a lesson has no verified sources, when the user asks for resources, references, reading, videos or primary sources on a lesson topic, or when the Gaps section needs work. Every link is fetched, typed, given a length and a reason, and recorded in RESOURCES-FORMAT.md form.
argument-hint: "Which lesson or topic needs sources?"
---

Research the sources for one lesson, or one topic, in the current learn course. The course is the directory with `MISSION.md` and `RESOURCES.md`. The author cites this file; a link that is not here is a link the author must stop and fetch.

The rule from the `learn` skill holds: never record a link you have not fetched, and never invent a URL or a title.

## Steps

1. Scope. Read the lesson's entry in `assets/course.js` (title, `canDo`, milestones), `MISSION.md`, and the per-lesson decision in `NOTES.md`. Write the two or three claims the lesson will have to support and the one skill it proves. Completion: a short list of what a source must back.
2. Search. For each claim, look for the primary source first: the paper, the specification, the official documentation, the creator's own explanation. Then one expert write-up, one video if a strong one exists, and one hands-on page (a playground, a repo, a dataset). Prefer the creator of the technology, a recognised expert, a peer-reviewed paper, or a well-moderated community over a tutorial farm. Completion: at least one candidate per claim, and a candidate for each medium or a note that none was worth it.
3. Fetch every candidate. Open the page. Confirm the title, the author, and that the page actually says what you will cite it for; for a PDF, read the page you cite. For a video, confirm the title on the channel and take the length from the watch page. Drop anything that does not resolve, is paywalled without a preview, or is marketing dressed as teaching. Completion: every surviving link has a verified title, a type, a length, and the passage or timestamp worth the learner's time.
4. Write the entries into `RESOURCES.md` under `## Knowledge`, in a `### Lesson N — <title>` block, with the date you verified them, following `RESOURCES-FORMAT.md` in the `learn` skill. Each entry: type and length in the link text (`📄 Article · 8 min`, `▶ Video · 14 min`, `🛠 Playground`), then one line on what it covers and when to reach for it. Mark one entry **Primary source for LN**. Completion: the block exists, and each entry has an annotation.
5. Record gaps. Where no good source exists for a claim, or no good video exists for the lesson, write it under `## Gaps` with what was searched. The author then labels that part of the lesson as illustrative or leaves it out. Completion: every claim from step 1 is either backed by an entry or named in Gaps.
6. Add a community under `## Wisdom (Communities)` when the mission calls for practice outside the course and the learner has not opted out. One well-moderated place is enough.
7. Report back: the primary source, the list of links with types and lengths, and the gaps.

Completion for the research: the author can write the lesson citing only `RESOURCES.md`, and every link in that block was opened during this session.

## Rules

- Fetch before you write. A link from memory is a guess, however familiar.
- One annotation per link. A bare link is useless in three months.
- Prune while you add. An entry that turned out wrong, shallow, or off-mission is removed, not kept.
- Keep a source in its original language and title; translate only the annotation.
- Do not write lesson HTML and do not edit `assets/course.js`. Those belong to the author and the planner.
- Do not commit unless the learner asks.
