# Changelog

All notable changes to **Workdesk Operating System** are recorded here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_No unreleased changes._

## [1.4.0] — 2026-05-17

Tab activity indicator for the terminal pane. Adopts the binary
`.has-activity` pulse pattern from upstream `internetvin-terminal` and
extends it to the sidebar tab strip (upstream only wires it for
fullscreen tabs).

### Added

- **Terminal: tab activity pulse.** When stdout/stderr arrives at a
  terminal session that isn't currently focused, the session's tab
  pulses with the Obsidian accent color (1.2s ease-in-out) and shows a
  small dot before the label. Focusing the tab clears the pulse —
  the user has now seen it; the next backgrounded output will re-flag
  the tab. Works in both the sidebar tab strip and the fullscreen
  overlay. State is per-session, in-memory only; `WeakSet` storage
  lets destroyed sessions GC naturally. Implementation: zero vendor
  modifications — we attach an additive
  `process.stdout/stderr.on('data', …)` listener (Node EventEmitters
  allow multiple listeners), so we coexist with upstream's own
  `setActivityCallback` slot which the vendored `FullscreenManager`
  owns when fullscreen is open. A `MutationObserver` on each view's
  `tabBarEl` (childList only — narrow scope, no attribute observation)
  re-applies the `.has-activity` class whenever upstream's
  `renderTabs()` rebuilds the tab DOM, and clears it for whichever
  session has just become active. See `specs/semantic-tab-dots.md`
  (rev 5) for the full design and the pivot rationale through revs
  1–4 (which attempted multi-state detection and abandoned it after
  byte-stream parsing and screen-buffer scanning both proved
  unreliable against Ink's TUI rendering).

### Changed

- **`styles/obsidian-scope.css`** — adds `wd-tab-pulse` +
  `wd-tab-dot-pulse` keyframes and a single `.has-activity` rule
  scoped to both `.vin-terminal-tab` (sidebar) and `.vin-fs-tab`
  (fullscreen overlay). Pulse uses `var(--text-accent)` plus
  `rgba(var(--interactive-accent-rgb, 108, 142, 255), …)` so it
  follows the operator's Obsidian accent color with a sensible blue
  fallback. Hash bumped in
  `STATE.json.decisions.obsidian_scope_css_sha256`.

## [1.3.0] — 2026-05-17

Terminal pane rebuilt on top of the vendored [`workdesk-terminal`](https://github.com/BenaliHQ/workdesk-terminal)
plugin (a metadata-only rebrand of [`internetvin/internetvin-terminal`](https://github.com/internetvin/internetvin-terminal)
by Vin Verma, MIT). The original `src/terminal/*` subsystem and the
in-pane composer + mock statusbar were retired — see the migration notes
below.

### Changed

- **Terminal: foundation swap.** Replaced the hand-built `src/terminal/*`
  subsystem (13 files, ~3500 LOC) with a vendored copy of vin's single-file
  implementation at `src/vendor/workdesk-terminal/index.ts`. The vendored
  file is unmodified upstream code except for: (1) `VIEW_TYPE` renamed to
  `"workdesk-terminal"`, (2) the `TerminalPlugin` shell stripped — our
  `src/main.ts` owns the `Plugin` lifecycle, (3) `TerminalView`,
  `ShortcutsModal`, `OutputCaptureModal`, and `PTY_HELPER_PY` exported,
  (4) `writePtyHelper(vaultBase, manifestDir)` added so our `onload` can
  materialize the python helper script. Fork audit in
  `src/vendor/workdesk-terminal/NOTICE.md`.
- **Terminal: dropped the composer + mock statusbar.** The Cursor-style
  "Ask Claude — ⌘↵ to send" composer that lived below the xterm canvas,
  and the mock `opus 4.7 · 0m 0s · $0.00 · ready` statusbar, are gone.
  Users type directly into the active xterm session. Both surfaces were
  cramped in a sidebar and confusingly redundant once the PTY was real.
- **Terminal: real fullscreen.** vin's `FullscreenManager` ships a custom
  overlay with single / split-h / split-v / 2×2 grid layouts and a left
  sessions rail. Replaces our M1-M3 `.app.term-fullscreen` toggle that
  the M4 standard-plugin pattern silently broke.
- **Terminal: `[[` autocomplete typed into xterm.** vin's
  `WikiLinkAutocomplete` intercepts the bracket sequence inside the
  terminal canvas itself and offers vault notes. Our previous autocomplete
  was wired to the (now-removed) composer paperclip button.

### Added

- `Capture Terminal Output to Note` command (default `Cmd+Shift+S` upstream,
  unbound here — assign via Settings → Hotkeys). Opens vin's
  `OutputCaptureModal` so you can save recent xterm output to a vault note.
- `Add Terminal Bookmark`, `Next Terminal Bookmark`, `Previous Terminal
  Bookmark`, `Clear Terminal Bookmarks` commands. Right-gutter pips let
  you scroll back to flagged lines.
- `Show Terminal Shortcuts` command — opens the help modal listing every
  binding.

### Removed

- `src/terminal/{autocomplete,composer,dropzone,fullscreen,init,keymap,pty-helper,session,status-parser,statusbar,tabs,theme-bridge}.ts`.
- `src/views/TerminalView.ts`.
- The `.term-session-head`, `.workdesk-term-host`, `.workdesk-term-session`,
  `.term-composer`, `.terminal-statusbar`, `.term-fullscreen-btn`, and
  related rules in `styles/obsidian-scope.css`. The DOM these styled no
  longer exists.
- `tests/phase4a-2.spec.ts`, `tests/phase4b.spec.ts`, `tests/phase6a.spec.ts`
  (moved to `tests/_archive/*.archived`) — they unit-tested the deleted
  composer / statusbar / fullscreen toggle / standalone tab strip.
  `tests/phase4a-1.spec.ts` rewritten to import `PTY_HELPER_PY` from the
  vendor module; the PTY smoke test still runs.

### Migration notes

- Folder name unchanged: vault installs still resolve under
  `.obsidian/plugins/workdesk-operating-system/`.
- Saved settings unchanged: the new view registers under the same
  `workdesk-terminal` view type, so existing layouts re-attach.
- The vendored python helper is written to
  `<vault>/.obsidian/plugins/workdesk-operating-system/pty-helper.py` on
  every plugin load. Safe to delete; it's regenerated next start.

## [1.2.0] — 2026-05-16

Bundle release combining the post-M4 review-bot parity cleanup, the plugin
rename to "Workdesk Operating System", and four real-runtime bug fixes
surfaced in the spike-vault smoke test (`activeDocument.createDiv()`
regression, zone-pane scroll, file-activation vault paths, font 404s).

### Changed

- **Plugin renamed** from `WorkdeskOS Plugin` to `Workdesk Operating System` and
  id from `workdeskos-plugin` to `workdesk-operating-system` to comply with the
  Obsidian community-plugin guidelines (id can't end with `plugin`; display name
  can't end with `Plugin`).
- The repo's local directory was moved from `~/code/workdeskos-plugin/` to
  `~/code/workdesk-operating-system/`. The remote GitHub repo will follow.

### Fixed

- Resolved every violation reported by `eslint-plugin-obsidianmd` v0.2.8 +
  `typescript-eslint .recommendedTypeChecked` (440 errors → 0). This is
  community-review-bot parity.
- Removed default hotkeys (`Mod+K`, `Mod+Shift+M`, `Mod+Shift+F`) — they conflict
  with user-set hotkeys per Obsidian guidelines. Users can rebind from
  **Settings → Hotkeys**.
- Renamed `Open command palette` → `Open palette` so the command name doesn't
  contain `command` (Obsidian command-palette context is implicit).
- Replaced every `innerHTML` and `outerHTML` write with DOM APIs (`createEl`,
  `createDiv`, `appendChild`, `appendText`) so untrusted content can never reach
  a DOM-string sink. Custom SVG icons are built via `createElementNS` instead
  of string interpolation.
- Replaced `document` / `window` with Obsidian's `activeDocument` /
  `activeWindow` globals everywhere so popout windows render correctly.
- Replaced `Vault.adapter as { basePath?: string }` casts with a proper
  `FileSystemAdapter instanceof` narrow.
- Replaced inline element styles (`element.style.position`, `style.left`, etc.)
  with CSS classes whose values come from CSS variables set via
  `style.setProperty('--wd-x', ...)`. Now themeable.
- Switched YAML parsing from `js-yaml` to Obsidian's built-in `parseYaml`
  (eliminates a runtime dependency).

### Added

- `CHANGELOG.md` (this file).
- `tests/setup.ts` — vitest setup file that polyfills Obsidian's DOM extensions
  (`createDiv`, `createEl`, `empty`, `appendText`, `addClass`, etc.) on
  happy-dom so unit tests exercise the same code that runs in real Obsidian.
- `wsSvgEl(name, size)` helper in `src/icons.ts` that returns an SVG `Element`
  built via `createElementNS`, replacing the `innerHTML = wsSvg(...)` pattern at
  every callsite.

### Migration notes

Existing installs whose plugin folder is still named `workdeskos-plugin` will
be orphaned after this version. To preserve your settings:

1. Disable the old plugin in **Settings → Community plugins**.
2. Copy `data.json` from the old folder to the new one:
   ```bash
   cp <vault>/.obsidian/plugins/workdeskos-plugin/data.json \
      <vault>/.obsidian/plugins/workdesk-operating-system/data.json
   ```
3. Remove the old plugin folder.
4. Reload Obsidian and enable **Workdesk Operating System** in Community
   plugins.

If you don't care about preserving settings, just enable the new plugin and
delete the old folder.

## [1.1.0] — 2026-05-15

### Changed

- **Architecture pivot** from full-surface-takeover (v1.0.0) to the standard
  Obsidian plugin pattern: `addRibbonIcon` × 12, `ZoneView` registered as a
  left-sidebar `ItemView`, `TerminalView` on-demand in the right sidebar, no
  global `.app` mutation. Resolves a v1.0.0 layout regression that broke every
  vault except the one the plugin was built against.
- Build-time CSS scoping (`scripts/scope-app-css.mjs`) strips destructive
  global selectors (`body`, `html`, `.app`) from `app.css` before bundling so
  the verbatim design-handoff CSS contract stays SHA-locked while no longer
  fighting Obsidian's chrome.

### Fixed

- Tooltip contrast (cream-on-cream tokens collided with white text on dark
  tooltips).
- Zone-card collapse mutation was reverted on every parent re-render.
- Tree-row folder click now correctly toggles `.tree` sibling insertion.
- Focus mode targets Obsidian's native chrome classes instead of the v1.0.0
  custom-shell classes that no longer render.
- Settings modal stayed invisible because the scoped `.modal { opacity: 0 }`
  rule was bleeding through to Obsidian's native `.modal-container .modal`.

## [1.0.0] — 2026-05-13

### Added

- Initial build via three `/goal` mega-sessions (M1, M2, M3) following the
  Claude Design handoff at `_inputs/design-handoff/`.
- 7 zones, 12 ribbon icons, ZoneView, TerminalView, HtmlView, command palette
  (`⌘K`), quick capture (`⌘⇧M`), focus mode, settings tab, vendored
  workdesk-terminal at SHA `297fea0a2194c97426b67a8c9040c73035b8ce65`.
- 116/116 vitest across 11 spec files.
