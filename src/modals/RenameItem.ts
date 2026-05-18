// Rename modal — opens immediately after createNewNoteIn / createNewFolderIn
// so a freshly-created `Untitled` file or folder lands the operator on a
// rename prompt instead of leaving them with the default name.
//
// Pattern mirrors Obsidian's File Explorer "new file → inline rename" UX.
// Inline-rename inside the zone-pane DOM would require hooking the
// File Explorer's internal rename API (private); a small focused modal is
// the equivalent UX without the private-API dependency.

import { type App, Modal, TFile, TFolder } from 'obsidian';

export interface RenameItemOptions {
  /** The newly created file or folder. */
  target: TFile | TFolder;
  /** Title shown at the top of the modal. */
  heading: string;
}

export class RenameItemModal extends Modal {
  private readonly opts: RenameItemOptions;
  private input!: HTMLInputElement;
  private committed = false;

  constructor(app: App, opts: RenameItemOptions) {
    super(app);
    this.opts = opts;
  }

  onOpen(): void {
    const { contentEl, opts } = this;
    contentEl.empty();
    contentEl.addClass('workdesk-os-rename-modal');

    contentEl.createEl('h3', { text: opts.heading });

    const target = opts.target;
    const currentName = target instanceof TFile ? target.basename : target.name;
    const extension = target instanceof TFile ? `.${target.extension}` : '';

    this.input = contentEl.createEl('input', { type: 'text' });
    this.input.value = currentName;
    this.input.spellcheck = false;

    // Pre-select the stem so the operator can just start typing to replace.
    activeWindow.setTimeout(() => {
      this.input.focus();
      this.input.setSelectionRange(0, currentName.length);
    }, 0);

    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void this.commit(extension);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
    });

    const buttonRow = contentEl.createDiv({ cls: 'workdesk-os-rename-buttons' });
    const cancelButton = buttonRow.createEl('button', { text: 'Cancel' });
    cancelButton.addEventListener('click', () => { this.close(); });
    const renameButton = buttonRow.createEl('button', { text: 'Rename', cls: 'mod-cta' });
    renameButton.addEventListener('click', () => { void this.commit(extension); });
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async commit(extension: string): Promise<void> {
    if (this.committed) return;
    const next = this.input.value.trim();
    const target = this.opts.target;
    const currentName = target instanceof TFile ? target.basename : target.name;
    if (!next || next === currentName) {
      this.close();
      return;
    }
    // Strip the extension if the operator typed it back in by habit; we'll
    // re-append the original one so file types don't change on rename.
    const stem = extension && next.endsWith(extension) ? next.slice(0, -extension.length) : next;
    const parentPath = target.parent?.path ?? '';
    const newName = `${stem}${extension}`;
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;
    if (this.app.vault.getAbstractFileByPath(newPath)) {
      this.input.addClass('workdesk-os-rename-error');
      return;
    }
    try {
      await this.app.fileManager.renameFile(target, newPath);
      this.committed = true;
      this.close();
    } catch (err) {
      console.warn('[workdesk-operating-system] rename failed', err);
      this.input.addClass('workdesk-os-rename-error');
    }
  }
}
