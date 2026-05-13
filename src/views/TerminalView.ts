// TerminalView — assembles the terminal pane (tab strip + canvas + statusbar
// + composer) and wires status parsing, fullscreen toggle, dropzone, and
// autocomplete handle. The right-pane Backlinks/Outline/Calendar siblings
// live in src/views/right-pane/ and are wired by the layout shell.

import { ItemView, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_WORKDESK_TERMINAL } from '../constants';
import { createTerminalSession, applySessionTheme } from '../terminal/init';
import type { TerminalSession } from '../terminal/session';
import { mountComposer, type ComposerHandle } from '../terminal/composer';
import { mountTabStrip, type TabStripHandle } from '../terminal/tabs';
import { mountStatusbar, type StatusbarHandle } from '../terminal/statusbar';
import { parseStatusFromChunk, type TabStatus } from '../terminal/status-parser';
import { createFullscreenToggle, type FullscreenHandle } from '../terminal/fullscreen';
import { attachDropzone } from '../terminal/dropzone';
import { mountAutocomplete, type AutocompleteHandle, type AutocompleteEntry } from '../terminal/autocomplete';
import type WorkdeskosPlugin from '../main';

export class TerminalView extends ItemView {
  private plugin: WorkdeskosPlugin;
  session: TerminalSession | null = null;
  composer: ComposerHandle | null = null;
  tabs: TabStripHandle | null = null;
  statusbar: StatusbarHandle | null = null;
  fullscreen: FullscreenHandle | null = null;
  private detachDropzone: (() => void) | null = null;
  private autocomplete: AutocompleteHandle | null = null;
  private tabStatuses = new Map<number, TabStatus>();

  constructor(leaf: WorkspaceLeaf, plugin: WorkdeskosPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_WORKDESK_TERMINAL;
  }

  getDisplayText(): string {
    return 'Terminal';
  }

  getIcon(): string {
    return 'terminal';
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass('terminal-body');

    const header = this.contentEl.createDiv({ cls: 'term-session-head' });
    this.tabs = mountTabStrip(header, {
      onActivate: (id) => this.tabs?.setActive(id),
      onClose: (id) => this.tabs?.removeTab(id),
      onNew: () => this.openNewTab(),
    });

    const fsBtn = header.createEl('button', { cls: 'icon-btn term-fullscreen-btn' });
    fsBtn.textContent = '⛶';
    fsBtn.setAttribute('aria-label', 'Toggle fullscreen');
    fsBtn.addEventListener('click', () => this.fullscreen?.isActive() ? this.fullscreen.exit() : this.fullscreen?.enter());

    const canvasHost = this.contentEl.createDiv({ cls: 'workdesk-term-host' });
    const vaultPath = resolveVaultPath(this.plugin);
    this.session = createTerminalSession(canvasHost, vaultPath, this.app);

    // Tab strip seeds with the first session id.
    const firstId = this.session.id;
    this.tabs.addTab({ id: firstId, name: this.session.name, status: 'idle' });
    this.tabStatuses.set(firstId, 'idle');

    this.session.onData((chunk) => {
      const current = this.tabStatuses.get(firstId) ?? 'idle';
      const next = parseStatusFromChunk(chunk, current);
      if (next !== current) {
        this.tabStatuses.set(firstId, next);
        this.tabs?.setStatus(firstId, next);
      }
    });

    queueMicrotask(() => this.session?.fit());

    this.statusbar = mountStatusbar(this.contentEl, {});

    this.composer = mountComposer(this.contentEl, {
      onSend: (text) => {
        this.session?.write(text + '\r');
      },
      onAttach: () => this.openComposerAutocomplete(),
    });

    this.detachDropzone = attachDropzone({
      element: canvasHost,
      onPathDropped: (escaped) => this.session?.write(escaped + ' '),
    });

    const appEl = (this.contentEl.closest('.app') as HTMLElement | null) ?? document.body;
    this.fullscreen = createFullscreenToggle({
      appEl,
      sessions: () => Array.from(this.tabStatuses.keys()).map((id) => ({
        id,
        name: this.tabs?.list().find((t) => t.id === id)?.name ?? `zsh ${id}`,
        active: id === this.session?.id,
      })),
      onActivate: () => {},
      onNew: () => this.openNewTab(),
      onExit: () => {},
    });
  }

  async onClose(): Promise<void> {
    this.detachDropzone?.();
    this.detachDropzone = null;
    this.autocomplete?.dismiss();
    this.autocomplete = null;
    this.fullscreen?.dispose();
    this.fullscreen = null;
    this.statusbar?.dispose();
    this.statusbar = null;
    this.composer?.dispose();
    this.composer = null;
    this.tabs?.dispose();
    this.tabs = null;
    this.session?.destroy();
    this.session = null;
    this.tabStatuses.clear();
  }

  refreshTheme(): void {
    if (this.session) applySessionTheme(this.session);
  }

  private openNewTab(): void {
    // Phase 4B keeps a single PTY backing tab; tabs.ts owns the strip itself.
    // Multi-session PTY orchestration lives in phase 5B / M3.
  }

  private openComposerAutocomplete(): void {
    if (this.autocomplete) {
      this.autocomplete.dismiss();
      this.autocomplete = null;
      return;
    }
    const files = this.app.vault.getMarkdownFiles();
    const candidates: AutocompleteEntry[] = files.map((f) => ({
      name: f.basename,
      folder: f.parent?.path ?? '',
    }));
    const textarea = this.composer?.textarea;
    if (!textarea) return;
    const rect = textarea.getBoundingClientRect();
    this.autocomplete = mountAutocomplete(this.contentEl, {
      candidates,
      anchor: { x: rect.left, y: rect.top - 8 },
      onAccept: (entry) => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = `${textarea.value.slice(0, start)}[[${entry.name}]]${textarea.value.slice(end)}`;
        const caret = start + entry.name.length + 4;
        textarea.selectionStart = textarea.selectionEnd = caret;
        textarea.focus();
        this.autocomplete = null;
      },
      onDismiss: () => {
        this.autocomplete = null;
      },
    });
  }
}

function resolveVaultPath(plugin: WorkdeskosPlugin): string {
  const adapter = plugin.app.vault.adapter as unknown as { basePath?: string };
  if (typeof adapter.basePath === 'string') return adapter.basePath;
  return plugin.settings.vault.path;
}
