import { afterEach, describe, expect, it } from 'vitest';
import { TFile, TFolder, type App } from 'obsidian';
import { pickSupportedMimeType } from '../src/services/capture/recorder';
import { obsidianFsAdapter } from '../src/services/vault-scan';

const originalMediaRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder');

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

afterEach(() => {
  if (originalMediaRecorder) {
    Object.defineProperty(globalThis, 'MediaRecorder', originalMediaRecorder);
  } else {
    Reflect.deleteProperty(globalThis, 'MediaRecorder');
  }
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

  it('returns the preferred MIME type when isTypeSupported is absent', () => {
    setMediaRecorder(makeMediaRecorder());
    expect(pickSupportedMimeType('audio/webm;codecs=opus')).toBe('audio/webm;codecs=opus');
  });
});

describe('obsidianFsAdapter', () => {
  it('lists the in-memory vault tree and reads only pre-cached manifests', () => {
    const jane = makeFile('atlas/people/jane-doe.md', 'jane-doe.md');
    const people = makeFolder('atlas/people', 'people', [jane]);
    const atlas = makeFolder('atlas', 'atlas', [people]);
    const readme = makeFile('README.md', 'README.md');
    const root = makeFolder('', '', [atlas, readme]);
    const byPath = new Map<string, TFile | TFolder>([
      ['atlas', atlas],
      ['atlas/people', people],
      ['atlas/people/jane-doe.md', jane],
      ['README.md', readme],
    ]);
    const app = {
      vault: {
        getRoot: () => root,
        getAbstractFileByPath: (path: string) => byPath.get(path) ?? null,
      },
    } as unknown as App;
    const manifestCache = new Map([['config/zones.yaml', 'zones: []']]);
    const fs = obsidianFsAdapter(app, manifestCache);

    expect(fs.exists('/config/zones.yaml')).toBe(true);
    expect(fs.exists('/atlas')).toBe(true);
    expect(fs.exists('atlas/people/jane-doe.md')).toBe(true);
    expect(fs.exists('missing')).toBe(false);
    expect(fs.read('/config/zones.yaml')).toBe('zones: []');
    expect(() => fs.read('atlas/people/jane-doe.md')).toThrow(/not pre-cached/);
    expect(fs.list('')).toEqual([
      { name: 'atlas', isDir: true },
      { name: 'README.md', isDir: false },
    ]);
    expect(fs.list('/atlas')).toEqual([{ name: 'people', isDir: true }]);
    expect(fs.list('/atlas/people/jane-doe.md')).toEqual([]);
  });
});
