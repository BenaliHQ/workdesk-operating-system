# Changelog

All notable changes to **Workdesk Operating System** are recorded here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **In-plugin self-update command.** New command `Workdesk: Check for
  plugin updates` (palette: <kbd>Cmd</kbd> + <kbd>P</kbd>) fetches the
  latest GitHub Release, compares against the installed version, downloads
  `main.js` + `manifest.json` + `styles.css` directly into the plugin
  folder, and opens a reload prompt. Self-contained — does not depend on
  BRAT. Uses Obsidian's `requestUrl` (Electron main-process fetch) so
  GitHub asset redirects resolve correctly. Verifies the downloaded
  manifest version matches the release tag before overwriting, so a
  half-built release can't corrupt the install.

## [1.6.5] — 2026-05-20

### Fixed

- **Zone card count showed recursive descendants instead of immediate
  children.** The Projects card (and every other zone card) summed every
  file under the folder, displaying e.g. "220" when only 6 subfolders sat
  directly under it. The card now answers "what's directly in this zone
  object?" — files + folders one level deep. Nested folder rows in the
  expanded tree continue to show their recursive subtree counts, so the
  "how big is this subfolder" signal isn't lost.

## [1.6.4] — 2026-05-19

### Fixed

- **Daily-note defaults aligned with WorkDesk OS vault layout.** Fresh
  installs now default to `dailyTemplatePath: config/templates/daily-note.md`
  (was `daily.md`) and `dailyFilenameFormat: YYYY.MM.DD [Daily Note]` (was
  `YYYY-MM-DD`), matching the canonical template shipped by the WorkDesk OS
  skills repo. Existing installs are unaffected; only defaults change.
- **Recent daily notes list now honors the configured folder and
  filename format.** `loadRecentDailyNotes()` previously hard-coded
  `personal/daily/YYYY-MM-DD.md`, leaving the Calendar's "Recent daily
  notes" section empty for any operator using a different filename
  pattern. It now takes the folder from settings, accepts any filename
  format that contains a `YYYY?MM?DD` segment (`-`, `.`, `_`, or `/`
  separators), and falls back to file mtime when no date can be
  extracted from the basename.

## [1.6.3] — 2026-05-18

### Fixed

- **Daily template silently failing when the vault file index doesn't
  see it.** `resolveDailyTemplate()` now falls back to
  `app.vault.adapter.exists() / .read()` when `getAbstractFileByPath()`
  returns null. The vault index can be stale when files are created
  outside Obsidian or during the initial scan race; the adapter reads
  directly from disk and recovers the template. Behavior is unchanged
  when the index already sees the file.
- **Error toast disappearing too fast to read.** Both daily-template
  error toasts (template-not-found and read-failed) now stay visible
  for 12 seconds instead of the 4-second default. Operator can read
  the path being looked up and fix the setting without re-triggering
  the error.

## [1.6.2] — 2026-05-17

### Added

- **Rename prompt on create.** Right-click → New note or New folder
  now opens a small rename modal immediately after the file/folder is
  created, with the default name pre-selected. Mirrors Obsidian's File
  Explorer "create → inline rename" UX. Enter commits the rename via
  `app.fileManager.renameFile()`; Escape (or the Cancel button)
  leaves the default name in place. Names that would collide with an
  existing file/folder are flagged inline rather than silently failing.

## [1.6.1] — 2026-05-17

### Added

- **Daily note template path in the settings UI.** Settings → General
  → "Daily note template path" now exposes `vault.dailyTemplatePath`,
  which previously was only editable by hand-editing `data.json`. The
  description lists the supported variables (`{{date}}`, `{{date:FORMAT}}`,
  `{{time}}`, `{{time:FORMAT}}`, `{{title}}`) so operators don't have to
  cross-reference the templates section.

## [1.6.0] — 2026-05-17

### Added

- **Daily note filename format setting.** New
  `vault.dailyFilenameFormat` setting (Settings → General → Daily note
  filename format). Moment-style tokens `YYYY MM DD HH mm ss`
  substitute; anything else passes through literally. Default
  `YYYY-MM-DD` reproduces v1.5.x behavior. Supports patterns like
  `YYYY.MM.DD Daily Note` for vaults that use dotted dates with a
  human-readable suffix. `openDaily()` reads the setting and routes
  the resulting filename through the shared template-format helper.
  Template `{{title}}` continues to receive the canonical
  `YYYY-MM-DD` date string regardless of the filename pattern, so
  templates stay portable across vaults with different filename
  conventions.

## [1.5.1] — 2026-05-17

### Fixed

