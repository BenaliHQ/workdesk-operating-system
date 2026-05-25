// Voice memo controller — drives the one-tap-toggle behind the mic ribbon
// icon. First call starts recording; second call stops, transcribes, and
// writes the file to the captures destination.
//
// Errors are surfaced through the `onTransition` callback (mic permission,
// missing STT key, transcribe failure) rather than swallowed — the ribbon
// handler turns those into operator-visible toasts.

import { CaptureFlow, type CaptureVault } from './capture-flow';
import type { SttProvider } from '../stt/provider';
import type { RecorderFactory, PermissionGate } from './recorder';

export type VoiceMemoState =
  | 'idle'
  | 'requesting-permission'
  | 'recording'
  | 'transcribing'
  | 'success'
  | 'error';

export interface VoiceMemoEvent {
  state: VoiceMemoState;
  /** Set when state is 'success'. */
  notePath?: string;
  /** Set when state is 'success'. */
  transcript?: string;
  /** Set when state is 'error'. */
  error?: string;
}

export interface VoiceMemoDeps {
  provider: () => SttProvider | null;
  vault: CaptureVault;
  /** Resolved on stop so the live setting is honored without re-wiring. */
  destination: () => string;
  /** Fires on every state transition. */
  onTransition?: (event: VoiceMemoEvent) => void;
  /** Test injection. */
  recorderFactory?: RecorderFactory;
  permission?: PermissionGate;
  now?: () => Date;
  /** Default true — captures append a line to system/log.md. */
  autoLogToSystem?: boolean;
}

export interface VoiceMemoController {
  state(): VoiceMemoState;
  isActive(): boolean;
  toggle(): Promise<void>;
  cancel(): void;
}

export function createVoiceMemoController(deps: VoiceMemoDeps): VoiceMemoController {
  let state: VoiceMemoState = 'idle';
  let flow: CaptureFlow | null = null;

  function emit(event: VoiceMemoEvent): void {
    state = event.state;
    deps.onTransition?.(event);
  }

  async function start(): Promise<void> {
    const provider = deps.provider();
    if (!provider) {
      emit({ state: 'error', error: 'STT API key not configured — open WorkDesk settings to add one.' });
      return;
    }
    flow = new CaptureFlow({
      provider,
      vault: deps.vault,
      recorderFactory: deps.recorderFactory,
      permission: deps.permission,
      autoLogToSystem: deps.autoLogToSystem ?? true,
      now: deps.now,
    });
    emit({ state: 'requesting-permission' });
    try {
      await flow.beginRecording();
      emit({ state: 'recording' });
    } catch (err) {
      flow = null;
      emit({ state: 'error', error: micErrorMessage(err) });
    }
  }

  async function stopAndSave(): Promise<void> {
    if (!flow) return;
    emit({ state: 'transcribing' });
    try {
      const result = await flow.saveAndTranscribe(deps.destination());
      emit({ state: 'success', notePath: result.notePath, transcript: result.transcript });
    } catch (err) {
      emit({ state: 'error', error: errToString(err) });
    } finally {
      flow = null;
    }
  }

  return {
    state: () => state,
    isActive: () => state === 'requesting-permission' || state === 'recording' || state === 'transcribing',
    async toggle(): Promise<void> {
      if (state === 'idle' || state === 'success' || state === 'error') {
        await start();
        return;
      }
      if (state === 'recording') {
        await stopAndSave();
        return;
      }
      // requesting-permission or transcribing — in-flight, ignore re-tap
    },
    cancel(): void {
      if (flow) {
        flow.cancel();
        flow = null;
      }
      emit({ state: 'idle' });
    },
  };
}

function errToString(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function micErrorMessage(err: unknown): string {
  const raw = errToString(err);
  if (/permission|denied|notallowed/i.test(raw)) {
    return 'Microphone permission denied — enable mic access for Obsidian.';
  }
  if (/mediadevices|getusermedia/i.test(raw)) {
    return 'No microphone available in this environment.';
  }
  return raw;
}
