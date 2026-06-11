# Plan 002: Delete the dead vendored terminal copy at src/vendor/terminal/

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 725149a..HEAD -- src/vendor/terminal scripts/verify.mjs STATE.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED (verify-script and STATE.json coupling; the deletion itself is trivial)
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `725149a`, 2026-06-10

## Why this matters

The repo contains two vendored terminal implementations. Only one is real:
`src/vendor/workdesk-terminal/index.ts` is what `src/main.ts:18` imports. The other,
`src/vendor/terminal/main.ts` (2,103 lines plus a LICENSE), is imported by **nothing**
— it's a leftover from an earlier vendoring strategy that was superseded (see
`STATE.json` decision `terminal_strategy`: "vendored vin (BenaliHQ/workdesk-terminal
@ 297fea0a)"). Dead vendored code is not free: it contains real anti-patterns
(e.g. `detachLeavesOfType` in `onunload` at `src/vendor/terminal/main.ts:2101`) that
trip up audits and code search, it inflates every editor/grep/audit pass by ~20% of
src LOC, and `scripts/verify.mjs` still SHA-pins it as if it were load-bearing.
After this plan the dead copy, its verify checks, and its STATE.json pin are gone,
and the build output is byte-identical.

## Current state

- `src/vendor/terminal/` — contains `main.ts` (2,103 lines) and `LICENSE`. Zero
  importers: `grep -rn "vendor/terminal" src --include="*.ts" | grep -v "src/vendor"`
  returns nothing. (The live terminal lives at `src/vendor/workdesk-terminal/` —
  note the different directory name.)
- `scripts/verify.mjs` — phase `phase4a1()` (around lines 303-335) has three checks
  that reference the dead copy:

```js
// scripts/verify.mjs:307-330 (abridged)
  check('vendored terminal main.ts SHA matches STATE', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const expected = state.decisions.vendored_terminal_main_sha256;
    const actual = sha256('src/vendor/terminal/main.ts');
    ...
  });

  check('vendored main.ts preserves required class declarations', () => {
    const src = readFile('src/vendor/terminal/main.ts');
    const required = ['class TerminalSession', 'class WikiLinkAutocomplete', 'class FullscreenManager', 'PTY_HELPER_PY'];
    ...
  });

  check('vendored LICENSE present', () => {
    if (!exists('src/vendor/terminal/LICENSE')) throw new Error('missing src/vendor/terminal/LICENSE');
    ...
  });
```

  The same `phase4a1()` also contains a "TypeScript strict compiles" check
  immediately after — that check is about the whole repo and MUST be kept.

- `STATE.json` — `decisions.vendored_terminal_main_sha256` (line ~101) pins the dead
  file's SHA. `STATE.json` is validated against a zod schema elsewhere in the
  scripts (`STATE.log` records "STATE.json validates against zod schema — schema=2").
  Locate the schema before editing: `grep -rn "vendored_terminal_main_sha256" scripts/`.
- `src/vendor/workdesk-terminal/` — the LIVE terminal. Out of scope; do not touch.

## Commands you will need

| Purpose       | Command          | Expected on success |
|---------------|------------------|---------------------|
| Typecheck     | `pnpm typecheck` | exit 0              |
| Tests         | `pnpm test`      | all pass            |
| Lint          | `pnpm lint`      | exit 0              |
| Build         | `pnpm build`     | exit 0              |
| Verify script | `pnpm verify`    | exit 0, all phases pass |

## Scope

**In scope** (the only files you should modify/delete):
- `src/vendor/terminal/` (delete the directory)
- `scripts/verify.mjs` (remove only the three dead-copy checks)
- `STATE.json` (remove only the `vendored_terminal_main_sha256` decision key, and
  only if the zod schema permits — see Step 4)

**Out of scope** (do NOT touch, even though they look related):
- `src/vendor/workdesk-terminal/` — the live terminal.
- `pty-helper.py` at repo root — shipped asset used by the live terminal.
- `STATE.json` keys other than `vendored_terminal_main_sha256` (the
  `vendored_workdesk_terminal_*` SHAs guard the LIVE copy).
