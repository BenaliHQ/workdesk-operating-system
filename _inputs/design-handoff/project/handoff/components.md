# Components

Every UI component in the plugin, with geometry, states, and the tokens it consumes. Live versions live in [`components.html`](../components.html); this doc is the lossless text version for Claude Code.

CSS for every component is in [`shared/app.css`](../shared/app.css). Copy as-is into `styles/app.css`.

---

## Layout: `.app`

The four-pane grid that wraps the entire surface.

```css
.app {
  display: grid;
  grid-template-columns: var(--ws-ribbon-w) var(--ws-pane-w) 1fr var(--ws-rpane-w);
  height: 100vh;
  transition: grid-template-columns var(--ws-dur-pane) var(--ws-ease-out);
}
.app.no-left  { grid-template-columns: var(--ws-ribbon-w) 0px 1fr var(--ws-rpane-w); }
.app.no-right { grid-template-columns: var(--ws-ribbon-w) var(--ws-pane-w) 1fr 0px; }
.app.no-left.no-right { grid-template-columns: var(--ws-ribbon-w) 0px 1fr 0px; }
```

State classes:
- `.no-left` — zone pane collapsed
- `.no-right` — right pane collapsed
- `body.focus-on` — focus mode (ribbon + tabs + breadcrumb opacity 0.4; hover restores)

---

## `.ribbon` + `.zone-slot` + `.ribbon-icon`

The leftmost column. Vertical flex.

### `.zone-slot`
- 44 × 44, radius 12, hover bg `rgba(0,0,0,0.04)` (light) / `rgba(255,255,255,0.04)` (dark).
- Inner `.dot` is 32 × 32, radius 50%, glyph 16 px stroke 1.75. Hover transforms dot to `scale(1.04)` over `--ws-dur-fast`.
- Active state:
  - `::before` rail: 3 × ~28 px, slate (`--text-normal`), left -1 px, radius `0 3 3 0`.
  - Dot gets a 2 px frame ring (background-secondary-alt) + 3 px outer ring (slate@.18).
- `[data-zone="atlas"] .dot { background: var(--ws-zone-atlas-bg); color: var(--ws-zone-atlas-fg); }` — repeat for each zone id.

### `.ribbon-icon`
- 36 × 36, radius 8, glyph 18 px.
- color `--text-muted` → `--text-normal` on hover/active.
- `.ribbon-icon.mic` — color `--interactive-accent` (slate). Always anchored at the bottom of the ribbon via `.ribbon-spacer { flex: 1 }`.
- `.ribbon-icon.focus-active` — slate fill + slate text when focus-mode is on.

### `.ribbon-divider`
- 24 × 1, color `--background-modifier-border`, margin 8 / 0.
- Sits between the zone block and the tool block.

### Ribbon order

```
[atlas] [gtd] [intel] [personal] [system] [config] [files]
─────── divider ───────
[search] [today] [terminal] [focus]
... spacer ...
[mic]
```

---

## `.pane` (zone pane)

The 340-px curated column to the right of the ribbon.

### Structure

```html
<section class="pane">
  <div class="pane-hero">       <!-- icon + h1 + sub + collapse-button -->
  <div class="pane-toolbar">    <!-- label + icon-btn cluster -->
  <div class="object-list">     <!-- scrollable list of .obj cards -->
</section>
```

### `.pane-hero`
- padding `24 24 12`, gap 12.
- `.hero-dot` — 36 × 36, radius 50%, uses `--ws-zone-{id}-bg/-fg`, glyph 18.
- `h1` — `--ws-font-display`, 20 / 600, letter-spacing -0.015em.
- `.hero-sub` — 12 px, `--text-faint`.
- `.hero-collapse` — 26 × 26 icon-btn, far right.

### `.pane-toolbar`
- padding `0 24 8`.
- `.label` — 11 / 500, uppercase, letter-spacing 0.08em, `--text-faint`. Default copy: "Objects".
- `.toolbar-actions` — gap 4, four icon-btns: new note, sort, collapse-all, demo-empty.

### `.object-list`
- padding `0 12 16`, flex column, gap 8, overflow-y auto, flex 1.

---

## `.obj` (zone card)

The primary object row in the zone pane.

```css
.obj {
  background: var(--background-primary);
  border-radius: var(--ws-radius-card);
  box-shadow: var(--ws-shadow-card);
  overflow: hidden;
  transition: box-shadow var(--ws-dur-base) var(--ws-ease-out);
}
.obj:hover { box-shadow: var(--ws-shadow-hover); }
```

- `.obj-row` — grid `36 / 1fr / auto`, padding `11 / 12`, gap 12.
- `.obj-icon` — 32 × 32, radius 50%, font 14 / 600 uppercase. Renders the **first letter** of the object's title on its zone `-bg` / `-fg` pastel pair. (Only the ribbon zone slots use glyph icons — the zone-color pastel itself does the categorization work here, so the letter stays out of the way.)
- `.obj-text .obj-title` — 14 / 500.
- `.obj-text .obj-sub` — 12, `--text-faint`, ellipsis.
- `.obj-meta` — 11, tabular-nums, `--text-faint`. Right-padded 8.
- `.obj-meta.caught-up` — color `--text-success`, contains a check glyph.

### Children block

```css
.obj-children {
  border-top: 1px solid var(--ws-border-hair);
  padding: var(--ws-space-2) 0;
  background: var(--ws-card-soft);
}
.obj.collapsed .obj-children { display: none; }
```

### Behavior
- Click `.obj-row` → toggle `.collapsed`.
- If `count === 0` or `count === '—'`, the card auto-expands and renders `.empty-row` (or `.empty-row.caught-up` for inbox-style cards).

---

## `.row` (tree row)

File and folder rows inside an expanded zone card.

