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
import type WorkdeskOSPlugin from '../main';

export class TerminalView extends ItemView {
  private plugin: WorkdeskOSPlugin;
  private sessions = new Map<number, TerminalSession>();
  private activeId: number | null = null;
  composer: ComposerHandle | null = null;
  tabs: TabStripHandle | null = null;
  statusbar: StatusbarHandle | null = null;
  fullscreen: FullscreenHandle | null = null;
  private canvasHost: HTMLElement | null = null;
  private detachDropzone: (() => void) | null = null;
  private autocomplete: AutocompleteHandle | null = null;
  private tabStatuses = new Map<number, TabStatus>();

  constructor(leaf: WorkspaceLeaf, plugin: WorkdeskOSPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  /** Active session, or null when no tabs are open. */
  get session(): TerminalSession | null {
    return this.activeId === null ? null : (this.sessions.get(this.activeId) ?? null);
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
      onActivate: (id) => this.setActiveSession(id),
      onClose: (id) => this.closeSession(id),
      onNew: () => this.openNewSession(),
    });

    const fsBtn = header.createEl('button', { cls: 'icon-btn term-fullscreen-btn' });
    fsBtn.textContent = '⛶';
    fsBtn.setAttribute('aria-label', 'Toggle fullscreen');
    fsBtn.addEventListener('click', () => this.fullscreen?.isActive() ? this.fullscreen.exit() : this.fullscreen?.enter());

    this.canvasHost = this.contentEl.createDiv({ cls: 'workdesk-term-host' });

    this.statusbar = mountStatusbar(this.contentEl, {});

    this.composer = mountComposer(this.contentEl, {
      onSend: (text) => {
        this.session?.write(text + '\r');
      },
      onAttach: () => this.openComposerAutocomplete(),
    });

    this.detachDropzone = attachDropzone({
      element: this.canvasHost,
      onPathDropped: (escaped) => this.session?.write(escaped + ' '),
    });

    const closest = this.contentEl.closest('.app');
    const appEl: HTMLElement = (closest instanceof HTMLElement ? closest : null) ?? activeDocument.body;
    this.fullscreen = createFullscreenToggle({
      appEl,
      sessions: () => Array.from(this.sessions.values()).map((s) => ({
        id: s.id,
        name: this.tabs?.list().find((t) => t.id === s.id)?.name ?? s.name,
        active: s.id === this.activeId,
      })),
      onActivate: (id) => this.setActiveSession(id),
      onNew: () => this.openNewSession(),
      onExit: () => {},
    });

    this.openNewSession();
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
    for (const s of this.sessions.values()) s.destroy();
    this.sessions.clear();
    this.activeId = null;
    this.canvasHost = null;
    this.tabStatuses.clear();
  }

  refreshTheme(): void {
    for (const s of this.sessions.values()) applySessionTheme(s);
  }

  /** Public API — called by the plugin's `workdesk:terminal:new-tab` command. */
  openNewSession(): void {
    if (!this.canvasHost) return;
    const vaultPath = resolveVaultPath(this.plugin);
    const session = createTerminalSession(this.canvasHost, vaultPath, this.app);
    this.sessions.set(session.id, session);
    this.tabs?.addTab({ id: session.id, name: session.name, status: 'idle' });
    this.tabStatuses.set(session.id, 'idle');
    session.onData((chunk) => {
      const current = this.tabStatuses.get(session.id) ?? 'idle';
      const next = parseStatusFromChunk(chunk, current);
      if (next !== current) {
        this.tabStatuses.set(session.id, next);
        this.tabs?.setStatus(session.id, next);
      }
    });
    this.setActiveSession(session.id);
  }

  private setActiveSession(id: number): void {
    if (!this.sessions.has(id)) return;
    this.activeId = id;
    for (const [sid, s] of this.sessions.entries()) {
      s.containerEl.style.display = sid === id ? '' : 'none';
    }
    this.tabs?.setActive(id);
    queueMicrotask(() => this.session?.fit());
    // Re-render the fullscreen session rail so it picks up the new active
    // highlight and any session that was just added. refresh() is a no-op
    // when the rail isn't mounted, so it's safe to call unconditionally.
    this.fullscreen?.refresh();
  }

  private closeSession(id: number): void {
    const session = this.sessions.get(id);
    if (!session) return;
    session.destroy();
    this.sessions.delete(id);
    this.tabStatuses.delete(id);
    this.tabs?.removeTab(id);
    if (this.activeId === id) {
      const result = this.sessions.keys().next();
      const nextId: number | null = result.done ? null : result.value;
      this.activeId = nextId;
      if (nextId !== null) this.setActiveSession(nextId);
    }
    this.fullscreen?.refresh();
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

function resolveVaultPath(plugin: WorkdeskOSPlugin): string {
  const adapter = plugin.app.vault.adapter as unknown as { basePath?: string };
  if (typeof adapter.basePath === 'string') return adapter.basePath;
  return plugin.settings.vault.path;
}
