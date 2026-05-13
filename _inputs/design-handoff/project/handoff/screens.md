# Screens catalog

Every screen / state a user could encounter, with the URL params that surface it in the prototype.

To see any of these, open [`prototype.html`](../prototype.html) with the parameters listed. The screens gallery ([`screens.html`](../screens.html)) embeds all of them in a grid.

## URL parameter contract

For an offline reference without running the prototype, see `handoff/screenshots/` — every screen below has been captured as a PNG and indexed in `handoff/screenshots/README.md`.

| Param      | Values                                  | Effect |
|------------|-----------------------------------------|--------|
| `zone`     | `atlas | gtd | intel | personal | system | config | files` | Sets the active zone |
| `file`     | filename (`_brief.md`, `_status.md`, `2026-05-13.md`, …) | Opens that file in the editor; auto-selects its zone |
| `theme`    | `light | dark`                          | Applies theme; persists in localStorage |
| `modal`    | `cmd | qc | settings | onboarding`      | Auto-opens the named modal |
| `focus`    | `1`                                     | Toggles focus mode on |
| `left`     | `0`                                     | Collapses zone pane |
| `right`    | `0`                                     | Collapses right (terminal) pane |
| `empty`    | `1`                                     | Renders current zone as empty (fresh-install state) |
| `embed`    | `1`                                     | Hides body scrollbars (for iframe embedding) |

---

## Default zone screens

The "ordinary day" surface for each zone.

| Screen                | URL params                        |
|-----------------------|-----------------------------------|
| atlas — _brief open   | `?zone=atlas&file=_brief.md`      |
| atlas — _status open  | `?zone=atlas&file=_status.md`     |
| gtd — projects + inbox| `?zone=gtd`                       |
| intel — reads/concepts| `?zone=intel`                     |
| personal — today daily| `?zone=personal&file=2026-05-13.md` |
| system — logs         | `?zone=system`                    |
| config — plugin guts  | `?zone=config`                    |
| files — flat tree     | `?zone=files`                     |

## Empty / first-run screens

| Screen                | URL params                        |
|-----------------------|-----------------------------------|
| atlas — empty         | `?zone=atlas&empty=1`             |
| gtd — empty           | `?zone=gtd&empty=1`               |
| intel — empty         | `?zone=intel&empty=1`             |
| personal — empty      | `?zone=personal&empty=1`          |
| system — empty        | `?zone=system&empty=1`            |
| config — empty        | `?zone=config&empty=1`            |

## Modals + overlays

| Screen                | URL params                        |
|-----------------------|-----------------------------------|
| Command palette       | `?modal=cmd`                      |
| Quick capture         | `?modal=qc`                       |
| Settings — WorkDesk   | `?modal=settings`                 |
| Onboarding (4 steps)  | `?modal=onboarding`               |

## Pane states

| Screen                | URL params                        |
|-----------------------|-----------------------------------|
| Zone pane collapsed   | `?left=0`                         |
| Right pane collapsed  | `?right=0`                        |
| Both panes collapsed  | `?left=0&right=0`                 |
| Focus mode            | `?focus=1`                        |
| Dark theme            | `?theme=dark`                     |

## Combination examples

| Intent                              | URL                                            |
|-------------------------------------|------------------------------------------------|
| Show settings dialog in dark        | `?theme=dark&modal=settings`                   |
| Show empty intel zone in dark       | `?theme=dark&zone=intel&empty=1`               |
| Show focus mode w/ daily note open  | `?file=2026-05-13.md&focus=1`                  |
| Show palette open over gtd          | `?zone=gtd&modal=cmd`                          |

---

## Screen-by-screen narrative

### `atlas — _brief.md open` (default landing)

The default landing state for a non-first-run operator. The atlas zone is selected; the projects card is expanded showing the `workdesk` subfolder with `_brief.md` selected and rendered in the editor. The right pane shows a Claude Code session already running against the open file.

