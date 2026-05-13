# WorkdeskOS Plugin

Curated visual surface for WorkdeskOS vaults — zones, command palette, quick capture, and a Claude Code terminal. macOS desktop only.

This plugin is built from the Claude Design handoff at `_inputs/design-handoff/`.

## Install

```bash
ln -s /Users/khalilbenali/code/workdeskos-plugin <vault>/.obsidian/plugins/workdeskos-plugin
bash scripts/install-check.sh <vault>
```

Reload Obsidian and enable **WorkdeskOS Plugin** under Community plugins.

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
