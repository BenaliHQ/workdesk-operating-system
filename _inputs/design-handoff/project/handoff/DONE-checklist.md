# DONE checklist

The plugin is **DONE** when Yvette can do every one of these on a freshly-installed WorkDesk-OS vault, with no expert on the call, for two consecutive weeks without workarounds.

Each item lists the action and the expected behavior. Tick them in order — they're roughly correlated with the build phases in `build-sequence.md`.

## Phase 0 · Install + load

- [ ] **Install the plugin** via BRAT or manual zip. Enable in Settings → Community Plugins. No errors in the console.
- [ ] **Theme respects Obsidian**: switching Obsidian's theme (light ↔ dark) flips WorkDesk's palette instantly. No hard-coded colors.
- [ ] **Fonts load**: DM Sans, Manrope, Geist Mono all render. Fallbacks (system-ui, ui-monospace) used when offline.

## Phase 1 · Shell

- [ ] **Four-pane shell** shows up on plugin enable: ribbon (64 px) · zone pane (340 px) · editor · right pane (340 px).
- [ ] **Ribbon zones** clickable: clicking each of atlas / gtd / intel / personal / system / config / files updates the active zone visibly. Active slot has the slate rail + colored halo on the dot.
- [ ] **Pane splitters** draggable: zone pane resizes between 240–560 px; right pane between 280–600 px; neither shrinks the editor below 360 px. Widths persist across restarts.
- [ ] **Toggle left/right buttons** in the editor toolbar collapse and re-expand panes. Edge bumpers appear when collapsed.

## Phase 2 · Zone view

- [ ] **Each zone renders correctly**: zone hero (colored dot + zone name title-cased + sub-line), then zone-card list. Active object expanded.
- [ ] **Zone card shows**: 32×32 pastel circle with first letter of object title; title; sub; count right-aligned; soft shadow; lift on hover.
- [ ] **Tree rows** indent by 16 px per depth level. Folders show chevron + folder glyph; files show file glyph. Active file row highlighted.
- [ ] **Clicking a file** opens it in the editor; the tab name + breadcrumb update.
- [ ] **Empty state**: a zone with no objects shows the big-dot "Nothing in {zone} yet" with a "Create first" CTA. Inbox-style cards show the green check + "All caught up".
- [ ] **Files view** shows every zone as a flat folder tree, all collapsed by default.

## Phase 3 · Editor + markdown

- [ ] **Markdown renders** with our typography: h1-h4, p, lists, task lists, blockquote, hr, table, code (inline + block), kbd, callouts (note/success/warning/info/error), properties block, wikilinks, tags, footnotes.
- [ ] **Wikilinks** in atlas-blue with dotted underline. Hover shows the atlas-bg highlight. Right-click opens the context menu.
- [ ] **Tags** as pills with the `#` prefix in faint color.
- [ ] **Edit mode**: same elements, with `[[...]]` brackets visible in faint mono and `#` prefix shown on tags.

## Phase 4 · Terminal

- [ ] **Right pane defaults to the terminal**. Statusbar shows `opus 4.7 · ctx % · session length · cost · skills · ready`.
- [ ] **Tab strip** shows three default tabs (or whatever was saved). New tab via `+`; close via `×` on hover; rename via double-click; right-click for the full menu (Rename / Export / End).
- [ ] **Tab status dots**: idle = grey, working = ochre, done = green, waiting = slate-blue (pulses 1.4 s), error = rose (pulses 1.0 s). Auto-detected from Claude Code output.
- [ ] **Composer at the bottom**: rounded shell with `▌` prompt + textarea + reference button + send button. Slate ring on focus. Send button fills slate when there's input.
- [ ] **`Enter` or `⌘+Enter`** sends. `Shift+Enter` newline. `↑/↓` walks history. `Esc` blurs. Sent message appears in canvas as a new prompt line.
- [ ] **`[[` autocomplete**: typing `[[` in the composer (or canvas) opens the backlink popup with three best matches. Arrow keys + Enter to select.
- [ ] **Drag-drop file** onto the terminal: shell-escaped path inserted at cursor + toast "Inserted path in terminal".
- [ ] **Fullscreen mode** via the session-head expand button (or `⌘⇧Enter` if bound): zone pane + editor collapse; ribbon stays; session list flips vertical; canvas centers at 820 px max-width; font bumps to 14 / 1.75; statusbar moves below the composer; Esc exits.

## Phase 5 · Modals

- [ ] **Command palette** (`⌘K`): search input + grouped commands (Files / Zones / WorkDesk / Triage / View). ↑↓ to navigate, Enter to select, Esc to close.
- [ ] **Quick capture** (`⌘⇧M`): pulse-ringed mic; live STT transcript; "Recording" status with blinking dot; destination chips; Save (primary) + Cancel. Save creates the note at the configured destination and toasts success.
- [ ] **Settings** modal: six WorkDesk tabs (General / Zones / Terminal / Quick capture / Claude Code / About). Each tab has 3–4 sections with labels + descriptions. Toggle + segmented controls work.
- [ ] **Onboarding** (auto on first run): 4 steps with dot pager + Back/Next. Dismiss sets `settings.onboarding.completed = true`. Replayable from command palette.
- [ ] **Focus mode** (`⌘⇧F`): both panes collapse; ribbon + tabs + breadcrumb fade to 0.4; Esc exits.

## Phase 6 · Polish

- [ ] **Toasts** for: capture saved, file deleted, settings reset, copy actions, errors. Bottom-right stack. Auto-dismiss except loading.
- [ ] **Loading states**: zone pane shows `.skeleton` rows during vault scan; quick capture shows spinner during STT roundtrip.
- [ ] **Banner** appears in the right pane when terminal disconnects, with a "Restart session" action.
- [ ] **Right-click context menus** for files / folders / wikilinks. All items in `handoff/components.md` § Context menus.
- [ ] **Calendar tab** shows current month with notes-with-pips. Clicking a day opens that daily note; the "Notes on {day}" list below shows everything created that day color-coded by zone.
- [ ] **Backlinks** + **Outline** tabs render correctly.

## Accessibility

- [ ] **Full keyboard nav**: tab order matches `handoff/accessibility.md`.
- [ ] **Focus rings** visible on every interactive element via `:focus-visible`.
- [ ] **ARIA**: all icon-only buttons have `aria-label`; modals are `role="dialog" aria-modal="true"`; toggles are `role="switch"`.
- [ ] **Contrast**: body text passes AA; `--text-faint` only used for 12 px+ captions.
- [ ] **Reduced motion**: `prefers-reduced-motion: reduce` disables all animations.

## Two-week dogfood

- [ ] Yvette completes a normal workday entirely inside WorkDesk for 10 consecutive workdays. No workarounds. No expert calls. No "this is broken so I went back to plain Obsidian".

When all of these tick, the plugin ships.
