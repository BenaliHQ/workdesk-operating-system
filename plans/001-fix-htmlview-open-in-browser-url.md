# Plan 001: Fix the HtmlView "Open in browser" button so it opens the actual file

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 725149a..HEAD -- src/views/HtmlView.ts tests/stubs/obsidian.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `725149a`, 2026-06-10

## Why this matters

`HtmlView` renders `.html`/`.htm` vault files in a sandboxed iframe and shows an
"Open in browser ↗" button. The button builds its URL as `'file://' + file.path`,
but `TFile.path` in Obsidian is **vault-relative** (e.g. `atlas/page.html`), so the
result is `file://atlas/page.html` — the URL parser treats `atlas` as a hostname
and the path resolves to nothing. Filenames with spaces (common in this vault:
`2026.05.13 Capture - test.md` style naming) are additionally unencoded. The button
is effectively dead for every file. After this plan, the button opens the file in
the OS default browser via a correctly encoded absolute `file://` URL.

## Current state

- `src/views/HtmlView.ts` — the whole view; ~63 lines. The bug is in `renderChip()`:

```ts
// src/views/HtmlView.ts:56-61
    const btn = createEl('button');
    btn.className = 'btn ghost';
    btn.type = 'button';
    btn.textContent = 'Open in browser ↗';
    btn.addEventListener('click', () => window.open('file://' + file.path));
    chip.appendChild(btn);
```

- The plugin is **desktop-only** (`manifest.json` has `"isDesktopOnly": true`), and
  the repo already imports Node builtins directly (see `src/services/vault-scan.ts:10`
  — `import * as fsNs from 'node:fs';`). Importing `node:url` is consistent with
  repo convention.
- The vault adapter on desktop is Obsidian's `FileSystemAdapter`, which has
  `getBasePath(): string` (absolute vault root) and `getFullPath(normalizedPath: string): string`
  (absolute path for a vault-relative path). Narrow with `instanceof FileSystemAdapter`.
- Tests stub the `obsidian` module at `tests/stubs/obsidian.ts` (wired via the
  `resolve.alias` in `vitest.config.ts`). The stub already exports a minimal
  `FileSystemAdapter`:

```ts
// tests/stubs/obsidian.ts:246-248
export class FileSystemAdapter {
  getBasePath(): string { return ''; }
}
```

- Repo conventions: plain TS, no React; comments explain constraints, not mechanics;
  tests are vitest specs in `tests/*.spec.ts` using the obsidian stub. A good small
  exemplar spec is `tests/zone-card-file.spec.ts`.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Install   | `pnpm install`   | exit 0              |
| Typecheck | `pnpm typecheck` | exit 0, no errors   |
| Tests     | `pnpm test`      | all pass            |
| Lint      | `pnpm lint`      | exit 0              |
| Build     | `pnpm build`     | exit 0, writes `main.js` |

## Scope

**In scope** (the only files you should modify):
- `src/views/HtmlView.ts`
- `tests/stubs/obsidian.ts` (extend the `FileSystemAdapter` stub only)
- `tests/html-view-url.spec.ts` (create)
- `esbuild.config.mjs` (add `'node:url'` and `'url'` to the `external` array —
  discovered during execution: the bundle build fails without it; matches the
  existing pattern used for `node:fs`/`node:os`/`node:path`/`node:child_process`)

**Out of scope** (do NOT touch, even though they look related):
- The iframe/sandbox logic in `HtmlView.onLoadFile` — security-sensitive and working.
- `src/services/vault-scan.ts` — only cited as a convention exemplar.
- Any change to how the view registers or which extensions it handles.

## Git workflow

- The repo commits directly to `main` with conventional-commit messages
  (recent examples: `fix: remove walkTree depth cap so deep zone folders can be opened`,
  `ci: bump release workflow actions to Node 24-native majors`).
- One commit for this plan: `fix: build absolute encoded file:// URL for HtmlView open-in-browser`.
- Do NOT push unless the operator instructed it.

## Steps

### Step 1: Add an exported URL helper to HtmlView.ts

In `src/views/HtmlView.ts`, add at module level (exported so it can be unit-tested):

```ts
import { FileSystemAdapter, FileView, TFile, WorkspaceLeaf } from 'obsidian';
import { pathToFileURL } from 'node:url';

/** Absolute, percent-encoded file:// URL for a vault file, or null when the
 *  adapter isn't the desktop FileSystemAdapter (e.g. tests, mobile). */
export function fileUrlForVaultFile(adapter: unknown, vaultRelativePath: string): string | null {
  if (!(adapter instanceof FileSystemAdapter)) return null;
  return pathToFileURL(adapter.getFullPath(vaultRelativePath)).href;
}
```

Note the import line replaces the existing
`import { FileView, TFile, WorkspaceLeaf } from 'obsidian';` at `src/views/HtmlView.ts:8`.

**Verify**: `pnpm typecheck` → may fail only because `getFullPath` is missing from
the stub (fixed in Step 3). If it fails for any other reason, treat as a STOP.

### Step 2: Use the helper in renderChip

Replace the click handler at `src/views/HtmlView.ts:60`:

```ts
    btn.addEventListener('click', () => {
      const url = fileUrlForVaultFile(this.app.vault.adapter, file.path);
      if (url) window.open(url);
    });
```

**Verify**: `grep -n "'file://' + file.path" src/views/HtmlView.ts` → no matches.

### Step 3: Extend the FileSystemAdapter test stub

In `tests/stubs/obsidian.ts`, extend the existing stub class (lines 246-248) to:

```ts
export class FileSystemAdapter {
  basePath = '';
  getBasePath(): string { return this.basePath; }
  getFullPath(normalizedPath: string): string {
    return `${this.basePath}/${normalizedPath}`;
  }
}
```

Do not change any other stub export.

**Verify**: `pnpm typecheck` → exit 0.

### Step 4: Write the unit test

Create `tests/html-view-url.spec.ts` (model structure after `tests/zone-card-file.spec.ts`):

- `fileUrlForVaultFile` returns null for a non-FileSystemAdapter adapter (pass `{}`).
- With a stub `FileSystemAdapter` whose `basePath = '/Users/op/vault'`:
  - `fileUrlForVaultFile(adapter, 'atlas/page.html')` → `'file:///Users/op/vault/atlas/page.html'`.
  - A path with spaces, e.g. `'atlas/My Page.html'` → URL contains `My%20Page.html` and starts with `file:///`.
  - A path with `#`, e.g. `'atlas/a#b.html'` → URL contains `a%23b.html`.

**Verify**: `pnpm test` → all pass, including the 4 new assertions.

## Test plan

Covered by Step 4. No integration test — the only behavior change is the URL string,
and `window.open` is environment-owned.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0; `tests/html-view-url.spec.ts` exists and passes
- [ ] `grep -rn "'file://' +" src/` returns no matches
- [ ] `pnpm build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `src/views/HtmlView.ts:60` no longer matches the excerpt (drifted).
- ESLint rejects the `node:url` import (rule `obsidianmd/no-nodejs-modules` or
  similar). Do not add an eslint-disable without reporting first.
- `pnpm test` shows failures in specs you did not create after Step 3's stub change
  — the stub edit must be strictly additive; a failure means something depended on
  the old shape.

## Maintenance notes

- If the plugin ever drops `isDesktopOnly`, the `node:url` import and
  `FileSystemAdapter` narrowing must be revisited (mobile has neither).
- Reviewer should scrutinize: that the button silently no-ops (rather than throws)
  when the adapter isn't a `FileSystemAdapter`.
- Deferred: hiding the button entirely on non-desktop adapters — pointless while
  the plugin is desktop-only.
