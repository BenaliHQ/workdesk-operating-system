# Screenshots

Static PNG captures of every WorkDesk screen state. Generated from `prototype.html` at HQ (PNG, ~1480×920) on May 13 2026.

Use these when you need a pixel-perfect reference and the prototype isn't available — for example, while writing component code, comparing against the spec, or pasting into PR descriptions.

## Index

### Zone views (default state, content populated)

| File | Screen |
|------|--------|
| `01-zone.png` | **atlas** — `_brief.md` open. Full markdown coverage: properties, callouts, kbd, code, tables, task list. |
| `02-zone.png` | **atlas** — `_status.md` open. Shorter project status doc. |
| `03-zone.png` | **gtd** — `_status.md` open. Three projects expanded, inbox shows "caught up" green check. |
| `04-zone.png` | **intel** — all cards collapsed. Resting state of a long-lived knowledge zone. |
| `05-zone.png` | **personal** — `2026-05-13.md` (today's daily) open. Properties + task list + captures + journal block. |
| `06-zone.png` | **system** — logs + claude-log + reference + processing. Quieter, infrastructural feel. |
| `07-zone.png` | **config** — settings.json + agents + skills + rules + scripts + templates. Where Claude Code lives. |
| `08-zone.png` | **files** — flat tree of every zone as a folder. Stock-Obsidian style file explorer. |

### Empty states (fresh install — no objects yet)

| File | Screen |
|------|--------|
| `01-empty.png` | **atlas** empty — big faded globe + "Nothing in atlas yet." + create CTA. |
| `02-empty.png` | **gtd** empty. |
| `03-empty.png` | **intel** empty. |
| `04-empty.png` | **personal** empty. |
| `05-empty.png` | **system** empty. |
| `06-empty.png` | **config** empty. |
| `07-empty.png` | *(transition shot — ignore)* |

### Modals + overlays

| File | Screen |
|------|--------|
| `01-modal.png` | **Command palette** (⌘K). Grouped commands (Files / Zones / WorkDesk / Triage / View). |
| `02-modal.png` | **Quick capture** (⌘⇧M). Pulse-ringed mic, live transcript, destination chips, save/cancel. |
| `03-modal.png` | **Onboarding** modal. 4-step intro with dot pager + Back/Next. |
| `04-modal.png` | *(close transition — ignore)* |

### Settings — all six WorkDesk tabs

| File | Screen |
|------|--------|
| `01-settings.png` | **General** — Vault path · auto-open daily · daily template · theme · reduce motion · danger zone (Reset / Re-scaffold). |
| `02-settings.png` | **Zones** — show files view · density (compact/cozy/spacious) · expand active · file counts · zone manifest path · object icons path · reload manifests. |
| `03-settings.png` | **Terminal** — right pane default · shell · cwd · font · font size · wrap · cursor style · persist sessions · scrollback. |
| `04-settings.png` | **Quick capture** — STT provider · API key (masked) · stream partials · default destination · filename pattern · auto-log · audio input · mic test. |
| `05-settings.png` | **Claude Code** — binary path · auto-detect tab status · highlight wikilinks · context % · cost estimate · skills directory · skills count. |
| `06-settings.png` | **About** — version · check for updates · run diagnostic · repository links · license · credits. |
| `07-settings.png` | *(reset to General — ignore)* |

### Pane states + theme

| File | Screen |
|------|--------|
| `01-pane.png` | Default four-pane shell in light mode. |
| `02-pane.png` | **Zone pane collapsed** — ribbon + editor + right pane, edge bumper on the left. |
| `03-pane.png` | **Right pane collapsed** — ribbon + zone pane + editor, edge bumper on the right. |
| `04-pane.png` | **Focus mode** (⌘⇧F) — both panes collapsed, ribbon + chrome dimmed to 40%. |
| `05-pane.png` | **Dark theme** — atlas zone, full shell. |
| `06-pane.png` | **Dark theme** — gtd zone. |
| `07-pane.png` | **Dark theme** — personal zone with daily note. |
| `08-pane.png` | *(back to light/atlas — ignore)* |

### Terminal modes

| File | Screen |
|------|--------|
| `01-terminal.png` | **Terminal fullscreen** (light) — ribbon stays, zone + editor collapse, session list on the left, canvas centered, composer + statusbar in the right column. |
| `02-terminal.png` | **Terminal fullscreen** (dark). |
| `03-terminal.png` | *(reset — ignore)* |

### Right-pane tabs (in normal panel mode)

| File | Screen |
|------|--------|
| `01-right-pane.png` | **Calendar** tab — May 2026 with notes-with-pips, today highlighted in personal-rose, "Notes on Today" list below with zone-colored dots. |
| `02-right-pane.png` | **Backlinks** tab — list of 5 backlinks to `_brief.md` + 2 "mentioned, not linked" entries. |
| `03-right-pane.png` | **Outline** tab — auto-extracted headings from the open file. |
| `04-right-pane.png` | *(back to terminal — same as `01-zone.png` view — ignore)* |

## Naming convention

`{NN}-{group}.png` where:
- `NN` — 1-indexed order within the group.
- `group` — one of `zone | empty | modal | settings | pane | terminal | right-pane`.

Transition / reset shots are marked `*(ignore)*` in the table above.

## How these were generated

Each batch was produced by a single `save_screenshot` call against `prototype.html` with sequential JS state-change steps. The captures are HQ (lossless PNG) and reflect the prototype's exact rendering at the time of capture.

To regenerate, open `prototype.html`, then drive each state via the same JS the index uses (visible in this project's git history, or trivially re-derivable from the URL params in `handoff/screens.md`).
