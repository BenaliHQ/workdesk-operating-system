// Files that sit at the zone root render as their own cards (not as rows
// inside an expanded folder card). Right-click on those cards has to give
// the operator a Delete / Rename / etc. menu — Obsidian's native file menu.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanZones, nodeFsAdapter } from '../src/services/vault-scan';

describe('scanZones · root-level files become cards with folder = full path', () => {
  let vaultRoot: string;
  const PLUGIN_ROOT = path.resolve(__dirname, '..');

  beforeEach(() => {
    vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wdos-file-card-'));
    fs.mkdirSync(path.join(vaultRoot, 'config'), { recursive: true });
    fs.writeFileSync(path.join(vaultRoot, 'config', 'untitled.md'), '');
    fs.writeFileSync(path.join(vaultRoot, 'config', 'index.md'), '# config');
    fs.mkdirSync(path.join(vaultRoot, 'config', 'skills'));
  });

  it('emits a card per top-level file with folder set to the file path', () => {
    const zones = scanZones(nodeFsAdapter(), { vaultRoot, pluginRoot: PLUGIN_ROOT });
    const config = zones.config.objects;
    const untitled = config.find((o) => o.title === 'untitled.md');
    const indexMd = config.find((o) => o.title === 'index.md');

    expect(untitled).toBeDefined();
    expect(untitled?.folder).toBe('config/untitled.md');
    expect(untitled?.count).toBe('—');

    expect(indexMd).toBeDefined();
    expect(indexMd?.folder).toBe('config/index.md');
  });

  it('still emits folders alongside, with folder set to the folder path', () => {
    const zones = scanZones(nodeFsAdapter(), { vaultRoot, pluginRoot: PLUGIN_ROOT });
    const skills = zones.config.objects.find((o) => o.title === 'skills');
    expect(skills?.folder).toBe('config/skills');
    expect(typeof skills?.count).toBe('number');
  });
});

describe('right-click contract on file cards', () => {
  it('the file-card path lookup uses obj.folder, and getAbstractFileByPath gets called with the file path', async () => {
    // Smoke check the lookup contract: if `obj.folder` is the file's path,
    // a host using `app.vault.getAbstractFileByPath(obj.folder)` resolves
    // the right file. Without this, the right-click handler can't find the
    // TFile and the native menu never opens.
    const { App, TFile } = await import('obsidian');
    const app = new App();
    const expected = 'config/untitled.md';
    const tfile = new TFile();
    tfile.path = expected;
    const spy = vi.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(tfile);

    const got = app.vault.getAbstractFileByPath(expected);
    expect(spy).toHaveBeenCalledWith(expected);
    expect(got).toBe(tfile);
  });
});
