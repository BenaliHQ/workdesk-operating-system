# Changelog

All notable changes to **Workdesk Operating System** are recorded here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_No unreleased changes._

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
