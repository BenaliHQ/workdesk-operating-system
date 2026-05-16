// FileView for .html and .htm. Loads the file into a sandboxed iframe and
// renders an identifying chip with an "Open in browser" button.
//
// Sandbox is `allow-same-origin` only by default. `html.allowScripts: true`
// in settings adds `allow-scripts`. Both are gated through the settings
// schema; this view reads the resolved settings from the plugin instance.

import { FileView, TFile, WorkspaceLeaf } from 'obsidian';
import type WorkdeskOSPlugin from '../main';
import { VIEW_TYPE_WORKDESK_HTML } from '../constants';

export class HtmlView extends FileView {
  allowNoFile = false;
  private iframe: HTMLIFrameElement | null = null;
  constructor(leaf: WorkspaceLeaf, private plugin: WorkdeskOSPlugin) {
    super(leaf);
  }

  getViewType(): string { return VIEW_TYPE_WORKDESK_HTML; }
  getDisplayText(): string { return this.file?.basename ?? 'HTML'; }
  getIcon(): string { return 'code'; }

  async onLoadFile(file: TFile): Promise<void> {
    const text = await this.app.vault.read(file);
    this.contentEl.empty();
    this.contentEl.classList.add('workdesk-html-view');
    this.renderChip(file);

    const sandboxFlags = ['allow-same-origin'];
    if (this.plugin.settings.html.allowScripts) sandboxFlags.push('allow-scripts');

    const iframe = activeDocument.createEl('iframe');
    iframe.addClass('wd-html-iframe');
    iframe.setAttribute('sandbox', sandboxFlags.join(' '));
    iframe.setAttribute('srcdoc', text);
    this.contentEl.appendChild(iframe);
    this.iframe = iframe;
  }

  async onUnloadFile(_file: TFile): Promise<void> {
    this.iframe?.remove();
    this.iframe = null;
  }

  private renderChip(file: TFile): void {
    const chip = activeDocument.createDiv();
    chip.className = 'workdesk-html-chip';
    const name = activeDocument.createSpan();
    name.className = 'name';
    name.textContent = `${file.basename}.${file.extension}`;
    chip.appendChild(name);
    const sub = activeDocument.createSpan();
    sub.className = 'sub';
    sub.textContent = 'Rendered inline · workdesk-HTML-view';
    chip.appendChild(sub);
    const btn = activeDocument.createEl('button');
    btn.className = 'btn ghost';
    btn.type = 'button';
    btn.textContent = 'Open in browser ↗';
    btn.addEventListener('click', () => window.open('file://' + file.path));
    chip.appendChild(btn);
    this.contentEl.appendChild(chip);
  }
}
