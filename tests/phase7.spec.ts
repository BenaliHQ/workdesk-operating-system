import { describe, it, expect, beforeEach, vi } from 'vitest';
import { _getIconCalls, _resetTestStubs } from './stubs/obsidian';
import WorkdeskOSPlugin from '../src/main';
import type { ZoneId } from '../src/types';

describe('phase 7 · standard plugin pattern', () => {
  let plugin: WorkdeskOSPlugin;

  beforeEach(async () => {
    document.body.replaceChildren();
    document.body.className = '';
    _resetTestStubs();
    plugin = new WorkdeskOSPlugin();
    // Stub data-storage so loadSettings + scanZones work in jsdom.
    (plugin as unknown as { loadData: () => Promise<unknown> }).loadData = async () => null;
    (plugin as unknown as { saveData: (d: unknown) => Promise<void> }).saveData = async () => {};
    await plugin.onload();
  });

  it('registers 12 ribbon icons in spec order via addRibbonIcon', () => {
    const calls = (plugin as unknown as { _ribbonCalls: Array<{ icon: string }> })._ribbonCalls;
    const icons = calls.map((c) => c.icon);
    expect(icons).toEqual([
      'workdesk-atlas', 'workdesk-gtd', 'workdesk-intel', 'workdesk-personal', 'workdesk-system', 'workdesk-config', 'workdesk-files',
      'workdesk-today', 'workdesk-terminal', 'workdesk-focus', 'workdesk-mic', 'workdesk-settings',
    ]);
  });

  it('addIcon is invoked before addRibbonIcon, for each of the 12 names', () => {
    const iconNames = _getIconCalls().map((c) => c.name);
    expect(iconNames).toEqual(expect.arrayContaining([
      'workdesk-atlas', 'workdesk-gtd', 'workdesk-intel', 'workdesk-personal', 'workdesk-system', 'workdesk-config', 'workdesk-files',
      'workdesk-today', 'workdesk-terminal', 'workdesk-focus', 'workdesk-mic', 'workdesk-settings',
    ]));
    expect(iconNames.length).toBe(12);
  });

  it('does not mutate Obsidian .app element', () => {
    expect(document.body.classList.contains('workdesk-shell')).toBe(false);
    expect(document.body.querySelector('.ws-ribbon')).toBeNull();
    const app = document.createElement('div');
    app.classList.add('app');
    document.body.appendChild(app);
    expect(app.style.display).toBe('');
    expect(app.classList.contains('app')).toBe(true);
    expect(app.classList.contains('workdesk-shell')).toBe(false);
  });

  it('revealZone creates a left-sidebar zone leaf when none exists', async () => {
    const ws = plugin.app.workspace as unknown as {
      _getLeftLeafCalls: number;
      _setViewStateCalls: Array<{ type: string }>;
    };
    const before = ws._getLeftLeafCalls;
    await plugin.revealZone('atlas');
    expect(ws._getLeftLeafCalls).toBeGreaterThan(before);
    expect(ws._setViewStateCalls.find((c) => c.type === 'workdesk-zone')).toBeDefined();
  });

  it('revealZone reuses an existing zone leaf and calls setZones + setActiveZone', async () => {
    const ws = plugin.app.workspace as unknown as { _seedLeaf(type: string, viewMock: unknown): void };
    const view = { setZones: vi.fn(), setActiveZone: vi.fn() };
    ws._seedLeaf('workdesk-zone', view);
    await plugin.revealZone('gtd');
    expect(view.setZones).toHaveBeenCalled();
    expect(view.setActiveZone).toHaveBeenCalledWith('gtd');
  });

  it('revealZone("files") synthesizes a files zone with empty pathPrefix so tree paths are vault-relative', async () => {
    const ws = plugin.app.workspace as unknown as { _seedLeaf(type: string, viewMock: unknown): void };
    const view = { setZones: vi.fn(), setActiveZone: vi.fn() };
    ws._seedLeaf('workdesk-zone', view);
    await plugin.revealZone('files' as ZoneId);
    expect(view.setActiveZone).toHaveBeenCalledWith('files');
    const zonesArg = view.setZones.mock.calls[0]![0]!;
    expect(zonesArg.files).toBeDefined();
    // The wrapper object's id must be '' so ZoneView passes pathPrefix=''
    // to renderTree — tree-row paths come out as vault-relative.
    expect(zonesArg.files.objects[0].id).toBe('');
  });

  it('scope-app-css.mjs strips .app/body/html at top level AND inside @media blocks; preserves .app.term-fullscreen and .edge-expand', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const gen = path.resolve(__dirname, '..', 'styles', 'app.scoped.generated.css');
    if (!fs.existsSync(gen)) return; // skip if scope step not run yet
    const css = fs.readFileSync(gen, 'utf8');
    expect(/^\s*\.app\s*\{/m.test(css)).toBe(false);
    expect(/^\s*\.app\.no-/m.test(css)).toBe(false);
    expect(/^\s*body\s*\{/m.test(css)).toBe(false);
    expect(/^\s*html\s*[,{]/m.test(css)).toBe(false);
    // .app.term-fullscreen rules must survive.
    expect(css).toMatch(/\.app\.term-fullscreen/);
    // Inside the mobile-narrow @media, .app rules must be stripped but
    // .edge-expand must remain.
    const mediaBlockRe = /@media\s*\([^)]*max-width:\s*900px[^)]*\)\s*\{([\s\S]*?)\n\}/m;
    const m = mediaBlockRe.exec(css);
    if (m) {
      expect(/\.app\s*,/.test(m[1]!)).toBe(false);
      expect(m[1]!).toContain('edge-expand');
    }
  });

  it('TreeRow opens files at vault-relative paths (no leading slash) when pathPrefix is empty', async () => {
    const { renderTree } = await import('../src/components/TreeRow');
    const calls: string[] = [];
    const tree = [
      {
        type: 'folder' as const,
        name: 'atlas',
        depth: 0,
        expanded: true,
        children: [
          { type: 'file' as const, name: 'martin-holland.md', depth: 1 },
        ],
      },
    ];
    const treeEl = renderTree(tree, {
      pathPrefix: '',
      onActivate: (_node, path) => calls.push(path),
    });
    document.body.appendChild(treeEl);
    // TreeRow renders rows with class `.row` (not `.tree-row`).
    treeEl.querySelectorAll<HTMLElement>('.row').forEach((r) => {
      if (r.textContent?.includes('martin-holland')) r.click();
    });
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]!.startsWith('/')).toBe(false);
    expect(calls[0]!).toBe('atlas/martin-holland.md');
  });

  it('openNewTerminalTab targets right sidebar, not root', async () => {
    const ws = plugin.app.workspace as unknown as { _getRightLeafCalls: number; _getLeafTabCalls: number };
    const beforeRight = ws._getRightLeafCalls;
    const beforeTab = ws._getLeafTabCalls;
    await plugin.openNewTerminalTab();
    expect(ws._getRightLeafCalls).toBeGreaterThan(beforeRight);
    expect(ws._getLeafTabCalls).toBe(beforeTab);
  });

  it('triageCaptureInbox reveals gtd zone', async () => {
    const spy = vi.spyOn(plugin, 'revealZone');
    await plugin.triageCaptureInbox();
    expect(spy).toHaveBeenCalledWith('gtd');
  });

  it('appearance.hideNonWorkdeskRibbonIcons toggles body class', () => {
    // Default is true (flipped in the post-spike-vault fix-up) so the body
    // class is already applied after onload. Flip off → class removed,
    // flip back on → class re-added.
    expect(document.body.classList.contains('workdesk-hide-native-ribbon-icons')).toBe(true);
    plugin.settings.appearance.hideNonWorkdeskRibbonIcons = false;
    plugin.applyAppearance();
    expect(document.body.classList.contains('workdesk-hide-native-ribbon-icons')).toBe(false);
    plugin.settings.appearance.hideNonWorkdeskRibbonIcons = true;
    plugin.applyAppearance();
    expect(document.body.classList.contains('workdesk-hide-native-ribbon-icons')).toBe(true);
  });

  it('every plugin ribbon element has workdesk-icon class', () => {
    const els = (plugin as unknown as { ribbonElements: HTMLElement[] }).ribbonElements;
    expect(els.length).toBe(12);
    for (const el of els) expect(el.classList.contains('workdesk-icon')).toBe(true);
  });

  it('addCommand registrations from prior phases survive', () => {
    const cmds = plugin.app.commands.commands as Record<string, unknown>;
    expect(cmds['workdesk:open-palette']).toBeDefined();
    expect(cmds['workdesk:capture:open']).toBeDefined();
    expect(cmds['workdesk:focus:toggle']).toBeDefined();
  });

  it('ZoneView renders a non-empty zone with .object-list + .obj cards when fed real data', async () => {
    const { ZoneView } = await import('../src/views/ZoneView');
    const leaf = { containerEl: document.createElement('div') } as unknown as import('obsidian').WorkspaceLeaf;
    const view = new ZoneView(leaf, plugin);
    (view as unknown as { contentEl: HTMLElement }).contentEl = document.createElement('div');
    view.setZones({
      atlas: {
        name: 'atlas',
        sub: 'people, projects, decisions',
        icon: 'globe',
        objects: [
          {
            id: 'atlas/people', title: 'people', sub: 'team & network', icon: 'person', count: 3, children: [
              { type: 'file', name: 'martin-holland.md', depth: 1 },
              { type: 'file', name: 'tiger-thornton.md', depth: 1 },
              { type: 'file', name: 'sarah-park.md', depth: 1 },
            ],
          },
          { id: 'atlas/projects', title: 'projects', sub: 'active builds', icon: 'building', count: 2, children: [] },
        ],
      },
    } as never);
    view.setActiveZone('atlas');
    const root = (view as unknown as { contentEl: HTMLElement }).contentEl;
    expect(root.querySelector('.pane-hero')).not.toBeNull();
    expect(root.querySelectorAll('.obj').length).toBe(2);
    expect(root.querySelector('.object-list')).not.toBeNull();
  });

  it('bundle includes obsidian-scope.css and does NOT include the .app grid rule', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const stylesPath = path.resolve(__dirname, '..', 'styles.css');
    if (!fs.existsSync(stylesPath)) return; // skip if not built
    const css = fs.readFileSync(stylesPath, 'utf8');
    expect(css).toContain('workdesk-hide-native-ribbon-icons');
    expect(/^\s*\.app\s*\{\s*display:\s*grid/m.test(css)).toBe(false);
  });

  // ── Post-spike-vault fix-ups (M4 round 2) ───────────────────────────────

  it('ZoneCard click mutates obj.expanded so re-renders preserve the state', async () => {
    const { renderZoneCard } = await import('../src/components/ZoneCard');
    const obj = { id: 'atlas/people', title: 'people', sub: '', icon: 'person' as const, count: 0, expanded: false };
    let toggles = 0;
    const card = renderZoneCard({ zoneId: 'atlas', obj, onToggle: () => { toggles++; } });
    document.body.appendChild(card);
    expect(card.classList.contains('collapsed')).toBe(true);
    (card.querySelector('.obj-row') as HTMLElement).click();
    expect(obj.expanded).toBe(true);
    expect(card.classList.contains('collapsed')).toBe(false);
    expect(toggles).toBe(1);
    (card.querySelector('.obj-row') as HTMLElement).click();
    expect(obj.expanded).toBe(false);
    expect(card.classList.contains('collapsed')).toBe(true);
  });

  it('ZoneView wraps the per-card tree in .obj-children so the collapse CSS matches', async () => {
    const { ZoneView } = await import('../src/views/ZoneView');
    const leaf = { containerEl: document.createElement('div') } as unknown as import('obsidian').WorkspaceLeaf;
    const view = new ZoneView(leaf, plugin);
    (view as unknown as { contentEl: HTMLElement }).contentEl = document.createElement('div');
    view.setZones({
      atlas: {
        name: 'atlas', sub: '', icon: 'globe',
        objects: [{
          id: 'atlas/people', title: 'people', sub: '', icon: 'person', count: 1, expanded: true,
          children: [{ type: 'file', name: 'martin.md', depth: 1 }],
        }],
      },
    } as never);
    view.setActiveZone('atlas');
    const root = (view as unknown as { contentEl: HTMLElement }).contentEl;
    const card = root.querySelector('.obj');
    expect(card).not.toBeNull();
    expect(card!.querySelector('.obj-children')).not.toBeNull();
    expect(card!.querySelector('.obj-children .tree')).not.toBeNull();
  });

  it('TreeRow folder click inserts a .tree sibling and a second click removes it', async () => {
    const { renderTree } = await import('../src/components/TreeRow');
    const tree = [{
      type: 'folder' as const,
      name: 'atlas',
      depth: 0,
      expanded: false,
      children: [{ type: 'file' as const, name: 'martin-holland.md', depth: 1 }],
    }];
    const container = renderTree(tree, { pathPrefix: '' });
    document.body.appendChild(container);
    const folderRow = container.querySelector<HTMLElement>('.row.is-folder')!;
    expect(folderRow).not.toBeNull();
    // Initially collapsed — no .tree sibling.
    expect(folderRow.nextElementSibling?.classList.contains('tree')).toBeFalsy();
    folderRow.click();
    // Now expanded — .tree sibling inserted.
    expect(folderRow.nextElementSibling?.classList.contains('tree')).toBe(true);
    expect(folderRow.nextElementSibling?.querySelector('.row')?.textContent).toContain('martin-holland');
    folderRow.click();
    // Collapsed again — sibling removed.
    expect(folderRow.nextElementSibling?.classList.contains('tree')).toBeFalsy();
  });

  it('focus controller collapses both Obsidian sidebars on enter and expands on exit', async () => {
    const { createFocusController } = await import('../src/services/focus');
    document.body.className = '';
    const workspace = {
      leftSplit: {
        collapsed: false, _collapseCalls: 0, _expandCalls: 0,
        collapse(): void { this.collapsed = true; this._collapseCalls += 1; },
        expand(): void { this.collapsed = false; this._expandCalls += 1; },
      },
      rightSplit: {
        collapsed: false, _collapseCalls: 0, _expandCalls: 0,
        collapse(): void { this.collapsed = true; this._collapseCalls += 1; },
        expand(): void { this.collapsed = false; this._expandCalls += 1; },
      },
    };
    const focus = createFocusController({
      workspace,
      settings: plugin.settings,
      saveSettings: () => {},
    });
    focus.on();
    expect(document.body.classList.contains('focus-on')).toBe(true);
    expect(workspace.leftSplit._collapseCalls).toBe(1);
    expect(workspace.rightSplit._collapseCalls).toBe(1);
    focus.off();
    expect(document.body.classList.contains('focus-on')).toBe(false);
    expect(workspace.leftSplit._expandCalls).toBe(1);
    expect(workspace.rightSplit._expandCalls).toBe(1);
  });

  it('bundle contains a .tooltip contrast override so cream tokens cannot collide with white text', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const stylesPath = path.resolve(__dirname, '..', 'styles.css');
    if (!fs.existsSync(stylesPath)) return;
    const css = fs.readFileSync(stylesPath, 'utf8');
    // The override sets explicit dark background + white text on .tooltip.
    // Loose match so future palette tweaks don't brittlely break this test.
    const tooltipBlockRe = /\.tooltip\s*\{[\s\S]*?background:\s*#[0-9a-f]{3,6}[^}]*color:\s*#[0-9a-f]{3,6}/i;
    expect(tooltipBlockRe.test(css)).toBe(true);
  });

  it('bundle restores opacity on Obsidian native modals so Settings is visible', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const stylesPath = path.resolve(__dirname, '..', 'styles.css');
    if (!fs.existsSync(stylesPath)) return;
    const css = fs.readFileSync(stylesPath, 'utf8');
    // Our plugin app.css ships `.modal { opacity: 0; transform: translateY(8px) }`
    // for .scrim-wrapped modals. Obsidian's native modals live in
    // .modal-container and never get a .scrim ancestor, so without an
    // override they inherit opacity: 0 and never appear. The override
    // pins .modal-container .modal back to opacity: 1.
    const modalOverrideRe = /\.modal-container\s+\.modal\s*\{[\s\S]*?opacity:\s*1[\s\S]*?\}/i;
    expect(modalOverrideRe.test(css)).toBe(true);
  });
});
