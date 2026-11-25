# Security and reliability review: Learncraft starter runtime and tooling

Independent review (the reviewer did not write this code). Date: 2026-11-25.
Threat model used: course data (`assets/course.js`, `lessons/*.practice.js`, scenes, captions, RESOURCES titles, lesson HTML) is **untrusted**, because an agent writes it partly from web research. Progress lives in `localStorage`; Chromium gives every `file://` page one shared origin. Progress can be exported and imported as JSON.

Method: line-by-line reading of the listed files, then attacks against real workspaces built from `skills/learn/starter/{templates,assets}` with the repository's own `tests/lib/workspace.mjs` builder. The browser was headless Chromium (Playwright 1.63) opening `file://` pages. The Node loaders ran under Node 22.23. Every finding below was **reproduced** unless it is labelled *theoretical*. The PoC scripts were in the session scratchpad (`rev-sec/t1…t9*.mjs`, `rev-sec/vm/*`), which may be cleared. Each finding repeats the PoC inline so you can run it again. No repository file was modified apart from this report.

Severity scale: **P0** remote or zero-interaction compromise · **P1** a primary control is bypassed, or code runs outside the browser · **P2** a real bypass or data loss with preconditions, or a control that only partly works · **P3** hardening, edge-case reliability, or theoretical.

## Summary

| ID | Sev | Area | One line |
|---|---|---|---|
| SR-01 | P1 | `core.js` sanitize | `javascript:` survives `sanitize()` when the scheme has a tab, newline or C0 control character in it (`java&#9;script:`, `&#1;javascript:`), and the link runs on click when the page has no CSP |
| SR-02 | P1 | Node loaders (`vm`) | A hostile `course.js` or practice file gets `process` through a host function (`console.log.constructor`). This defeats `codeGeneration:{strings:false}`. Microtasks, `toJSON` and getters escape the 1 s timeout and hang `check.mjs` / `validate.mjs` |
| SR-03 | P2 | `lint-workspace.mjs` | The linter misses `<svg/onload>`, `java&Tab;script:`, `javascript&colon;`, `&#1;javascript:`, `<iframe srcdoc>`, `<object data>`, `<base>` and meta refresh. A missing CSP is only a warning, and lessons below schemaVersion 2 get no warning at all |
| SR-04 | P2 | `practice.js` loader | `lessons[].practice` is used as a `<script src>` with no path check, and CSP `'self'` on `file://` allows any local file. Only the JSON schema blocks it, and installs that ship the skill alone skip the schema |
| SR-05 | P2 | store / progress UI | Saving stops silently when the shared 5 M-char quota fills mid-session: no notice, and the lesson strip still shows progress. An oversized import reports "Imported: N new" while nothing is saved |
| SR-06 | P2 | `store.js` data loss | Events this runtime cannot validate are deleted on the next write, with no backup. A tab opened earlier overwrites a newer-schema document. The `:corrupt` backup is itself overwritten by the next corruption |
| SR-07 | P2 | tests | The security tests cannot catch SR-01, SR-03 or SR-05: the detector only matches `^\s*javascript:`, no test clicks a link, the poisoned-storage `__proto__` payload is never serialised, and the poisoned v2 doc is rejected before any event reaches a renderer |
| SR-08 | P3 | `practice.js` | Error isolation gap: one malformed item (`options: [null, …]`) throws outside `Learncraft.mount`, so the lesson renders no practice at all and review.html gets an uncaught error |
| SR-09 | P3 | `store.js` | The log grows without bound and every write is O(n): about 70 ms per answer at 10 k events, about 250 ms at 30 k. Import has no size or count cap |
| SR-10 | P3 | `scene.js` | The terminal `out` class (`s.c`) goes into markup unescaped, which allows attribute injection (blocked by CSP) |
| SR-11 | P3 | `resolve.mjs` | `check.mjs` loads `playwright` from the workspace's `node_modules` and its parent folders first, so a planted package runs (repository-learning puts the course in `.learncraft/` inside a repo) |
| SR-12 | P3 | `core.js` sanitize | `\\host\share` and `/\host/x` hrefs survive and resolve to `file://host/…` (*theoretical* SMB/NTLM leak on Windows) |
| SR-13 | P3 | store validation / tabs | Dates are validated loosely (`"1"`, year 275760 accepted on import). Other tabs keep showing stale progress because nothing listens for the `storage` event |