- **Zone panes empty on BRAT installs.** The scanner needed
  `fixtures/zones.yaml` + `fixtures/object-icons.yaml` from the plugin
  folder, but BRAT only installs the flat release assets (no
  subdirectories). Result: any non-symlinked install loaded with empty
  zones across the board. Fixed by inlining both fixture YAML files
  into `main.js` at build time via esbuild's text loader (~6.4KB).
  Vault overrides at `<vault>/config/zones.yaml` still win when
  present; the inlined fallback only kicks in when neither the vault
  override nor a plugin-folder copy exists.

## [1.5.0] — 2026-05-17

Zone-pane filesystem honesty, Obsidian-native settings, templates engine,
and a right-click-only creation/deletion model.

### Added

- **Templates: insert-template command + shared variable engine.** New
  `workdesk:templates:insert` editor command opens a SuggestModal over
  every `.md` under the configured templates folder. Variables
  `{{date}}`, `{{date:FORMAT}}`, `{{time}}`, `{{time:FORMAT}}`, `{{title}}`
  substituted at the cursor. Format tokens: `YYYY MM DD HH mm ss`.
  Settings → Templates section with folder + date/time format fields.
- **Daily note: authoritative path.** `openDaily()` no longer defers to
  Daily Notes core or Periodic Notes. Resolves
  `<vault.dailyNoteFolder>/YYYY-MM-DD.md`, creates the folder if missing,
  applies the shared template engine to `vault.dailyTemplatePath`, then
  opens the new note.
- **Per-zone folder settings.** `settings.zones.folders` lets the
  operator remap any zone's root folder (e.g. `atlas → archive/atlas`).
  Scanner applies the remap when resolving zone objects; settings UI
  debounces a live re-scan when the field changes.
- **Live zone refresh on vault events.**
  `vault.on('create'|'delete'|'rename')` triggers a 250ms-debounced
  re-scan that pushes refreshed zones into every open `ZoneView`. New
  folders or notes created from anywhere (Obsidian's file explorer,
  terminal, another plugin) appear in the zone pane without a manual
  reload.
- **Filesystem-first zone scanner.** The zone pane now walks the actual
  filesystem under each zone's root and emits a card for every direct
  child (folder or `.md`/`.json` file). The manifest is treated as an
  overlay — it can rename / re-icon a matching entry but no longer
  invents folders that don't exist, nor hides folders that do.
- **Right-click context menu on zone hero, cards, and tree rows.**
  Folder cards prepend `New note in <X>` + `New folder in <X>` items;
  every menu layers Obsidian's native file-menu contributions
  (Bookmarks, Copy path, Reveal, plugin extensions) in the middle; every
  menu ends with an explicit Delete that calls
  `app.fileManager.trashFile(target)`.
- **Auto-numbered instant create.** `plugin.createNewNoteIn(parent)` and
  `plugin.createNewFolderIn(parent)` create `Untitled.md` / `Untitled`
  with collision numbering (`Untitled 1`, `Untitled 2`, …). Notes open
  in the workspace; folders surface via the live-refresh listener.
- **First-letter initial chips on zone cards.** Replaces the SVG icon
  with the uppercased first character of the title.
- **Per-zone management label in hero.** Atlas → Object Management,
  GTD → Action Management (with all-caps title), Intel → Signal
  Management, Personal → Practice Management, System → Source
  Management, Config → Set-up Management, Files → File Management.
- **`sliders` glyph for the Config zone ribbon + hero.** Distinct from
  the plugin-settings `gear` icon.
- **"This folder is empty" placeholder.** Expanding a zero-count folder
  card shows a faint italic placeholder row.

### Changed

- **Settings tab rewritten to native `PluginSettingTab` + `Setting`
  rows.** Eight sections in one scrollable column, divided by
  `Setting.setHeading()`. The prior custom side-nav + body-pane layout
  (which hijacked Obsidian's modal sizing via unscoped `.settings`
  selectors) is gone. All settings rows now inherit Obsidian's spacing,
  focus rings, and theme styling.
- **`capture.defaultDest` loosened to free-form string** (was a typed
  union of three paths). Default flipped `personal/captures` →
  `gtd/inbox`.
- **Zone objects start collapsed by default.** The scanner ignores the
  manifest's `expanded: true` field — every card opens collapsed.

### Removed

- **All `+ note` / `+ folder` buttons on the zone hero and per-card.**
  Creation flows through right-click only.
- **`src/components/forms.ts`** — 200 lines of reinvented form widgets;
  Obsidian's `Setting` API covers all the cases.
- **Custom `NewZoneItem` modal** — replaced by direct
  `createNewNoteIn` / `createNewFolderIn` invoked from context menus.
- **Daily Notes / Periodic Notes deferral in `openDaily()`.** WorkdeskOS
  owns the daily-note flow end-to-end.

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
