import { Plugin, addIcon } from 'obsidian';
import {
  COMMAND_ID_PREFIX,
  PLUGIN_ID,
  VIEW_TYPE_WORKDESK_HTML,
  VIEW_TYPE_WORKDESK_TERMINAL,
  VIEW_TYPE_WORKDESK_ZONE,
} from './constants';
import { DEFAULT_SETTINGS, WorkdeskSettings } from './settings';
import { ZoneView } from './views/ZoneView';
import { HtmlView } from './views/HtmlView';
import { TerminalView } from './views/TerminalView';
import { wikilinkAndTagDecorations } from './editor/wikilink-ext';
import { CommandPalette } from './modals/CommandPalette';
import { QuickCaptureModal } from './modals/QuickCapture';
import { WorkdeskSettingTab } from './settings/tab';
import { createFocusController, type FocusController } from './services/focus';
import { obsidianCaptureVault } from './services/capture/obsidian-vault';
import { installGlobalToast, showToast } from './components/Toast';
import { wsSvg } from './icons';
import { scanZones, scanFilesView, nodeFsAdapter } from './services/vault-scan';
import type { IconName, Zone, ZoneId } from './types';

// 12 plugin surfaces in spec order — 7 zone icons + Today + Terminal + Focus
// + Mic (quick capture) + Settings. Names registered via addIcon at onload.
const RIBBON_ICON_MAP: Array<{ name: string; glyph: IconName }> = [
  { name: 'workdesk-atlas', glyph: 'globe' },
  { name: 'workdesk-gtd', glyph: 'check' },
  { name: 'workdesk-intel', glyph: 'signal' },
  { name: 'workdesk-personal', glyph: 'person' },
  { name: 'workdesk-system', glyph: 'layers' },
  { name: 'workdesk-config', glyph: 'gear' },
  { name: 'workdesk-files', glyph: 'files' },
  { name: 'workdesk-today', glyph: 'calendar' },
  { name: 'workdesk-terminal', glyph: 'code' },
  { name: 'workdesk-focus', glyph: 'focus' },
  { name: 'workdesk-mic', glyph: 'mic' },
  { name: 'workdesk-settings', glyph: 'gear' },
];

const ZONE_RIBBON_IDS: readonly ZoneId[] = [
  'atlas', 'gtd', 'intel', 'personal', 'system', 'config', 'files',
];

export default class WorkdeskosPlugin extends Plugin {
  settings!: WorkdeskSettings;
  activeZone: ZoneId = 'atlas';
  focus: FocusController | null = null;
  private ribbonElements: HTMLElement[] = [];
  private zones: Record<string, Zone> = {};
  // First-run orientation is handled by WorkDesk OS's /onboarding skill,
  // not a plugin modal. STATE.json.decisions.onboarding_enabled = false.

