# Vendored: workdesk-terminal

Source: https://github.com/BenaliHQ/workdesk-terminal
Upstream commit: 297fea0a2194c97426b67a8c9040c73035b8ce65
Vendored: 2026-05-17

`workdesk-terminal` is a metadata-only rebrand of
[internetvin/internetvin-terminal](https://github.com/internetvin/internetvin-terminal)
by Vin Verma. License: MIT (see `./LICENSE`).

## Why vendored, not depended on

We need vin's `TerminalView` class to register against our own plugin's
view type and ship alongside our other surfaces (zone view, palette,
settings, etc.). Vin distributes the implementation as a complete plugin
shell (`export default class TerminalPlugin extends Plugin`), not as a
library. Vendoring lets us strip the shell and keep just the building
blocks. The classes themselves are unmodified.

## Modifications from upstream

The only modifications applied while vendoring:

1. **View type constant.** `const VIEW_TYPE = "vin-terminal-view"` became
   `export const VIEW_TYPE = "workdesk-terminal"` so it slots into our
   existing `src/constants.ts` and matches the plugin folder name our
   users install under.

2. **Stripped plugin shell.** The `export default class TerminalPlugin
   extends Plugin` block (last 159 lines of upstream `main.ts`) was
   removed. Our `src/main.ts` owns the `Plugin` lifecycle, ribbon icon,
   and command palette wiring — not this file.

3. **Added `writePtyHelper(vaultBasePath, manifestDir)` export.** Upstream
   ran the python helper-script init inline inside `TerminalPlugin.onload`.
   With the shell stripped we surface it as a function our plugin shell
   calls during its own `onload`, before `registerView` runs.

4. **Made `TerminalView`, `ShortcutsModal`, `OutputCaptureModal` named
   exports.** Upstream declared them at module scope without export.

5. **Added the file header comment block** documenting items 1–4 inline.

No DOM classes, CSS, behavior, or logic from upstream were changed. The
`.vin-terminal-*` class names in `styles.css` are preserved verbatim so
future upstream patches apply cleanly.

## Updating

To pull a newer vin release:

```bash
cd /tmp && git clone https://github.com/BenaliHQ/workdesk-terminal.git
cp /tmp/workdesk-terminal/main.ts src/vendor/workdesk-terminal/index.ts
cp /tmp/workdesk-terminal/styles.css src/vendor/workdesk-terminal/styles.css
```

Then re-apply the five modifications listed above and update this NOTICE's
"Upstream commit" and "Vendored" dates.