No P0 was found. The template CSP (`script-src 'self'`) stopped every browser payload in this review. Each browser finding is therefore a bypass of the first line of defence on pages that carry the CSP, and a full exploit on pages that lack it. The linter allows such pages (SR-03). The repository's own security tests deliberately test with the CSP removed.

---

## Findings

### SR-01 (P1) `sanitize()` lets `javascript:` URLs through via tab, newline and C0 control characters

**Where:** `skills/learn/starter/assets/core.js:47-51` (`safeHref`). Reached by every sanitised sink: practice `prompt`, option `text`, `why` and `steps` (`practice.js:179-180, 220, 232, 253, 255, 268, 305, 328`), scene captions and the transcript (`scene.js:135, 162`), flow captions (`diagram.js:320`), and `plain()` in `practice.js:113` and `viz.js:122`.

`safeHref` trims, accepts `^https?://` or `#`, and rejects anything matching `^[a-z][a-z0-9+.-]*:`. Everything else counts as a relative URL. The WHATWG URL parser removes ASCII tab and newline from the middle of a URL, and leading and trailing C0 controls and spaces, *after* that check. So `java\tscript:`, `java\nscript:`, `\x01javascript:` and `\x1fjavascript:` fail the scheme regex, are kept verbatim, and resolve to `javascript:`. The HTML parser decodes `&#9;`, `&Tab;`, `&NewLine;`, `&#1;` and `&#x1f;` into those characters before `getAttribute` reads them.

**PoC:** run `Learncraft.sanitize()` inside a lesson page:

| input | output | `a.protocol` |
|---|---|---|
| `<a href="java&#9;script:alert(1)">` | `<a href="java\tscript:alert(1)">` | `javascript:` |
| `<a href="java&Tab;script:alert(1)">` | same | `javascript:` |
| `<a href="java&NewLine;script:alert(1)">` | `java\nscript:…` | `javascript:` |
| `<a href="&#1;javascript:alert(1)">` | `\u0001javascript:…` | `javascript:` |
| `<a href="&#x1f;javascript:alert(1)">` | `\u001fjavascript:…` | `javascript:` |
| `javascript:`, ` javascript:`, `JaVaScRiPt:`, `javascript&colon;`, `&#106;avascript:`, `data:`, `vbscript:`, `file:`, `//host` | href removed | n/a (sound) |

End to end (`t2-e2e.mjs`): practice item `prompt: 'Q <a href="&#1;javascript:void(window.__xss=\'prompt-c0\')">src</a>'` and option `why: '<a href="java&#9;script:void(window.__xss=\'why-tab\')">more</a>'`. Clicking the links on a lesson page **without CSP** set `window.__xss` to `prompt-c0`, then `why-tab`. **With the template CSP** both were blocked: "Running the JavaScript URL violates … script-src 'self'". The same bypass in a scene caption also ran without CSP (`t8-scene.mjs`, `java&#10;script:`).

**Impact:** script runs in the course origin on one click. On `file://` in Chromium that origin is every local page: all courses' progress, including the learner's typed recall answers, can be read or rewritten. It can also send data out by navigation; `connect-src` does not cover navigation. The CSP blocks it only when the page has the CSP meta, and SR-03 shows that is not enforced.