- `STATE.md`, `STATE.log` — historical records; leave them.

## Git workflow

- Conventional commits to `main` (example from log: `fix: revert v1.7.1 borderless callout + add visual-verification gate`).
- One commit: `chore: remove dead vendored terminal (superseded by workdesk-terminal)`.
- Do NOT push unless the operator instructed it.

## Steps

### Step 1: Prove the directory is dead (gate for everything else)

```bash
grep -rn "vendor/terminal" src scripts esbuild.config.mjs --include="*" | grep -v "src/vendor/terminal" | grep -v "workdesk-terminal" | grep -v "verify.mjs"
```

**Verify**: zero output. Any hit = a live reference = STOP.

### Step 2: Build a baseline artifact for byte-identity comparison

```bash
pnpm build && shasum main.js | tee /tmp/plan002-mainjs-before.sha
```

**Verify**: exit 0; SHA recorded.

### Step 3: Remove the three dead checks from scripts/verify.mjs

In `phase4a1()`, delete exactly these three `check(...)` blocks:
1. `'vendored terminal main.ts SHA matches STATE'`
2. `'vendored main.ts preserves required class declarations'`
3. `'vendored LICENSE present'`

Keep the `'TypeScript strict compiles'` check and the rest of the phase intact.
If removing the three checks leaves `phase4a1()` with only the tsc check, that's fine
— leave the phase in place (other phases may be numbered/reported positionally).

**Verify**: `node scripts/verify.mjs` → exits 0 (the dead-file checks no longer run;
nothing else changed yet).

### Step 4: Remove the STATE.json pin — schema permitting

1. Find the schema: `grep -rn "vendored_terminal_main_sha256" scripts/ src/ *.mjs`
2. If the schema marks the key **optional** (or validates `decisions` loosely, e.g.
   `z.record(...)` / `.passthrough()`): delete the
   `"vendored_terminal_main_sha256": "..."` line from `STATE.json`.
3. If the schema marks it **required**: do NOT fork the schema; this is a STOP
   condition — report that the schema needs a deliberate migration.

**Verify**: `node scripts/verify.mjs` → exit 0 (including its STATE schema check).

### Step 5: Delete the directory

```bash
git rm -r src/vendor/terminal
```

(Using `git rm` keeps the deletion reviewable; no backup needed — git history retains
the content.)

**Verify**: `ls src/vendor/` → only `workdesk-terminal`.

### Step 6: Full gate + byte-identity check

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm verify
shasum main.js
```

**Verify**: all exit 0; the `main.js` SHA equals the Step 2 baseline (dead code was
never bundled, so output must be byte-identical). If the SHA differs → STOP.

## Test plan

No new tests — this plan deletes unreferenced code. The byte-identity check in
Step 6 is the regression proof.

## Done criteria

- [ ] `src/vendor/terminal/` does not exist
- [ ] `grep -rn "vendor/terminal" src scripts STATE.json | grep -v workdesk-terminal` returns no matches
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm verify` all exit 0
- [ ] `main.js` SHA identical before/after (Steps 2 vs 6)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's grep finds any live reference to `src/vendor/terminal/`.
- The STATE.json zod schema requires `vendored_terminal_main_sha256` (Step 4.3).
- The post-deletion `main.js` SHA differs from the baseline (Step 6) — that means
  the "dead" code was reachable after all.
- `pnpm verify` fails on any check other than the three you removed.

## Maintenance notes

- The live terminal's provenance is documented in
  `src/vendor/workdesk-terminal/NOTICE.md`; future vendoring updates go there.
- Reviewer should scrutinize: that ONLY three checks left `verify.mjs`, and that no
  `STATE.json` key other than the one named was touched.
- Deferred (deliberately): auditing `src/vendor/workdesk-terminal/index.ts` for the
  same `detachLeavesOfType`-class anti-patterns — a quick grep during this audit
  found none in the live copy, but a focused pass on the live vendored code was out
  of the quick-audit's scope.
