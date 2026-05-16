// ⌘⇧M Quick capture modal.
//
// Renders design's `.qc-*` markup, drives `CaptureFlow`, surfaces live
// transcript + destination chips, fires toasts on success / error.
// Audio + STT live in services; this file only owns the DOM.

import { Modal, type App } from 'obsidian';
import { CaptureFlow, type CaptureDestination, type CaptureVault } from '../services/capture/capture-flow';
import { getProvider } from '../services/stt/provider';
import type WorkdeskOSPlugin from '../main';

const STT_SECRET_KEY = 'stt-groq';

export interface QuickCaptureDeps {
  vault: CaptureVault;
  /** Override the live flow for tests. */
  flow?: CaptureFlow;
}

export class QuickCaptureModal extends Modal {
  private plugin: WorkdeskOSPlugin;
  private deps: QuickCaptureDeps;
  private flow!: CaptureFlow;
  private dest: CaptureDestination;
  private transcriptEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private micEl!: HTMLElement;
  private saveBtn!: HTMLButtonElement;
  private unsubscribe: (() => void) | null = null;

  constructor(plugin: WorkdeskOSPlugin, deps: QuickCaptureDeps) {
    super(plugin.app);
    this.plugin = plugin;
    this.deps = deps;
    this.dest = plugin.settings.capture.defaultDest;
  }

  onOpen(): void {
    this.flow = this.deps.flow ?? this.buildFlow(this.plugin.app);
    this.contentEl.replaceChildren();
    this.contentEl.classList.add('qc');

    const head = createDiv();
    head.className = 'qc-head';

    this.micEl = createDiv();
    this.micEl.className = 'qc-mic';
    this.micEl.setAttribute('aria-hidden', 'true');
    head.appendChild(this.micEl);

    const meta = createDiv();
    meta.className = 'qc-meta';
    const title = createDiv();
    title.className = 'qc-title';
    title.textContent = 'Quick capture';
    title.id = 'qc-title';
    meta.appendChild(title);

    // Set dialog ARIA after the title element exists so aria-labelledby
    // resolves to a real, non-empty node (axe-core: aria-dialog-name).
    this.containerEl.setAttribute('role', 'dialog');
    this.containerEl.setAttribute('aria-modal', 'true');
    this.containerEl.setAttribute('aria-labelledby', 'qc-title');
    this.statusEl = createDiv();
    this.statusEl.className = 'qc-status';
    meta.appendChild(this.statusEl);
    head.appendChild(meta);
    this.contentEl.appendChild(head);

    const body = createDiv();
    body.className = 'qc-body';
    this.transcriptEl = createDiv();
    this.transcriptEl.className = 'qc-transcript';
    body.appendChild(this.transcriptEl);
    this.contentEl.appendChild(body);

    const foot = createDiv();
    foot.className = 'qc-foot';
    foot.appendChild(this.buildDestChip('personal/captures', 'personal'));
    foot.appendChild(this.buildDestChip('system/inbox', 'system'));
    foot.appendChild(this.buildDestChip('gtd/inbox', 'gtd'));
    const spacer = createDiv();
    spacer.className = 'spacer';
    foot.appendChild(spacer);

    const cancel = createEl('button');
    cancel.className = 'btn ghost';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => this.handleCancel());
    foot.appendChild(cancel);

    this.saveBtn = createEl('button');
    this.saveBtn.className = 'btn primary';
    this.saveBtn.textContent = 'Save';
    this.saveBtn.addEventListener('click', () => { void this.handleSave(); });
    foot.appendChild(this.saveBtn);
    this.contentEl.appendChild(foot);

    this.unsubscribe = this.flow.onStateChange((state, ctx) => this.renderState(state, ctx));
    this.renderState(this.flow.getState(), {});

    void this.flow.beginRecording().catch((err) => {
      console.warn('[workdesk] capture begin failed', err);
    });
  }

  onClose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.flow.getState() === 'recording' || this.flow.getState() === 'requesting-permission') {
      this.flow.cancel();
    }
    this.contentEl.replaceChildren();
  }

  setDestination(dest: CaptureDestination): void {
    this.dest = dest;
    for (const chip of this.contentEl.querySelectorAll<HTMLElement>('.dest')) {
      chip.classList.toggle('active', chip.dataset.dest === dest);
    }
  }

  private buildDestChip(dest: CaptureDestination, zone: string): HTMLButtonElement {
    const chip = createEl('button');
    chip.className = 'dest';
    chip.dataset.dest = dest;
    if (dest === this.dest) chip.classList.add('active');
    const dot = createSpan();
    dot.className = 'dot';
    dot.dataset.zone = zone;
    chip.appendChild(dot);
    const label = createSpan();
    label.textContent = dest;
    chip.appendChild(label);
    chip.addEventListener('click', () => this.setDestination(dest));
    return chip;
  }

  private renderState(state: string, ctx: { error?: string; transcript?: string }): void {
    this.micEl.classList.toggle('recording', state === 'recording');
    switch (state) {
      case 'idle':
        this.statusEl.textContent = 'Idle';
        break;
      case 'requesting-permission':
        this.statusEl.textContent = 'Requesting microphone…';
        break;
      case 'recording': {
        this.statusEl.empty();
        const dot = createSpan();
        dot.className = 'dot';
        this.statusEl.appendChild(dot);
        this.statusEl.appendText('Recording');
        break;
      }
      case 'uploading':
        this.statusEl.textContent = 'Transcribing…';
        this.saveBtn.disabled = true;
        break;
      case 'success':
        this.statusEl.textContent = 'Saved';
        break;
      case 'error':
        this.statusEl.textContent = `Error: ${ctx.error ?? 'unknown'}`;
        break;
    }
    if (ctx.transcript) {
      this.transcriptEl.textContent = ctx.transcript;
    }
  }

  private async handleSave(): Promise<void> {
    try {
      const result = await this.flow.saveAndTranscribe(this.dest);
      const toast = (window as unknown as { showToast?: (m: string, s: string, o?: unknown) => void }).showToast;
      toast?.(`Capture saved · ${result.notePath}`, 'success');
      this.close();
    } catch (err) {
      const toast = (window as unknown as { showToast?: (m: string, s: string, o?: unknown) => void }).showToast;
      toast?.(`Capture failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  }

  private handleCancel(): void {
    this.flow.cancel();
    this.close();
  }

  private buildFlow(app: App): CaptureFlow {
    const key = app.secretStorage.getSecret(STT_SECRET_KEY) ?? '';
    const provider = getProvider(this.plugin.settings, { apiKey: key });
    return new CaptureFlow({
      provider,
      vault: this.deps.vault,
      autoLogToSystem: this.plugin.settings.capture.autoLogToSystem,
    });
  }
}
