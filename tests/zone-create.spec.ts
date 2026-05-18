// Zone "+" affordances — instant create via plugin.createNewNoteIn /
// createNewFolderIn. Mirrors Obsidian's File Explorer flow: click → file
// or folder appears with `Untitled` / `Untitled 1` / ... naming, no modal.
// The vault create event then fires the debounced refresh wired elsewhere.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { App, Plugin, TFile, TFolder, type TAbstractFile } from 'obsidian';

/** Builds a vault-like adapter that's backed by an in-memory map of
 *  paths. Sufficient to exercise findAvailableName's collision logic
 *  through the plugin's create helpers. */
function makeMemoryVault(initial: string[] = []): {
  paths: Set<string>;
  vault: {
    create(path: string, data: string): Promise<TFile>;
    createFolder(path: string): Promise<void>;
    getAbstractFileByPath(path: string): TAbstractFile | null;
  };
  createCalls: Array<{ path: string; data: string }>;
  folderCalls: string[];
} {
  const paths = new Set(initial);
  const createCalls: Array<{ path: string; data: string }> = [];
  const folderCalls: string[] = [];
  return {
    paths,
    createCalls,
    folderCalls,
    vault: {
      async create(p: string, data: string): Promise<TFile> {
        if (paths.has(p)) throw new Error(`Already exists: ${p}`);
        paths.add(p);
        createCalls.push({ path: p, data });
        const f = new TFile();
        f.path = p;
        f.basename = p.split('/').pop()?.replace(/\.md$/, '') ?? '';
        f.extension = 'md';
        return f;
      },
      async createFolder(p: string): Promise<void> {
        if (paths.has(p)) throw new Error(`Already exists: ${p}`);
        paths.add(p);
        folderCalls.push(p);
      },
      getAbstractFileByPath(p: string): TAbstractFile | null {
        if (!paths.has(p)) return null;
        return p.endsWith('.md') ? (new TFile() as TAbstractFile) : (new TFolder() as TAbstractFile);
      },
    },
  };
}

// Lightweight harness — we don't need to instantiate the full plugin
// (which pulls in TerminalView, ZoneView, etc.). We re-implement the two
// helper methods against the mock vault so the test exercises the SAME
// collision-naming behavior we ship in production. The shared helper
// below is byte-identical to plugin.findAvailableName.
function findAvailableName(
  vault: ReturnType<typeof makeMemoryVault>['vault'],
  parent: string,
  base: string,
  ext: string,
): string {
  for (let i = 0; i < 1000; i += 1) {
    const suffix = i === 0 ? '' : ` ${String(i)}`;
    const candidate = `${base}${suffix}${ext}`;
    const fullPath = parent ? `${parent}/${candidate}` : candidate;
    if (!vault.getAbstractFileByPath(fullPath)) return candidate;
  }
  return `${base} ${String(Date.now())}${ext}`;
}

describe('zone create · findAvailableName collision numbering', () => {
  it('returns the unsuffixed name when no collision exists', () => {
    const { vault } = makeMemoryVault();
    expect(findAvailableName(vault, 'atlas', 'Untitled', '.md')).toBe('Untitled.md');
    expect(findAvailableName(vault, 'atlas', 'Untitled', '')).toBe('Untitled');
  });

  it('appends " 1" when the base name is taken', () => {
    const { vault } = makeMemoryVault(['atlas/Untitled.md']);
    expect(findAvailableName(vault, 'atlas', 'Untitled', '.md')).toBe('Untitled 1.md');
  });

  it('skips past consecutive taken numbers', () => {
    const { vault } = makeMemoryVault([
      'atlas/Untitled.md',
      'atlas/Untitled 1.md',
      'atlas/Untitled 2.md',
    ]);
    expect(findAvailableName(vault, 'atlas', 'Untitled', '.md')).toBe('Untitled 3.md');
  });

  it('handles folder collisions (no extension)', () => {
    const { vault } = makeMemoryVault(['gtd/Untitled']);
    expect(findAvailableName(vault, 'gtd', 'Untitled', '')).toBe('Untitled 1');
  });

  it('handles the vault-root case (no parent)', () => {
    const { vault } = makeMemoryVault(['Untitled.md', 'Untitled 1.md']);
    expect(findAvailableName(vault, '', 'Untitled', '.md')).toBe('Untitled 2.md');
  });
});

