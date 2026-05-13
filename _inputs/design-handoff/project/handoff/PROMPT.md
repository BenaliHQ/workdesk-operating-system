# Build prompt — paste this into Claude Code to start the build.

Read these files in this order:

1. `handoff/README.md` — what the plugin is, the non-negotiables, what's in/out of scope.
2. `handoff/build-sequence.md` — the phased order to build everything.
3. `handoff/manifest.md` — plugin scaffold, view IDs, commands, settings schema.
4. `handoff/design-tokens.md` — every CSS variable. The values live in `shared/tokens.css`.
5. `handoff/components.md` — every UI component with geometry, states, and token map.
6. `handoff/screens.md` — every screen state and the URL params to surface it in the prototype.
7. `handoff/animations.md` — motion + easing tokens.
8. `handoff/accessibility.md` — focus, ARIA, contrast, keyboard surface.
9. `handoff/DONE-checklist.md` — the smoke test the plugin must pass to ship.
10. `handoff/types.d.ts` — TypeScript types for the data model. Drop this into `src/types.d.ts`.
11. `handoff/fixtures/zones.yaml` and `handoff/fixtures/object-icons.yaml` — default zone manifests; ship these as the auto-scaffold seed.

Then open `prototype.html` in a browser. This is the visual ground truth — every screen and interaction in the spec is reachable here. Inspect the DOM/CSS freely; the file is hand-authored for clarity.

The verbatim CSS lives in `shared/tokens.css` (design tokens) and `shared/app.css` (component styles). **Copy these two files into the plugin's `styles/` directory unchanged.** Do not edit them as part of the build. If you find an issue, raise it back rather than silently diverging — the prototype, spec docs, and CSS are co-evolved and any one-off change creates drift.

The icon set lives in `shared/icons.js`. Port to TypeScript as `src/icons.ts`. The shape is in `types.d.ts`.

Build in the order of `handoff/build-sequence.md`. Each phase has an acceptance criterion — verify before moving on. Don't skip ahead.

When you hit a question the docs don't answer, **stop and ask**. The spec was iterated heavily; if something feels under-specified, it's probably an intentional gap that needs a human call.

The plugin must pass `handoff/DONE-checklist.md` before it ships. That's the DONE criterion.

Target: < 500 LOC of TypeScript in the plugin's core (excluding vendored xterm.js + terminal). The visual surface does the heavy lifting; the plugin is a thin shell that wires Obsidian's APIs to the design.

Good luck. The hard part isn't building the plugin — it's making the visual surface so calm that nobody notices it's a plugin.
