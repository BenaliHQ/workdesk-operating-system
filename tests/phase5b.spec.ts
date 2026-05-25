import { describe, it, expect, beforeEach } from 'vitest';
import { App, Plugin, __setRequestUrlMock } from 'obsidian';
import { CaptureFlow, type CaptureVault } from '../src/services/capture/capture-flow';
import {
  captureFilename,
  captureNoteContents,
  dotDate,
  firstSentenceTitle,
  isoTimestampForLog,
  logLine,
} from '../src/services/capture/filename';
import { createFocusController } from '../src/services/focus';
import { OpenAICompatibleProvider } from '../src/services/stt/openai-compatible';
import { getProvider } from '../src/services/stt/provider';
import { obsidianCaptureVault } from '../src/services/capture/obsidian-vault';
import {
  AudioRecorder,
  type BlobLike,
  type RecorderFactory,
  type RecorderHandle,
} from '../src/services/capture/recorder';
import { DEFAULT_SETTINGS, type WorkdeskSettings } from '../src/settings';

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.className = '';
  __setRequestUrlMock(null);
});

function makeFakeRecorder(chunks: BlobLike[]): { factory: RecorderFactory; permission: { requestMic(): Promise<MediaStream> } } {
  let state: 'inactive' | 'recording' | 'paused' = 'inactive';
  const handle: RecorderHandle = {
    start: () => {
      state = 'recording';
    },
    stop: () => {
      state = 'inactive';
      Promise.resolve().then(() => handle.onstop?.());
    },
    requestData: () => {
      for (const chunk of chunks) {
        handle.ondataavailable?.(chunk);
      }
    },
    ondataavailable: null,
    onstop: null,
    onerror: null,
    state: () => state,
    mimeType: () => 'audio/webm;codecs=opus',
  };
  const factory: RecorderFactory = { create: () => handle };
  const permission = {
    requestMic: async () => ({ getTracks: () => [] }) as unknown as MediaStream,
  };
  return { factory, permission };
}

function makeFakeBlob(size = 1024): BlobLike {
  return {
    size,
    type: 'audio/webm;codecs=opus',
    arrayBuffer: async () => new ArrayBuffer(size),
  };
}

function makeVaultStub(): CaptureVault & { creates: Array<{ path: string; data: string }>; appends: Array<{ path: string; data: string }> } {
  const creates: Array<{ path: string; data: string }> = [];
  const appends: Array<{ path: string; data: string }> = [];
  return {
    creates,
    appends,
    async createNote(path, data) {
      creates.push({ path, data });
    },
    async appendToFile(path, data) {
      appends.push({ path, data });
    },
  };
}

describe('phase 5b · filename helpers', () => {
  it('firstSentenceTitle preserves case + punctuation up to the first sentence', () => {
    expect(firstSentenceTitle("I'm watching the Denver Nuggets game. The other team is losing."))
      .toBe("I'm watching the Denver Nuggets game.");
  });

  it('firstSentenceTitle returns the whole transcript when no sentence break is present', () => {
    expect(firstSentenceTitle('Yes this is a test of capture')).toBe('Yes this is a test of capture');
  });

  it('firstSentenceTitle caps at 80 chars on long unpunctuated streams', () => {
    const long = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen';
    const out = firstSentenceTitle(long);
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out.startsWith('one two three')).toBe(true);
  });

  it('firstSentenceTitle strips filesystem-unsafe characters', () => {
    expect(firstSentenceTitle('Save the file to /usr/local/bin please'))
      .toBe('Save the file to usrlocalbin please');
  });

  it('firstSentenceTitle falls back to "Capture" on empty input', () => {
    expect(firstSentenceTitle('')).toBe('Capture');
    expect(firstSentenceTitle('   ')).toBe('Capture');
  });

  it('dotDate emits YYYY.MM.DD in local time', () => {
    const d = new Date(2026, 4, 13, 12, 0, 0);
    expect(dotDate(d)).toBe('2026.05.13');
  });

  it('captureFilename combines dot-date + Capture keyword + first sentence', () => {
    const d = new Date(2026, 4, 13, 12, 0, 0);
    expect(captureFilename('Yes this is a test of capture', d))
      .toBe('2026.05.13 Capture - Yes this is a test of capture');
  });

  it('captureNoteContents emits the canonical frontmatter shape', () => {
    const d = new Date('2026-05-13T11:02:14.000Z');
    const out = captureNoteContents('Hello world', { provider: 'groq', model: 'whisper-large-v3', now: d });
    expect(out).toMatch(/^---\n/);
    expect(out).toContain('type: capture');
    expect(out).toContain('source-kind: voice-memo');
    expect(out).toContain('transcribed-at: 2026-05-13T11:02:14Z');
    expect(out).toContain('provider: groq');
    expect(out).toContain('Hello world');
  });

  it('logLine matches the design spec shape', () => {
    const d = new Date('2026-05-13T11:02:14.000Z');
    const line = logLine('Yes this is a test', d);
    expect(line).toMatch(/^2026-05-13T11:02:14Z capture: Yes this is a test/);
  });

  it('isoTimestampForLog strips milliseconds', () => {
    const d = new Date('2026-05-13T11:02:14.512Z');
    expect(isoTimestampForLog(d)).toBe('2026-05-13T11:02:14Z');
  });
});