```css
.row {
  display: grid;
  grid-template-columns: 16px 18px 1fr auto;
  align-items: center;
  gap: var(--ws-space-2);
  height: 28px;
  padding: 0 var(--ws-space-3);
  margin: 0 var(--ws-space-2);
  border-radius: var(--ws-radius-row);
  cursor: pointer;
  color: var(--text-normal);
  font-size: var(--ws-fs-13);
}
.row:hover  { background: var(--background-modifier-hover); }
.row.active { background: var(--background-modifier-active-hover); }
```

- Depth padding: `[data-depth="2"]` 28 px, 3 → 44, 4 → 60, 5 → 76. Step 16 px.
- `.chevron` — 10 px, color `--text-faint`, rotates 90° when `.open`.
- `.glyph` — folder 13 / file 12, `--text-faint`.
- `.name` — ellipsis.
- `.count` — 11, tabular-nums.
- `.row.is-folder .name` — font-weight 500.
- `.row.empty-folder` — italic, cursor default, no hover. Shown when a folder is open but has no children.

---

## `.empty-row` + `.zone-empty`

Two flavors of empty.

### `.empty-row` (inside a zone-card)
- padding `10 / 16`, italic, color `--text-faint`, 13 px.
- `.empty-row.caught-up` — green check + "All caught up.", non-italic, weight 500.

### `.zone-empty` (whole zone)
- Flex column centered, padding 32.
- `.big-dot` — 56 × 56, radius 50%, opacity 0.55, uses `--ws-zone-{id}-*`.
- `h2` — 15 / 500, `--text-muted`.
- `p` — 13 / 1.6, `--text-faint`, max-width 260.
- `.empty-cta` — padding `8 14`, radius 8, border 1 px, glyph + label.

---

## `.editor-pane`

Wraps the editor.

### `.editor-tabs`
- height 36, border-bottom 1 px hair, padding `0 12`.
- `.editor-toggle-left` — 26 × 26 icon-btn, panel glyph.
- `.tab` — padding `0 12`, font 13, right border 1 px hair. `.tab.active` — `--text-normal`.
- `.editor-actions` — `margin-left: auto`, gap 4, four icon-btns: command, settings, theme, panelR.

### `.breadcrumb`
- height 30, padding `0 24`, border-bottom 1 px hair.
- Spans inside; separator `/` injected via `span + span::before { content: "/"; padding: 0 6px; }`.

### `.editor-body`
- max-width `--ws-editor-max` (720), margin auto, padding `32 32 80`.
- font 14 / 1.5, `--text-normal`.
- `contenteditable="true"` for in-place edits — `outline: none; caret-color: var(--interactive-accent);`.

---

## Markdown rendering

The editor body supports the full Obsidian-flavored markdown surface. Every selector is scoped to `.editor-body`.

- **Headings** — `h1` 1.75rem display, `h2` 1.4rem, `h3` 1.15rem, `h4` 1rem (muted).
- **Body** — `p` line-height 1.65, color `--text-normal`.
- **Links** — `a` color `--text-accent`, underline 1 px offset 3.
- **Wikilinks** — `.wikilink` color `--ws-zone-atlas-fg`, dotted underline. Hover bg `--ws-zone-atlas-bg`, radius 3.
- **Tags** — `.tag` pill bg `--background-modifier-hover`, color `--text-accent`, padding `1 7`.
- **Lists** — disc / circle / decimal. `ul ul` uses circle.
- **Task lists** — `.task-list` no list-style. Each `li` is flex 10-gap. `.checkbox` 16 × 16 radius 4, border 1.5 px. `.checkbox.checked` fill `--interactive-accent`. `.done` strike + faint.
- **Inline code** — `code` font-mono 0.875em, bg `--background-modifier-hover`, radius 4, padding `1.5 / 5`.
- **Code block** — `pre` bg `--code-background`, border 1 px, radius 8, padding 16, font-mono 0.87em, line-height 1.6.
- **kbd** — font-mono 0.78em, bg `--background-primary`, border 1 px bottom 2 px, radius 4.
- **Blockquote** — border-left 3 px `--background-modifier-border`, padding `0 16`, color `--text-muted`.
- **hr** — 1 px `--background-modifier-border`, margin 32 / 0.
- **Table** — full-width, border 1 px hair, radius 8 overflow hidden. `th` uppercase 11 px 600 letter-spacing 0.06em, bg `--ws-card-soft`. `td` padding `10 / 14`, border-bottom 1 px hair.
- **Properties** — `.properties` grid `110 / 1fr`, gap `6 / 12`, padding `12 / 16`, bg `--ws-card-soft`, border 1 px hair, radius 8. `.key` 12 px `--text-faint`. `.val` 13 `--text-normal`.

### Callouts

```css
.callout         { border-radius: 8px; padding: 12 16; border-left: 3px solid; }
.callout-title   { font-weight: 600; font-size: 12px; text-transform: uppercase;
                   letter-spacing: 0.06em; display: flex; align-items: center; gap: 6px; }
```

| Type      | Border / title color  | Background fill      |
|-----------|-----------------------|----------------------|
| `note`    | `--ws-zone-atlas-fg`  | `--ws-zone-atlas-bg` |
| `success` | `--ws-zone-gtd-fg`    | `--ws-zone-gtd-bg`   |
| `warning` | `--ws-zone-intel-fg`  | `--ws-zone-intel-bg` |
| `info`    | `--ws-zone-config-fg` | `--ws-zone-config-bg`|
| `error`   | `--ws-zone-personal-fg`|`--ws-zone-personal-bg`|

---

## Right pane: `.right-pane`

Tabs + body. Tabs swap which panel is visible; only one is active at a time.

### `.right-tabs`
- height 36, border-bottom 1 px hair, padding `0 12`.
- `.right-tab` — padding `0 12`, font 12, `--text-faint`. Hover → `--text-normal`. `.active` adds inset `0 -2px 0 --interactive-accent` shadow.
- Order: Backlinks, Outline, Calendar, Terminal. Default active: Terminal.

