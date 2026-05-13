import { Plugin } from 'obsidian';
import { PLUGIN_ID } from './constants';
import { DEFAULT_SETTINGS, WorkdeskSettings } from './settings';
import { WorkdeskRibbon } from './views/RibbonControl';
import { mountShell } from './layout/shell';
import type { ZoneId } from './types';

export default class WorkdeskosPlugin extends Plugin {
  settings!: WorkdeskSettings;
  ribbon: WorkdeskRibbon | null = null;
  activeZone: ZoneId = 'atlas';

  async onload(): Promise<void> {
    console.log(`[${PLUGIN_ID}] loaded`);
    await this.loadSettings();

    const appEl = document.body.querySelector('.app') as HTMLElement | null
      ?? document.body;
    await mountShell(this, {
      appEl,
      settings: this.settings,
      saveSettings: () => this.saveSettings(),
    });

    this.ribbon = new WorkdeskRibbon(this);
    this.ribbon.mount(appEl);
    this.ribbon.onSlot((slot) => this.handleSlot(slot));

    // Phase 2 registers VIEW_TYPE_WORKDESK_ZONE.
    // Phase 3 registers VIEW_TYPE_WORKDESK_HTML + editor extensions.
  }

  async onunload(): Promise<void> {
    this.ribbon?.unmount();
    console.log(`[${PLUGIN_ID}] unloaded`);
  }

  private handleSlot(slot: string): void {
    const zones: ZoneId[] = ['atlas', 'gtd', 'intel', 'personal', 'system', 'config', 'files'];
    if (zones.includes(slot as ZoneId)) {
      this.activeZone = slot as ZoneId;
      this.ribbon?.setActiveZone(this.activeZone);
    } else if (slot === 'focus') {
      const next = !document.body.classList.contains('focus-on');
      document.body.classList.toggle('focus-on', next);
      this.ribbon?.setFocus(next);
    }
  }

  async loadSettings(): Promise<void> {
    const raw = (await this.loadData()) as Partial<WorkdeskSettings> | null;
    this.settings = mergeDeep(DEFAULT_SETTINGS, raw ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

function mergeDeep<T>(base: T, patch: Partial<T>): T {
  if (patch === null || patch === undefined) return base;
  if (typeof base !== 'object' || base === null) return (patch as T) ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && k in (base as Record<string, unknown>)) {
      out[k] = mergeDeep((base as Record<string, unknown>)[k], v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}
