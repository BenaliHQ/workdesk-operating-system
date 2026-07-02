import { afterEach, describe, expect, it } from 'vitest';
import { App, FileSystemAdapter, Platform, Plugin, TFile, TFolder, type App as ObsidianApp } from 'obsidian';
import { __setPlatformDesktop } from './stubs/obsidian';
import WorkdeskOSPlugin from '../src/main';
import { mountQuickCaptureSection } from '../src/settings/sections/quick-capture';
import { DEFAULT_SETTINGS, type WorkdeskSettings } from '../src/settings';
import {
  AudioRecorder,
  pickSupportedMimeType,
  type BlobLike,
} from '../src/services/capture/recorder';
import { requireDesktopModule } from '../src/services/desktop-node';
import { obsidianFsAdapter, scanFilesView, scanZones } from '../src/services/vault-scan';
import { fileUrlForVaultFile } from '../src/views/HtmlView';

const originalMediaRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder');

const customZonesYaml = `
zones:
  - id: atlas
    name: custom atlas
    sub: Custom zone manifest
    icon: globe
    root: atlas
    objects:
      - id: people
        title: Humans
        sub: Known people
        icon: person
        folder: atlas/people
`;

function setMediaRecorder(value: unknown): void {
  Object.defineProperty(globalThis, 'MediaRecorder', {
    configurable: true,
    writable: true,
    value,
  });
}

function makeMediaRecorder(isTypeSupported?: (type: string) => boolean): typeof MediaRecorder {
  const fake = function FakeMediaRecorder() {} as unknown as { isTypeSupported?: (type: string) => boolean };
  if (isTypeSupported) fake.isTypeSupported = isTypeSupported;
  return fake as unknown as typeof MediaRecorder;
}

function makeFolder(path: string, name: string, children: Array<TFile | TFolder> = []): TFolder {
  const folder = new TFolder();
  folder.path = path;
  folder.name = name;
  folder.children = children;
  return folder;
}

function makeFile(path: string, name: string): TFile {
  const file = new TFile();
  file.path = path;
  file.name = name;
  file.basename = name.replace(/\.[^.]+$/, '');
  file.extension = name.split('.').pop() ?? '';
  return file;
}

function indexTree(root: TFolder): Map<string, TFile | TFolder> {
  const byPath = new Map<string, TFile | TFolder>();
  const visit = (entry: TFile | TFolder): void => {
    if (entry.path) byPath.set(entry.path, entry);
    if (entry instanceof TFolder) {
      for (const child of entry.children) visit(child);
    }
  };
  visit(root);
  return byPath;
}

function makeApp(root: TFolder, adapterFiles: Record<string, string> = {}): App {
  const app = new App();
  const byPath = indexTree(root);
  app.vault.getRoot = () => root;
  app.vault.getAbstractFileByPath = (path: string) => {
    if (path === '') return root;
    return byPath.get(path) ?? null;
  };
  const vault = app.vault as unknown as { _files: Map<string, string> };
  for (const [path, content] of Object.entries(adapterFiles)) {
    vault._files.set(path, content);
  }
  return app;
}

function makeVaultTree(extraRootChildren: Array<TFile | TFolder> = []): TFolder {
  const jane = makeFile('atlas/people/jane-doe.md', 'jane-doe.md');
  const people = makeFolder('atlas/people', 'people', [jane]);
  const atlas = makeFolder('atlas', 'atlas', [people]);
  const readme = makeFile('README.md', 'README.md');
  return makeFolder('', '', [atlas, ...extraRootChildren, readme]);
}

function makeSettingsPlugin(): WorkdeskOSPlugin {
  const plugin = new Plugin() as unknown as WorkdeskOSPlugin & {
    settings: WorkdeskSettings;
    saveSettings(): Promise<void>;
  };
  plugin.settings = structuredClone(DEFAULT_SETTINGS);
  plugin.saveSettings = async () => {};
  return plugin;
}

function makeFakeBlob(size = 128): BlobLike {
  return {
    size,
    type: 'audio/webm;codecs=opus',
    arrayBuffer: async () => new ArrayBuffer(size),
  };
}