### `.terminal-body`
- padding `12 / 16 / 16` (less padding than other panes), font-mono 13 / 1.65, bg `--background-secondary`, color `--ws-term-fg`.
- `font-variant-ligatures: none` and `font-feature-settings: "calt" 0` — terminals must never apply ligatures, even if the font supports them.
- `.term-line` — pre-wrap, word-break break-word.

**Terminal design constraints (read carefully)**

The plugin embeds a real terminal — `xterm.js` or an equivalent canvas/DOM terminal renderer — to host Claude Code / Codex sessions. The terminal itself has hard constraints; we can only style what lives outside the canvas. Everything inside the canvas is ANSI text on a flat background.

What we CAN control:
- Monospace font family + size + line height (Geist Mono 13 / 1.65)
- A 16-color ANSI palette mapped to our tokens (see below)
- The terminal's foreground / background / cursor / selection colors
- Padding around the canvas
- Chrome ABOVE the canvas (session header strip) and BELOW (status bar)

What we CANNOT control:
- Per-line backgrounds, rounded corners, or shadows inside the output
- Custom fonts mid-line
- Inline widgets, images, or hover popovers inside the output
- Markdown rendering — Claude Code emits ANSI; the terminal just displays it
- Per-character animations beyond cursor blink

So all of the "rich" output (tool-call markers, diff blocks, list bullets, box-drawing dividers) must be constructible from **unicode characters + ANSI color codes only**. The prototype uses HTML spans to fake this, but the real plugin maps these spans 1-to-1 onto ANSI sequences the CLI tool emits.

**ANSI palette → token map**

Set the terminal's color theme to use these tokens. xterm.js accepts a `theme` object with `background`, `foreground`, `cursor`, `selectionBackground`, and 16 named ANSI colors (`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, plus their `bright*` variants).

| ANSI slot     | Light token            | Dark token             | Use |
|---------------|------------------------|------------------------|-----|
| background    | `--background-secondary` | `--background-secondary` | Terminal canvas |
| foreground    | `--ws-term-fg`         | `--ws-term-fg`         | Default output |
| cursor        | `--ws-term-caret`      | `--ws-term-caret`      | Block caret |
| selection     | `--text-selection`     | `--text-selection`     | Highlight |
| black         | `--text-faint`         | `--text-faint`         | Dim text |
| red           | `--ws-term-error`      | `--ws-term-error`      | Errors, diff `-` |
| green         | `--ws-term-success`    | `--ws-term-success`    | Success, diff `+` |
| yellow        | `--ws-term-warn`       | `--ws-term-warn`       | Warnings |
| blue          | `--ws-term-accent`     | `--ws-term-accent`     | File names, links |
| magenta       | `--ws-zone-personal-fg`| `--ws-zone-personal-fg`| Personal-zone hits |
| cyan          | `--ws-zone-atlas-fg`   | `--ws-zone-atlas-fg`   | atlas-zone hits |
| white         | `--ws-term-fg`         | `--ws-term-fg`         | Default |
| brightBlack   | `--text-muted`         | `--text-muted`         | Slightly brighter dim |

**ANSI color spans in the prototype**

These class names are 1:1 with what the real terminal would emit:

| Class           | Maps to        | Role |
|-----------------|----------------|------|
| `.term-prompt`  | `--ws-term-prompt`  | Prompt marker `▌` |
| `.term-user`    | `--ws-term-fg`      | User-typed input |
| `.term-claude`  | `--ws-term-fg`      | Claude's response |
| `.term-dim`     | `--ws-term-dim`     | Metadata, paths in dim lines |
| `.term-accent`  | `--ws-term-accent`  | File names, links |
| `.term-success` | `--ws-term-success` | Success markers, diff `+` |
| `.term-warn`    | `--ws-term-warn`    | Warning |
| `.term-error`   | `--ws-term-error`   | Error |
| `.term-tool`    | `--ws-term-prompt`  | Tool-call marker `●` |
| `.term-add`     | `--ws-term-success` | Diff additions (`+`-prefixed lines) |
| `.term-del`     | `--ws-term-error`   | Diff deletions (`-`-prefixed lines) |
| `.term-meta`    | `--ws-term-dim` italic | Session metadata banner |
| `.term-box`     | `--ws-term-dim`     | Unicode box-drawing chars (`│ ╰ ├ ⎿`) |

**Visual vocabulary (Claude Code conventions)**

The plugin mirrors Claude Code's own output style:
- `▌` (left half block) = prompt marker for user input
- `●` (circle) = tool-call header line, followed by `(args)`
- `⎿` (right-pointing arc) = nested result for the above tool call
- `│` = continuation marker for grouped lines (diffs, multi-line tool output)
- `╭─ … ─╮` / `│` / `╰─ … ─╯` = light box around a banner (use only when fits on one line)
- `+` / `-` line prefix inside `│`-grouped block = diff add / del
- `•` = bullet inside Claude's prose
- `✓` (success), `◐` (partial), `○` (idle) = status glyphs in ranked lists

The terminal-body composes these lines via DOM spans in our prototype. In the real plugin, xterm.js receives the same bytes from Claude Code over a PTY.

**Term color details:**
- `.term-prompt`  · `--ws-term-prompt`, weight 500.
- `.term-user` / `.term-claude` — `--ws-term-fg` (claude at 0.92 opacity).
- `.term-dim` — `--ws-term-dim`.
- `.term-accent` — `--ws-term-accent`, weight 500.
- `.term-success / .term-warn / .term-error` — matching `--ws-term-*`.
- `.term-input-row .caret` — 8 × 15 block, slate, 1 s blink.

### `.term-session-head` (above the canvas)