**What the user sees**

- Ribbon: atlas highlighted (slate rail + dot ring); terminal icon active; mic at the bottom.
- Zone pane: header "atlas — People, companies, projects, decisions". Six zone cards. Projects expanded → workdesk folder open → `_brief.md` selected (active row).
- Editor: full markdown brief with properties block, callouts (note + warning + info + success), kbd, code block, table, task list with mix of checked/unchecked.
- Terminal: pre-loaded with a 13-line session showing "Reading _brief.md…" + the three-fork status doc summary.

### `gtd — projects + inbox`

GTD's inbox is empty → shows the green "caught up" state. Projects expanded with three sub-projects. Next-actions card shows "12". Waiting-for shows "4". Someday is empty.

### `intel`

Collapsed-by-default state. Four cards: reads (28), concepts (19), reference (24), briefings (5). No card expanded. Demonstrates the resting state of a long-lived knowledge zone.

### `personal — today's daily`

Daily card expanded with today's note selected. Editor shows the daily note with a properties block (weather, mood) + task list mixing checked/unchecked + a quoted capture from earlier that day.

### `system`

Four cards, mostly metadata. `log.md` shows "—" for count (it's an append-only file, not a folder of N items). `claude-log` shows 147 sessions. Used to demonstrate the "system" tone — quieter, infrastructural.

### `config`

The WorkDesk plugin & skill configuration zone. Settings.json + agents (3) + skills (18) + rules (11) + scripts (14) + templates (4) + defaults. This is where Claude Code's skills live.

### `files`

Flat all-zones tree, like Obsidian's default file explorer. Each top-level row is a zone with a colored pip + count. All collapsed by default; one click to drill.

### Empty zones (fresh install)

Each `*-empty` variant shows the `.zone-empty` component instead of cards: faded big-dot, "Nothing in {zone} yet.", "Objects appear as you capture, process, or onboard new content.", and a CTA button "Create first {zone} note".

### Command palette

Triggered by `⌘K` or the ribbon search icon. Top: search input with `⌘K` pill. Groups: Files, Zones, WorkDesk, Triage, View. ↑↓ navigates, ↵ commits, Esc dismisses. Selected row highlighted in modifier-hover.

### Quick capture

Triggered by `⌘⇧M` or the mic. Personal-rose pulsing ring around the mic glyph. Status "Recording · 00:07 · Groq whisper-large-v3" with a blinking red dot. Body shows a partial transcript with the latest words in normal weight and earlier words in `--text-muted`. Foot: two destination pills (personal/captures + system/log) + Cancel + Save (primary).

### Settings

Two-column dialog. Left nav grouped: **Obsidian** (Editor, Files & links, Appearance, Hotkeys) + **WorkDesk** (General, Zones, Terminal, Quick capture, Claude Code, About). Right shows the active tab — General by default. Sections: Vault (path, auto-open daily, daily template), Zones (show files view, density segmented, expand active), Quick capture (provider, API key, default dest), Terminal (right pane default, font, wrap), Danger zone (Reset…).

### Onboarding

4 steps:
1. **Welcome** (globe) — what WorkDesk is, the four-pane shell, replayable
2. **Five zones** (layers) — what each zone is, color-coded list
3. **Quick capture** (mic) — `⌘⇧M`, started-is-better-than-perfect callout
4. **Claude Code right pane** (code) — list of pre-loaded skills, "Get started"

Dot pager + Back / Next. Final step swaps Next → "Get started".

### Focus mode

Both panes collapsed. Body gets `.focus-on`. Ribbon, editor tabs, breadcrumb fade to 0.4 opacity. Hover restores. Editor body is unchanged — same 720-px max width. `Esc` exits.

### Dark theme

Same shell, warm coffee palette. Editor surface `#2a2723`. Slate accents shift to pale-slate. All zone pastels darken to maintain contrast.