**Fix:** after trimming, strip every character the URL parser ignores before testing the scheme, then allow-list by parsing:
```js
function safeHref(h) {
  h = String(h || '');
  var probe = h.replace(/[\u0000-\u0020\u007f-\u009f]/g, ''); // what the URL parser removes or ignores
  if (probe.charAt(0) === '#') return h.trim();
  try { var u = new URL(probe, 'https://x.invalid/'); } catch (e) { return null; }
  if (u.protocol === 'http:' || u.protocol === 'https:') return /^https?:/i.test(probe) || u.host === 'x.invalid' ? h.trim() : null;
  return null;
}
```
Equivalently, keep the current logic but run it on `probe`, and also reject `\` and `/\`, which covers SR-12. Add the payloads in the table above to `tests/security.test.mjs` and change the detector (SR-07).

### SR-02 (P1) Node `vm` loaders: host-realm escape and timeout bypass on hostile `course.js` or practice files

**Where:** `scripts/lib/schema.mjs:201-212` (`runScript`, `plain`, `loadCourseJs`, `loadPracticeJs`) and `skills/learn/starter/tools/lint-workspace.mjs:62-86` (`stubGlobals`, `fallbackLoadCourseJs`, `fallbackLoadPracticeJs`). Reached by `check.mjs:47` (which lints before the browser pass), the `lint-workspace.mjs` CLI, `scripts/validate.mjs` step 9 (`examples/*`) and the evaluation scorer.

The sandbox objects are created in the host realm: `console.log`, `Learncraft.practice`, `addEventListener`, and the `Proxy` in the fallback. Any host function's `.constructor` is the host `Function`, so `codeGeneration: { strings: false }` (which applies only to the context's own `Function`) does not help. `timeout: 1000` covers only the synchronous `runInContext`. Promise jobs queued by the script run later on the host microtask queue. `JSON.stringify` in `plain()` runs `toJSON` and getters in the host with no timeout, and so does reading a `COURSE` accessor.

**PoC** (`rev-sec/vm/run.mjs`, run under `timeout 6`):

| hostile file | loader | result |
|---|---|---|
| `const p = console.log.constructor('return process')(); p.stdout.write('pid='+p.pid)` | `schema.mjs loadCourseJs` | `ESCAPED via host console.log: pid=483 cwd=…`, returned normally |
| `addEventListener.constructor('return process')()` | `lint-workspace fallbackLoadCourseJs` | escaped |
| `Learncraft.practice.constructor('return process')()` | `schema.mjs loadPracticeJs` | escaped |
| `for(;;){}` | schema | throws after 1006 ms (the timeout works) |
| `Promise.resolve().then(()=>{for(;;){}})` | schema | returns, then the process hangs (killed, exit 124) |
| `window.COURSE = { toJSON(){ for(;;){} } }` | schema | hangs (exit 124) |
| `Object.defineProperty(window,'COURSE',{get(){for(;;){}}})` | schema | hangs (exit 124) |

**Impact:** writing a workspace file becomes arbitrary Node code execution with the learner's privileges the next time anyone runs `node check.mjs` (or the lint, or the validator). The agent is told to run that command routinely, and users often pre-approve it. SECURITY.md's main residual-risk mitigation is "keep your agent's permission prompts on for commands", and this path goes around it: a prompt-injected agent only needs to *write* course data. The browser side of the same file stays confined by the CSP and Chromium's sandbox. ADR-004, the `schema.mjs` header and the `lint-workspace.mjs` header all say that `vm` is not a security boundary, so this behaviour is documented. But the `timeout` and `codeGeneration` options read as containment, the `check.mjs` header does not say it executes workspace JavaScript in Node, and the hangs break the "fails closed" expectation of a pre-commit gate.

**Fix (verified in-process part, `rev-sec/vm/hardened.mjs`):**
1. Pass **no host objects** into the context. Create it from `Object.create(null)` and define the stubs (`window`, `document`, `console`, `Learncraft.practice` that collects calls into an in-context array) by `runInContext` of a prelude string. Then `.constructor` reaches only the context's `Function`, which `codeGeneration:{strings:false}` blocks. Measured: all three escapes now throw "Code generation from strings disallowed for this context", and the shipped `course.js` still loads.
2. `microtaskMode: 'afterEvaluate'`, and serialise inside the context (`runInContext('JSON.stringify(globalThis.COURSE)', ctx, {timeout})`). Measured: the microtask and `toJSON` hangs become timeouts after about 1000 ms.
3. The accessor-on-global hang **still hangs** in-process (V8's global interceptor runs the getter outside the watchdog). So run the loaders in a **child process** (`spawnSync(process.execPath, ['--disallow-code-generation-from-strings', loader, file], { timeout: 5000, env: {} })`) and accept only JSON on stdout. This is the only real timeout.
4. Say in `check.mjs`'s header and in the workflow that `check.mjs` executes the workspace's `course.js` and practice files in Node. Longer term (ADR-004 follow-up): require `course.js` to be exactly `window.COURSE = <JSON>;` so tools can parse it with `JSON.parse` and never execute it.

### SR-03 (P2) Workspace linter bypasses for script-bearing markup, and the CSP is optional

**Where:** `skills/learn/starter/tools/lint-workspace.mjs:118-133` (`decodeEntities` handles only numeric entities and `amp/lt/gt/quot/apos/nbsp`; the `tags()` regex requires whitespace before each attribute), `:385-391` (handler and `javascript:` checks), `:380-382` (`csp-missing` is a warning, and only when `schemaVersion === 2`).

**PoC** (`t3-lint.mjs`, `t3b-exec.mjs`): each snippet was inserted into a lesson and checked with `lintWorkspace`, then opened in Chromium (link snippets were clicked):

| markup | lint | runs without CSP | runs with CSP |
|---|---|---|---|
| `<img src=x onerror=…>` (control) | caught | n/a | n/a |
| `<a href="javascript:…">` (control) | caught | n/a | n/a |
| `<svg/onload="window.__x=1">` | **missed** (the tag regex never matches) | **yes** | no |
| `<a href="java&Tab;script:…">` | **missed** | **yes** | no |
| `<a href="javascript&colon;…">` | **missed** | **yes** | no |
| `<a href="java&#9;script:…">`, `<a href="&#1;javascript:…">` | **missed** | yes (as SR-01) | no |
| `<iframe srcdoc="&lt;img src=x onerror=parent.__x=1&gt;">` | **missed** | **yes** | no |
| `<object data="javascript:…">` | missed | no (Chromium) | no |
| `<base href="https://attacker.example/">`, `<meta http-equiv="refresh" content="0;url=https://…">` | missed | redirects links / the page (CSP has no `base-uri`) | same |

**Impact:** SECURITY.md lists "the linter rejects inline event handlers, `javascript:` URLs" as a mitigation for script injection from sources. Agent-written lesson HTML that slips any of these past `check.mjs` executes on pages without the CSP meta, and such pages pass lint with at most a warning. `<base>` and meta refresh work even under the template CSP. They can send every relative link, including citation links, to a third-party host. That leaks the learner's IP and lets the host phish.

**Fix:** parse attributes with a real HTML tokenizer, or at least make the tag regex accept `/` as an attribute separator (`(?:[\s/]+…)`). Decode all named entities (a small table: `Tab`, `NewLine`, `colon`, …). Test URLs with the SR-01 normalisation. Flag `srcdoc`, `<object>`, `<embed>`, `<base>` and `<meta http-equiv=refresh>` as errors. Make `csp-missing` an **error** for every lesson, index, review and reference page, and require exactly the template policy plus `base-uri 'none'; form-action 'none'; object-src 'none'` (added to the templates).

### SR-04 (P2) `lessons[].practice` becomes a `<script src>` for any local file

**Where:** `skills/learn/starter/assets/practice.js:504-519` (`s.src = LC.rootURL + file`, with `file` taken from `course().lessons[].practice`). It runs on review.html and the dashboard (`progress.js:290`). Only `schemas/course.schema.json:191-196` restricts the value (`^lessons/\d{4}\.practice\.js$`). `lint-workspace.mjs:301` checks only that the file exists.

**PoC** (`t4-practice-path.mjs`): `practice: '../../outside/evil.js'`, where `evil.js` sits outside the workspace. On `review.html` **with the template CSP**, `window.__x === 'outside-script-ran'`, with no console errors: Chromium treats `'self'` on `file://` as matching any `file:` URL. Lint in a repository checkout gave a `course-schema` error. With the schemas absent (`LEARNCRAFT_ROOT=/nonexistent`, which is what a skills.sh install looks like), lint found **zero errors** and printed only the `schema-unavailable` warning.

**Impact:** a data field (not code) chooses which local JavaScript file runs with page privileges, for example a `.js` file in Downloads at a guessable relative path. The CSP gives no protection on `file://`. `course.js` is itself JavaScript, so this matters as defence in depth and for the "course.js is data" contract the schema implies.

**Fix:** in `practice.js`, accept only `/^lessons\/\d{4}\.practice\.js$/` (ignore anything else and log it). In `lint-workspace.mjs`, run that same pattern as a structural rule (not schema-only), together with the `lessons/…html` pattern for `file`. Note in SECURITY.md that `'self'` on `file://` does not limit the path.

### SR-05 (P2) Silent loss of progress when storage fills, and imports that report success but are not saved

**Where:** `store.js:316-326` (`write()` sets `persistent = false` when a write fails). `progress.js:145-155` (the notice is drawn only once at load), `:258-271` (the import message ignores `persistent`), `:279-287` (`draw()` never re-checks notices). `practice.js:155-166` (`record` ignores the result).

**PoC 1** (`t6-quota.mjs`): the measured quota is **4.98 M chars for the whole `file://` origin**, shared by every course and every local page. A page in a *different* workspace folder saw `learn:smoke-course:v2` and then filled the quota. The learner then answered two items on the lesson page. Result: `persistent:false`, **0 notices**, and the strip still read "1 of 2 right on the first try, 1 recalled from memory". After reload the two attempts were gone, and only then did the storage notice appear.

**PoC 2** (`t7-import.mjs`): the learner imports a valid export with 30 000 attempt events (about 9 MB). The UI said **"Imported: 30000 new, 0 already here."**, `persistent:false`, no notice. After reload: 0 events. The stored data from before the import was kept. Exposure-only imports are compacted and do save, which is the designed behaviour.

**Impact:** the learner loses practice evidence they were told was recorded. The review schedule and levels go back to earlier values. With many courses on one machine the shared 5 M-char quota is realistic: about 400 bytes per attempt plus notes, and every course and every other local page counts against it.

**Fix:** have `write()` return a status and `notify()` subscribers with `{ persisted: false }`. Have `progress.js` subscribe and insert the `storage.off` notice (and announce it once) the first time persistence fails. Make the import message say "imported N, **not saved**: storage is full, export to keep them" when `persistent` is false after `importJSON`. Optionally show the size of the course's log on the dashboard and offer "export and compact".

### SR-06 (P2) Data loss in the store: unknown events dropped, newer documents overwritten, backups overwritten

**Where:** `store.js:260-268` (`checkDoc` drops events that fail `sanitizeEvent`), `:316-326` (`write()` merges only when `checkDoc` returns a doc; on `{newer:true}` it overwrites), `:280-283` (`KEY + ':corrupt'` is overwritten every time).

**PoC** (`t5-store.mjs`, in-memory Storage):
1. The stored doc holds `[e_1 attempt, e_2 kind:"hint", e_3 itemType of 201 chars]`. `load()` reports `rejected: 2`. After one `recordAttempt` the stored events are `e_1`, plus the new one. **e_2 and e_3 are permanently deleted, with no backup.**
2. A tab loads (v2). Another runtime writes a `schemaVersion: 3` doc with 2 events. The first tab records an attempt. Storage now holds a `schemaVersion: 2` doc with **1 event** (the v3 doc and its events are gone). Load already refuses to touch newer formats; `write()` does not.
3. Corrupt value A is backed up to `:corrupt`. A later corrupt value B overwrites that backup, so A is lost.

**Impact:** any future addition to the event vocabulary (a new `kind`, a longer field) is destroyed by older copies of `store.js`. Older copies are common: every course carries its own `assets/` copy, and all of them share one storage origin, so two courses with the same id, or a copied example course, interact. Schema-3 rollout would be destructive whenever a tab opened earlier is still open.

**Fix:** in `write()`, if the current stored value is newer (`c.newer`) or is corrupt, do not write: set `persistent = false` and notify. Keep events that fail validation verbatim in a `quarantine` array on the document (rendered nowhere, exported, re-validated on load) instead of dropping them. Use timestamped corrupt backups (`:corrupt:<iso>`, keeping the last 3).

### SR-07 (P2) The security tests cannot detect the regressions they are meant to catch

**Where:** `tests/security.test.mjs`.

- `:17` `LIVE_MARKUP` flags anchors only when `/^\s*javascript:/i` matches the attribute. `t8-scene.mjs` ran the test's own detector on a page with a live `java\nscript:` link, and it reported nothing for the link. No test clicks any link, so `window.__xss` cannot be set through an href.
- `:102` `JSON.stringify({ …, __proto__: { polluted: 1 } })` produces `{…}` **without** a `__proto__` key: an object literal's `__proto__:` sets the prototype, and stringify never serialises it (`node -e` confirms the output is `{}`). The prototype-pollution part of the test is inert.
- `:103` The poisoned v2 document has `course: evil`, so `checkDoc` rejects the whole document as invalid. No poisoned *event* ever reaches the store or a renderer. The test proves that a corrupt doc is ignored, not that hostile event fields are escaped.
- No coverage for: lint bypasses (SR-03), the Node loaders (SR-02), the practice path (SR-04), quota or import persistence (SR-05), unknown-event preservation (SR-06), or one malformed item (SR-08).
- `tests/browser-smoke.test.mjs` is a good runtime smoke test (first-try immutability, export/import round trip, scene error isolation, pause off-screen). But its import test uses only a tiny file, and it has no concurrency or quota test.

**Fix:** use the normalised URL check (`a.protocol === 'javascript:'` after inserting into the document), and click every `a[href]` in the probe with navigation intercepted. Write the poisoned storage as raw JSON text (`'{"__proto__":{"polluted":1}, …}'`) and keep the doc *valid* (`course: 'smoke-course'`) with hostile values only in event fields, then assert `({}).polluted === undefined` and no live markup. Add tests for each finding above; the PoC tables give the payloads.

### SR-08 (P3) One malformed practice item takes down a whole lesson's practice

**Where:** `practice.js:357-359`. `renderItem` calls `version(it)` (`:117-122`, `it.options.map((o) => ({ text: o.text, … }))`) **before** `LC.mount`, so its exception escapes the per-item isolation. On a lesson page it aborts `lessonPractice()` inside the `ready` callback.

**PoC** (`t9-isolation.mjs`): items `[{type:'choice', options:[null, {text:'ok', correct:true}]}, …two valid items]`. Lesson page: **0 items rendered, no error box, no count**, and the console showed `[learncraft] ready failed: TypeError … reading 'text'`. review.html ("practice anyway"): an uncaught `pageerror`. For comparison, a `fade` item with no `blanks` is isolated correctly: one error box, and the other 2 items render.

**Fix:** compute the version inside the mounted function (`LC.mount(host, …, () => { it.version = it.version || version(it); … })`) and make `version()` null-safe (`o && o.text`, as `store.itemVersion` already is). Also wrap the per-item loop in `buildReview`.

### SR-09 (P3) Unbounded log growth and O(n) cost on every write

**Where:** `store.js:316-334` (each `write()` re-reads, parses, validates and sorts the stored doc, then stringifies all of it; `base()` scans every id), `:414-433` (no cap on `events.length`), `:301-315` (compaction covers exposures only, and runs only after a quota error).

**PoC** (`t5-store.mjs`): mean `recordAttempt` time was 6 ms at 1 k events (0.29 MB), **71 ms at 10 k (2.9 MB)** and **249 ms at 30 k (8.8 MB)**, all on the main thread during a click. A 19 MB, 60 k-event import was accepted by `importJSON` in 614 ms.

**Fix:** cap imports (for example 20 k events and 5 MB of text, with a clear message). Keep an in-memory id set instead of `some()` scans. Skip the re-read and merge when no `storage` event has arrived since the last write (listen for `storage`, which also fixes SR-13's stale tabs). Batch writes in a microtask.

### SR-10 (P3) Scene terminal class attribute is not escaped

**Where:** `scene.js:89`: `'<span class="sc-o-' + (s.c || 'plain') + '">'`.

**PoC** (`t8-scene.mjs`): `term.set(0, 'out', [{ t: 'hello', c: 'gold"><img src=x onerror="window.__x=1">' }], 1)` ran without CSP and was blocked with it. Scenes are agent-written JavaScript, so this is consistency hardening, not a new trust boundary.

**Fix:** `esc(s.c || 'plain')`, or better, map `c` through the documented allow-list (`'' | 'gold' | 'ok' | 'muted'`).

### SR-11 (P3) The check tool runs a `playwright` package found in the workspace (and its parent folders) first

**Where:** `resolve.mjs:256-265, 284-305`. Search order: workspace `node_modules` (walking up to `/`), then the tools folder, then the script's folder, then the global root.

**PoC:** `planted/repo/node_modules/playwright/index.js` printed a message, and `loadPlaywright('<repo>/.learncraft')` returned `from: workspace` and **ran the planted code**. `workflows/repository-learning.md:15` offers `.learncraft/` inside the learner's repository, so that repository's `node_modules` (or any parent folder's) decides what runs when the agent runs the check.

**Fix:** prefer the pinned tools folder first, then the script folder. Accept a workspace or parent `node_modules` only with an explicit flag, and print the resolved path before loading it.

### SR-12 (P3, *theoretical*) Backslash hrefs survive sanitisation and resolve to `file://host/…`

**Where:** `core.js:47-51`. `<a href="\\attacker.example\share\x">` and `<a href="/\attacker.example/x">` are kept as relative and resolve to `file://attacker.example/share/x` (measured). On Windows that is a UNC path, and following it can trigger an SMB connection that leaks NTLM credentials. This was **not reproduced on Windows**. **Fix:** covered by the SR-01 rewrite (reject `\`, and reject any resolved URL with a host when its scheme is `file:`).

### SR-13 (P3) Loose date validation and stale views across tabs

`store.js:31` `isDate` accepts anything `Date.parse` accepts in 40 characters or fewer: `"1"` (2001-01-01 in V8) and `+275760-09-13T00:00:00.000Z` were both imported (`t5-store.mjs` #8). Far-future `review_session` events can push an objective's review out of reach. Only the learner's own import can do this, which is low risk, but the validation is inconsistent with the strictness elsewhere in the store. **Fix:** require `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/` and a sane range (2020 to now plus 1 day for imports).
Tabs: two stores that write in turn lose nothing, because of merge-on-write (10 of 10 events kept). But tab A's in-memory view stayed at 9 of 10 until its next write, because nothing listens for the `storage` event, so dashboards in other tabs show stale levels. **Fix:** listen for `storage` on the key, reload, and `notify()`.

---

## Tested and found sound

- **HTML escaping:** `html\`\`` escapes every interpolation, including attribute values (all quoted). No `html.raw` receives data except `sanitize()` output and constant strings. Every `course.js` string field (topic, mission, milestone label and canDo, lesson title and canDo, objectives, `strings` overrides) rendered as text on the dashboard, the lesson strip and review. Re-confirmed by reading `progress.js`, `practice.js` and `viz.js` (`tr()` results go through `esc` or `textContent`).
- **The sanitizer's tag allow-list:** `<svg>`/`<math>` (including `xlink:href`), `<img/src onerror>`, `<template>`, `<iframe srcdoc>`, `<object>`, `<noscript>` mXSS, `<form><math><mtext>…<mglyph><style>` mXSS, `<textarea>`/`<xmp>` raw-text tricks (re-serialised as escaped text), nested `<a>`, `target` and event attributes: all removed or neutralised. Parsing in an inert `<template>` means nothing loads during sanitisation. The bypass is limited to href schemes (SR-01, SR-12).
- **Links built from data:** `href(l.file)` and `revisit()` always prefix `LC.rootURL`, so `file: 'javascript:…'` becomes `file:///…/javascript:…` (also covered by the existing test). The `evidence` link is escaped.
- **JSON loading and import:** `safeParse` drops `__proto__`, `constructor` and `prototype` at every depth. `sanitizeEvent` copies only known fields into a fresh frozen object with type, enum, length and range checks. Raw-text `__proto__` and `constructor.prototype` payloads in an import did not pollute `Object.prototype` (`t5-store.mjs` #5). Course mismatch, a wrong `format` or `schemaVersion`, or non-array events are all rejected with bounded error messages. Re-importing does not duplicate events (also covered by the existing test).
- **Storage access:** every `getItem`/`setItem` is wrapped. Blocked storage gives a notice and practice still works (existing test). A newer-format doc is never overwritten *at load*. Store listeners are isolated.
- **Concurrency inside one store pair:** interleaved writes from two stores keep all events (merge by id on write).
- **CSP on `file://` (Chromium):** `script-src 'self'` blocked every `javascript:` URL, inline handler, `srcdoc` payload and injected attribute tried in this review. `connect-src 'none'` blocks `fetch` (existing test). The templates carry no inline script.
- **Error isolation:** components, scenes and practice items (other than SR-08) fail into an `.lc-error` box while the rest of the page keeps working. The `fade`-without-blanks case was verified, and so was the existing broken-scene test.
- **`check.mjs` filesystem:** pages come from directory listings, not from course data. Writes go only to `<ws>/.check/` with `basename`-derived names. `--only` is a substring filter. No shell is involved. `resolve.mjs` spawns `npm root -g` with fixed arguments (`shell` only on win32, still with fixed arguments).
- **`validate.mjs`:** Markdown and schema link checks only test whether files exist. Marketplace `source` rejects `..`. `spawnSync(node --check …)` takes repository file paths without a shell. No command injection was found.
- **Evidence paths in lint:** `learning-records/\d{4}-[^/]+\.md` cannot traverse on POSIX. On Windows a backslash could make lint check whether an arbitrary file exists, but the result is only an existence answer (*theoretical*).

## Threat model

| Asset | Threat | Mitigation in place | Residual risk (after this review) |
|---|---|---|---|
| Learner's progress, including typed recall answers, for **all** courses on the machine | Script in a course page (sanitised-data XSS, injected lesson markup) | `esc` / `html\`\``, the `sanitize` allow-list, template CSP `script-src 'self'` | SR-01 and SR-03 bypass the first two layers; only the CSP stops them, and lint does not require it. Any local HTML page can read and alter all progress (one `file://` origin) |
| Progress integrity and durability | Quota exhaustion by another course or page; oversized import | Read-merge-write, exposure compaction, storage notice at load | SR-05 silent mid-session loss and misleading import success; 5 M chars shared by all `file://` pages |
| Progress across versions and copies | An older `store.js` or a tab opened earlier writes over newer or unknown data | `newer-format` refused at load, corrupt backup | SR-06: unknown events deleted, newer doc overwritten, backup overwritten |
| Learner's machine (Node) | Hostile `course.js` or practice file executed by `check.mjs`, lint or validate | `vm` with `timeout` and `codeGeneration:false`, documented as not a boundary | SR-02: full `process` access and hangs. This turns a file write into code execution through a routinely approved command |
| Learner's machine (Node) | Planted `node_modules/playwright` | Pinned tools folder exists | SR-11: the workspace or its parent folders win the lookup |
| Local files | Data-chosen script paths | JSON-schema pattern (repository checkouts only) | SR-04: any local `.js` file runs on review and dashboard pages when the schema is absent; CSP `'self'` does not limit `file:` paths |
| Learner's privacy and network | Exfiltration or phishing by navigation | `connect-src 'none'`, no remote assets, `check.mjs` warns on third-party requests | Navigation (`<base>`, meta refresh, links) is not covered; there is no `base-uri` / `form-action` in the CSP (SR-03). UNC links on Windows (SR-12, theoretical) |
| The agent | Prompt injection through imported `progress/*.json` notes (up to 2000 chars per event) or fetched sources | Grounding rules: fetched or imported text is data | Theoretical. A shared export could carry instructions that the agent reads during review. Not tested |
| Availability of pages | Large logs, malformed items | Per-component isolation | SR-09 main-thread cost grows linearly; SR-08 one bad item blanks the practice |
