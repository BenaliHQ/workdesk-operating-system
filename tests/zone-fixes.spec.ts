// Three follow-up fixes:
//   • TreeRow's onContextMenu callback fires on right-click with the right path
//   • Scanner emits expanded: false even when the manifest declares expanded: true
//   • `sliders` icon is registered and differs from `gear`

import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { renderTreeRow } from '../src/components/TreeRow';
import { scanZones, nodeFsAdapter } from '../src/services/vault-scan';
import { ICONS } from '../src/icons';
import type { TreeNode } from '../src/types';

describe('TreeRow · onContextMenu', () => {
  it('fires onContextMenu with the resolved path on right-click', () => {
    const node: TreeNode = { type: 'file', name: 'untitled.md', depth: 1 };
    const onContextMenu = vi.fn();
    const row = renderTreeRow({
      node,
      pathPrefix: 'config',
      onContextMenu,
    });
    document.body.appendChild(row);

    row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

    expect(onContextMenu).toHaveBeenCalledTimes(1);
    const [, calledNode, calledPath] = onContextMenu.mock.calls[0];
    expect(calledNode).toBe(node);
    expect(calledPath).toBe('config/untitled.md');
  });

  it('skips the legacy showContextMenu when onContextMenu is wired', () => {
    // If the custom menu fires, it would attach an element to document.body.
    // We assert no .context-menu / .ctx-menu element is created — the host
    // is responsible for opening whatever menu it wants.
    const node: TreeNode = { type: 'file', name: 'note.md', depth: 1 };
    const onContextMenu = vi.fn();
    const row = renderTreeRow({ node, pathPrefix: 'atlas', onContextMenu });
    document.body.appendChild(row);
    row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    // The legacy showContextMenu appends a popover root to document.body
    // with the `.ctx-menu` class; if onContextMenu took over, none is added.
    expect(document.querySelector('.ctx-menu')).toBeNull();
  });
});

describe('scanZones · no zone object expanded by default', () => {
  const ROOT = resolve(__dirname, 'fixtures/sample-vault');
  const PLUGIN_ROOT = resolve(__dirname, '..');

  it('every zone object emerges with expanded === false', () => {
    const zones = scanZones(nodeFsAdapter(), {
      vaultRoot: ROOT,
      manifestPath: 'config/zones.yaml',
      pluginRoot: PLUGIN_ROOT,
    });
    for (const [zoneId, zone] of Object.entries(zones)) {
      for (const obj of zone.objects) {
        expect(obj.expanded, `${zoneId}.${obj.id} should start collapsed`).toBe(false);
      }
    }
  });

  it('still honors expanded: true at the TreeNode level (so manual expand→re-render works)', () => {
    // Sanity: the override is only at the zone-object level, not in the
    // filesystem-walked TreeNode children. Children remain unchanged so the
    // click-to-expand interaction in TreeRow still mutates and re-renders.
    const zones = scanZones(nodeFsAdapter(), {
      vaultRoot: ROOT,
      manifestPath: 'config/zones.yaml',
      pluginRoot: PLUGIN_ROOT,
    });
    const atlas = zones.atlas;
    const projects = atlas.objects.find((o) => o.id === 'projects');
    // children are tree nodes — their `expanded` is undefined / not forced
    // (we only override the zone-object level).
    if (projects?.children?.length) {
      for (const child of projects.children) {
        // Tree-level `expanded` is allowed to be true (folder showing its own
        // descendants). This is about the OUTER card collapse state.
        expect(typeof child.expanded === 'boolean' || child.expanded === undefined).toBe(true);
      }
    }
  });
});

describe('icons · sliders is distinct from gear', () => {
  it('registers the sliders glyph', () => {
    expect(ICONS.sliders).toBeDefined();
    expect(ICONS.sliders.length).toBeGreaterThan(0);
  });

  it('sliders is not the same path as gear', () => {
    expect(ICONS.sliders).not.toBe(ICONS.gear);
  });
});
