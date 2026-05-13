# WorkDesk Obsidian plugin — design handoff

This folder is the spec Claude Code consumes to build the **workdesk-surface** Obsidian plugin. Everything visual (tokens, components, screens) is already locked in the interactive prototype + HTML reference pages. These markdown docs are the same information in a form an LLM can ingest end-to-end.

## What to read, and in what order

1. **`PROMPT.md`** — paste this directly into Claude Code to start the build.
2. **`README.md`** *(this file)* — orientation + non-negotiables.
3. **`build-sequence.md`** — phased order of build work (Phase 0 → 6) with acceptance criteria per phase.
4. **`design-tokens.md`** — every CSS variable, with role + theme values. Copy `shared/tokens.css` verbatim into `styles/tokens.css`.
5. **`components.md`** — every UI component, with geometry, states, and the tokens it consumes.
6. **`manifest.md`** — plugin manifest, folder structure, view IDs, keybindings, settings schema.
7. **`animations.md`** — motion + easing tokens; what animates, what doesn't.
8. **`accessibility.md`** — focus order, contrast, ARIA, keyboard surface.
9. **`screens.md`** — every screen / state the user can encounter, with the URL params that surface it in the prototype.
10. **`DONE-checklist.md`** — the smoke test the plugin must pass to ship. Tick every item.
11. **`types.d.ts`** — TypeScript ambient types for the data model. Drop at `src/types.d.ts`.
12. **`fixtures/zones.yaml` + `fixtures/object-icons.yaml`** — default manifests; ship as the auto-scaffold seed.

## What the plugin is

`workdesk-surface` is a small Obsidian plugin (target **< 500 LOC** core, no bundled UI framework) that overlays a curated visual surface on top of a WorkDesk-OS vault. It does **not** replace Obsidian's editor — it replaces the chrome around it.

The surface is a four-pane grid:

```
┌─────────┬───────────────┬──────────────────┬───────────────┐
│         │               │                  │               │
│ Ribbon  │  Zone pane    │  Editor          │  Right pane   │
│ (64 px) │  (340 px)     │  (fluid)         │  (340 px)     │
│         │               │                  │  (Terminal /  │
│         │               │                  │   Backlinks / │
│         │               │                  │   Outline /   │
│         │               │                  │   Calendar)   │
└─────────┴───────────────┴──────────────────┴───────────────┘
```

- The **Ribbon** lists the five zones + a Files mode + tool icons.
- The **Zone pane** replaces Obsidian's File Explorer view with a curated list of objects, organized as zone cards that expand into a folder tree.
- The **Editor** is Obsidian's native markdown editor, with our typography overrides.
- The **Right pane** hosts a curated set of view tabs; the default is a Claude Code terminal session.

## Non-negotiables

1. **Tokens come first.** Every color, font size, spacing value, radius, and shadow must reference a token from `tokens.css`. No magic numbers in component CSS.
2. **Obsidian-native variable names.** Surfaces use `--background-primary`, `--text-normal`, `--interactive-accent`, etc. WorkDesk-specific tokens are namespaced `--ws-*`. Both layers ship in the same `tokens.css`.
3. **Light + dark must both look polished.** Switch via the standard `.theme-light` / `.theme-dark` body class. The plugin must respect Obsidian's theme — never force a theme.
4. **Don't reimplement Obsidian.** Use the host's File Explorer / Markdown View / Workspace APIs wherever possible. The plugin curates, it doesn't replace.
5. **Calm beats clever.** The visual surface should read as deliberate, never busy. If a motion or color feels like it's trying to impress, remove it.
6. **No emoji in chrome.** Custom icon set only. See `components.md` for the glyph table.
7. **Keep core small.** Target < 500 LOC for the plugin's TypeScript. Heavy lifting belongs in WorkDesk-OS, not the plugin.

## DONE for the plugin

Yvette opens Obsidian after a one-line install, sees the four-pane WorkDesk surface, switches between zones, opens a daily note, runs quick capture, opens the command palette, toggles dark mode, and runs `/triage` from the terminal — all without an expert on the call.

## What lives outside this plugin

- The **vault structure** (5 zones, 7 stock folders each) lives in WorkDesk-OS templates, not this plugin.
- The **Claude Code terminal** is an existing third-party plugin (`workdesk-terminal`). This plugin coordinates with it but doesn't ship it.
- **Skills** (`/triage`, `/onboarding`, `/workdesk-doctor`) live in `config/skills`, not in the plugin.

The plugin's job is **only** the visual surface.
