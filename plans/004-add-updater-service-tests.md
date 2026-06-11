# Plan 004: Put the self-updater under test (version compare + abort paths + happy path)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 725149a..HEAD -- src/services/updater.ts tests/stubs/obsidian.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW — tests only, plus one export-keyword source change
- **Depends on**: plans/003-bump-vulnerable-dev-deps.md (write tests once, on the upgraded stack)
- **Category**: tests
- **Planned at**: commit `725149a`, 2026-06-10

## Why this matters

`src/services/updater.ts` (185 lines) is the plugin's self-update path: it fetches
the latest GitHub Release, compares versions, downloads `main.js` /
`manifest.json` / `styles.css`, and **overwrites the live plugin install on disk**
before prompting a reload. It is the highest-blast-radius code in the repo — a bug
ships a broken plugin to every operator — and it currently has zero test coverage
(no spec references it). After this plan, the version comparator and every
abort/happy path of `checkAndUpdate` are covered by unit tests.

## Current state

- `src/services/updater.ts` — the entire updater. Structure:
  - `compareVersions(a, b)` at lines 34-45 — **module-private** (not exported):

```ts
// src/services/updater.ts:35-45
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((s) => Number.parseInt(s, 10));
  const pb = b.split('.').map((s) => Number.parseInt(s, 10));
  for (let i = 0; i < 3; i++) {
    const ai = pa[i] ?? 0;
    const bi = pb[i] ?? 0;
    if (Number.isNaN(ai) || Number.isNaN(bi)) return 0;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}
```

  - `checkAndUpdate(plugin: Plugin)` at lines 47-185, sequenced as numbered comment
    blocks: (1) fetch release metadata via `requestUrl`, toast on failure and return;
    (2) return early if `compareVersions(latest, current) <= 0`; (3) abort if any of
    `['main.js', 'manifest.json', 'styles.css']` missing from release assets;
    (4) download each asset via `requestUrl`, abort on failure; (5) abort if
    downloaded manifest.json is invalid JSON or its `version` ≠ release tag;
    (6) write the three files via `plugin.app.vault.adapter.write(`${pluginDir}/${name}`, ...)`,
    abort if `plugin.manifest.dir` unset or write throws; (7) count open terminal
    leaves + `findRecentAiSessions()`, and if sessions exist write a resume note to
    `gtd/inbox/` (non-fatal on failure); (8) success toast + `new UpdateReadyModal(...).open()`.

- Imports the executor must neutralize or use:
  - `requestUrl` from `'obsidian'` — already test-controllable: the stub at
    `tests/stubs/obsidian.ts:296-302` exposes
    `__setRequestUrlMock(fn)` / `requestUrl(p)`. The `obsidian` module is aliased to
    that stub by `vitest.config.ts` `resolve.alias`.
  - `showToast` from `'../components/Toast'` — renders into happy-dom; safe to let
    run for real (other specs do).
  - `UpdateReadyModal` from `'../modals/UpdateReady'` — mock with `vi.mock` to a
    constructor spy exposing `open()`.
  - `findRecentAiSessions`, `formatResumeNote` from `'./ai-sessions'` — reads the
    real filesystem (`node:fs`); MUST be mocked with `vi.mock` (default: sessions = `[]`).
  - `VIEW_TYPE_WORKDESK_TERMINAL` from `'../constants'` — harmless constant.

- The fake plugin object the tests need (the function only touches these members):
  `plugin.manifest.version`, `plugin.manifest.dir`,
  `plugin.app.vault.adapter.{write, exists, mkdir}`,
  `plugin.app.workspace.getLeavesOfType(...)` → `[]`. Build it from the stub's `App`
  (`tests/stubs/obsidian.ts:42`) or as a plain object cast via
  `as unknown as Plugin` — match how `tests/phase5b.spec.ts` constructs `new App()`
  and reaches into `app.vault` with `as unknown as { _createCalls: ... }`.

- Conventions: specs in `tests/*.spec.ts`, vitest `describe`/`it`, stub helpers
  prefixed `__`/`_`. Structural exemplar for service-with-mocked-IO tests:
  `tests/infisical-fetch.spec.ts`.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Typecheck | `pnpm typecheck`                 | exit 0              |
