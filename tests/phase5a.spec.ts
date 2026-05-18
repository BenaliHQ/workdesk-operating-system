import { describe, it, expect, beforeEach } from 'vitest';
import { App, Plugin } from 'obsidian';
import { CommandPalette } from '../src/modals/CommandPalette';
import { WorkdeskSettingTab } from '../src/settings/tab';
import { mountQuickCaptureSection } from '../src/settings/sections/quick-capture';
import { DEFAULT_SETTINGS, type WorkdeskSettings } from '../src/settings';

beforeEach(() => {
  document.body.innerHTML = '';
});

interface FakePlugin extends Plugin {
  settings: WorkdeskSettings;
  saveSettings(): Promise<void>;
  loadSettings(): Promise<void>;
}

function makePlugin(initial?: Partial<WorkdeskSettings>): FakePlugin {
  const p = new Plugin() as unknown as FakePlugin;
  p.settings = structuredClone({ ...DEFAULT_SETTINGS, ...initial });
  p.saveSettings = async () => {
    await p.saveData(p.settings);
  };
  p.loadSettings = async () => {
    const stored = await p.loadData() as Partial<WorkdeskSettings> | null;
    if (stored) p.settings = { ...DEFAULT_SETTINGS, ...stored };
  };
  return p;
}

describe('phase 5a · command palette filtering', () => {
  it('shows only workdesk: prefixed commands, filtered by query', () => {
    const app = new App();
    app.commands.commands['workdesk:terminal:toggle'] = { id: 'workdesk:terminal:toggle', name: 'Toggle terminal pane' };
    app.commands.commands['workdesk:capture:triage'] = { id: 'workdesk:capture:triage', name: 'Triage capture inbox' };
    app.commands.commands['workdesk:terminal:new-tab'] = { id: 'workdesk:terminal:new-tab', name: 'New terminal tab' };
    app.commands.commands['daily-notes:open'] = { id: 'daily-notes:open', name: 'Open today’s daily note' };

    const palette = new CommandPalette(app);
    palette.open();

    const root = document.querySelector('.cmd-palette') as HTMLElement;
    expect(root).not.toBeNull();
    const input = root.querySelector('.cmd-input') as HTMLInputElement;
    input.value = 'trip';
    input.dispatchEvent(new Event('input'));
    const results = palette.results_for_test();
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.map((r) => r.id)).toContain('workdesk:capture:triage');
    expect(results.every((r) => r.id.startsWith('workdesk:'))).toBe(true);
    palette.close();
  });

  it('rejects non-workdesk commands even when query would match them', () => {
    const app = new App();
    app.commands.commands['daily-notes:open'] = { id: 'daily-notes:open', name: 'Open today’s daily note' };
    app.commands.commands['workdesk:open-daily'] = { id: 'workdesk:open-daily', name: 'Open today’s daily plan' };
    const palette = new CommandPalette(app);
    palette.open();
    const input = document.querySelector('.cmd-input') as HTMLInputElement;
    input.value = 'daily';
    input.dispatchEvent(new Event('input'));
    const results = palette.results_for_test();
    expect(results.every((r) => r.id.startsWith('workdesk:'))).toBe(true);
    palette.close();
  });
});

describe('phase 5a · command palette keyboard footer', () => {
  it('renders the ↑↓ / ↵ / esc footer hints', () => {
    const app = new App();
    const palette = new CommandPalette(app);
    palette.open();
    const footer = document.querySelector('.cmd-footer');
    expect(footer?.textContent).toContain('navigate');
    expect(footer?.textContent).toContain('select');
    expect(footer?.textContent).toContain('close');
    palette.close();
  });
});

describe('phase 5a · settings tab — single-column Setting API layout', () => {
  it('renders every section heading in display order', () => {
    const app = new App();
    const plugin = makePlugin();
    const tab = new WorkdeskSettingTab(app, plugin);
    tab.display();
    const headings = Array.from(
      tab.containerEl.querySelectorAll('.setting-item-heading .setting-item-name'),
    ).map((el) => (el as HTMLElement).textContent);
    expect(headings).toEqual([
      'General',
      'Zones',
      'Terminal',
      'Quick capture',
      'Claude Code',
      'Templates',
      'Appearance',
      'About',
    ]);
  });

  it('scopes its container with the .workdesk-os-settings class', () => {
    const app = new App();
    const plugin = makePlugin();
    const tab = new WorkdeskSettingTab(app, plugin);
    tab.display();
    expect(tab.containerEl.classList.contains('workdesk-os-settings')).toBe(true);
  });

  it('does not render a custom side nav inside the settings pane', () => {
    const app = new App();
    const plugin = makePlugin();
    const tab = new WorkdeskSettingTab(app, plugin);
    tab.display();
    // Obsidian provides the sidebar nav. A plugin must not inject its own
    // alongside `containerEl` — that's what produced the dual-nav rendering bug.
    expect(tab.containerEl.querySelector('.settings-nav')).toBeNull();
    expect(tab.containerEl.querySelector('.settings-nav-item')).toBeNull();
  });

  it('mounts every settings row through Obsidian Setting items', () => {
    const app = new App();
    const plugin = makePlugin();
    const tab = new WorkdeskSettingTab(app, plugin);
    tab.display();
    const settingRows = tab.containerEl.querySelectorAll('.setting-item');
    // 8 headings + at least 22 control rows across the sections.
    expect(settingRows.length).toBeGreaterThanOrEqual(8 + 22);
  });
});

describe('phase 5a · data.json roundtrip', () => {
  it('saveSettings → loadSettings reads back the patched value', async () => {
    const plugin = makePlugin();
    plugin.settings.terminal.fontSize = 15;
    await plugin.saveSettings();
    plugin.settings = { ...DEFAULT_SETTINGS };
    await plugin.loadSettings();
    expect(plugin.settings.terminal.fontSize).toBe(15);
  });
});

describe('phase 5a · SecretComponent in Quick-capture', () => {
  it('mounts a SecretComponent and calls secretStorage.getSecret on render', async () => {
    const app = new App();
    const plugin = makePlugin();
    plugin.app = app;
    const host = document.createElement('div');
    document.body.appendChild(host);
    await mountQuickCaptureSection(host, plugin);

    const secretInput = host.querySelector('.setting-secret') as HTMLInputElement;
    expect(secretInput).not.toBeNull();

    // The stub records calls to getSecret on the secretStorage object.
    const calls = (app.secretStorage as unknown as { _getCalls: string[] })._getCalls;
    expect(calls).toContain('stt-groq');
  });

  it('writes via setSecret when the user types into the field', async () => {
    const app = new App();
    const plugin = makePlugin();
    plugin.app = app;
    const host = document.createElement('div');
    document.body.appendChild(host);
    await mountQuickCaptureSection(host, plugin);

    const secretInput = host.querySelector('.setting-secret') as HTMLInputElement;
    secretInput.value = 'gsk_test_token';
    secretInput.dispatchEvent(new Event('input'));

    const setCalls = (app.secretStorage as unknown as { _setCalls: Array<{ id: string; value: string }> })._setCalls;
    expect(setCalls.some((c) => c.id === 'stt-groq' && c.value === 'gsk_test_token')).toBe(true);
  });
});
