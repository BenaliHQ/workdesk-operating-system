# Plugin manifest, folder structure, and APIs

The bare minimum scaffold for the `workdesk-surface` Obsidian plugin.

---

## `manifest.json`

```json
{
  "id": "workdesk-surface",
  "name": "WorkDesk",
  "version": "1.0.0",
  "minAppVersion": "1.5.0",
  "description": "Curated visual surface for WorkDesk-OS vaults — zones, command palette, quick capture, and a Claude Code terminal.",
  "author": "Benali",
  "authorUrl": "https://github.com/BenaliHQ/workdesk-os",
  "isDesktopOnly": false
}
```

---

## Repository / folder structure

```
workdesk-surface/
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── README.md
│
├── src/
│   ├── main.ts                    # Plugin entry — registers everything
│   ├── settings.ts                # Settings tab + schema
│   ├── data.ts                    # Zone model + persistence
│   │
│   ├── views/
│   │   ├── ZoneView.ts            # ItemView · 'workdesk-zone' — the left pane
│   │   ├── TerminalView.ts        # ItemView · 'workdesk-terminal' wrapper
│   │   └── RibbonControl.ts       # Custom ribbon (renders below stock ribbon)
│   │
│   ├── modals/
│   │   ├── CommandPalette.ts      # Fuse-filtered command list (⌘K)
│   │   ├── QuickCapture.ts        # Mic recorder + STT post (⌘⇧M)
│   │   └── Onboarding.ts          # 4-step intro modal
│   │
│   ├── components/
│   │   ├── ZoneCard.ts            # .obj — renders a zone-card
│   │   ├── TreeRow.ts             # .row — file/folder row
│   │   └── Toast.ts               # Future
│   │
│   ├── services/
│   │   ├── stt.ts                 # Groq / OpenAI / Deepgram providers
│   │   ├── vault-scan.ts          # Walks vault into the ZONES model
│   │   └── focus.ts               # Focus mode toggle + state
│   │
│   └── icons.ts                   # WorkDesk SVG icon set
│
├── styles/
│   ├── tokens.css                 # ← copy from shared/tokens.css verbatim
│   └── app.css                    # ← copy from shared/app.css verbatim
│
└── tests/
    └── …
```

Build target: a single `main.js` + `manifest.json` + `styles.css` (concatenated from `tokens.css` + `app.css`).

---

## Obsidian view IDs

Register all of these in `main.ts` `onload()`:

| View ID                | Class             | Replaces                       |
|------------------------|-------------------|--------------------------------|
| `workdesk-zone`        | `ZoneView`        | Default `file-explorer` view   |
| `workdesk-terminal`    | `TerminalView`    | Right pane default (calls into existing `workdesk-terminal` plugin) |

When the plugin loads on a vault for the first time, it migrates the user's workspace so the default left pane is `workdesk-zone` and the default right pane is `workdesk-terminal`.

---

## Commands (`addCommand`)

| ID                                 | Name                          | Hotkey         |
|------------------------------------|-------------------------------|----------------|
| `workdesk:command-palette`         | Open WorkDesk command palette | `⌘ K`          |
| `workdesk:today`                   | Open today's daily note       | `⌘ T`          |
| `workdesk:toggle-terminal`         | Toggle terminal pane          | `⌘ J`          |
| `workdesk:toggle-focus`            | Toggle focus mode             | `⌘ ⇧ F`        |
| `workdesk:quick-capture`           | Quick capture                 | `⌘ ⇧ M`        |
| `workdesk:goto-zone-{atlas|gtd|intel|personal|system|config}` | Go to zone | — |
| `workdesk:onboarding`              | Replay onboarding             | —              |
| `workdesk:doctor`                  | Run /workdesk-doctor          | —              |
| `workdesk:triage`                  | Run /triage on inbox          | —              |

All hotkeys are rebindable through Obsidian's Hotkeys settings — we register defaults, the user can override.

---

## Settings schema

Stored in `data.json` (Obsidian plugin data) via `loadData()` / `saveData()`:

```ts
interface WorkDeskSettings {
  vault: {
    path: string;                           // default: '~/Workdesk-OS'
    autoOpenDaily: boolean;                 // default: true
    dailyTemplatePath: string;              // default: 'config/templates/daily.md'
  };
  zones: {
    showFilesView: boolean;                 // default: true
    density: 'compact' | 'cozy' | 'spacious'; // default: 'cozy'
    expandActiveOnLoad: boolean;            // default: true
  };
  capture: {
    provider: 'groq' | 'openai' | 'deepgram';
    apiKey: string;                         // encrypted
    model: string;                          // default: 'whisper-large-v3'
    defaultDest: 'personal/captures' | 'system/inbox' | 'gtd/inbox';
  };
  terminal: {
    rightPaneIsTerminal: boolean;           // default: true
    font: 'Geist Mono' | 'JetBrains Mono' | 'IBM Plex Mono' | 'SF Mono';
    wrap: boolean;                          // default: true
  };
  onboarding: {
    completed: boolean;                     // default: false
    lastSeen: number;                       // unix ms
  };
}
```

API keys must be stored via Obsidian's encrypted credential helper, not in `data.json` directly.

---

## Vault scan → zone model

`services/vault-scan.ts` produces a JS object of the same shape as [`shared/zones.js`](../shared/zones.js):