describe('phase 5b · capture flow happy path', () => {
  it('records, transcribes, writes note + log line', async () => {
    const { factory, permission } = makeFakeRecorder([makeFakeBlob()]);
    const vault = makeVaultStub();
    const fixedNow = new Date(2026, 4, 13, 12, 0, 0);

    const provider = {
      name: 'groq',
      model: 'whisper-large-v3',
      transcribe: async () => ({ text: 'Yes this is a test of quick capture' }),
    };

    const flow = new CaptureFlow({
      provider,
      vault,
      recorderFactory: factory,
      permission,
      autoLogToSystem: true,
      now: () => fixedNow,
    });

    const transitions: string[] = [];
    flow.onStateChange((s) => transitions.push(s));

    await flow.beginRecording();
    expect(flow.getState()).toBe('recording');
    const result = await flow.saveAndTranscribe('personal/captures');

    expect(transitions).toEqual(['requesting-permission', 'recording', 'uploading', 'success']);
    expect(result.notePath).toBe('personal/captures/2026.05.13 Capture - Yes this is a test of quick capture.md');
    expect(vault.creates).toHaveLength(1);
    expect(vault.creates[0]!.path).toBe(result.notePath);
    expect(vault.creates[0]!.data).toContain('type: capture');
    expect(vault.creates[0]!.data).toContain('Yes this is a test of quick capture');

    expect(vault.appends).toHaveLength(1);
    expect(vault.appends[0]!.path).toBe('system/log.md');
    expect(vault.appends[0]!.data).toMatch(/capture: Yes this is a test/);
  });

  it('routes to system/inbox when the chip selects it', async () => {
    const { factory, permission } = makeFakeRecorder([makeFakeBlob()]);
    const vault = makeVaultStub();
    const flow = new CaptureFlow({
      provider: { name: 'groq', model: 'whisper-large-v3', transcribe: async () => ({ text: 'one two three' }) },
      vault,
      recorderFactory: factory,
      permission,
      autoLogToSystem: false,
      now: () => new Date('2026-05-13T11:02:14.000Z'),
    });
    await flow.beginRecording();
    const result = await flow.saveAndTranscribe('system/inbox');
    expect(result.notePath.startsWith('system/inbox/')).toBe(true);
    expect(vault.appends).toHaveLength(0);
  });

  it('reports error state when STT throws', async () => {
    const { factory, permission } = makeFakeRecorder([makeFakeBlob()]);
    const vault = makeVaultStub();
    const flow = new CaptureFlow({
      provider: {
        name: 'groq',
        model: 'whisper-large-v3',
        transcribe: async () => {
          throw new Error('groq returned 401');
        },
      },
      vault,
      recorderFactory: factory,
      permission,
      autoLogToSystem: false,
    });
    await flow.beginRecording();
    await expect(flow.saveAndTranscribe('personal/captures')).rejects.toThrow('groq returned 401');
    expect(flow.getState()).toBe('error');
    expect(flow.currentError()).toContain('groq returned 401');
  });
});

