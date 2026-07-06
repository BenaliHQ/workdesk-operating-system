import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from 'obsidian';
import { __setPlatformDesktop } from './stubs/obsidian';
import WorkdeskOSPlugin from '../src/main';
import { VoiceFab } from '../src/components/VoiceFab';
import { mountQuickCaptureSection } from '../src/settings/sections/quick-capture';
import { DEFAULT_SETTINGS, type WorkdeskSettings } from '../src/settings';

function getFab(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.workdesk-voice-fab');
}

function makeFab(options: Partial<ConstructorParameters<typeof VoiceFab>[0]> = {}): VoiceFab {
  return new VoiceFab({
    onPress: options.onPress ?? (() => {}),
    onCancel: options.onCancel ?? (() => {}),
  });
}

async function loadPlugin(options: {
  desktop: boolean;
  data?: unknown;
}): Promise<WorkdeskOSPlugin> {
  __setPlatformDesktop(options.desktop);
  const plugin = new WorkdeskOSPlugin();
  const storage = plugin as unknown as {
    loadData(): Promise<unknown>;
    saveData(data: unknown): Promise<void>;
  };
  storage.loadData = async () => options.data ?? null;
  storage.saveData = async () => {};
  await plugin.onload();
  return plugin;
}

afterEach(() => {
  vi.useRealTimers();
  __setPlatformDesktop(true);
  document.body.replaceChildren();
  document.body.className = '';
});

describe('VoiceFab platform mounting', () => {
  it('mounts only on mobile when the setting is on', async () => {
    const mobilePlugin = await loadPlugin({ desktop: false });
    expect(getFab()).not.toBeNull();
    mobilePlugin.onunload();

    const desktopPlugin = await loadPlugin({ desktop: true });
    expect(getFab()).toBeNull();
    desktopPlugin.onunload();

    const disabledPlugin = await loadPlugin({
      desktop: false,
      data: { capture: { showMobileFab: false } },
    });
    expect(getFab()).toBeNull();
    disabledPlugin.onunload();
  });
});

describe('VoiceFab state rendering', () => {
  it('tracks voice memo transitions through data-state and recording chips', () => {
    const fab = makeFab();
    const states = ['idle', 'requesting-permission', 'recording', 'transcribing', 'success'] as const;

    for (const state of states) {
      fab.setState({ state });
      const root = getFab();
      expect(root?.dataset.state).toBe(state);
      const shouldShowRecordingChips = state === 'recording';
      expect(root?.querySelector('.workdesk-voice-fab__elapsed') !== null).toBe(shouldShowRecordingChips);
      expect(root?.querySelector('.workdesk-voice-fab__cancel') !== null).toBe(shouldShowRecordingChips);
    }

    fab.destroy();
  });

  it('calls the provided cancel callback from the cancel chip', () => {
    const onCancel = vi.fn();
    const fab = makeFab({ onCancel });

    fab.setState({ state: 'recording' });
    getFab()?.querySelector<HTMLButtonElement>('.workdesk-voice-fab__cancel')?.click();

    expect(onCancel).toHaveBeenCalledTimes(1);
    fab.destroy();
  });

  it('returns from success to idle after the visual confirmation window', () => {
    vi.useFakeTimers();
    const fab = makeFab();

    fab.setState({ state: 'success' });
    expect(getFab()?.dataset.state).toBe('success');

    vi.advanceTimersByTime(1399);
    expect(getFab()?.dataset.state).toBe('success');

    vi.advanceTimersByTime(1);
    expect(getFab()?.dataset.state).toBe('idle');

    fab.destroy();
  });

  it('hides for the keyboard, not for rotation, and never mid-recording', () => {
    const originalInnerHeight = window.innerHeight;
    const listeners: Array<() => void> = [];
    const viewport = {
      height: 844,
      addEventListener: (_type: string, cb: () => void) => listeners.push(cb),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true, writable: true });
    const fireResize = (): void => listeners.forEach((cb) => cb());

    try {
      const fab = makeFab();
      const root = getFab()!;

      // Keyboard opens: visual viewport shrinks below the layout viewport.
      viewport.height = 500;
      fireResize();
      expect(root.classList.contains('is-keyboard-hidden')).toBe(true);

      // Keyboard closes.
      viewport.height = 844;
      fireResize();
      expect(root.classList.contains('is-keyboard-hidden')).toBe(false);

      // Rotation: BOTH viewports change together — must not read as keyboard.
      (window as { innerHeight: number }).innerHeight = 390;
      viewport.height = 390;
      fireResize();
      expect(root.classList.contains('is-keyboard-hidden')).toBe(false);

      // Recording is never hidden, even with the keyboard genuinely open.
      fab.setState({ state: 'recording' });
      viewport.height = 200;
      fireResize();
      expect(root.classList.contains('is-keyboard-hidden')).toBe(false);

      fab.destroy();
      expect(viewport.removeEventListener).toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(window, 'visualViewport');
      Object.defineProperty(window, 'innerHeight', {
        value: originalInnerHeight,
        configurable: true,
        writable: true,
      });
    }
  });

  it('clears the elapsed timer when recording exits', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const fab = makeFab();

    fab.setState({ state: 'recording' });
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(2100);
    expect(getFab()?.querySelector('.workdesk-voice-fab__elapsed')?.textContent).toBe('00:02');

    fab.setState({ state: 'transcribing' });
    expect(getFab()?.querySelector('.workdesk-voice-fab__elapsed')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);

    fab.destroy();
  });
});

describe('VoiceFab settings and command polish', () => {
  it('quick-capture settings render the mobile-only FAB toggle and refresh live', async () => {
    __setPlatformDesktop(false);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const plugin = {
      app: new App(),
      settings: structuredClone(DEFAULT_SETTINGS) as WorkdeskSettings,
      saveSettings: vi.fn(async () => {}),
      refreshVoiceFab: vi.fn(),
    } as unknown as WorkdeskOSPlugin;

    await mountQuickCaptureSection(host, plugin);

    const rowNames = Array.from(host.querySelectorAll('.setting-item-name')).map((el) => el.textContent ?? '');
    expect(rowNames).toContain('Show floating mic button');

    const toggle = host.querySelector<HTMLInputElement>('input[aria-label="Show floating mic button"]');
    expect(toggle).not.toBeNull();
    toggle!.checked = false;
    toggle!.dispatchEvent(new Event('change', { bubbles: true }));

    expect(plugin.settings.capture.showMobileFab).toBe(false);
    expect(plugin.saveSettings).toHaveBeenCalled();
    expect(plugin.refreshVoiceFab).toHaveBeenCalledTimes(1);
  });

  it('quick-capture settings omit the FAB toggle on desktop', async () => {
    __setPlatformDesktop(true);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const plugin = {
      app: new App(),
      settings: structuredClone(DEFAULT_SETTINGS) as WorkdeskSettings,
      saveSettings: vi.fn(async () => {}),
      refreshVoiceFab: vi.fn(),
    } as unknown as WorkdeskOSPlugin;

    await mountQuickCaptureSection(host, plugin);

    const rowNames = Array.from(host.querySelectorAll('.setting-item-name')).map((el) => el.textContent ?? '');
    expect(rowNames).not.toContain('Show floating mic button');
  });

  it('registers the voice memo command with the mobile menu icon', async () => {
    const plugin = await loadPlugin({ desktop: false });
    const commands = plugin.app.commands.commands as Record<string, { icon?: string }>;

    expect(commands['workdesk:capture:voice-memo']?.icon).toBe('workdesk-mic');

    plugin.onunload();
  });
});