describe('zone create · end-to-end against the real plugin helpers', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('createNewNoteIn creates the file via vault.create with empty body and opens it', async () => {
    // Import the real module so we exercise the bundled helper, not a copy.
    const main = await import('../src/main');
    const PluginClass = main.default;
    const plugin = new PluginClass(new App(), { id: 'workdesk-operating-system', dir: '.' });
    const createSpy = vi.spyOn(plugin.app.vault, 'create').mockImplementation(async (p) => {
      const f = new TFile(); f.path = p; return f;
    });
    vi.spyOn(plugin.app.vault, 'getAbstractFileByPath').mockReturnValue(null);
    vi.spyOn(plugin.app.vault, 'createFolder').mockResolvedValue(undefined);
    const openSpy = vi.spyOn(plugin.app.workspace, 'openLinkText').mockResolvedValue(undefined);

    const path = await plugin.createNewNoteIn('config');
    expect(path).toBe('config/Untitled.md');
    expect(createSpy).toHaveBeenCalledWith('config/Untitled.md', '');
    expect(openSpy).toHaveBeenCalledWith('config/Untitled.md', '', false);
  });

  it('createNewFolderIn creates the folder via vault.createFolder and does not open anything', async () => {
    const main = await import('../src/main');
    const PluginClass = main.default;
    const plugin = new PluginClass(new App(), { id: 'workdesk-operating-system', dir: '.' });
    vi.spyOn(plugin.app.vault, 'getAbstractFileByPath').mockReturnValue(null);
    const folderSpy = vi.spyOn(plugin.app.vault, 'createFolder').mockResolvedValue(undefined);
    const openSpy = vi.spyOn(plugin.app.workspace, 'openLinkText').mockResolvedValue(undefined);

    const path = await plugin.createNewFolderIn('atlas');
    expect(path).toBe('atlas/Untitled');
    expect(folderSpy).toHaveBeenCalledWith('atlas/Untitled');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('createNewNoteIn returns a numbered name when Untitled.md already exists', async () => {
    const main = await import('../src/main');
    const PluginClass = main.default;
    const plugin = new PluginClass(new App(), { id: 'workdesk-operating-system', dir: '.' });
    const present = new Set(['atlas/Untitled.md', 'atlas/Untitled 1.md']);
    vi.spyOn(plugin.app.vault, 'getAbstractFileByPath').mockImplementation((p: string) =>
      present.has(p) ? (new TFile() as TAbstractFile) : null,
    );
    vi.spyOn(plugin.app.vault, 'create').mockImplementation(async (p) => {
      const f = new TFile(); f.path = p; return f;
    });
    vi.spyOn(plugin.app.workspace, 'openLinkText').mockResolvedValue(undefined);

    const path = await plugin.createNewNoteIn('atlas');
    expect(path).toBe('atlas/Untitled 2.md');
  });
});

describe('zone create · real filesystem integration', () => {
  let vaultRoot: string;
  beforeEach(() => {
    vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wdos-create-'));
    fs.mkdirSync(path.join(vaultRoot, 'atlas'), { recursive: true });
  });

  it('a created file shows up in the next scanZones pass', async () => {
    const { scanZones, nodeFsAdapter } = await import('../src/services/vault-scan');
    const PLUGIN_ROOT = path.resolve(__dirname, '..');
    const fsa = nodeFsAdapter();

    const before = scanZones(fsa, { vaultRoot, pluginRoot: PLUGIN_ROOT });
    expect(before.atlas.objects.length).toBe(0);

    fs.writeFileSync(path.join(vaultRoot, 'atlas', 'Untitled.md'), '');

    const after = scanZones(fsa, { vaultRoot, pluginRoot: PLUGIN_ROOT });
    const names = after.atlas.objects.map((o) => o.title);
    expect(names).toContain('Untitled.md');
  });
});
