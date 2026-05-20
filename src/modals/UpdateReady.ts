// UpdateReadyModal — shown after the in-plugin updater writes new files
// to disk. Obsidian still has the old code in memory; this modal exists
// to make the reload step a one-click action.

import { type App, Modal } from 'obsidian';

export interface UpdateReadyOptions {
  fromVersion: string;
  toVersion: string;
  releaseUrl: string;
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

  onClose(): void {
    this.contentEl.empty();
  }
}
