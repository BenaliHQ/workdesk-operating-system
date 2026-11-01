import { afterEach, describe, expect, it, vi } from 'vitest';
import { LONG_PRESS_MS, onContextMenuOrLongPress } from '../src/components/long-press';
import { mountGeneralSection } from '../src/settings/sections/general';
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

function touchEvent(type: string, x: number, y: number): Event {
  const evt = new Event(type, { bubbles: true, cancelable: true });
  const touches = type === 'touchend' ? [] : [{ clientX: x, clientY: y }];
  Object.defineProperty(evt, 'touches', { value: touches });
  return evt;
}

describe('long-press context menus', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the context menu after a long-press on mobile and swallows the trailing tap', () => {
    vi.useFakeTimers();
    __setPlatformDesktop(false, { isPhone: true });
    const el = document.createElement('div');
    const menus: Array<{ x: number; y: number }> = [];
    const clicks: number[] = [];
    onContextMenuOrLongPress(el, (evt) => menus.push({ x: evt.clientX, y: evt.clientY }));
    el.addEventListener('click', () => clicks.push(1));

    el.dispatchEvent(touchEvent('touchstart', 40, 60));
    vi.advanceTimersByTime(LONG_PRESS_MS);
    el.dispatchEvent(touchEvent('touchend', 40, 60));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    expect(menus).toEqual([{ x: 40, y: 60 }]);
    expect(clicks).toEqual([]);
  });

  it('swallows the release click even when the finger is held long after the menu opens', () => {
    vi.useFakeTimers();
    __setPlatformDesktop(false, { isPhone: false });
    const el = document.createElement('div');
    const menus: number[] = [];
    const clicks: number[] = [];
    onContextMenuOrLongPress(el, () => menus.push(1));
    el.addEventListener('click', () => clicks.push(1));

    el.dispatchEvent(touchEvent('touchstart', 40, 60));
    vi.advanceTimersByTime(LONG_PRESS_MS);
    vi.advanceTimersByTime(5_000);
    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    el.dispatchEvent(touchEvent('touchend', 40, 60));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(menus).toEqual([1]);
    expect(clicks).toEqual([]);

    // The next, separate tap goes through immediately.
    el.dispatchEvent(touchEvent('touchstart', 40, 60));
    el.dispatchEvent(touchEvent('touchend', 40, 60));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clicks).toEqual([1]);
  });

  it('treats a short tap or a scroll as a normal interaction', () => {
    vi.useFakeTimers();
    __setPlatformDesktop(false, { isPhone: true });
    const el = document.createElement('div');
    const menus: number[] = [];
    const clicks: number[] = [];
    onContextMenuOrLongPress(el, () => menus.push(1));
    el.addEventListener('click', () => clicks.push(1));

    el.dispatchEvent(touchEvent('touchstart', 10, 10));
    vi.advanceTimersByTime(100);
    el.dispatchEvent(touchEvent('touchend', 10, 10));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    el.dispatchEvent(touchEvent('touchstart', 10, 10));
    el.dispatchEvent(touchEvent('touchmove', 10, 60));
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);

    expect(menus).toEqual([]);
    expect(clicks).toEqual([1]);
  });

  it('keeps desktop on right-click only', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const menus: number[] = [];
    onContextMenuOrLongPress(el, () => menus.push(1));

    el.dispatchEvent(touchEvent('touchstart', 10, 10));
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    expect(menus).toEqual([]);

    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(menus).toEqual([1]);
  });
});

describe('mobile startup and navigation', () => {
  it('defers the initial zone scan and vault listeners until layout is ready', async () => {
    __setPlatformDesktop(false);
    const plugin = new WorkdeskOSPlugin();
    plugin.app = makeApp(makeVaultTree(), { 'config/zones.yaml': customZonesYaml });
    const queued: Array<() => void> = [];
    plugin.app.workspace.onLayoutReady = (cb: () => void) => { queued.push(cb); };
    const vaultEvents: string[] = [];
    (plugin.app.vault as unknown as { on: (name: string) => unknown }).on = (name: string) => {
      vaultEvents.push(name);
      return {};
    };

    await plugin.onload();
    const zonesOf = (): Record<string, { name: string }> =>
      (plugin as unknown as { zones: Record<string, { name: string }> }).zones;

    expect(zonesOf()).toEqual({});
    expect(vaultEvents).toEqual([]);

    for (const cb of queued) cb();
    await vi.waitFor(() => expect(zonesOf().atlas?.name).toBe('custom atlas'));
    expect(vaultEvents).toEqual(expect.arrayContaining(['create', 'delete', 'rename']));
  });

  it('does nothing when layout-ready fires after the plugin was unloaded', async () => {
    __setPlatformDesktop(false);
    const plugin = new WorkdeskOSPlugin();
    plugin.app = makeApp(makeVaultTree(), { 'config/zones.yaml': customZonesYaml });
    const queued: Array<() => void> = [];
    plugin.app.workspace.onLayoutReady = (cb: () => void) => { queued.push(cb); };
    const vaultEvents: string[] = [];
    (plugin.app.vault as unknown as { on: (name: string) => unknown }).on = (name: string) => {
      vaultEvents.push(name);
      return {};
    };

    await plugin.onload();
    plugin.onunload();
    for (const cb of queued) cb();
    await Promise.resolve();

    expect(vaultEvents).toEqual([]);
    expect((plugin as unknown as { zones: Record<string, unknown> }).zones).toEqual({});
  });

  it('cancels a pending zone refresh on unload', async () => {
    vi.useFakeTimers();
    try {
      const plugin = new WorkdeskOSPlugin();
      plugin.app = new App();
      const refresh = vi.fn(async () => {});
      plugin.refreshZones = refresh;
      plugin.scheduleZoneRefresh();
      plugin.onunload();
      vi.advanceTimersByTime(1_000);
      expect(refresh).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('collapses the left drawer after opening a file on iPhone only', async () => {
    for (const [isPhone, expected] of [[true, true], [false, false]] as const) {
      __setPlatformDesktop(false, { isPhone });
      const plugin = new WorkdeskOSPlugin();
      plugin.app = new App();
      await plugin.openVaultPath('atlas/people/jane-doe.md');
      expect(plugin.app.workspace._openLinkTextCalls).toHaveLength(1);
      expect(plugin.app.workspace.leftSplit.collapsed).toBe(expected);
    }
  });

  it('leaves the left sidebar alone on desktop', async () => {
    const plugin = new WorkdeskOSPlugin();
    plugin.app = new App();
    await plugin.openVaultPath('atlas/people/jane-doe.md');
    expect(plugin.app.workspace.leftSplit.collapsed).toBe(false);
  });

  it('hides the desktop-only vault path setting on mobile', () => {
    const rowNames = (): string[] => {
      const host = document.createElement('div');
      mountGeneralSection(host, makeSettingsPlugin());
      return Array.from(host.querySelectorAll('.setting-item-name')).map((el) => el.textContent ?? '');
    };
    expect(rowNames()).toContain('Vault path');
    __setPlatformDesktop(false);
    expect(rowNames()).not.toContain('Vault path');
    expect(rowNames()).toContain('Daily note folder');
  });
});
