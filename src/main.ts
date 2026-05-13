import { Plugin } from 'obsidian';
import {
  COMMAND_ID_PREFIX,
  PLUGIN_ID,
  VIEW_TYPE_WORKDESK_HTML,
  VIEW_TYPE_WORKDESK_TERMINAL,
  VIEW_TYPE_WORKDESK_ZONE,
} from './constants';
import { DEFAULT_SETTINGS, WorkdeskSettings } from './settings';
import { WorkdeskRibbon } from './views/RibbonControl';
import { ZoneView } from './views/ZoneView';
import { HtmlView } from './views/HtmlView';
import { TerminalView } from './views/TerminalView';
import { mountShell } from './layout/shell';
import { wikilinkAndTagDecorations } from './editor/wikilink-ext';
import { CommandPalette } from './modals/CommandPalette';
import { QuickCaptureModal } from './modals/QuickCapture';
import { WorkdeskSettingTab } from './settings/tab';
import { createFocusController, type FocusController } from './services/focus';
import { obsidianCaptureVault } from './services/capture/obsidian-vault';
import type { ZoneId } from './types';

export default class WorkdeskosPlugin extends Plugin {
  settings!: WorkdeskSettings;
  ribbon: WorkdeskRibbon | null = null;
  activeZone: ZoneId = 'atlas';
  focus: FocusController | null = null;
  // First-run orientation is handled by WorkDesk OS's /onboarding skill,
  // not a plugin modal. STATE.json.decisions.onboarding_enabled = false.

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

    this.focus = createFocusController({
      appEl,
      settings: this.settings,
      saveSettings: () => this.saveSettings(),
    });
    this.focus.restore();
    if (this.focus.isOn()) this.ribbon.setFocus(true);

    this.registerView(VIEW_TYPE_WORKDESK_ZONE, (leaf) => new ZoneView(leaf, this));

    this.registerView(VIEW_TYPE_WORKDESK_HTML, (leaf) => new HtmlView(leaf, this));
    this.registerExtensions(['html', 'htm'], VIEW_TYPE_WORKDESK_HTML);

    this.registerView(VIEW_TYPE_WORKDESK_TERMINAL, (leaf) => new TerminalView(leaf, this));

    this.registerEditorExtension(wikilinkAndTagDecorations);

    this.addSettingTab(new WorkdeskSettingTab(this.app, this));

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:open-palette`,
      name: 'Open command palette',
      hotkeys: [{ modifiers: ['Mod'], key: 'k' }],
      callback: () => new CommandPalette(this.app).open(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:terminal:toggle`,
      name: 'Toggle terminal pane',
      callback: () => this.toggleTerminalPane(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:terminal:new-tab`,
      name: 'New terminal tab',
      callback: () => this.openNewTerminalTab(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:capture:triage`,
      name: 'Triage capture inbox',
      callback: () => this.triageCaptureInbox(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:capture:open`,
      name: 'Quick capture',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'm' }],
      callback: () => this.openQuickCapture(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:focus:toggle`,
      name: 'Toggle focus mode',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'f' }],
      callback: () => this.toggleFocus(),
    });

    this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
      if (evt.key !== 'Escape') return;
      const modalOpen = document.querySelector('.modal-container.mod-shown, .scrim.open');
      if (modalOpen) return;
      if (this.focus?.isOn()) {
        this.focus.off();
        this.ribbon?.setFocus(false);
      }
    });
  }

  async onunload(): Promise<void> {
    this.ribbon?.unmount();
    console.log(`[${PLUGIN_ID}] unloaded`);
  }

  private toggleTerminalPane(): void {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_TERMINAL);
    if (leaves.length > 0) {
      this.app.workspace.revealLeaf(leaves[0]!);
    }
  }

  private async openNewTerminalTab(): Promise<void> {
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW_TYPE_WORKDESK_TERMINAL, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  private triageCaptureInbox(): void {
    // Phase 5A registers the command surface; the capture inbox flow lands in M3.
  }

  private openQuickCapture(): void {
    const modal = new QuickCaptureModal(this, { vault: obsidianCaptureVault(this.app) });
    modal.open();
  }

  toggleFocus(): boolean {
    if (!this.focus) return false;
    const next = this.focus.toggle();
    this.ribbon?.setFocus(next);
    return next;
  }

  private handleSlot(slot: string): void {
    const zones: ZoneId[] = ['atlas', 'gtd', 'intel', 'personal', 'system', 'config', 'files'];
    if (zones.includes(slot as ZoneId)) {
      this.activeZone = slot as ZoneId;
      this.ribbon?.setActiveZone(this.activeZone);
    } else if (slot === 'focus') {
      this.toggleFocus();
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
