# Design audit — operator smoke-test checklist

Reload the plugin in Obsidian (Settings → Community plugins → toggle off/on, or `Cmd+R`). Then walk this list. Each item names the surface, the change to look for, and how to trigger it.

If something doesn't land as described, reply with the surface name and what you saw — I'll dig in.

## Finding 1a — Toast notifications

- [ ] Trigger a **success toast** (e.g. create a new note from a zone card). Expect: 28 px green-tinted circular chip on the left holding `✓`, gentle green-tinted border around the whole card, subtle green-tinted background. **No** colored left-stripe.
- [ ] Trigger an **error toast** (e.g. unplug Claude Code mid-stream, or rename a file to a colliding name). Expect: warm-red chip + tinted border + tinted bg. **No** colored left-stripe.
- [ ] Trigger an **info toast** (e.g. plugin update check from Settings → About). Expect: atlas-blue chip + tinted border + tinted bg. **No** colored left-stripe.
- [ ] Hover the dismiss `×` — focus-visible ring shows. Tab to it with keyboard — same ring, target is 28 × 28 with focus offset.

## Finding 1b — Callouts inside notes

- [ ] Open a note containing `> [!note]`, `> [!warning]`, `> [!success]`, `> [!info]`, `> [!error]`, `> [!question]`, `> [!example]`, `> [!tip]`, `> [!quote]`. (Make a scratch note if you don't have one — paste in 2-3 types.)
- [ ] Each callout should render with: full subtle border tinted in the role color, light tinted background, and a leading 28 px round icon chip on the left of the title. **No** thick left-stripe.
- [ ] Toggle between reading view and edit view — both should look the same.
- [ ] Check synonyms: `> [!check]` and `> [!done]` map to success; `> [!faq]` and `> [!help]` map to question; `> [!cite]` and `> [!abstract]` map to example/quote.

## Finding 2 — Container-scoped tokens

This is the architectural one — the test is what _doesn't_ break.

- [ ] **Native tooltip readability.** Hover any Obsidian native ribbon icon (Files, Search, Bookmarks, etc.) — the tooltip should be dark-on-light, fully readable. (Pre-fix: white-on-cream, invisible.)
- [ ] **Settings dialog visibility.** Click the gear icon → Settings → should open instantly. (Pre-fix: would appear at `opacity: 0` until the `.modal-container .modal` patch in `obsidian-scope.css` forced it visible.)
- [ ] **File rename modal.** Right-click a file → Rename. Dialog should be visible immediately.
- [ ] **Other plugins' modals.** If you have e.g. Excalidraw, Templater, Dataview installed — open one of their modals. Should render in Obsidian's native style, not WorkDesk's cream.
- [ ] **Plugin's own modals still styled.** Cmd-P opens the command palette in WorkDesk's cream + scoped tokens. Quick capture (mic ribbon icon) the same.
- [ ] **Popout window**: drag a tab out into a popout. WorkDesk's surfaces inside the popout should be styled (zone pane, terminal, palette in popout) — confirms the `window-open` event hook is wiring the body class.

## Finding 3 — Capitalize + italic

- [ ] **Entity names render with operator casing.** Browse a zone with cards. Cards like `byrd-building`, `BenaliHQ`, `qbo-cli`, `WorkDesk OS` should NOT be auto-Title-Cased.
- [ ] **Empty zone state.** Pick an empty zone (or filter to one). Body copy should be calm faint text — no italic skew.
- [ ] **`<em>` in note prose.** Add `Per the audit, *this should actually be italic*` to a scratch note. Now renders with a real italic face (DM Sans italic), not browser-synthesized skew.
- [ ] **Composer placeholder.** Open the right-pane terminal composer (if present), look at the input placeholder — straight text, no italic.

## Finding 4 — Warm-tinted surfaces and shadows

- [ ] **Cards on the editor surface.** Open a zone pane — the object cards inside should feel like part of the same warm palette, no harsh-white islands.
- [ ] **Modals.** Open the command palette (Cmd-P) — background should be warm-white, not pure white. Shadow underneath should feel warm-tinted, not cool-gray.
- [ ] **Form fields.** Open Settings → any text input — background warm-white.
- [ ] **Dark mode.** Switch to dark theme (Settings → Appearance → Dark). All surfaces stay on the warm coffee palette — no changes there since dark already used warm values.

## If something feels off

Reply with the surface and what you saw. The most likely places for surprise:
- A native Obsidian component that previously inherited WorkDesk styling and now reverts to Obsidian default — that's expected per Finding 2, but if it _should_ have WorkDesk styling, the container needs to be added to the `:is(…)` list in `styles/tokens.css`.
- A callout type I didn't map (e.g. `[!important]`) — falls back to atlas-blue default; tell me which type and I'll add it to the synonym groups.

## Pre-existing verify failures (NOT introduced by this design pass)

`pnpm verify <phase>` reports these as failing both before and after the design work:

- **phase0**: `src/icons.ts` port count (55) ≠ source count (53)
- **phase4a.2**, **phase4b**: vitest suites for these phases (the spec files don't exist; verify expects them)
- **phase5b**: `main.ts registers Quick capture command + Focus toggle hotkeys`
- **phase6a**: `main.ts installs global showToast + editor drag-hover` / `terminal tabs wire terminalTabMenuItems on contextmenu` / vitest suite
- **phase6b**: `manifest.json.version === "1.0.0"` (current version is 1.6.10 — pin is stale)

These are independent maintenance items, not related to the visual surface.
