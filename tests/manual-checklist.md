# Manual checklist

Items that need human judgment or multi-day observation. Work through this list with a real vault and a real Claude Code session after `scripts/install-check.sh` reports OK.

## Phase 0 · Install + load

- [ ] **Install the plugin** — via BRAT or manual zip. Enable in Settings → Community Plugins. No errors in the console.
  - *Verify:* Symlink the build into a vault, enable in Settings → Community Plugins, watch console for errors.
- [ ] **Theme respects Obsidian** — : switching Obsidian's theme (light ↔ dark) flips WorkDesk's palette instantly. No hard-coded colors.
  - *Verify:* Toggle Obsidian theme (light ↔ dark) and observe WorkDesk tokens flipping. No hard-coded colors should leak.
## Phase 5 · Modals

- [ ] **Onboarding** — (auto on first run): 4 steps with dot pager + Back/Next. Dismiss sets `settings.onboarding.completed = true`. Replayable from command palette.
  - *Verify:* Per operator divergence, onboarding is delegated to WorkDesk OS's /onboarding skill. Verify the comment in src/main.ts and that no modal opens on first run.
## Accessibility

- [ ] **Full keyboard nav** — : tab order matches `handoff/accessibility.md`.
  - *Verify:* Tab through every interactive surface in this order: ribbon → zone pane → editor tabs → editor body → right-pane tabs → terminal body → edge bumpers. See handoff/accessibility.md.
- [ ] **Contrast** — : body text passes AA; `--text-faint` only used for 12 px+ captions.
  - *Verify:* Verify body text contrast ≥ 4.5:1 against background-primary in both light and dark mode using Contrast.app or browser devtools.
## Two-week dogfood

- [ ] **Yvette completes a normal workday entirely inside WorkDesk for 10 consecutive workdays** — Yvette completes a normal workday entirely inside WorkDesk for 10 consecutive workdays. No workarounds. No expert calls. No "this is broken so I went back to plain Obsidian".
  - *Verify:* Yvette completes 10 consecutive workdays inside WorkDesk with no workarounds, no expert calls, no fallback to plain Obsidian. Multi-day observation — not auto-verifiable.

## Yvette flow

Walk through one workday in WorkDesk end-to-end:
1. Open a fresh WorkDesk OS vault. Enable the plugin via Community Plugins.
2. Click each ribbon zone and confirm the zone pane updates. Slate rail + colored halo on active slot.
3. Press ⌘K. Search for "Quick capture". Press Enter. Modal opens. Cancel.
4. Press ⌘⇧M. Mic ring pulses. Speak. Save. Toast confirms the capture and the note appears under `personal/captures/`.
5. Press ⌘⇧F. Both panes collapse. Press Esc. Both panes return.
6. Open the terminal (right pane). Run a Claude Code session for ≥ 5 minutes.
7. Drag a file from the file tree onto the terminal canvas. Confirm the path inserts with a success toast.
8. Open Settings → WorkDesk. Verify all 6 sub-tabs render and toggles persist after reload.

## Two-week dogfood

Per the original DONE-checklist: Yvette completes 10 consecutive workdays in WorkDesk. No workarounds. No expert calls. No falling back to plain Obsidian. After 10 days, the build is shippable.