| One spec  | `pnpm test -- tests/updater.spec.ts` | new tests pass  |
| All tests | `pnpm test`                      | all pass            |
| Lint      | `pnpm lint`                      | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/services/updater.ts` — ONLY adding `export` to `compareVersions` (no logic change)
- `tests/updater.spec.ts` (create)
- `tests/stubs/obsidian.ts` — only if a member the updater touches is missing from
  the stub (additive only)

**Out of scope** (do NOT touch):
- Any behavior change in `updater.ts` — even if a test reveals a bug. A discovered
  bug is a STOP condition (report it; it becomes its own plan).
- `src/modals/UpdateReady.ts`, `src/services/ai-sessions.ts`, `src/components/Toast.ts`.

## Git workflow

- Conventional commits to `main`. One commit:
  `test: cover updater version compare and checkAndUpdate abort/happy paths`.
- Do NOT push unless the operator instructed it.

## Steps

### Step 1: Export the comparator

In `src/services/updater.ts:35`, change `function compareVersions` to
`export function compareVersions`. Nothing else.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Scaffold tests/updater.spec.ts

Create the spec with: `vi.mock('../src/services/ai-sessions', ...)` returning
`findRecentAiSessions: () => []` and a trivial `formatResumeNote`;
`vi.mock('../src/modals/UpdateReady', ...)` exposing a constructor spy whose
instances have an `open()` spy. Import `__setRequestUrlMock` from the obsidian stub
and reset it (plus `vi.clearAllMocks()`) in `beforeEach`. Add a helper that builds
the fake plugin (manifest `{ version: '1.8.1', dir: '.obsidian/plugins/wd' }`, an
adapter recording `write` calls, workspace returning `[]` leaves) and a helper that
builds a release payload `{ tag_name, html_url, assets: [{name, browser_download_url}] }`.

**Verify**: `pnpm test -- tests/updater.spec.ts` → file runs (0 or placeholder tests, no import errors).

### Step 3: compareVersions unit tests

Cases (table-test them):
- `('1.8.1', '1.8.0')` > 0; `('1.8.0', '1.8.1')` < 0; `('1.8.1', '1.8.1')` = 0
- Multi-digit segments: `('1.10.0', '1.9.9')` > 0 (string compare would get this wrong)
- Length mismatch: `('1.8', '1.8.0')` = 0
- Malformed: `('abc', '1.0.0')` = 0 (documents the "treat unparseable as equal" behavior)

**Verify**: `pnpm test -- tests/updater.spec.ts` → these pass.

### Step 4: checkAndUpdate abort paths

One `it` per path; each asserts **no `adapter.write` call** and (where listed) the modal not constructed:
1. Metadata fetch rejects → returns without writing.
2. Up to date: release tag `v1.8.1` vs current `1.8.1` → no download (assert the
   requestUrl mock was called exactly once — metadata only).
3. Release missing `styles.css` from assets → abort.
4. Asset download rejects (metadata resolves, second call rejects) → abort.
5. Downloaded `manifest.json` is invalid JSON (`'not json'`) → abort.
6. Manifest/tag mismatch (manifest version `1.9.1`, tag `v1.9.0`) → abort.
7. `plugin.manifest.dir` undefined → abort without writing.
8. `adapter.write` throws → function returns (no throw escapes), modal not opened.

**Verify**: `pnpm test -- tests/updater.spec.ts` → all pass.

### Step 5: Happy path

Release `v1.9.0` with all three assets; asset bodies `'JS'`,
`'{"version":"1.9.0"}'`, `'CSS'`. Assert: three `adapter.write` calls with paths
`.obsidian/plugins/wd/main.js|manifest.json|styles.css` and matching bodies;
`UpdateReadyModal` constructed once with `{ fromVersion: '1.8.1', toVersion: '1.9.0', sessionCount: 0, resumeNotePath: null, terminalCount: 0 }`
(match the real option names from `updater.ts:177-184`) and `open()` called.

Then one resume-note variant: `findRecentAiSessions` mock returns one session and
`formatResumeNote` returns `{ filename: 'resume.md', content: 'x' }` → assert an
additional write to `gtd/inbox/resume.md` and `resumeNotePath: 'gtd/inbox/resume.md'`
passed to the modal.

**Verify**: `pnpm test -- tests/updater.spec.ts` → all pass.

### Step 6: Full gate

```bash
pnpm typecheck && pnpm lint && pnpm test
```

**Verify**: all exit 0; total test count = previous count + new tests.

## Test plan

This plan IS the test plan (Steps 3-5): ~6 comparator cases, 8 abort paths, 2 happy
paths. Model file structure after `tests/infisical-fetch.spec.ts`.

## Done criteria

- [ ] `tests/updater.spec.ts` exists with ≥15 passing tests
- [ ] `git diff src/` shows only the `export` keyword added at `updater.ts:35`
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A test reveals actual updater misbehavior (e.g. a write happening on an abort
  path, or `compareVersions` violating a Step 3 expectation). Do NOT change
  `updater.ts` logic — report the bug.
- The obsidian stub lacks a member the updater touches and the addition wouldn't be
  strictly additive.
- `showToast` cannot run under the test DOM (would force mocking beyond what this
  plan specifies) after a reasonable attempt.

## Maintenance notes

- If the updater ever gains pre-release/build-metadata version handling
  (`1.9.0-beta.1`), Step 3's table is where the new cases land.
- Reviewer should scrutinize: assertions on adapter.write ORDER are not required
  (the loop writes in `ASSET_NAMES` order today; don't over-pin).
- Deferred: integration-style test of the reload prompt flow (modal interaction) —
  UI-level, low value vs. cost here.
