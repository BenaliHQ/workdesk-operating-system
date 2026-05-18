// Insert template modal — opens via the `workdesk:templates:insert` command,
// lists every `.md` under the configured templates folder, filters by
// basename substring as the operator types, then inserts the chosen
// template's content (with variables substituted) at the current editor
// cursor.

import { type App, type Editor, SuggestModal, TFile } from 'obsidian';
import { applyTemplateVariables, listTemplateFiles } from '../services/templates';

export interface InsertTemplateOptions {
  editor: Editor;
  /** Active file's basename (no extension), used for `{{title}}`. */
  title: string;
  /** Vault-relative folder where templates live. */
  folder: string;
  dateFormat: string;
  timeFormat: string;
}

export class InsertTemplateModal extends SuggestModal<TFile> {
  private readonly opts: InsertTemplateOptions;

  constructor(app: App, opts: InsertTemplateOptions) {
    super(app);
    this.opts = opts;
    this.setPlaceholder('Search templates…');
    this.emptyStateText = `No templates found in ${opts.folder || '(folder not set)'}`;
  }

  getSuggestions(query: string): TFile[] {
    const all = listTemplateFiles(this.app, this.opts.folder);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((file) => file.basename.toLowerCase().includes(q));
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.createDiv({ text: file.basename, cls: 'workdesk-os-template-name' });
    const folder = file.parent?.path ?? '';
    if (folder) el.createDiv({ text: folder, cls: 'workdesk-os-template-folder' });
  }

  onChooseSuggestion(file: TFile): void {
    void this.insert(file);
  }

  private async insert(file: TFile): Promise<void> {
    let raw: string;
    try {
      raw = await this.app.vault.read(file);
    } catch (err) {
      console.warn('[workdesk] failed to read template', file.path, err);
      return;
    }
    const text = applyTemplateVariables(raw, {
      now: new Date(),
      title: this.opts.title,
      dateFormat: this.opts.dateFormat,
      timeFormat: this.opts.timeFormat,
    });
    this.opts.editor.replaceSelection(text);
  }
}