  async onload(): Promise<void> {
    console.log(`[${PLUGIN_ID}] loaded`);
    await this.loadSettings();
    installGlobalToast();

    this.registerIcons();
    await this.loadZones();

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

    this.registerRibbonIcons();

    this.focus = createFocusController({
      appEl: document.body,
      settings: this.settings,
      saveSettings: () => this.saveSettings(),
    });
    this.focus.restore();
    if (this.focus.isOn()) this.refreshFocusIconActive(true);

    this.applyAppearance();

    this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
      if (evt.key !== 'Escape') return;
      const modalOpen = document.querySelector('.modal-container.mod-shown, .scrim.open');
      if (modalOpen) return;
      if (this.focus?.isOn()) {
        this.focus.off();
        this.refreshFocusIconActive(false);
      }
    });
  }

  async onunload(): Promise<void> {
    document.body.classList.remove('workdesk-hide-native-ribbon-icons');
    for (const el of this.ribbonElements) {
      el.classList.remove('workdesk-icon', 'workdesk-active', 'workdesk-focus-active');
    }
    this.ribbonElements = [];
    console.log(`[${PLUGIN_ID}] unloaded`);
  }

  private registerIcons(): void {
    for (const { name, glyph } of RIBBON_ICON_MAP) {
      addIcon(name, wsSvg(glyph, 100));
    }
  }

  private async loadZones(): Promise<void> {
    try {
      const vaultRoot = this.getVaultRoot();
      const manifestDir = (this.manifest as unknown as { dir?: string }).dir ?? '';
      const pluginRoot = manifestDir ? `${vaultRoot}/${manifestDir}` : vaultRoot;
      this.zones = scanZones(nodeFsAdapter(), {
        vaultRoot,
        manifestPath: this.settings.zones.manifestPath,
        iconPath: this.settings.zones.iconManifestPath,
        pluginRoot,
      }) as unknown as Record<string, Zone>;
    } catch (err) {
      console.warn(`[${PLUGIN_ID}] zone scan failed; continuing with empty state`, err);
      this.zones = {};
    }
  }

  private registerRibbonIcons(): void {
    for (const zone of ZONE_RIBBON_IDS) {
      const label = `WorkDesk: ${zone[0]!.toUpperCase()}${zone.slice(1)} zone`;
      const el = this.addRibbonIcon(`workdesk-${zone}`, label, () => {
        void this.revealZone(zone);
      });
      el.classList.add('workdesk-icon');
      el.style.setProperty('--workdesk-active-bg', `var(--ws-zone-${zone}-bg)`);
      el.style.setProperty('--workdesk-active-fg', `var(--ws-zone-${zone}-fg)`);
      el.dataset.zone = zone;
      this.ribbonElements.push(el);
    }
    const utilityIcons: Array<{ name: string; title: string; handler: () => void | Promise<void> }> = [
      { name: 'workdesk-today', title: "WorkDesk: Today's daily note", handler: () => this.openDaily() },
      { name: 'workdesk-terminal', title: 'WorkDesk: Toggle terminal pane', handler: () => this.toggleTerminalPane() },
      { name: 'workdesk-focus', title: 'WorkDesk: Toggle focus mode', handler: () => { this.toggleFocus(); } },
      { name: 'workdesk-mic', title: 'WorkDesk: Quick capture', handler: () => this.openQuickCapture() },
      { name: 'workdesk-settings', title: 'WorkDesk: Open WorkDesk settings', handler: () => this.openWorkdeskSettings() },
    ];
    for (const util of utilityIcons) {
      const el = this.addRibbonIcon(util.name, util.title, () => { void util.handler(); });
      el.classList.add('workdesk-icon');
      this.ribbonElements.push(el);
    }
  }

  async revealZone(zoneId: ZoneId): Promise<void> {
    this.activeZone = zoneId;
    const workspace = this.app.workspace;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_ZONE);
    let leaf = leaves[0];
    if (!leaf) {
      const left = workspace.getLeftLeaf(false);
      if (!left) return;
      await left.setViewState({ type: VIEW_TYPE_WORKDESK_ZONE, active: true });
      leaf = left;
    }
    await workspace.revealLeaf(leaf);
    const view = leaf.view as ZoneView | undefined;
    if (!view) return;
    if (zoneId === 'files') {
      const tree = scanFilesView(nodeFsAdapter(), { vaultRoot: this.getVaultRoot() });
      // Wrapper zone-object with id: '' so ZoneView passes an empty pathPrefix
      // to renderTree. Combined with the TreeRow patch (empty pathPrefix uses
      // node.name as the path root), this makes tree-row file paths
      // vault-relative (e.g. 'atlas/people/martin-holland.md').
      view.setZones({
        files: {
          name: 'files',
          sub: 'all vault files',
          icon: 'files',
          objects: [{
            id: '',
            title: 'files',
            sub: '',
            icon: 'files',
            count: tree.length,
            children: tree,
          }],
        },
      } as unknown as Record<string, Zone>);
      view.setActiveZone('files' as ZoneId);
    } else {
      view.setZones(this.zones);
      view.setActiveZone(zoneId);
    }
    this.refreshZoneRibbonActive(zoneId);
  }

  private refreshZoneRibbonActive(active: ZoneId): void {
    for (const el of this.ribbonElements) {
      if (!el.dataset.zone) continue;
      el.classList.toggle('workdesk-active', el.dataset.zone === active);
    }
  }

  private refreshFocusIconActive(on: boolean): void {
    // Focus icon is index 9 in the ribbonElements array (after 7 zones + today
    // + terminal). Defensive: no-op if not yet registered.
    const focusEl = this.ribbonElements[9];
    if (!focusEl) return;
    focusEl.classList.toggle('workdesk-focus-active', on);
  }

  applyAppearance(): void {
    document.body.classList.toggle(
      'workdesk-hide-native-ribbon-icons',
      this.settings.appearance.hideNonWorkdeskRibbonIcons,
    );
  }

  private getVaultRoot(): string {
    const adapter = this.app.vault.adapter as unknown as { basePath?: string };
    return adapter.basePath ?? this.settings.vault.path;
  }

  private async toggleTerminalPane(): Promise<void> {
    const workspace = this.app.workspace;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_TERMINAL);
    if (leaves.length === 0) {
      const leaf = workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE_WORKDESK_TERMINAL, active: true });
      await workspace.revealLeaf(leaf);
      return;
    }

    const rightSplit = (workspace as unknown as { rightSplit?: WorkspaceItemLike }).rightSplit;
    const sidebarLeaf = leaves.find((l) => leafIsHostedBy(l, rightSplit));

    if (sidebarLeaf && rightSplit) {
      if (rightSplit.collapsed) {
        rightSplit.expand();
        await workspace.revealLeaf(sidebarLeaf);
        return;
      }
      if (workspace.getActiveViewOfType?.(TerminalView) === sidebarLeaf.view) {
        rightSplit.collapse();
        return;
      }
      await workspace.revealLeaf(sidebarLeaf);
      return;
    }

    await workspace.revealLeaf(leaves[0]!);
  }

  async openNewTerminalTab(): Promise<void> {
    const workspace = this.app.workspace;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_TERMINAL);
    if (leaves.length === 0) {
      const right = workspace.getRightLeaf(false);
      if (!right) return;
      await right.setViewState({ type: VIEW_TYPE_WORKDESK_TERMINAL, active: true });
      await workspace.revealLeaf(right);
      return;
    }
    const leaf = leaves[0]!;
    await workspace.revealLeaf(leaf);
    const view = leaf.view as TerminalView | undefined;
    if (view?.openNewSession) view.openNewSession();
  }

  async triageCaptureInbox(): Promise<void> {
    await this.revealZone('gtd');
    showToast('Switched to gtd · run /triage in terminal to process inbox', 'info');
  }

  private openQuickCapture(): void {
    const modal = new QuickCaptureModal(this, { vault: obsidianCaptureVault(this.app) });
    modal.open();
  }

  private async openDaily(): Promise<void> {
    const commands = (this.app as unknown as {
      commands?: { executeCommandById(id: string): boolean };
    }).commands;
    if (commands?.executeCommandById('daily-notes:goto-today')) return;
    if (commands?.executeCommandById('periodic-notes:open-daily-note')) return;
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const path = `personal/daily/${yyyy}-${mm}-${dd}.md`;
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing) {
      await this.app.workspace.openLinkText(path, '', false);
      return;
    }
    showToast(
      `No daily note at ${path} and no Periodic Notes plugin installed. Create it manually or install Periodic Notes.`,
      'info',
    );
  }

  private openWorkdeskSettings(): void {
    const setting = (this.app as unknown as {
      setting?: { open(): void; openTabById(id: string): void };
    }).setting;
    if (!setting) {
      showToast('Could not open settings — open Settings → WorkdeskOS manually.', 'info');
      return;
    }
    setting.open();
    setting.openTabById(PLUGIN_ID);
  }

  toggleFocus(): boolean {
    if (!this.focus) return false;
    const next = this.focus.toggle();
    this.refreshFocusIconActive(next);
    return next;
  }

  async loadSettings(): Promise<void> {
    const raw = (await this.loadData()) as Partial<WorkdeskSettings> | null;
    this.settings = mergeDeep(DEFAULT_SETTINGS, raw ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

// Subset of Obsidian's WorkspaceSidedock surface we actually call.
interface WorkspaceItemLike {
  collapsed: boolean;
  expand(): void;
  collapse(): void;
}

function leafIsHostedBy(leaf: { getRoot?: () => unknown } | unknown, container: unknown): boolean {
  if (!container) return false;
  const getRoot = (leaf as { getRoot?: () => unknown }).getRoot;
  if (typeof getRoot !== 'function') return false;
  return getRoot.call(leaf) === container;
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
