import { describe, it, expect, beforeEach } from 'vitest';
import {
  scanZones,
  scanFilesView,
  walkTree,
  type FsAdapter,
  nodeFsAdapter,
} from '../src/services/vault-scan';
import { renderZoneCard } from '../src/components/ZoneCard';
import { renderTree } from '../src/components/TreeRow';
import { renderCaughtUpRow, renderZoneEmpty } from '../src/components/EmptyStates';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, 'fixtures/sample-vault');
const PLUGIN_ROOT = resolve(__dirname, '..');

describe('phase 2 · scanner', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = nodeFsAdapter();
  });

  it('reads zones.yaml from the fixture vault and produces a zone map', () => {
    const zones = scanZones(fs, {
      vaultRoot: ROOT,
      manifestPath: 'config/zones.yaml',
      pluginRoot: PLUGIN_ROOT,
    });
    // The fixture defines atlas / gtd / intel / system / config.
    expect(Object.keys(zones).sort()).toEqual(['atlas', 'config', 'gtd', 'intel', 'system']);
  });

  it('atlas zone has projects (1) and people (1)', () => {
    const zones = scanZones(fs, {
      vaultRoot: ROOT,
      manifestPath: 'config/zones.yaml',
      pluginRoot: PLUGIN_ROOT,
    });
    const atlas = zones.atlas;
    expect(atlas).toBeDefined();
    const projects = atlas.objects.find((o) => o.id === 'projects');
    const people = atlas.objects.find((o) => o.id === 'people');
    // Card count is immediate children only (the example-project subfolder).
    expect(projects?.count).toBe(1);
    expect(people?.count).toBe(1); // jane-doe.md
    expect(projects?.children?.length ?? 0).toBeGreaterThan(0);
  });

  it('gtd inbox is caught-up (empty)', () => {
    const zones = scanZones(fs, {
      vaultRoot: ROOT,
      manifestPath: 'config/zones.yaml',
      pluginRoot: PLUGIN_ROOT,
    });
    const inbox = zones.gtd.objects.find((o) => o.id === 'inbox');
    // The fixture's gtd/inbox contains only .gitkeep, which the scanner skips.
    expect(inbox?.count).toBe(0);
  });

  it('falls back to plugin fixtures when vault manifest is missing', () => {
    const zones = scanZones(fs, {
      vaultRoot: ROOT,
      manifestPath: 'config/does-not-exist.yaml',
      pluginRoot: PLUGIN_ROOT,
    });
    // Plugin's fixtures/zones.yaml defines atlas/gtd/intel/system/config plus
    // additional folders the scanner will report 0 for. We expect at least
    // the fixture-defined zones.
    expect(Object.keys(zones).length).toBeGreaterThanOrEqual(4);
  });

  it('walkTree returns a folder-first list with depth indices', () => {
    const tree = walkTree(fs, `${ROOT}/atlas`);
    const top = tree.map((n) => n.name);
    expect(top).toContain('projects');
    const proj = tree.find((n) => n.name === 'projects');
    expect(proj?.depth).toBe(1);
    expect(proj?.type).toBe('folder');
  });

  it('scanFilesView produces a flat view of the vault root', () => {
    const flat = scanFilesView(fs, { vaultRoot: ROOT });
    const names = flat.map((n) => n.name);
    expect(names).toContain('atlas');
    expect(names).toContain('gtd');
    expect(names).toContain('config');
  });
});

describe('phase 2 · DOM components', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renderZoneCard emits .obj.collapsed by default with .obj-row + meta count', () => {
    const card = renderZoneCard({
      zoneId: 'atlas',
      obj: {
        id: 'projects', title: 'projects', sub: 'active', count: 3, icon: 'folder',
      },
    });
    expect(card.classList.contains('obj')).toBe(true);
    expect(card.classList.contains('collapsed')).toBe(true);
    expect(card.querySelector('.obj-row')).not.toBeNull();
    expect(card.querySelector('.obj-meta')?.textContent).toBe('3');
  });

  it('toggle on click removes .collapsed', () => {
    const card = renderZoneCard({
      zoneId: 'atlas',
      obj: { id: 'p', title: 'p', sub: 's', count: 1, icon: 'folder' },
    });
    document.body.appendChild(card);
    (card.querySelector('.obj-row') as HTMLElement).click();
    expect(card.classList.contains('collapsed')).toBe(false);
  });

  it('renderTree builds a .tree with one .row per node and expanded children', () => {
    const tree = renderTree(
      [
        { type: 'folder', name: 'projects', depth: 1, expanded: true, count: 2,
          children: [
            { type: 'file', name: 'a.md', depth: 2 },
            { type: 'file', name: 'b.md', depth: 2 },
          ],
        },
      ],
      { pathPrefix: 'atlas' },
    );
    expect(tree.querySelectorAll('.row').length).toBe(3);
  });

  it('renderCaughtUpRow has .empty-row.caught-up', () => {
    const r = renderCaughtUpRow();
    expect(r.classList.contains('empty-row')).toBe(true);
    expect(r.classList.contains('caught-up')).toBe(true);
  });

  it('renderZoneEmpty has .zone-empty + big-dot + h2 + p', () => {
    const e = renderZoneEmpty({ icon: 'inbox', title: 't', body: 'b' });
    expect(e.classList.contains('zone-empty')).toBe(true);
    expect(e.querySelector('.big-dot')).not.toBeNull();
    expect(e.querySelector('h2')?.textContent).toBe('t');
  });
});
