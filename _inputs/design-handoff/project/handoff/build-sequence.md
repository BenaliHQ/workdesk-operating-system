# Build sequence

The order Claude Code should ship features in. Each phase produces something testable; nothing in a later phase is needed to verify an earlier one.

## Phase 0 · Foundations (build first, ship together)

1. **Copy `shared/tokens.css` → `styles/tokens.css` verbatim.** No edits. This is the single source of truth.
2. **Copy `shared/app.css` → `styles/app.css` verbatim.** Same.
3. **Wire theme switching** to Obsidian's native `body.theme-light` / `body.theme-dark` (the host app sets this). No need to override — both are already defined in tokens.css.
4. **Port `shared/icons.js` → `src/icons.ts`** as an `ICONS: Record<IconName, string>` map + `wsSvg()` helper. Types in `handoff/types.d.ts`.
5. **Scaffold the plugin** per `handoff/manifest.md`: `main.ts`, `manifest.json`, `package.json`, `esbuild.config.mjs`, `tsconfig.json`. Empty `onload()` for now.

**Acceptance:** plugin enables in Obsidian without errors. `tokens.css` is loaded. The body retains Obsidian's theme.

---

## Phase 1 · Shell

6. **Register the WorkDesk workspace layout** that produces the four-pane grid:
   ribbon (64 px) · zone pane (340 px) · editor (1fr) · right pane (340 px).
   In Obsidian: this means migrating the user's `workspace.json` to put a `workdesk-zone` ItemView on the left and a `workdesk-terminal` ItemView on the right, with the editor in the center. Migrate **only if vault is empty or `settings.zones.firstRunComplete` is false**.
7. **Implement the ribbon** as a custom child view of Obsidian's ribbon (or a fixed-position element styled to match). Render each `ZoneId` from `ZONE_ORDER` as a `.zone-slot` button. Selection state is internal to the plugin (active zone).
8. **Implement column splitters** between zone pane / editor and editor / right pane. Drag to resize, double-click to reset. Persist to `settings.panes.{paneWidth,rpaneWidth}`. See `shared/app.css` `.splitter` rule.

**Acceptance:** the four-pane shell shows up. Switching zones in the ribbon doesn't error (the panes are empty for now). Splitters drag and persist.

---

## Phase 2 · Zone view

9. **Implement `ZoneView` (`workdesk-zone` ItemView)**. On mount, render `.pane-hero` for the active zone, then a list of `.obj` cards from the zone's objects, then for each card render its child tree of `.row` items.
10. **Implement the vault scanner** in `src/services/vault-scan.ts`. Read `config/zones.yaml` and `config/object-icons.yaml` (see `handoff/fixtures/`). Walk the vault into the `Zone` shape from `types.d.ts`. If the manifests don't exist, fall back to the default model in `shared/zones.js`.
11. **Wire zone switching** from the ribbon: clicking a slot updates the active zone, re-renders the pane.
12. **Wire tree expansion** on folder rows; clicking a file row opens it in the editor via `app.workspace.openLinkText(path, '', false)`.
13. **Empty states**: render `.zone-empty` when the zone has no objects, and `.empty-row.caught-up` for inboxes with no items.

**Acceptance:** all six zones plus Files view render. Trees expand. Clicking a file opens it in the editor. Empty states show.

---

## Phase 3 · Editor

14. **Editor tabs + breadcrumb** — render above Obsidian's editor view. The active file's name in the tab; its path as breadcrumb spans.
15. **Editor body styling** — already done via `app.css`. Verify the rendered markdown (`.markdown-rendered`) matches the prototype.
16. **Wikilink + tag rendering** in both rendered and edit mode (CodeMirror). Use the `.wikilink` and `.tag` classes; for edit mode, add `.editor-body.edit-mode` to the container so the bracket pseudo-elements show.
17. **Editor toolbar buttons** (toggle-left, toggle-right, settings, theme toggle, command palette). Wire each to the corresponding action.

**Acceptance:** opening any file shows the breadcrumb + tab. Markdown renders with all the documented elements (callouts, properties, task lists, code blocks, tables, wikilinks, tags).

---

## Phase 4 · Right pane: terminal