Thin chrome strip with the session's scope, status dot, and action buttons (search, clear, restart).
- height ~30 (padding `6 / 16 / 4`), border-bottom 1 px hair.
- 11-px font-mono, color `--ws-term-dim`.
- `.dot` — 6 × 6 circle, `--ws-term-success` when connected, `--ws-term-error` when disconnected.
- `.scope` — vault root path, `--ws-term-fg`.
- `.branch` — git branch indicator, `--ws-term-warn`.
- `.actions` — right-aligned cluster of 22 × 22 icon buttons (search / clear / restart).

### Fullscreen layout (`.app.term-fullscreen`)

When the user toggles fullscreen on the terminal, the zone pane + editor collapse and the right pane fills the available width. The terminal-body reshapes into a **2-column layout** designed to feel like a chat app (Claude desktop, Linear's command, etc.):

- **Left rail · 232 px** — vertical session list. Each session is a row with a leading status dot (success green when active, neutral when idle), name, and a hover-revealed close `×`. Sessions stack top-down with 1-px gap. A dashed "New session" button sits at the bottom. The rail starts with a faint "SESSIONS" label (11 px, uppercase, letter-spacing 0.1em, `--text-faint`).
- **Canvas · centered** — content max-width 820 px, calc-padded so it stays centered at any window width (`calc(max(56px, (100% - 820px) / 2))`). Font bumps from 13 px / 1.65 to **14 px / 1.75** for chat-app comfort. Top padding 36 px, bottom 56 px.
- **Session header** continues at the top, spanning both columns. The fullscreen button flips to a "collapse" glyph.
- **Statusbar** continues at the bottom, full width.

The right-tabs strip (Backlinks / Outline / Calendar / Terminal) is **hidden** in fullscreen — you're committed to the terminal in this mode. To switch views, exit fullscreen first.

**Why this works inside xterm.js' constraints:**
- The session list is a separate DOM column outside the canvas, so it can be HTML/CSS.
- The canvas itself is still a single xterm.js instance — we just give it more whitespace.
- Larger font + line-height are configured via xterm.js's `fontSize` and `lineHeight` options at runtime when fullscreen activates.
- Hover/active backgrounds on the session list are pure CSS on DOM elements, not in the terminal output.

**Entering / exiting:**
- Click the fullscreen icon in `.term-session-head`.
- Command palette → "Toggle terminal fullscreen".
- `Esc` exits.
- Auto-switches to the terminal tab when entering (so you can't enter fullscreen on Backlinks and lose your terminal).
- Clicking any zone slot in the ribbon exits fullscreen and routes to that zone.

### `.term-composer` (below the canvas, above the statusbar)

The single, unambiguous place to type. The canvas above stays read-only (pure history); this bar accepts keystrokes and on send forwards them to the underlying PTY (the same channel Claude Code / Codex read from). Matches the Cursor / Claude desktop composer pattern.

Structure:

```html
<div class="term-composer">
  <div class="composer-inner">
    <div class="composer-shell">
      <span class="composer-prompt">▌</span>
      <textarea class="composer-input" placeholder="Ask Claude — ⌘↵ to send" />
      <div class="composer-actions">
        <button class="composer-icon"> <!-- attach --> </button>
        <button class="composer-send"> <!-- enter glyph --> </button>
      </div>
    </div>
    <div class="composer-meta">
      <span class="composer-meta-l">● opus 4.7 · 18 skills</span>
      <span class="composer-meta-r">⌘↵ send · ↑ recall · esc blur</span>
    </div>
  </div>
</div>
```

Visuals:
- `.term-composer` — padding `12 / 14 / 10`, bg `--background-secondary`, border-top 1 px hair.
- `.composer-shell` — grid `14 / 1fr / auto`, padding `8 / 10 / 8 / 12`, radius 10, border 1 px `--background-modifier-border`, bg `--background-primary`.
  - `:focus-within` → border `--interactive-accent` + soft 3-px glow `color-mix(slate 18% transparent)`.
- `.composer-prompt` — `▌` glyph, font-mono 14, color `--ws-term-prompt`, aligned end.
- `.composer-input` — textarea, font-mono 13 / 1.55, transparent bg, no border, auto-grows from 22 px to 160 px. Placeholder italic `--text-faint`.
- `.composer-icon` — 28 × 28, radius 7, transparent, hover → `--background-modifier-hover`. For the attach button.
- `.composer-send` — 28 × 28, radius 7. Default: muted bg. `.has-input`: `--interactive-accent` bg, `--text-on-accent`. Slight scale on hover.
- `.composer-meta` — flex row between two spans, font-mono 10.5, `--text-faint`. Nowrap with ellipsis.
- `.composer-meta .recall-hint` and `.blur-hint` are hidden in narrow (340 px) right-pane and shown only in fullscreen.

Behavior:
- `Enter` or `⌘ Enter` → send. (Shift+Enter inserts newline.)
- `↑` when input is empty → recall most recent message.
- `↓` → forward in history.
- `Esc` → blur.
- Send: forward to PTY, clear input, scroll canvas to bottom.
- Attach button (📎): in the real plugin, opens the same `[[` autocomplete that's already used inline; the prototype just inserts `[[`.

The composer is hidden when the right-pane tab is not Terminal (Backlinks / Outline / Calendar don't need it). CSS toggles via `.right-pane.tab-{name}`.

**Fullscreen variant:**
- Background flips to `--background-primary` (matches the canvas).
- Padding aligned with the centered canvas content (820 px max, `calc()`-padded), offset by the 232 px session rail.
- Composer input bumps to 14 px to match the canvas in fullscreen.

### `.terminal-statusbar` (below the canvas)

Always-visible footer chrome.
- padding `5 / 16`, border-top 1 px hair, bg `--background-secondary`.
- 10.5 px font-mono, color `--ws-term-dim`.
- Segments (left → right):
  - **model** · `--ws-term-accent` (e.g. `opus 4.7`)
  - **context use** — text + a 56 × 4 bar that fills proportionally; bar fill `--ws-term-prompt`.
  - **session length** — clock glyph + `5m 42s`.
  - **cost** — zap glyph + `$0.08`.
  - **flex spacer**
  - **skills loaded count**
  - **ready/busy indicator** — green check on ready, yellow circle on busy.

### `.cal-body` (Calendar)

A month grid plus a Recent daily notes list. Personal-zone accent colors mark today and notes-with-entries.

- container — padding `16 / 16 / 24`, bg `--background-secondary`, flex column, gap 16.
- `.cal-head` — display flex, gap 8. `.month` 15 px / 600 display font; `.year` same font, 400 weight, `--text-faint`. `.nav` cluster on the right with prev, "Today" pill, next icon buttons (24 × 24 each).
- `.cal-dow` — 7-col grid, gap 2. Each `<div>` is a centered uppercase Mon-Sun label, font-mono 10 / 500, `--text-faint`, padding `4 / 0`.
- `.cal-grid` — 7-col grid, gap 2. Each cell is a `<button class="cal-cell">`:
  - aspect 1 / 1, radius 6, font 12.5, tabular-nums.
  - `:hover` → bg `--background-modifier-hover`.
  - `.out-of-month` → opacity 0.55, color `--text-faint`.
  - `.has-note` → adds a `.pip` (4 × 4 dot, `--ws-zone-personal-fg`) at bottom 5.
  - `.today` → bg `--ws-zone-personal-bg`, color `--ws-zone-personal-fg`, weight 600. Hover stays the same (no darker on hover).
  - `.selected` → bg `--background-modifier-active-hover`, weight 600.
  - `.selected.today` → flipped: bg `--ws-zone-personal-fg`, color `--background-primary`.
- `.cal-section` — border-top 1 px hair, padding-top 12.
- `.cal-section-label` — same as elsewhere (11 / 500 uppercase 0.08em `--text-faint`).
- `.cal-note` — grid `14 / 1fr / auto`, padding `6 / 8`, radius 6, font 13. Leading `.dot` is 6 × 6 personal-fg circle. `.name` is mono 12. `.rel` is 11 `--text-faint`.

Behavior:
- Prev / next chevrons step the month cursor by ±1.
- "Today" button resets cursor + selected to today and opens that day's daily note.
- Clicking any day cell opens `personal/daily/{date}.md` in the editor; if the cell is in prev/next month, also shifts the month cursor.
- Clicking a row in "Recent daily notes" opens that note.

### `.rp-body` (Backlinks + Outline)

Shared shell used by the lighter right-pane views.

- container — padding `16 / 24`, bg `--background-secondary`, flex column, gap 12.
- `.rp-section-label` — 11 / 500 uppercase 0.08em `--text-faint`.
- `.rp-link` (Backlinks) — flex row, gap 8, padding `6 / 8`, radius 6. Hover bg modifier-hover. Leading glyph 13 `--text-faint`. Name mono 12.5. `.ctx` is 11.5 px `--text-faint` line-height 1.45 — wraps onto the next line as a short excerpt with the linking term wrapped in `<em>`.
- `.rp-outline-row` — block, padding `4 / 8`, radius 5, font 13. Variants `.h1` (600 normal), `.h2` (pl 18), `.h3` (pl 32 muted, 12.5), `.h4` (pl 46 faint, 12). Hover lifts to normal color.

---

## Chrome: `.icon-btn`

26 × 26, radius 6, glyph 14, color `--text-faint`. Hover `--background-modifier-hover` + `--text-normal`. `.icon-btn.is-active` adds `--background-modifier-active-hover` + `--text-normal`.

## `.btn`

```
padding: 7 14;
border-radius: 7;
border: 1px solid var(--background-modifier-border);
background: var(--background-primary);
color: var(--text-normal);
```

- `.btn.primary` — bg + border `--interactive-accent`, color `--text-on-accent`.
- `.btn.ghost` — transparent, color `--text-muted`, hover bg `--background-modifier-hover`.
- `.btn.danger` — color `--text-error`, hover bg `--background-modifier-error`.

## `.field` + `.select`

Padding `6 / 10`, radius 6, border 1 px `--background-modifier-border`, bg `--background-modifier-form-field`. Focus: border `--background-modifier-border-focus`.

`.field.mono` swaps to `--ws-font-mono`, 12.5 px. `.select` adds 28-px right pad for the inline chevron sprite.

## `.toggle`

```
width: 32; height: 18; radius: 9;
thumb: 14 × 14 circle, top 2 / left 2 → 16 (transition --ws-dur-fast --ws-ease-out)
off: bg --background-modifier-border
on : bg --interactive-accent
```

## `.segmented`

```
container: radius 7, padding 2, gap 2, bg --background-modifier-hover
option: padding 5 / 10, radius 5, font 12, color --text-muted
.active: bg --background-primary, color --text-normal, shadow --ws-shadow-card
```

---

## Modals

All modals share a scrim + modal pattern.

### `.scrim`
- Position fixed inset 0, bg `--ws-scrim` (rgba 20/20/20 .18 light, /0/0/0 .5 dark), z `--ws-z-modal`.
- `.scrim.center` — flex center; `.scrim.top` — flex top with padding-top 12vh.
- `.scrim.open` — fade in over `--ws-dur-modal`.

### `.modal`
- bg `--background-primary`, radius `--ws-radius-modal` (14), shadow `--ws-shadow-modal`, border 1 px.
- Entrance: `translateY(8px) → 0` with `--ws-ease-spring`, opacity 0 → 1.

### `.cmd-palette` (command palette)
- width 640, max-w 92vw, max-h 70vh.
- `.cmd-input-row` — padding `14 24`, border-bottom 1 px hair, gap 12. Search glyph + input + `⌘K` pill.
- `.cmd-input` — 15 px, no border, no outline, caret slate.
- `.cmd-list` — overflow-y auto.
- `.cmd-group` — 11 px uppercase 0.08em, padding `12 24 4`, color `--text-faint`.
- `.cmd-item` — grid `22 / 1fr / auto`, gap 12, padding `9 24`, font 14.
  - `.cmd-item.selected` — bg `--background-modifier-hover`.
  - `.sub` — 12 px `--text-faint`, margin-left 8.
  - `.hk kbd` — font-mono 11, bg `--background-modifier-hover`, border 1 px hair, padding `0 5`.
- `.cmd-footer` — border-top 1 px hair, padding `8 24`, font 11, hints with `<kbd>`.

### `.qc` (quick capture)
- width 540.
- `.qc-head` — padding `16 24 10`, border-bottom 1 px hair.
- `.qc-mic` — 36 × 36 radius 50%, bg `--ws-zone-personal-bg`, color `--ws-zone-personal-fg`. With `.recording` adds a 2-px ring pulse animation 1.4 s.
- `.qc-meta .qc-title` — 14 / 600.
- `.qc-meta .qc-status` — 12 `--text-faint`, with red blinking dot before "Recording".
- `.qc-body` — padding `16 24`, min-height 110, font 14 / 1.55. `.qc-transcript` — `--text-muted`. `.live` — `--text-normal` (currently transcribing).
- `.qc-foot` — padding `10 24 12`, border-top 1 px hair. Two `.dest` chips + spacer + cancel + primary save.
  - `.dest` — pill radius, padding `5 10`, bg `--background-modifier-hover`, font 12 `--text-muted`. Leading 8-px zone dot.

### `.settings` (settings modal)
- width 940, height 620, flex-direction row.
- `.settings-nav` — 220 px, bg `--background-secondary`, border-right 1 px hair. Sections grouped by header (Obsidian / WorkDesk). `.settings-nav-item` — padding `7 16`, font 13, radius 6, hover bg `--background-modifier-hover`. `.active` — bg `--background-modifier-active-hover`, weight 500.
- `.settings-body` — padding 32, overflow-y auto.
  - `h2` — 18 / 600, display font.
  - `.lead` — 13 `--text-muted`.
  - `.settings-section` — margin-top 24.
  - `.settings-section-label` — 11 / 500 uppercase 0.08em.
  - `.setting` — grid `1fr / auto`, gap 16, padding `12 / 0`, border-bottom 1 px hair. `.label` 13.5 / 500, `.desc` 12 `--text-faint` max-w 480.

### `.ob` (onboarding modal)
- width 560. Hero icon + step counter + back/next buttons + dot pager.
- 4 steps total (see `screens.md`).

---

## Edge bumpers

```css
.edge-expand {
  position: fixed; top: 50%;
  width: 16; height: 36;
  transform: translateY(-50%);
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  box-shadow: var(--ws-shadow-card);
}
.edge-expand.left  { left: var(--ws-ribbon-w); border-radius: 0 6px 6px 0; }
.edge-expand.right { right: 0; border-radius: 6px 0 0 6px; }
.app.no-left  .edge-expand.left  { opacity: 1; pointer-events: auto; }
.app.no-right .edge-expand.right { opacity: 1; pointer-events: auto; }
```

Only visible when the matching pane is collapsed. Fades in over `--ws-dur-pane`.

---

# Additions since the v1 spec

The components below were added during the iteration on the prototype. They use the same tokens + conventions; the markup lives in `prototype.html` / `prototype.js` and the CSS in `shared/app.css`.

## `.toast-stack` + `.toast`

Bottom-right notification stack. Fire via `window.showToast(message, severity, opts)`.

### API

```ts
window.showToast(
  message: string,
  severity?: 'success' | 'error' | 'info' | 'loading',
  opts?: { title?: string; sub?: string; duration?: number }
): HTMLElement;
```

- `duration` defaults to 3500 ms. `0` makes the toast sticky (used for `loading`).
- `loading` toasts are sticky by default until dismissed or replaced.

### Visuals

- Stack: `position: fixed; bottom: 16; right: 16; flex-direction: column-reverse;` so new toasts push older ones up.
- Each toast: `padding: 10 / 14`, radius `--ws-radius-card`, `--ws-shadow-modal`, min-width 240 px, max-width 360 px. Slate spring-in animation 220 ms.
- 3-px left border colored by severity: success = `--text-success`, error = `--text-error`, info = `--text-accent`, loading = `--text-muted`.
- Loading toast spins its glyph at 1 s/rotation.
- Optional `title` renders bold; `sub` renders 12 px muted under it.

### When to fire toasts

| Action                                       | Severity | Sample text                       |
|----------------------------------------------|----------|-----------------------------------|
| Quick capture saved                          | success  | "Capture saved · personal/captures" |
| File deleted                                 | success  | "Deleted _brief.md" + sub "Undo in 5s" |
| Settings reset                               | success  | "WorkDesk reset to defaults"      |
| Mic test passes                              | success  | "Groq returned in 412 ms"         |
| Copy to clipboard                            | success  | "Wikilink copied"                 |
| STT roundtrip in progress                    | loading  | "Transcribing…" (sticky)          |
| `/workdesk-doctor` running                   | loading  | "Running diagnostic…" (sticky)    |
| Terminal disconnected (sticky persistent banner is also valid) | error    | "Terminal disconnected"           |
| Vault permission denied                      | error    | "Can't write to vault"            |
| Update available                             | info     | "v1.0.1 available · Reload"       |

---

## `.banner.error / .warning / .info`

Persistent inline banner shown at the top of a pane when something needs the user's attention longer than a toast.

```html
<div class="banner error">
  <span class="glyph">…</span>
  <div class="body">Terminal disconnected · last session ended 12 s ago</div>
  <div class="actions"><button>Restart</button></div>
</div>
```

- padding `10 / 14`, font 13, border-bottom 1 px hair.
- `.error` uses `--background-modifier-error` + `--text-error`.
- `.warning` uses `--background-modifier-message` + `--text-warning`.
- `.info` uses `--ws-zone-atlas-bg` + `--ws-zone-atlas-fg`.
- `.actions button` uses `border: 1px solid currentColor; background: transparent`.

Where banners appear:
- Top of `.right-pane` when terminal is disconnected, with a "Restart session" action.
- Top of `.editor-pane` when the active file fails to load.
- Top of `#quick-capture` modal if the STT key is invalid.

---

## `.ws-popover` (generic context menu)

Replaces the legacy `.term-popover`. Used for right-click menus on files / folders / wikilinks, and as the underlying primitive for the session menu (⋯) and any future popover.

### API

```ts
showContextMenu(x: number, y: number, items: PopoverItem[]): void;

type PopoverItem =
  | { divider: true }
  | { label: string }                     // section header
  | { icon?: IconName; text: string; kbd?: string; danger?: boolean; act?: () => void };
```

The function auto-repositions if the popover would overflow the viewport.

### Visuals

- `position: fixed; padding: 6; radius: 10; box-shadow: var(--ws-shadow-popover); min-width: 200; max-width: 320; font 13.`
- Items: `padding: 7 / 10; radius: 6;` with hover `--background-modifier-hover`.
- `.glyph` 14 px, `--text-muted`.
- `.kbd-hint` right-aligned, font-mono 10.5, faint.
- `.danger` uses `--text-error` for text + glyph.
- Section labels: 10.5 px uppercase 0.08em letter-spacing.
- Dividers: 1 px hair, 4 px margin.
- Pop-in animation 120 ms ease-spring.
- Closes on outside click + Esc.

### Standard menu sets

**File** (right-click a `.row.is-file`):
- Rename… [F2]
- Duplicate
- Reveal in Finder
- ── divider
- Copy wikilink
- Copy markdown link
- ── divider
- Delete {name} (danger)

**Folder** (right-click a `.row.is-folder`):
- New note here
- New folder
- ── divider
- Rename… [F2]
- Reveal in Finder
- ── divider
- Delete folder (danger)

**Wikilink** (right-click a `.editor-body .wikilink`):
- {target} (section label)
- Open
- Open in new pane
- ── divider
- Copy link text
- Rename target…
- ── divider
- Unlink (danger)

**Tab session menu** (right-click a `.term-tab` OR click the ⋯ button):
- Rename tab [F2]
- Export transcript…
- ── divider
- End session (danger)

---

## `.skeleton` + `.spinner`

Loading affordances.

```html
<div class="skel-obj-card skeleton"></div>      <!-- mimics an .obj card -->
<div class="skel-row skeleton"></div>            <!-- mimics a tree row -->
<span class="spinner"></span>                    <!-- inline 16-px ring -->
```

- `.skeleton` — shimmer gradient between `--background-modifier-hover` and `--background-modifier-active-hover`, 1.4 s ease-in-out.
- `.skel-obj-card` — 56 px tall, card radius.
- `.skel-row` — 28 px tall, margin matches `.row`.
- `.spinner` — 16 × 16, 2-px ring, slate top-color, 0.8 s spin.

**Where to use**:
- Zone pane during initial vault scan: render 5 `.skel-obj-card` then 8 `.skel-row` inside the first card.
- Quick capture during STT: spinner in the save button + "Transcribing…" sticky toast.
- Terminal restart: spinner in the session-head while the PTY spawns.

---

## `.term-tabs` + `.term-tab`

Multi-tab strip above the terminal canvas. Each tab represents one PTY session.

```html
<div class="term-tabs" id="term-tabs">
  <button class="term-tab active" data-tab="0" data-status="waiting">
    <span class="tt-name">claude</span>
    <span class="tt-x" aria-label="Close">×</span>
  </button>
  <button class="term-tab" data-tab="1" data-status="working">…</button>
  <button class="term-tab" data-tab="2" data-status="idle">…</button>
  <button class="term-tab tt-new" id="term-tab-new">+</button>
</div>
```

### Tab status (`data-status`)

| Status      | Color                  | Pulses? | Meaning |
|-------------|------------------------|---------|---------|
| `idle`      | `--background-modifier-border` | no | Default; nothing happening |
| `working`   | `--ws-term-warn`       | no   | Claude is actively running a tool |
| `done`      | `--ws-term-success`    | no   | Last response finished, ready for input |
| `waiting`   | `--ws-term-accent`     | **1.4 s** | Claude asked a question; needs your answer |
| `error`     | `--ws-term-error`      | **1.0 s** | Something is wrong |

Only `waiting` and `error` pulse so the others stay quiet.

The plugin auto-detects status by parsing Claude Code's output stream (`onData` from xterm.js):
- New `▌` prompt at the bottom + cursor blink → `waiting`
- `●` tool call started, no `⎿` yet → `working`
- `⎿` matched its `●` recently → `done` for 5 s, then `idle`
- Any line containing `Error:` / `✗` / red ANSI → `error`

### Tab interactions

- Click → switch active tab.
- Double-click name → rename in place (`prompt()` in prototype; inline edit in plugin).
- Right-click → opens the session menu (Rename / Export / End).
- Hover → reveal × close button.
- × click → confirm + close.
- `+` button → new tab with default name like `claude (2)`.

---

## `.term-composer`

Already documented above but reinforcing here for the build:
- The composer is the **only** typing surface. The canvas above is read-only history.
- On send, write to the PTY (`terminal.write(text + '\r')`). No special handling beyond that.
- Backlink autocomplete (`[[`) lives **inside** the composer and the canvas — both surfaces should trigger it.

---

## Fullscreen layout details

Already covered in `### Fullscreen layout` above. Key invariant: the right-pane becomes a **grid** with the session list spanning rows 2–4 (full height below the session-head) and canvas / composer / statusbar stacking in column 2. `.terminal-body` uses `display: contents` to flatten its children into the right-pane grid.

---

## Editor decorations (`.editor-body.edit-mode`)

In CodeMirror edit mode, Obsidian renders `[[foo]]` as text with the brackets visible. Our spec keeps the brackets visible but de-emphasizes them so the inner content remains the focal point:

```css
.editor-body.edit-mode .wikilink::before { content: '[['; color: var(--text-faint); }
.editor-body.edit-mode .wikilink::after  { content: ']]'; color: var(--text-faint); }
.editor-body.edit-mode .tag::before      { content: '#';  color: var(--text-faint); }
```

The brackets / `#` use `--ws-font-mono` 0.9em to read as syntax, while the link text stays in the body sans family.

---

## Drag-drop hover states

Two surfaces accept dropped files:

### `.editor-pane.dragging-over`

When dragging a file from Finder over the editor pane, an absolute-positioned overlay appears with a dashed slate outline and the label "Drop to insert path":

```css
.editor-pane.dragging-over::after {
  content: 'Drop to insert path';
  position: absolute;
  inset: 38px 12px 12px;            /* leaves tabs + breadcrumb visible above */
  display: grid; place-items: center;
  background: color-mix(in oklch, var(--ws-zone-atlas-bg) 80%, transparent);
  border: 2px dashed var(--ws-zone-atlas-fg);
  border-radius: 12px;
  color: var(--ws-zone-atlas-fg);
  font-family: var(--ws-font-mono);
  font-size: 14px;
}
```

On drop: insert the file's relative path as a `[[wikilink]]` at the cursor + toast "Inserted file reference".

### `.right-pane.term-drop-over`

When dragging a file over the right pane (terminal), the canvas border becomes a dashed slate outline with a subtle blue tint:

```css
.right-pane.term-drop-over .terminal-body {
  outline: 2px dashed var(--ws-term-accent);
  outline-offset: -8px;
  background: color-mix(in oklch, var(--ws-zone-atlas-bg) 60%, var(--background-secondary));
}
```

On drop: insert the file's shell-escaped path at the cursor + toast "Inserted path in terminal".

---

## `.splitter` (resizable columns)

Thin 6-px hit zones at the boundary between zone-pane / editor and editor / right-pane.

```html
<div class="splitter splitter-left"  data-side="left"></div>
<div class="splitter splitter-right" data-side="right"></div>
```

- Position fixed; `splitter-left` at `calc(var(--ws-ribbon-w) + var(--ws-pane-w))`, `splitter-right` at `right: var(--ws-rpane-w)`.
- Hover shows a 1-px slate line in the middle; drag class shows a thicker slate band.
- Drag adjusts `--ws-pane-w` / `--ws-rpane-w` on `.app` (not `:root`) so it's local to that instance.
- Clamps: pane 240–560 px, rpane 280–600 px, editor min 360 px.
- Double-click to reset to default (340 px).
- Hidden in `body.focus-on` and `.app.term-fullscreen`.
- Persisted to `localStorage.wd-pane-widths` (and in the plugin: `settings.panes`).

---

## Settings · all six tabs

WorkDesk surfaces six tabs inside Obsidian's native Settings dialog under a "WorkDesk" group. The settings modal in the prototype mirrors this exactly.

### General
- Vault path (text input) · Auto-open today's daily note (toggle) · Daily note template (select)
- Theme: Match Obsidian theme (toggle) · Reduce motion (segmented: auto / on / off)
- Danger zone: Reset WorkDesk to factory defaults (danger button) · Re-scaffold zones (button)

### Zones
- Layout: Show Files view in ribbon (toggle) · Zone density (compact / cozy / spacious) · Expand active zone by default (toggle) · Show file counts (toggle)
- Zone manifest: Zones source path (text) · Object icons path (text) · Reload manifests (button)

### Terminal
- Defaults: Right pane is terminal by default (toggle) · Default shell (text) · Default cwd (text)
- Appearance: Terminal font (select) · Font size (segmented: 12/13/14/15) · Wrap long lines (toggle) · Cursor style (block/bar/underline)
- Sessions: Persist session names (toggle) · Scrollback lines (number)

### Quick capture
- Speech-to-text: STT provider (select) · API key (mono input, masked) · Stream partials (toggle)
- Capture behavior: Default destination (select) · Filename pattern (mono input) · Auto-log to system/log.md (toggle)
- Audio: Input device (select) · Test microphone (button — fires a success toast)

### Claude Code
- Integration: Claude binary path (mono input) · Auto-detect tab status (toggle) · Highlight wikilinks in output (toggle)
- Display: Show context % in statusbar (toggle) · Show cost estimate (toggle)
- Skills: Skills directory (mono input) · Show skills loaded count (toggle)

### About
- Plugin: Version · Check for updates (button) · Run diagnostic (button — triggers `/workdesk-doctor`)
- Resources: Repository link · Terminal sub-module link · License
- Credits paragraph

---

## Model display (statusbar, not picker)

The terminal statusbar shows `opus 4.7` as plain text (color `--ws-term-accent`). The user switches models via Claude Code's `/model` command inside the terminal — the statusbar reflects whichever the running session uses.

This is intentional: do **not** build a picker. The model is owned by Claude Code; the plugin only displays it.

---

## Backlink autocomplete (`.term-autocomplete`)

Already covered in components above but worth restating for the build:

- DOM popup positioned at the xterm.js cursor coordinates.
- Triggered by `[[` in either the composer OR inside the canvas itself.
- Up to 3–5 results, mono font, matched portion bolded in `--ws-term-accent`.
- Footer with `↑↓ nav · ↵ insert · esc close` hints.
- `Enter` inserts `selectedName]]` (the closing `]]` is auto-added) and dismisses.
- This is a real feature in the upstream workdesk-terminal plugin — see the repo README.


