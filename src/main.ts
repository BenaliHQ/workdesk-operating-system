import { Plugin } from 'obsidian';
import { PLUGIN_ID } from './constants';
import { DEFAULT_SETTINGS, WorkdeskSettings } from './settings';

export default class WorkdeskosPlugin extends Plugin {
  settings!: WorkdeskSettings;

  async onload(): Promise<void> {
    console.log(`[${PLUGIN_ID}] loaded`);
    await this.loadSettings();
    // Phase 1 wires the four-pane shell + ribbon + splitters here.
    // Phase 2 registers VIEW_TYPE_WORKDESK_ZONE.
    // Phase 3 registers VIEW_TYPE_WORKDESK_HTML + editor extensions.
  }

  async onunload(): Promise<void> {
    console.log(`[${PLUGIN_ID}] unloaded`);
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
