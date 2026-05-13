# Accessibility

The plugin must be usable with a keyboard only, screen-reader-friendly, and respectful of system preferences.

## Color & contrast

- Body text on editor surface (`#1a1a1a` on `#ffffff`, light): contrast ratio **18.4 : 1** ✓
- `--text-muted` (`#6b6862`) on `--background-primary` (`#ffffff`): **5.95 : 1** ✓ (AA normal text)
- `--text-faint` (`#9a958d`) on `--background-primary`: **3.0 : 1** — meets AA for large text only. Never use `--text-faint` for body copy; only for 12 px+ captions where supplementary.
- Dark mode: `--text-normal` (`#ebe5d9`) on `--background-primary` (`#2a2723`): **12.5 : 1** ✓
- `--text-faint` dark (`#76706a`) on `--background-primary` (`#2a2723`): **3.4 : 1** — same large-text-only rule.

Callout fills use the pastel zone-bg under same-hue zone-fg text — every combination tested AA at 13 px body or larger.

## Focus

Globally via `*:focus-visible`:

```css
*:focus-visible {
  outline: 2px solid var(--background-modifier-border-focus);
  outline-offset: 2px;
  border-radius: 4px;
}
```

`--background-modifier-border-focus` is slate (light) / pale-slate (dark) — contrast 7+ : 1 against any surface.

### Per-component overrides

- **`.zone-slot`** — the 3 px active rail doubles as a focus indicator for keyboard nav. When focused via keyboard, the default outline still appears around the 44 × 44 button.
- **`.ribbon-icon`** — default outline.
- **`.row`** — keep default 2 px outline inside the row (will overflow 28-px height by 2 px; that's fine).
- **`.cmd-item`** — focus + `.selected` are kept distinct. Up/down arrows move `.selected`; tab moves DOM focus; both visible.

## Keyboard surface

Everything reachable, in this tab order:

1. Ribbon: zone slots (atlas → gtd → intel → personal → system → config → files), divider, search, today, terminal, focus, mic.
2. Zone pane: hero collapse, toolbar buttons (new, sort, collapse-all, demo-empty), then object-list (each `.obj-row` and its child rows).
3. Editor tabs: toggle-left, tab, then editor actions cluster (cmd, settings, theme, toggle-right).
4. Editor body.
5. Right pane tabs, then terminal body.
6. Edge bumpers when visible.

### Shortcuts

| Key combo  | Action                                  |
|------------|-----------------------------------------|
| `⌘ K`      | Open command palette                    |
| `⌘ T`      | Today's daily note                      |
| `⌘ J`      | Toggle right pane (terminal)            |
| `⌘ ⇧ F`    | Toggle focus mode                       |
| `⌘ ⇧ M`    | Quick capture                           |
| `Esc`      | Close any open modal, or exit focus mode|
| `↑ / ↓`    | Navigate command-palette items          |
| `↵`        | Select / commit                         |

Inside modals, `Tab` cycles within the modal and `Shift+Tab` reverses. Esc always dismisses.

## ARIA

- **Zone slots** — `<button role="button" aria-label="Open zone: atlas">`. Active state via `aria-current="true"`.
- **Ribbon-icons** — `<button aria-label="...">`. The mic gets `aria-label="Quick capture (Cmd Shift M)"`.
- **Zone cards** — the `.obj-row` is a `<button>` with `aria-expanded` reflecting collapsed/open state and `aria-controls` pointing to the `.obj-children` ID.
- **Tree rows** — folder rows: `role="treeitem"` with `aria-expanded`. File rows: `role="treeitem"`. Their container (`.obj-children`) is `role="group"`. The whole tree inside an object is `role="tree"`.
- **Tabs** (`.editor-tabs .tab`, `.right-tabs .right-tab`) — `role="tab"` inside `role="tablist"`. Active tab has `aria-selected="true"`.
- **Modals** — `role="dialog" aria-modal="true" aria-labelledby="..."`. Modal title element has the matching ID.
- **Toggle** — implement as `<button role="switch" aria-checked="...">` not a div.
- **Toast** (future) — `role="status" aria-live="polite"`.

## Screen-reader specific copy

- The `caught-up` empty row says **"All caught up."** verbally; the green check is `aria-hidden="true"`.
- The recording dot in quick capture: `aria-hidden="true"`. The "Recording" text remains.
- All icon-only buttons must have an `aria-label`. Lucide-style glyphs are `aria-hidden`.

## Motion

Respect `prefers-reduced-motion: reduce` — see `animations.md` for the global override.

## Focus trap inside modals

When a modal opens:
1. Capture the previously-focused element.
2. Move focus to the modal's primary interactive child (input for cmd palette, primary button for capture / settings / onboarding).
3. Trap Tab + Shift+Tab within the modal.
4. On close, restore focus to the captured element.

## Skipping the chrome

Add a visually-hidden first focusable element: `<a class="sr-skip" href="#editor-body">Skip to editor</a>`. Becomes visible when focused.

```css
.sr-skip {
  position: absolute; top: -40px; left: 8px;
  background: var(--background-primary); color: var(--text-normal);
  padding: 6px 12px; border-radius: 6px;
  z-index: 1000;
}
.sr-skip:focus { top: 8px; }
```
