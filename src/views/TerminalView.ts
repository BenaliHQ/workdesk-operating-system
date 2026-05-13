// TerminalView — Obsidian ItemView hosting a TerminalSession. Registered
// under VIEW_TYPE_WORKDESK_TERMINAL. Phase 4A.1 keeps this bare: one tab,
// no composer/tabs/statusbar. Those land in 4A.2 and 4B.

import { ItemView, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_WORKDESK_TERMINAL } from '../constants';
import { createTerminalSession, applySessionTheme } from '../terminal/init';
import type { TerminalSession } from '../terminal/session';
import type WorkdeskosPlugin from '../main';

export class TerminalView extends ItemView {
  private plugin: WorkdeskosPlugin;
  session: TerminalSession | null = null;

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

    const host = this.contentEl.createDiv({ cls: 'workdesk-term-host' });
    const vaultPath = resolveVaultPath(this.plugin);
    this.session = createTerminalSession(host, vaultPath, this.app);
    queueMicrotask(() => this.session?.fit());
  }

  async onClose(): Promise<void> {
    this.session?.destroy();
    this.session = null;
  }

  refreshTheme(): void {
    if (this.session) applySessionTheme(this.session);
  }
}

function resolveVaultPath(plugin: WorkdeskosPlugin): string {
  const adapter = plugin.app.vault.adapter as unknown as { basePath?: string };
  if (typeof adapter.basePath === 'string') return adapter.basePath;
  return plugin.settings.vault.path;
}