18. **Import the workdesk-terminal source** into the plugin (per the user's preference to fold it in rather than depend on it as a separate plugin). Vendor the xterm.js setup, PTY backend, multi-tab logic.
19. **Theme xterm.js** using the ANSI palette → token map in `handoff/components.md` § "ANSI palette → token map".
20. **Implement the session-head row** above the canvas: status icons (menu ⋯ + fullscreen ⛶). No model picker; the model is display-only in the statusbar.
21. **Implement the tab strip** (horizontal in panel mode; vertical session list in fullscreen). Tab status dots driven by `data-status` attribute; the plugin detects status by parsing Claude Code's `●` / `⎿` markers from xterm.js's `onData`.
22. **Implement the statusbar**: model · context bar · session length · cost · skills · ready indicator.
23. **Implement the composer** — DOM textarea below the canvas; on send, forward bytes to the PTY (`terminal.write(text + '\r')`). History (`↑`/`↓`), `⌘↵` and `↵` both send, `Shift+↵` newline, `Esc` blur.
24. **Implement fullscreen** — toggles `.app.term-fullscreen`. Reflows session list vertical, canvas centered, composer + statusbar align with canvas column. Esc exits.
25. **Implement right-pane tabs** (Backlinks · Outline · Calendar · Terminal). Calendar already specified; Outline reads headings; Backlinks reads the vault's link index.
26. **Implement the `[[` autocomplete** popup (DOM overlay anchored at the cursor coordinates inside xterm.js).
27. **Drag-drop hover state** on the terminal: dropping a file inserts its shell-escaped path; drop a screenshot inserts a temp file path.

**Acceptance:** the terminal runs a real Claude Code session. Tabs, fullscreen, autocomplete, composer, status indicators, statusbar all work.

---

## Phase 5 · Modals

28. **Command palette (`⌘K`)** — search input + grouped command list. Wire all `addCommand`-registered commands automatically.
29. **Quick capture (`⌘⇧M`)** — modal with pulse-ringed mic, live transcript, destination chips, save/cancel. Wire to the STT provider.
30. **Settings tab** — six WorkDesk tabs (General / Zones / Terminal / Quick capture / Claude Code / About). Renders inside Obsidian's native settings modal under "WorkDesk".
31. **Onboarding modal** (`workdesk:onboarding` command). 4 steps; auto-runs once on first install when `settings.onboarding.completed === false`.

**Acceptance:** every modal opens via hotkey + command palette. Quick capture roundtrips through STT and creates a note.

---

## Phase 6 · Polish

32. **Toast component** — `window.showToast(msg, severity, opts)`. Bottom-right stack. Wire to capture saved, settings reset, copy actions, errors.
33. **Loading states** — `.skeleton` rows in the zone pane while scanning; spinner inside any async button.
34. **Banner component** — `.banner.error` for terminal disconnected, STT unreachable, vault permission denied. Includes an action button.
35. **Right-click context menus** — for files, folders, wikilinks. Generic via `showContextMenu(x, y, items)` from the prototype.
36. **Focus mode** — `⌘⇧F` toggles `body.focus-on`. Both panes collapse; ribbon + tabs + breadcrumb fade.
37. **Accessibility audit** — verify all keyboard shortcuts, focus rings, ARIA labels, contrast against `handoff/accessibility.md`. Run `prefers-reduced-motion` test.

**Acceptance:** every state in `handoff/screens.md` is reachable. The plugin passes the DONE checklist (see `handoff/DONE-checklist.md`).

---

## Don't skip ahead

Each phase is independently testable. Don't start Phase 3 until Phase 2 is accepted — Phase 2's correctness affects Phase 3's spec. Toasts (Phase 6) seem small but get used across phases; build them last so they don't go through interface changes during the build.

## Where stuck → look here

| Issue                          | Source of truth                                  |
|--------------------------------|--------------------------------------------------|
| Colors / fonts / spacing       | `shared/tokens.css` + `handoff/design-tokens.md` |
| Component HTML/CSS             | `shared/app.css` + `handoff/components.md`       |
| Screen states                  | `prototype.html?...` URL params + `handoff/screens.md` |
| Plugin scaffold                | `handoff/manifest.md`                            |
| Data shapes                    | `handoff/types.d.ts`                             |
| Default zone manifests         | `handoff/fixtures/*.yaml`                        |
| Motion timing                  | `handoff/animations.md`                          |
| ARIA + keyboard                | `handoff/accessibility.md`                       |
| DONE criteria                  | `handoff/DONE-checklist.md`                      |