afterEach(() => {
  if (originalMediaRecorder) {
    Object.defineProperty(globalThis, 'MediaRecorder', originalMediaRecorder);
  } else {
    Reflect.deleteProperty(globalThis, 'MediaRecorder');
  }
  __setPlatformDesktop(true);
  document.body.replaceChildren();
});

describe('mobile recorder MIME selection', () => {
  it('returns the preferred MIME type when the platform supports it', () => {
    setMediaRecorder(makeMediaRecorder((type) => type === 'audio/custom'));
    expect(pickSupportedMimeType('audio/custom')).toBe('audio/custom');
  });

  it('falls through to audio/mp4 when only iOS-style MP4 recording is supported', () => {
    setMediaRecorder(makeMediaRecorder((type) => type === 'audio/mp4'));
    expect(pickSupportedMimeType('audio/webm;codecs=opus')).toBe('audio/mp4');
  });

  it('returns undefined when MediaRecorder supports none of the candidates', () => {
    setMediaRecorder(makeMediaRecorder(() => false));
    expect(pickSupportedMimeType('audio/webm;codecs=opus')).toBeUndefined();
  });

  it('returns undefined when isTypeSupported is absent', () => {
    setMediaRecorder(makeMediaRecorder());
    expect(pickSupportedMimeType('audio/webm;codecs=opus')).toBeUndefined();
  });

  it('retries MediaRecorder construction without options when the MIME option is rejected', async () => {
    const constructorOptions: Array<MediaRecorderOptions | undefined> = [];
    class FakeMediaRecorder {
      static isTypeSupported(type: string): boolean {
        return type === 'audio/webm;codecs=opus';
      }

      ondataavailable: ((ev: { data: BlobLike }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;
      state: RecordingState = 'inactive';
      mimeType = 'audio/webm;codecs=opus';

      constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
        constructorOptions.push(options);
        if (options?.mimeType) {
          const err = new Error('Unsupported MIME type');
          err.name = 'NotSupportedError';
          throw err;
        }
      }

      start(): void {
        this.state = 'recording';
      }

      requestData(): void {
        this.ondataavailable?.({ data: makeFakeBlob(256) });
      }

      stop(): void {
        this.state = 'inactive';
        this.onstop?.();
      }
    }
    setMediaRecorder(FakeMediaRecorder as unknown as typeof MediaRecorder);

    const rec = new AudioRecorder({
      permission: {
        requestMic: async () => ({ getTracks: () => [] }) as unknown as MediaStream,
      },
      preferredMimeType: 'audio/webm;codecs=opus',
    });

    await rec.start();
    const result = await rec.stop();

    expect(constructorOptions.map((opts) => opts?.mimeType)).toEqual(['audio/webm;codecs=opus', undefined]);
    expect(result.blob.size).toBe(256);
    expect(result.mimeType).toBe('audio/webm;codecs=opus');
  });
});

describe('obsidianFsAdapter mobile scanner behavior', () => {
  it('uses a cached config/zones.yaml manifest override for scanZones', () => {
    const app = makeApp(makeVaultTree());
    const fs = obsidianFsAdapter(app as unknown as ObsidianApp, new Map([['config/zones.yaml', customZonesYaml]]));

    const zones = scanZones(fs, {
      vaultRoot: '',
      manifestPath: 'config/zones.yaml',
      iconPath: 'config/object-icons.yaml',
      pluginRoot: '',
    });

    expect(zones.atlas.name).toBe('custom atlas');
    expect(zones.atlas.objects).toHaveLength(1);
    expect(zones.atlas.objects[0]!.title).toBe('Humans');
    expect(zones.atlas.objects[0]!.count).toBe(1);
  });

  it('ignores an uncached vault fixtures/zones.yaml file and falls back to the inlined default manifest', () => {
    const fixtures = makeFolder('fixtures', 'fixtures', [
      makeFile('fixtures/zones.yaml', 'zones.yaml'),
    ]);
    const app = makeApp(makeVaultTree([fixtures]));
    const fs = obsidianFsAdapter(app as unknown as ObsidianApp);

    const zones = scanZones(fs, {
      vaultRoot: '',
      manifestPath: 'config/zones.yaml',
      iconPath: 'config/object-icons.yaml',
      pluginRoot: '',
    });

    expect(zones.atlas.name).toBe('atlas');
    expect(zones.atlas.objects.map((obj) => obj.title)).toContain('people');
    expect(fs.exists('fixtures')).toBe(true);
    expect(fs.exists('fixtures/zones.yaml')).toBe(false);
    expect(() => fs.read('fixtures/zones.yaml')).toThrow(/not pre-cached/);
  });

  it('defaults blank mobile manifest settings before scanning zones', async () => {
    __setPlatformDesktop(false);
    const plugin = new WorkdeskOSPlugin();
    plugin.app = makeApp(makeVaultTree(), { 'config/zones.yaml': customZonesYaml });
    plugin.settings = structuredClone(DEFAULT_SETTINGS);
    plugin.settings.zones.manifestPath = '';
    plugin.settings.zones.iconManifestPath = '';

    await (plugin as unknown as { loadZones(): Promise<void> }).loadZones();
    const zones = (plugin as unknown as { zones: Record<string, { name: string }> }).zones;

    expect(zones.atlas?.name).toBe('custom atlas');
  });

  it('scanFilesView over the root emits top-level folder/file nodes with the right type', () => {
    const fixtures = makeFolder('fixtures', 'fixtures', [
      makeFile('fixtures/zones.yaml', 'zones.yaml'),
    ]);
    const app = makeApp(makeVaultTree([fixtures]));
    const fs = obsidianFsAdapter(app as unknown as ObsidianApp);

    const tree = scanFilesView(fs, { vaultRoot: '' });

    expect(tree.map((node) => ({ name: node.name, type: node.type }))).toEqual([
      { name: 'atlas', type: 'folder' },
      { name: 'fixtures', type: 'folder' },
      { name: 'README.md', type: 'file' },
    ]);
  });
});

describe('mobile platform gates', () => {
  it('keeps pickSupportedMimeType platform-independent', () => {
    setMediaRecorder(makeMediaRecorder((type) => type === 'audio/mp4'));
    __setPlatformDesktop(false);
    expect(Platform.isDesktopApp).toBe(false);
    expect(pickSupportedMimeType('audio/webm;codecs=opus')).toBe('audio/mp4');
  });

  it('requireDesktopModule throws on mobile', () => {
    __setPlatformDesktop(false);
    expect(() => requireDesktopModule('node:fs')).toThrow(/desktop app/);
  });

  it('fileUrlForVaultFile returns null on mobile even for a FileSystemAdapter', () => {
    __setPlatformDesktop(false);
    const adapter = new FileSystemAdapter();
    adapter.basePath = '/Users/op/vault';
    expect(fileUrlForVaultFile(adapter, 'atlas/page.html')).toBeNull();
  });

  it('renders direct STT key settings on mobile without key-source or Infisical rows', async () => {
    __setPlatformDesktop(false);
    const host = document.createElement('div');
    document.body.appendChild(host);

    await mountQuickCaptureSection(host, makeSettingsPlugin());

    const rowNames = Array.from(host.querySelectorAll('.setting-item-name')).map((el) => el.textContent ?? '');
    expect(rowNames).toContain('STT API key');
    expect(host.querySelector('.setting-secret')).not.toBeNull();
    expect(rowNames).not.toContain('Key source');
    expect(rowNames.some((name) => name.includes('Infisical'))).toBe(false);
  });

  it('shows a desktop-session triage toast on mobile', async () => {
    __setPlatformDesktop(false);
    const plugin = new WorkdeskOSPlugin();
    const revealed: string[] = [];
    (plugin as unknown as { revealZone(zoneId: string): Promise<void> }).revealZone = async (zoneId) => {
      revealed.push(zoneId);
    };

    await plugin.triageCaptureInbox();

    expect(revealed).toEqual(['gtd']);
    expect(document.body.textContent).toContain('Switched to gtd · process the inbox from a desktop session');
    expect(document.body.textContent).not.toContain('/triage');
  });
});
