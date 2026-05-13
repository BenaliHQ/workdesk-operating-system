// Quick capture state-machine controller.
//
// idle → requesting-permission → recording → uploading → success | error
//
// The controller is decoupled from the modal so tests can drive it without
// rendering DOM. Network, recorder, and vault writes are injected.

import { AudioRecorder, type RecorderFactory, type PermissionGate, type BlobLike } from './recorder';
import {
  captureFilename,
  captureNoteContents,
  firstWordsSlug,
  logLine,
} from './filename';
import type { SttProvider } from '../stt/provider';

export type CaptureState =
  | 'idle'
  | 'requesting-permission'
  | 'recording'
  | 'uploading'
  | 'success'
  | 'error';

export type CaptureDestination = 'personal/captures' | 'system/inbox' | 'gtd/inbox';

export interface CaptureFlowDeps {
  provider: SttProvider;
  vault: CaptureVault;
  recorderFactory?: RecorderFactory;
  permission?: PermissionGate;
  preferredMimeType?: string;
  now?: () => Date;
  autoLogToSystem?: boolean;
  systemLogPath?: string;
}

export interface CaptureVault {
  createNote(path: string, contents: string): Promise<void>;
  appendToFile(path: string, line: string): Promise<void>;
}

export interface CaptureFlowResult {
  notePath: string;
  transcript: string;
  loggedTo?: string;
}

export class CaptureFlow {
  private state: CaptureState = 'idle';
  private listeners = new Set<(s: CaptureState, ctx: { error?: string; transcript?: string }) => void>();
  private recorder: AudioRecorder;
  private provider: SttProvider;
  private vault: CaptureVault;
  private now: () => Date;
  private autoLogToSystem: boolean;
  private systemLogPath: string;
  private transcript = '';
  private errorMsg = '';

  constructor(deps: CaptureFlowDeps) {
    this.provider = deps.provider;
    this.vault = deps.vault;
    this.recorder = new AudioRecorder({
      factory: deps.recorderFactory,
      permission: deps.permission,
      preferredMimeType: deps.preferredMimeType,
    });
    this.now = deps.now ?? (() => new Date());
    this.autoLogToSystem = deps.autoLogToSystem ?? true;
    this.systemLogPath = deps.systemLogPath ?? 'system/log.md';
  }

  getState(): CaptureState {
    return this.state;
  }

  onStateChange(fn: (s: CaptureState, ctx: { error?: string; transcript?: string }) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async beginRecording(): Promise<void> {
    if (this.state !== 'idle') return;
    this.setState('requesting-permission');
    try {
      await this.recorder.start();
      this.setState('recording');
    } catch (err) {
      this.errorMsg = errToString(err);
      this.setState('error');
      throw err;
    }
  }

  cancel(): void {
    this.recorder.cancel();
    this.transcript = '';
    this.errorMsg = '';
    this.setState('idle');
  }

  async saveAndTranscribe(destination: CaptureDestination): Promise<CaptureFlowResult> {
    if (this.state !== 'recording') {
      throw new Error(`cannot save from state ${this.state}`);
    }
    this.setState('uploading');
    let blob: BlobLike;
    try {
      const result = await this.recorder.stop();
      blob = result.blob;
    } catch (err) {
      this.errorMsg = errToString(err);
      this.setState('error');
      throw err;
    }

    let transcript = '';
    try {
      const out = await this.provider.transcribe(blob);
      transcript = out.text.trim();
    } catch (err) {
      this.errorMsg = errToString(err);
      this.setState('error');
      throw err;
    }
    if (!transcript) {
      this.errorMsg = 'empty transcript';
      this.setState('error');
      throw new Error('empty transcript');
    }
    this.transcript = transcript;

    const now = this.now();
    const filename = captureFilename(transcript, now);
    const notePath = `${destination}/${filename}.md`;
    const contents = captureNoteContents(transcript, {
      provider: this.provider.name,
      model: this.provider.model,
      now,
    });
    await this.vault.createNote(notePath, contents);

    let loggedTo: string | undefined;
    if (this.autoLogToSystem) {
      await this.vault.appendToFile(this.systemLogPath, logLine(transcript, now) + '\n');
      loggedTo = this.systemLogPath;
    }

    this.setState('success');
    return { notePath, transcript, loggedTo };
  }

  reset(): void {
    this.transcript = '';
    this.errorMsg = '';
    this.setState('idle');
  }

  currentError(): string {
    return this.errorMsg;
  }

  currentTranscript(): string {
    return this.transcript;
  }

  /** Test affordance: surface the slug that would be used for a transcript. */
  slugPreview(transcript: string): string {
    return firstWordsSlug(transcript);
  }

  private setState(next: CaptureState): void {
    this.state = next;
    for (const fn of this.listeners) {
      fn(next, { error: this.errorMsg || undefined, transcript: this.transcript || undefined });
    }
  }
}

function errToString(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