```ts
type ZoneId = 'atlas' | 'gtd' | 'intel' | 'personal' | 'system' | 'config';

interface ZoneObject {
  id: string;
  title: string;
  sub: string;
  count: number | '—';
  icon: string;        // glyph name from icons.ts
  expanded?: boolean;
  empty?: 'caught-up';
  children?: TreeNode[];
}
interface TreeNode {
  type: 'folder' | 'file';
  name: string;
  count?: number;
  depth: number;
  active?: boolean;
  expanded?: boolean;
  children?: TreeNode[];
}
```

The walker reads two manifests:
- `config/zones.yaml` — defines which top-level folders belong to which zone and which "objects" each zone exposes (e.g. atlas exposes `projects/`, `people/`, `companies/`, etc.).
- `config/object-icons.yaml` — maps object names → icon glyph names.

If those manifests don't exist, fall back to the default in `shared/zones.js`.

---

## Right-pane terminal integration

This plugin does **not** ship a terminal. It coordinates with the existing `workdesk-terminal` plugin via Obsidian's workspace API:

1. On load, check if `workdesk-terminal` is enabled. If not, surface a toast: "Install workdesk-terminal for the right pane".
2. Register `workdesk-terminal` as the default right-pane view.
3. Expose `workdesk:toggle-terminal` which proxies to `app.commands.executeCommandById('workdesk-terminal:toggle')`.

The terminal styling shown in the prototype (`.term-line`, `.term-prompt`, etc.) is part of `workdesk-terminal`'s own CSS, not this plugin — but the tokens are shared via `tokens.css` so it picks up our palette automatically.

---

## Focus mode

`services/focus.ts` toggles `body.focus-on`. The class is the only contract — all dim/opacity transitions live in CSS. Persisted in `data.json` so it survives reload.

When entering focus mode:
1. Remember current `.no-left` / `.no-right` state.
2. Add `.no-left .no-right` to `.app` (collapses both panes).
3. Add `.focus-on` to `body`.

When exiting:
1. Restore prior pane state.
2. Remove `.focus-on`.

---

## Quick capture flow

1. User hits `⌘⇧M` (or clicks the mic).
2. `QuickCapture` modal opens with `.qc-mic.recording`.
3. Audio captured via `MediaRecorder` → POST to STT provider (Groq by default).
4. Live transcript streams into `.qc-transcript .live`.
5. On save: create a new note at `personal/captures/{timestamp}-{slug}.md` and append a one-line entry to `system/log.md` of shape `2026-05-13T11:02:14Z capture: {first-words}…`.
6. On cancel / discard: drop the audio + transcript.

---

## Onboarding gating

If `settings.onboarding.completed === false` on plugin load, show the onboarding modal automatically once. The user can dismiss it (sets `completed: true`) or replay it later via `workdesk:onboarding`.

---

## Things this plugin does NOT do

- It does not implement the markdown editor — Obsidian does.
- It does not implement the file explorer's persistence — Obsidian does.
- It does not implement search — uses Obsidian's `omnisearch:open` command.
- It does not implement the terminal — `workdesk-terminal` does.
- It does not implement skills, agents, or rules — those live in `config/` and run via the terminal.

Keep this plugin small.

---

## HTML file rendering

Obsidian does not natively render `.html` files as previewed HTML — they open as text. WorkDesk fills this gap by registering an `HtmlView` for the `.html` extension. The view loads the file's contents into an iframe (sandbox: `allow-same-origin` only; no `allow-scripts` by default) and shows it in the middle pane.

### Behavior

1. **Default** — clicking an `.html` file opens it in the WorkDesk `HtmlView`. The middle pane shows a small chip identifying the file + a button to open in the system browser, then the iframe.
2. **Fallback** — if the user has disabled the WorkDesk `HtmlView` for `.html` files in settings, clicking opens the file in the system browser via `window.open(file://…)`.
3. **Settings toggle** — `WorkDeskSettings.html.previewMode: 'inline' | 'browser'` (default `'inline'`).

### View skeleton

```ts
import { FileView, TFile, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_HTML } from './constants';

export class HtmlView extends FileView {
  allowNoFile = false;
  iframe: HTMLIFrameElement;

  getViewType() { return VIEW_TYPE_HTML; }
  getDisplayText() { return this.file?.basename ?? 'HTML'; }
  getIcon() { return 'code'; }

  async onLoadFile(file: TFile) {
    const text = await this.app.vault.read(file);
    this.contentEl.empty();
    this.contentEl.addClass('workdesk-html-view');
    this.renderChip(file);
    this.iframe = this.contentEl.createEl('iframe', {
      attr: { sandbox: 'allow-same-origin', srcdoc: text, style: 'width:100%;height:100%;border:0;' },
    });
  }

  private renderChip(file: TFile) {
    const chip = this.contentEl.createDiv({ cls: 'workdesk-html-chip' });
    chip.createSpan({ text: file.basename + '.html', cls: 'name' });
    chip.createSpan({ text: 'rendered inline · workdesk-html-view', cls: 'sub' });
    const btn = chip.createEl('button', { text: 'Open in browser ↗', cls: 'btn ghost' });
    btn.onclick = () => window.open('file://' + file.path);
  }
}
```

### Registering the view

In `main.ts`:
```ts
this.registerView(VIEW_TYPE_HTML, (leaf) => new HtmlView(leaf, this));
this.registerExtensions(['html', 'htm'], VIEW_TYPE_HTML);
```

### Security note

Sandbox the iframe with `allow-same-origin` only by default. The HTML file may contain `<script>` tags; without `allow-scripts` they will not execute, which prevents malicious vault content from running with elevated privileges. If the user wants script execution (for design previews, etc.), expose `html.allowScripts: boolean` in settings and add `allow-scripts` when enabled — but only document this once, with a warning.