describe('phase 5b · focus mode', () => {
  function makeSettings(): WorkdeskSettings {
    return structuredClone(DEFAULT_SETTINGS);
  }

  function makeWorkspace(initial?: { left?: boolean; right?: boolean }) {
    return {
      leftSplit: {
        collapsed: initial?.left ?? false,
        _collapseCalls: 0,
        _expandCalls: 0,
        collapse(): void { this.collapsed = true; this._collapseCalls += 1; },
        expand(): void { this.collapsed = false; this._expandCalls += 1; },
      },
      rightSplit: {
        collapsed: initial?.right ?? false,
        _collapseCalls: 0,
        _expandCalls: 0,
        collapse(): void { this.collapsed = true; this._collapseCalls += 1; },
        expand(): void { this.collapsed = false; this._expandCalls += 1; },
      },
    };
  }

  it('toggle adds body.focus-on and collapses both Obsidian sidebars', () => {
    document.body.className = '';
    const workspace = makeWorkspace();
    const settings = makeSettings();
    let saved = 0;
    const focus = createFocusController({
      workspace,
      settings,
      saveSettings: () => { saved++; },
    });

    expect(focus.isOn()).toBe(false);
    focus.toggle();
    expect(document.body.classList.contains('focus-on')).toBe(true);
    expect(workspace.leftSplit.collapsed).toBe(true);
    expect(workspace.rightSplit.collapsed).toBe(true);
    expect(workspace.leftSplit._collapseCalls).toBe(1);
    expect(workspace.rightSplit._collapseCalls).toBe(1);
    expect(settings.focus.completed).toBe(true);
    expect(saved).toBeGreaterThan(0);

    focus.toggle();
    expect(document.body.classList.contains('focus-on')).toBe(false);
    expect(workspace.leftSplit.collapsed).toBe(false);
    expect(workspace.rightSplit.collapsed).toBe(false);
    expect(workspace.leftSplit._expandCalls).toBe(1);
    expect(workspace.rightSplit._expandCalls).toBe(1);
    expect(settings.focus.completed).toBe(false);
  });

  it('restore re-applies persisted state on plugin load', () => {
    document.body.className = '';
    const workspace = makeWorkspace();
    const settings = makeSettings();
    settings.focus.completed = true;
    const focus = createFocusController({ workspace, settings, saveSettings: () => {} });
    focus.restore();
    expect(document.body.classList.contains('focus-on')).toBe(true);
    expect(workspace.leftSplit.collapsed).toBe(true);
    expect(workspace.rightSplit.collapsed).toBe(true);
  });

  it('preserves prior sidebar collapsed state when focus exits', () => {
    document.body.className = '';
    // Operator had the left sidebar already collapsed before focus mode.
    const workspace = makeWorkspace({ left: true, right: false });
    const settings = makeSettings();
    const focus = createFocusController({ workspace, settings, saveSettings: () => {} });
    focus.on();
    expect(workspace.leftSplit.collapsed).toBe(true);
    expect(workspace.rightSplit.collapsed).toBe(true);
    focus.off();
    // Left was collapsed before — leave it collapsed; right was open — restore.
    expect(workspace.leftSplit.collapsed).toBe(true);
    expect(workspace.rightSplit.collapsed).toBe(false);
    expect(workspace.leftSplit._expandCalls).toBe(0);
    expect(workspace.rightSplit._expandCalls).toBe(1);
  });
});

describe('phase 5b · settings roundtrip', () => {
  it('focus.completed roundtrips through data.json', async () => {
    const plugin = new Plugin() as unknown as Plugin & { settings: WorkdeskSettings; saveSettings: () => Promise<void>; loadSettings: () => Promise<void> };
    plugin.settings = structuredClone(DEFAULT_SETTINGS);
    plugin.saveSettings = async () => {
      await plugin.saveData(plugin.settings);
    };
    plugin.loadSettings = async () => {
      const stored = await plugin.loadData() as Partial<WorkdeskSettings> | null;
      if (stored) plugin.settings = { ...DEFAULT_SETTINGS, ...stored };
    };
    plugin.settings.focus.completed = true;
    await plugin.saveSettings();
    plugin.settings = structuredClone(DEFAULT_SETTINGS);
    await plugin.loadSettings();
    expect(plugin.settings.focus.completed).toBe(true);
  });
});

