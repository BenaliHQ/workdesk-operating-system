import { describe, it, expect } from 'vitest';
import { createVoiceMemoController, type VoiceMemoEvent } from '../src/services/capture/voice-memo-controller';
import type { CaptureVault } from '../src/services/capture/capture-flow';
import type { BlobLike, RecorderFactory, RecorderHandle } from '../src/services/capture/recorder';
import type { SttProvider } from '../src/services/stt/provider';

function makeFakeRecorder(chunks: BlobLike[]): { factory: RecorderFactory; permission: { requestMic(): Promise<MediaStream> } } {
  let state: 'inactive' | 'recording' | 'paused' = 'inactive';
  const handle: RecorderHandle = {
    start: () => { state = 'recording'; },
    stop: () => {
      state = 'inactive';
      Promise.resolve().then(() => handle.onstop?.());
    },
    requestData: () => {
      for (const chunk of chunks) handle.ondataavailable?.(chunk);
    },
    ondataavailable: null,
    onstop: null,
    onerror: null,
    state: () => state,
    mimeType: () => 'audio/webm;codecs=opus',
  };
  return {
    factory: { create: () => handle },
    permission: { requestMic: async () => ({ getTracks: () => [] }) as unknown as MediaStream },
  };
}

function makeVaultStub(): CaptureVault & { creates: Array<{ path: string; data: string }>; appends: Array<{ path: string; data: string }> } {
  const creates: Array<{ path: string; data: string }> = [];
  const appends: Array<{ path: string; data: string }> = [];
  return {
    creates,
    appends,
    async createNote(path, data) { creates.push({ path, data }); },
    async appendToFile(path, data) { appends.push({ path, data }); },
  };
}

function makeProvider(text = 'Quick note about the new feature'): SttProvider {
  return { name: 'groq', model: 'whisper-large-v3', transcribe: async () => ({ text }) };
}

const fakeBlob: BlobLike = { size: 1024, type: 'audio/webm;codecs=opus', arrayBuffer: async () => new ArrayBuffer(1024) };

describe('voice-memo-controller', () => {
  it('emits idle → requesting-permission → recording on first toggle', async () => {
    const events: VoiceMemoEvent[] = [];
    const { factory, permission } = makeFakeRecorder([fakeBlob]);
    const ctrl = createVoiceMemoController({
      provider: () => makeProvider(),
      vault: makeVaultStub(),
      destination: () => 'personal/captures',
      recorderFactory: factory,
      permission,
      onTransition: (e) => events.push(e),
    });

    await ctrl.toggle();
    expect(events.map((e) => e.state)).toEqual(['requesting-permission', 'recording']);
    expect(ctrl.isActive()).toBe(true);
  });

  it('full happy path: toggle → record → toggle → save', async () => {
    const events: VoiceMemoEvent[] = [];
    const { factory, permission } = makeFakeRecorder([fakeBlob]);
    const vault = makeVaultStub();
    const ctrl = createVoiceMemoController({
      provider: () => makeProvider('Yes this is a test of voice memo'),
      vault,
      destination: () => 'personal/captures',
      recorderFactory: factory,
      permission,
      now: () => new Date(2026, 4, 13, 12, 0, 0),
      onTransition: (e) => events.push(e),
    });

    await ctrl.toggle();
    await ctrl.toggle();

    expect(events.map((e) => e.state)).toEqual([
      'requesting-permission',
      'recording',
      'transcribing',
      'success',
    ]);
    const success = events.at(-1)!;
    expect(success.notePath).toBe('personal/captures/2026.05.13 Capture - Yes this is a test of voice memo.md');
    expect(success.transcript).toBe('Yes this is a test of voice memo');
    expect(vault.creates).toHaveLength(1);
  });

  it('reads destination at stop-time so settings changes are honored', async () => {
    const { factory, permission } = makeFakeRecorder([fakeBlob]);
    const vault = makeVaultStub();
    let dest = 'gtd/inbox';
    const ctrl = createVoiceMemoController({
      provider: () => makeProvider(),
      vault,
      destination: () => dest,
      recorderFactory: factory,
      permission,
    });

    await ctrl.toggle();
    dest = 'personal/captures';
    await ctrl.toggle();
    expect(vault.creates[0]!.path.startsWith('personal/captures/')).toBe(true);
  });

  it('errors loudly when no STT API key is configured', async () => {
    const events: VoiceMemoEvent[] = [];
    const ctrl = createVoiceMemoController({
      provider: () => null,
      vault: makeVaultStub(),
      destination: () => 'personal/captures',
      onTransition: (e) => events.push(e),
    });

    await ctrl.toggle();
    expect(events).toHaveLength(1);
    expect(events[0]!.state).toBe('error');
    expect(events[0]!.error).toMatch(/STT API key/i);
  });

  it('surfaces a friendly message when mic permission is denied', async () => {
    const events: VoiceMemoEvent[] = [];
    const ctrl = createVoiceMemoController({
      provider: () => makeProvider(),
      vault: makeVaultStub(),
      destination: () => 'personal/captures',
      permission: { requestMic: async () => { throw new Error('NotAllowedError: permission denied'); } },
      onTransition: (e) => events.push(e),
    });

    await ctrl.toggle();
    const last = events.at(-1)!;
    expect(last.state).toBe('error');
    expect(last.error).toMatch(/microphone permission/i);
  });

  it('ignores re-tap while transcribing is in flight', async () => {
    const { factory, permission } = makeFakeRecorder([fakeBlob]);
    let resolveTranscribe: ((text: string) => void) | null = null;
    let signalTranscribeStarted: (() => void) | null = null;
    const transcribeStarted = new Promise<void>((r) => { signalTranscribeStarted = r; });

    const slowProvider: SttProvider = {
      name: 'slow',
      model: 'fixture',
      transcribe: () => new Promise<{ text: string }>((resolve) => {
        resolveTranscribe = (text) => resolve({ text });
        signalTranscribeStarted?.();
      }),
    };

    const events: VoiceMemoEvent[] = [];
    const ctrl = createVoiceMemoController({
      provider: () => slowProvider,
      vault: makeVaultStub(),
      destination: () => 'personal/captures',
      recorderFactory: factory,
      permission,
      onTransition: (e) => events.push(e),
    });

    await ctrl.toggle();
    const stopPromise = ctrl.toggle();
    await transcribeStarted;
    await ctrl.toggle();
    expect(events.map((e) => e.state)).toEqual(['requesting-permission', 'recording', 'transcribing']);
    resolveTranscribe!('hi');
    await stopPromise;
    expect(events.at(-1)!.state).toBe('success');
  });

  it('cancel returns to idle and drops any in-flight recording', async () => {
    const { factory, permission } = makeFakeRecorder([fakeBlob]);
    const events: VoiceMemoEvent[] = [];
    const ctrl = createVoiceMemoController({
      provider: () => makeProvider(),
      vault: makeVaultStub(),
      destination: () => 'personal/captures',
      recorderFactory: factory,
      permission,
      onTransition: (e) => events.push(e),
    });

    await ctrl.toggle();
    ctrl.cancel();
    expect(ctrl.state()).toBe('idle');
    expect(events.at(-1)!.state).toBe('idle');
  });
});
