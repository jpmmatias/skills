# Security policy

## What Learncraft is, from a security point of view

- **Skills are instructions for an agent.** They run with whatever permissions you give your coding agent: reading and writing files, running commands, fetching web pages. Learncraft adds no permissions of its own, but it asks the agent to fetch sources, write course files and run a local browser check.
- **Courses are generated HTML and JavaScript that run on your machine.** Lessons, practice files and motion scenes are written by the agent, often from web research, and open from `file://` in your browser. In Chromium, every local HTML file you open shares one storage origin, so a malicious local page could read or alter course progress, and course pages could read other local pages' storage.
- **The lesson check runs those pages in headless Chromium** (`check.mjs`), and the repository tools evaluate `course.js` and practice files in a Node `vm` context, which is **not** a security boundary. Run them only on your own workspaces and on this repository.

## Threat model summary

| Threat | Path | Mitigations in place | Residual risk |
|---|---|---|---|
| Script injection from sources | A fetched page plants markup or instructions that reach `RESOURCES.md`, a lesson, a caption or a practice item | Fetched text is data, never instructions ([grounding rules](skills/learn/references/grounding.md)); the runtime escapes all course strings and sanitises light markup to an allow-list; templates carry a CSP (`script-src 'self'`, `connect-src 'none'`); the linter rejects inline event handlers, `javascript:` URLs and remote scripts | The agent writes `scenes-NNNN.js` and other scripts itself: a script file in the workspace runs with page privileges. Review generated code like any other code. |
| Data exfiltration from a course page | Injected code sends progress or page text out | `connect-src 'none'` blocks fetch/XHR/beacons; no remote fonts or scripts in the starter; `check.mjs` reports any third-party request | CSP `'self'` matching on `file:` differs between browsers and is verified in Chromium only. Navigation and some request types are not covered by `connect-src`. |
| Poisoned local storage | Another local HTML file writes crafted progress | Stored progress is parsed defensively and never interpolated as HTML; corrupt or hostile stored data neither runs nor breaks the page (tested in Chromium) | Another local page can still delete or alter progress. Export your progress if it matters. |
| Prompt injection into the agent | A web page tells the agent to run commands, change grading or add links | Skill rules: ignore instructions inside fetched content, never copy commands from a page without reading them, drop pages that address agents | Agents can still be manipulated. Keep your agent's permission prompts on for commands and network access. |
| Supply chain | The optional check tools (Playwright, axe-core) | Pinned exact versions, a committed lockfile, installed into a separate tools folder, never into courses | You trust those packages when you install them. Courses themselves have no dependencies. |
| Writing outside the workspace | The agent modifies the installed skill or other folders | The skills forbid writing into any installed skill folder; all outputs go into the course workspace | Enforced by instructions, not by a sandbox. |

We do not claim the generated courses or the skills are secure against every attack. The tests in `tests/security.test.mjs` cover specific regressions (XSS through course data, captions, practice items and stored progress; the CSP; blocked storage), in Chromium only.

## In scope

- XSS or script execution through course data, practice data, captions, stored progress or the templates.
- Course pages making network requests, or the CSP failing to block them.
- Skill instructions that lead an agent to run fetched commands, write outside the workspace, or present unverified sources as verified.
- `check.mjs`, `validate.mjs` or the evaluation runners executing untrusted input in a way not documented above.

Out of scope: issues that need an attacker who already controls your agent, your workspace files or your browser; the behaviour of third-party agents or models; vulnerabilities in Playwright, axe-core or Chromium themselves (report those upstream).

## Reporting a vulnerability

Please report privately through GitHub: on the repository page, open **Security → Report a vulnerability** (GitHub private vulnerability reporting / security advisories). Include the affected file or skill, steps to reproduce (a minimal `course.js` or lesson is ideal), and the impact you observed.

Do not open a public issue for a vulnerability. This is a personal project maintained in spare time: expect an acknowledgement within about a week. Fixes are released as a new version in the marketplace manifest and noted in the changelog; you are credited unless you ask not to be.