describe('phase 5b · STT provider', () => {
  it('groq factory points at the groq endpoint and authenticates with the bearer key', async () => {
    const app = new App();
    app.secretStorage.setSecret('stt-groq', 'gsk_test_token');
    const seen: Array<{ url: string; auth: string }> = [];

    const provider = getProvider(
      { ...DEFAULT_SETTINGS, capture: { ...DEFAULT_SETTINGS.capture, provider: 'groq' } },
      {
        apiKey: app.secretStorage.getSecret('stt-groq') ?? '',
        httpFn: async (req) => {
          seen.push({ url: req.url, auth: req.headers.Authorization ?? '' });
          return { status: 200, text: '{"text":"hello"}', json: { text: 'hello' } };
        },
      },
    );
    expect(provider.name).toBe('groq');
    expect((app.secretStorage as unknown as { _getCalls: string[] })._getCalls).toContain('stt-groq');

    const blob: BlobLike = { size: 4, type: 'audio/webm', arrayBuffer: async () => new ArrayBuffer(4) };
    const out = await provider.transcribe(blob);
    expect(out.text).toBe('hello');
    expect(seen[0]!.url).toContain('api.groq.com');
    expect(seen[0]!.auth).toBe('Bearer gsk_test_token');
  });

  it('OpenAICompatibleProvider rejects empty transcripts', async () => {
    const provider = new OpenAICompatibleProvider({
      name: 'groq',
      endpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
      apiKey: 'gsk_test',
      model: 'whisper-large-v3',
      httpFn: async () => ({ status: 200, text: '{"text":""}', json: { text: '' } }),
    });
    const blob: BlobLike = { size: 1, type: 'audio/webm', arrayBuffer: async () => new ArrayBuffer(1) };
    await expect(provider.transcribe(blob)).rejects.toThrow(/no transcript/);
  });

  it('OpenAICompatibleProvider surfaces non-2xx responses with status code', async () => {
    const provider = new OpenAICompatibleProvider({
      name: 'groq',
      endpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
      apiKey: 'gsk_test',
      model: 'whisper-large-v3',
      httpFn: async () => ({ status: 401, text: '{"error":"invalid_api_key"}' }),
    });
    const blob: BlobLike = { size: 1, type: 'audio/webm', arrayBuffer: async () => new ArrayBuffer(1) };
    await expect(provider.transcribe(blob)).rejects.toThrow(/401/);
  });
});

describe('phase 5b · obsidian vault adapter', () => {
  it('createNote auto-creates the parent folder when missing', async () => {
    const app = new App();
    const adapter = obsidianCaptureVault(app);
    await adapter.createNote('personal/captures/2026.05.13 Capture - test.md', 'body');
    const creates = (app.vault as unknown as { _createCalls: Array<{ path: string; data: string }> })._createCalls;
    expect(creates.some((c) => c.path.endsWith('Capture - test.md'))).toBe(true);
  });

  it('appendToFile appends when the file exists, creates it otherwise', async () => {
    const app = new App();
    // First call creates system/log.md.
    const adapter = obsidianCaptureVault(app);
    await adapter.appendToFile('system/log.md', 'line one\n');
    // Subsequent appends should hit the adapter.append path.
    await adapter.appendToFile('system/log.md', 'line two\n');
    const vault = app.vault as unknown as { _createCalls: Array<{ path: string; data: string }>; _appendCalls: Array<{ path: string; data: string }> };
    expect(vault._createCalls.some((c) => c.path === 'system/log.md')).toBe(true);
    expect(vault._appendCalls.some((c) => c.path === 'system/log.md' && c.data === 'line two\n')).toBe(true);
  });
});

describe('phase 5b · audio recorder wrapper', () => {
  it('start → stop yields a blob assembled from emitted chunks', async () => {
    const { factory, permission } = makeFakeRecorder([makeFakeBlob(512), makeFakeBlob(256)]);
    const rec = new AudioRecorder({ factory, permission });
    await rec.start();
    const result = await rec.stop();
    expect(result.mimeType).toBe('audio/webm;codecs=opus');
    expect(result.blob.size).toBe(768);
  });
});
