# Workdesk Operating System

Curated visual surface for WorkdeskOS vaults — zones, command palette, quick capture, and a Claude Code terminal. Full feature set on macOS desktop; a reduced set on iPhone and iPad.

This plugin is built from the Claude Design handoff at `_inputs/design-handoff/`.

## Mobile (iPhone and iPad)

The plugin is built for Obsidian for iOS and iPadOS. Android uses the same code paths. Neither has been confirmed on a real device for this release. Install it through BRAT on the device, or let Obsidian Sync carry the plugin folder if community-plugin sync is turned on.

Works on mobile:

- Zones and the files view, read from the open vault. Tap a zone in the ribbon to open the zone pane in the left drawer. On iPhone the drawer closes when you open a note.
- Long-press a zone header, folder or file for the menu (new note, new folder, delete, other plugins' actions). Desktop keeps right-click.
- Voice capture (floating mic button and command), daily note, templates, command palette, focus mode, HTML preview inline, and the in-plugin updater.

Desktop only (hidden on mobile):

- The terminal and every terminal command. It needs a local shell and Python, which iOS does not provide.
- Claude Code session discovery and the resume note written by the updater.
- Infisical key pulls. On mobile, paste the speech-to-text key directly in Settings → Quick capture.
- "Open in browser" for HTML files, and the absolute vault path setting.

Mobile support is checked by automated tests that run the built `main.js` without Node or Electron against a stubbed Obsidian API, with iPhone and iPad platform flags. They are a simulation, not a device run, and do not guarantee the plugin loads on a given device.

## Install

```bash
ln -s /Users/khalilbenali/code/workdesk-operating-system <vault>/.obsidian/plugins/workdesk-operating-system
bash scripts/install-check.sh <vault>
```

Reload Obsidian and enable **Workdesk Operating System** under Community plugins.

## Build

```bash
pnpm install
pnpm build
node scripts/verify.mjs phase0
```

## License

MIT. The right-pane terminal is vendored from [`BenaliHQ/workdesk-terminal`](https://github.com/BenaliHQ/workdesk-terminal), forked from [`internetvin/internetvin-terminal`](https://github.com/internetvin/internetvin-terminal) — © Vin Verma, MIT. Source SHA `297fea0a2194c97426b67a8c9040c73035b8ce65`.

## Project

Build plan + spec at `/Users/khalilbenali/Workdesk-OS/gtd/projects/WorkdeskOS-Plugin/`.
