// UpdateReadyModal — shown after the in-plugin updater writes new files
// to disk. Obsidian still has the old code in memory; this modal exists
// to make the reload step a one-click action.

import { type App, Modal, TFile } from 'obsidian';

export interface UpdateReadyOptions {
  fromVersion: string;
  toVersion: string;
  releaseUrl: string;
  /** Number of open terminal panes that the reload will close. */
  terminalCount: number;
  /** Number of recent Claude Code sessions discovered on disk. */
  sessionCount: number;
  /** Vault-relative path to the resume note in gtd/inbox/, or null if none was written. */
  resumeNotePath: string | null;
}

export class UpdateReadyModal extends Modal {
  private readonly opts: UpdateReadyOptions;

  constructor(app: App, opts: UpdateReadyOptions) {
    super(app);
    this.opts = opts;
  }

  onOpen(): void {
    const { contentEl, opts } = this;
    contentEl.empty();
    contentEl.addClass('workdesk-os-update-modal');

    contentEl.createEl('h3', { text: 'Workdesk update installed' });
    const body = contentEl.createEl('p');
    body.createSpan({ text: `Downloaded ` });
    body.createEl('strong', { text: `v${opts.toVersion}` });
    body.createSpan({ text: ` (was v${opts.fromVersion}). Reload Obsidian to apply.` });

    // Warning + resume-note link if the reload will disrupt terminal work.
    if (opts.terminalCount > 0 || opts.sessionCount > 0) {
      const warn = contentEl.createEl('p', { cls: 'workdesk-os-update-warn' });
      const parts: string[] = [];
      if (opts.terminalCount > 0) {
        parts.push(`${opts.terminalCount} terminal pane${opts.terminalCount === 1 ? '' : 's'} will close on reload.`);
      }
      if (opts.sessionCount > 0 && opts.resumeNotePath) {
        parts.push(`Saved ${opts.sessionCount} recent Claude Code session${opts.sessionCount === 1 ? '' : 's'} as paste-ready resume commands.`);
      }
      warn.setText(parts.join(' '));

      if (opts.resumeNotePath) {
        const linkRow = contentEl.createEl('p');
        const link = linkRow.createEl('a', { text: 'Open resume note', href: '#' });
        link.addEventListener('click', (event) => {
          event.preventDefault();
          this.openResumeNote();
        });
      }
    }

    const notes = contentEl.createEl('a', { text: 'View release notes', href: opts.releaseUrl });
    notes.setAttr('target', '_blank');
    notes.setAttr('rel', 'noopener');

    const buttonRow = contentEl.createDiv({ cls: 'workdesk-os-update-buttons' });
    const laterButton = buttonRow.createEl('button', { text: 'Later' });
    laterButton.addEventListener('click', () => { this.close(); });
    const reloadButton = buttonRow.createEl('button', { text: 'Reload now', cls: 'mod-cta' });
    reloadButton.addEventListener('click', () => {
      // Built-in Obsidian command — full window reload, equivalent to Cmd+R.
      const commands = (this.app as unknown as {
        commands?: { executeCommandById(id: string): boolean };
      }).commands;
      const ok = commands?.executeCommandById('app:reload') ?? false;
      if (!ok) {
        // Fallback: programmatic reload via the active window.
        activeWindow.location.reload();
      }
    });
  }

  private openResumeNote(): void {
    const path = this.opts.resumeNotePath;
    if (!path) return;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      void this.app.workspace.openLinkText(path, '', false);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
